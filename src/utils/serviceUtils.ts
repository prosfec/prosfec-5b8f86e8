// @ts-nocheck
export interface ServiceCatalogItem {
  id: string;
  nome: string;
  valor: number;
  hublaLink?: string;
}

export const HUBLA_SERVICE_LINKS: Record<string, string> = {
  serv_renegociacao: "https://pay.hub.la/Es0EOCsgpzskcqccirFb",
  serv_rating_score: "https://pay.hub.la/jPGT1i0rasCFQukOCgTG",
  serv_bacen: "https://pay.hub.la/i8q6VxUnLOVxTiZS2ZuI",
  serv_contabil: "https://pay.hub.la/1cJOgeOHRKpac7VNPowK"
};

export const DEFAULT_SERVICES_CATALOG: ServiceCatalogItem[] = [
  { id: "serv_renegociacao", nome: "Renegociação de Dívidas ou Limpa Nome Liminar", valor: 300, hublaLink: HUBLA_SERVICE_LINKS.serv_renegociacao },
  { id: "serv_rating_score", nome: "Melhoria e Adequação de Rating e Score", valor: 1100, hublaLink: HUBLA_SERVICE_LINKS.serv_rating_score },
  { id: "serv_bacen", nome: "Regularização/Atuação Administrativa BACEN/SCR", valor: 2500, hublaLink: HUBLA_SERVICE_LINKS.serv_bacen },
  { id: "serv_contabil", nome: "Serviços Contábeis p/ Regularização/Adequação CNPJ", valor: 700, hublaLink: HUBLA_SERVICE_LINKS.serv_contabil }
];

export function getHublaLinkForService(serv: any, lead?: any): string | null {
  if (!serv) return null;
  if (serv.hublaLink && typeof serv.hublaLink === "string" && serv.hublaLink.startsWith("http")) {
    return attachLeadParamsToHublaUrl(serv.hublaLink, lead);
  }

  const id = (serv.id || "").toString().toLowerCase();
  const nome = (serv.nome || serv.titulo || serv.servico || "").toString().toLowerCase();

  let baseUrl: string | null = null;

  if (id === "serv_renegociacao" || nome.includes("renegocia") || nome.includes("limpa nome") || nome.includes("restriç") || nome.includes("restric")) {
    baseUrl = HUBLA_SERVICE_LINKS.serv_renegociacao;
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
  if (lead.cnpj || lead.cpf) params.set("doc", (lead.cnpj || lead.cpf).trim());
  if (lead.id) params.set("leadId", lead.id);

  const queryString = params.toString();
  if (!queryString) return url;
  return url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`;
}

export function sanitizeAndSyncServicosList(rawList: any[], catalog?: any[]): any[] {
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) return [];

  const activeCatalog = (catalog && catalog.length > 0) ? catalog : DEFAULT_SERVICES_CATALOG;

  // Find price and name for rating_score from catalog if available
  const catalogRatingScore = activeCatalog.find(
    c => (c.id && c.id === "serv_rating_score") ||
         (c.nome && c.nome.toLowerCase().includes("rating") && c.nome.toLowerCase().includes("score"))
  );

  const targetRatingScorePrice = catalogRatingScore && typeof catalogRatingScore.valor === "number"
    ? catalogRatingScore.valor
    : 1100;

  const targetRatingScoreName = catalogRatingScore?.nome || "Melhoria e Adequação de Rating e Score";

  const result: any[] = [];
  let mergedRatingScoreItem: any = null;

  for (const sItem of rawList) {
    if (!sItem) continue;

    const itemName = (sItem.nome || sItem.servico || "").toString();
    const itemNameLower = itemName.toLowerCase();
    const itemId = (sItem.id || "").toString();

    const isRatingOrScore = itemId === "serv_rating" || itemId === "serv_score" || itemId === "serv_rating_score" ||
      itemNameLower.includes("rating") || itemNameLower.includes("score");

    if (isRatingOrScore) {
      if (!mergedRatingScoreItem) {
        mergedRatingScoreItem = {
          ...sItem,
          id: "serv_rating_score",
          nome: targetRatingScoreName,
          valor: targetRatingScorePrice,
          justificativa: sItem.justificativa || "Para elevação unificada do Rating interno bancário e Score do CPF e CNPJ nos bureaus e Banco Central",
          status: sItem.status || "pendente"
        };
        result.push(mergedRatingScoreItem);
      }
      // Any subsequent rating or score item in rawList is ignored as it is merged!
    } else {
      // Match with current catalog for other items
      const matchedCatalog = activeCatalog.find(c => {
        if (!c) return false;
        if (c.id && sItem.id && c.id === sItem.id) return true;
        const cNameLower = (c.nome || "").toLowerCase();
        if (cNameLower && itemNameLower && cNameLower.trim() === itemNameLower.trim()) return true;
        if (cNameLower.includes("renegociação") && itemNameLower.includes("renegociação")) return true;
        if (cNameLower.includes("bacen") && itemNameLower.includes("bacen")) return true;
        if (cNameLower.includes("contábil") && itemNameLower.includes("contábil")) return true;
        return false;
      });

      if (matchedCatalog && typeof matchedCatalog.valor === "number") {
        result.push({
          ...sItem,
          id: matchedCatalog.id || sItem.id,
          nome: matchedCatalog.nome || sItem.nome,
          valor: matchedCatalog.valor
        });
      } else {
        result.push({
          ...sItem,
          nome: itemName,
          valor: typeof sItem.valor === "number" ? sItem.valor : (parseFloat(sItem.valor) || 0)
        });
      }
    }
  }

  return result;
}

// Re-export Multilevel Commission Logic
export * from "./commissionUtils";
