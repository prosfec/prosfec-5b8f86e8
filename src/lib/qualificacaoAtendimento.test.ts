import { describe, it, expect } from "vitest";
import { validarQualificacao, parseReais } from "./qualificacaoAtendimento";

const agora = new Date("2026-11-09T12:00:00Z");
const base = { nomeDecisor: "Marcos Silva", whatsapp: "(98) 99123-4567", mediaConta: "3.850,00", dataAtendimento: "2026-11-09T08:30" };

describe("qualificação do primeiro atendimento", () => {
  it("aceita ficha completa", () => {
    const r = validarQualificacao(base, agora);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.dados.whatsapp).toBe("98991234567"); expect(r.dados.mediaContaReais).toBe(3850); }
  });
  it("exige nome e sobrenome", () => {
    expect(validarQualificacao({ ...base, nomeDecisor: "Dono" }, agora).ok).toBe(false);
  });
  it("exige celular com 11 dígitos", () => {
    expect(validarQualificacao({ ...base, whatsapp: "(98) 3212-3456" }, agora).ok).toBe(false);
  });
  it("exige conta maior que R$ 150", () => {
    expect(parseReais("150,00")).toBe(150);
    expect(validarQualificacao({ ...base, mediaConta: "150,00" }, agora).ok).toBe(false);
  });
  it("recusa data futura e com mais de 7 dias", () => {
    expect(validarQualificacao({ ...base, dataAtendimento: "2026-11-10T10:00" }, agora).ok).toBe(false);
    expect(validarQualificacao({ ...base, dataAtendimento: "2026-11-01T10:00" }, agora).ok).toBe(false);
  });
});
