/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cálculo da tabela de amortização (SAC/PRICE) usado na leitura pública da proposta.
 * Mantém a mesma lógica aplicada no Passo 6 do workspace do parceiro.
 */

export interface AmortizationRow {
  mes: number;
  tipo: "Carência" | "Amortização";
  saldoInicial: number;
  amortizacao: number;
  juros: number;
  parcela: number;
  saldoFinal: number;
}

export interface AmortizationParams {
  valor: number;
  taxaAnual: number;
  carenciaMeses: number;
  amortizacaoMeses: number;
  sistema: "SAC" | "PRICE";
  pagarJurosCarencia?: boolean;
}

export interface AmortizationSchedule {
  rows: AmortizationRow[];
  totalJuros: number;
  totalPago: number;
  parcelaInicial: number;
  parcelaFinal: number;
}

export function calculateAmortizationSchedule(params: AmortizationParams): AmortizationSchedule {
  const valor = Number(params.valor) || 0;
  const r_m = (Number(params.taxaAnual) || 0) / 100 / 12;
  const C = Math.max(0, Math.floor(Number(params.carenciaMeses) || 0));
  const N = Math.max(1, Math.floor(Number(params.amortizacaoMeses) || 1));
  const sistema = params.sistema === "PRICE" ? "PRICE" : "SAC";

  const rows: AmortizationRow[] = [];
  let currentBalance = valor;
  let accumulatedUncapitalizedInterest = 0;

  for (let t = 1; t <= C; t++) {
    const startBalance = currentBalance;
    const interest = startBalance * r_m;
    let payment = 0;
    if (params.pagarJurosCarencia) {
      payment = interest;
    } else {
      accumulatedUncapitalizedInterest += interest;
    }
    rows.push({
      mes: t,
      tipo: "Carência",
      saldoInicial: startBalance,
      amortizacao: 0,
      juros: interest,
      parcela: payment,
      saldoFinal: currentBalance,
    });
  }

  const balanceAfterGrace = currentBalance;
  const extraUncapitalized = accumulatedUncapitalizedInterest / N;

  if (sistema === "PRICE") {
    const pmtBase =
      r_m > 0
        ? (balanceAfterGrace * (r_m * Math.pow(1 + r_m, N))) / (Math.pow(1 + r_m, N) - 1)
        : balanceAfterGrace / N;

    for (let k = 1; k <= N; k++) {
      const startBalance = currentBalance;
      const interest = startBalance * r_m;
      let amortization = pmtBase - interest;
      if (amortization > startBalance) amortization = startBalance;
      const payment = pmtBase + extraUncapitalized;
      currentBalance = startBalance - amortization;
      rows.push({
        mes: C + k,
        tipo: "Amortização",
        saldoInicial: startBalance,
        amortizacao: amortization,
        juros: interest + extraUncapitalized,
        parcela: payment,
        saldoFinal: Math.max(0, currentBalance),
      });
    }
  } else {
    const sacAmortization = balanceAfterGrace / N;
    for (let k = 1; k <= N; k++) {
      const startBalance = currentBalance;
      const interest = startBalance * r_m;
      let amortization = sacAmortization;
      if (amortization > startBalance) amortization = startBalance;
      const payment = amortization + interest + extraUncapitalized;
      currentBalance = startBalance - amortization;
      rows.push({
        mes: C + k,
        tipo: "Amortização",
        saldoInicial: startBalance,
        amortizacao: amortization,
        juros: interest + extraUncapitalized,
        parcela: payment,
        saldoFinal: Math.max(0, currentBalance),
      });
    }
  }

  const totalJuros = rows.reduce((acc, row) => acc + row.juros, 0);
  const totalPago = rows.reduce((acc, row) => acc + row.parcela, 0);
  const amortRows = rows.filter((r) => r.tipo === "Amortização");

  return {
    rows,
    totalJuros,
    totalPago,
    parcelaInicial: amortRows.length ? amortRows[0].parcela : 0,
    parcelaFinal: amortRows.length ? amortRows[amortRows.length - 1].parcela : 0,
  };
}
