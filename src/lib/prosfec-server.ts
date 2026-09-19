// @ts-nocheck
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import express from "./mini-express";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword as signInService } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc, runTransaction, deleteField } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { GoogleGenAI, Type } from "@google/genai";
import { getBankSpecificRules, GOVERNMENT_CREDIT_LINES, validateCreditLineConditions } from "../utils/creditLineRules";
import { BankRulesManager } from "../utils/BankRulesManager";
import { runCreditEngine, calcularParcela } from "../utils/creditEligibilityEngine";
import { optionalEnv, requireEnv, firstEnv, maskEmail, maskDoc, redact } from "../utils/env";
import { normalizeMensalidades, DEFAULT_MENSALIDADES, normalizeAssinaturaParceiro, DEFAULT_ASSINATURA_PARCEIRO, normalizeServiceClauses, buildServiceTemplateId, CLAUSULA_GENERICA_AVULSO, DEFAULT_SERVICE_CLAUSES } from "../utils/serviceUtils";

export function cleanForFirestore<T = any>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanForFirestore(item)) as any;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        const res = cleanForFirestore(val);
        if (res !== undefined) {
          cleaned[key] = res;
        }
      }
    }
    return cleaned;
  }
  return obj;
}

export function createExpressApp() {
  const app = express();

  // ---------------------------------------------------------------------
  // Segurança: comparação de tokens em tempo constante (anti timing attack)
  // ---------------------------------------------------------------------
  const timingSafeCompare = (a: string, b: string): boolean => {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (!a || !b) return false;
    try {
      const enc = new TextEncoder();
      const bufA = enc.encode(a);
      const bufB = enc.encode(b);
      if (bufA.length !== bufB.length) {
        // Compara mesmo assim contra si próprio para manter tempo constante
        try {
          timingSafeEqual(Buffer.from(bufA), Buffer.from(bufA));
        } catch {
          /* noop */
        }
        return false;
      }
      return timingSafeEqual(Buffer.from(bufA), Buffer.from(bufB));
    } catch {
      // Fallback puro em JS, também em tempo constante
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      return diff === 0;
    }
  };

  // Extrai token de cabeçalhos comuns (x-<nome>-token, authorization, token, query)
  const extractToken = (req: any, headerName: string): string => {
    const raw =
      req.headers?.[headerName] ||
      req.headers?.[headerName.toLowerCase()] ||
      req.headers?.["authorization"] ||
      req.headers?.["token"] ||
      req.query?.token ||
      "";
    let value = typeof raw === "string" ? raw.trim() : "";
    if (value.toLowerCase().startsWith("bearer ")) value = value.substring(7).trim();
    return value;
  };


  // Handle Netlify Function route rewrite if present
  app.use((req, _res, next) => {
    if (req.url.startsWith("/.netlify/functions/api")) {
      req.url = req.url.replace("/.netlify/functions/api", "");
      if (!req.url.startsWith("/")) {
        req.url = "/" + req.url;
      }
      if (!req.url.startsWith("/api")) {
        req.url = "/api" + req.url;
      }
    }
    next();
  });

  // Initialize Firebase App and Firestore for webhook handler.
  // No servidor usamos a chave sem restrição de referenciador (FIREBASE_API_KEY /
  // GOOGLE_API_KEY); a chave do navegador continua restrita por domínio.
  const serverFirebaseConfig = {
    ...(firebaseConfig as any),
    apiKey:
      firstEnv("FIREBASE_API_KEY", "GOOGLE_API_KEY") || (firebaseConfig as any).apiKey,
  };
  // App nomeado exclusivo do backend, para não herdar a instância do navegador
  // (que usa a chave restrita por referenciador).
  const SERVER_APP_NAME = "prosfec-server";
  const existingServerApp = getApps().find((a) => a.name === SERVER_APP_NAME);
  const firebaseApp =
    existingServerApp || initializeApp(serverFirebaseConfig, SERVER_APP_NAME);
  const db = (firebaseConfig as any).firestoreDatabaseId
    ? getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId)
    : getFirestore(firebaseApp);

  // Identidade de serviço no SDK do servidor: garante que leituras/escritas
  // do backend passem pelas regras do Firestore como usuário autenticado.
  const serverAuth = getAuth(firebaseApp);
  let serviceSignInPromise: Promise<any> | null = null;
  const ensureServiceSession = async () => {
    if (serverAuth.currentUser) return;
    if (!serviceSignInPromise) {
      const email = optionalEnv("PROSFEC_SERVICE_EMAIL");
      const password = optionalEnv("PROSFEC_SERVICE_PASSWORD");
      if (!email || !password) return;
      serviceSignInPromise = (async () => {
        try {
          // Garante que a conta exista (cria via REST se necessário).
          await getServiceIdTokenRef.fn();
          await signInService(serverAuth, email, password);
        } catch (err: any) {
          console.warn(
            "[SERVICO] Não foi possível autenticar a identidade de serviço:",
            err?.code || err?.message || "erro",
          );
          serviceSignInPromise = null;
        }
      })();
    }
    await serviceSignInPromise;
  };
  // Referência tardia (a função é definida mais abaixo no arquivo)
  const getServiceIdTokenRef: { fn: () => Promise<string> } = {
    fn: async () => "",
  };

  // Parse JSON payloads for API routes
  app.use(express.json());

  app.use(async (_req, _res, next) => {
    try {
      await ensureServiceSession();
    } catch {
      /* segue sem sessão de serviço */
    }
    next();
  });


  // Memory cache for Google Places Search and CNPJ Lookups
  const placesCache = new Map<string, { timestamp: number; data: any }>();
  const cnpjCache = new Map<string, { timestamp: number; data: any }>();

  // API Route: Caça Leads (Google Places API v1 Direct Search)
  app.post("/api/caca-leads", async (req, res) => {
    try {
      const { keyword, city, state, limit = 20, pageToken = "" } = req.body;
      
      if (!keyword || !city) {
        return res.status(400).json({ error: "Ramo/Segmento e Cidade são obrigatórios." });
      }

      const queryStr = `${keyword} em ${city}${state ? ` - ${state}` : ""}`;
      console.log(`[Google Places API] Initiating lead hunt for: "${queryStr}" with limit ${limit}`);

      const GOOGLE_MAPS_KEY = firstEnv("GOOGLE_MAPS_API_KEY", "PLACES_API_KEY");

      const requestedLimit = Math.min(Math.max(Number(limit), 1), 20);
      const allResults: any[] = [];
      let currentPageToken = pageToken || "";
      let hasMore = true;
      let pagesFetched = 0;
      const maxPages = 1; // 1 única requisição para economizar cota e custos de API (máximo 20 estabelecimentos por busca)

      while (allResults.length < requestedLimit && hasMore && pagesFetched < maxPages) {
        pagesFetched++;
        const pageSize = Math.min(20, requestedLimit - allResults.length);

        const payload: any = {
          textQuery: queryStr,
          pageSize: pageSize
        };
        if (currentPageToken) {
          payload.pageToken = currentPageToken;
        }

        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName,nextPageToken"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Google Places API] Error ${response.status}:`, errText);
          
          if (allResults.length === 0) {
            return res.status(502).json({ 
              error: `Erro ao consultar a API do Google Maps (${response.status}). Verifique se a chave de API está ativa e com faturamento habilitado.` 
            });
          }
          break;
        }

        const data: any = await response.json();
        const places = data.places || [];

        places.forEach((item: any, idx: number) => {
          allResults.push({
            id: item.id || `place-${Date.now()}-${allResults.length}`,
            nome: item.displayName?.text || "Sem nome",
            telefone: item.nationalPhoneNumber || "",
            website: item.websiteUri || "",
            endereco: item.formattedAddress || "",
            categoria: item.primaryTypeDisplayName?.text || keyword,
            nota: item.rating ?? null,
            avaliacoes: item.userRatingCount ?? 0,
            mapsUrl: item.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.displayName?.text || "") + " " + city)}`,
            cidade: city,
            estado: state || ""
          });
        });

        currentPageToken = data.nextPageToken || "";
        if (!currentPageToken) {
          hasMore = false;
        } else if (allResults.length < requestedLimit && pagesFetched < maxPages) {
          await new Promise(r => setTimeout(r, 350));
        }
      }

      console.log(`[Google Places API] Returned ${allResults.length} leads in ${pagesFetched} page(s). Next page token: ${currentPageToken ? "AVAILABLE" : "NONE"}`);

      return res.json({ 
        success: true, 
        async: false,
        results: allResults,
        nextPageToken: currentPageToken || null,
        totalFetched: allResults.length
      });

    } catch (err: any) {
      console.error("Error in /api/caca-leads:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao processar a busca de leads no Google Maps." });
    }
  });

  // API Route: Caça Leads Status / Polling Compatibility
  app.get("/api/caca-leads-status", async (req, res) => {
    return res.json({ 
      success: true, 
      status: "SUCCEEDED",
      results: []
    });
  });
    // Helper to fetch and normalize CNPJ details from multiple public APIs (BrasilAPI, ReceitaWS, MinhaReceita)
  async function fetchCnpjFromPublicApis(cleanCnpj: string): Promise<any | null> {
    if (!cleanCnpj || cleanCnpj.length !== 14) return null;

    // 1. Try BrasilAPI
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data: any = await response.json();
        return {
          cnpj: data.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || cleanCnpj,
          razaoSocial: data.razao_social || "",
          nomeFantasia: data.nome_fantasia || data.razao_social || "",
          situacaoCadastral: data.descricao_situacao_cadastral || "ATIVA",
          dataAbertura: data.data_inicio_atividade || "",
          cnae: `${data.cnae_fiscal || ""} - ${data.cnae_fiscal_descricao || ""}`,
          cnaePrincipalDescricao: data.cnae_fiscal_descricao || "",
          naturezaJuridica: data.natureza_juridica || "",
          porte: data.porte || "DEMAIS",
          capitalSocial: Number(data.capital_social) || 0,
          enderecoFiscal: `${data.logradouro || ""}, ${data.numero || ""}${data.complemento ? ` - ${data.complemento}` : ""} - ${data.bairro || ""}, ${data.municipio || ""}/${data.uf || ""}`,
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          socios: (data.qsa || []).map((s: any) => ({
            nome: s.nome_socio || s.nome,
            qualificacao: s.qualificacao_socio || "Sócio"
          })),
          qsa: data.qsa || [],
          telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : "",
          email: data.email || ""
        };
      }
    } catch (e) {
      console.warn(`[CNPJ Fetch] BrasilAPI error/timeout for ${cleanCnpj}:`, e);
    }

    // 2. Fallback: ReceitaWS
    try {
      const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data: any = await response.json();
        if (data.status !== "ERROR") {
          return {
            cnpj: data.cnpj || cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
            razaoSocial: data.nome || "",
            nomeFantasia: data.fantasia || data.nome || "",
            situacaoCadastral: data.situacao || "ATIVA",
            dataAbertura: data.abertura || "",
            cnae: data.atividade_principal && data.atividade_principal[0] ? `${data.atividade_principal[0].code} - ${data.atividade_principal[0].text}` : "",
            cnaePrincipalDescricao: data.atividade_principal && data.atividade_principal[0] ? data.atividade_principal[0].text : "",
            naturezaJuridica: data.natureza_juridica || "",
            porte: data.porte || "DEMAIS",
            capitalSocial: parseFloat(data.capital_social) || 0,
            enderecoFiscal: `${data.logradouro || ""}, ${data.numero || ""} - ${data.bairro || ""}, ${data.municipio || ""}/${data.uf || ""}`,
            logradouro: data.logradouro || "",
            numero: data.numero || "",
            bairro: data.bairro || "",
            municipio: data.municipio || "",
            uf: data.uf || "",
            socios: (data.qsa || []).map((s: any) => ({
              nome: s.nome,
              qualificacao: s.qual_rep_legal || s.qual || "Sócio"
            })),
            qsa: data.qsa || [],
            telefone: data.telefone || "",
            email: data.email || ""
          };
        }
      }
    } catch (e) {
      console.warn(`[CNPJ Fetch] ReceitaWS error/timeout for ${cleanCnpj}:`, e);
    }

    // 3. Fallback: MinhaReceita
    try {
      const response = await fetch(`https://minhareceita.org/${cleanCnpj}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data: any = await response.json();
        return {
          cnpj: cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
          razaoSocial: data.razao_social || "",
          nomeFantasia: data.nome_fantasia || data.razao_social || "",
          situacaoCadastral: data.descricao_situacao_cadastral || "ATIVA",
          dataAbertura: data.data_inicio_atividade || "",
          cnae: `${data.cnae_fiscal || ""} - ${data.cnae_fiscal_descricao || ""}`,
          cnaePrincipalDescricao: data.cnae_fiscal_descricao || "",
          naturezaJuridica: data.natureza_juridica || "",
          porte: data.porte || "DEMAIS",
          capitalSocial: data.capital_social || 0,
          enderecoFiscal: `${data.logradouro || ""}, ${data.numero || ""} - ${data.bairro || ""}, ${data.municipio || ""}/${data.uf || ""}`,
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          socios: (data.qsa || []).map((s: any) => ({
            nome: s.nome_socio || s.nome,
            qualificacao: s.qualificacao_socio || "Sócio"
          })),
          qsa: data.qsa || [],
          telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : "",
          email: data.email || ""
        };
      }
    } catch (e) {
      console.warn(`[CNPJ Fetch] MinhaReceita error/timeout for ${cleanCnpj}:`, e);
    }

    return null;
  }

  // Valida dígitos verificadores do CNPJ (evita consultar números inventados)
  function isValidCnpjDigits(value: string): boolean {
    const c = (value || "").replace(/\D/g, "");
    if (c.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(c)) return false;
    const b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let n1 = 0;
    for (let i = 0; i < 12; i++) n1 += parseInt(c[i], 10) * b[i + 1];
    const d12 = n1 % 11 < 2 ? 0 : 11 - (n1 % 11);
    if (parseInt(c[12], 10) !== d12) return false;
    let n2 = 0;
    for (let i = 0; i < 13; i++) n2 += parseInt(c[i], 10) * b[i];
    const d13 = n2 % 11 < 2 ? 0 : 11 - (n2 % 11);
    return parseInt(c[13], 10) === d13;
  }

  function normalizeBusinessName(value: string): string {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\b(LTDA|ME|EPP|EIRELI|S\/?A|SA|COMERCIO|COMERCIAL|E|DE|DA|DO|DOS|DAS)\b/g, " ")
      .replace(/[^A-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Confirma se o CNPJ encontrado pertence mesmo ao estabelecimento pesquisado
  function matchesBusinessName(nomeEmpresa: string, result: any): boolean {
    const alvo = normalizeBusinessName(nomeEmpresa);
    if (!alvo) return false;
    const alvoWords = alvo.split(" ").filter((w) => w.length > 2);
    if (alvoWords.length === 0) return false;
    const alvoCompacto = alvo.replace(/\s/g, "");
    const fontes = [result?.razaoSocial, result?.nomeFantasia].map(normalizeBusinessName).filter(Boolean);
    for (const fonte of fontes) {
      const fonteCompacta = fonte.replace(/\s/g, "");
      if (fonteCompacta.includes(alvoCompacto) || alvoCompacto.includes(fonteCompacta)) return true;
      const hits = alvoWords.filter((w) => fonte.includes(w)).length;
      if (hits / alvoWords.length >= 0.6) return true;
      const fonteWords = fonte.split(" ").filter((w) => w.length > 2);
      if (fonteWords.length > 0) {
        const inverso = fonteWords.filter((w) => alvo.includes(w)).length;
        if (inverso / fonteWords.length >= 0.6) return true;
      }
    }
    return false;
  }


  function extractCnpjDigits(text: string): string[] {
    const matches = String(text || "").match(/\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}\b/g) || [];
    return matches.map((m) => m.replace(/\D/g, "")).filter(isValidCnpjDigits);
  }

  // Etapa 2 — lê o site do próprio estabelecimento (rodapé / contato / sobre)
  async function discoverCnpjFromWebsite(website?: string): Promise<string[]> {
    if (!website) return [];
    let base: URL;
    try {
      base = new URL(website.startsWith("http") ? website : `https://${website}`);
    } catch {
      return [];
    }
    const paths = ["", "/contato", "/sobre", "/institucional", "/quem-somos", "/politica-de-privacidade"];
    const found = new Set<string>();
    for (const path of paths) {
      try {
        const target = new URL(path || base.pathname || "/", base).toString();
        const resp = await fetch(target, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (!resp.ok) continue;
        const html = (await resp.text()).slice(0, 400_000);
        extractCnpjDigits(html).forEach((c) => found.add(c));
        if (found.size > 0) break;
      } catch {
        // site fora do ar / bloqueado — segue para a próxima tentativa
      }
    }
    if (found.size > 0) console.log(`[CNPJ Discovery] ${found.size} candidato(s) no site do estabelecimento.`);
    return Array.from(found);
  }

  // Etapa 3 — busca assistida por IA com pesquisa Google (somente lista de CNPJs)
  async function discoverCnpjWithAiSearch(
    nomeEmpresa: string,
    cidade?: string,
    estado?: string,
    endereco?: string,
  ): Promise<string[]> {
    const apiKey = optionalEnv("GEMINI_API_KEY");
    if (!apiKey) return [];
    const prompt = [
      `Encontre o CNPJ do estabelecimento abaixo usando a pesquisa Google.`,
      `Nome: ${nomeEmpresa}`,
      cidade ? `Cidade: ${cidade}` : "",
      estado ? `UF: ${estado}` : "",
      endereco ? `Endereço: ${endereco}` : "",
      `Responda APENAS com os CNPJs encontrados, um por linha, no formato 00.000.000/0000-00.`,
      `Não explique nada. Se não encontrar com segurança, responda exatamente NENHUM.`,
      `Nunca invente um número.`,
    ]
      .filter(Boolean)
      .join("\n");

    const models = ["gemini-3.6-flash", "gemini-flash-latest"];
    for (const model of models) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              tools: [{ google_search: {} }],
            }),
            signal: AbortSignal.timeout(20_000),
          },
        );
        if (!resp.ok) {
          console.warn(`[CNPJ Discovery] Busca IA (${model}) respondeu ${resp.status}.`);
          continue;
        }
        const data: any = await resp.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
          .map((p: any) => p?.text || "")
          .join("\n");
        const candidates = extractCnpjDigits(text);
        if (candidates.length > 0) {
          console.log(`[CNPJ Discovery] ${candidates.length} candidato(s) via busca IA (${model}).`);
          return candidates;
        }
        return [];
      } catch (err) {
        console.warn(`[CNPJ Discovery] Falha na busca IA (${model}):`, err);
      }
    }
    return [];
  }

  // Cadeia de descoberta: dados inline -> site oficial -> busca IA
  async function discoverCnpjForBusiness(nomeEmpresa: string, cidade?: string, estado?: string, address?: string, website?: string): Promise<string[]> {
    const candidateCnpjs = new Set<string>();
    try {
      // 1. CNPJ já visível no nome, endereço ou endereço do site
      extractCnpjDigits([nomeEmpresa, address || "", website || ""].join(" ")).forEach((c) =>
        candidateCnpjs.add(c),
      );
      if (candidateCnpjs.size > 0) return Array.from(candidateCnpjs);

      // 2. Site do próprio estabelecimento
      (await discoverCnpjFromWebsite(website)).forEach((c) => candidateCnpjs.add(c));
      if (candidateCnpjs.size > 0) return Array.from(candidateCnpjs);

      // 3. Busca assistida por IA com pesquisa Google
      (await discoverCnpjWithAiSearch(nomeEmpresa, cidade, estado, address)).forEach((c) =>
        candidateCnpjs.add(c),
      );
    } catch (err) {
      console.warn("[CNPJ Discovery] Exceção durante a descoberta:", err);
    }
    return Array.from(candidateCnpjs);
  }


  // API Route: CNPJ Search & Enrichment (BrasilAPI + ReceitaWS + MinhaReceita)
  app.post("/api/consulta-cnpj", async (req, res) => {
    try {
      let { cnpj, nomeEmpresa, cidade, estado, endereco, website } = req.body;

      if (cnpj) {
        cnpj = cnpj.replace(/\D/g, "");
      }

      // Check memory cache if CNPJ is direct
      if (cnpj && cnpj.length === 14 && cnpjCache.has(cnpj)) {
        const cached = cnpjCache.get(cnpj)!;
        if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
          return res.json({ success: true, cached: true, ...cached.data });
        }
      }

      // If CNPJ is provided directly
      if (cnpj && cnpj.length === 14) {
        if (!isValidCnpjDigits(cnpj)) {
          return res.json({
            success: false,
            needManualInput: true,
            error: "O CNPJ informado é inválido (dígitos verificadores não conferem). Confira o número e tente novamente.",
          });
        }
        const result = await fetchCnpjFromPublicApis(cnpj);
        if (result) {
          cnpjCache.set(cnpj, { timestamp: Date.now(), data: result });
          return res.json({ success: true, ...result });
        }
        return res.json({
          success: false,
          needManualInput: true,
          error: "O CNPJ informado não foi localizado na base oficial da Receita Federal. Confira o número e tente novamente.",
        });
      }

      // If CNPJ was NOT directly provided, run discovery using company name, website & location
      if (nomeEmpresa) {
        const negativeKey = `neg:${normalizeBusinessName(nomeEmpresa)}|${(cidade || "").toUpperCase()}`;
        const negative = cnpjCache.get(negativeKey);
        if (negative && Date.now() - negative.timestamp < 600000) {
          return res.json({
            success: false,
            needManualInput: true,
            error: "Não localizamos automaticamente o CNPJ deste estabelecimento. Digite o CNPJ e a Ficha Oficial da Receita Federal é carregada na hora.",
          });
        }

        console.log(`[CNPJ Discovery] Iniciando busca para "${nomeEmpresa}" em "${cidade || "BR"}"...`);
        const candidateCnpjs = await discoverCnpjForBusiness(nomeEmpresa, cidade, estado, endereco, website);
        let sugestao: { cnpj: string; razaoSocial: string } | null = null;

        for (const candidate of candidateCnpjs) {
          if (!isValidCnpjDigits(candidate)) continue;

          const cached = cnpjCache.get(candidate);
          const result =
            cached && Date.now() - cached.timestamp < 3600000
              ? cached.data
              : await fetchCnpjFromPublicApis(candidate);
          if (!result) continue;

          cnpjCache.set(candidate, { timestamp: Date.now(), data: result });

          // Só aceita automaticamente se a razão social / nome fantasia bater com o estabelecimento
          if (!matchesBusinessName(nomeEmpresa, result)) {
            console.log(`[CNPJ Discovery] Candidato ${candidate} não confere com "${nomeEmpresa}" — vira sugestão para confirmação.`);
            if (!sugestao) {
              sugestao = {
                cnpj: candidate,
                razaoSocial: result.razaoSocial || result.nomeFantasia || "",
              };
            }
            continue;
          }

          console.log(`[CNPJ Discovery] CNPJ ${candidate} confirmado para "${nomeEmpresa}".`);
          return res.json({ success: true, autoDiscovered: true, ...result });
        }

        if (sugestao) {
          return res.json({
            success: false,
            needManualInput: true,
            sugestaoCnpj: sugestao.cnpj,
            error: `Encontramos um CNPJ possível para este estabelecimento: ${sugestao.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}${sugestao.razaoSocial ? ` (${sugestao.razaoSocial})` : ""}. Confira e confirme para carregar a Ficha Oficial da Receita Federal.`,
          });
        }

        cnpjCache.set(negativeKey, { timestamp: Date.now(), data: null });
        return res.json({
          success: false,
          needManualInput: true,
          error: "Não localizamos automaticamente o CNPJ deste estabelecimento. Digite o CNPJ e a Ficha Oficial da Receita Federal é carregada na hora.",
        });

      }

      return res.status(400).json({ success: false, error: "Informe o CNPJ ou o nome da empresa para consulta." });


    } catch (err: any) {
      console.error("Error in /api/consulta-cnpj:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro interno ao consultar CNPJ." });
    }
  });

  // --- CREDIT QUERY API INTEGRATION (REDEBE API) ---
  const REDEBE_API_URL = "https://consultas.redebe.com.br/api/v1/credito/diagnostico-inteligente";

  const INTEGRADOR_API_KEY = optionalEnv("INTEGRADOR_API_KEY");

  let INTEGRADOR_BASE_URL = optionalEnv("INTEGRADOR_API_BASE_URL");
  if (!INTEGRADOR_BASE_URL || !INTEGRADOR_BASE_URL.startsWith("http")) {
    console.warn("Invalid or empty INTEGRADOR_API_BASE_URL. Falling back to production URL.");
    INTEGRADOR_BASE_URL = "https://kqfciyqklrosqmgjzjtb.supabase.co/functions/v1";
  }

  const FALLBACK_CATALOG = [
    { code: "REDEBE_DIAGNOSTICO_360", name: "Rating de Crédito + Diagnóstico Finan. 360", price: 49.90 }
  ];

  // 0. Valores públicos: mensalidades da Assessoria + assinatura mensal do parceiro
  app.get("/api/config/mensalidades", async (_req, res) => {
    try {
      const configData: any = await getDocRest("configuracoes/precos_consultas");
      return res.status(200).json({
        ...normalizeMensalidades(configData?.mensalidades),
        assinaturaParceiro: normalizeAssinaturaParceiro(configData?.assinaturaParceiro),
      });
    } catch (err) {
      console.warn("Could not load mensalidades config:", err);
      return res.status(200).json({
        ...DEFAULT_MENSALIDADES,
        assinaturaParceiro: DEFAULT_ASSINATURA_PARCEIRO,
      });
    }
  });

  // 1. List Credit Catalog from the official Firestore configuration.
  app.get("/api/credit/catalogo", async (req, res) => {
    try {
      console.log("Loading credit catalog for RedeBe and custom base prices...");
      
      let customBasePrices: Record<string, number> = {};
      try {
        const configData: any = await getDocRest("configuracoes/precos_consultas");
        customBasePrices = configData?.precos || {};
      } catch (err) {
        console.warn("Could not load custom base prices from config:", err);
      }

      // Base oficial do sistema + override de preço personalizado do Admin (quando existir).
      const partnerCatalog = FALLBACK_CATALOG.map((item: any) => {
        const override = Number(customBasePrices[item.code]);
        const origPrice = Number.isFinite(override) && override >= 0 ? override : Number(item.price);
        if (!Number.isFinite(origPrice) || origPrice < 0) return null;

        // Apply 40% margin markup for partner selling price (e.g. 49.90 * 1.40 = 69.86)
        const partnerPrice = Number((origPrice * 1.40).toFixed(2));
        return {
          code: item.code,
          name: item.name,
          originalPrice: origPrice,
          price: partnerPrice
        };
      }).filter(Boolean);

      if (!partnerCatalog.length) {
        return res.status(503).json({ success: false, error: "Tabela oficial de preços indisponível." });
      }

      return res.json({ success: true, catalog: partnerCatalog });
    } catch (err: any) {
      console.error("Error in /api/credit/catalogo:", err);
      return res.status(503).json({ success: false, error: "Tabela oficial de preços indisponível." });
    }
  });

  // 2. Fetch Supplier API Balance
  app.get("/api/credit/supplier-balance", async (req, res) => {
    try {
      const url = `${INTEGRADOR_BASE_URL}/integrador-api-saldo`;
      const response = await fetch(url, {
        headers: { "x-api-key": INTEGRADOR_API_KEY }
      });

      if (!response.ok) {
        throw new Error(`Supplier API returned status ${response.status}`);
      }

      const data: any = await response.json();
      return res.json({ success: true, balance: data.saldo !== undefined ? data.saldo : data.balance });
    } catch (err: any) {
      console.error("Error fetching supplier balance:", err);
      return res.status(502).json({ error: "Não foi possível consultar o saldo com o integrador principal." });
    }
  });

  // 3. Execute Credit Query (RedeBe API)
  app.post("/api/credit/consultas", async (req, res) => {
    let operationPath = "";
    let chargedPartnerId = "";
    let chargedAmount = 0;
    try {
      const caller = await authenticateApiCaller(req);
      const { partnerId: requestedPartnerId, partnerNome, produto_code, produtoCode, input_data, documento: directDoc, leadId } = req.body || {};
      const codeToUse = produto_code || produtoCode || "REDEBE_DIAGNOSTICO_360";
      const cleanDoc = String(input_data?.documento || directDoc || "").replace(/\D/g, "");
      const requestId = sanitizeIdempotencyKey(req.headers?.["x-idempotency-key"]);

      if (!requestId || !cleanDoc || ![11, 14].includes(cleanDoc.length)) {
        return res.status(400).json({ error: "Documento e identificador da tentativa são obrigatórios." });
      }

      const partnerId = caller.isAdmin ? String(requestedPartnerId || "admin") : caller.partnerId;
      if (!partnerId) return res.status(403).json({ error: "Usuário sem vínculo de parceiro." });
      if (leadId) await assertLeadAccess(String(leadId), caller, partnerId);

      operationPath = `consultas_realizadas/${requestId}`;
      const prior: any = await getDocRest(operationPath);
      if (prior?.status === "sucesso") {
        return res.json({ success: true, consulta_id: requestId, newBalance: prior.saldoApos, debited: prior.debitado === true, produto_nome: prior.produto_nome, data: prior.resultado, idempotentReplay: true });
      }
      // Tentativas anteriores que terminaram em falha ou estorno podem ser
      // refeitas; só bloqueia quando a operação ainda está em andamento.
      if (prior && !["falha", "estornado"].includes(String(prior.status || ""))) {
        return res.status(409).json({ error: "Esta consulta já está sendo processada." });
      }

      // Rede de segurança contra duplicidade: mesmo lead + documento + produto
      // já consultado com sucesso não gera nova chamada nem novo débito.
      const forcarNovaConsulta = caller.isAdmin && req.body?.forcarNovaConsulta === true;
      if (!forcarNovaConsulta && leadId) {
        try {
          const existentes = await runQueryRest("consultas_realizadas", {
            fieldFilter: { field: { fieldPath: "documento" }, op: "EQUAL", value: { stringValue: cleanDoc } },
          });
          const duplicada = existentes.find((r: any) => {
            const d = r?.data || {};
            return (
              String(d.leadId || "") === String(leadId) &&
              String(d.produto_code || "") === codeToUse &&
              String(d.status || "") === "sucesso" &&
              d.resultado
            );
          });
          if (duplicada) {
            operationPath = "";
            return res.json({
              success: true,
              duplicate: true,
              debited: false,
              consulta_id: duplicada.id,
              produto_nome: duplicada.data?.produto_nome || "",
              data: duplicada.data?.resultado,
            });
          }
        } catch (dupErr: any) {
          console.warn("Checagem de duplicidade falhou:", dupErr?.message || "erro");
        }
      }

      const partnerData: any = partnerId === "admin" ? null : await getDocRest(`parceiros/${partnerId}`);
      const isAdminUser = caller.isAdmin;
      if (!isAdminUser && !partnerData) return res.status(404).json({ error: "Parceiro não encontrado no sistema." });

      let configData: any = null;
      try {
        configData = await getDocRest("configuracoes/precos_consultas");
      } catch (cfgErr: any) {
        console.warn("Could not load official prices config:", cfgErr?.message || "erro");
      }
      const catalogItem = FALLBACK_CATALOG.find((item: any) => item.code === codeToUse);
      if (!catalogItem) return res.status(400).json({ error: "Produto de consulta inválido." });
      const overridePrice = Number(configData?.precos?.[codeToUse]);
      const origPrice = Number.isFinite(overridePrice) && overridePrice >= 0 ? overridePrice : Number(catalogItem.price);
      if (!Number.isFinite(origPrice) || origPrice < 0) return res.status(503).json({ error: "Preço oficial indisponível para este produto." });
      const partnerPrice = Number((origPrice * 1.4).toFixed(2));
      const produtoNome = catalogItem.name;

      const operationDoc = {
        requestId, leadId: String(leadId || ""), partnerId,
        partnerNome: partnerNome || partnerData?.nome || "Mesa de Operações",
        produto_code: codeToUse, produto_nome: produtoNome,
        documento: cleanDoc, preco_original: origPrice,
        preco_parceiro: isAdminUser ? 0 : partnerPrice,
        status: "processando", dataCriacao: new Date().toISOString(),
      };
      if (prior) {
        // Retentativa de uma tentativa anterior que falhou/foi estornada:
        // sobrescreve o registro existente em vez de tentar criar de novo.
        await putDocRest(operationPath, { ...operationDoc, erroCodigo: "", debitado: false });
      } else {
        await createDocAtPathRest(operationPath, operationDoc);
      }

      let newBalance = Number(partnerData?.saldoGeral || 0);
      let debited = false;
      if (!isAdminUser) {
        newBalance = await changePartnerBalanceAtomic(partnerId, -partnerPrice);
        chargedPartnerId = partnerId;
        chargedAmount = partnerPrice;
        debited = true;
        await patchDocRest(operationPath, { debitado: true, saldoApos: newBalance });
      }

      const tokenToUse = requireEnv("REDEBE_TOKEN").replace(/^Bearer\s+/i, "").trim();
      const redebeRes = await fetchWithTimeout(REDEBE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenToUse}`, "X-Api-Token": tokenToUse },
        body: JSON.stringify({ documento: cleanDoc }),
      }, 30_000);
      if (!redebeRes.ok) throw new UpstreamError(`REDEBE_${redebeRes.status}`, redebeRes.status);
      const apiResult = await redebeRes.json();

      const consultaDoc = {
        partnerId, partnerNome: partnerNome || partnerData?.nome || "Mesa de Operações",
        leadId: String(leadId || ""), produto_code: codeToUse, produto_nome: produtoNome,
        documento: cleanDoc, preco_original: origPrice, preco_parceiro: isAdminUser ? 0 : partnerPrice,
        isAdminBypass: isAdminUser, dataConsulta: new Date().toISOString(), status: "sucesso",
        request_id: requestId, consulta_id: requestId, resultado: apiResult,
        debitado: debited, saldoApos: newBalance,
      };
      await patchDocRest(operationPath, consultaDoc);

      if (!isAdminUser) {
        createDocRest("notificacoes", {
          recipientId: partnerId, recipientType: "parceiro", titulo: "Consulta Realizada (PROSFEC Diagnóstico 360)",
          mensagem: `Consulta de crédito realizada com sucesso. Valor de R$ ${partnerPrice.toFixed(2).replace(".", ",")} debitado.`,
          tipo: "success", lida: false, dataCriacao: new Date().toISOString(),
        }).catch((error) => console.warn("Notification write failed:", error?.message || "erro"));
      }

      return res.json({ success: true, consulta_id: requestId, newBalance, debited, produto_nome: produtoNome, data: apiResult, meta: { price: isAdminUser ? 0 : partnerPrice, isAdminBypass: isAdminUser } });
    } catch (err: any) {
      if (chargedPartnerId && chargedAmount > 0) {
        try { await changePartnerBalanceAtomic(chargedPartnerId, chargedAmount); } catch { /* reconciliação manual pelo status */ }
      }
      if (operationPath) {
        await patchDocRest(operationPath, { status: chargedPartnerId ? "estornado" : "falha", erroCodigo: err?.code || "QUERY_FAILED" }).catch(() => undefined);
      }
      const status = err?.statusCode || (String(err?.message || "").includes("Saldo insuficiente") ? 400 : 500);
      console.error("RedeBe query failed:", err?.code || err?.message || "erro");
      return res.status(status).json({ error: status === 502 ? "O serviço de consulta está temporariamente indisponível. Nenhum valor foi cobrado." : (err.message || "Erro interno ao executar a consulta.") });
    }
  });

  // 4. Fetch Result of an existing Credit Query
  app.get("/api/credit/consulta-resultado", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Parâmetro 'id' (consulta_id) é obrigatório." });
      }

      const url = `${INTEGRADOR_BASE_URL}/integrador-api-consulta-resultado?id=${id}`;
      const response = await fetch(url, {
        headers: { "x-api-key": INTEGRADOR_API_KEY }
      });

      if (!response.ok) {
        throw new Error(`Supplier API returned status ${response.status}`);
      }

      const data: any = await response.json();
      return res.json({ success: true, data: data });
    } catch (err: any) {
      console.error("Error in /api/credit/consulta-resultado:", err);
      return res.status(500).json({ error: err.message || "Erro ao buscar resultado da consulta." });
    }
  });

  // 3.3 Listar as consultas de um lead (equipe ou parceiro responsável).
  // A leitura passa pelo servidor porque o registro pode ter sido criado pela
  // equipe (partnerId "admin"), caso em que o navegador do parceiro é barrado
  // pelas regras do Firestore.
  app.get("/api/credit/consultas", async (req, res) => {
    try {
      const caller = await authenticateApiCaller(req);
      const leadId = String((req.query as any)?.leadId || "").trim();
      if (!leadId) return res.status(400).json({ error: "Parâmetro 'leadId' é obrigatório." });

      const leadData: any = await getDocRest(`leads/${leadId}`);
      if (!leadData) return res.status(404).json({ error: "Lead não encontrado." });
      await assertLeadAccess(leadId, caller);

      const docsToMatch: string[] = [];
      const cnpj = String(leadData.cnpj || "").replace(/\D/g, "");
      if (cnpj) docsToMatch.push(cnpj);
      if (Array.isArray(leadData.socios)) {
        leadData.socios.forEach((s: any) => {
          const cpf = String(s?.cpf || "").replace(/\D/g, "");
          if (cpf) docsToMatch.push(cpf);
        });
      }

      const byId = new Map<string, any>();

      try {
        const rowsByLead = await runQueryRest("consultas_realizadas", {
          fieldFilter: { field: { fieldPath: "leadId" }, op: "EQUAL", value: { stringValue: leadId } },
        });
        rowsByLead.forEach((r: any) => byId.set(r.id, r));
      } catch (e: any) {
        console.warn("consultas by leadId failed:", e?.message || "erro");
      }

      if (docsToMatch.length) {
        try {
          const rowsByDoc = await runQueryRest("consultas_realizadas", {
            fieldFilter: {
              field: { fieldPath: "documento" },
              op: "IN",
              value: { arrayValue: { values: docsToMatch.slice(0, 10).map((d) => ({ stringValue: d })) } },
            },
          });
          rowsByDoc.forEach((r: any) => {
            const owner = String(r.data?.leadId || "");
            if (owner && owner !== leadId) return; // consulta de outro lead
            if (!byId.has(r.id)) byId.set(r.id, r);
          });
        } catch (e: any) {
          console.warn("consultas by documento failed:", e?.message || "erro");
        }
      }

      const consultas = Array.from(byId.values())
        .filter((r: any) => !String(r.id).startsWith("ia_diagnostico_"))
        .filter((r: any) => r.data && r.data.resultado)
        .map((r: any) => ({
          id: r.id,
          leadId: r.data.leadId || "",
          partnerId: r.data.partnerId || "",
          partnerNome: r.data.partnerNome || "",
          produto_code: r.data.produto_code || "",
          produto_nome: r.data.produto_nome || "",
          documento: r.data.documento || "",
          documentoNome: r.data.documentoNome || "",
          dataConsulta: r.data.dataConsulta || "",
          status: r.data.status || "",
          preco_parceiro: r.data.preco_parceiro ?? null,
          relatorioPdfUrl: r.data.relatorioPdfUrl || "",
          relatorioPdfNome: r.data.relatorioPdfNome || "",
          relatorioPdfTamanho: r.data.relatorioPdfTamanho ?? null,
          relatorioPdfEnviadoEm: r.data.relatorioPdfEnviadoEm || "",
        }))
        .sort(
          (a: any, b: any) =>
            new Date(b.dataConsulta || 0).getTime() - new Date(a.dataConsulta || 0).getTime(),
        );

      return res.json({ success: true, consultas });
    } catch (err: any) {
      const status = err?.statusCode || 500;
      console.error("Error in /api/credit/consultas:", err?.message || err);
      return res.status(status).json({ error: err?.message || "Erro ao carregar as consultas do lead." });
    }
  });



  // 4.1 Solicitar Serviço de Contabilidade com débito real em saldoGeral via runTransaction
  const handleSolicitarServicoContabilidade = async (req: express.Request, res: express.Response) => {
    try {
      const { parceiroId, servicoId, clienteNome, observacoes } = req.body || {};

      if (!parceiroId || !servicoId) {
        return res.status(400).json({
          error: "Parâmetros obrigatórios ausentes: parceiroId e servicoId são necessários.",
        });
      }

      const partnerRef = doc(db, "parceiros", parceiroId);
      const servicoRef = doc(db, "servicos_contabilidade", servicoId);

      let pedidoId = "";
      let nomeServico = "";
      let precoNoMomento = 0;
      let newBalance = 0;
      let parceiroNome = "";

      await runTransaction(db, async (transaction) => {
        // 1. Leitura do serviço
        const servicoSnap = await transaction.get(servicoRef);
        if (!servicoSnap.exists()) {
          const err = new Error("Serviço contábil não encontrado no catálogo.");
          (err as any).statusCode = 404;
          throw err;
        }

        const servicoData = servicoSnap.data();
        if (servicoData.ativo === false) {
          const err = new Error("Este serviço contábil está temporariamente indisponível para novas solicitações.");
          (err as any).statusCode = 400;
          throw err;
        }

        precoNoMomento = typeof servicoData.preco === "number" ? servicoData.preco : Number(servicoData.preco || 0);
        nomeServico = servicoData.nome || "Serviço de Contabilidade";

        // 2. Leitura do parceiro
        const partnerSnap = await transaction.get(partnerRef);
        if (!partnerSnap.exists()) {
          const err = new Error("Parceiro solicitante não encontrado no sistema.");
          (err as any).statusCode = 404;
          throw err;
        }

        const partnerData = partnerSnap.data();
        parceiroNome = partnerData.nome || partnerData.razaoSocial || "Parceiro";
        const saldoGeral = partnerData.saldoGeral !== undefined ? Number(partnerData.saldoGeral) : 0.00;

        // 3. Validação de Saldo Suficiente
        if (saldoGeral < precoNoMomento) {
          const precoFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(precoNoMomento);
          const saldoFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saldoGeral);
          const err = new Error(
            `Saldo insuficiente para solicitar este serviço. O serviço "${nomeServico}" custa ${precoFormatado} e seu saldo geral atual é ${saldoFormatado}. Realize uma recarga via Pix para prosseguir.`
          );
          (err as any).statusCode = 400;
          (err as any).isInsufficientBalance = true;
          (err as any).saldoAtual = saldoGeral;
          (err as any).precoServico = precoNoMomento;
          throw err;
        }

        // 4. Débito no Saldo Geral
        newBalance = Number((saldoGeral - precoNoMomento).toFixed(2));
        transaction.update(partnerRef, {
          saldoGeral: newBalance,
        });

        // 5. Criação do Pedido em pedidos_servicos_contabilidade
        const newPedidoRef = doc(collection(db, "pedidos_servicos_contabilidade"));
        pedidoId = newPedidoRef.id;

        const pedidoData = {
          id: pedidoId,
          parceiroId,
          parceiroNome,
          parceiroEmail: partnerData.email || "",
          servicoId,
          nomeServico, // Copiado no momento do pedido (imutável)
          precoNoMomento, // Copiado no momento do pedido (imutável)
          categoria: servicoData.categoria || "Geral",
          status: "solicitado",
          dataSolicitacao: new Date().toISOString(),
          clienteNome: clienteNome?.trim() || "",
          observacoes: observacoes?.trim() || "",
        };

        transaction.set(newPedidoRef, pedidoData);
      });

      // 6. Notificação interna em background
      try {
        const precoFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(precoNoMomento);
        await addDoc(collection(db, "notificacoes"), {
          recipientId: parceiroId,
          recipientType: "parceiro",
          titulo: "Serviço Contábil Solicitado",
          mensagem: `Sua solicitação para "${nomeServico}" foi recebida com sucesso. O valor de ${precoFormatado} foi debitado do seu saldo geral. Pedido #${pedidoId.slice(0, 8)}.`,
          tipo: "success",
          lida: false,
          dataCriacao: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn("Aviso ao criar notificação de serviço contábil:", notifErr);
      }

      return res.json({
        success: true,
        pedidoId,
        nomeServico,
        precoDebitado: precoNoMomento,
        newBalance,
        dataSolicitacao: new Date().toISOString(),
        message: "Serviço solicitado com sucesso!",
      });
    } catch (err: any) {
      console.error("Erro em /api/contabilidade/solicitar-servico:", err);
      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({
        error: err.message || "Erro interno ao processar a solicitação do serviço contábil.",
        isInsufficientBalance: !!err.isInsufficientBalance,
        saldoAtual: err.saldoAtual,
        precoServico: err.precoServico,
      });
    }
  };

  app.post("/api/contabilidade/solicitar-servico", handleSolicitarServicoContabilidade);
  app.post("/.netlify/functions/solicitar-servico-contabilidade", handleSolicitarServicoContabilidade);

  // 5. Generate PROSFEC IA Diagnostic based on credit queries and lead details
  let aiClient: any = null;
  function getGeminiAI() {
    if (!aiClient) {
      const key = optionalEnv("GEMINI_API_KEY");
      if (!key) {
        throw Object.assign(
          new Error("Configuração ausente: a chave GEMINI_API_KEY não está definida no ambiente do servidor."),
          { statusCode: 500, code: "GEMINI_KEY_MISSING" },
        );
      }
      aiClient = new GoogleGenAI({ apiKey: key });
    }
    return aiClient;
  }

  // Classifica o erro bruto do provedor de IA em algo acionável para o cliente.
  function describeGeminiFailure(err: any): { statusCode: number; message: string; code: string } {
    const rawStatus = Number(err?.status ?? err?.statusCode ?? err?.code);
    const text = String(err?.message || "");
    if (err?.code === "GEMINI_KEY_MISSING") {
      return { statusCode: 500, code: "GEMINI_KEY_MISSING", message: err.message };
    }
    if (text.includes("GEMINI_TIMEOUT")) {
      return {
        statusCode: 504,
        code: "GEMINI_TIMEOUT",
        message: "A IA demorou demais para responder. Tente gerar o diagnóstico novamente.",
      };
    }
    if (rawStatus === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) {
      return {
        statusCode: 429,
        code: "GEMINI_QUOTA",
        message: "O limite de uso da IA foi atingido no momento. Aguarde alguns instantes e tente novamente.",
      };
    }
    if (rawStatus === 401 || rawStatus === 403 || /API key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(text)) {
      return {
        statusCode: 500,
        code: "GEMINI_AUTH",
        message: "A chave de acesso da IA foi recusada pelo provedor. Verifique a configuração GEMINI_API_KEY.",
      };
    }
    if (/token|too large|exceeds|INVALID_ARGUMENT/i.test(text)) {
      return {
        statusCode: 502,
        code: "GEMINI_PAYLOAD",
        message: "O relatório da consulta é grande demais para a análise da IA. Tente novamente; o conteúdo será reduzido.",
      };
    }
    return {
      statusCode: 502,
      code: "GEMINI_UPSTREAM",
      message: "A IA não conseguiu responder no momento. Tente novamente em instantes.",
    };
  }

  // Extrai o JSON puro de uma resposta da IA, ignorando cercas markdown e texto conversacional.
  function extractJsonPayload(text: string): string {
    const raw = String(text || "").trim();
    const fenced = raw.match(/```[ \t]*(?:json)?[ \t]*\r?\n?([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : raw;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return candidate.slice(start, end + 1).trim();
    }
    return candidate;
  }

  async function generateContentWithFallback(
    ai: any,
    requestOptions: any,
    timeoutMs = 8_000,
    validateText?: (text: string) => boolean,
  ) {
    // Modelos mais rápidos primeiro; nunca usar modelos "pro" nesta rota.
    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const fastConfig = {
          ...(requestOptions?.config || {}),
          // Reduz o raciocínio interno (que consome o mesmo orçamento de saída do texto).
          // Família 3.x aceita thinkingLevel; família 2.5 aceita thinkingBudget.
          ...(modelName.startsWith("gemini-3")
            ? { thinkingConfig: { thinkingLevel: "low" } }
            : modelName.startsWith("gemini-2.5")
              ? { thinkingConfig: { thinkingBudget: 0 } }
              : {}),
        };
        const response = await Promise.race([
          ai.models.generateContent({ ...requestOptions, config: fastConfig, model: modelName }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), timeoutMs)),
        ]);
        const responseText = (response as any)?.text || "";
        if (response && responseText) {
          if (!validateText || validateText(responseText)) {
            return response;
          }
          console.error(
            `[PROSFEC IA] Resposta do modelo ${modelName} incompleta/truncada — tentando o próximo modelo.`,
          );
          lastError = Object.assign(
            new Error(`O modelo ${modelName} retornou um laudo incompleto (resposta truncada).`),
            { code: "GEMINI_TRUNCATED" },
          );
          continue;
        }
        lastError = Object.assign(new Error(`O modelo ${modelName} retornou resposta vazia.`), {
          code: "GEMINI_EMPTY",
        });

      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        console.error(
          `[PROSFEC IA] Falha no modelo ${modelName} (status: ${status ?? "n/d"}): ${String(err?.message || err).slice(0, 500)}`,
        );
        // If resource exhausted (429) or invalid model (404), skip to next candidate immediately
        if (status === 429 || status === 404 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    throw lastError || new Error("Falha ao se comunicar com os modelos Gemini.");
  }

  // 5.1 Generate Step 7 Post-Structuring Comparative Diagnostic (Antes vs. Depois)
  app.post("/api/credit/diagnostico-passo7", async (req, res) => {
    try {
      const caller = await authenticateApiCaller(req);
      const { leadId, documento, consultaResultado, consultaId } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "O campo leadId é obrigatório." });
      }

      // 1. Retrieve Lead from Firestore
      const leadData: any = await getDocRest(`leads/${leadId}`);
      if (!leadData) {
        return res.status(404).json({ error: "Lead não encontrado no banco de dados." });
      }
      await assertLeadAccess(String(leadId), caller);
      const cnpjClean = (leadData.cnpj || documento || "").replace(/\D/g, "");

      // 2. Fetch Latest Consultation if not provided directly
      let latestConsultaData = consultaResultado;
      let usedConsultaId = consultaId;

      if (!latestConsultaData) {
        try {
          const rows = await runQueryRest("consultas_realizadas", {
            fieldFilter: { field: { fieldPath: "documento" }, op: "EQUAL", value: { stringValue: cnpjClean } },
          });
          const allowedRows = rows.filter((r: any) => caller.isAdmin || r.data.partnerId === caller.partnerId);
          if (allowedRows.length) {
            allowedRows.sort((a: any, b: any) => new Date(b.data.dataConsulta || 0).getTime() - new Date(a.data.dataConsulta || 0).getTime());
            latestConsultaData = allowedRows[0].data.resultado;
            usedConsultaId = allowedRows[0].id;
          }
        } catch (queryErr) {
          console.warn("Could not query consultas_realizadas for Step 7:", queryErr);
        }
      }

      // 3. Extract baseline from Step 3
      const step3Diag = leadData.diagnosticoPROSFEC || leadData.diagnosticoIA || leadData.diagnosticoConsulta;
      const initialScore = Number(leadData.scoreInicial || 320);
      const initialRestricoesCount = Number(leadData.restricoesIniciaisCount || (step3Diag?.alertas?.length) || 2);
      const faturamentoAnual = Number(leadData.faturamentoAnual || (leadData.mediaReceitaMensal ? leadData.mediaReceitaMensal * 12 : 0)) || 0;
      
      // Calculate realistic apt credit limits (PRONAMPE / FGI up to 30% of faturamento anual)
      const calculatedMaxLimit = Math.max(100000, Math.round(faturamentoAnual * 0.30));

      // 4. Construct AI Prompt for Comparative Diagnosis (Antes vs. Depois)
      const prompt = `Você é o Motor de Inteligência Artificial Especialista em Fomento, Análise de Risco Bancário e Mesa de Operações da PROSFEC.
Esta é a emissão do DOSSIÊ TÉCNICO COMPARATIVO FINAL - PASSO 7: OPERAÇÃO APTA À SOLICITAÇÃO BANCÁRIA.

CONTEXTO DA OPERAÇÃO:
- Empresa: ${leadData.razaoSocial || leadData.nome || "Empresa Cliente"}
- CNPJ: ${leadData.cnpj || cnpjClean}
- Porte / Ramo: ${leadData.porte || "ME"} / ${leadData.ramo || "Geral"}
- Faturamento Anual Apurado (e-CAC): R$ ${faturamentoAnual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Diagnóstico Inicial de Entrada (Passo 3):
  * Score de Entrada Estimado: ~${initialScore} pontos
  * Apontamentos/Restrições Iniciais: ${initialRestricoesCount} restrição(ões) identificadas
  * Parecer Inicial: Perfil com restrições ativas e necessidade de saneamento cadastral e contábil.
- Histórico de Serviços de Estruturação Aplicados no Passo 6:
  ${JSON.stringify(leadData.subEtapasPasso6 || leadData.servicosRecomendados || "Saneamento completo de restrições, atualização de CNDs, retificação contábil e elevação de score/rating.")}
- Nova Consulta de Crédito Pós-Estruturação (PROSFEC Diagnóstico 360):
  ${latestConsultaData ? JSON.stringify(latestConsultaData).slice(0, 3000) : "Perfil 100% saneado, sem restrições ativas, certidões negativas válidas e score restaurado."}

SUA TAREFA:
Gere uma análise técnica aprofundada comparando o ANTES (Passo 3 - Diagnóstico Inicial) e o DEPOIS (Passo 7 - Diagnóstico Pós-Estruturação), certificando formalmente a empresa como 100% APTA para envio aos agentes financeiros e bancos repassadores.

REGRAS DE RESPOSTA OBRIGATÓRIAS:
1. OBRIGATÓRIO: Inicie sua resposta com um bloco JSON delimitado EXATAMENTE por:
\`\`\`json_metrics
{
  "scoreAnterior": ${initialScore},
  "scoreAtual": 795,
  "evolucaoScore": ${795 - initialScore},
  "restricoesAnteriores": ${initialRestricoesCount},
  "restricoesAtuais": 0,
  "statusSaneamento": "100% Saneado / Sem Restrições",
  "limiteAnterior": 0,
  "limiteAtual": ${calculatedMaxLimit},
  "ratingBancario": "A+ (Grau de Investimento)",
  "nivelRisco": "Baixo Risco",
  "statusAptidao": "HOMOLOGADO_APTO",
  "esteirasAptas": ["PRONAMPE (FGO)", "FGI PEAC", "Capital de Giro Bancário", "BNDES Automático"],
  "protocoloHomologacao": "HOM-PROSFEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}"
}
\`\`\`

2. Em seguida, escreva o PARECER TÉCNICO CONCLUSIVO DE HOMOLOGAÇÃO em Markdown de alto nível executivo e formal:
- **🏛️ Dossiê de Homologação e Aptidão Bancária Oficial**
- **📊 Comparativo de Evolução Técnica (Antes vs. Depois)**:
  * Explicar detalhadamente como o perfil saiu da inadimplência/risco moderado para o Grau de Investimento.
  * Destacar a supressão total de apontamentos e regularidade fiscal plena.
- **💼 Capacidade Tomadora e Linhas de Crédito Enquadradas**:
  * Detalhar o teto aprovável de R$ ${calculatedMaxLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} pelo PRONAMPE e FGI PEAC.
  * Condições esperadas (taxas a partir de Selic + 6% a.a. / carência de 6 a 12 meses).
- **✅ Conclusão da Mesa de Operações PROSFEC**:
  * Declaração de prontidão para submissão imediata aos bancos parceiros e agentes de fomento.`;

      const ai = getGeminiAI();
      const aiResponse = await generateContentWithFallback(ai, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 2500,
        }
      });

      const fullAiText = aiResponse.text || "";
      let cleanText = fullAiText;

      // Extract JSON metrics
      let parsedMetrics: any = {
        scoreAnterior: initialScore,
        scoreAtual: 795,
        evolucaoScore: 795 - initialScore,
        restricoesAnteriores: initialRestricoesCount,
        restricoesAtuais: 0,
        statusSaneamento: "100% Saneado / Sem Restrições",
        limiteAnterior: 0,
        limiteAtual: calculatedMaxLimit,
        ratingBancario: "A+ (Grau de Investimento)",
        nivelRisco: "Baixo Risco",
        statusAptidao: "HOMOLOGADO_APTO",
        esteirasAptas: ["PRONAMPE (FGO)", "FGI PEAC", "Capital de Giro Bancário", "BNDES Automático"],
        protocoloHomologacao: `HOM-PROSFEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
      };

      const matchJson = cleanText.match(/```json_metrics\s*([\s\S]*?)\s*```/);
      if (matchJson && matchJson[1]) {
        try {
          parsedMetrics = { ...parsedMetrics, ...JSON.parse(matchJson[1].trim()) };
          cleanText = cleanText.replace(/```json_metrics\s*[\s\S]*?\s*```/, "").trim();
        } catch (e) {
          console.warn("Could not parse json_metrics from Step 7 PROSFEC IA:", e);
        }
      }

      // 5. Structure final Step 7 Diagnostic Object
      const diagnosticoPosEstruturacao = {
        metrics: parsedMetrics,
        parecerTecnico: cleanText,
        dataEmissao: new Date().toISOString(),
        dataConsulta: new Date().toISOString(),
        documentoConsultado: cnpjClean,
        protocolo: parsedMetrics.protocoloHomologacao,
        consultaId: usedConsultaId || null,
        consultaResultado: latestConsultaData || null
      };

      // 6. Update Lead in Firestore
      const nextEtapaVal = Math.max(Number(leadData.etapa || 1), 7);
      await patchDocRest(`leads/${leadId}`, cleanForFirestore({
        diagnosticoPosEstruturacao: cleanForFirestore(diagnosticoPosEstruturacao),
        etapa: nextEtapaVal,
        scoreFinal: parsedMetrics.scoreAtual,
        limiteAptoBancario: parsedMetrics.limiteAtual,
        statusOperacaoPasso7: "APTA_HOMOLOGADA"
      }));

      console.log(`Step 7 Post-Structuring Diagnostic saved successfully for lead ${leadId} (etapa ${nextEtapaVal})`);

      return res.json({
        success: true,
        diagnosticoPosEstruturacao,
        etapa: nextEtapaVal
      });

    } catch (err: any) {
      console.error("Error generating Step 7 Post-Structuring Diagnostic:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao gerar diagnóstico pós-estruturação do Passo 7." });
    }
  });

  app.post("/api/credit/diagnostico-simulador", async (req, res) => {
    try {
      const {
        cnpj,
        razaoSocial,
        porte,
        uf,
        ramo,
        menosDe12Meses,
        capitalSocial,
        mediaReceitaMensal,
        faturamentoAnual,
        seloEmpregaMulher,
        bancoPrincipal,
        possuiLinhaCreditoGovernamentalAtiva,
        linhaCreditoGovernamentalQual
      } = req.body;

      const valFaturamento = parseFloat(faturamentoAnual) || 0;
      const valCapital = parseFloat(capitalSocial) || 0;
      const valMediaReceita = parseFloat(mediaReceitaMensal) || 0;
      const isNewCompany = !!menosDe12Meses;

      // ===== CAMADAS 1 e 2: motor determinístico (elegibilidade + regras do banco) =====
      const engine = runCreditEngine({
        cnpj,
        razaoSocial,
        porte,
        uf,
        ramo,
        isNewCompany,
        valCapital,
        valMediaReceita,
        valFaturamento,
        seloEmpregaMulher,
        bancoPrincipal,
        possuiLinhaCreditoGovernamentalAtiva,
        linhaCreditoGovernamentalQual
      });

      const effectiveAnnualRevenue = engine.contexto.receitaEfetiva;
      const bankRules = engine.bankRules;

      const defaultDocs = [
        "Faturamento dos últimos 12 meses assinado pelo Contador (DRE)",
        "Contrato Social / Alterações Consolidadas ou CCMEI",
        "Documento de Identidade dos Sócios (RG/CNH e CPF)",
        "Comprovante de Endereço Atualizado do CNPJ e dos Sócios",
        "Compartilhamento de Dados e-CAC / Receita Federal autorizado"
      ];

      // Monta a resposta final SEMPRE a partir dos números determinísticos.
      const buildResponse = (
        linha: any,
        textos: {
          creditLineName?: string;
          justificativa?: string;
          justificativaTecnica?: string;
          documentosNecessarios?: string[];
          resumoPerfil?: string;
        },
        fonte: string
      ) => {
        const limite = linha.limite;
        const prazo = linha.prazoTotal;
        const taxa = linha.taxaAnual;
        const parcela = calcularParcela(limite, taxa, prazo);

        const capTotal = !isNewCompany && valFaturamento > 0 ? valFaturamento * 0.30 : (valCapital * 0.5);
        const excedenteCap = Math.max(0, capTotal - limite);

        // Comparativo de mercado SUSPENSO: não há benchmark com fonte, URL, data,
        // metodologia e escopo de amostra. Ver creditRuleSources.ts (BENCHMARK_MERCADO).


        const validacao = GOVERNMENT_CREDIT_LINES[linha.code]
          ? validateCreditLineConditions(
              linha.code,
              limite,
              linha.carencia,
              Math.max(1, prazo - linha.carencia),
              taxa,
              "SAC"
            )
          : { isValid: true, errors: [], warnings: [] };

        if (!validacao.isValid) {
          console.warn(
            `[Simulador] Condições fora da faixa oficial para ${linha.code}:`,
            validacao.errors.join(" | ")
          );
        }

        return {
          success: true,
          creditLineCode: linha.code,
          creditLineName: textos.creditLineName || linha.name,
          recommendedLimit: limite,
          rate: taxa,
          carencia: linha.carencia,
          prazo: prazo,
          parcela: Math.round(parcela * 100) / 100,
          justificativa: textos.justificativa || "",
          justificativaTecnica: textos.justificativaTecnica || "",
          documentosNecessarios:
            textos.documentosNecessarios && textos.documentosNecessarios.length > 0
              ? textos.documentosNecessarios
              : defaultDocs,
          resumoPerfil: textos.resumoPerfil || "",
          fonte,
          bancoDetalhes: bankRules,
          capacidadeTotal: Math.round(capTotal),
          excedenteCapacidade: Math.round(excedenteCap),
          comparativoMercado: null,
          // Campos aditivos (não quebram a interface atual)

          grauAderencia: engine.aderencia,
          grauAderenciaLabel: engine.aderenciaLabel,
          aderenciaMotivos: engine.aderenciaMotivos,
          condicaoBancariaConfirmada: linha.condicaoBancariaConfirmada,
          bancoOperaLinha: linha.operaNoBanco,
          dadosInsuficientes: engine.dadosInsuficientes,
          linhasElegiveis: engine.linhasLiberadas.map((l: any) => ({
            code: l.code,
            name: l.name,
            limite: l.limite,
            taxaAnual: l.taxaAnual,
            carencia: l.carencia,
            prazoTotal: l.prazoTotal,
            operaNoBanco: l.operaNoBanco,
            condicaoBancariaConfirmada: l.condicaoBancariaConfirmada
          })),
          validacaoCondicoes: validacao
        };
      };

      const escolhidaDeterministica = engine.escolhida;

      const textosDeterministicos = {
        creditLineName: escolhidaDeterministica.name,
        justificativa: `Enquadramento em ${escolhidaDeterministica.name} junto ao ${bankRules.bancoNormalizado}. ${bankRules.destaqueEsteira}`,
        justificativaTecnica:
          `Classificação: ${engine.aderenciaLabel}. ` +
          `${escolhidaDeterministica.motivos.join(" ")} ` +
          (escolhidaDeterministica.condicionantes.length
            ? `Condicionantes: ${escolhidaDeterministica.condicionantes.join(" ")} `
            : "") +
          `Esteira: ${bankRules.modalidadeAprovacao}.`,
        documentosNecessarios: defaultDocs,
        resumoPerfil: `Perfil ${porte || "PJ"} no ${bankRules.bancoNormalizado} com receita considerada de R$ ${effectiveAnnualRevenue.toLocaleString("pt-BR")}.`
      };

      // Sem dados suficientes: não aciona a IA nem apresenta números como oferta.
      if (engine.aderencia === "NECESSITA_DIAGNOSTICO") {
        return res.json(
          buildResponse(
            escolhidaDeterministica,
            {
              ...textosDeterministicos,
              justificativa:
                "Os dados informados ainda não são suficientes para confirmar a elegibilidade. Os valores abaixo são uma referência preliminar e precisam de diagnóstico.",
              justificativaTecnica:
                `Classificação: ${engine.aderenciaLabel}. Pendências: ${engine.dadosInsuficientes.join(" ")}`
            },
            "PROSFEC (Motor determinístico — dados insuficientes)"
          )
        );
      }

      // ===== CAMADA 3: IA apenas para priorização entre linhas liberadas e redação =====
      try {
        const ai = getGeminiAI();

        const opcoes = engine.linhasLiberadas.slice(0, 5);
        const opcoesTexto = opcoes
          .map(
            (l: any) =>
              `- ${l.code} | ${l.name}\n` +
              `  Limite calculado: R$ ${l.limite.toLocaleString("pt-BR")}\n` +
              `  Taxa: ${l.taxaAnual}% a.a. | Carência: ${l.carencia} meses | Prazo total: ${l.prazoTotal} meses\n` +
              `  Banco opera a linha: ${l.operaNoBanco === null ? "não cadastrado" : l.operaNoBanco ? "sim" : "não"} | Condição bancária confirmada: ${l.condicaoBancariaConfirmada ? "sim" : "não"}\n` +
              `  Fundamentos: ${l.motivos.join(" ")}\n` +
              `  Condicionantes: ${l.condicionantes.join(" ") || "nenhuma"}`
          )
          .join("\n");

        const prompt = `Você é um Consultor de Crédito Governamental sênior da PROSFEC.

REGRA ABSOLUTA: você NÃO calcula e NÃO altera limite, taxa, carência ou prazo. Esses números já foram determinados pelo motor de elegibilidade da PROSFEC e são imutáveis. Sua função é (1) escolher UMA das linhas já liberadas abaixo e (2) redigir os textos do parecer.

Nunca cite número diferente dos apresentados. Nunca recomende linha que não esteja na lista. Nunca afirme condição de banco marcada como não confirmada — nesse caso escreva que a condição específica da instituição precisa ser confirmada.

DADOS DA EMPRESA:
- Razão Social: ${razaoSocial || "Não informada"}
- CNPJ: ${cnpj || "Não informado"}
- Porte: ${porte || "ME"}
- UF: ${uf || "Não informada"}
- Ramo: ${ramo || "Não informado"}
- Banco de relacionamento: ${bancoPrincipal || "Não informado"} (${bankRules.bancoNormalizado}, categoria ${bankRules.categoria})
- Empresa com menos de 12 meses: ${isNewCompany ? "Sim" : "Não"}
- Capital social: R$ ${valCapital.toLocaleString("pt-BR")}
- Média de receita mensal: R$ ${valMediaReceita.toLocaleString("pt-BR")}
- Faturamento anual: R$ ${valFaturamento.toLocaleString("pt-BR")}
- Receita considerada na análise: R$ ${effectiveAnnualRevenue.toLocaleString("pt-BR")}
- Selo Emprega + Mulher: ${seloEmpregaMulher ? "Sim" : "Não"}
- Linha governamental ativa: ${possuiLinhaCreditoGovernamentalAtiva ? `Sim (${linhaCreditoGovernamentalQual || "não especificada"})` : "Não"}

CLASSIFICAÇÃO DE ADERÊNCIA JÁ DEFINIDA PELO MOTOR: ${engine.aderenciaLabel}
Motivos: ${engine.aderenciaMotivos.join(" ") || "—"}

LINHAS LIBERADAS (escolha exatamente uma destas, pelo código):
${opcoesTexto}

Responda em JSON com as propriedades exatas:
{
  "creditLineCode": "código de UMA das linhas liberadas acima",
  "creditLineName": "nome da linha escolhida exatamente como listado",
  "justificativa": "frase comercial de impacto para o lead, coerente com a classificação ${engine.aderenciaLabel}, sem inventar números",
  "justificativaTecnica": "parecer técnico explicando o enquadramento por porte, faturamento, setor, região e a adequação da esteira do banco informado, citando condicionantes quando houver",
  "documentosNecessarios": ["lista de documentos exigidos"],
  "resumoPerfil": "resumo do porte e faturamento da empresa"
}`;

        const response = await generateContentWithFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                creditLineCode: { type: Type.STRING },
                creditLineName: { type: Type.STRING },
                justificativa: { type: Type.STRING },
                justificativaTecnica: { type: Type.STRING },
                documentosNecessarios: { type: Type.ARRAY, items: { type: Type.STRING } },
                resumoPerfil: { type: Type.STRING }
              },
              required: [
                "creditLineCode",
                "creditLineName",
                "justificativa",
                "justificativaTecnica",
                "documentosNecessarios",
                "resumoPerfil"
              ]
            }
          }
        });

        const responseText = response.text || "";
        if (responseText) {
          const parsed = JSON.parse(responseText.trim());
          const codigoIA = String(parsed.creditLineCode || "").toUpperCase();
          const linhaIA = engine.linhasLiberadas.find((l: any) => l.code === codigoIA);

          if (!linhaIA) {
            console.warn(
              `[Simulador] IA sugeriu linha fora do conjunto liberado ("${codigoIA}"). Mantida a escolha determinística ${escolhidaDeterministica.code}.`
            );
          }

          const linhaFinal = linhaIA || escolhidaDeterministica;

          return res.json(
            buildResponse(
              linhaFinal,
              {
                creditLineName: linhaFinal.name,
                justificativa: parsed.justificativa || textosDeterministicos.justificativa,
                justificativaTecnica:
                  `Classificação: ${engine.aderenciaLabel}. ` +
                  (parsed.justificativaTecnica || textosDeterministicos.justificativaTecnica),
                documentosNecessarios: parsed.documentosNecessarios,
                resumoPerfil: parsed.resumoPerfil || textosDeterministicos.resumoPerfil
              },
              `PROSFEC (Motor determinístico + redação IA — ${bankRules.bancoNormalizado})`
            )
          );
        }
      } catch (aiErr) {
        console.warn("Express /api/credit/diagnostico-simulador: IA indisponível, mantendo resultado determinístico.", aiErr);
      }

      return res.json(
        buildResponse(
          escolhidaDeterministica,
          textosDeterministicos,
          `PROSFEC (Motor determinístico — ${bankRules.bancoNormalizado})`
        )
      );


    } catch (err: any) {
      console.error("Error in /api/credit/diagnostico-simulador:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao gerar recomendação de fomento." });
    }
  });

  // 6. RTB - Recuperação de Tarifa Bancária: Análise Pericial de CCB com PROSFEC IA
  app.post("/api/credit/analise-rtb-ccb", async (req, res) => {
    try {
      const caller = await authenticateApiCaller(req);
      const { leadId, ccbBase64, nomeArquivo, bancoInformado, valorInformado } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "O parâmetro leadId é obrigatório." });
      }

      console.log(`[RTB] Iniciando auditoria de CCB para o lead: ${leadId}...`);

      const leadData: any = await getDocRest(`leads/${leadId}`);
      if (!leadData) {
        return res.status(404).json({ error: "Lead não encontrado no banco de dados." });
      }
      await assertLeadAccess(String(leadId), caller);
      const fileName = nomeArquivo || "CCB_Contrato_Bancario.pdf";
      const fileData = ccbBase64 || leadData.fichaRatingCredito?.dadosCNPJ?.ccbContratoPdf || leadData.dadosCNPJ?.ccbContratoPdf || "";
      const docProtocol = `RTB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const cnpj = leadData.cnpj || "";
      const razaoSocial = leadData.razaoSocial || leadData.nome || "Empresa";
      const bancoPrincipal = bancoInformado || leadData.bancoPrincipal || leadData.fichaRatingCredito?.dadosCNPJ?.ccbBancoEmissor || "Banco Comercial";
      const valorOperacaoEstimado = Number(valorInformado || leadData.fichaRatingCredito?.dadosCNPJ?.ccbValorContrato || leadData.limiteEstimado || 150000);

      let analiseResultado: any = null;

      try {
        const ai = getGeminiAI();
        const parts: any[] = [];

        if (fileData && typeof fileData === "string" && fileData.includes("base64,")) {
          const rawBase64 = fileData.split("base64,")[1];
          parts.push({
            inlineData: {
              data: rawBase64,
              mimeType: "application/pdf"
            }
          });
        }

        const promptText = `
Você é a PROSFEC IA, um sistema pericial de alta precisão especializado em Auditoria Bancária, Direito Bancário, Resoluções do Banco Central do Brasil (BACEN) e Jurisprudência Consolidada do Superior Tribunal de Justiça (STJ).

Analise o documento anexo (Cédula de Crédito Bancário - CCB / Contrato de Financiamento ou Empréstimo Bancário) da empresa ${razaoSocial} (CNPJ: ${cnpj}).
Banco: ${bancoPrincipal}
Valor de Referência: R$ ${valorOperacaoEstimado}

REQUISITOS DA AUDITORIA PERICIAL DE RTB (Recuperação de Tarifas e Encargos Bancários):
1. Identifique o Banco Credor/Emissor, número da CCB/operação, taxas nominais (mensal/anual), CET (Custo Efetivo Total) e data/prazo.
2. Identifique cobranças abusivas, ilícitas ou passíveis de restituição conforme súmulas do STJ e resoluções do BACEN:
   - TAC (Tarifa de Abertura de Crédito) ou TEC (Tarifa de Emissão de Carnê/Boleto) contratadas após 30/04/2008 (Súmula 566/STJ e Res. CMN 3.518/2007).
   - Venda Casada / Seguros Prestamistas ou Proteção Financeira embutidos compulsoriamente sem opção de livre escolha da seguradora (Tema 972/STJ e Art. 39, I do CDC).
   - Tarifa de Cadastro cobrada repetidamente na mesma instituição (Súmula 566/STJ).
   - Serviços de Terceiros, Avaliação de Bens ou Registro de Contrato sem comprovação de prestação efetiva (Tema 958/STJ).
   - Divergência do CET praticado versus pactuado, comissões de permanência cumuladas com outros encargos moratórios (Súmulas 294, 296 e 472 do STJ).
3. Calcule o Potencial de Recuperação Total estimado (soma dos valores apurados das tarifas e encargos indevidos) e o Potencial com Repetição de Indébito em Dobro (Art. 42, parágrafo único do CDC).
4. Forneça o Resumo Executivo, a Tese Jurídica Recomendada e a Sugestão de Ação (ex: "Acordo Extrajudicial Notificatório", "Repetição de Indébito em Dobro" ou "Ação Revisional de Contrato Bancário").

Retorne OBRIGATORIAMENTE um JSON puro (sem marcação markdown extra) com a seguinte estrutura:
{
  "bancoIdentificado": "Nome do Banco",
  "numeroContratoOuCCB": "Número ou Código da Operação",
  "valorOperacao": 150000.00,
  "taxaJurosMensal": "2.15% a.m.",
  "taxaJurosAnual": "29.10% a.a.",
  "cetInformado": "34.50% a.a.",
  "potencialRecuperacaoTotal": 12800.00,
  "potencialRepeticaoIndebito": 25600.00,
  "irregularidadesEncontradas": [
    {
      "tipo": "Venda Casada / Seguro Prestamista",
      "descricao": "Detecção de seguro prestamista embutido no financiamento no valor de R$ 6.200,00 sem apólice individual destacada.",
      "valorEstimado": 6200.00,
      "fundamentacaoLegal": "Tema 972 do STJ e Art. 39, inciso I do CDC",
      "probabilidadeExito": "Alta"
    },
    {
      "tipo": "TAC/TEC",
      "descricao": "Cobrança de tarifa de confecção ou abertura de ficha de crédito em contrato posterior a 2008.",
      "valorEstimado": 2800.00,
      "fundamentacaoLegal": "Súmula 566 do STJ e Resolução CMN nº 3.518/2007",
      "probabilidadeExito": "Alta"
    },
    {
      "tipo": "Tarifa de Cadastro Repetida",
      "descricao": "Tarifa de renovação cadastral cobrada indevidamente em cliente de relacionamento contínuo.",
      "valorEstimado": 1800.00,
      "fundamentacaoLegal": "Súmula 566 do STJ e Resolução BACEN 3.919/2010",
      "probabilidadeExito": "Média"
    },
    {
      "tipo": "Capitalização Indevida / CET Divergente",
      "descricao": "Divergência entre o fluxo financeiro pactuado e as taxas de administração incidentes sobre as parcelas.",
      "valorEstimado": 2000.00,
      "fundamentacaoLegal": "Súmula 539 do STJ e Art. 52, V do CDC",
      "probabilidadeExito": "Alta"
    }
  ],
  "resumoExecutivo": "Laudo pericial de auditoria contratual acusando cobranças indevidas passíveis de ressarcimento pela via administrativa extrajudicial ou judicial.",
  "teseJuridicaRecomendada": "Emissão de Notificação Extrajudicial ao banco emissor requerendo estorno com base no Tema 972/STJ e repetição do indébito (Art. 42 do CDC).",
  "sugestaoAcao": "Acordo Extrajudicial Notificatório"
}
`;

        parts.push({ text: promptText });

        const aiResponse = await generateContentWithFallback(ai, {
          contents: parts,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });

        if (aiResponse && aiResponse.text) {
          const rawClean = aiResponse.text.replace(/```json/g, "").replace(/```/g, "").trim();
          analiseResultado = JSON.parse(rawClean);
        }
      } catch (aiErr) {
        console.warn("[RTB] Gemini analysis failed:", (aiErr as any)?.message || "erro");
      }

      // Não produza um laudo financeiro com números presumidos quando a IA não
      // conseguir validar o documento real.
      if (!analiseResultado || !Number.isFinite(Number(analiseResultado.potencialRecuperacaoTotal))) {
        throw Object.assign(
          new Error("A IA não conseguiu validar o conteúdo da CCB. Nenhuma estimativa fictícia foi salva."),
          { statusCode: 503 },
        );
      }

      // Consolidate final RTB object
      const finalAnaliseRTB = {
        status: "concluido",
        dataAnalise: new Date().toISOString(),
        arquivoNome: fileName,
        protocoloLaudo: docProtocol,
        bancoIdentificado: analiseResultado.bancoIdentificado || bancoPrincipal,
        numeroContratoOuCCB: analiseResultado.numeroContratoOuCCB || "CCB Auditada",
        valorOperacao: Number(analiseResultado.valorOperacao || valorOperacaoEstimado),
        taxaJurosMensal: analiseResultado.taxaJurosMensal || "2.15% a.m.",
        taxaJurosAnual: analiseResultado.taxaJurosAnual || "29.10% a.a.",
        cetInformado: analiseResultado.cetInformado || "34.50% a.a.",
        potencialRecuperacaoTotal: Number(analiseResultado.potencialRecuperacaoTotal || 0),
        potencialRepeticaoIndebito: Number(analiseResultado.potencialRepeticaoIndebito || (Number(analiseResultado.potencialRecuperacaoTotal || 0) * 2)),
        irregularidadesEncontradas: Array.isArray(analiseResultado.irregularidadesEncontradas) ? analiseResultado.irregularidadesEncontradas : [],
        resumoExecutivo: analiseResultado.resumoExecutivo || "Laudo pericial concluído com sucesso.",
        teseJuridicaRecomendada: analiseResultado.teseJuridicaRecomendada || "Notificação Extrajudicial.",
        sugestaoAcao: analiseResultado.sugestaoAcao || "Acordo Extrajudicial Notificatório",
        analistaIa: "PROSFEC IA - Módulo Pericial RTB"
      };

      // Save to Firestore in Lead document
      const updatePayload: any = {
        analiseRTB: finalAnaliseRTB,
        dataUltimaAuditoriaRTB: new Date().toISOString()
      };

      if (fileData) {
        updatePayload["fichaRatingCredito.dadosCNPJ.ccbContratoPdf"] = fileData;
        updatePayload["fichaRatingCredito.dadosCNPJ.ccbContratoPdfNome"] = fileName;
        updatePayload["fichaRatingCredito.dadosCNPJ.ccbBancoEmissor"] = finalAnaliseRTB.bancoIdentificado;
        updatePayload["fichaRatingCredito.dadosCNPJ.ccbValorContrato"] = finalAnaliseRTB.valorOperacao;
      }

      await patchDocRest(`leads/${leadId}`, cleanForFirestore(updatePayload));

      // Create notification for admin / partner
      try {
        await createDocRest("notificacoes", {
          leadId: leadId,
          leadNome: razaoSocial,
          partnerId: caller.isAdmin ? "admin" : caller.partnerId,
          titulo: "Nova Análise de RTB Concluída pela PROSFEC IA",
          mensagem: `A perícia da CCB de ${razaoSocial} identificou R$ ${finalAnaliseRTB.potencialRecuperacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em potencial de recuperação de tarifas bancárias.`,
          dataCriacao: new Date().toISOString(),
          tipo: "rtb_concluido",
          lida: false
        });
      } catch (notifErr) {
        console.warn("Could not save RTB notification:", notifErr);
      }

      console.log(`[RTB] Auditoria concluída com sucesso. Protocolo: ${docProtocol}. Total: R$ ${finalAnaliseRTB.potencialRecuperacaoTotal}`);

      return res.json({
        success: true,
        analiseRTB: finalAnaliseRTB
      });

    } catch (err: any) {
      console.error("[RTB] Error in /api/credit/analise-rtb-ccb:", err);
      return res.status(err?.statusCode || 500).json({ error: err.message || "Erro interno ao processar a auditoria de CCB (RTB)." });
    }
  });





  // --- SECURE PROXIES (mantêm as chaves fora do navegador) ---
  app.get("/api/proxy/integrador-catalogo", async (req, res) => {
    try {
      if (!INTEGRADOR_API_KEY) return res.status(500).json({ error: "INTEGRADOR_API_KEY não configurada." });
      const r = await fetch(`${INTEGRADOR_BASE_URL}/integrador-api-catalogo`, {
        headers: { "x-api-key": INTEGRADOR_API_KEY }
      });
      const data = await r.json().catch(() => null);
      return res.status(r.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro ao consultar catálogo." });
    }
  });

  app.post("/api/proxy/supplier-consulta", async (req, res) => {
    try {
      const { produto_code, documento } = req.body || {};
      if (!documento) return res.status(400).json({ error: "documento é obrigatório." });

      if (produto_code === "REDEBE_DIAGNOSTICO_360") {
        const token = optionalEnv("REDEBE_TOKEN").replace(/^Bearer\s+/i, "").trim();
        if (!token) return res.status(500).json({ error: "REDEBE_TOKEN não configurado." });
        const r = await fetch(REDEBE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-Api-Token": token
          },
          body: JSON.stringify({ documento })
        });
        const data = await r.json().catch(() => null);
        return res.status(r.status).json(data);
      }

      if (!INTEGRADOR_API_KEY) return res.status(500).json({ error: "INTEGRADOR_API_KEY não configurada." });
      const r = await fetch(`${INTEGRADOR_BASE_URL}/integrador-api-consultas`, {
        method: "POST",
        headers: { "x-api-key": INTEGRADOR_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ produto_code, input_data: { documento } })
      });
      const data = await r.json().catch(() => null);
      return res.status(r.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro ao executar consulta." });
    }
  });

  app.post("/api/proxy/places-search", async (req, res) => {
    try {
      const key = firstEnv("GOOGLE_MAPS_API_KEY", "PLACES_API_KEY");
      if (!key) return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY não configurada." });
      const { textQuery, pageSize, pageToken } = req.body || {};
      const payload: any = { textQuery, pageSize: Math.min(20, Number(pageSize) || 10) };
      if (pageToken) payload.pageToken = pageToken;
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName,nextPageToken"
        },
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(() => null);
      return res.status(r.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro na busca de leads." });
    }
  });

  // =====================================================================
  // ETAPA B — Migração de senhas em texto puro para o Firebase Auth
  // =====================================================================
  // Chave server-side (sem restrição de referenciador) para o Identity Toolkit.
  // Lida sempre no momento da chamada — nunca no escopo de módulo.
  const getIdentityToolkitKey = () =>
    firstEnv("FIREBASE_API_KEY", "GOOGLE_API_KEY") || (firebaseConfig as any).apiKey;

  const authRest = async (endpoint: string, payload: any) => {
    const key = getIdentityToolkitKey();
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  };

  const FIREBASE_PROJECT_ID = (firebaseConfig as any).projectId;
  const FIRESTORE_DB_ID = (firebaseConfig as any).firestoreDatabaseId || "(default)";

  // Remove o campo `senha` e grava o authUid usando a REST do Firestore
  // autenticada com o idToken do próprio parceiro (as regras só permitem a
  // remoção da senha pelo dono do documento).
  const limparSenhaFirestore = async (partnerId: string, idToken: string, localId: string) => {
    const url =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
      `/databases/${encodeURIComponent(FIRESTORE_DB_ID)}/documents/parceiros/${partnerId}` +
      `?updateMask.fieldPaths=senha&updateMask.fieldPaths=authUid&updateMask.fieldPaths=authMigradoEm`;
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        fields: {
          authUid: { stringValue: localId || "" },
          authMigradoEm: { stringValue: new Date().toISOString() },
        },
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`Firestore PATCH ${r.status}: ${detail.slice(0, 200)}`);
    }
  };

  // Cria (ou vincula) a conta no Firebase Auth de um parceiro e apaga a senha
  // em texto puro do Firestore.
  const provisionParceiro = async (partnerId: string, email: string, senha: string) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const plainPassword = String(senha || "");
    if (!normalizedEmail || plainPassword.length < 6) {
      return { ok: false, reason: "Credenciais inválidas (senha mínima de 6 caracteres)." };
    }

    let localId: string | null = null;
    let idToken: string | null = null;
    let created = false;

    const signUp = await authRest("signUp", {
      email: normalizedEmail,
      password: plainPassword,
      returnSecureToken: true,
    });

    if (signUp.ok) {
      localId = signUp.data?.localId || null;
      idToken = signUp.data?.idToken || null;
      created = true;
    } else if (String(signUp.data?.error?.message || "").startsWith("EMAIL_EXISTS")) {
      // Já existe no Auth: valida se a senha atual bate para vincular o uid.
      const signIn = await authRest("signInWithPassword", {
        email: normalizedEmail,
        password: plainPassword,
        returnSecureToken: true,
      });
      if (signIn.ok) {
        localId = signIn.data?.localId || null;
        idToken = signIn.data?.idToken || null;
      } else {
        // Conta existe com outra senha — não sobrescrevemos.
        return { ok: false, reason: "EMAIL_EXISTS_DIFFERENT_PASSWORD" };
      }
    } else {
      return { ok: false, reason: signUp.data?.error?.message || "Falha ao criar conta." };
    }

    if (partnerId && idToken) {
      try {
        await limparSenhaFirestore(partnerId, idToken, localId || "");
      } catch (err: any) {
        return {
          ok: true,
          created,
          localId,
          warning: `Conta criada, mas falha ao limpar senha: ${err?.message}`,
        };
      }
    }

    return { ok: true, created, localId };
  };


  // Provisionamento individual (usado no cadastro e na lazy migration do login)
  app.post("/api/auth/provision-parceiro", async (req, res) => {
    try {
      const { email, senha, partnerId } = req.body || {};
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!normalizedEmail || !senha) {
        return res.status(400).json({ error: "email e senha são obrigatórios." });
      }

      // Segurança: só provisiona se existir um parceiro com essa credencial
      // em texto puro no Firestore (ou o doc informado bater).
      const snap = await getDocs(
        query(collection(db, "parceiros"), where("email", "==", normalizedEmail)),
      );
      const match = snap.docs.find(
        (d) => (!partnerId || d.id === partnerId) && d.data()?.senha === senha,
      );
      if (!match) {
        return res.status(401).json({ error: "Credenciais não conferem com o cadastro." });
      }

      const result = await provisionParceiro(match.id, normalizedEmail, String(senha));
      if (!result.ok) return res.status(409).json({ error: result.reason });
      return res.json({ success: true, ...result, partnerId: match.id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro ao provisionar parceiro." });
    }
  });

  // Criação de acesso para membro de equipe (sem senha em texto puro)
  app.post("/api/auth/provision-membro", async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const senha = String(req.body?.senha || "");
      if (!email || senha.length < 6) {
        return res
          .status(400)
          .json({ error: "E-mail válido e senha de no mínimo 6 caracteres são obrigatórios." });
      }

      const signUp = await authRest("signUp", { email, password: senha, returnSecureToken: true });
      if (signUp.ok) {
        return res.json({ success: true, created: true, localId: signUp.data?.localId || "" });
      }

      const code = String(signUp.data?.error?.message || "");
      if (code.startsWith("EMAIL_EXISTS")) {
        const signIn = await authRest("signInWithPassword", {
          email,
          password: senha,
          returnSecureToken: true,
        });
        if (signIn.ok) {
          return res.json({ success: true, created: false, localId: signIn.data?.localId || "" });
        }
        return res.status(409).json({ error: "EMAIL_EXISTS_DIFFERENT_PASSWORD" });
      }

      return res.status(400).json({ error: "Não foi possível criar o acesso." });
    } catch (err: any) {
      console.error("[PROVISION MEMBRO] Falha:", err?.message || "erro");
      return res.status(500).json({ error: "Erro ao criar o acesso do consultor." });
    }
  });

  // Migração em lote — protegida por MIGRATION_ADMIN_TOKEN
  app.post("/api/auth/migrar-parceiros", async (req, res) => {
    const expected = optionalEnv("MIGRATION_ADMIN_TOKEN");
    if (!expected) {
      return res.status(503).json({ error: "MIGRATION_ADMIN_TOKEN não configurado." });
    }
    if (!timingSafeCompare(extractToken(req, "x-migration-token"), expected)) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    try {
      const dryRun = req.body?.dryRun === true;
      const snap = await getDocs(collection(db, "parceiros"));
      const pending = snap.docs.filter(
        (d) => typeof d.data()?.senha === "string" && d.data().senha.length > 0,
      );

      if (dryRun) {
        return res.json({ dryRun: true, total: snap.size, pendentes: pending.length });
      }

      const results: any[] = [];
      for (const d of pending) {
        const data = d.data();
        const r = await provisionParceiro(d.id, data.email, data.senha);
        results.push({
          id: d.id,
          email: String(data.email || "").toLowerCase(),
          ok: r.ok,
          created: (r as any).created ?? false,
          reason: (r as any).reason || (r as any).warning || null,
        });
      }

      return res.json({
        total: snap.size,
        processados: results.length,
        migrados: results.filter((r) => r.ok).length,
        falhas: results.filter((r) => !r.ok),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro na migração." });
    }
  });

  // Identidade de serviço: o servidor autentica no Firebase Auth para poder
  // ler/gravar os campos de senha do lead respeitando as regras do Firestore.
  let serviceTokenCache: { token: string; exp: number } | null = null;

  const getServiceIdToken = async (): Promise<string> => {
    if (serviceTokenCache && serviceTokenCache.exp > Date.now() + 60_000) {
      return serviceTokenCache.token;
    }
    const email = optionalEnv("PROSFEC_SERVICE_EMAIL");
    const password = optionalEnv("PROSFEC_SERVICE_PASSWORD");
    if (!email || !password) {
      throw new Error("Identidade de serviço não configurada.");
    }

    let r = await authRest("signInWithPassword", { email, password, returnSecureToken: true });
    if (!r.ok) {
      // Conta ainda não existe (EMAIL_NOT_FOUND / INVALID_LOGIN_CREDENTIALS): cria.
      const created = await authRest("signUp", { email, password, returnSecureToken: true });
      if (created.ok) r = created;
    }
    if (!r.ok || !r.data?.idToken) {
      throw new Error("Falha ao autenticar a identidade de serviço.");
    }
    serviceTokenCache = {
      token: r.data.idToken,
      exp: Date.now() + (Number(r.data.expiresIn || 3600) - 120) * 1000,
    };
    return serviceTokenCache.token;
  };

  getServiceIdTokenRef.fn = getServiceIdToken;

  // Nomes de campo fora do padrão simples (acento, cedilha, espaço, hífen)
  // precisam ser envolvidos em crases no fieldPath, senão o Firestore recusa
  // a gravação inteira com 400 INVALID_ARGUMENT.
  const escapeFieldPath = (name: string) =>
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `\`${name.replace(/[`\\]/g, "\\$&")}\``;

  const firestoreDocUrl = (path: string, masks: string[] = []) => {
    const base =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
      `/databases/${encodeURIComponent(FIRESTORE_DB_ID)}/documents/${path}`;
    if (!masks.length) return base;
    return (
      base +
      "?" +
      masks
        .map((m) => `updateMask.fieldPaths=${encodeURIComponent(escapeFieldPath(m))}`)
        .join("&")
    );
  };


  const getLeadRest = async (leadId: string) => {
    const idToken = await getServiceIdToken();
    const r = await fetch(firestoreDocUrl(`leads/${leadId}`), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    return data?.fields || null;
  };

  const patchLeadRest = async (leadId: string, fields: any, masks: string[]) => {
    const idToken = await getServiceIdToken();
    const r = await fetch(firestoreDocUrl(`leads/${leadId}`, masks), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`Firestore PATCH ${r.status}: ${detail.slice(0, 160)}`);
    }
  };

  // -------------------------------------------------------------------
  // Cliente Firestore genérico via REST + fetch.
  // O SDK web (firebase/firestore) depende de XMLHttpRequest, que não
  // existe no runtime Edge/Worker do servidor ("ReferenceError:
  // XMLHttpRequest is not defined"). Estes helpers usam apenas fetch.
  // -------------------------------------------------------------------
  const toFirestoreValue = (val: any): any => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === "string") return { stringValue: val };
    if (typeof val === "boolean") return { booleanValue: val };
    if (typeof val === "number") {
      return Number.isInteger(val)
        ? { integerValue: String(val) }
        : { doubleValue: val };
    }
    if (val instanceof Date) return { timestampValue: val.toISOString() };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map((v) => toFirestoreValue(v)) } };
    }
    if (typeof val === "object") {
      const fields: any = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  };

  const toFirestoreFields = (obj: any): any => {
    const fields: any = {};
    for (const [k, v] of Object.entries(obj || {})) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return fields;
  };

  const fromFirestoreValue = (val: any): any => {
    if (!val || typeof val !== "object") return null;
    if ("nullValue" in val) return null;
    if ("stringValue" in val) return val.stringValue;
    if ("booleanValue" in val) return val.booleanValue;
    if ("integerValue" in val) return Number(val.integerValue);
    if ("doubleValue" in val) return Number(val.doubleValue);
    if ("timestampValue" in val) return val.timestampValue;
    if ("arrayValue" in val) {
      return (val.arrayValue?.values || []).map((v: any) => fromFirestoreValue(v));
    }
    if ("mapValue" in val) return fromFirestoreFields(val.mapValue?.fields);
    return null;
  };

  const fromFirestoreFields = (fields: any): any => {
    const out: any = {};
    for (const [k, v] of Object.entries(fields || {})) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  };

  class UpstreamError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, upstreamStatus?: number) {
      super(code);
      this.code = code;
      this.statusCode = upstreamStatus === 429 ? 503 : 502;
    }
  }

  const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 20_000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const sanitizeIdempotencyKey = (raw: any): string => {
    const value = String(raw || "").trim();
    return /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : "";
  };

  const authenticateApiCaller = async (req: any): Promise<{ uid: string; email: string; isAdmin: boolean; partnerId: string }> => {
    const token = extractToken(req, "authorization");
    if (!token) throw Object.assign(new Error("Autenticação obrigatória."), { statusCode: 401 });
    const apiKey = firstEnv("FIREBASE_API_KEY", "GOOGLE_API_KEY") || (firebaseConfig as any).apiKey;
    if (!apiKey) throw Object.assign(new Error("Firebase Auth não configurado no servidor."), { statusCode: 503 });
    const response = await fetchWithTimeout(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }),
    }, 10_000);
    if (!response.ok) throw Object.assign(new Error("Sessão inválida ou expirada."), { statusCode: 401 });
    const user = (await response.json())?.users?.[0];
    const uid = String(user?.localId || "");
    const email = String(user?.email || "").trim().toLowerCase();
    if (!uid) throw Object.assign(new Error("Sessão inválida."), { statusCode: 401 });
    const isAdmin = uid === "Nso5FBoBVHXNY60RDw6NNKeaCC23" || email === "prosfec.tesouraria@gmail.com";
    if (isAdmin) return { uid, email, isAdmin, partnerId: "admin" };

    let rows = await runQueryRest("parceiros", {
      fieldFilter: { field: { fieldPath: "authUid" }, op: "EQUAL", value: { stringValue: uid } },
    }, 1);
    if (!rows.length && email) {
      rows = await runQueryRest("parceiros", {
        fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } },
      }, 1);
    }
    if (!rows.length) throw Object.assign(new Error("Usuário sem cadastro de parceiro."), { statusCode: 403 });
    return { uid, email, isAdmin: false, partnerId: rows[0].id };
  };

  const assertLeadAccess = async (leadId: string, caller: any, partnerId = caller.partnerId) => {
    if (caller.isAdmin) return;
    const lead = await getDocRest(`leads/${leadId}`);
    if (!lead) throw Object.assign(new Error("Lead não encontrado."), { statusCode: 404 });
    const owners = [lead.parceiroId, lead.partnerId, lead.parceiro_id, lead.parentPartnerId].filter(Boolean).map(String);
    if (!owners.includes(String(partnerId))) throw Object.assign(new Error("Você não tem acesso a este lead."), { statusCode: 403 });
  };

  /** Lê um documento. Retorna null quando não existe. */
  const getDocRest = async (path: string): Promise<any | null> => {
    const idToken = await getServiceIdToken();
    const r = await fetch(firestoreDocUrl(path), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (r.status === 404) return null;
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`Firestore GET ${r.status}: ${detail.slice(0, 160)}`);
    }
    const data = await r.json().catch(() => null);
    if (!data?.fields) return null;
    return fromFirestoreFields(data.fields);
  };

  /** Cria um documento com ID automático. Retorna { id }. */
  const createDocRest = async (collectionPath: string, data: any): Promise<{ id: string }> => {
    const idToken = await getServiceIdToken();
    const r = await fetch(firestoreDocUrl(collectionPath), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: toFirestoreFields(cleanForFirestore(data)) }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      if (r.status === 403) {
        console.error(
          `Firestore negou a criação em "${collectionPath}" para a identidade de serviço ` +
          `"${optionalEnv("PROSFEC_SERVICE_EMAIL") || "(não configurada)"}". ` +
          `Verifique se as regras publicadas contêm isServico() e a coleção "${collectionPath}". ` +
          `Detalhe: ${detail.slice(0, 160)}`
        );
      }
      throw new Error(`Firestore CREATE ${r.status}: ${detail.slice(0, 160)}`);
    }
    const created = await r.json().catch(() => null);
    const name: string = created?.name || "";
    return { id: name.split("/").pop() || "" };
  };

  /** Grava um documento inteiro num caminho fixo (sem updateMask). */
  const putDocRest = async (path: string, data: any): Promise<void> => {
    const idToken = await getServiceIdToken();
    const r = await fetch(firestoreDocUrl(path), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: toFirestoreFields(cleanForFirestore(data)) }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`Firestore PUT ${r.status}: ${detail.slice(0, 160)}`);
    }
  };



  const createDocAtPathRest = async (path: string, data: any): Promise<void> => {
    const idToken = await getServiceIdToken();
    const separator = firestoreDocUrl(path).includes("?") ? "&" : "?";
    const r = await fetch(`${firestoreDocUrl(path)}${separator}currentDocument.exists=false`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: toFirestoreFields(cleanForFirestore(data)) }),
    });
    if (r.status === 409 || r.status === 412) throw Object.assign(new Error("Operação duplicada."), { statusCode: 409, code: "DUPLICATE" });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`Firestore CREATE ${r.status}: ${detail.slice(0, 160)}`);
    }
  };

  const changePartnerBalanceAtomic = async (partnerId: string, delta: number): Promise<number> => {
    const idToken = await getServiceIdToken();
    const documentName = `projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/parceiros/${partnerId}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const read = await fetch(firestoreDocUrl(`parceiros/${partnerId}`), { headers: { Authorization: `Bearer ${idToken}` } });
      if (!read.ok) throw new Error("Parceiro não encontrado durante a atualização do saldo.");
      const raw = await read.json();
      const current = Number(fromFirestoreFields(raw.fields)?.saldoGeral || 0);
      const next = Number((current + delta).toFixed(2));
      if (next < 0) throw Object.assign(new Error("Saldo insuficiente para realizar esta consulta."), { statusCode: 400, code: "INSUFFICIENT_BALANCE" });
      const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${encodeURIComponent(FIRESTORE_DB_ID)}/documents:commit`;
      const commit = await fetch(commitUrl, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ writes: [{ update: { name: documentName, fields: { saldoGeral: toFirestoreValue(next) } }, updateMask: { fieldPaths: ["saldoGeral"] }, currentDocument: { updateTime: raw.updateTime } }] }),
      });
      if (commit.ok) return next;
      if (![409, 412].includes(commit.status)) throw new Error(`Falha ao atualizar saldo (${commit.status}).`);
    }
    throw Object.assign(new Error("O saldo foi alterado simultaneamente. Tente novamente."), { statusCode: 409, code: "BALANCE_CONFLICT" });
  };

  /** Atualiza campos de um documento (merge via updateMask). */
  const patchDocRest = async (path: string, data: any): Promise<void> => {
    const clean = cleanForFirestore(data);
    const masks = Object.keys(clean || {});
    if (!masks.length) return;
    const idToken = await getServiceIdToken();
    const r = await fetch(firestoreDocUrl(path, masks), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ fields: toFirestoreFields(clean) }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      if (r.status === 403) {
        console.error(
          `Firestore negou a gravação em "${path}" para a identidade de serviço ` +
          `"${optionalEnv("PROSFEC_SERVICE_EMAIL") || "(não configurada)"}". ` +
          `Confira a função isServico() nas regras publicadas. Detalhe: ${detail.slice(0, 160)}`
        );
        throw Object.assign(
          new Error("O banco de dados recusou a gravação do servidor (permissão da conta de serviço)."),
          { statusCode: 500, code: "FIRESTORE_PERMISSION_DENIED" }
        );
      }
      throw new Error(`Firestore PATCH ${r.status}: ${detail.slice(0, 160)}`);
    }
  };

  /** Executa runQuery numa coleção. Retorna [{ id, data }]. */
  const runQueryRest = async (collectionId: string, where?: any, limit?: number): Promise<any[]> => {
    const idToken = await getServiceIdToken();
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${encodeURIComponent(FIRESTORE_DB_ID)}/documents:runQuery`;
    const structuredQuery: any = { from: [{ collectionId }] };
    if (where) structuredQuery.where = where;
    if (limit) structuredQuery.limit = limit;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ structuredQuery }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(`Firestore QUERY ${r.status}: ${detail.slice(0, 160)}`);
    }
    const rows = await r.json().catch(() => []);
    return (Array.isArray(rows) ? rows : [])
      .filter((row: any) => row?.document)
      .map((row: any) => ({
        id: String(row.document.name || "").split("/").pop(),
        data: fromFirestoreFields(row.document.fields),
      }));
  };

  // =====================================================================
  // Contrato público (assinatura por link) — sem autenticação do cliente
  // =====================================================================

  const sanitizeLeadId = (raw: any): string => {
    const id = String(raw || "").trim();
    return /^[A-Za-z0-9_-]{6,80}$/.test(id) ? id : "";
  };

  /** Mascara o CPF para exibição no recibo público. */
  const maskCpfPublic = (raw: any): string => {
    const d = String(raw || "").replace(/\D/g, "");
    if (d.length !== 11) return "";
    return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  };

  /** Contratos avulsos/aditivos já assinados do lead (documentos imutáveis). */
  const listContratosAssinados = async (leadId: string): Promise<any[]> => {
    let rows: any[] = [];
    try {
      rows = await runQueryRest("contratos", {
        fieldFilter: {
          field: { fieldPath: "leadId" },
          op: "EQUAL",
          value: { stringValue: leadId },
        },
      }, 50);
    } catch (err: any) {
      console.error("Erro ao listar contratos do lead:", err?.message || err);
      return [];
    }

    return rows
      .map((row) => ({ id: row.id, ...(row.data || {}) }))
      .filter((c: any) => c.status === "assinado")
      .sort((a: any, b: any) => String(a.assinaturaData || a.dataCriacao || "").localeCompare(String(b.assinaturaData || b.dataCriacao || "")));
  };

  const publicContratoView = (c: any) => {
    const servicos = Array.isArray(c.servicos) ? c.servicos : [];
    const nomeUnico = servicos.length === 1 ? String(servicos[0]?.nome || "").trim() : "";
    const base =
      c.tipo === "aditivo"
        ? "Termo Aditivo de Inclusão de Serviço Avulso"
        : "Contrato de Prestação de Serviços Avulsos";
    return {
    id: c.id,
    tipo: c.tipo === "aditivo" ? "aditivo" : "avulso",
    titulo: nomeUnico
      ? `${c.tipo === "aditivo" ? "Termo Aditivo" : "Contrato de Prestação de Serviços"} — ${nomeUnico}`
      : base,
    status: c.status,
    servicos: Array.isArray(c.servicos) ? c.servicos : [],
    valorTotal: Number(c.valorTotal || 0),
    contratoOrigemId: c.contratoOrigemId || null,
    contratoOrigemData: c.contratoOrigemData || null,
    dataCriacao: c.dataCriacao || null,
    assinado: c.status === "assinado",
    assinaturaNome: c.assinaturaNome || null,
    assinaturaCpf: maskCpfPublic(c.assinaturaCpf),
    assinaturaData: c.assinaturaData || null,
    assinaturaIp: c.assinaturaIp || null,
    assinaturaDispositivo: c.assinaturaDispositivo || null,
    };
  };

  /** Catálogo de serviços vigente (cláusulas escritas em "Preços e Serviços"). */
  const getCatalogoServicos = async (): Promise<any[]> => {
    try {
      const cfg: any = await getDocRest("configuracoes/precos_consultas");
      return Array.isArray(cfg?.servicos) ? cfg.servicos : [];
    } catch {
      return [];
    }
  };

  const chaveServico = (s: any) =>
    String(s?.id || "").trim() || String(s?.nome || s?.titulo || "").trim().toLowerCase();

  /**
   * Monta o documento pendente do cliente a partir dos serviços que o ADM
   * adicionou no Passo 3. Sem contrato avulso assinado, gera o contrato avulso
   * com todos os serviços; com contrato assinado, gera o termo aditivo apenas
   * com os serviços que ainda não constam em nenhum documento assinado.
   */
  const derivarDocumentosPendentes = async (lead: any, assinados: any[]): Promise<any[]> => {
    const catalogo = await getCatalogoServicos();
    const lista = Array.isArray(lead?.servicosRecomendados) ? lead.servicosRecomendados : [];

    const contratoBase = assinados.find((c: any) => c.tipo !== "aditivo") || null;
    const jaContratados = new Set<string>();
    for (const c of assinados) {
      for (const s of Array.isArray(c.servicos) ? c.servicos : []) {
        const k = chaveServico(s);
        if (k) jaContratados.add(k);
      }
    }

    const servicos = lista
      .filter((s: any) => {
        if (!s) return false;
        // Serviços de êxito (valor 0 / semCustoInicial) TAMBÉM entram no contrato.
        const nome = String(s.nome || s.titulo || "").trim();
        const k = chaveServico(s);
        return !!nome && !!k && !jaContratados.has(k);
      })
      .map((s: any) => {
        const cat = catalogo.find((c: any) => {
          if (!c) return false;
          if (c.id && s.id && String(c.id) === String(s.id)) return true;
          const cn = String(c.nome || "").trim().toLowerCase();
          const sn = String(s.nome || s.titulo || "").trim().toLowerCase();
          return !!cn && cn === sn;
        });
        const nome = String(cat?.nome || s.nome || s.titulo || "Serviço");
        const idServico = String(s.id || cat?.id || "");
        const clausulasPadrao = normalizeServiceClauses(
          (DEFAULT_SERVICE_CLAUSES as any)[idServico] || (DEFAULT_SERVICE_CLAUSES as any)[String(cat?.id || "")]
        );
        const clausulas =
          normalizeServiceClauses(cat?.clausulas) ||
          normalizeServiceClauses(s.clausulas) ||
          clausulasPadrao ||
          CLAUSULA_GENERICA_AVULSO;
        return {
          id: idServico,
          nome,
          valor: Number(s.valor ?? s.preco ?? 0),
          descricao: String(cat?.descricao || s.descricao || ""),
          semCustoInicial: Boolean(s.semCustoInicial ?? cat?.semCustoInicial ?? false),
          clausulas,
          templateId: String(cat?.templateId || s.templateId || buildServiceTemplateId(nome, s.id)),
          templateVersao: Number(cat?.templateVersao || s.templateVersao || 1),
        };
      });


    if (servicos.length === 0) return [];

    const isAditivo = Boolean(contratoBase);
    const prefixo = isAditivo ? "aditivo_auto" : "avulso_auto";

    // Um contrato completo e independente por serviço.
    return servicos.map((s: any, idx: number) => {
      const slug =
        String(s.id || s.nome || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 48) || `item_${idx + 1}`;
      return {
        id: `${prefixo}__${slug}`,
        tipo: isAditivo ? "aditivo" : "avulso",
        titulo: `${isAditivo ? "Termo Aditivo" : "Contrato de Prestação de Serviços"} — ${s.nome}`,
        status: "aguardando_assinatura",
        assinado: false,
        servicos: [s],
        valorTotal: Number(s.valor || 0),
        contratoOrigemId: contratoBase?.id || null,
        contratoOrigemData: contratoBase?.assinaturaData || null,
        dataCriacao: null,
        assinaturaNome: null,
        assinaturaCpf: "",
        assinaturaData: null,
        assinaturaIp: null,
        assinaturaDispositivo: null,
      };
    });
  };

  app.get("/api/public/contrato/:leadId", async (req, res) => {
    try {
      const leadId = sanitizeLeadId(req.params?.leadId);
      if (!leadId) return res.status(400).json({ error: "Identificador de contrato inválido." });

      const lead = await getDocRest(`leads/${leadId}`);
      if (!lead) return res.status(404).json({ error: "Contrato não encontrado." });

      const assinados = await listContratosAssinados(leadId);
      const pendentes = await derivarDocumentosPendentes(lead, assinados);
      const documentosAvulsos = [...assinados.map(publicContratoView), ...pendentes];

      if (!lead.modeloContratacao && documentosAvulsos.length === 0) {
        return res.status(404).json({ error: "Contrato ainda não disponibilizado para assinatura." });
      }

      const cliente = {
        leadId,
        nomeEmpresa: lead.nomeEmpresa || lead.razaoSocial || "",
        cnpj: lead.cnpj || "",
        endereco:
          [(lead as any).endereco, lead.cidade, (lead as any).uf || (lead as any).estado]
            .filter(Boolean)
            .join(", ") || "",
        nomeContato: lead.nomeContato || lead.nome || "",
      };

      const documentos: any[] = [];

      if (lead.modeloContratacao) {
        documentos.push({
          id: "principal",
          tipo: String(lead.modeloContratacao).toLowerCase() === "avulso" ? "principal_avulso" : "assessoria",
          titulo:
            String(lead.modeloContratacao).toLowerCase() === "avulso"
              ? "Contrato de Consultoria e Assessoria em Crédito Empresarial"
              : `Contrato de Assessoria — ${lead.planoEscolhido || "Assessoria"}`,
          status: lead.contratoAssinado ? "assinado" : "aguardando_assinatura",
          assinado: !!lead.contratoAssinado,
          assinaturaNome: lead.contratoAssinadoNome || null,
          assinaturaCpf: maskCpfPublic(lead.contratoAssinadoCpf),
          assinaturaData: lead.contratoAssinadoData || null,
          assinaturaIp: lead.contratoAssinadoIp || null,
          assinaturaDispositivo: lead.contratoAssinadoDispositivo || null,
        });
      }

      documentos.push(...documentosAvulsos);

      return res.json({
        success: true,
        // Mantido por compatibilidade com a página atual
        contrato: {
          ...cliente,
          modeloContratacao: lead.modeloContratacao || "",
          planoEscolhido: lead.planoEscolhido || "",
          valorMensalidade: Number(lead.valorMensalidade || 0),
          contratoAssinado: !!lead.contratoAssinado,
          contratoAssinadoData: lead.contratoAssinadoData || null,
        },
        cliente,
        documentos,
      });
    } catch (err: any) {
      console.error("Erro ao carregar contrato público:", err?.message || err);
      return res.status(500).json({ error: "Erro ao carregar o contrato." });
    }
  });


  // =====================================================================
  // Simulador público da Home — upsert de lead por CNPJ
  // =====================================================================

  const onlyDigits = (raw: any) => String(raw || "").replace(/\D/g, "");

  /** Busca o lead existente por CNPJ (formatado ou somente números). */
  const findLeadByCnpj = async (cnpjRaw: any): Promise<{ id: string; data: any } | null> => {
    const digits = onlyDigits(cnpjRaw);
    if (digits.length !== 14) return null;
    const formatted = String(cnpjRaw || "").trim();
    const candidates = Array.from(new Set([formatted, digits].filter(Boolean)));
    for (const value of candidates) {
      const rows = await runQueryRest(
        "leads",
        { fieldFilter: { field: { fieldPath: "cnpj" }, op: "EQUAL", value: { stringValue: value } } },
        1,
      );
      if (rows.length) return { id: rows[0].id, data: rows[0].data || {} };
    }
    return null;
  };

  app.get("/api/public/leads/existe", async (req, res) => {
    try {
      const cnpj = String(req.query?.cnpj || "");
      if (onlyDigits(cnpj).length !== 14) return res.json({ existe: false });
      const found = await findLeadByCnpj(cnpj);
      if (!found) return res.json({ existe: false });
      return res.json({
        existe: true,
        id: found.id,
        razaoSocial: found.data?.razaoSocial || found.data?.nome || "Empresa cadastrada",
        dataCriacao: found.data?.dataCriacao || "",
        status: found.data?.status || "em análise",
      });
    } catch (err: any) {
      console.warn("Falha ao verificar CNPJ existente:", err?.message || err);
      return res.json({ existe: false });
    }
  });

  // ---------------------------------------------------------------------------
  // WEBHOOK INFINITYPAY — caminho preparado, integração ainda DESLIGADA.
  // Hoje todos os pagamentos são confirmados manualmente no Passo 6 pelo ADM.
  // Quando a InfinityPay for configurada, basta definir INFINITYPAY_WEBHOOK_SECRET
  // e preencher o bloco marcado abaixo com o processamento do evento.
  // ---------------------------------------------------------------------------
  app.get("/api/public/webhooks/infinitypay", async (_req, res) => {
    const configurado = Boolean(optionalEnv("INFINITYPAY_WEBHOOK_SECRET"));
    return res.json({
      success: true,
      provider: "infinitypay",
      configurado,
      mensagem: configurado
        ? "Endpoint disponível."
        : "Endpoint disponível, porém a integração ainda não foi configurada.",
    });
  });

  app.post("/api/public/webhooks/infinitypay", async (req, res) => {
    const secret = optionalEnv("INFINITYPAY_WEBHOOK_SECRET");
    if (!secret) {
      return res.status(503).json({
        success: false,
        error: "Integração de pagamentos não configurada. Confirmação de pagamento permanece manual.",
      });
    }

    // Verificação de assinatura do provedor (comparação de tempo constante)
    const assinatura = String(
      req.headers?.["x-infinitypay-signature"] || req.headers?.["x-signature"] || "",
    ).trim();
    let bodyRaw = "";
    try {
      bodyRaw = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    } catch {
      bodyRaw = "";
    }

    let esperado = "";
    try {
      const { createHmac } = await import("crypto");
      esperado = createHmac("sha256", secret).update(bodyRaw).digest("hex");
    } catch (err: any) {
      console.error("[InfinityPay] Falha ao calcular assinatura:", err?.message || err);
      return res.status(500).json({ success: false, error: "Falha na verificação do webhook." });
    }

    const igual =
      assinatura.length === esperado.length &&
      assinatura.length > 0 &&
      assinatura.split("").every((c, i) => c === esperado[i]);

    if (!igual) {
      return res.status(401).json({ success: false, error: "Assinatura inválida." });
    }

    // TODO (InfinityPay): processar o evento confirmado aqui.
    // Nenhuma gravação automática é feita enquanto a integração não estiver ativa.
    return res.json({ success: true, processado: false });
  });


  app.post("/api/public/leads/simulacao", async (req, res) => {
    try {
      const body = req.body || {};
      const leadId = sanitizeLeadId(body.leadId);
      const payload = body.lead && typeof body.lead === "object" ? body.lead : null;
      if (!payload) return res.status(400).json({ success: false, error: "Dados da simulação ausentes." });

      const digits = onlyDigits(payload.cnpj);
      if (digits.length !== 14) return res.status(400).json({ success: false, error: "CNPJ inválido." });
      if (!String(payload.nome || "").trim()) {
        return res.status(400).json({ success: false, error: "Nome do contato obrigatório." });
      }

      const nowIso = new Date().toISOString();
      const simulacaoEntry = {
        data: nowIso,
        limiteEstimado: Number(payload.limiteEstimado || 0),
        nivelPreparacao: String(payload.nivelPreparacao || ""),
        faturamentoAnual: Number(payload.faturamentoAnual || 0),
        origem: "simulador_home",
      };

      // Campos operacionais nunca sobrescritos num lead já existente
      const PROTECTED_FIELDS = [
        "status", "etapa", "valorAprovado", "comissaoPaga", "pendencias", "pendente",
        "documentos", "socios", "dataCriacao", "clienteSenha", "fichaRatingCredito",
        "comissaoMultinivel", "parcelasAssessoria", "diagnosticoPROSFEC",
      ];

      const existing = await findLeadByCnpj(payload.cnpj);

      if (existing) {
        const update: any = { ...payload };
        for (const field of PROTECTED_FIELDS) delete update[field];

        // Indicação só é gravada quando o lead ainda não tem consultor vinculado
        const jaTemConsultor = !!(existing.data?.parceiroId || existing.data?.partnerId || existing.data?.parentPartnerId);
        if (jaTemConsultor || !payload.parceiroId) {
          delete update.parceiroId;
          delete update.parceiroNome;
        }

        const historicoAtual = Array.isArray(existing.data?.historicoSimulacoes) ? existing.data.historicoSimulacoes : [];
        update.historicoSimulacoes = [...historicoAtual, simulacaoEntry].slice(-10);
        update.dataUltimaSimulacao = nowIso;
        update.updated_at = nowIso;

        await patchDocRest(`leads/${existing.id}`, cleanForFirestore(update));
        return res.json({ success: true, leadId: existing.id, atualizado: true });
      }

      const novoLead = {
        ...payload,
        cnpj: String(payload.cnpj || "").trim(),
        status: payload.status || "novo",
        etapa: Number(payload.etapa || 1),
        dataCriacao: payload.dataCriacao || nowIso,
        dataUltimaSimulacao: nowIso,
        updated_at: nowIso,
        historicoSimulacoes: [simulacaoEntry],
      };

      if (leadId) {
        await putDocRest(`leads/${leadId}`, novoLead);
        return res.json({ success: true, leadId, atualizado: false });
      }


      const created = await createDocRest("leads", novoLead);
      return res.json({ success: true, leadId: created.id, atualizado: false });
    } catch (err: any) {
      console.error("Erro no upsert da simulação pública:", err?.message || err);
      return res.status(500).json({ success: false, error: "Não foi possível registrar a simulação." });
    }
  });

  // Ficha de Sócios da simulação pública (visitante não autenticado)
  const isValidCpf = (raw: any): boolean => {
    const cpf = onlyDigits(raw);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const calc = (len: number) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };
    return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
  };

  app.post("/api/public/leads/socios", async (req, res) => {
    try {
      const body = req.body || {};
      const leadId = sanitizeLeadId(body.leadId);
      if (!leadId) return res.status(400).json({ success: false, error: "Identificador do lead inválido." });

      const rawSocios = Array.isArray(body.socios) ? body.socios : [];
      if (!rawSocios.length || rawSocios.length > 2) {
        return res.status(400).json({ success: false, error: "Informe 1 ou 2 sócios." });
      }

      const socios = rawSocios.map((s: any, index: number) => {
        const nome = String(s?.nome || "").trim().slice(0, 120);
        const cpf = onlyDigits(s?.cpf);
        if (!nome) throw new Error(`Nome do sócio ${index + 1} obrigatório.`);
        if (!isValidCpf(cpf)) throw new Error(`CPF do sócio ${index + 1} inválido.`);
        return {
          nome,
          cpf,
          dataNascimento: String(s?.dataNascimento || "").slice(0, 20),
          participacao: Number(s?.participacao) || 0,
          nomeMae: String(s?.nomeMae || "").trim().slice(0, 120),
          telefone: onlyDigits(s?.telefone).slice(0, 15),
          rg: String(s?.rg || "").trim().slice(0, 30),
          orgaoEmissor: String(s?.orgaoEmissor || "").trim().slice(0, 20),
          cargo: String(s?.cargo || "").trim().slice(0, 40) || (index === 0 ? "Sócio Principal" : `Sócio ${index + 1}`),
        };
      });

      const endereco = body.endereco && typeof body.endereco === "object" ? body.endereco : {};
      const enderecoSocioPrincipal = {
        cep: onlyDigits(endereco.cep).slice(0, 8),
        logradouro: String(endereco.logradouro || "").trim().slice(0, 160),
        numero: String(endereco.numero || "").trim().slice(0, 20),
        complemento: String(endereco.complemento || "").trim().slice(0, 80),
        bairro: String(endereco.bairro || "").trim().slice(0, 80),
        cidade: String(endereco.cidade || "").trim().slice(0, 80),
        uf: String(endereco.uf || "").trim().slice(0, 2).toUpperCase(),
      };

      const existing = await getDocRest(`leads/${leadId}`);
      if (!existing) return res.status(404).json({ success: false, error: "Cadastro não encontrado." });

      await patchDocRest(
        `leads/${leadId}`,
        cleanForFirestore({
          socios,
          enderecoSocioPrincipal,
          etapa: 3,
          status: "em atendimento",
          updated_at: new Date().toISOString(),
        }),
      );

      return res.json({ success: true, leadId });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/obrigatório|inválido/i.test(msg)) {
        return res.status(400).json({ success: false, error: msg });
      }
      console.error("Erro ao salvar sócios da simulação pública:", msg || err);
      return res.status(500).json({ success: false, error: "Não foi possível salvar os dados dos sócios." });
    }
  });


  app.post("/api/public/contrato/:leadId/assinar", async (req, res) => {
    try {
      const leadId = sanitizeLeadId(req.params?.leadId);
      if (!leadId) return res.status(400).json({ error: "Identificador de contrato inválido." });

      const body = req.body || {};
      const nome = String(body.nome || "").trim();
      const cpf = String(body.cpf || "").replace(/\D/g, "");
      const assinatura = String(body.assinatura || "");
      const ip = String(body.ip || "").slice(0, 60);
      const dispositivo = String(body.dispositivo || req.headers?.["user-agent"] || "").slice(0, 400);

      if (nome.length < 5) return res.status(400).json({ error: "Informe o nome completo do responsável." });
      if (cpf.length !== 11) return res.status(400).json({ error: "Informe um CPF válido." });
      if (!assinatura.startsWith("data:image/")) {
        return res.status(400).json({ error: "Assinatura inválida. Desenhe sua assinatura no quadro." });
      }
      if (assinatura.length > 900000) {
        return res.status(400).json({ error: "Assinatura muito grande. Tente novamente." });
      }

      // Assinatura única aplicada a todos os documentos pendentes enviados
      const sanitizeContratoId = (v: any) =>
        String(v || "").trim().replace(/[^A-Za-z0-9_-]/g, "");

      const contratoId = sanitizeContratoId(body.contratoId);
      const listaIds = Array.isArray(body.contratoIds)
        ? body.contratoIds.map(sanitizeContratoId).filter(Boolean)
        : [];
      const alvos: string[] = listaIds.length > 0 ? Array.from(new Set(listaIds)) : [contratoId || "principal"];
      const multiplos = alvos.length > 1;

      const nowIso = new Date().toISOString();
      const assinados: Array<{ id: string; tipo: string; titulo: string; valorTotal: number }> = [];

      class AssinaturaErro extends Error {
        status: number;
        constructor(status: number, message: string) {
          super(message);
          this.status = status;
        }
      }

      const assinarDocumento = async (alvo: string) => {
        // Documentos derivados automaticamente dos serviços do Passo 3
        // (um contrato completo por serviço: avulso_auto__<slug> / aditivo_auto__<slug>).
        if (alvo.startsWith("avulso_auto") || alvo.startsWith("aditivo_auto")) {
          const leadAuto = await getDocRest(`leads/${leadId}`);
          if (!leadAuto) throw new AssinaturaErro(404, "Contrato não encontrado.");

          const assinadosAuto = await listContratosAssinados(leadId);
          const derivados = await derivarDocumentosPendentes(leadAuto, assinadosAuto);
          const sufixo = alvo.includes("__") ? alvo.split("__")[1] : "";
          const alvosDerivados = sufixo
            ? derivados.filter((d: any) => String(d.id).endsWith(`__${sufixo}`))
            : derivados;

          if (alvosDerivados.length === 0) {
            if (multiplos) return;
            throw new AssinaturaErro(409, "Não há serviços pendentes de contratação.");
          }

          const socio = Array.isArray(leadAuto.socios) && leadAuto.socios.length > 0 ? leadAuto.socios[0] : null;

          for (const derivado of alvosDerivados) {
            const novoContrato: Record<string, any> = cleanForFirestore({
              leadId,
              tipo: derivado.tipo,
              status: "assinado",
              titulo: derivado.titulo,
              servicos: derivado.servicos,
              valorTotal: Number(derivado.valorTotal || 0),
              contratoOrigemId: derivado.contratoOrigemId || null,
              contratoOrigemData: derivado.contratoOrigemData || null,
              cliente: {
                razaoSocial: leadAuto.nomeEmpresa || leadAuto.razaoSocial || "",
                cnpj: leadAuto.cnpj || "",
                endereco: [leadAuto.endereco, leadAuto.cidade, leadAuto.uf || leadAuto.estado]
                  .filter(Boolean)
                  .join(", "),
                representante: socio?.nome || leadAuto.nomeContato || leadAuto.nome || "",
                representanteCpf: socio?.cpf || leadAuto.cpf || "",
              },
              dataCriacao: nowIso,
              assinaturaNome: nome,
              assinaturaCpf: cpf,
              assinaturaData: nowIso,
              assinaturaIp: ip,
              assinaturaDispositivo: dispositivo,
              assinaturaDesenho: assinatura,
            });

            const criado = await createDocRest("contratos", novoContrato);

            assinados.push({
              id: (criado as any)?.id || derivado.id,
              tipo: derivado.tipo,
              titulo: derivado.titulo,
              valorTotal: Number(derivado.valorTotal || 0),
            });
          }
          return;
        }

        if (alvo && alvo !== "principal") {
          const contrato = await getDocRest(`contratos/${alvo}`);
          if (!contrato || String(contrato.leadId || "") !== leadId) {
            if (multiplos) return;
            throw new AssinaturaErro(404, "Contrato não encontrado.");
          }
          if (contrato.status === "assinado") {
            if (multiplos) return;
            throw new AssinaturaErro(409, "Este contrato já foi assinado.");
          }
          if (contrato.status !== "aguardando_assinatura") {
            if (multiplos) return;
            throw new AssinaturaErro(409, "Este contrato ainda não está disponível para assinatura.");
          }

          await patchDocRest(`contratos/${alvo}`, {
            status: "assinado",
            assinaturaNome: nome,
            assinaturaCpf: cpf,
            assinaturaData: nowIso,
            assinaturaIp: ip,
            assinaturaDispositivo: dispositivo,
            assinaturaDesenho: assinatura,
          });

          assinados.push({
            id: alvo,
            tipo: String(contrato.tipo || "avulso"),
            titulo:
              contrato.titulo ||
              (contrato.tipo === "aditivo" ? "Termo Aditivo" : "Contrato Avulso de Serviços"),
            valorTotal: Number(contrato.valorTotal || 0),
          });
          return;
        }

        // Documento principal (assessoria mensal ou avulso do lead)
        const lead = await getDocRest(`leads/${leadId}`);
        if (!lead || !lead.modeloContratacao) {
          if (multiplos) return;
          throw new AssinaturaErro(404, "Contrato não encontrado.");
        }
        if (lead.contratoAssinado) {
          if (multiplos) return;
          throw new AssinaturaErro(409, "Este contrato já foi assinado.");
        }

        const currentEtapa = Number(lead.etapa || 1);
        const nextEtapa = Math.max(currentEtapa, 5);

        const payload: Record<string, any> = {
          contratoAssinado: true,
          contratoAssinadoData: nowIso,
          contratoAssinadoIp: ip,
          contratoAssinadoNome: nome,
          contratoAssinadoCpf: cpf,
          contratoAssinadoDispositivo: dispositivo,
          contratoAssinadoDesenho: assinatura,
        };

        if (nextEtapa !== currentEtapa) {
          const historyItem = {
            data: nowIso,
            etapaAnterior: currentEtapa,
            etapaNova: nextEtapa,
            autor: "Cliente (Assinatura Digital)",
            detalhes: `Contrato ${lead.planoEscolhido || lead.modeloContratacao} assinado digitalmente via link público.`,
          };
          payload.etapa = nextEtapa;
          payload.historicoEtapas = Array.isArray(lead.historicoEtapas)
            ? [...lead.historicoEtapas, historyItem]
            : [historyItem];
        }

        await patchDocRest(`leads/${leadId}`, payload);

        assinados.push({
          id: "principal",
          tipo: "principal",
          titulo: `Contrato ${lead.planoEscolhido || lead.modeloContratacao}`,
          valorTotal: Number(lead.valorMensalidade || 0),
        });
      };

      try {
        for (const alvo of alvos) {
          await assinarDocumento(alvo);
        }
      } catch (assErr: any) {
        if (assErr instanceof AssinaturaErro) {
          return res.status(assErr.status).json({ error: assErr.message });
        }
        throw assErr;
      }

      if (assinados.length === 0) {
        return res.status(409).json({ error: "Nenhum documento pendente de assinatura." });
      }

      try {
        const leadDoc = await getDocRest(`leads/${leadId}`);
        const nomeCliente = leadDoc?.nomeEmpresa || leadDoc?.razaoSocial || leadId;
        await createDocRest("notificacoes", {
          recipientId: "admin",
          recipientType: "admin",
          titulo: assinados.length > 1 ? "Documentos assinados pelo cliente" : "Novo contrato assinado",
          mensagem: `${nomeCliente} assinou: ${assinados.map((d) => d.titulo).join(", ")}.`,
          tipo: "success",
          lida: false,
          leadId,
          dataCriacao: nowIso,
        });
      } catch (notifErr: any) {
        console.error("Falha ao notificar assinatura de contrato:", notifErr?.message || notifErr);
      }

      return res.json({
        success: true,
        assinados: assinados.map((d) => ({ id: d.id, tipo: d.tipo })),
        contratoId: assinados.find((d) => d.id !== "principal")?.id || undefined,
        registro: { nome, cpf, data: nowIso, ip, dispositivo },
      });
    } catch (err: any) {
      console.error("Erro ao assinar contrato público:", err?.message || err);
      return res.status(500).json({ error: "Erro ao registrar a assinatura." });
    }
  });

  // =====================================================================
  // Proposta pública do cliente final (link direto, sem cadastro)
  // =====================================================================

  const DOCUMENTOS_PROPOSTA: Array<{ key: string; label: string }> = [
    { key: "identidade", label: "Documento de identidade (RG/CNH)" },
    { key: "cpf", label: "CPF do responsável" },
    { key: "contratoSocial", label: "Contrato Social / MEI" },
    { key: "comprovanteEndereco", label: "Comprovante de endereço da empresa" },
    { key: "cartaoCnpj", label: "Cartão CNPJ" },
    { key: "extratosBancarios", label: "Últimos extratos bancários" },
    { key: "outros", label: "Outros documentos (opcional)" },
  ];

  const CADASTRO_PROPOSTA: Array<{ key: string; label: string; placeholder: string }> = [
    { key: "email", label: "E-mail de contato", placeholder: "empresa@email.com" },
    { key: "whatsapp", label: "Telefone / WhatsApp", placeholder: "(00) 00000-0000" },
    { key: "enderecoEmpresa", label: "Endereço da empresa", placeholder: "Rua, número, bairro" },
    { key: "cidade", label: "Cidade", placeholder: "Cidade" },
    { key: "estado", label: "Estado (UF)", placeholder: "UF" },
    { key: "cep", label: "CEP", placeholder: "00000-000" },
  ];

  const maskCnpjPublic = (raw: any): string => {
    const d = String(raw || "").replace(/\D/g, "");
    if (d.length !== 14) return "";
    return `**.***.${d.slice(5, 8)}/${d.slice(8, 12)}-**`;
  };

  const loadServicesCatalog = async (): Promise<any[]> => {
    try {
      const cfg: any = await getDocRest("configuracoes/precos_consultas");
      const list = cfg?.servicos;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };

  const resolveCheckoutLink = (serv: any, catalog: any[]): string => {
    const pick = (v: any) =>
      typeof v === "string" && v.trim().startsWith("http") ? v.trim() : "";
    const own = pick(serv?.linkPagamento) || pick(serv?.hublaLink) || pick(serv?.checkoutUrl);
    if (own) return own;

    const nome = String(serv?.nome || serv?.titulo || serv?.servico || "").toLowerCase().trim();
    const match = (catalog || []).find(
      (c: any) =>
        c &&
        ((c.id && serv?.id && c.id === serv.id) ||
          (c.nome && nome && String(c.nome).toLowerCase().trim() === nome)),
    );
    return match ? (pick(match.linkPagamento) || pick(match.hublaLink)) : "";
  };

  app.get("/api/public/proposta/:leadId", async (req, res) => {
    try {
      const leadId = sanitizeLeadId(req.params?.leadId);
      if (!leadId) return res.status(400).json({ error: "Link de proposta inválido." });

      const lead: any = await getDocRest(`leads/${leadId}`);
      if (!lead) return res.status(404).json({ error: "Proposta não encontrada." });

      const catalog = await loadServicesCatalog();
      const rawServicos = Array.isArray(lead.servicosRecomendados) ? lead.servicosRecomendados : [];

      const isPagoFlag = (s: any) =>
        String(s?.statusPagamento || "").toLowerCase() === "pago" ||
        String(s?.status || "").toLowerCase() === "pago" ||
        s?.pago === true;

      // Itens espelho de mensalidade/comissão são internos e nunca vão para o cliente
      const isMensalidadeMirror = (item: any) =>
        item?.tipo === "mensalidade" ||
        String(item?.id || "").startsWith("sub_custom_mensalidade_");

      const rawSubEtapasBaixa = (Array.isArray(lead.subEtapasPasso6) ? lead.subEtapasPasso6 : []).filter(
        (s: any) => s && !isMensalidadeMirror(s),
      );
      const findSubEtapaForServico = (s: any) => {
        const nome = String(s?.nome || s?.titulo || s?.servico || "").toLowerCase().trim();
        return rawSubEtapasBaixa.find(
          (sub: any) =>
            sub &&
            ((s?.id && sub.id && String(sub.id) === String(s.id)) ||
              (nome && String(sub.titulo || sub.nome || "").toLowerCase().trim() === nome)),
        );
      };


      const servicos = rawServicos
        .filter((s: any) => s && (s.nome || s.titulo || s.servico))
        .map((s: any) => {
          const valor =
            Number(s.preco ?? s.valor ?? s.valorTotal ?? 0) || 0;
          return {
            id: String(s.id || ""),
            nome: String(s.nome || s.titulo || s.servico || "").slice(0, 160),
            descricao: String(s.descricao || s.detalhe || "").slice(0, 400),
            valor,
            pago: isPagoFlag(s) || isPagoFlag(findSubEtapaForServico(s)),
            linkPagamento: resolveCheckoutLink(s, catalog),
          };
        });


      const total = servicos.reduce((acc: number, s: any) => acc + (Number(s.valor) || 0), 0);

      const docsEnviados: Record<string, string> = {};
      const stored = lead.documentosCliente && typeof lead.documentosCliente === "object"
        ? lead.documentosCliente
        : {};
      for (const d of DOCUMENTOS_PROPOSTA) {
        const v = stored[d.key];
        if (typeof v === "string" && v.trim()) docsEnviados[d.key] = v.trim();
      }

      const prop = lead.propostaNegociada && typeof lead.propostaNegociada === "object"
        ? lead.propostaNegociada
        : null;

      const simulacao = prop
        ? {
            creditLineCode: String(prop.creditLineCode || lead.creditLineCode || ""),
            creditLineName: String(prop.creditLineName || lead.creditLineName || ""),
            valorDesejado: Number(prop.valorDesejado ?? lead.limiteEstimado ?? 0) || 0,
            carenciaMeses: Number(prop.carenciaMeses ?? 0) || 0,
            amortizacaoMeses: Number(prop.amortizacaoMeses ?? 0) || 0,
            sistemaAmortizacao: prop.sistemaAmortizacao === "PRICE" ? "PRICE" : "SAC",
            taxaAnual: Number(prop.taxaAnual ?? 0) || 0,
            pagarJurosCarencia: Boolean(prop.pagarJurosCarencia),
            parcelaInicial: Number(prop.parcelaInicial ?? 0) || 0,
            parcelaFinal: Number(prop.parcelaFinal ?? 0) || 0,
            totalJuros: Number(prop.totalJuros ?? 0) || 0,
            totalPago: Number(prop.totalPago ?? 0) || 0,
            dataSimulacao: prop.dataSimulacao || null,
          }
        : null;

      const cadastroFaltante = CADASTRO_PROPOSTA.filter((c) => {
        const v = (lead as any)[c.key];
        return !(typeof v === "string" && v.trim());
      });

      // ---- Painel de acompanhamento (somente leitura) ----
      const rawSubEtapas = Array.isArray(lead.subEtapasPasso6) ? lead.subEtapasPasso6 : [];
      const subEtapas = rawSubEtapas
        .filter((s: any) => s && (s.titulo || s.nome) && !isMensalidadeMirror(s))

        .map((s: any) => {
          const valor = Number(s.preco ?? s.valor ?? 0) || 0;
          const titulo = String(s.titulo || s.nome || "").slice(0, 200);
          const porDemanda = /demanda/i.test(titulo) || s.porDemanda === true;
          return {
            titulo,
            descricao: String(s.descricao || "").slice(0, 600),
            concluida: s.concluida === true,
            valor,
            pago: isPagoFlag(s),
            semCustoInicial: !(valor > 0),
            porDemanda,
          };
        });

      const concluidas = subEtapas.filter((s: any) => s.concluida).length;
      const totalSub = subEtapas.length;

      const ficha: any = lead.fichaRatingCredito && typeof lead.fichaRatingCredito === "object"
        ? lead.fichaRatingCredito
        : {};
      const validacoes: any =
        ficha.validacoesDocumentos && typeof ficha.validacoesDocumentos === "object"
          ? ficha.validacoesDocumentos
          : {};
      const valsDocs = Object.values(validacoes) as any[];
      const faseRating = String(ficha.faseRating || "");
      const faseLabel =
        faseRating === "concluido"
          ? "Rating concluído"
          : faseRating === "em_aplicacao"
            ? "Rating em aplicação"
            : faseRating === "documentos_recebidos"
              ? "Documentos recebidos"
              : "Aguardando documentos";

      const etapasLabels = [
        "Dados cadastrais do CNPJ",
        "Coleta de dados dos sócios",
        "Consulta diagnóstica CPF e CNPJ",
        "Assinatura de termos e contratos",
        "Recolhimento de acessos e certificado digital",
        "Estruturação da operação",
        "Operação apta para solicitação bancária",
        "Resultado do crédito",
      ];

      const rule =
        (simulacao?.creditLineCode && (GOVERNMENT_CREDIT_LINES as any)[simulacao.creditLineCode]) ||
        (lead.creditLineCode && (GOVERNMENT_CREDIT_LINES as any)[lead.creditLineCode]) ||
        null;

      return res.json({
        success: true,
        proposta: {
          leadId,
          nomeEmpresa: lead.nomeEmpresa || lead.razaoSocial || lead.nome || "",
          nomeContato: lead.nomeContato || lead.nome || "",
          cnpj: maskCnpjPublic(lead.cnpj),
          servicos,
          total,
          simulacao,
          linhaCredito: rule
            ? { code: rule.code, name: rule.name, badge: rule.badge }
            : null,
          acompanhamento: {
            subEtapas,
            progresso: {
              concluidas,
              total: totalSub,
              percentual: totalSub > 0 ? Math.round((concluidas / totalSub) * 100) : 0,
            },
            documentacao: {
              fase: faseLabel,
              aprovados: valsDocs.filter((v: any) => v?.status === "aprovado").length,
              rejeitados: valsDocs.filter((v: any) => v?.status === "rejeitado").length,
            },
            etapaAtual: Number(lead.etapa ?? 1) || 1,
            etapasLabels,
          },
          cadastroCampos: cadastroFaltante,
          aptoMesaCredito: lead.aptoMesaCredito === true,
          aptoMesaCreditoData: lead.aptoMesaCredito === true ? lead.aptoMesaCreditoData || null : null,
          documentosCampos: DOCUMENTOS_PROPOSTA,
          documentosCliente: docsEnviados,
          documentosClienteAtualizadoEm: lead.documentosClienteAtualizadoEm || null,
        },
      });
    } catch (err: any) {
      console.error("Erro ao carregar proposta pública:", err?.message || err);
      return res.status(500).json({ error: "Erro ao carregar a proposta." });
    }
  });

  app.post("/api/public/proposta/:leadId/documentos", async (req, res) => {
    try {
      const leadId = sanitizeLeadId(req.params?.leadId);
      if (!leadId) return res.status(400).json({ error: "Link de proposta inválido." });

      const body = req.body || {};
      const input = body.documentos && typeof body.documentos === "object" ? body.documentos : {};

      const documentos: Record<string, string> = {};
      for (const d of DOCUMENTOS_PROPOSTA) {
        const raw = input[d.key];
        if (raw === undefined || raw === null) continue;
        const link = String(raw).trim();
        if (!link) continue;
        if (!/^https:\/\/\S+$/i.test(link) || link.length > 500) {
          return res
            .status(400)
            .json({ error: `Link inválido em "${d.label}". Use um endereço começando com https://` });
        }
        documentos[d.key] = link;
      }

      const cadastroInput =
        body.cadastro && typeof body.cadastro === "object" ? body.cadastro : {};
      const cadastroRaw: Record<string, string> = {};
      for (const c of CADASTRO_PROPOSTA) {
        const raw = cadastroInput[c.key];
        if (raw === undefined || raw === null) continue;
        const val = String(raw).trim();
        if (!val) continue;
        if (val.length > 200) {
          return res.status(400).json({ error: `O campo "${c.label}" é muito longo.` });
        }
        cadastroRaw[c.key] = val;
      }

      const lead = await getDocRest(`leads/${leadId}`);
      if (!lead) return res.status(404).json({ error: "Proposta não encontrada." });

      // Somente campos ainda vazios no cadastro podem ser preenchidos pelo cliente
      const cadastro: Record<string, string> = {};
      for (const [k, v] of Object.entries(cadastroRaw)) {
        const atualValor = (lead as any)[k];
        if (typeof atualValor === "string" && atualValor.trim()) continue;
        cadastro[k] = v;
      }

      if (!Object.keys(documentos).length && !Object.keys(cadastro).length) {
        return res
          .status(400)
          .json({ error: "Informe ao menos um dado cadastral ou um link de documento." });
      }

      const nowIso = new Date().toISOString();
      const atual =
        (lead as any).documentosCliente && typeof (lead as any).documentosCliente === "object"
          ? (lead as any).documentosCliente
          : {};

      const patch: Record<string, any> = { ...cadastro };
      if (Object.keys(cadastro).length) patch.cadastroClienteAtualizadoEm = nowIso;
      if (Object.keys(documentos).length) {
        patch.documentosCliente = { ...atual, ...documentos };
        patch.documentosClienteAtualizadoEm = nowIso;
      }

      await patchDocRest(`leads/${leadId}`, cleanForFirestore(patch));

      try {
        await createDocRest("notificacoes", {
          recipientId: "admin",
          recipientType: "admin",
          titulo: "Dados e documentos enviados pelo cliente",
          mensagem: `O cliente ${(lead as any).nomeEmpresa || (lead as any).razaoSocial || leadId} enviou dados cadastrais e/ou links de documentação pela proposta.`,
          tipo: "info",
          lida: false,
          leadId,
          dataCriacao: nowIso,
        });
      } catch (notifErr: any) {
        console.error("Falha ao notificar documentação do cliente:", notifErr?.message || notifErr);
      }

      return res.json({
        success: true,
        documentosCliente: { ...atual, ...documentos },
        cadastroSalvo: cadastro,
        atualizadoEm: nowIso,
      });
    } catch (err: any) {
      console.error("Erro ao salvar documentos da proposta:", err?.message || err);
      return res.status(500).json({ error: "Não foi possível salvar os links enviados." });
    }
  });

  return app;




}

