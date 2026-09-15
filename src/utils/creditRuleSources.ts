// @ts-nocheck
/**
 * Registro de proveniência das regras de crédito.
 *
 * REGRA DE OURO: nenhum número de programa (teto, percentual de faturamento,
 * carência, prazo, taxa) pode ser alterado sem que exista aqui um registro com
 * fonte oficial, URL, data da verificação, regra e vigência.
 *
 * Enquanto um item estiver como "PENDENTE_VALIDACAO", o sistema mantém o valor
 * hoje praticado e apenas sinaliza a divergência em log — nunca "corrige"
 * sozinho.
 */

export type StatusFonte = "CONFIRMADO" | "PENDENTE_VALIDACAO";

export interface RegistroFonteRegra {
  programa: string;
  regra: string;
  valorPraticado: string;
  status: StatusFonte;
  fonte?: string;
  url?: string;
  verificadoEm?: string; // ISO date
  vigencia?: string;
  observacao?: string;
}

export const CREDIT_RULE_SOURCES: RegistroFonteRegra[] = [
  {
    programa: "PRONAMPE",
    regra: "Limite de 30% da receita bruta anual, teto de R$ 500.000 por CNPJ; carência até 24m; amortização até 72m",
    valorPraticado: "30% / R$ 500.000 / 24m / 72m",
    status: "PENDENTE_VALIDACAO",
    observacao: "Confirmar teto por CNPJ, percentual, regra de empresa com menos de 12 meses e benefício do selo Emprega + Mulher na regulamentação vigente."
  },
  {
    programa: "FAMPE",
    regra: "Limite por porte (MEI / ME / EPP) e percentual aplicável; aval Sebrae até 80%; carência 12m; contrato 48m",
    valorPraticado: "MEI: 60% do faturamento entre R$ 12.500 e R$ 50.000",
    status: "PENDENTE_VALIDACAO",
    observacao: "Percentual de 60% herdado da implementação atual. Não uniformizar com o PRONAMPE sem fonte oficial."
  },
  {
    programa: "FGI_PEAC",
    regra: "Teto e cobertura de garantia; carência 24m; contrato 84m",
    valorPraticado: "25% do faturamento, teto R$ 10.000.000",
    status: "PENDENTE_VALIDACAO",
    observacao: "Confirmar vigência do programa e cobertura atual do FGI."
  },
  {
    programa: "FUNGETUR",
    regra: "Teto por operação",
    valorPraticado: "45% do faturamento, teto R$ 1.500.000 (rota) — catálogo indica R$ 15.000.000",
    status: "PENDENTE_VALIDACAO",
    observacao: "DIVERGÊNCIA CONHECIDA entre rota e catálogo. Mantido o valor praticado na rota até validação oficial."
  },
  {
    programa: "FINEP_INOV",
    regra: "Teto e faixa de taxa do Inovacred",
    valorPraticado: "40% do faturamento, teto R$ 3.000.000 (rota) — catálogo indica R$ 10.000.000",
    status: "PENDENTE_VALIDACAO",
    observacao: "DIVERGÊNCIA CONHECIDA entre rota e catálogo. Mantido o valor praticado na rota até validação oficial."
  },
  {
    programa: "FNE_FNO_FCO",
    regra: "Teto, carência e prazo por fundo e finalidade",
    valorPraticado: "40% do faturamento, teto R$ 3.000.000 (rota) — catálogo indica R$ 10.000.000",
    status: "PENDENTE_VALIDACAO",
    observacao: "DIVERGÊNCIA CONHECIDA entre rota e catálogo. Mantido o valor praticado na rota até validação oficial."
  },
  {
    programa: "BNDES_PEQ",
    regra: "Condições de repasse MPME",
    valorPraticado: "30% do faturamento, teto R$ 5.000.000",
    status: "PENDENTE_VALIDACAO"
  },
  {
    programa: "LINHA_BANCARIA_CORP",
    regra: "Crédito corporativo estruturado / BNDES Finem",
    valorPraticado: "20% do faturamento, teto R$ 50.000.000",
    status: "PENDENTE_VALIDACAO",
    observacao: "Linha não governamental; condições variam por instituição."
  },
  {
    programa: "BENCHMARK_MERCADO",
    regra: "Taxa de mercado usada no comparativo de economia",
    valorPraticado: "38% a.a.",
    status: "PENDENTE_VALIDACAO",
    observacao: "Apresentado explicitamente como ESTIMATIVA enquanto não houver benchmark com fonte e data."
  },
  {
    programa: "ProCred 360",
    regra: "Programa citado mas ainda não cadastrado no catálogo",
    valorPraticado: "n/a",
    status: "PENDENTE_VALIDACAO",
    observacao: "Só entra no catálogo com fonte oficial registrada."
  }
];

export function getRuleSource(programa: string): RegistroFonteRegra | undefined {
  return CREDIT_RULE_SOURCES.find(r => r.programa === programa);
}

export function isRuleConfirmed(programa: string): boolean {
  return getRuleSource(programa)?.status === "CONFIRMADO";
}
