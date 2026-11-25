import { describe, expect, it } from "vitest";
import { assessorEnergiaDisponivel, montarLeadPortalEnergia, portalEnergiaSchema } from "./portalEnergia";
const input = { nome: "Cliente Teste", tipo: "PF", telefone: "98999999999", email: "teste@example.com", estado: "MA", cidade: "São Luís", concessionaria: "Equatorial", consumoKwhMes: 500, mediaContaReais: 600, interesse: "Ainda não sei, preciso de orientação técnica", consentimento: true, ref: "assessor_1", requestId: "00000000-0000-4000-8000-000000000001", challenge: "a".repeat(30), website: "" };
describe("captação institucional solar", () => {
  it("envia indicação ao assessor e mantém o lead em Novo", () => {
    const lead = montarLeadPortalEnergia(portalEnergiaSchema.parse(input), { nome: "Assessor Teste" }, "2026-11-25T00:53:00Z");
    expect(lead.parceiroId).toBe("assessor_1"); expect(lead.status).toBe("novo"); expect(lead.origem).toBe("portal_institucional");
  });
  it("envia captação direta à Mesa sem inventar parceiro", () => {
    const lead = montarLeadPortalEnergia(portalEnergiaSchema.parse({ ...input, ref: "" }), null, "2026-11-25T00:53:00Z");
    expect(lead.parceiroId).toBe(""); expect(lead.parceiroNome).toBe("");
  });
  it("não aceita consentimento ausente ou falso", () => { expect(portalEnergiaSchema.safeParse({ ...input, consentimento: false }).success).toBe(false); });
  it("não aceita WhatsApp sem DDD", () => { expect(portalEnergiaSchema.safeParse({ ...input, telefone: "999999999" }).success).toBe(false); });
  it("não aceita referência com caminho de documento", () => { expect(portalEnergiaSchema.safeParse({ ...input, ref: "../admin" }).success).toBe(false); });
  it("bloqueia indicação de assessor inativo ou bloqueado", () => {
    expect(assessorEnergiaDisponivel({ nome: "Assessor", status: "inativo" })).toBe(false);
    expect(assessorEnergiaDisponivel({ nome: "Assessor", statusManual: "bloqueado" })).toBe(false);
    expect(assessorEnergiaDisponivel({ nome: "Assessor", status: "ativo" })).toBe(true);
  });
  it("não exige documentos nem muda para atendimento na captação", () => {
    const lead = montarLeadPortalEnergia(portalEnergiaSchema.parse(input), { nome: "Assessor" }, "2026-11-25T00:53:00Z");
    expect(lead).not.toHaveProperty("documentos"); expect(lead.ficha.nomeCompleto).toBe("Cliente Teste"); expect(lead.status).toBe("novo");
  });
  it("rejeita honeypot preenchido e campos administrativos", () => {
    expect(portalEnergiaSchema.safeParse({ ...input, website: "spam" }).success).toBe(false);
    expect(portalEnergiaSchema.safeParse({ ...input, status: "concluido" }).success).toBe(false);
  });
});