import { describe, it, expect } from "vitest";
import { classificarPorte, filtrarPorNivel } from "./porteEmpresa";

describe("classificarPorte", () => {
  it("supermercado é grande porte", () => {
    expect(classificarPorte({ primaryType: "supermarket", avaliacoes: 20 })).toBe("grande");
  });
  it("mais de 250 avaliações é grande porte", () => {
    expect(classificarPorte({ primaryType: "bakery", avaliacoes: 400 })).toBe("grande");
  });
  it("entre 81 e 250 avaliações é médio porte", () => {
    expect(classificarPorte({ primaryType: "bakery", avaliacoes: 120 })).toBe("medio");
  });
  it("escritório de contabilidade com poucas avaliações é prestador", () => {
    expect(classificarPorte({ primaryType: "accounting", avaliacoes: 12 })).toBe("prestador");
  });
  it("padaria de bairro é pequeno porte", () => {
    expect(classificarPorte({ primaryType: "bakery", avaliacoes: 40 })).toBe("pequeno");
  });
  it("filtro remove empresas fora do nível escolhido", () => {
    const lista = [{ primaryType: "bakery", avaliacoes: 40 }, { primaryType: "supermarket", avaliacoes: 900 }];
    expect(filtrarPorNivel(lista, "pequeno")).toHaveLength(1);
  });
});
