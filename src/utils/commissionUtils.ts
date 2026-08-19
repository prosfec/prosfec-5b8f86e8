/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralized Multilevel Commission Engine for Partners & Leads
 * Rules:
 *  - Direct Rates:
 *      * Starter: 10% (0.10)
 *      * Executive: 20% (0.20)
 *      * Master (Franquia Digital / Master Partner): 30% (0.30)
 *  - Multilevel / Hierarchy Split (Master & Consultant):
 *      * Executive Consultant under Master: Consultant receives 20% | Master receives 10% override (30% - 20%)
 *      * Starter Consultant under Master: Consultant receives 10% | Master receives 20% override (30% - 10%)
 *      * Direct Master (no consultant): Master receives 30% | Consultant 0%
 *      * Independent Executive: Consultant receives 20% | Master 0%
 *      * Independent Starter: Consultant receives 10% | Master 0%
 */

export type PartnerPlanType = "STARTER" | "EXECUTIVE" | "MASTER";

export const SERVICE_COMMISSION_RATES = {
  STARTER: 0.10,   // 10%
  EXECUTIVE: 0.20, // 20%
  MASTER: 0.30     // 30%
} as const;

export const CREDIT_COMMISSION_RATES = {
  STARTER: 0.005,   // 0.5%
  EXECUTIVE: 0.015, // 1.5%
  MASTER: 0.030     // 3.0%
} as const;

/**
 * Normalizes partner plan strings to standardized Plan Types
 */
export function normalizePartnerPlan(plan?: string): PartnerPlanType {
  if (!plan) return "STARTER";
  const p = plan.toUpperCase().trim();
  if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return "MASTER";
  if (p.includes("EXEC")) return "EXECUTIVE";
  if (p.includes("STARTER") || p.includes("INICIANTE") || p.includes("BASICO")) return "STARTER";
  return "EXECUTIVE"; // Default fallback
}

/**
 * Check if a plan is a Master Partner / Franquia Digital
 */
export function isFranquiaDigital(plan?: string): boolean {
  return normalizePartnerPlan(plan) === "MASTER";
}

/**
 * Base credit commission rate for a direct partner on approved credit:
 * - Starter: 0.5% (0.005)
 * - Executive: 1.5% (0.015)
 * - Master: 3.0% (0.030)
 */
export function getCreditCommissionRate(plan?: string): number {
  const normalized = normalizePartnerPlan(plan);
  return CREDIT_COMMISSION_RATES[normalized];
}

/**
 * Master override/spread rate on team member released credit:
 * - Starter consultant (0.5%) -> Master receives 2.5% (3.0% - 0.5%)
 * - Executive consultant (1.5%) -> Master receives 1.5% (3.0% - 1.5%)
 * - Master consultant -> 0.0%
 */
export function getMasterTeamCreditOverrideRate(consultantPlan?: string): number {
  const normalized = normalizePartnerPlan(consultantPlan);
  if (normalized === "STARTER") return 0.025; // 3.0% - 0.5% = 2.5%
  if (normalized === "EXECUTIVE") return 0.015; // 3.0% - 1.5% = 1.5%
  return 0.000;
}

/**
 * Base service commission rate for a direct partner (10% Starter, 20% Executive, 30% Master)
 */
export function getServiceCommissionRate(plan?: string): number {
  const normalized = normalizePartnerPlan(plan);
  return SERVICE_COMMISSION_RATES[normalized];
}

/**
 * Master override/spread rate on team member services:
 * - Starter consultant (10%) -> Master receives 20%
 * - Executive consultant (20%) -> Master receives 10%
 * - Master consultant -> 0%
 */
export function getMasterTeamServiceOverrideRate(consultantPlan?: string): number {
  const normalized = normalizePartnerPlan(consultantPlan);
  if (normalized === "STARTER") return 0.20; // 30% - 10% = 20%
  if (normalized === "EXECUTIVE") return 0.10; // 30% - 20% = 10%
  return 0.00;
}

/**
 * Friendly label describing commission tier for a plan
 */
export function getPlanServiceLabel(plan?: string): string {
  const normalized = normalizePartnerPlan(plan);
  switch (normalized) {
    case "STARTER":
      return "10% Direta (Starter Partner)";
    case "EXECUTIVE":
      return "20% Direta (Executive Partner)";
    case "MASTER":
      return "30% Direta / Repasse de Equipe (Teto 30%)";
    default:
      return "20% Direta";
  }
}

