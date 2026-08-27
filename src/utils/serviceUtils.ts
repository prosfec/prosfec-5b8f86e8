// @ts-nocheck
export interface ServiceCatalogItem {
  id: string;
  nome: string;
  valor: number;
  hublaLink?: string;
  semCustoInicial?: boolean;
}

export const HUBLA_SERVICE_LINKS: Record<string, string> = {
  serv_reabilitacao: "https://pay.hub.la/Es0EOCsgpzskcqccirFb",
  serv_renegociacao: "https://pay.hub.la/Es0EOCsgpzskcqccirFb",
  serv_rating_score: "https://pay.hub.la/jPGT1i0rasCFQukOCgTG",
  serv_bacen: "https://pay.hub.la/i8q6VxUnLOVxTiZS2ZuI",
  serv_contabil: "https://pay.hub.la/1cJOgeOHRKpac7VNPowK"
};

export const DEFAULT_SERVICES_CATALOG: ServiceCatalogItem[] = [
  { 
    id: "serv_reabilitacao", 
    nome: "Programa de Reabilitação Financeira e Creditícia", 
    valor: 0, 
    semCustoInicial: true,
    hublaLink: HUBLA_SERVICE_LINKS.serv_reabilitacao 
  },
  { 
    id: "serv_rating_score", 
    nome: "Melhoria e Adequação de Rating e Score", 
    valor: 1100, 
    hublaLink: HUBLA_SERVICE_LINKS.serv_rating_score 
  },
  { 
    id: "serv_contabil", 
    nome: "Serviços Contábeis p/ Regularização/Adequação CNPJ", 
    valor: 700, 
    hublaLink: HUBLA_SERVICE_LINKS.serv_contabil 
  },
  { 
    id: "serv_rtb", 
    nome: "Recuperação de Tarifas Bancárias (RTB - Perícia CCB)", 
    valor: 0, 
    semCustoInicial: true 
  },
  { 
    id: "serv_dossie_projeto", 
    nome: "Dossiê Bancário & Projeto Estruturado de Crédito", 
    valor: 0, 
    semCustoInicial: true 
  }
];

/**
 * Identifica se um serviço é de contabilidade ou contratado por demanda avulsa
 */
export function isDemandAccountingService(serv: any): boolean {
  if (!serv) return false;
  const id = (serv.id || "").toString().toLowerCase();
  const nome = (serv.nome || serv.titulo || serv.servico || "").toString().toLowerCase();
  const categoria = (serv.categoria || "").toString().toLowerCase();

  return (
    id === "serv_contabil" ||
    id.startsWith("contab_") ||
    categoria.includes("contab") ||
    categoria.includes("fiscal") ||
    categoria.includes("societ") ||
    categoria.includes("regularizacao") ||
    categoria.includes("regularização") ||
    categoria.includes("cnd") ||
    categoria.includes("demanda") ||
    nome.includes("contábil") ||
    nome.includes("contabil") ||
    nome.includes("contabilidade") ||
    nome.includes("por demanda") ||
    nome.includes("abertura de empresa") ||
    nome.includes("alteração contratual") ||
    nome.includes("alteracao contratual") ||
    nome.includes("desenquadramento") ||
    nome.includes("declaração de faturamento") ||
    nome.includes("declaracao de faturamento") ||
    nome.includes("defis") ||
    nome.includes("ecf") ||
    nome.includes("ecd") ||
    nome.includes("cnd federal") ||
    nome.includes("cnd estadual") ||
    nome.includes("cnd municipal") ||
    nome.includes("parcelamento receita") ||
    nome.includes("parcelamento pgfn") ||
    nome.includes("regularização e-cac") ||
    nome.includes("regularizacao e-cac")
  );
}

/**
 * Identifica se um serviço é isento de custo inicial (remunerado exclusivamente no êxito ou sob demanda sem custo avulso)
 */
export function isServiceWithoutUpfrontCost(serv: any): boolean {
  if (!serv) return false;
  
  if (serv.semCustoInicial === true) return true;
  const preco = typeof serv.preco === "number" ? serv.preco : typeof serv.valor === "number" ? serv.valor : parseFloat(serv.preco || serv.valor || 0);
  if (isNaN(preco) || preco <= 0) return true;

  // Serviços contábeis ou por demanda com valor > 0 possuem custo
  if (isDemandAccountingService(serv)) return false;

  const id = (serv.id || "").toString().toLowerCase();
  const nome = (serv.nome || serv.titulo || serv.servico || "").toString().toLowerCase();

  return (
    id === "serv_rtb" ||
    id === "serv_dossie" ||
    id === "serv_projeto" ||
    id === "serv_dossie_projeto" ||
    nome.includes("recuperação de tarifa") ||
    nome.includes("recuperacao de tarifa") ||
    nome.includes("rtb") ||
    nome.includes("perícia ccb") ||
    nome.includes("pericia ccb") ||
    nome.includes("dossiê") ||
    nome.includes("dossie") ||
    nome.includes("projeto bancário") ||
    nome.includes("projeto estruturado") ||
    nome.includes("projeto de crédito")
  );
}

