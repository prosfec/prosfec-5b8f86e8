// @ts-nocheck
/**
 * Motor determinístico de elegibilidade do simulador PROSFEC.
 *
 * Camadas (nesta ordem):
 *  [1] ELEGIBILIDADE DETERMINÍSTICA  -> porte, faturamento, região, setor, linha ativa
 *  [2] REGRAS DA INSTITUIÇÃO         -> opera a linha? condição cadastrada? prazos/taxa
 *  [3] IA (fora deste arquivo)       -> apenas texto e priorização entre as linhas liberadas
 *
 * A IA NÃO define limite, taxa, carência nem prazo. Todos os números vêm daqui.
 * Fontes de verdade: GOVERNMENT_CREDIT_LINES (programa) + BankRulesManager (instituição).
 * Proveniência de cada número: src/utils/creditRuleSources.ts
 */
import { GOVERNMENT_CREDIT_LINES } from "./creditLineRules";
import { BankRulesManager } from "./BankRulesManager";

export type GrauAderencia =
  | "ALTA_ADERENCIA"
  | "ADERENCIA_CONDICIONADA"
  | "NECESSITA_DIAGNOSTICO"
  | "BAIXA_ADERENCIA";

export const ADERENCIA_LABEL: Record<GrauAderencia, string> = {
  ALTA_ADERENCIA: "ALTA ADERÊNCIA",
  ADERENCIA_CONDICIONADA: "ADERÊNCIA CONDICIONADA",
  NECESSITA_DIAGNOSTICO: "NECESSITA DIAGNÓSTICO",
  BAIXA_ADERENCIA: "BAIXA ADERÊNCIA"
};

/**
 * Regras de limite POR PROGRAMA. Cada programa mantém a sua própria regra —
 * nada é uniformizado entre programas. Valores mantidos exatamente como
 * praticados hoje; qualquer alteração exige registro em creditRuleSources.ts.
 */
const LIMIT_RULES: Record<string, (ctx: EngineContext) => number> = {
  PRONAMPE: (c) =>
    Math.min(
      c.isNewCompany ? Math.max(c.valCapital * 0.5, c.valFaturamento * 0.3) : c.valFaturamento * 0.3,
      500000
    ),
  FAMPE: (c) => Math.min(Math.max(c.receitaEfetiva * 0.6, 12500), 50000),
  FUNGETUR: (c) => Math.min(c.receitaEfetiva * 0.45, 1500000),
  FINEP_INOV: (c) => Math.min(c.receitaEfetiva * 0.4, 3000000),
  FNE_FNO_FCO: (c) => Math.min(c.receitaEfetiva * 0.4, 3000000),
  FGI_PEAC: (c) => Math.min(c.receitaEfetiva * 0.25, 10000000),
  BNDES_PEQ: (c) => Math.min(c.receitaEfetiva * 0.3, 5000000),
  LINHA_BANCARIA_CORP: (c) => Math.min(c.receitaEfetiva * 0.2, 50000000)
};

/** Linha corporativa não governamental — não consta no catálogo de programas. */
const CORP_LINE = {
  code: "LINHA_BANCARIA_CORP",
  name: "Crédito Corporativo Estruturado (BNDES Finem / Consórcio Bancário)",
  defaultTaxaAnual: 15.5,
  defaultCarencia: 36,
  maxCarencia: 36,
  prazoTotal: 144,
  description: "Crédito corporativo estruturado para empresas de grande porte."
};

export interface EngineInput {
  cnpj?: string;
  razaoSocial?: string;
  porte?: string;
  uf?: string;
  ramo?: string;
  isNewCompany?: boolean;
  valCapital?: number;
  valMediaReceita?: number;
  valFaturamento?: number;
  seloEmpregaMulher?: boolean;
  bancoPrincipal?: string;
  possuiLinhaCreditoGovernamentalAtiva?: boolean;
  linhaCreditoGovernamentalQual?: string;
}

interface EngineContext extends EngineInput {
  receitaEfetiva: number;
  cleanPorte: string;
  isTurismo: boolean;
  isInovacao: boolean;
  isRegiaoIncentivada: boolean;
  valCapital: number;
  valFaturamento: number;
  valMediaReceita: number;
  isNewCompany: boolean;
}

