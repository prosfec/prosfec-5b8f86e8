import { describe, it, expect } from "vitest";
import { calcularPropostaProsfec, gerarPropostaProsfecPdf } from "./propostaProsfecPdf";

describe("proposta PROSFEC", () => {
  it("aplica o desconto só na energia e mantém custos fixos", () => {
    const c = calcularPropostaProsfec({ consumoKwh: 1250, tarifa: 0.98, descontoPct: 20, disponibilidade: 68, iluminacao: 42 });
    expect(c.totalAtual).toBe(1335);
    expect(c.totalNovo).toBe(1090);
    expect(c.economiaMensal).toBe(245);
    expect(c.economiaAnual).toBe(2940);
  });
  it("gera PDF de 4 páginas", async () => {
    const bytes = await gerarPropostaProsfecPdf({ cliente: "Karina Martins Cavalcanti dos Santos", documento: "***.499.389-**", cidadeUf: "São Luís - MA", distribuidora: "Equatorial Maranhão", consumoKwh: 1250, tarifa: 0.98, descontoPct: 20, disponibilidade: 68, iluminacao: 42, assessorNome: "João da Silva", assessorWhatsapp: "(98) 98735-3253", validadeDias: 10, numero: "1284", emissao: new Date("2026-11-26") });
    const { PDFDocument } = await import("pdf-lib");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(4);
  });
});