export function getHublaLinkForService(serv: any, lead?: any, catalog?: any[]): string | null {
  if (!serv) return null;

  // Se o serviço não tem custo inicial (ex: RTB, Dossiê/Projeto ou valor 0), nunca gera link do Hubla
  if (isServiceWithoutUpfrontCost(serv)) {
    return null;
  }

  // 1. Se o próprio objeto já possui um hublaLink configurado
  if (serv.hublaLink && typeof serv.hublaLink === "string" && serv.hublaLink.trim().startsWith("http")) {
    return attachLeadParamsToHublaUrl(serv.hublaLink.trim(), lead);
  }

  const id = (serv.id || "").toString().toLowerCase();
  const nome = (serv.nome || serv.titulo || serv.servico || "").toString().toLowerCase();

  // 2. Se foi passado um catálogo e houver correspondência com hublaLink cadastrado
  if (catalog && Array.isArray(catalog)) {
    const matched = catalog.find(c => 
      c && (
        (c.id && serv.id && c.id === serv.id) ||
        (c.nome && nome && c.nome.toLowerCase().trim() === nome.trim())
      )
    );
    if (matched && matched.hublaLink && typeof matched.hublaLink === "string" && matched.hublaLink.trim().startsWith("http")) {
      return attachLeadParamsToHublaUrl(matched.hublaLink.trim(), lead);
    }
  }

  let baseUrl: string | null = null;

  if (id === "serv_reabilitacao" || id === "serv_renegociacao" || nome.includes("reabilita") || nome.includes("renegocia") || nome.includes("limpa nome") || nome.includes("restriç") || nome.includes("restric")) {
    baseUrl = HUBLA_SERVICE_LINKS.serv_reabilitacao || HUBLA_SERVICE_LINKS.serv_renegociacao;
  } else if (id === "serv_rating_score" || id === "serv_rating" || id === "serv_score" || nome.includes("rating") || nome.includes("score") || nome.includes("proposta")) {
    baseUrl = HUBLA_SERVICE_LINKS.serv_rating_score;
  } else if (id === "serv_bacen" || nome.includes("bacen") || nome.includes("scr") || nome.includes("banco central")) {
    baseUrl = HUBLA_SERVICE_LINKS.serv_bacen;
  } else if (id === "serv_contabil" || nome.includes("contáb") || nome.includes("contab") || nome.includes("cnpj") || nome.includes("receita federal") || nome.includes("cnd") || nome.includes("e-cac")) {
    baseUrl = HUBLA_SERVICE_LINKS.serv_contabil;
  }

  if (!baseUrl) return null;

  return attachLeadParamsToHublaUrl(baseUrl, lead);
}

