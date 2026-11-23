import { describe, expect, it } from "vitest";
import { pendenciasFichaSolar, pendenciasSolicitacaoSolar, validarOfertasEnergia, validarPdfSimulacao, empresasFechamentoSimulacao, type OfertaEnergia } from "./validacaoFichaSolar";
const ficha = { tipo: "PF", nomeCompleto: "Cliente Teste", cpf: "12345678909", email: "cliente@example.com", telefone: "98999999999", estadoCivil: "Casado(a)", profissao: "Comerciante" };
const arquivo = { url: "https://firebasestorage.googleapis.com/documento.pdf" };
const documentos = { contaLuz: arquivo, rgFrente: arquivo, rgVerso: arquivo };
const oferta: OfertaEnergia = { id: "oferta-1", pacoteId: "pacote-1", tipo: "gd", empresa: "Usina cadastrada manualmente", desconto: "18", economia: "", locacao: "", regras: "Regras digitadas pela Mesa", pdfUrl: arquivo.url, pdfNome: "oferta.pdf", criadaEm: "2026-11-22T14:00:00Z" };
describe("simulações no chat solar", () => {
  it("mantém a usina manual como opção de fechamento sem classificá-la como Sunne", () => {
    expect(empresasFechamentoSimulacao({ propostaEnergiaEscolhida: { empresa: "Usina Solar Regional" } }, ["Sunne", "Serena", "AlugSol"])).toEqual(["Sunne", "Serena", "AlugSol", "Usina Solar Regional"]);
  });
  it("permite pedir cotação com nome, e-mail, telefone e fatura, sem exigir documentos de identidade", () => {
    expect(pendenciasSolicitacaoSolar({ ficha, documentos: { contaLuz: arquivo } })).toEqual([]);
  });
  it("bloqueia solicitar cotação sem a fatura", () => {
    expect(pendenciasSolicitacaoSolar({ ficha })).toEqual(["Conta de luz"]);
  });
  it("libera seleção com a ficha PF completa e três documentos obrigatórios sem adicionais", () => {
    expect(pendenciasFichaSolar({ ficha, documentos })).toEqual([]);
  });
  it("bloqueia seleção se faltar profissão", () => {
    expect(pendenciasFichaSolar({ ficha: { ...ficha, profissao: " " }, documentos })).toEqual(["Profissão"]);
  });
  it("exige Cartão CNPJ e Contrato Social/CCMEI para PJ", () => {
    expect(pendenciasFichaSolar({ ficha: { ...ficha, tipo: "PJ", cnpj: "123", razaoSocial: "Empresa" }, documentos })).toEqual(["Cartão CNPJ", "Contrato Social ou CCMEI"]);
  });
  it("libera PJ somente com seus cinco documentos", () => {
    expect(pendenciasFichaSolar({ ficha: { ...ficha, tipo: "PJ", cnpj: "123", razaoSocial: "Empresa" }, documentos: { ...documentos, cartaoCnpj: arquivo, contratoSocial: arquivo } })).toEqual([]);
  });
  it("aceita várias GD com nomes e regras totalmente manuais junto com AlugSol", () => {
    expect(validarOfertasEnergia([oferta, { ...oferta, id: "oferta-2", empresa: "Outra usina" }, { ...oferta, id: "oferta-3", tipo: "alugsol", empresa: "AlugSol" }])).toBeNull();
  });
  it("exige regras operacionais em cada oferta", () => {
    expect(validarOfertasEnergia([{ ...oferta, regras: " " }])).not.toBeNull();
  });
  it("exige PDF em cada oferta", () => {
    expect(validarOfertasEnergia([{ ...oferta, pdfUrl: "" }])).not.toBeNull();
  });
  it("rejeita PDFs de 15 MB ou maiores conforme limite do Storage", () => {
    expect(validarPdfSimulacao({ size: 15 * 1024 * 1024, name: "proposta.pdf", type: "application/pdf" })).not.toBeNull();
    expect(validarPdfSimulacao({ size: 15 * 1024 * 1024 - 1, name: "proposta.pdf", type: "application/pdf" })).toBeNull();
  });
  it("não aceita imagem como proposta PDF", () => {
    expect(validarPdfSimulacao({ size: 100, name: "proposta.png", type: "image/png" })).not.toBeNull();
  });
});