export interface MultilevelCommissionBreakdown {
  amount: number;
  totalCommissionRate: number; // e.g. 0.30, 0.20, 0.10
  totalCommissionAmount: number;

  consultantRate: number; // e.g. 0.10, 0.20, 0.30
  consultantAmount: number;
  consultantPlan: string;
  consultantPlanNormalized: PartnerPlanType;

  masterOverrideRate: number; // e.g. 0.10, 0.20, 0.00
  masterOverrideAmount: number;
  masterPlan?: string;
  masterPlanNormalized?: PartnerPlanType;

  hasHierarchy: boolean;
  splitDescription: string;
  rateDisplayConsultant: string;
  rateDisplayMaster: string;
}

/**
 * Calculates multilevel commission breakdown for a specific service or monetary amount
 */
export function calculateMultilevelCommission(
  amount: number,
  options: {
    consultantPlan?: string;
    hasMasterParent?: boolean;
    masterPlan?: string;
    isDirectMaster?: boolean;
  }
): MultilevelCommissionBreakdown {
  const val = typeof amount === "number" ? amount : (parseFloat(amount) || 0);
  const cleanAmount = Math.max(0, val);

  if (options.isDirectMaster) {
    const rate = SERVICE_COMMISSION_RATES.MASTER; // 30%
    const totalComissao = cleanAmount * rate;
    return {
      amount: cleanAmount,
      totalCommissionRate: rate,
      totalCommissionAmount: totalComissao,
      consultantRate: rate,
      consultantAmount: totalComissao,
      consultantPlan: options.masterPlan || "Master Partner PROSFEC",
      consultantPlanNormalized: "MASTER",
      masterOverrideRate: 0,
      masterOverrideAmount: 0,
      hasHierarchy: false,
      splitDescription: "30% Direta (Master Partner)",
      rateDisplayConsultant: "30% direta",
      rateDisplayMaster: "0%"
    };
  }

  const consultantPlanNorm = normalizePartnerPlan(options.consultantPlan);
  const consultantDirectRate = SERVICE_COMMISSION_RATES[consultantPlanNorm]; // 10% Starter or 20% Executive

  if (options.hasMasterParent) {
    const masterPlanNorm = normalizePartnerPlan(options.masterPlan || "MASTER");
    const masterOverrideRate = consultantPlanNorm === "STARTER" ? 0.20 : 0.10;
    const totalRate = consultantDirectRate + masterOverrideRate; // Always 30% total pool under Master

    const consultantAmount = cleanAmount * consultantDirectRate;
    const masterOverrideAmount = cleanAmount * masterOverrideRate;
    const totalCommissionAmount = cleanAmount * totalRate;

    const splitText = consultantPlanNorm === "STARTER"
      ? "Divisão Multinível: 10% Consultor (Starter) + 20% Master Partner (Total: 30%)"
      : "Divisão Multinível: 20% Consultor (Executive) + 10% Master Partner (Total: 30%)";

    return {
      amount: cleanAmount,
      totalCommissionRate: totalRate,
      totalCommissionAmount,
      consultantRate: consultantDirectRate,
      consultantAmount,
      consultantPlan: options.consultantPlan || `${consultantPlanNorm} Partner`,
      consultantPlanNormalized: consultantPlanNorm,
      masterOverrideRate,
      masterOverrideAmount,
      masterPlan: options.masterPlan || "Master Partner PROSFEC",
      masterPlanNormalized: masterPlanNorm,
      hasHierarchy: true,
      splitDescription: splitText,
      rateDisplayConsultant: `${Math.round(consultantDirectRate * 100)}% consultor`,
      rateDisplayMaster: `${Math.round(masterOverrideRate * 100)}% override master`
    };
  }

  // Independent consultant (no hierarchy)
  const consultantAmount = cleanAmount * consultantDirectRate;
  return {
    amount: cleanAmount,
    totalCommissionRate: consultantDirectRate,
    totalCommissionAmount: consultantAmount,
    consultantRate: consultantDirectRate,
    consultantAmount,
    consultantPlan: options.consultantPlan || `${consultantPlanNorm} Partner`,
    consultantPlanNormalized: consultantPlanNorm,
    masterOverrideRate: 0,
    masterOverrideAmount: 0,
    hasHierarchy: false,
    splitDescription: `${Math.round(consultantDirectRate * 100)}% Direta (${consultantPlanNorm})`,
    rateDisplayConsultant: `${Math.round(consultantDirectRate * 100)}% direta`,
    rateDisplayMaster: "0%"
  };
}

