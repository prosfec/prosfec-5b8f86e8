import { describe, expect, it } from "vitest";
import { criarControleConsultaCnpj } from "./cnpjConsultaLimite";

describe("limite de consultas de CNPJ", () => {
  it("libera uma consulta digitada imediatamente após a descoberta automática falhar", () => {
    const controle = criarControleConsultaCnpj();
    const assessor = "assessor-1";

    expect(controle.reservar(assessor, 0)).toBe(0);
    expect(controle.reservar(assessor, 5_000)).toBe(55);

    controle.liberarConsultaManual(assessor, 0);
    const liberada = controle.consumirLiberacaoManual(assessor, 5_000);

    expect(liberada).toBe(true);
    expect(controle.reservar(assessor, 5_000, liberada)).toBe(0);
  });

  it("mantém o bloqueio após usar a liberação manual e permite usá-la uma única vez", () => {
    const controle = criarControleConsultaCnpj();
    const assessor = "assessor-1";

    expect(controle.reservar(assessor, 0)).toBe(0);
    controle.liberarConsultaManual(assessor, 0);
    expect(controle.consumirLiberacaoManual(assessor, 5_000)).toBe(true);
    expect(controle.reservar(assessor, 5_000, true)).toBe(0);

    expect(controle.consumirLiberacaoManual(assessor, 6_000)).toBe(false);
    expect(controle.reservar(assessor, 10_000)).toBe(55);
  });

  it("não aceita uma liberação manual expirada", () => {
    const controle = criarControleConsultaCnpj();
    controle.liberarConsultaManual("assessor-1", 0);

    expect(controle.consumirLiberacaoManual("assessor-1", 60_000)).toBe(false);
  });
});
