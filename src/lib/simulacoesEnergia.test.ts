import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ lead: {} as Record<string, any>, updates: [] as Record<string, any>[], user: { uid: "assessor-uid", email: "assessor@example.com", getIdTokenResult: async () => ({ claims: {} }) }, uploads: 0 }));
vi.mock("../firebase", () => ({ auth: { authStateReady: async () => {}, get currentUser() { return state.user; } }, db: {}, storage: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  arrayUnion: (note: unknown) => ({ append: note }),
  runTransaction: async (_db: unknown, fn: (tx: any) => Promise<unknown>) => fn({
    get: async (r: { collection: string }) => ({ exists: () => true, data: () => r.collection === "parceiros" ? { authUid: "assessor-uid", email: "assessor@example.com" } : state.lead }),
    update: (_r: unknown, updates: Record<string, any>) => { state.updates.push(updates); state.lead = { ...state.lead, ...updates, anotacoes: [...(state.lead['anotacoes'] || []), updates['anotacoes']?.append] }; },
  }),
}));
vi.mock("firebase/storage", () => ({ ref: (_s: unknown, path: string) => path, uploadBytes: async () => { state.uploads++; }, getDownloadURL: async () => "https://firebasestorage.googleapis.com/proposta.pdf", deleteObject: async () => {} }));
import { escolherPropostaEnergia, publicarSimulacoes, solicitarCotacaoEnergia } from "./simulacoesEnergia";

const oferta = { id: "gd-1", tipo: "gd", empresa: "Usina Manual", regras: "Regras da usina", pdfUrl: "https://firebasestorage.googleapis.com/proposta.pdf" };
const documento = { url: "https://firebasestorage.googleapis.com/doc.pdf" };
beforeEach(() => {
  state.user.uid = "assessor-uid"; state.user.email = "assessor@example.com";
  state.updates = []; state.uploads = 0;
  state.lead = { parceiroId: "partner-1", status: "atendimento", ficha: { tipo: "PF", nomeCompleto: "Cliente Teste", cpf: "123", email: "cliente@example.com", telefone: "98999999999", estadoCivil: "Casado(a)", profissao: "Comerciante" }, documentos: { contaLuz: documento, rgFrente: documento, rgVerso: documento }, ofertasEnergia: { "gd-1": oferta, "gd-2": { ...oferta, id: "gd-2", empresa: "Outra Usina" } }, anotacoes: [] };
});
describe("transações de simulações", () => {
  it("não permite assessor publicar ofertas da Mesa", async () => {
    await expect(publicarSimulacoes("lead-1", "pacote-1", [])).rejects.toThrow("Somente a Mesa");
    expect(state.uploads).toBe(0);
  });
  it("não permite escolher uma proposta de outro assessor", async () => {
    state.user.uid = "outro-uid"; state.user.email = "outro@example.com";
    await expect(escolherPropostaEnergia("lead-1", "gd-1", "Outro")).rejects.toThrow("Você não tem acesso");
    expect(state.updates).toHaveLength(0);
  });
  it("grava a escolha e o aviso para a Mesa sem concluir o contrato", async () => {
    const result = await escolherPropostaEnergia("lead-1", "gd-1", "Assessor");
    expect(result['propostaEnergiaEscolhida'].empresa).toBe("Usina Manual");
    expect(result['status']).toBe("atendimento");
    expect(result['ultimaMovimentacaoParceiroEm']).toBeTruthy();
  });
  it("não duplica a mesma escolha em uma repetição", async () => {
    await escolherPropostaEnergia("lead-1", "gd-1", "Assessor");
    await escolherPropostaEnergia("lead-1", "gd-1", "Assessor");
    expect(state.updates).toHaveLength(1);
  });
  it("impede substituir uma proposta escolhida por outra", async () => {
    await escolherPropostaEnergia("lead-1", "gd-1", "Assessor");
    await expect(escolherPropostaEnergia("lead-1", "gd-2", "Assessor")).rejects.toThrow("Outra proposta já foi selecionada");
    expect(state.updates).toHaveLength(1);
  });
  it("revalida a ficha atual na transação mesmo que o botão tenha sido liberado", async () => {
    state.lead['documentos'] = { contaLuz: documento };
    await expect(escolherPropostaEnergia("lead-1", "gd-1", "Assessor")).rejects.toThrow("RG/CNH");
    expect(state.updates).toHaveLength(0);
  });
  it("não seleciona proposta inexistente", async () => {
    await expect(escolherPropostaEnergia("lead-1", "gd-inexistente", "Assessor")).rejects.toThrow("Proposta não encontrada");
  });
  it("não seleciona propostas de lead cancelado", async () => {
    state.lead['status'] = "arquivado";
    await expect(escolherPropostaEnergia("lead-1", "gd-1", "Assessor")).rejects.toThrow("não está aberto");
  });
  it("solicita cotação uma vez e registra aviso para o ADM", async () => {
    const result = await solicitarCotacaoEnergia("lead-1", "Assessor");
    await solicitarCotacaoEnergia("lead-1", "Assessor");
    expect(result['cotacaoEnergiaStatus']).toBe("solicitada");
    expect(state.updates).toHaveLength(1);
  });
});