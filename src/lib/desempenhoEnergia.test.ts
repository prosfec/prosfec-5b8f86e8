import { describe, it, expect } from "vitest";
import { resumoLeads, rankingEquipe } from "./desempenhoEnergia";

describe("desempenho energia", () => {
  it("conta convertidos do Painel de Oportunidades e conversão", () => {
    const r = resumoLeads([
      { status: "concluido", origem: "painel_oportunidades", consumoKwhMes: 1000 },
      { status: "atendimento", origem: "painel_oportunidades" },
      { status: "cancelado" },
      { status: "novo" },
    ]);
    expect(r.painel).toBe(2);
    expect(r.painelConcluido).toBe(1);
    expect(r.manual).toBe(2);
    expect(r.funil.arquivado).toBe(1);
    expect(r.conversao).toBe(25);
  });
  it("ranking ordena por contratos concluídos", () => {
    const partners = [{ id: "a", nome: "A", plano: "Assessor de Energia" }, { id: "b", nome: "B", plano: "Assessor de Energia" }];
    const leads = [{ parceiroId: "b", status: "concluido" }, { parceiroId: "a", status: "novo" }];
    expect(rankingEquipe(partners, leads).map(r => r.partner.id)).toEqual(["b", "a"]);
  });
});