export interface LinhaAvaliada {
  code: string;
  name: string;
  elegivel: boolean;
  motivos: string[];
  condicionantes: string[];
  limite: number;
  taxaAnual: number;
  carencia: number;
  prazoTotal: number;
  operaNoBanco: boolean | null;
  condicaoBancariaConfirmada: boolean;
  prioridade: number;
}

export interface EngineResult {
  linhas: LinhaAvaliada[];
  linhasLiberadas: LinhaAvaliada[];
  escolhida: LinhaAvaliada;
  aderencia: GrauAderencia;
  aderenciaLabel: string;
  aderenciaMotivos: string[];
  dadosInsuficientes: string[];
  bankRules: any;
  contexto: EngineContext;
}

const UFS_INCENTIVADAS = [
  "AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE",
  "AC", "AP", "AM", "PA", "RO", "RR", "TO",
  "DF", "GO", "MT", "MS"
];

function buildContext(input: EngineInput): EngineContext {
  const valFaturamento = Number(input.valFaturamento) || 0;
  const valCapital = Number(input.valCapital) || 0;
  const valMediaReceita = Number(input.valMediaReceita) || 0;
  const isNewCompany = !!input.isNewCompany;
  const receitaEfetiva = isNewCompany ? valMediaReceita * 12 : valFaturamento;
  const ramo = String(input.ramo || "").toLowerCase();

  return {
    ...input,
    valFaturamento,
    valCapital,
    valMediaReceita,
    isNewCompany,
    receitaEfetiva,
    cleanPorte: String(input.porte || "ME").toUpperCase(),
    isTurismo: ["turismo", "hotel", "pousada", "restaurante", "bar", "evento", "viagem"].some(k => ramo.includes(k)),
    isInovacao: ["tecnologia", "software", "ti", "inovacao", "inovação", "startup", "desenvolvimento"].some(k => ramo.includes(k)),
    isRegiaoIncentivada: UFS_INCENTIVADAS.includes(String(input.uf || "").toUpperCase())
  };
}

/** Camada 1: elegibilidade determinística por programa. */
function avaliarElegibilidade(c: EngineContext): Array<Omit<LinhaAvaliada, "operaNoBanco" | "condicaoBancariaConfirmada" | "limite" | "taxaAnual" | "carencia" | "prazoTotal">> {
  const out: any[] = [];
  const isMEI = c.cleanPorte === "MEI" || c.receitaEfetiva <= 81000;
  const linhaAtiva = String(c.linhaCreditoGovernamentalQual || "").toUpperCase();

  const jaAtiva = (code: string) =>
    !!c.possuiLinhaCreditoGovernamentalAtiva && linhaAtiva.includes(code.replace("_", " ").split(" ")[0]);

  // PRONAMPE
  out.push({
    code: "PRONAMPE",
    name: GOVERNMENT_CREDIT_LINES.PRONAMPE.name,
    elegivel: c.receitaEfetiva > 0 && c.receitaEfetiva <= 4800000,
    motivos: c.receitaEfetiva > 4800000
      ? ["Receita bruta anual acima do teto de enquadramento como ME/EPP."]
      : ["Enquadramento por porte (MEI/ME/EPP) e receita bruta anual dentro do limite."],
    condicionantes: jaAtiva("PRONAMPE")
      ? ["Empresa declara linha PRONAMPE ativa — considerar apenas a margem remanescente do teto."]
      : [],
    prioridade: 50
  });

  // FAMPE
  out.push({
    code: "FAMPE",
    name: GOVERNMENT_CREDIT_LINES.FAMPE.name,
    elegivel: isMEI || c.receitaEfetiva <= 4800000,
    motivos: isMEI
      ? ["Perfil MEI / microempresa com aval complementar do Sebrae."]
      : ["Micro e pequena empresa elegível ao aval complementar do Sebrae."],
    condicionantes: ["Sujeito a disponibilidade de aval Sebrae e a convênio da instituição financeira."],
    prioridade: isMEI ? 95 : 40
  });

  // FUNGETUR
  out.push({
    code: "FUNGETUR",
    name: GOVERNMENT_CREDIT_LINES.FUNGETUR.name,
    elegivel: c.isTurismo && c.receitaEfetiva > 30000,
    motivos: c.isTurismo
      ? ["Atividade enquadrada no setor de turismo/hospitalidade."]
      : ["Atividade informada não pertence ao setor de turismo."],
    condicionantes: ["Exige cadastro ativo no CADASTUR (Ministério do Turismo)."],
    prioridade: 90
  });

  // FINEP
  out.push({
    code: "FINEP_INOV",
    name: GOVERNMENT_CREDIT_LINES.FINEP_INOV.name,
    elegivel: c.isInovacao && c.receitaEfetiva > 50000,
    motivos: c.isInovacao
      ? ["Atividade enquadrada em tecnologia/inovação."]
      : ["Atividade informada não caracteriza projeto de inovação tecnológica."],
    condicionantes: ["Exige enquadramento do projeto como inovação junto à FINEP."],
    prioridade: 88
  });

  // Fundos constitucionais
  out.push({
    code: "FNE_FNO_FCO",
    name: GOVERNMENT_CREDIT_LINES.FNE_FNO_FCO.name,
    elegivel: c.isRegiaoIncentivada && c.receitaEfetiva > 100000,
    motivos: c.isRegiaoIncentivada
      ? ["Empresa situada em região com fundo constitucional de financiamento."]
      : ["UF informada não pertence à área dos fundos constitucionais (Nordeste, Norte ou Centro-Oeste)."],
    condicionantes: ["Aplicação do recurso deve ocorrer na própria região de abrangência do fundo."],
    prioridade: 85
  });

  // FGI PEAC
  out.push({
    code: "FGI_PEAC",
    name: GOVERNMENT_CREDIT_LINES.FGI_PEAC.name,
    elegivel: c.receitaEfetiva > 360000,
    motivos: ["Porte compatível com operação garantida pelo FGI/BNDES."],
    condicionantes: ["Sujeito a disponibilidade de cobertura do fundo garantidor."],
    prioridade: c.receitaEfetiva > 4800000 ? 92 : 30
  });

  // BNDES MPME
  out.push({
    code: "BNDES_PEQ",
    name: GOVERNMENT_CREDIT_LINES.BNDES_PEQ.name,
    elegivel: c.receitaEfetiva > 200000,
    motivos: ["MPME elegível a repasse BNDES via agente financeiro credenciado."],
    condicionantes: ["Depende de credenciamento do agente financeiro junto ao BNDES."],
    prioridade: 25
  });

  // Corporativo
  out.push({
    code: CORP_LINE.code,
    name: CORP_LINE.name,
    elegivel: c.receitaEfetiva > 300000000 || ["EGP", "GRANDE"].includes(c.cleanPorte),
    motivos: ["Perfil corporativo de grande porte."],
    condicionantes: ["Condições negociadas caso a caso com a instituição financeira."],
    prioridade: 99
  });

  return out;
}