export interface LeadMultilevelCommissionSummary {
  taxaConsultor: number;
  taxaMaster: number;
  taxaTotal: number;

  // Totals
  valorTotalServicos: number;
  valorTotalComissao: number;
  valorConsultorTotal: number;
  valorMasterTotal: number;

  // Paid
  valorServicosPagos: number;
  valorComissaoPaga: number;
  valorPagoConsultor: number;
  valorPagoMaster: number;

  // Pending
  valorServicosPendentes: number;
  valorComissaoPendente: number;
  valorPendenteConsultor: number;
  valorPendenteMaster: number;

  // Liquidated (available for withdrawal)
  valorComissaoLiberadaSaque: number;
  valorLiberadoConsultor: number;
  valorLiberadoMaster: number;
  valorAguardandoCompensacao: number;

  // Partner Identification
  consultorId?: string;
  consultorNome?: string;
  consultorPlano?: string;
  consultorPlanoNormalizado: PartnerPlanType;

  masterId?: string | null;
  masterNome?: string | null;
  masterPlano?: string | null;
  masterPlanoNormalizado?: PartnerPlanType | null;

  hasHierarchy: boolean;
  descricaoDivisao: string;
  dataCalculo: string;
}

/**
 * Resolves the partner hierarchy for a given Lead based on registered partners list or lead attributes
 */
export function resolveLeadPartnerHierarchy(
  lead: any,
  allPartners: any[] = [],
  currentPartnerContext?: any
): {
  consultor?: any;
  master?: any;
  hasHierarchy: boolean;
  isDirectMaster: boolean;
} {
  const parceiroId = lead?.parceiroId || lead?.partnerId || lead?.consultorId || currentPartnerContext?.id;
  const parentPartnerId = lead?.parentPartnerId || lead?.masterPartnerId;

  let directPartner = allPartners.find(p => p.id === parceiroId) || (currentPartnerContext?.id === parceiroId ? currentPartnerContext : null);
  let parentPartner = allPartners.find(p => p.id === parentPartnerId);

  // If direct partner has a parentPartnerId in their profile
  if (directPartner && directPartner.parentPartnerId && !parentPartner) {
    parentPartner = allPartners.find(p => p.id === directPartner.parentPartnerId);
  }

  // Check if direct partner is already a Master Partner
  const isDirectMaster = directPartner ? isFranquiaDigital(directPartner.plano) : false;

  if (isDirectMaster) {
    return {
      consultor: directPartner,
      master: directPartner,
      hasHierarchy: false,
      isDirectMaster: true
    };
  }

  const hasHierarchy = !!(parentPartner && isFranquiaDigital(parentPartner.plano));

  return {
    consultor: directPartner || {
      id: parceiroId || "",
      nome: lead?.parceiroNome || "Consultor Parceiro",
      plano: lead?.parceiroPlano || "Executive Partner PROSFEC"
    },
    master: hasHierarchy ? parentPartner : null,
    hasHierarchy,
    isDirectMaster: false
  };
}

/**
 * Augments a list of services (subEtapasPasso6 or servicosRecomendados) with multilevel commission fields
 */
