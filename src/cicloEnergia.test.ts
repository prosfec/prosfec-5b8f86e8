import { describe, it, expect } from "vitest";
import { cicloComissaoEnergia, diasAteProximoDia } from "./utils";

const hoje = new Date(2026, 9, 21); // 21/out

describe("ciclo de comissões solares", () => {
  it("contrato fechado até dia 10 entra no ciclo vigente", () => {
    expect(cicloComissaoEnergia({ fechadoEm: new Date(2026, 9, 10, 22).toISOString() }, hoje)).toBe("vigente");
  });
  it("contrato fechado no dia 11 vai para comissões futuras", () => {
    expect(cicloComissaoEnergia({ fechadoEm: new Date(2026, 9, 11, 9).toISOString() }, hoje)).toBe("futuro");
  });
  it("saque já solicitado fica no ciclo vigente", () => {
    expect(cicloComissaoEnergia({ comissaoStatus: "solicitada", fechadoEm: new Date(2026, 9, 15).toISOString() }, hoje)).toBe("vigente");
  });
  it("conta dias até o próximo dia 10 após o fechamento", () => {
    expect(diasAteProximoDia(10, new Date(2026, 9, 26))).toBe(15);
  });
});
