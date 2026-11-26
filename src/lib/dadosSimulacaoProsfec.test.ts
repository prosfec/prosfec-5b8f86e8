import { describe, expect, it } from "vitest";
import { camposPropostaSolar, prepararPropostaSolar } from "./dadosSimulacaoProsfec";
import { calcularPropostaProsfec } from "./propostaProsfecPdf";
const campos = { ...camposPropostaSolar({ ficha: { tipo: "PF", nomeCompleto: "Titular", cpf: "123" } }), consumo: "1.250", tarifa: "0,98", disponibilidade: "68", iluminacao: "42" };
const oferta = { id: "oferta-1", tipo: "gd" as const, empresa: "Usina Regional", desconto: "20%", economia: "", locacao: "" };
describe("dados financeiros publicados", () => {
  it("não usa o CNPJ da empresa no lugar do CPF de uma ficha PF", () => {
    expect(camposPropostaSolar({ cnpj: "456", ficha: { tipo: "PF", nomeCompleto: "Titular", cpf: "123" } }).documento).toBe("123");
  });
  it("impede divergência entre a economia no card e no PDF", () => {
    expect(() => prepararPropostaSolar(campos, { ...oferta, economia: "500" }, "2026-11-26T13:43:00Z")).toThrow("economia informada difere");
  });
  it("não interpreta texto inválido como custo fixo zero", () => {
    expect(() => prepararPropostaSolar({ ...campos, disponibilidade: "abc" }, oferta, "2026-11-26T13:43:00Z")).toThrow("custos fixos");
  });
  it("inclui locação nos custos e mantém economia líquida AlugSol", () => {
    const snapshot = prepararPropostaSolar(campos, { ...oferta, tipo: "alugsol", economia: "300", locacao: "200" }, "2026-11-26T13:43:00Z");
    expect(calcularPropostaProsfec(snapshot)).toMatchObject({ totalAtual: 1335, totalNovo: 1035, economiaMensal: 300, economiaAnual: 3600 });
  });
});