export function augmentServiceItemsWithCommission(
  rawServices: any[],
  lead: any,
  allPartners: any[] = [],
  currentPartnerContext?: any
): any[] {
  if (!Array.isArray(rawServices) || rawServices.length === 0) return [];

  const hierarchy = resolveLeadPartnerHierarchy(lead, allPartners, currentPartnerContext);
  const consultantPlan = hierarchy.consultor?.plano || "Executive Partner PROSFEC";
  const masterPlan = hierarchy.master?.plano || "Franquia Digital PROSFEC";

  return rawServices.map((s: any, idx: number) => {
    const precoNum = typeof s.preco === "number"
      ? s.preco
      : typeof s.valor === "number"
        ? s.valor
        : parseFloat(s.preco || s.valor || 0) || 0;

    let st: "pendente" | "pago" | "cancelado" = "pendente";
    if (s.statusPagamento === "cancelado" || s.cancelado === true || s.status === "cancelado") {
      st = "cancelado";
    } else if (s.statusPagamento === "pago" || s.pago === true || (s.concluida && s.statusPagamento !== "pendente")) {
      st = "pago";
    }

    const metodo = s.formaPagamento || s.metodoPagamento || "PIX";
    const isPix = metodo.toUpperCase().includes("PIX");
    const daysToClear = isPix ? 2 : 15;
    const dataPagamento = s.dataPagamento || (st === "pago" ? (lead.dataCriacao || new Date().toISOString()) : undefined);
    
    let isLiquidated = false;
    let dataLiberacaoSaque = s.dataLiberacaoSaque;
    if (st === "pago") {
      if (!dataLiberacaoSaque && dataPagamento) {
        const paymentDate = new Date(dataPagamento);
        const releaseDate = new Date(paymentDate.getTime() + daysToClear * 24 * 60 * 60 * 1000);
        dataLiberacaoSaque = releaseDate.toISOString();
      }
      isLiquidated = !dataLiberacaoSaque || new Date(dataLiberacaoSaque).getTime() <= Date.now();
    }

    const commissionCalc = calculateMultilevelCommission(precoNum, {
      consultantPlan,
      hasMasterParent: hierarchy.hasHierarchy,
      masterPlan,
      isDirectMaster: hierarchy.isDirectMaster
    });

    return {
      ...s,
      id: s.id || `srv_${lead.id || "lead"}_${idx + 1}`,
      titulo: s.titulo || s.nome || s.servico || `Serviço ${idx + 1}`,
      preco: precoNum,
      statusPagamento: st,
      formaPagamento: metodo,
      dataPagamento,
      dataLiberacaoSaque,
      isLiquidated,
      comissao: commissionCalc.consultantAmount, // Default commission for direct owner
      comissaoConsultor: commissionCalc.consultantAmount,
      comissaoMaster: commissionCalc.masterOverrideAmount,
      taxaConsultor: commissionCalc.consultantRate,
      taxaMaster: commissionCalc.masterOverrideRate,
      taxaTotal: commissionCalc.totalCommissionRate,
      hasHierarchy: hierarchy.hasHierarchy,
      splitDescription: commissionCalc.splitDescription,
      concluida: s.concluida ?? (st === "pago")
    };
  });
}

/**
 * Calculates complete multilevel commission summary for a Lead
 */
