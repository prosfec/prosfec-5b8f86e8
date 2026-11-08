// Conversão da estimativa de kWh do Raio-X em valores (R$) e economia por solução.
// Regras de negócio em mem://features/raio-x-energetico.md.
import { resumoConcessionariaUF } from "./concessionariaRegiao";

/** Tarifa média com tributos (R$/kWh): comercial (BT/Grupo B) e indústria (MT/Grupo A). */
export const TARIFAS_UF: Record<string, { comercial: number; industrial: number; rotulo: string }> = {
  MG: { comercial: 1.05, industrial: 0.78, rotulo: "CEMIG · MG" },
  RJ: { comercial: 1.12, industrial: 0.82, rotulo: "Light / Enel · RJ" },
  SP: { comercial: 0.95, industrial: 0.72, rotulo: "CPFL / Enel / EDP · SP" },
  CE: { comercial: 1.02, industrial: 0.76, rotulo: "Enel · CE" },
  PR: { comercial: 0.88, industrial: 0.68, rotulo: "Copel · PR" },
  SC: { comercial: 0.86, industrial: 0.66, rotulo: "Celesc · SC" },
};
export const TARIFA_PADRAO = { comercial: 0.98, industrial: 0.74, rotulo: "Média Brasil" };

export interface Faixa { min: number; max: number }
export interface EconomiaEnergia {
  regiao: string;
  tarifa: number;
  grupoA: boolean;
  descontoGD: Faixa; // em %
  descontoOficial: boolean;
  fatura: Faixa;
  gdMensal: Faixa;
  gdAnual: Faixa;
  alugLocacaoMensal: Faixa;
  alugLocacaoAnual: Faixa;
  alugPosMensal: number;
  alugPosAnual: number;
}

/** Arredonda para dezena abaixo de R$ 10 mil e para centena a partir disso. */
export const arredondarReais = (v: number) => (v >= 10000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10);

export function calcularEconomia(kwhMin: number, kwhMax: number, uf?: string | null): EconomiaEnergia {
  const u = String(uf || "").trim().toUpperCase();
  const t = TARIFAS_UF[u] || TARIFA_PADRAO;
  const grupoA = kwhMin >= 10000;
  const tarifa = grupoA ? t.industrial : t.comercial;

  const conc = resumoConcessionariaUF(u);
  const descontoGD: Faixa = conc ? { min: conc.desconto, max: conc.desconto } : { min: 15, max: 25 };
  const regiao = conc?.unica ? `${conc.nome} · ${u}` : TARIFAS_UF[u] ? t.rotulo : u ? `${u} · média Brasil` : TARIFA_PADRAO.rotulo;

  const r = arredondarReais;
  const fMin = kwhMin * tarifa;
  const fMax = kwhMax * tarifa;
  const gdMin = fMin * (descontoGD.min / 100);
  const gdMax = fMax * (descontoGD.max / 100);
  const alMin = fMin * 0.1;
  const alMax = fMax * 0.3;
  const pos = fMax * 0.95;

  return {
    regiao,
    tarifa,
    grupoA,
    descontoGD,
    descontoOficial: !!conc,
    fatura: { min: r(fMin), max: r(fMax) },
    gdMensal: { min: r(gdMin), max: r(gdMax) },
    gdAnual: { min: r(gdMin * 12), max: r(gdMax * 12) },
    alugLocacaoMensal: { min: r(alMin), max: r(alMax) },
    alugLocacaoAnual: { min: r(alMin * 12), max: r(alMax * 12) },
    alugPosMensal: r(pos),
    alugPosAnual: r(pos * 12),
  };
}
