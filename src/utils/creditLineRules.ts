import { formatCurrencyBRL } from "../utils";
import { BankRulesManager } from "./BankRulesManager";

export interface GovernmentCreditLineRule {
  code: string;
  name: string;
  badge: string;
  minValor: number;
  maxValor: number;
  minCarencia: number; // months
  maxCarencia: number; // months
  minPrazoAmortizacao: number; // months
  maxPrazoAmortizacao: number; // months
  minTaxaAnual: number; // % a.a.
  maxTaxaAnual: number; // % a.a.
  defaultTaxaAnual: number;
  defaultCarencia: number;
  defaultPrazoAmortizacao: number;
  defaultSistema: "SAC" | "PRICE";
  allowedSistemas: ("SAC" | "PRICE")[];
  description: string;
  regraGeral: string;
}

export const GOVERNMENT_CREDIT_LINES: Record<string, GovernmentCreditLineRule> = {
  PRONAMPE: {
    code: "PRONAMPE",
    name: "PRONAMPE (Programa Nacional de Apoio às Microempresas e EPPs)",
    badge: "Selic + até 6% a.a. (FGO + Aval)",
    minValor: 10000,
    maxValor: 500000,
    minCarencia: 0,
    maxCarencia: 24,
    minPrazoAmortizacao: 12,
    maxPrazoAmortizacao: 72,
    minTaxaAnual: 10.0,
    maxTaxaAnual: 20.0,
    defaultTaxaAnual: 16.5,
    defaultCarencia: 24,
    defaultPrazoAmortizacao: 72,
    defaultSistema: "SAC",
    allowedSistemas: ["SAC", "PRICE"],
    description: "Financiamento para capital de giro e investimento respaldado pelo FGO e aval dos sócios para MEIs, MEs e EPPs.",
    regraGeral: "Carência de até 24 meses. Amortização de até 72 parcelas mensais após a carência (prazo total da operação até 96 meses). Limite de até 30% da receita bruta anual (ou 50% do cap. social/12x média para <12m). Taxa Selic + até 6% a.a."
  },
  FAMPE: {
    code: "FAMPE",
    name: "FAMPE - Fundo de Aval Sebrae (Crédito Orientado)",
    badge: "Aval Sebrae (Até 80%)",
    minValor: 5000,
    maxValor: 300000,
    minCarencia: 0,
    maxCarencia: 12,
    minPrazoAmortizacao: 12,
    maxPrazoAmortizacao: 36,
    minTaxaAnual: 10.0,
    maxTaxaAnual: 18.0,
    defaultTaxaAnual: 14.5,
    defaultCarencia: 12,
    defaultPrazoAmortizacao: 36,
    defaultSistema: "SAC",
    allowedSistemas: ["SAC", "PRICE"],
    description: "Garantia de aval complementar do Sebrae para MEIs, MEs e pequenas empresas sem exigência de garantias reais.",
    regraGeral: "Aval Sebrae cobrindo até 80% do crédito. Carência de até 12 meses e amortização em até 36 meses (48 meses totais)."
  },
  FGI_PEAC: {
    code: "FGI_PEAC",
    name: "FGI PEAC (Programa Emergencial de Acesso a Crédito - BNDES)",
    badge: "Garantia BNDES até 80%",
    minValor: 50000,
    maxValor: 10000000,
    minCarencia: 0,
    maxCarencia: 24,
    minPrazoAmortizacao: 12,
    maxPrazoAmortizacao: 60,
    minTaxaAnual: 10.0,
    maxTaxaAnual: 22.0,
    defaultTaxaAnual: 17.5,
    defaultCarencia: 24,
    defaultPrazoAmortizacao: 60,
    defaultSistema: "SAC",
    allowedSistemas: ["SAC", "PRICE"],
    description: "Operação com garantia do Fundo Garantidor de Investimentos (FGI/BNDES) para médias e grandes empresas.",
    regraGeral: "Carência de até 24 meses. Amortização de 12 a 60 meses. Cobertura de até 80% do saldo devedor pelo BNDES."
  },
  FUNGETUR: {
    code: "FUNGETUR",
    name: "FUNGETUR (Fundo Geral de Turismo - CADASTUR / MTur)",
    badge: "Taxa Preferencial Turismo",
    minValor: 20000,
    maxValor: 15000000,
    minCarencia: 0,
    maxCarencia: 36,
    minPrazoAmortizacao: 12,
    maxPrazoAmortizacao: 84,
    minTaxaAnual: 5.0,
    maxTaxaAnual: 16.0,
    defaultTaxaAnual: 13.5,
    defaultCarencia: 24,
    defaultPrazoAmortizacao: 60,
    defaultSistema: "SAC",
    allowedSistemas: ["SAC", "PRICE"],
    description: "Crédito governamental incentivado exclusivo para empreendimentos do setor de turismo cadastrados no CADASTUR.",
    regraGeral: "Carência de até 36 meses para investimentos/obras (ou 12m giro). Amortização de até 84 meses (prazo total até 120m)."
  },
  FINEP_INOV: {
    code: "FINEP_INOV",
    name: "FINEP Inovacred (Fomento à Inovação e Tecnologia)",
    badge: "Taxas Subvencionadas",
    minValor: 50000,
    maxValor: 10000000,
    minCarencia: 0,
    maxCarencia: 36,
    minPrazoAmortizacao: 12,
    maxPrazoAmortizacao: 84,
    minTaxaAnual: 5.0,
    maxTaxaAnual: 14.0,
    defaultTaxaAnual: 9.5,
    defaultCarencia: 36,
    defaultPrazoAmortizacao: 72,
    defaultSistema: "SAC",
    allowedSistemas: ["SAC", "PRICE"],
    description: "Financiamento de inovação tecnológica, softwares, P&D e transformação digital com apoio público FINEP.",
    regraGeral: "Carência estendida de até 36 meses. Amortização de 12 a 84 meses. Taxas subsidiadas incentivadas."
  },
  BNDES_PEQ: {
    code: "BNDES_PEQ",
    name: "BNDES Pequenas Empresas (Crédito MPME)",
    badge: "Repasse BNDES MPME",
    minValor: 30000,
    maxValor: 5000000,
    minCarencia: 0,
    maxCarencia: 24,
    minPrazoAmortizacao: 12,
    maxPrazoAmortizacao: 60,
    minTaxaAnual: 8.0,
    maxTaxaAnual: 18.0,
    defaultTaxaAnual: 14.5,
    defaultCarencia: 24,
    defaultPrazoAmortizacao: 60,
    defaultSistema: "SAC",
    allowedSistemas: ["SAC", "PRICE"],
    description: "Linha direta e indireta BNDES para capital de giro e investimentos produtivos em MEs e EPPs.",
    regraGeral: "Carência de até 24 meses. Amortização de 12 a 60 meses. Taxa composta por TLP/TFB + sobretaxa bancária."
  },
  FNE_FNO_FCO: {
    code: "FNE_FNO_FCO",
    name: "Fundos Constitucionais de Financiamento (FNE / FNO / FCO)",
    badge: "Incentivo Regional Constitucional",
    minValor: 30000,
    maxValor: 10000000,
    minCarencia: 0,
    maxCarencia: 36,
    minPrazoAmortizacao: 12,
    maxPrazoAmortizacao: 108,
    minTaxaAnual: 6.0,
    maxTaxaAnual: 15.0,
    defaultTaxaAnual: 12.8,
    defaultCarencia: 24,
    defaultPrazoAmortizacao: 96,
    defaultSistema: "SAC",
    allowedSistemas: ["SAC", "PRICE"],
    description: "Crédito regional subsidiado com recursos constitucionais para empresas no Nordeste, Norte e Centro-Oeste.",
    regraGeral: "Carência de até 36 meses. Amortização de até 108 meses. Taxas de juros subsidiadas com bônus de adimplência."
  }
};

