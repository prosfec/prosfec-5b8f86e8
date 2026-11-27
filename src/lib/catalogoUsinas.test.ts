import { describe, expect, it } from "vitest";
import { identificarDistribuidora, recomendarUsinas } from "./catalogoUsinas";

const nomes = (r: ReturnType<typeof recomendarUsinas>) => r.compativeis.map(u => `${u.nome}:${u.desconto}`);

describe("recomendarUsinas", () => {
  it("CEMIG 1.200 kWh sem placa: Usina 26 com 28% é a recomendada", () => {
    const r = recomendarUsinas({ distribuidora: "cemig", consumoKwh: 1200, possuiPlaca: false });
    expect(r.compativeis[0]?.nome).toBe("Usina 26");
    expect(nomes(r)).toEqual(["Usina 26:28", "Usina 120:25", "Usina 114:25", "Usina 28:21", "Usina 121:21"]);
  });
  it("Equatorial MA 400 kWh: só Usinas 114 e 120 com 15%", () => {
    expect(nomes(recomendarUsinas({ distribuidora: "equatorial-ma", consumoKwh: 400, possuiPlaca: false }))).toEqual(["Usina 114:15", "Usina 120:15"]);
  });
  it("respeita consumo mínimo de cada usina", () => {
    const r = recomendarUsinas({ distribuidora: "equatorial-ma", consumoKwh: 300, possuiPlaca: false });
    expect(nomes(r)).toEqual(["Usina 120:15"]);
    expect(recomendarUsinas({ distribuidora: "copel", consumoKwh: 799, possuiPlaca: false }).compativeis.some(u => u.nome === "Usina 25")).toBe(false);
  });
  it("placa solar bloqueia 28, 114, 120, 121 e exige excedente nas demais", () => {
    const r = recomendarUsinas({ distribuidora: "cemig", consumoKwh: 1500, possuiPlaca: true });
    expect(nomes(r)).toEqual(["Usina 26:28"]);
    expect(r.compativeis[0]?.sobAnalise).toBe(true);
    expect(recomendarUsinas({ distribuidora: "cemig", consumoKwh: 900, possuiPlaca: true }).compativeis).toEqual([]);
  });
  it("Usina 26 exige fatura mínima de R$ 300", () => {
    expect(recomendarUsinas({ distribuidora: "cemig", consumoKwh: 300, possuiPlaca: false, valorFatura: 250 }).compativeis.some(u => u.nome === "Usina 26")).toBe(false);
  });
  it("Desconto Especial Serena acima de 1.000 kWh nas Usinas 28/121", () => {
    const r = recomendarUsinas({ distribuidora: "equatorial-go", consumoKwh: 6000, possuiPlaca: false });
    expect(r.compativeis.find(u => u.nome === "Usina 121")?.desconto).toBe(27);
    const ce = recomendarUsinas({ distribuidora: "enel-ce", consumoKwh: 3000, possuiPlaca: false });
    expect(ce.compativeis.find(u => u.nome === "Usina 28")?.desconto).toBe(25);
  });
  it("Usina 26 faixas por consumo na COPEL", () => {
    const d = (c: number) => recomendarUsinas({ distribuidora: "copel", consumoKwh: c, possuiPlaca: false }).compativeis.find(u => u.nome === "Usina 26")?.desconto;
    expect([d(500), d(2000), d(4000)]).toEqual([12, 15, 16]);
  });
  it("sem distribuidora não recomenda nada", () => {
    expect(recomendarUsinas({ distribuidora: null, consumoKwh: 1000, possuiPlaca: false }).compativeis).toEqual([]);
  });
});

describe("identificarDistribuidora", () => {
  it("reconhece nomes livres", () => {
    expect(identificarDistribuidora("Equatorial Maranhão")).toBe("equatorial-ma");
    expect(identificarDistribuidora("CEMIG-D")).toBe("cemig");
    expect(identificarDistribuidora("CPFL Piratininga")).toBe("cpfl-piratininga");
    expect(identificarDistribuidora("Equatorial")).toBeNull();
  });
});