function attachLeadParamsToHublaUrl(url: string, lead?: any): string {
  if (!lead) return url;
  const params = new URLSearchParams();
  if (lead.email) params.set("email", lead.email.trim());
  if (lead.razaoSocial || lead.nomeContato) params.set("name", (lead.razaoSocial || lead.nomeContato).trim());
  if (lead.cnpj || lead.cpf) {
    const docClean = (lead.cnpj || lead.cpf).trim();
    params.set("doc", docClean);
    params.set("document", docClean);
  }
  if (lead.id) {
    params.set("leadId", lead.id);
    params.set("custom_id", lead.id);
    params.set("sck", lead.id);
    params.set("metadata[leadId]", lead.id);
  }

  const queryString = params.toString();
  if (!queryString) return url;
  return url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`;
}

/**
 * Sanitiza recursivamente objetos para gravação no Firestore, eliminando valores `undefined` que travam o SDK
 */
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

/**
 * Sanitiza rigorosamente a lista de serviços do catálogo para gravação no Firestore
 */
export function sanitizeServiceCatalogForFirestore(catalog: ServiceCatalogItem[]): any[] {
  if (!Array.isArray(catalog)) return [];
  return catalog
    .filter(item => item && typeof item === "object")
    .map(item => {
      const cleaned: any = {
        id: (item.id || `serv_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`).toString().trim(),
        nome: (item.nome || "").toString().trim(),
        valor: typeof item.valor === "number" && !isNaN(item.valor) ? item.valor : (parseFloat(String(item.valor || 0)) || 0)
      };
      if (item.hublaLink && typeof item.hublaLink === "string" && item.hublaLink.trim()) {
        cleaned.hublaLink = item.hublaLink.trim();
      }
      if (item.semCustoInicial !== undefined && item.semCustoInicial !== null) {
        cleaned.semCustoInicial = Boolean(item.semCustoInicial);
      }
      return cleaned;
    });
}

export function sanitizeAndSyncServicosList(rawList: any[], catalog?: any[]): any[] {
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) return [];

  const activeCatalog = (catalog && catalog.length > 0) ? catalog : DEFAULT_SERVICES_CATALOG;

  // Catalog helpers
  const catalogReabilitacao = activeCatalog.find(
    c => (c.id && (c.id === "serv_reabilitacao" || c.id === "serv_renegociacao")) ||
         (c.nome && (c.nome.toLowerCase().includes("reabilita") || c.nome.toLowerCase().includes("renegocia")))
  );
  const targetReabilitacaoPrice = catalogReabilitacao && typeof catalogReabilitacao.valor === "number"
    ? catalogReabilitacao.valor
    : 0;
  const targetReabilitacaoName = catalogReabilitacao?.nome || "Programa de Reabilitação Financeira e Creditícia";

  const catalogRatingScore = activeCatalog.find(
    c => (c.id && c.id === "serv_rating_score") ||
         (c.nome && c.nome.toLowerCase().includes("rating") && c.nome.toLowerCase().includes("score"))
  );
  const targetRatingScorePrice = catalogRatingScore && typeof catalogRatingScore.valor === "number"
    ? catalogRatingScore.valor
    : 1100;
  const targetRatingScoreName = catalogRatingScore?.nome || "Melhoria e Adequação de Rating e Score";

  const result: any[] = [];
  let mergedReabilitacaoItem: any = null;
  let mergedRatingScoreItem: any = null;

  for (const sItem of rawList) {
    if (!sItem) continue;

    const itemName = (sItem.nome || sItem.servico || sItem.titulo || "").toString();
    const itemNameLower = itemName.toLowerCase();
    const itemId = (sItem.id || "").toString();

    // 1. Unificar Reabilitação / Renegociação / BACEN avulso legado
    const isReabilitacao = itemId === "serv_reabilitacao" || itemId === "serv_renegociacao" ||
      itemNameLower.includes("reabilitação") || itemNameLower.includes("reabilitacao") ||
      itemNameLower.includes("renegociação") || itemNameLower.includes("renegociacao") ||
      itemNameLower.includes("limpa nome");

    // 2. Se for BACEN avulso legado e não temos ainda o programa de reabilitação adicionado, fundir ou migrar
    const isBacenAvulso = itemId === "serv_bacen" || (itemNameLower.includes("bacen") && itemNameLower.includes("administrativa"));

    if (isReabilitacao || isBacenAvulso) {
      if (!mergedReabilitacaoItem) {
        const hLink = catalogReabilitacao?.hublaLink || sItem.hublaLink || HUBLA_SERVICE_LINKS.serv_reabilitacao || null;
        mergedReabilitacaoItem = {
          ...sItem,
          id: "serv_reabilitacao",
          nome: targetReabilitacaoName,
          ...(sItem.titulo ? { titulo: sItem.titulo || targetReabilitacaoName } : {}),
          valor: targetReabilitacaoPrice,
          preco: targetReabilitacaoPrice,
          ...(hLink ? { hublaLink: hLink } : {}),
          justificativa: sItem.justificativa || "Programa unificado abrangendo Renegociação de Dívidas, Liminar Limpa Nome e Regularização/Administração SCR/Bacen",
          status: sItem.status || "pendente"
        };
        result.push(mergedReabilitacaoItem);
      }
      // Se houver múltiplos registros legados de renegociação/bacen, o primeiro unifica com R$ 2.000
    } else if (itemId === "serv_rating" || itemId === "serv_score" || itemId === "serv_rating_score" ||
      itemNameLower.includes("rating") || itemNameLower.includes("score")) {
      if (!mergedRatingScoreItem) {
        const hLink = catalogRatingScore?.hublaLink || sItem.hublaLink || HUBLA_SERVICE_LINKS.serv_rating_score || null;
        mergedRatingScoreItem = {
          ...sItem,
          id: "serv_rating_score",
          nome: targetRatingScoreName,
          ...(sItem.titulo ? { titulo: sItem.titulo || targetRatingScoreName } : {}),
          valor: targetRatingScorePrice,
          preco: targetRatingScorePrice,
          ...(hLink ? { hublaLink: hLink } : {}),
          justificativa: sItem.justificativa || "Para elevação unificada do Rating interno bancário e Score do CPF e CNPJ nos bureaus e Banco Central",
          status: sItem.status || "pendente"
        };
        result.push(mergedRatingScoreItem);
      }
    } else {
      // Match with current catalog for other items
      const matchedCatalog = activeCatalog.find(c => {
        if (!c) return false;
        if (c.id && sItem.id && c.id === sItem.id) return true;
        const cNameLower = (c.nome || "").toLowerCase();
        if (cNameLower && itemNameLower && cNameLower.trim() === itemNameLower.trim()) return true;
        if (cNameLower.includes("contábil") && itemNameLower.includes("contábil")) return true;
        if (cNameLower.includes("tarifa") && itemNameLower.includes("tarifa")) return true;
        return false;
      });

      if (matchedCatalog && typeof matchedCatalog.valor === "number") {
        const hLink = matchedCatalog.hublaLink || sItem.hublaLink || (matchedCatalog.id ? HUBLA_SERVICE_LINKS[matchedCatalog.id] : null);
        result.push({
          ...sItem,
          id: matchedCatalog.id || sItem.id,
          nome: matchedCatalog.nome || sItem.nome,
          ...(sItem.titulo ? { titulo: sItem.titulo || matchedCatalog.nome } : {}),
          valor: matchedCatalog.valor,
          preco: matchedCatalog.valor,
          ...(hLink ? { hublaLink: hLink } : {})
        });
      } else {
        const hLink = sItem.hublaLink || null;
        const finalVal = typeof sItem.valor === "number" ? sItem.valor : typeof sItem.preco === "number" ? sItem.preco : (parseFloat(sItem.valor || sItem.preco) || 0);
        result.push({
          ...sItem,
          nome: itemName,
          ...(sItem.titulo ? { titulo: sItem.titulo } : {}),
          valor: finalVal,
          preco: finalVal,
          ...(hLink ? { hublaLink: hLink } : {})
        });
      }
    }
  }

  return cleanForFirestore(result);
}

export interface ApplicableContractTab {
  id: "contrato" | "termo" | "rating_score" | "bacen" | "rtb";
  title: string;
  label: string;
}

/**
 * Retorna dinamicamente apenas os contratos pertinentes aos serviços contratados/recomendados para o lead
 * Mantendo as métricas e minutas de termos 100% separadas e protegidas
 */
export function getApplicableContracts(lead: any): ApplicableContractTab[] {
  const tabs: ApplicableContractTab[] = [
    { id: "contrato", title: "Contrato Principal", label: "Principal" },
    { id: "termo", title: "Termo de Honorários", label: "Termo Honorários" }
  ];

  if (!lead) return tabs;

  // Obter todas as fontes de serviços do lead
  const servs: any[] = [
    ...(Array.isArray(lead.servicosRecomendados) ? lead.servicosRecomendados : []),
    ...(Array.isArray(lead.diagnosticoPROSFEC?.servicosRecomendados) ? lead.diagnosticoPROSFEC.servicosRecomendados : []),
    ...(Array.isArray(lead.subEtapasPasso6) ? lead.subEtapasPasso6 : []),
    ...(Array.isArray(lead.pendencias) ? lead.pendencias : [])
  ];

  // Helper para verificar se um serviço específico está presente
  const hasService = (predicate: (s: any) => boolean) => {
    return servs.some(s => {
      if (!s) return false;
      return predicate(s);
    });
  };

  // 1. Rating / Score
  const hasRatingScore = hasService(s => {
    const id = (s.id || "").toString().toLowerCase();
    const nome = (s.nome || s.titulo || s.servico || "").toString().toLowerCase();
    return id === "serv_rating_score" || id === "serv_rating" || id === "serv_score" ||
      nome.includes("rating") || nome.includes("score");
  });

  if (hasRatingScore) {
    tabs.push({ id: "rating_score", title: "Contrato Rating/Score", label: "Rating/Score" });
  }

  // 2. BACEN / SCR (Aplicável quando há Programa de Reabilitação ou BACEN)
  const hasBacen = hasService(s => {
    const id = (s.id || "").toString().toLowerCase();
    const nome = (s.nome || s.titulo || s.servico || "").toString().toLowerCase();
    return id === "serv_reabilitacao" || id === "serv_bacen" || id === "serv_renegociacao" ||
      nome.includes("reabilita") || nome.includes("bacen") || nome.includes("scr") || nome.includes("banco central");
  });

  if (hasBacen) {
    tabs.push({ id: "bacen", title: "Contrato BACEN/SCR", label: "BACEN/SCR" });
  }

  // 3. RTB (Recuperação de Tarifas)
  const hasRtb = hasService(s => {
    const id = (s.id || "").toString().toLowerCase();
    const nome = (s.nome || s.titulo || s.servico || "").toString().toLowerCase();
    return id === "serv_rtb" || nome.includes("rtb") || nome.includes("tarifa") || nome.includes("tarifas");
  });

  if (hasRtb) {
    tabs.push({ id: "rtb", title: "Contrato RTB (Tarifas)", label: "RTB (Tarifas)" });
  }

  return tabs;
}

// Re-export Multilevel Commission Logic
export * from "./commissionUtils";
