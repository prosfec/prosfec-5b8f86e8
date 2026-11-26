import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { arquivoPropostaSolar } from "./downloadPropostaSolar";
import { camposPropostaSolar, prepararPropostaSolar } from "./dadosSimulacaoProsfec";
import type { OfertaEnergia } from "./validacaoFichaSolar";

const oferta: OfertaEnergia = { id: "oferta-1", pacoteId: "pacote-1", tipo: "gd", empresa: "Usina Regional", desconto: "20", economia: "245,00", locacao: "", regras: "Condições da Mesa", pdfUrl: "https://firebasestorage.googleapis.com/proposta.pdf", pdfNome: "proposta.pdf", criadaEm: "2026-11-26T13:43:00Z" };
afterEach(() => vi.unstubAllGlobals());
describe("download de propostas", () => {
  it("baixa o arquivo publicado sem substituí-lo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("%PDF-1.7 arquivo original")));
    expect(await (await arquivoPropostaSolar(oferta)).text()).toBe("%PDF-1.7 arquivo original");
  });
  it("recria as quatro lâminas com os dados congelados se o download falhar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Rede indisponível")));
    const campos = { ...camposPropostaSolar({ ficha: { tipo: "PF", nomeCompleto: "Cliente Original" } }), consumo: "1250", tarifa: "0,98", disponibilidade: "68", iluminacao: "42" };
    const propostaProsfec = prepararPropostaSolar(campos, oferta, oferta.criadaEm);
    campos.cliente = "Cliente Modificado"; campos.tarifa = "5,00";
    const blob = await arquivoPropostaSolar({ ...oferta, propostaProsfec });
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    expect(pdf.getPageCount()).toBe(4);
    expect(pdf.getTitle()).toBe("Proposta PROSFEC Energy — Cliente Original");
    expect(propostaProsfec.tarifa).toBe(0.98);
  });
  it("não inventa proposta substituta para um PDF próprio indisponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Erro de acesso", { status: 403 })));
    await expect(arquivoPropostaSolar(oferta)).rejects.toThrow("PDF anexado");
  });
});