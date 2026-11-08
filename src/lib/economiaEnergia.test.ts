import { describe, it, expect } from "vitest";
import { calcularEconomia } from "./economiaEnergia";

describe("economia em R$ do Raio-X", () => {
  it("MG comercial usa R$ 1,05/kWh e 25% da CEMIG-D", () => {
    const e = calcularEconomia(1000, 2000, "MG");
    expect(e.tarifa).toBe(1.05);
    expect(e.descontoGD).toEqual({ min: 25, max: 25 });
    expect(e.fatura).toEqual({ min: 1050, max: 2100 });
    expect(e.gdMensal).toEqual({ min: 260, max: 530 });
  });

  it("indústria (>=10.000 kWh) usa tarifa de alta tensão", () => {
    const e = calcularEconomia(25000, 50000, "MG");
    expect(e.grupoA).toBe(true);
    expect(e.fatura).toEqual({ min: 19500, max: 39000 });
  });

  it("AlugSol: 10% a 30% na locação e 95% pós-contrato", () => {
    const e = calcularEconomia(1000, 2000, "SP");
    expect(e.alugLocacaoMensal).toEqual({ min: 100, max: 570 });
    expect(e.alugPosMensal).toBe(1810);
    expect(e.alugPosAnual).toBe(21700);
  });

  it("estado sem concessionária usa média Brasil e GD 15% a 25%", () => {
    const e = calcularEconomia(1000, 1000, "TO");
    expect(e.tarifa).toBe(0.98);
    expect(e.descontoGD).toEqual({ min: 15, max: 25 });
  });
});
