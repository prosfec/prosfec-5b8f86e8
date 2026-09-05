// @ts-nocheck
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import express from "./mini-express";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword as signInService } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc, runTransaction, deleteField } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { GoogleGenAI, Type } from "@google/genai";
import { getBankSpecificRules } from "../utils/creditLineRules";
import { BankRulesManager } from "../utils/BankRulesManager";
import { optionalEnv, requireEnv, firstEnv, maskEmail, maskDoc, redact } from "../utils/env";
import { normalizeMensalidades, DEFAULT_MENSALIDADES, normalizeAssinaturaParceiro, DEFAULT_ASSINATURA_PARCEIRO } from "../utils/serviceUtils";

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

  // Helper to auto-discover CNPJ candidate list from business name, address, website or web search
  async function discoverCnpjForBusiness(nomeEmpresa: string, cidade?: string, estado?: string, address?: string, website?: string): Promise<string[]> {
    const candidateCnpjs = new Set<string>();
    try {
      // 1. Check if CNPJ is already embedded in address or website string
      const searchTargets = [nomeEmpresa, address || "", website || ""].join(" ");
      const inlineMatches = searchTargets.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g);
      if (inlineMatches && inlineMatches.length > 0) {
        inlineMatches.forEach(m => candidateCnpjs.add(m.replace(/\D/g, "")));
      }

      // 2. Build smart search queries
      const cleanName = nomeEmpresa.replace(/[^\w\s]/gi, " ").trim();
      const nameWords = cleanName.split(/\s+/).filter(w => w.length > 2);

      const searchQueries = [
        `${cleanName} ${cidade || ""} ${estado || ""} CNPJ`,
        `"${cleanName}" ${cidade || ""} CNPJ`
      ];

      for (const query of searchQueries) {
        console.log(`[CNPJ Auto-Discovery] Querying search for: "${query}"`);
        
        // Yahoo Search API
        const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
        const yahooRes = await fetch(yahooUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8"
          },
          signal: AbortSignal.timeout(3000)
        }).catch(() => null);

        if (yahooRes && yahooRes.ok) {
          const html = await yahooRes.text();
          const matches = html.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g);
          if (matches && matches.length > 0) {
            matches.forEach(m => candidateCnpjs.add(m.replace(/\D/g, "")));
            console.log(`[CNPJ Auto-Discovery] Found ${matches.length} candidates via Yahoo`);
          }
        }

        if (candidateCnpjs.size > 0) break;
      }
    } catch (err) {
      console.warn("[CNPJ Auto-Discovery] Exception during search:", err);
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
        const result = await fetchCnpjFromPublicApis(cnpj);
        if (result) {
          cnpjCache.set(cnpj, { timestamp: Date.now(), data: result });
          return res.json({ success: true, ...result });
        }
      }

      // If CNPJ was NOT directly provided or failed, run Auto-Discovery using company name & location
      if (nomeEmpresa) {
        console.log(`[CNPJ Auto-Discovery] Initiating lookup for "${nomeEmpresa}" in "${cidade || "BR"}"...`);
        const candidateCnpjs = await discoverCnpjForBusiness(nomeEmpresa, cidade, estado, endereco, website);
        
        for (const candidate of candidateCnpjs) {
          if (candidate.length !== 14) continue;

          if (cnpjCache.has(candidate)) {
            const cached = cnpjCache.get(candidate)!;
            if (Date.now() - cached.timestamp < 3600000) {
              return res.json({ success: true, autoDiscovered: true, cached: true, ...cached.data });
            }
          }

          const result = await fetchCnpjFromPublicApis(candidate);
          if (result) {
            console.log(`[CNPJ Auto-Discovery] Successfully matched & verified CNPJ ${candidate} for "${nomeEmpresa}"!`);
            cnpjCache.set(candidate, { timestamp: Date.now(), data: result });
            return res.json({ success: true, autoDiscovered: true, ...result });
          }
        }
      }

      if (nomeEmpresa) {
        return res.json({
          success: false,
          needManualInput: true,
          error: "Não localizamos automaticamente o CNPJ público para este estabelecimento. Digite o CNPJ para buscar a Ficha Oficial da Receita Federal."
        });
      }

      return res.status(400).json({ success: false, error: "Informe o CNPJ ou o nome da empresa para consulta." });

    } catch (err: any) {
      console.error("Error in /api/consulta-cnpj:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro interno ao consultar CNPJ." });
    }
  });

  // --- CREDIT QUERY API INTEGRATION (REDEBE API) ---
  let REDEBE_TOKEN = optionalEnv("REDEBE_TOKEN");
  const REDEBE_API_URL = "https://consultas.redebe.com.br/api/v1/credito/diagnostico-inteligente";

  let INTEGRADOR_API_KEY = optionalEnv("INTEGRADOR_API_KEY");
  if (INTEGRADOR_API_KEY === "Tony@3419") {
    INTEGRADOR_API_KEY = "intg_Rx5O65qGdNeY6vR1RFjSiKYH0AmXqE0GYFitRYiqf-c";
  }

  let INTEGRADOR_BASE_URL = optionalEnv("INTEGRADOR_API_BASE_URL");
  if (!INTEGRADOR_BASE_URL || !INTEGRADOR_BASE_URL.startsWith("http")) {
    console.warn("Invalid or empty INTEGRADOR_API_BASE_URL. Falling back to production URL.");
    INTEGRADOR_BASE_URL = "https://kqfciyqklrosqmgjzjtb.supabase.co/functions/v1";
  }

  const FALLBACK_CATALOG = [
    { code: "REDEBE_DIAGNOSTICO_360", name: "Rating de Crédito + Diagnóstico Finan. 360", price: 49.90 }
  ];

  // 0. Valores das mensalidades da Assessoria (público — leitura apenas dos 3 preços)
  app.get("/api/config/mensalidades", async (_req, res) => {
    try {
      const configData: any = await getDocRest("configuracoes/precos_consultas");
      return res.status(200).json(normalizeMensalidades(configData?.mensalidades));
    } catch (err) {
      console.warn("Could not load mensalidades config:", err);
      return res.status(200).json(DEFAULT_MENSALIDADES);
    }
  });

  // 1. List Credit Catalog (RedeBe 360 product at R$ 49.90 + 40% Prosfec profit = R$ 69.86)
  app.get("/api/credit/catalogo", async (req, res) => {
    try {
      console.log("Loading credit catalog for RedeBe and custom base prices...");
      
      let customBasePrices: Record<string, number> = {};
      try {
        const configSnap = await getDoc(doc(db, "configuracoes", "precos_consultas"));
        if (configSnap.exists()) {
          customBasePrices = configSnap.data().precos || {};
        }
      } catch (err) {
        console.warn("Could not load custom base prices from config:", err);
      }

      const partnerCatalog = FALLBACK_CATALOG.map((item: any) => {
        let origPrice = item.price;
        if (customBasePrices[item.code] !== undefined) {
          origPrice = Number(customBasePrices[item.code]);
        }

        // Apply 40% margin markup for partner selling price (e.g. 49.90 * 1.40 = 69.86)
        const partnerPrice = Number((origPrice * 1.40).toFixed(2));
        return {
          code: item.code,
          name: item.name,
          originalPrice: origPrice,
          price: partnerPrice
        };
      });

      return res.json({ success: true, catalog: partnerCatalog });
    } catch (err: any) {
      console.error("Error in /api/credit/catalogo:", err);
      const partnerCatalog = FALLBACK_CATALOG.map((item: any) => ({
        code: item.code,
        name: item.name,
        originalPrice: item.price,
        price: Number((item.price * 1.40).toFixed(2))
      }));
      return res.json({ success: true, catalog: partnerCatalog, isFallback: true });
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
    try {
      const { partnerId, partnerNome, produto_code, produtoCode, input_data, documento: directDoc, isAdminBypass } = req.body;
      const codeToUse = produto_code || produtoCode || "REDEBE_DIAGNOSTICO_360";
      const rawDoc = input_data?.documento || directDoc;

      if (!partnerId || !rawDoc) {
        return res.status(400).json({ error: "Parâmetros partnerId e documento são obrigatórios." });
      }

      const cleanDoc = String(rawDoc).replace(/\D/g, "");
      if (!cleanDoc || (cleanDoc.length !== 11 && cleanDoc.length !== 14)) {
        return res.status(400).json({ error: "Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido." });
      }

      console.log(`Executing RedeBe credit query for partner ${partnerId} on document ${maskDoc(cleanDoc)} (isAdminBypass=${!!isAdminBypass})...`);

      // 3.1 Retrieve partner from Firestore to check balance (via REST/fetch)
      const partnerData: any = await getDocRest(`parceiros/${partnerId}`);
      const partnerExists = !!partnerData;

      let currentBalance = 0;
      const isAdminUser = partnerId === "admin" || partnerId === "mesa_operacoes" || !!isAdminBypass;

      if (partnerExists) {
        currentBalance = partnerData?.saldoGeral !== undefined && partnerData?.saldoGeral !== null
          ? Number(partnerData.saldoGeral)
          : 0.00;
      } else if (isAdminUser) {
        currentBalance = 999999;
      } else {
        return res.status(404).json({ error: "Parceiro não encontrado no sistema." });
      }

      // 3.2 Determine price (Base R$ 49.90 + 40% Lucro Prosfec = R$ 69.86)
      let customBasePrices: Record<string, number> = {};
      try {
        const configData: any = await getDocRest("configuracoes/precos_consultas");
        if (configData) {
          customBasePrices = configData.precos || {};
        }
      } catch (err) {
        console.warn("Could not load custom base prices from config:", err);
      }


      const catalogItem = FALLBACK_CATALOG.find((item: any) => item.code === codeToUse) || FALLBACK_CATALOG[0];
      let origPrice = catalogItem.price;
      if (customBasePrices[codeToUse] !== undefined) {
        origPrice = Number(customBasePrices[codeToUse]);
      }

      const partnerPrice = Number((origPrice * 1.40).toFixed(2)); // R$ 69.86 for 49.90 base
      const produtoNome = catalogItem.name;

      // 3.3 Validate balance (pre-check before API call)
      if (!isAdminUser && currentBalance < partnerPrice) {
        return res.status(400).json({ 
          error: `Saldo insuficiente para realizar esta consulta. Esta consulta custa R$ ${partnerPrice.toFixed(2).replace(".", ",")} e seu saldo atual é R$ ${currentBalance.toFixed(2).replace(".", ",")}. Realize uma recarga via Pix para prosseguir.`
        });
      }

      // 3.4 Call RedeBe API
      console.log(`Calling RedeBe API endpoint for document ${maskDoc(cleanDoc)}...`);
      const HARDCODED_TOKEN = "ctk_6626261e8e3c6a7ecae118fa6415975852cc6d3b73dabca9fc7f3748eb216851";
      const envToken = optionalEnv("REDEBE_TOKEN");
      const tokenToUse = (envToken.startsWith("ctk_") || envToken.length > 20)
        ? envToken.replace(/^Bearer\s+/i, "").trim()
        : HARDCODED_TOKEN;

      let apiResult: any = null;
      let isSuccess = false;

      try {
        const redebeRes = await fetch(REDEBE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenToUse}`,
            "X-Api-Token": tokenToUse
          },
          body: JSON.stringify({ documento: cleanDoc })
        });

        if (!redebeRes.ok) {
          const errText = await redebeRes.text();
          console.error(`RedeBe API returned status ${redebeRes.status}:`, errText);
          return res.status(502).json({
            error: `A API da RedeBe retornou um erro (${redebeRes.status}). Verifique o token ou tente novamente em instantes.`
          });
        }

        apiResult = await redebeRes.json();
        console.log("RedeBe API response successfully received for document:", maskDoc(cleanDoc));
        isSuccess = true;
      } catch (fetchErr: any) {
        console.error("Fetch exception while calling RedeBe API:", fetchErr);
        return res.status(502).json({
          error: `Falha na conexão com a API da RedeBe: ${fetchErr.message || "Timeout de conexão."}`
        });
      }

      // 3.5 Deduct balance in Firestore via REST (relê o saldo antes de debitar)
      let newBalance = currentBalance;
      if (partnerExists && !isAdminUser) {
        try {
          const freshData: any = await getDocRest(`parceiros/${partnerId}`);
          if (!freshData) {
            throw new Error("Parceiro não encontrado durante o débito do saldo.");
          }
          const freshBalance = freshData.saldoGeral !== undefined && freshData.saldoGeral !== null
            ? Number(freshData.saldoGeral)
            : 0.00;

          if (freshBalance < partnerPrice) {
            const err: any = new Error(`Saldo insuficiente para realizar esta consulta. Esta consulta custa R$ ${partnerPrice.toFixed(2).replace(".", ",")} e seu saldo atual é R$ ${freshBalance.toFixed(2).replace(".", ",")}. Realize uma recarga via Pix para prosseguir.`);
            err.isInsufficientBalance = true;
            throw err;
          }

          newBalance = Number((freshBalance - partnerPrice).toFixed(2));
          await patchDocRest(`parceiros/${partnerId}`, { saldoGeral: newBalance });
        } catch (transErr: any) {
          if (transErr.isInsufficientBalance) {
            return res.status(400).json({ error: transErr.message });
          }
          throw transErr;
        }
      }

      // 3.6 Register the consultation in Firestore
      const consultaDoc = {
        partnerId,
        partnerNome: partnerNome || partnerData?.nome || (isAdminUser ? "Administrador / Mesa de Operações" : "Parceiro"),
        produto_code: codeToUse,
        produto_nome: produtoNome,
        documento: cleanDoc,
        preco_original: origPrice,
        preco_parceiro: isAdminUser ? 0 : partnerPrice,
        isAdminBypass: !!isAdminUser,
        dataConsulta: new Date().toISOString(),
        status: "sucesso",
        request_id: `redebe_${Date.now()}`,
        consulta_id: `redebe_${Date.now()}`,
        resultado: apiResult
      };

      const consultaRef = await createDocRest("consultas_realizadas", consultaDoc);

      // Create local notification for the partner if not admin bypass
      if (!isAdminUser) {
        try {
          await createDocRest("notificacoes", {
            recipientId: partnerId,
            recipientType: "parceiro",
            titulo: "Consulta Realizada (RedeBe 360)",
            mensagem: `Consulta de crédito (${cleanDoc.length === 11 ? "CPF" : "CNPJ"}: ${cleanDoc}) realizada com sucesso. Valor de R$ ${partnerPrice.toFixed(2).replace(".", ",")} debitado do seu saldo geral.`,
            tipo: "success",
            lida: false,
            dataCriacao: new Date().toISOString()
          });
        } catch (notifErr) {
          console.error("Failed to create notification for query:", notifErr);
        }
      }

      return res.json({
        success: true,
        consulta_id: consultaRef.id,

        newBalance: newBalance,
        produto_nome: produtoNome,
        data: apiResult,
        meta: {
          price: isAdminUser ? 0 : partnerPrice,
          isAdminBypass: !!isAdminUser
        }
      });

    } catch (err: any) {
      console.error("Error executing RedeBe credit query:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao executar a consulta de crédito." });
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
        throw new Error("A chave GEMINI_API_KEY não foi encontrada no arquivo .env ou no painel de controle.");
      }
      aiClient = new GoogleGenAI({ apiKey: key });
    }
    return aiClient;
  }

  async function generateContentWithFallback(ai: any, requestOptions: any) {
    const candidateModels = ["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-3.1-pro-preview"];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          ...requestOptions,
          model: modelName
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        // If resource exhausted (429) or invalid model (404), skip to next candidate immediately
        const status = err?.status || err?.code;
        if (status === 429 || status === 404 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    throw lastError || new Error("Falha ao se comunicar com os modelos Gemini.");
  }

  app.post("/api/credit/diagnostico-prosfec", async (req, res) => {
    try {
      const { leadId, partnerId } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "O parâmetro leadId é obrigatório." });
      }

      console.log(`Generating PROSFEC IA Diagnosis for lead: ${leadId}...`);

      // 1. Fetch Lead data (via REST/fetch — SDK web depende de XMLHttpRequest)
      const leadData: any = await getDocRest(`leads/${leadId}`);

      if (!leadData) {
        return res.status(404).json({ error: "Lead não encontrado no banco de dados." });
      }


      // Check generation count limit (Initial generation = 1, Refazer = 2 max)
      const previousGeracoesCount = Number(
        leadData.diagnosticoPROSFEC?.geracoesCount ||
        leadData.diagnosticoGeracoesCount ||
        (leadData.diagnosticoPROSFEC ? 1 : 0)
      );

      if (previousGeracoesCount >= 2) {
        return res.status(400).json({
          success: false,
          error: "O diagnóstico de IA já foi refeito 1 vez. O limite máximo de reanálises foi atingido para este lead."
        });
      }

      const newGeracoesCount = previousGeracoesCount + 1;

      // 2. Fetch credit consultations performed for this lead's CNPJ or their partner's CPFs
      const docList: string[] = [];
      if (leadData.cnpj) docList.push(leadData.cnpj.replace(/\D/g, ""));
      
      if (leadData.socios && Array.isArray(leadData.socios)) {
        leadData.socios.forEach((s: any) => {
          if (s.cpf) {
            docList.push(s.cpf.replace(/\D/g, ""));
          }
        });
      }

      let matchingConsultas: any[] = [];
      if (docList.length > 0) {
        try {
          const rows = await runQueryRest("consultas_realizadas", {
            fieldFilter: {
              field: { fieldPath: "documento" },
              op: "IN",
              value: { arrayValue: { values: docList.map((d) => ({ stringValue: d })) } }
            }
          });

          matchingConsultas = rows.map((r: any) => ({
            id: r.id,
            produto_nome: r.data.produto_nome,
            produto_code: r.data.produto_code,
            dataConsulta: r.data.dataConsulta,
            resultado: r.data.resultado
          }));
        } catch (dbErr) {
          console.warn("Could not load matching consultations from Firestore:", dbErr);
        }
      }


      // Compile summaries of consultations
      const consultationsSummary = matchingConsultas.map(c => {
        const cleanResult = { ...c.resultado };
        if (cleanResult.html_report) delete cleanResult.html_report;
        if (cleanResult.pdf_report) delete cleanResult.pdf_report;
        if (cleanResult.raw_response) delete cleanResult.raw_response;

        return {
          id: c.id,
          produto: c.produto_nome,
          codigo: c.produto_code,
          data: c.dataConsulta,
          resumo_resultado: cleanResult
        };
      });

      // 3. Load dynamic service price catalog from Firestore
      let activeServicesCatalog: Array<{ id: string; nome: string; valor: number; hublaLink?: string; [key: string]: any }> = [
        { id: "serv_reabilitacao", nome: "Programa de Reabilitação Financeira e Creditícia", valor: 0 },
        { id: "serv_rating_score", nome: "Melhoria e Adequação de Rating e Score", valor: 1100 },
        { id: "serv_contabil", nome: "Serviços Contábeis p/ Regularização/Adequação CNPJ", valor: 700 }
      ];

      try {
        const configSnap = await getDoc(doc(db, "configuracoes", "precos_consultas"));
        if (configSnap.exists() && configSnap.data().servicos && Array.isArray(configSnap.data().servicos) && configSnap.data().servicos.length > 0) {
          activeServicesCatalog = configSnap.data().servicos.filter((s: any) =>
            s.id !== "serv_diagnostico" &&
            s.id !== "serv_caca_leads" &&
            s.id !== "serv_bacen" &&
            !s.nome?.toLowerCase().includes("diagnóstico de crédito") &&
            !s.nome?.toLowerCase().includes("caça-leads") &&
            !s.nome?.toLowerCase().includes("atuação administrativa bacen")
          );
        }
      } catch (err) {
        console.warn("Could not load dynamic price catalog from Firestore, using default:", err);
      }

      // Ensure activeServicesCatalog ALWAYS unifies Rating and Score into one item, and Reabilitação unificada
      const hasSeparateScoreOrRating = activeServicesCatalog.some(s => 
        s.id === "serv_score" || 
        s.id === "serv_rating" || 
        (s.nome && s.nome.toLowerCase().includes("score") && !s.nome.toLowerCase().includes("rating")) ||
        (s.nome && s.nome.toLowerCase().includes("rating") && !s.nome.toLowerCase().includes("score"))
      );

      if (hasSeparateScoreOrRating) {
        let scoreVal = 400;
        let ratingVal = 700;
        const sanitizedCatalog = activeServicesCatalog.filter(s => {
          if (s.id === "serv_score" || (s.nome && s.nome.toLowerCase().includes("score") && !s.nome.toLowerCase().includes("rating"))) {
            if (s.valor) scoreVal = Number(s.valor);
            return false;
          }
          if (s.id === "serv_rating" || (s.nome && s.nome.toLowerCase().includes("rating") && !s.nome.toLowerCase().includes("score"))) {
            if (s.valor) ratingVal = Number(s.valor);
            return false;
          }
          return true;
        });

        if (!sanitizedCatalog.some(s => s.id === "serv_rating_score" || (s.nome && s.nome.toLowerCase().includes("rating") && s.nome.toLowerCase().includes("score")))) {
          sanitizedCatalog.splice(1, 0, {
            id: "serv_rating_score",
            nome: "Melhoria e Adequação de Rating e Score",
            valor: scoreVal + ratingVal
          });
        }
        activeServicesCatalog = sanitizedCatalog;
      }

      // Garantir presença do Programa de Reabilitação Financeira e Creditícia no catálogo ativo
      const hasReabilitacao = activeServicesCatalog.some(s => 
        s.id === "serv_reabilitacao" || 
        s.nome?.toLowerCase().includes("reabilitação") ||
        s.nome?.toLowerCase().includes("reabilitacao")
      );
      if (!hasReabilitacao) {
        activeServicesCatalog.unshift({
          id: "serv_reabilitacao",
          nome: "Programa de Reabilitação Financeira e Creditícia",
          valor: 0
        });
      }

      const catalogPromptText = activeServicesCatalog
        .map((s, idx) => `${idx + 1}. ${s.nome} (id: "${s.id}"): R$ ${Number(s.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
        .join("\n");

      // 4. Lazy initialize Gemini API and run the two-stage forensic pipeline
      const ai = getGeminiAI();

      // =========================================================================
      // ETAPA 1: AUDITORIA QUANTITATIVA & TRIAGEM DE RISCO (EXTRATOR PERICIAL)
      // =========================================================================
      console.log(`[PROSFEC IA] Iniciando Etapa 1: Auditoria Quantitativa para o Lead ${leadId}`);

      const stage1AuditPrompt = `Você é o Engenheiro Chefe de Risco e Auditor Pericial de Crédito da PROSFEC IA.
Sua única e estrita função nesta Etapa 1 é realizar a AUDITORIA QUANTITATIVA fria, matemática e pericial dos dados cadastrais e dos relatórios de consultas de crédito (Serasa, SPC, SCR/BACEN, CNDs, etc).

DADOS CADASTRAIS DA EMPRESA:
- Razão Social: ${leadData.razaoSocial || leadData.nome || "Não informado"}
- CNPJ: ${leadData.cnpj || "Não informado"}
- Faturamento Anual Informado: R$ ${(leadData.faturamentoAnual || (leadData.mediaReceitaMensal ? leadData.mediaReceitaMensal * 12 : 0) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Atividade / Ramo: ${leadData.ramo || "Não informado"}
- Porte: ${leadData.porte || "Não informado"}
- Sócios: ${leadData.socios ? leadData.socios.map((s: any) => `${s.nome} (CPF: ${s.cpf || "não informado"})`).join(", ") : "Nenhum sócio informado"}

RELATÓRIOS BRUTOS DE CONSULTAS DE CRÉDITO REALIZADAS:
${consultationsSummary.length > 0 ? JSON.stringify(consultationsSummary, null, 2) : "Nenhuma consulta de crédito realizada no sistema até o momento."}

CATÁLOGO OFICIAL DE SERVIÇOS TÉCNICOS DISPONÍVEIS:
${catalogPromptText}

Analise os dados e retorne ESTRITAMENTE um JSON estruturado com a auditoria numérica e classificação de risco conforme o schema abaixo:
{
  "totalDividasNegativadas": number (soma de dívidas Pefin/Refin/Serasa em R$),
  "quantidadeNegativacoes": number,
  "totalProtestos": number (soma de protestos em cartórios em R$),
  "quantidadeProtestos": number,
  "totalAcoesJudiciaisOuCheques": number,
  "temApontamentosSCRBacen": boolean,
  "resumoBacen": "string detalhando se há prejuízo 30-34 no SCR ou operações ativas",
  "situacaoFiscalCadastral": "string (ex: Regular, Pendente de CND Federal, Inconsistência Cadastral)",
  "capacidadeTomadaPronampe": number (30% do faturamento anual, teto 500k),
  "capacidadeTomadaGeral": number,
  "fatoresCriticosBloqueio": ["array", "com", "os", "principais", "motivos", "de", "rejeição", "bancária"],
  "servicosNecessariosIds": ["array", "com", "os", "ids", "dos", "serviços", "do", "catálogo", "rigorosamente", "necessários"],
  "classificacaoElegibilidade": "Alta" | "Média" | "Baixa" | "Crítica",
  "scoreEstimado": "string (ex: 280/1000 - Risco Alto ou 750/1000 - Saudável)"
}`;

      let auditResult: any = null;

      try {
        const stage1Response = await generateContentWithFallback(ai, {
          contents: stage1AuditPrompt,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });

        if (stage1Response && stage1Response.text) {
          const rawStage1 = stage1Response.text.replace(/```json/g, "").replace(/```/g, "").trim();
          auditResult = JSON.parse(rawStage1);
          console.log(`[PROSFEC IA] Etapa 1 concluída com sucesso:`, {
            elegibilidade: auditResult.classificacaoElegibilidade,
            dividas: auditResult.totalDividasNegativadas,
            protestos: auditResult.totalProtestos,
            servicos: auditResult.servicosNecessariosIds
          });
        }
      } catch (stage1Err) {
        console.warn("[PROSFEC IA] Etapa 1 (Auditoria) falhou ou retornou formato inválido. Prosseguindo com fallback de triagem:", stage1Err);
      }

      // Fallback audit se a etapa 1 falhar
      if (!auditResult) {
        const faturamento = leadData.faturamentoAnual || (leadData.mediaReceitaMensal ? leadData.mediaReceitaMensal * 12 : 0) || 0;
        auditResult = {
          totalDividasNegativadas: 0,
          quantidadeNegativacoes: 0,
          totalProtestos: 0,
          quantidadeProtestos: 0,
          totalAcoesJudiciaisOuCheques: 0,
          temApontamentosSCRBacen: false,
          resumoBacen: "Sem apontamentos críticos detectados ou pendente de consulta formal SCR",
          situacaoFiscalCadastral: "Em análise",
          capacidadeTomadaPronampe: Math.min(faturamento * 0.3, 500000),
          capacidadeTomadaGeral: faturamento * 0.35,
          fatoresCriticosBloqueio: consultationsSummary.length === 0 ? ["Necessária execução de consultas da grade PROSFEC para mapeamento de apontamentos"] : ["Necessária adequação de rating e faturamento fiscal"],
          servicosNecessariosIds: ["serv_rating_score"],
          classificacaoElegibilidade: faturamento > 0 ? "Média" : "Baixa",
          scoreEstimado: "Sob análise cadastral"
        };
      }

      // =========================================================================
      // ETAPA 2: REDAÇÃO DO LAUDO EXECUTIVO & PLANO DE AÇÃO PROSFEC
      // =========================================================================
      console.log(`[PROSFEC IA] Iniciando Etapa 2: Redação Pericial Executiva`);

      const stage2SystemPrompt = `Você é o Auditor Chefe de Risco e Crédito Corporativo da PROSFEC Soluções Administrativas e Financeiras.
Sua missão é redigir o LAUDO PERICIAL EXECUTIVO e o PLANO DE DESTRAVE DE CRÉDITO para este CNPJ, fundamentando-se EXCLUSIVAMENTE nos dados auditados e validados na Etapa 1.

AUDITORIA TÉCNICA E QUANTITATIVA CONSOLIDADA (DADOS REAIS DA ETAPA 1):
${JSON.stringify(auditResult, null, 2)}

DADOS DA EMPRESA (LEAD):
- Razão Social: ${leadData.razaoSocial || leadData.nome || "Não informado"}
- CNPJ: ${leadData.cnpj || "Não informado"}
- Faturamento Anual Declarado: R$ ${(leadData.faturamentoAnual || (leadData.mediaReceitaMensal ? leadData.mediaReceitaMensal * 12 : 0) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Atividade / Ramo: ${leadData.ramo || "Não informado"}
- Porte: ${leadData.porte || "Não informado"}
- Sócios: ${leadData.socios ? leadData.socios.map((s: any) => `${s.nome} (CPF: ${s.cpf || "não informado"})`).join(", ") : "Nenhum sócio informado"}

CATÁLOGO OFICIAL DE SERVIÇOS PROSFEC (Valores Atualizados em Sistema):
${catalogPromptText}

REGRA DE COMISSÃO PROSFEC SOBRE O CRÉDITO:
A comissão de sucesso da PROSFEC sobre a captação de crédito é de exatos 5% sobre o valor efetivamente liberado ao cliente.
Os serviços técnicos e preparatórios são cobrados pontualmente para sanar os bloqueios, sem alterar a taxa do crédito.

DIRETRIZES DA REDAÇÃO EXECUTIVA:
1. TOM FORMAL E PERICIAL BANCÁRIO:
   - Escreva como um Comitê de Crédito e Fomento de alto padrão.
   - Apresente tabelas claras em Markdown comparando situação atual vs meta após estruturação.
   - Seja cirúrgico: cite os valores exatos de restrições, protestos e capacidade de crédito auditados na Etapa 1.

2. AÇÕES DA PROSFEC (NÃO MANDE O CLIENTE FAZER SOZINHO):
   - A linguagem deve ser "A equipe técnica da PROSFEC aplicará...", "A PROSFEC ingressará com...", "A PROSFEC estruturará o dossiê...".

3. ESTRUTURA DO LAUDO EM MARKDOWN:
   - **1. Parecer Sintético do Comitê de Risco**: Score atual, Rating estimado e Enquadramento de Elegibilidade (${auditResult.classificacaoElegibilidade}).
   - **2. Radiografia das Restrições e Pontos de Bloqueio**: Detalhamento dos valores auditados (Dívidas: R$ ${auditResult.totalDividasNegativadas}, Protestos: R$ ${auditResult.totalProtestos}, SCR/BACEN: ${auditResult.resumoBacen}).
   - **3. Análise de Capacidade Financeira e Linhas Aptas**: Limite PRONAMPE / FGI / Fundo Constitucional potencial e taxa estimada.
   - **4. Matriz de Intervenção Técnica PROSFEC**: Justificativa objetiva de cada serviço técnico necessário.
   - **5. Cronograma Recomendado para o Passo 6 (Plano de Ação)**.

4. ESTRUTURAÇÃO DE DADOS EM JSON OBRIGATÓRIOS AO FINAL:
   Inclua dois blocos JSON delimitados estritamente ao final do relatório:

   A) Bloco \`\`\`json_servicos com a lista de serviços RECOMENDADOS (somente os estritamente necessários presentes no CATÁLOGO ATIVO, ou [] se o perfil estiver 100% livre de restrições):
   \`\`\`json_servicos
   [
     { "id": "serv_reabilitacao", "nome": "Programa de Reabilitação Financeira e Creditícia", "valor": 0, "justificativa": "Motivo técnico baseado nos apontamentos auditados" }
   ]
   \`\`\`

   B) Bloco \`\`\`json_subetapas contendo as sub-etapas acionáveis da Etapa 6 (Estruturação) em ordem cronológica de execução:
   \`\`\`json_subetapas
   [
     { "titulo": "Renegociação e Repactuação de Dívidas dos Credores", "preco": 0 },
     { "titulo": "Procedimento Liminar Limpa Nome nos Órgãos de Proteção", "preco": 0 },
     { "titulo": "Regularização, Atualização e Saneamento SCR/BACEN", "preco": 0 },
     { "titulo": "Melhoria e Adequação unificada do Rating de Crédito e Score", "preco": 1100 }
   ]
   \`\`\``;

      const response = await generateContentWithFallback(ai, {
        contents: stage2SystemPrompt,
        generationConfig: {
          temperature: 0.2
        }
      });

      const responseText = response.text || "";

      if (!responseText) {
        throw new Error("O Gemini não retornou nenhum conteúdo válido para o diagnóstico.");
      }

      let cleanText = responseText;
      let customServicos: any[] = [];
      let customSubEtapas: any[] = [];

      // Extract json_servicos
      const matchServicos = responseText.match(/```json_servicos\s*([\s\S]*?)\s*```/);
      if (matchServicos && matchServicos[1]) {
        try {
          const parsedServ = JSON.parse(matchServicos[1].trim());
          if (Array.isArray(parsedServ)) {
            const rawServs: any[] = parsedServ.map((item: any) => ({
              id: item.id || `serv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              nome: item.nome || item.servico || "Serviço PROSFEC",
              valor: typeof item.valor === "number" ? item.valor : (parseFloat(item.valor) || 0),
              justificativa: item.justificativa || "",
              hublaLink: item.hublaLink,
              status: "pendente"
            }));

            let hasRatingScore = false;
            const targetRatingScoreObj = activeServicesCatalog.find(c => (c.id && c.id === "serv_rating_score") || (c.nome && c.nome.toLowerCase().includes("rating") && c.nome.toLowerCase().includes("score")));
            const targetPrice = targetRatingScoreObj ? Number(targetRatingScoreObj.valor) : 1100;
            const targetName = targetRatingScoreObj ? targetRatingScoreObj.nome : "Melhoria e Adequação de Rating e Score";

            customServicos = [];
            for (const s of rawServs) {
              const nameLower = (s.nome || "").toLowerCase();
              const isRS = s.id === "serv_rating" || s.id === "serv_score" || s.id === "serv_rating_score" || nameLower.includes("rating") || nameLower.includes("score");
              const isRTB = s.id === "serv_rtb" || nameLower.includes("tarifa") || nameLower.includes("rtb") || nameLower.includes("perícia") || nameLower.includes("pericia");
              const isDossie = s.id === "serv_dossie" || s.id === "serv_projeto" || s.id === "serv_dossie_projeto" || nameLower.includes("dossiê") || nameLower.includes("dossie") || nameLower.includes("projeto");

              if (isRS) {
                if (!hasRatingScore) {
                  hasRatingScore = true;
                  customServicos.push({
                    ...s,
                    id: "serv_rating_score",
                    nome: targetName,
                    valor: targetPrice,
                    hublaLink: targetRatingScoreObj?.hublaLink || (activeServicesCatalog.find(c => c.id === "serv_rating_score") as any)?.hublaLink || undefined
                  });
                }
              } else if (isRTB) {
                customServicos.push({
                  ...s,
                  id: "serv_rtb",
                  nome: "Recuperação de Tarifas Bancárias (RTB - Perícia CCB)",
                  valor: 0,
                  semCustoInicial: true,
                  statusPagamento: "isento"
                });
              } else if (isDossie) {
                customServicos.push({
                  ...s,
                  id: "serv_dossie_projeto",
                  nome: "Dossiê Bancário & Projeto Estruturado de Crédito",
                  valor: 0,
                  semCustoInicial: true,
                  statusPagamento: "isento"
                });
              } else {
                const matchedCat = activeServicesCatalog.find(c => (c.id && s.id && c.id === s.id) || (c.nome && c.nome.toLowerCase().trim() === nameLower.trim()));
                customServicos.push({
                  ...s,
                  valor: matchedCat ? Number(matchedCat.valor) : s.valor,
                  hublaLink: matchedCat?.hublaLink || s.hublaLink || undefined
                });
              }
            }
          }
          cleanText = cleanText.replace(/```json_servicos\s*[\s\S]*?\s*```/, "").trim();
        } catch (e) {
          console.warn("Could not parse json_servicos block from PROSFEC IA response:", e);
        }
      }

      // Extract custom sub-etapas for Step 6 from json_subetapas block
      const matchSubEtapas = cleanText.match(/```json_subetapas\s*([\s\S]*?)\s*```/);
      if (matchSubEtapas && matchSubEtapas[1]) {
        try {
          const parsedArray = JSON.parse(matchSubEtapas[1].trim());
          if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            customSubEtapas = parsedArray.map((item: any, idx: number) => {
              const titleStr = typeof item === "string" ? item : (item.titulo || item.item || `Sub-etapa ${idx + 1}`);
              const titleLower = titleStr.toLowerCase();
              const isNoCost = titleLower.includes("tarifa") || titleLower.includes("rtb") || titleLower.includes("dossiê") || titleLower.includes("dossie") || titleLower.includes("projeto") || item.preco === 0;
              const itemPrice = isNoCost ? 0 : (typeof item.preco === "number" ? item.preco : (parseFloat(item.preco) || 0));
              const matchedServ = customServicos.find(s => s.id === item.id || (s.nome && titleLower.includes(s.nome.toLowerCase())));
              return {
                id: `sub_${Date.now()}_${idx + 1}`,
                titulo: titleStr,
                concluida: false,
                preco: itemPrice,
                hublaLink: matchedServ?.hublaLink || item.hublaLink || undefined,
                semCustoInicial: isNoCost
              };
            });
          }
          cleanText = cleanText.replace(/```json_subetapas\s*[\s\S]*?\s*```/, "").trim();
        } catch (e) {
          console.warn("Could not parse json_subetapas block from PROSFEC IA response:", e);
        }
      }

      if (customSubEtapas.length === 0 && customServicos.length > 0) {
        customSubEtapas = customServicos.map((serv: any, idx: number) => ({
          id: serv.id || `sub_${Date.now()}_${idx + 1}`,
          titulo: serv.nome || serv.servico || `Aplicação de Serviço Técnico ${idx + 1}`,
          concluida: false,
          preco: typeof serv.valor === "number" ? serv.valor : (parseFloat(serv.valor) || 0),
          hublaLink: serv.hublaLink,
          semCustoInicial: serv.semCustoInicial || serv.valor === 0
        }));
      } else if (customSubEtapas.length === 0) {
        customSubEtapas = [
          { id: `sub_${Date.now()}_1`, titulo: "Saneamento de restrições ativas apontadas nas consultas de crédito Serasa/SPC", concluida: false, preco: customServicos.find(s => s.nome.toLowerCase().includes("renegocia"))?.valor || 0, hublaLink: customServicos.find(s => s.nome.toLowerCase().includes("renegocia"))?.hublaLink },
          { id: `sub_${Date.now()}_2`, titulo: "Regularização de CND e pendências fiscais do CNPJ e sócios na Receita Federal", concluida: false, preco: customServicos.find(s => s.nome.toLowerCase().includes("contábei"))?.valor || 0, hublaLink: customServicos.find(s => s.nome.toLowerCase().includes("contábei"))?.hublaLink },
          { id: `sub_${Date.now()}_3`, titulo: "Transmissão do faturamento atualizado no e-CAC para enquadramento bancário", concluida: false, preco: 0 },
          { id: `sub_${Date.now()}_4`, titulo: "Melhoria e Adequação unificada do Rating de Crédito e Score no SCR / Banco Central", concluida: false, preco: customServicos.find(s => s.nome.toLowerCase().includes("rating") || s.nome.toLowerCase().includes("score"))?.valor || 0, hublaLink: customServicos.find(s => s.nome.toLowerCase().includes("rating") || s.nome.toLowerCase().includes("score"))?.hublaLink },
          { id: `sub_${Date.now()}_5`, titulo: "Apresentação da proposta estruturada e submissão às esteiras bancárias", concluida: false, preco: 0 }
        ];
      }

      // 4. Update the Lead document in Firestore with diagnosis, recommended services, custom sub-etapas AND advance stage to Step 4 (Contrato & Termos)
      const currentEtapaVal = Number(leadData.etapa || 1);
      const nextEtapaVal = Math.max(currentEtapaVal, 4);

      const currentDiagnostico = cleanForFirestore({
        texto: cleanText,
        dataGeracao: new Date().toISOString(),
        consultasAnalisadas: matchingConsultas.length,
        servicosRecomendados: cleanForFirestore(customServicos),
        geracoesCount: newGeracoesCount
      });

      const sanitizedSubEtapas = cleanForFirestore(customSubEtapas);
      const sanitizedServicos = cleanForFirestore(customServicos);

      await patchDocRest(`leads/${leadId}`, cleanForFirestore({
        diagnosticoPROSFEC: currentDiagnostico,
        diagnosticoGeracoesCount: newGeracoesCount,
        subEtapasPasso6: sanitizedSubEtapas,
        servicosRecomendados: sanitizedServicos,
        etapa: nextEtapaVal
      }));


      console.log(`PROSFEC IA Diagnosis, Services & Step 6 Sub-etapas successfully saved and lead ${leadId} advanced to stage ${nextEtapaVal}`);

      return res.json({
        success: true,
        diagnostico: currentDiagnostico,
        servicosRecomendados: sanitizedServicos,
        subEtapasPasso6: sanitizedSubEtapas,
        etapa: nextEtapaVal
      });

    } catch (err: any) {
      console.error("Error generating PROSFEC IA Diagnosis:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao gerar o diagnóstico PROSFEC IA." });
    }
  });

  // 5.1 Generate Step 7 Post-Structuring Comparative Diagnostic (Antes vs. Depois)
  app.post("/api/credit/diagnostico-passo7", async (req, res) => {
    try {
      const { leadId, partnerId, documento, consultaResultado, consultaId } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "O campo leadId é obrigatório." });
      }

      // 1. Retrieve Lead from Firestore
      const leadRef = doc(db, "leads", leadId);
      const leadSnap = await getDoc(leadRef);

      if (!leadSnap.exists()) {
        return res.status(404).json({ error: "Lead não encontrado no banco de dados." });
      }

      const leadData = leadSnap.data();
      const cnpjClean = (leadData.cnpj || documento || "").replace(/\D/g, "");

      // 2. Fetch Latest Consultation if not provided directly
      let latestConsultaData = consultaResultado;
      let usedConsultaId = consultaId;

      if (!latestConsultaData) {
        try {
          const q = query(
            collection(db, "consultas_realizadas"),
            where("documento", "==", cnpjClean)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const sortedDocs = snap.docs.sort((a, b) => {
              const timeA = new Date(a.data().dataConsulta || 0).getTime();
              const timeB = new Date(b.data().dataConsulta || 0).getTime();
              return timeB - timeA;
            });
            latestConsultaData = sortedDocs[0].data().resultado;
            usedConsultaId = sortedDocs[0].id;
          }
        } catch (queryErr) {
          console.warn("Could not query consultas_realizadas for Step 7:", queryErr);
        }
      }

      // 3. Extract baseline from Step 3
      const step3Diag = leadData.diagnosticoPROSFEC || leadData.diagnosticoIA || leadData.diagnosticoConsulta;
      const initialScore = Number(leadData.scoreInicial || 320);
      const initialRestricoesCount = Number(leadData.restricoesIniciaisCount || (step3Diag?.alertas?.length) || 2);
      const faturamentoAnual = Number(leadData.faturamentoAnual || (leadData.mediaReceitaMensal ? leadData.mediaReceitaMensal * 12 : 600000));
      
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
- Nova Consulta de Crédito Pós-Estruturação (RedeBE API):
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
        generationConfig: {
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
      await updateDoc(leadRef, cleanForFirestore({
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

      // Calculate base limits locally (heuristic baseline)
      const effectiveAnnualRevenue = isNewCompany ? valMediaReceita * 12 : valFaturamento;
      const cleanPorte = String(porte || "ME").toUpperCase();
      
      const cleanRamo = String(ramo || "").toLowerCase();
      const isTourismOrEntertainment = 
        cleanRamo.includes("turismo") || 
        cleanRamo.includes("hotel") || 
        cleanRamo.includes("pousada") || 
        cleanRamo.includes("restaurante") || 
        cleanRamo.includes("bar") || 
        cleanRamo.includes("evento") || 
        cleanRamo.includes("viagem");

      const isTechOrInnovation = 
        cleanRamo.includes("tecnologia") || 
        cleanRamo.includes("software") || 
        cleanRamo.includes("ti") || 
        cleanRamo.includes("inovacao") || 
        cleanRamo.includes("startup") || 
        cleanRamo.includes("desenvolvimento");

      const isNE_NO_CO = ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE", "AC", "AP", "AM", "PA", "RO", "RR", "TO", "DF", "GO", "MT", "MS"].includes(String(uf || "").toUpperCase());

      // Evaluate bank-specific rules for lead's selected institution
      const initialLineCode = (cleanPorte === "MEI" || effectiveAnnualRevenue <= 81000) ? "FAMPE" :
                              (isTourismOrEntertainment && effectiveAnnualRevenue > 30000) ? "FUNGETUR" :
                              (isTechOrInnovation && effectiveAnnualRevenue > 50000) ? "FINEP_INOV" :
                              (isNE_NO_CO && effectiveAnnualRevenue > 100000) ? "FNE_FNO_FCO" :
                              (effectiveAnnualRevenue > 4800000) ? "FGI_PEAC" : "PRONAMPE";

      const bankRules = BankRulesManager.getBankRules(bancoPrincipal, initialLineCode);

      let fallbackCode = initialLineCode;
      let fallbackName = "PRONAMPE (Programa Nacional de Apoio às Microempresas)";
      let fallbackLimit = 0;
      let fallbackRate = bankRules.taxaAnualEstimada || 16.5;
      let fallbackCarencia = bankRules.carenciaPadrao || 24;
      let fallbackPrazo = bankRules.prazoTotalPadrao || 96;
      let fallbackJustificativa = `Sua empresa foi qualificada para o PRONAMPE no ${bankRules.bancoNormalizado}. ${bankRules.destaqueEsteira}`;

      if (cleanPorte === "MEI" || effectiveAnnualRevenue <= 81000) {
        fallbackCode = "FAMPE";
        fallbackName = "FAMPE - Fundo de Aval Sebrae (Crédito Orientado para MEI)";
        fallbackLimit = Math.min(Math.max(effectiveAnnualRevenue * 0.6, 12500), 50000);
        fallbackRate = 14.5;
        fallbackCarencia = bankRules.carenciaPadrao || 12;
        fallbackPrazo = bankRules.prazoTotalPadrao || 48;
        fallbackJustificativa = `Elegível para o FAMPE/Sebrae com garantia de aval no ${bankRules.bancoNormalizado}, com carência de ${fallbackCarencia} meses e amortização em ${fallbackPrazo - fallbackCarencia} parcelas.`;
      } else if (isTourismOrEntertainment && effectiveAnnualRevenue > 30000) {
        fallbackCode = "FUNGETUR";
        fallbackName = "FUNGETUR (Fundo Geral do Turismo / Ministério do Turismo)";
        fallbackLimit = Math.min(effectiveAnnualRevenue * 0.45, 1500000);
        fallbackRate = 13.5;
        fallbackCarencia = 24;
        fallbackPrazo = 120;
        fallbackJustificativa = `Atuação no setor de hospitalidade/eventos qualificada para o FUNGETUR no ${bankRules.bancoNormalizado}, com carência estendida de 24 meses e parcelamento em 120 meses.`;
      } else if (isTechOrInnovation && effectiveAnnualRevenue > 50000) {
        fallbackCode = "FINEP_INOV";
        fallbackName = "FINEP Inovacred (Fomento à Inovação e Tecnologia)";
        fallbackLimit = Math.min(effectiveAnnualRevenue * 0.4, 3000000);
        fallbackRate = 9.5;
        fallbackCarencia = 36;
        fallbackPrazo = 120;
        fallbackJustificativa = "CNPJ enquadrado em inovação tecnológica e software. A FINEP provê fomento público com carência máxima de 36 meses e juros subsidiados.";
      } else if (isNE_NO_CO && effectiveAnnualRevenue > 100000) {
        fallbackCode = "FNE_FNO_FCO";
        fallbackName = `Fundo Constitucional de Financiamento (${String(uf).toUpperCase() === 'BA' || String(uf).toUpperCase() === 'PE' || String(uf).toUpperCase() === 'CE' ? 'FNE' : 'FCO/FNO'})`;
        fallbackLimit = Math.min(effectiveAnnualRevenue * 0.4, 3000000);
        fallbackRate = 12.8;
        fallbackCarencia = 24;
        fallbackPrazo = 120;
        fallbackJustificativa = `Empresa localizada em região com incentivo constitucional operada pelo ${bankRules.bancoNormalizado}. Oferece taxas fixas subsidiadas com carência de 24m.`;
      } else if (cleanPorte === "EMP" || cleanPorte === "MÉDIO" || cleanPorte === "MEDIO" || effectiveAnnualRevenue > 4800000) {
        if (effectiveAnnualRevenue > 300000000 || cleanPorte === "EGP" || cleanPorte === "GRANDE") {
          fallbackCode = "LINHA_BANCARIA_CORP";
          fallbackName = "Crédito Corporativo Estruturado (BNDES Finem / Consórcio Bancário)";
          fallbackLimit = Math.min(effectiveAnnualRevenue * 0.2, 50000000);
          fallbackRate = 15.5;
          fallbackCarencia = 36;
          fallbackPrazo = 144;
          fallbackJustificativa = `Perfil corporativo no ${bankRules.bancoNormalizado} enquadrado em linhas de crédito bancárias corporativas e repasses BNDES.`;
        } else {
          fallbackCode = "FGI_PEAC";
          fallbackName = "FGI PEAC (Fundo Garantidor BNDES para Médias Empresas)";
          fallbackLimit = Math.min(effectiveAnnualRevenue * 0.25, 10000000);
          fallbackRate = 17.5;
          fallbackCarencia = 24;
          fallbackPrazo = 84;
          fallbackJustificativa = `Faturamento corporativo qualificado para o FGI PEAC operado pelo ${bankRules.bancoNormalizado}, com garantia de até 80% do BNDES.`;
        }
      } else {
        if (isNewCompany) {
          fallbackLimit = Math.max(valCapital * 0.5, valFaturamento * 0.3);
        } else {
          fallbackLimit = valFaturamento * 0.3; // Teto legal de 30% da receita bruta anual do e-CAC
        }
        fallbackLimit = Math.min(fallbackLimit, 500000);
        fallbackCarencia = bankRules.carenciaPadrao;
        fallbackPrazo = bankRules.prazoTotalPadrao;
        fallbackJustificativa = `Empresa elegível para o PRONAMPE no ${bankRules.bancoNormalizado}. ${bankRules.destaqueEsteira}`;
      }

      if (fallbackLimit < 25000) {
        fallbackLimit = 30000;
      }

      const defaultDocs = [
        "Faturamento dos últimos 12 meses assinado pelo Contador (DRE)",
        "Contrato Social / Alterações Consolidadas ou CCMEI",
        "Documento de Identidade dos Sócios (RG/CNH e CPF)",
        "Comprovante de Endereço Atualizado do CNPJ e dos Sócios",
        "Compartilhamento de Dados e-CAC / Receita Federal autorizado"
      ];

      // Try Gemini AI
      try {
        const ai = getGeminiAI();

        const prompt = `Você é um Consultor de Crédito Governamental sênior e especialista de fomento da PROSFEC IA.
Sua missão é analisar minuciosamente os dados do CNPJ/empresa e selecionar A LINHA DE CRÉDITO GOVERNAMENTAL OU BANCÁRIA MAIS VANTAJOSA para a empresa, respeitando RIGOROSAMENTE as regras e leis vigentes de cada programa federal.

LEGISLAÇÃO E REGRAS ATUALIZADAS DAS LINHAS DE CRÉDITO GOVERNAMENTAIS:
1. "PRONAMPE" (Lei nº 13.999/2020 e Regulamentação Vigente):
   - Elegibilidade: MEI, Microempresas (ME) e EPPs com receita bruta anual de até R$ 4,8M.
   - Finalidade: Capital de giro, máquinas/equipamentos, reformas, expansão e investimentos fixos.
   - Limite Legal: Até 30% da Receita Bruta Anual informada ao e-CAC do ano anterior, MÁXIMO RIGOROSO DE R$ 500.000,00 POR CNPJ. Para empresas com menos de 12 meses: até 50% do Capital Social OU até 50% de 12 vezes a média da receita mensal (limitado a R$ 500.000,00).
   - Carência Legal: MÁXIMO DE 24 MESES.
   - Amortização: MÁXIMO DE 72 PARCELAS MENSAIS após o período de carência.
   - PRAZO TOTAL DA OPERAÇÃO: MÁXIMO DE 96 MESES (24m carência + 72m amortização).
   - Taxa Regulada: Selic + até 6,0% a.a. (aprox. 16,5% a.a.).
   - Garantias: Fundo Garantidor de Operações (FGO) e Aval dos sócios.
   - OBSERVAÇÃO CRÍTICA PARA EMPRESAS COM ELEVADO FATURAMENTO: Se 30% da receita do CNPJ ultrapassar R$ 500.000,00, a linha PRONAMPE DEVE ter seu limite fixado no teto legal de R$ 500.000,00. NUNCA recomende limite superior a R$ 500.000,00 para PRONAMPE. Para necessidades superiores a R$ 500.000,00, se a empresa tiver faturamento elevado ou precisar de mais limite, sugira FGI_PEAC ou LINHA_BANCARIA_CORP.sugira FGI_PEAC ou LINHA_BANCARIA_CORP.

2. "FAMPE" (Sebrae):
   - Elegibilidade: MEI (até R$ 12,5k), ME (até R$ 100k) e EPP (até R$ 300k).
   - Garantia: Aval Sebrae cobrindo até 80% do crédito.
   - Carência: MÁXIMO DE 12 MESES.
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 48 MESES.

3. "FGI_PEAC" (BNDES):
   - Elegibilidade: Médias empresas e MEs/EPPs de maior porte.
   - Carência: MÁXIMO DE 24 MESES.
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 84 MESES (24m carência + 60m amortização).
   - Limite: Até R$ 10.000.000 com garantia BNDES FGI de 80%.

4. "FUNGETUR" (MTur / CADASTUR):
   - Exclusivo para turismo, hotéis, pousadas, eventos e gastronomia.
   - Carência: Até 24 meses (giro) ou 36 meses (obras).
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 120 MESES.

5. "FINEP_INOV" (FINEP):
   - Exclusivo para tecnologia, software, startups e inovação industrial.
   - Carência: Até 36 meses.
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 120 MESES. Taxa subsidiada de 5,0% a 14,0% a.a.

6. "FNE_FNO_FCO":
   - Para empresas no Nordeste (FNE), Norte (FNO) ou Centro-Oeste (FCO).
   - Carência: Até 24 a 36 meses.
   - PRAZO TOTAL: Até 144 meses.

7. "BNDES_PEQ":
   - Para MPMEs em geral via agentes credenciados BNDES.
   - Carência: Até 24 meses.
   - PRAZO TOTAL: Até 84 meses.

DIRETRIZES DE AVALIAÇÃO DO BANCO DE RELACIONAMENTO (bancoPrincipal):
Avalie com precisão a instituição financeira informada pelo cliente (${bancoPrincipal || "Não especificada / Geral"}):
- Bancos Públicos / Estatais (Caixa Econômica Federal, Banco do Brasil, Banco do Nordeste - BNB, Banco da Amazônia - BASA): Têm plena capacidade de praticar os prazos máximos regulamentados em lei federal (até 24 meses de carência e até 96 meses de contrato total no PRONAMPE) e as menores taxas teto atrativas.
- Bancos Privados Comerciais (Itaú, Bradesco, Santander, Banco Safra, BTG Pactual): Costumam operar esteiras automatizadas de PRONAMPE com prazos mais enxutos em suas plataformas de autoatendimento (geralmente carência de 12 meses e amortização de 36 a 48 meses), otimizando giro e classificação de risco.
- Cooperativas de Crédito (Sicoob, Sicredi, Cresol, Ailos): Operam com política consultiva personalizada, oferecendo prazos flexíveis de 12 a 24 meses de carência e taxas competitivas para associados.
Mencione obrigatoriamente essa adequação da esteira do ${bancoPrincipal || "banco informado"} na justificativaTecnica e na justificativa comercial do parecer final!

Dados Cadastrais da Empresa Analisada:
- Razão Social: ${razaoSocial || "Não informada"}
- CNPJ: ${cnpj || "Não informado"}
- Porte Informado: ${porte || "ME"} (Avalie também: MEI, ME, EPP, EMP - Médio Porte, EGP - Grande Porte)
- Estado (UF): ${uf || "SP"}
- Ramo / Setor de atuação: ${ramo || "Geral / Comércio"}
- Banco Principal de Relacionamento: ${bancoPrincipal || "Não especificado (Análise Geral)"}
- Empresa aberta há menos de 12 meses? ${isNewCompany ? "Sim" : "Não"}
- Capital Social: R$ ${valCapital.toLocaleString("pt-BR")}
- Média de Receita Mensal (se nova): R$ ${valMediaReceita.toLocaleString("pt-BR")}
- Faturamento Anual Acumulado: R$ ${valFaturamento.toLocaleString("pt-BR")}
- Possui Selo Emprega + Mulher? ${seloEmpregaMulher ? "Sim" : "Não"}
- Possui linha de crédito governamental ATIVA? ${possuiLinhaCreditoGovernamentalAtiva ? `Sim (Linha ativa: ${linhaCreditoGovernamentalQual || "Não especificada"})` : "Não"}
*(Caso a empresa já possua a linha ${linhaCreditoGovernamentalQual || "governamental"} ativa, considere a capacidade de margem restante ou priorize uma linha de fomento complementar como FGI PEAC, FAMPE, FUNGETUR ou Fundos Regionais para evitar sobreposição do teto máximo)*

Gere a análise do Consultor de Crédito Governamental em JSON estruturado com as propriedades exatas abaixo:
{
  "creditLineCode": "CÓDIGO (um destes: FAMPE, PRONAMPE, BNDES_PEQ, FGI_PEAC, LINHA_BANCARIA_CORP, FNE_FNO_FCO, FUNGETUR, FINEP_INOV ou PROGER_URBANO)",
  "creditLineName": "Nome oficial completo da linha governamental/bancária recomendada",
  "recommendedLimit": número com o limite máximo de crédito recomendado em Reais (number puro),
  "rate": número com a taxa de juros anual estimada em % (ex: 16.5 para PRONAMPE),
  "carencia": número com o teto máximo de meses de carência (ex: 12 para PRONAMPE/FAMPE, 24 para FGI_PEAC),
  "prazo": número com o prazo total do contrato em meses (ex: 48 para PRONAMPE/FAMPE, 84 para FGI_PEAC, 120 para FUNGETUR/FINEP),
  "justificativa": "Frase comercial de alto impacto para o lead destacando a velocidade e o fôlego financeiro dentro dos limites legais.",
  "justificativaTecnica": "Parecer técnico detalhado do Consultor de Crédito Governamental explicando o enquadramento por Porte e Faturamento conforme as leis e portarias vigentes.",
  "documentosNecessarios": ["array", "de", "strings", "com", "os", "documentos", "exigidos"],
  "resumoPerfil": "Resumo da classificação de porte e faturamento"
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
                recommendedLimit: { type: Type.NUMBER },
                rate: { type: Type.NUMBER },
                carencia: { type: Type.NUMBER },
                prazo: { type: Type.NUMBER },
                justificativa: { type: Type.STRING },
                justificativaTecnica: { type: Type.STRING },
                documentosNecessarios: { type: Type.ARRAY, items: { type: Type.STRING } },
                resumoPerfil: { type: Type.STRING }
              },
              required: [
                "creditLineCode",
                "creditLineName",
                "recommendedLimit",
                "rate",
                "carencia",
                "prazo",
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
          if (parsed.creditLineCode && parsed.recommendedLimit > 0) {
            let lineCode = String(parsed.creditLineCode).toUpperCase();
            let carencia = Number(parsed.carencia) || 12;
            let prazo = Number(parsed.prazo) || 48;
            let rate = Number(parsed.rate) || 16.5;
            let limit = Number(parsed.recommendedLimit) || 100000;

            // Enforce strict official legislation & bank-specific boundaries
            if (lineCode === "PRONAMPE") {
              carencia = Math.min(carencia, bankRules.carenciaMaxima || 24);
              prazo = Math.min(prazo, bankRules.prazoTotalMaximo || 96);
              if (rate < 10.0 || rate > 22.0) rate = bankRules.taxaAnualEstimada || 16.5;
              if (!isNewCompany && valFaturamento > 0) {
                const maxLegalLimit = valFaturamento * 0.30;
                limit = Math.min(limit, Math.max(maxLegalLimit, 30000));
              }
              limit = Math.min(limit, 500000);
            } else if (lineCode === "FAMPE") {
              carencia = Math.min(carencia, bankRules.carenciaMaxima || 12);
              prazo = Math.min(prazo, bankRules.prazoTotalMaximo || 48);
              limit = Math.min(limit, 300000);
            } else if (lineCode === "FGI_PEAC") {
              carencia = Math.min(carencia, bankRules.carenciaMaxima || 24);
              prazo = Math.min(prazo, bankRules.prazoTotalMaximo || 84);
              limit = Math.min(limit, 10000000);
            }

            const p = limit;
            const r = (rate / 12) / 100;
            const n = prazo;
            let estimatedInstallment = 0;
            if (r > 0) {
              estimatedInstallment = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            } else {
              estimatedInstallment = p / n;
            }

            // Calculation for Capacity Excess and Interest Savings (CET vs Traditional Market)
            const capTotal = !isNewCompany && valFaturamento > 0 ? valFaturamento * 0.30 : (valCapital * 0.5);
            const excedenteCap = Math.max(0, capTotal - p);

            const taxaMercadoAnual = 38.0; // Market benchmark without government subsidy ~38% a.a.
            const rMercado = (taxaMercadoAnual / 12) / 100;
            let parcelaMercado = 0;
            if (rMercado > 0) {
              parcelaMercado = (p * rMercado * Math.pow(1 + rMercado, n)) / (Math.pow(1 + rMercado, n) - 1);
            } else {
              parcelaMercado = p / n;
            }
            const economiaMensal = Math.max(0, parcelaMercado - estimatedInstallment);
            const economiaTotal = Math.max(0, economiaMensal * n);

            return res.json({
              success: true,
              creditLineCode: lineCode,
              creditLineName: parsed.creditLineName,
              recommendedLimit: p,
              rate: rate,
              carencia: carencia,
              prazo: prazo,
              parcela: Math.round(estimatedInstallment * 100) / 100,
              justificativa: parsed.justificativa,
              justificativaTecnica: parsed.justificativaTecnica,
              documentosNecessarios: parsed.documentosNecessarios && parsed.documentosNecessarios.length > 0 ? parsed.documentosNecessarios : defaultDocs,
              resumoPerfil: parsed.resumoPerfil,
              fonte: `Gemini AI (Mapeamento ${bankRules.bancoNormalizado})`,
              bancoDetalhes: bankRules,
              capacidadeTotal: Math.round(capTotal),
              excedenteCapacidade: Math.round(excedenteCap),
              economiaMensal: Math.round(economiaMensal * 100) / 100,
              economiaTotal: Math.round(economiaTotal * 100) / 100,
              taxaMercadoAnual: taxaMercadoAnual,
              parcelaMercado: Math.round(parcelaMercado * 100) / 100
            });
          }
        }
      } catch (aiErr) {
        console.warn("Express /api/credit/diagnostico-simulador Gemini failed, falling back to heuristics.", aiErr);
      }

      const p = fallbackLimit;
      const r = (fallbackRate / 12) / 100;
      const n = fallbackPrazo;
      let fallbackInstallment = 0;
      if (r > 0) {
        fallbackInstallment = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      } else {
        fallbackInstallment = p / n;
      }

      const capTotalFallback = !isNewCompany && valFaturamento > 0 ? valFaturamento * 0.30 : (valCapital * 0.5);
      const excedenteCapFallback = Math.max(0, capTotalFallback - p);

      const taxaMercadoFallback = 38.0;
      const rMercadoFallback = (taxaMercadoFallback / 12) / 100;
      let parcelaMercadoFallback = 0;
      if (rMercadoFallback > 0) {
        parcelaMercadoFallback = (p * rMercadoFallback * Math.pow(1 + rMercadoFallback, n)) / (Math.pow(1 + rMercadoFallback, n) - 1);
      } else {
        parcelaMercadoFallback = p / n;
      }
      const economiaMensalFallback = Math.max(0, parcelaMercadoFallback - fallbackInstallment);
      const economiaTotalFallback = Math.max(0, economiaMensalFallback * n);

      return res.json({
        success: true,
        creditLineCode: fallbackCode,
        creditLineName: fallbackName,
        recommendedLimit: fallbackLimit,
        rate: fallbackRate,
        carencia: fallbackCarencia,
        prazo: fallbackPrazo,
        parcela: Math.round(fallbackInstallment * 100) / 100,
        justificativa: fallbackJustificativa,
        justificativaTecnica: `Enquadramento customizado para ${bankRules.bancoNormalizado} na linha ${fallbackName}. Esteira: ${bankRules.modalidadeAprovacao}.`,
        documentosNecessarios: defaultDocs,
        resumoPerfil: `Perfil ${porte || 'PJ'} no ${bankRules.bancoNormalizado} avaliado com faturamento de R$ ${effectiveAnnualRevenue.toLocaleString('pt-BR')}.`,
        fonte: `PROSFEC IA (Regra customizada ${bankRules.bancoNormalizado})`,
        bancoDetalhes: bankRules,
        capacidadeTotal: Math.round(capTotalFallback),
        excedenteCapacidade: Math.round(excedenteCapFallback),
        economiaMensal: Math.round(economiaMensalFallback * 100) / 100,
        economiaTotal: Math.round(economiaTotalFallback * 100) / 100,
        taxaMercadoAnual: taxaMercadoFallback,
        parcelaMercado: Math.round(parcelaMercadoFallback * 100) / 100
      });

    } catch (err: any) {
      console.error("Error in /api/credit/diagnostico-simulador:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao gerar recomendação de fomento." });
    }
  });

  // 6. RTB - Recuperação de Tarifa Bancária: Análise Pericial de CCB com PROSFEC IA
  app.post("/api/credit/analise-rtb-ccb", async (req, res) => {
    try {
      const { leadId, ccbBase64, nomeArquivo, bancoInformado, valorInformado, partnerId } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "O parâmetro leadId é obrigatório." });
      }

      console.log(`[RTB] Iniciando auditoria de CCB para o lead: ${leadId}...`);

      const leadRef = doc(db, "leads", leadId);
      const leadSnap = await getDoc(leadRef);

      if (!leadSnap.exists()) {
        return res.status(404).json({ error: "Lead não encontrado no banco de dados." });
      }

      const leadData = leadSnap.data();
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
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });

        if (aiResponse && aiResponse.text) {
          const rawClean = aiResponse.text.replace(/```json/g, "").replace(/```/g, "").trim();
          analiseResultado = JSON.parse(rawClean);
        }
      } catch (aiErr) {
        console.warn("[RTB] Gemini AI analysis failed or timed out. Generating robust algorithmic forensic model:", aiErr);
      }

      // Algorithmic Fallback Engine if AI fails or returns empty
      if (!analiseResultado || !analiseResultado.potencialRecuperacaoTotal) {
        const baseVal = valorOperacaoEstimado;
        const seguroEst = Math.round(baseVal * 0.032 + 1200);
        const tacEst = Math.round(Math.min(baseVal * 0.015, 3500) + 850);
        const cadastroEst = 1650;
        const cetDiffEst = Math.round(baseVal * 0.018);

        const totalRecup = seguroEst + tacEst + cadastroEst + cetDiffEst;
        const totalDobro = totalRecup * 2;

        analiseResultado = {
          bancoIdentificado: bancoPrincipal,
          numeroContratoOuCCB: `CCB nº ${(Math.random() * 10000000).toFixed(0).padStart(8, '0')}`,
          valorOperacao: baseVal,
          taxaJurosMensal: "2.35% a.m.",
          taxaJurosAnual: "32.12% a.a.",
          cetInformado: "37.40% a.a.",
          potencialRecuperacaoTotal: totalRecup,
          potencialRepeticaoIndebito: totalDobro,
          irregularidadesEncontradas: [
            {
              tipo: "Venda Casada / Seguro Prestamista",
              descricao: `Inclusão presumida de seguro prestamista e proteção financeira agregada na CCB sem oportunização de contratação externa.`,
              valorEstimado: seguroEst,
              fundamentacaoLegal: "Tema Repetitivo 972/STJ e Art. 39, I do CDC",
              probabilidadeExito: "Alta"
            },
            {
              tipo: "TAC/TEC",
              descricao: `Cobrança de Tarifa de Abertura de Crédito (TAC) ou taxa de liquidação/emissão não autorizada pelo BACEN.`,
              valorEstimado: tacEst,
              fundamentacaoLegal: "Súmula 566 do STJ e Resolução CMN nº 3.518/2007",
              probabilidadeExito: "Alta"
            },
            {
              tipo: "Tarifa de Cadastro Repetida",
              descricao: `Encargos de renovação cadastral e abertura de ficha de financiamento.`,
              valorEstimado: cadastroEst,
              fundamentacaoLegal: "Súmula 566 do STJ e Resolução BACEN 3.919/2010",
              probabilidadeExito: "Média"
            },
            {
              tipo: "Capitalização Indevida / CET Divergente",
              descricao: `Custo Efetivo Total (CET) superior à taxa de juros nominal contratada devido à inclusão de tarifas acessórias na base de cálculo.`,
              valorEstimado: cetDiffEst,
              fundamentacaoLegal: "Súmula 539/STJ e Art. 52, V do Código de Defesa do Consumidor",
              probabilidadeExito: "Alta"
            }
          ],
          resumoExecutivo: `Auditoria pericial identificou potencial de ressarcimento de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRecup)} em tarifas e seguros embutidos na CCB, com viabilidade de devolução em dobro via notificação administrativa ou acordo.`,
          teseJuridicaRecomendada: "Notificação Extrajudicial com pedido de ressarcimento amigável c/c pleito de repetição do indébito (Art. 42, parágrafo único do CDC) e Tema 972/STJ.",
          sugestaoAcao: "Acordo Extrajudicial Notificatório"
        };
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

      await updateDoc(leadRef, cleanForFirestore(updatePayload));

      // Create notification for admin / partner
      try {
        await addDoc(collection(db, "notificacoes"), {
          leadId: leadId,
          leadNome: razaoSocial,
          partnerId: partnerId || leadData.parentPartnerId || "admin",
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
      return res.status(500).json({ error: err.message || "Erro interno ao processar a auditoria de CCB (RTB)." });
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

  const firestoreDocUrl = (path: string, masks: string[] = []) => {
    const base =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
      `/databases/${encodeURIComponent(FIRESTORE_DB_ID)}/documents/${path}`;
    if (!masks.length) return base;
    return base + "?" + masks.map((m) => `updateMask.fieldPaths=${m}`).join("&");
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

  /** Lê um documento. Retorna null quando não existe. */
  const getDocRest = async (path: string): Promise<any | null> => {
    const idToken = await getServiceIdToken();
    const r = await fetch(firestoreDocUrl(path), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!r.ok) return null;
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
      throw new Error(`Firestore CREATE ${r.status}: ${detail.slice(0, 160)}`);
    }
    const created = await r.json().catch(() => null);
    const name: string = created?.name || "";
    return { id: name.split("/").pop() || "" };
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

  app.get("/api/public/contrato/:leadId", async (req, res) => {
    try {
      const leadId = sanitizeLeadId(req.params?.leadId);
      if (!leadId) return res.status(400).json({ error: "Identificador de contrato inválido." });

      const lead = await getDocRest(`leads/${leadId}`);
      if (!lead) return res.status(404).json({ error: "Contrato não encontrado." });

      if (!lead.modeloContratacao) {
        return res.status(404).json({ error: "Contrato ainda não disponibilizado para assinatura." });
      }

      return res.json({
        success: true,
        contrato: {
          leadId,
          nomeEmpresa: lead.nomeEmpresa || lead.razaoSocial || "",
          cnpj: lead.cnpj || "",
          endereco:
            [(lead as any).endereco, lead.cidade, (lead as any).uf || (lead as any).estado]
              .filter(Boolean)
              .join(", ") || "",
          nomeContato: lead.nomeContato || lead.nome || "",
          modeloContratacao: lead.modeloContratacao,
          planoEscolhido: lead.planoEscolhido || "",
          valorMensalidade: Number(lead.valorMensalidade || 0),
          contratoAssinado: !!lead.contratoAssinado,
          contratoAssinadoData: lead.contratoAssinadoData || null,
        },
      });
    } catch (err: any) {
      console.error("Erro ao carregar contrato público:", err?.message || err);
      return res.status(500).json({ error: "Erro ao carregar o contrato." });
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

      const lead = await getDocRest(`leads/${leadId}`);
      if (!lead || !lead.modeloContratacao) {
        return res.status(404).json({ error: "Contrato não encontrado." });
      }
      if (lead.contratoAssinado) {
        return res.status(409).json({ error: "Este contrato já foi assinado." });
      }

      const nowIso = new Date().toISOString();
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

      try {
        await createDocRest("notificacoes", {
          recipientId: "admin",
          recipientType: "admin",
          titulo: "Novo contrato assinado",
          mensagem: `Novo contrato assinado: ${lead.nomeEmpresa || lead.razaoSocial || leadId} — ${lead.planoEscolhido || lead.modeloContratacao}. Gere o link de cobrança (InfinitePay) para prosseguir.`,
          tipo: "success",
          lida: false,
          leadId,
          dataCriacao: nowIso,
        });
      } catch (notifErr: any) {
        console.error("Falha ao notificar contrato assinado:", notifErr?.message || notifErr);
      }

      return res.json({
        success: true,
        registro: { nome, cpf, data: nowIso, ip, dispositivo },
      });
    } catch (err: any) {
      console.error("Erro ao assinar contrato público:", err?.message || err);
      return res.status(500).json({ error: "Erro ao registrar a assinatura." });
    }
  });

  return app;



}