export function calculateLeadMultilevelCommissions(
  lead: any,
  allPartners: any[] = [],
  currentPartnerContext?: any
): LeadMultilevelCommissionSummary {
  const hierarchy = resolveLeadPartnerHierarchy(lead, allPartners, currentPartnerContext);
  const consultantPlan = hierarchy.consultor?.plano || "Executive Partner PROSFEC";
  const masterPlan = hierarchy.master?.plano || "Franquia Digital PROSFEC";

  let rawServices: any[] = [];
  if (Array.isArray(lead.subEtapasPasso6) && lead.subEtapasPasso6.length > 0) {
    rawServices = lead.subEtapasPasso6;
  } else if (Array.isArray(lead.servicosRecomendados) && lead.servicosRecomendados.length > 0) {
    rawServices = lead.servicosRecomendados;
  } else if (Array.isArray(lead.diagnosticoPROSFEC?.servicosRecomendados) && lead.diagnosticoPROSFEC.servicosRecomendados.length > 0) {
    rawServices = lead.diagnosticoPROSFEC.servicosRecomendados;
  }

  const parsedServices = augmentServiceItemsWithCommission(rawServices, lead, allPartners, currentPartnerContext);

  let valorTotalServicos = 0;
  let valorTotalComissao = 0;
  let valorConsultorTotal = 0;
  let valorMasterTotal = 0;

  let valorServicosPagos = 0;
  let valorComissaoPaga = 0;
  let valorPagoConsultor = 0;
  let valorPagoMaster = 0;

  let valorServicosPendentes = 0;
  let valorComissaoPendente = 0;
  let valorPendenteConsultor = 0;
  let valorPendenteMaster = 0;

  let valorComissaoLiberadaSaque = 0;
  let valorLiberadoConsultor = 0;
  let valorLiberadoMaster = 0;
  let valorAguardandoCompensacao = 0;

  parsedServices.forEach(s => {
    if (s.statusPagamento === "cancelado") return;

    valorTotalServicos += s.preco;
    valorConsultorTotal += s.comissaoConsultor;
    valorMasterTotal += s.comissaoMaster;
    valorTotalComissao += (s.comissaoConsultor + s.comissaoMaster);

    if (s.statusPagamento === "pago") {
      valorServicosPagos += s.preco;
      valorPagoConsultor += s.comissaoConsultor;
      valorPagoMaster += s.comissaoMaster;
      valorComissaoPaga += (s.comissaoConsultor + s.comissaoMaster);

      if (s.isLiquidated) {
        valorLiberadoConsultor += s.comissaoConsultor;
        valorLiberadoMaster += s.comissaoMaster;
        valorComissaoLiberadaSaque += (s.comissaoConsultor + s.comissaoMaster);
      } else {
        valorAguardandoCompensacao += (s.comissaoConsultor + s.comissaoMaster);
      }
    } else {
      valorServicosPendentes += s.preco;
      valorPendenteConsultor += s.comissaoConsultor;
      valorPendenteMaster += s.comissaoMaster;
      valorComissaoPendente += (s.comissaoConsultor + s.comissaoMaster);
    }
  });

  const consultantPlanNorm = normalizePartnerPlan(consultantPlan);
  const masterPlanNorm = hierarchy.hasHierarchy ? normalizePartnerPlan(masterPlan) : null;

  const sampleCalc = calculateMultilevelCommission(1000, {
    consultantPlan,
    hasMasterParent: hierarchy.hasHierarchy,
    masterPlan,
    isDirectMaster: hierarchy.isDirectMaster
  });

  return {
    taxaConsultor: sampleCalc.consultantRate,
    taxaMaster: sampleCalc.masterOverrideRate,
    taxaTotal: sampleCalc.totalCommissionRate,

    valorTotalServicos,
    valorTotalComissao,
    valorConsultorTotal,
    valorMasterTotal,

    valorServicosPagos,
    valorComissaoPaga,
    valorPagoConsultor,
    valorPagoMaster,

    valorServicosPendentes,
    valorComissaoPendente,
    valorPendenteConsultor,
    valorPendenteMaster,

    valorComissaoLiberadaSaque,
    valorLiberadoConsultor,
    valorLiberadoMaster,
    valorAguardandoCompensacao,

    consultorId: hierarchy.consultor?.id || lead.parceiroId,
    consultorNome: hierarchy.consultor?.nome || lead.parceiroNome || "Consultor Parceiro",
    consultorPlano: hierarchy.consultor?.plano || consultantPlan,
    consultorPlanoNormalizado: consultantPlanNorm,

    masterId: hierarchy.master?.id || null,
    masterNome: hierarchy.master?.nome || null,
    masterPlano: hierarchy.master?.plano || null,
    masterPlanoNormalizado: masterPlanNorm,

    hasHierarchy: hierarchy.hasHierarchy,
    descricaoDivisao: sampleCalc.splitDescription,
    dataCalculo: new Date().toISOString()
  };
}

/**
 * Builds the exact Firestore update object for a lead with multilevel commission data
 */
export function buildLeadMultilevelFirestorePayload(
  lead: any,
  allPartners: any[] = [],
  currentPartnerContext?: any,
  customServices?: any[]
): {
  comissaoMultinivel: LeadMultilevelCommissionSummary;
  subEtapasPasso6: any[];
  servicosRecomendados?: any[];
  parentPartnerId?: string | null;
  parentPartnerNome?: string | null;
} {
  const baseLead = {
    ...lead,
    ...(customServices ? { subEtapasPasso6: customServices } : {})
  };

  const commissionSummary = calculateLeadMultilevelCommissions(baseLead, allPartners, currentPartnerContext);
  const servicesToAugment = customServices || baseLead.subEtapasPasso6 || baseLead.servicosRecomendados || [];
  const augmentedServices = augmentServiceItemsWithCommission(servicesToAugment, baseLead, allPartners, currentPartnerContext);

  const payload: any = {
    comissaoMultinivel: commissionSummary,
    subEtapasPasso6: augmentedServices
  };

  if (commissionSummary.masterId) {
    payload.parentPartnerId = commissionSummary.masterId;
    payload.parentPartnerNome = commissionSummary.masterNome;
  }

  return payload;
}