export interface BankCreditCustomization {
  bancoNormalizado: string;
  categoria: "estatal" | "privado" | "cooperativa" | "fintech" | "outros";
  carenciaPadrao: number;
  carenciaMaxima: number;
  prazoTotalPadrao: number;
  prazoTotalMaximo: number;
  taxaAnualEstimada: number;
  destaqueEsteira: string;
  modalidadeAprovacao: string;
}

export function getBankSpecificRules(bancoInput: string, creditLineCode: string = "PRONAMPE"): BankCreditCustomization {
  return BankRulesManager.getBankRules(bancoInput, creditLineCode);
}

export interface CreditLineValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCreditLineConditions(
  lineCode: string,
  valor: number,
  carencia: number,
  prazoAmortizacao: number,
  taxaAnual: number,
  sistemaAmortizacao: "SAC" | "PRICE"
): CreditLineValidationResult {
  const rule = GOVERNMENT_CREDIT_LINES[lineCode] || GOVERNMENT_CREDIT_LINES.PRONAMPE;
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Carência Validation
  if (isNaN(carencia) || carencia < rule.minCarencia) {
    errors.push(`A carência não pode ser inferior a ${rule.minCarencia} meses para a linha ${rule.code}.`);
  } else if (carencia > rule.maxCarencia) {
    errors.push(`A carência máxima permitida para a linha ${rule.code} é de ${rule.maxCarencia} meses (informado: ${carencia} meses).`);
  }

  // 2. Amortização Validation
  if (isNaN(prazoAmortizacao) || prazoAmortizacao < rule.minPrazoAmortizacao) {
    errors.push(`O prazo de amortização não pode ser inferior a ${rule.minPrazoAmortizacao} meses para a linha ${rule.code}.`);
  } else if (prazoAmortizacao > rule.maxPrazoAmortizacao) {
    errors.push(`O prazo de amortização máximo permitido para a linha ${rule.code} é de ${rule.maxPrazoAmortizacao} meses (informado: ${prazoAmortizacao} meses).`);
  }

  // 3. Taxa Anual Validation
  if (isNaN(taxaAnual) || taxaAnual < rule.minTaxaAnual) {
    errors.push(`A taxa de juros anual (${isNaN(taxaAnual) ? 0 : taxaAnual.toFixed(1)}% a.a.) está abaixo do piso regulamentado de ${rule.minTaxaAnual.toFixed(1)}% a.a. para o ${rule.code}.`);
  } else if (taxaAnual > rule.maxTaxaAnual) {
    errors.push(`A taxa de juros anual (${taxaAnual.toFixed(1)}% a.a.) excede o teto regulamentado de ${rule.maxTaxaAnual.toFixed(1)}% a.a. para o ${rule.code}.`);
  }

  // 4. Sistema Amortização Validation
  if (!rule.allowedSistemas.includes(sistemaAmortizacao)) {
    errors.push(`O sistema de amortização ${sistemaAmortizacao} não é aceito na linha ${rule.code}. Sistemas permitidos: ${rule.allowedSistemas.join(", ")}.`);
  }

  // 5. Value Warnings
  if (valor < rule.minValor) {
    warnings.push(`O valor digitado (${formatCurrencyBRL(valor)}) é inferior ao valor mínimo recomendado (${formatCurrencyBRL(rule.minValor)}) para a linha ${rule.code}.`);
  } else if (valor > rule.maxValor) {
    warnings.push(`O valor solicitado (${formatCurrencyBRL(valor)}) ultrapassa o limite padrão de ${formatCurrencyBRL(rule.maxValor)} para a linha ${rule.code}. Requer avaliação de garantias reais.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
