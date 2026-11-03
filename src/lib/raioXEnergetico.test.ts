import { describe, it, expect } from "vitest";
import { calcularRaioXEnergetico, resumirHorario } from "./raioXEnergetico";

describe("Raio-X Energético", () => {
  it("padaria fica na faixa Alto (2.500 a 5.000 kWh)", () => {
    const r = calcularRaioXEnergetico({ categoria: "Padaria", avaliacoes: 150 });
    expect(r.faixa).toBe("alto");
    expect(r.kwhMin).toBeGreaterThanOrEqual(2500);
    expect(r.kwhMax).toBeLessThanOrEqual(5000);
  });
  it("supermercado fica na faixa Crítico", () => {
    expect(calcularRaioXEnergetico({ primaryType: "supermarket" }).faixa).toBe("critico");
  });
  it("escritório fica na faixa Leve (300 a 800 kWh)", () => {
    const r = calcularRaioXEnergetico({ categoria: "Escritório de contabilidade", avaliacoes: 5 });
    expect(r.faixa).toBe("leve");
    expect(r.kwhMin).toBeGreaterThanOrEqual(300);
    expect(r.kwhMax).toBeLessThanOrEqual(800);
  });
  it("horário de seg a sex 8h-18h soma 50h em 5 dias", () => {
    const periods = [1,2,3,4,5].map((d) => ({ open: { day: d, hour: 8, minute: 0 }, close: { day: d, hour: 18, minute: 0 } }));
    expect(resumirHorario(periods)).toEqual({ horasSemanais: 50, diasSemana: 5, aberto24h: false });
  });
  it("período único sem fechamento = 24h", () => {
    expect(resumirHorario([{ open: { day: 0, hour: 0 } }]).aberto24h).toBe(true);
  });
});
