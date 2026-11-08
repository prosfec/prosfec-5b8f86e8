import { describe, it, expect } from "vitest";
import { resumoConcessionariaUF } from "./concessionariaRegiao";

describe("concessionária por UF", () => {
  it("MG identifica CEMIG-D com 25%", () => {
    const r = resumoConcessionariaUF("mg");
    expect(r?.nome).toBe("CEMIG-D");
    expect(r?.desconto).toBe(25);
    expect(r?.unica).toBe(true);
  });
  it("SP lista 5 concessionárias com 15%", () => {
    const r = resumoConcessionariaUF("SP");
    expect(r?.lista.length).toBe(5);
    expect(r?.desconto).toBe(15);
    expect(r?.unica).toBe(false);
  });
  it("TO não tem cobertura", () => {
    expect(resumoConcessionariaUF("TO")).toBeNull();
  });
});