function baseConditions(code: string) {
  if (code === CORP_LINE.code) {
    return {
      taxa: CORP_LINE.defaultTaxaAnual,
      carencia: CORP_LINE.defaultCarencia,
      carenciaMax: CORP_LINE.maxCarencia,
      prazoTotal: CORP_LINE.prazoTotal,
      prazoTotalMax: CORP_LINE.prazoTotal
    };
  }
  const rule = GOVERNMENT_CREDIT_LINES[code];
  if (!rule) {
    return { taxa: 16.5, carencia: 12, carenciaMax: 24, prazoTotal: 48, prazoTotalMax: 84 };
  }
  const prazoTotalMax = rule.maxCarencia + rule.maxPrazoAmortizacao;
  return {
    taxa: rule.defaultTaxaAnual,
    carencia: rule.defaultCarencia,
    carenciaMax: rule.maxCarencia,
    prazoTotal: prazoTotalMax,
    prazoTotalMax
  };
}

export function runCreditEngine(input: EngineInput): EngineResult {
  const c = buildContext(input);
  const avaliadas = avaliarElegibilidade(c);

  const dadosInsuficientes: string[] = [];
  if (c.receitaEfetiva <= 0) dadosInsuficientes.push("Faturamento anual (ou média mensal) não informado.");
  if (c.isNewCompany && c.valCapital <= 0 && c.valMediaReceita <= 0) {
    dadosInsuficientes.push("Empresa com menos de 12 meses sem capital social nem média de receita informados.");
  }
  if (!String(c.bancoPrincipal || "").trim()) dadosInsuficientes.push("Banco de relacionamento não informado.");
  if (!String(c.ramo || "").trim()) dadosInsuficientes.push("Ramo de atuação não informado.");

  // Camada 2: instituição financeira
  const linhas: LinhaAvaliada[] = avaliadas.map((l) => {
    const bank = BankRulesManager.getBankRules(c.bancoPrincipal || "", l.code);
    const base = baseConditions(l.code);

    const operaNoBanco = bank.bancoCadastrado ? !!bank.operaLinha : null;
    const condicaoConfirmada = !!bank.condicaoConfirmada;

    // Sem condição confirmada do banco -> usa o padrão DO PRÓPRIO PROGRAMA.
    // Nunca herda condições de outra linha.
    const carencia = condicaoConfirmada
      ? Math.min(bank.carenciaPadrao, base.carenciaMax)
      : base.carencia;
    const prazoTotal = condicaoConfirmada
      ? Math.min(bank.prazoTotalPadrao, base.prazoTotalMax)
      : base.prazoTotal;
    const taxaAnual = condicaoConfirmada ? bank.taxaAnualEstimada : base.taxa;

    const limitFn = LIMIT_RULES[l.code];
    let limite = limitFn ? limitFn(c) : 0;
    if (limite > 0 && limite < 25000) limite = 30000;
    limite = Math.round(limite);

    const condicionantes = [...l.condicionantes];
    if (operaNoBanco === false) {
      condicionantes.push(`${bank.bancoNormalizado} não consta como operador desta linha — operação pode exigir outra instituição.`);
    } else if (!condicaoConfirmada) {
      condicionantes.push("Condições específicas desta instituição para esta linha não estão confirmadas; aplicados os parâmetros oficiais do programa.");
    }

    return {
      ...l,
      limite,
      taxaAnual,
      carencia,
      prazoTotal,
      operaNoBanco,
      condicaoBancariaConfirmada: condicaoConfirmada,
      condicionantes
    };
  });

  const liberadas = linhas
    .filter(l => l.elegivel && l.limite > 0)
    .sort((a, b) => {
      // Linha efetivamente operada pelo banco tem preferência, depois prioridade.
      const aOpera = a.operaNoBanco === true ? 1 : 0;
      const bOpera = b.operaNoBanco === true ? 1 : 0;
      if (aOpera !== bOpera) return bOpera - aOpera;
      return b.prioridade - a.prioridade;
    });

  const escolhida = liberadas[0] || linhas.find(l => l.code === "PRONAMPE")!;

  // Classificação de aderência
  const aderenciaMotivos: string[] = [];
  let aderencia: GrauAderencia;

  if (dadosInsuficientes.length >= 2 || c.receitaEfetiva <= 0) {
    aderencia = "NECESSITA_DIAGNOSTICO";
    aderenciaMotivos.push(...dadosInsuficientes);
  } else if (!liberadas.length) {
    aderencia = "BAIXA_ADERENCIA";
    aderenciaMotivos.push("Os dados informados não confirmam enquadramento nas linhas disponíveis.");
  } else if (escolhida.condicaoBancariaConfirmada && escolhida.operaNoBanco === true && !dadosInsuficientes.length) {
    aderencia = "ALTA_ADERENCIA";
    aderenciaMotivos.push("Elegibilidade confirmada pelos dados e instituição com condição cadastrada para a linha.");
  } else {
    aderencia = "ADERENCIA_CONDICIONADA";
    aderenciaMotivos.push(...escolhida.condicionantes);
    aderenciaMotivos.push(...dadosInsuficientes);
  }

  const bankRules = BankRulesManager.getBankRules(c.bancoPrincipal || "", escolhida.code);

  return {
    linhas,
    linhasLiberadas: liberadas,
    escolhida,
    aderencia,
    aderenciaLabel: ADERENCIA_LABEL[aderencia],
    aderenciaMotivos: aderenciaMotivos.filter(Boolean),
    dadosInsuficientes,
    bankRules,
    contexto: c
  };
}

/** Parcela PRICE mensal. */
export function calcularParcela(valor: number, taxaAnual: number, meses: number): number {
  const r = (taxaAnual / 12) / 100;
  if (!meses || meses <= 0) return 0;
  if (r <= 0) return valor / meses;
  return (valor * r * Math.pow(1 + r, meses)) / (Math.pow(1 + r, meses) - 1);
}

/**
 * Comparativo de mercado SUSPENSO.
 * Não existe benchmark vigente. Um benchmark futuro só pode ser reintroduzido com:
 * fonte identificável, URL, data de verificação, metodologia de cálculo e escopo da amostra.
 * Até lá, nenhuma taxa de mercado é calculada ou exibida.
 */

