import { describe, it, expect } from "vitest";
import { normalizarLinkAssinatura, mensagemLinkAssinatura } from "./linkAssinatura";

describe("link de assinatura", () => {
  it("aceita apenas https", () => {
    expect(normalizarLinkAssinatura("https://app.zapsign.com.br/verificar/abc")).toBe("https://app.zapsign.com.br/verificar/abc");
    expect(normalizarLinkAssinatura("http://inseguro.com")).toBeNull();
    expect(normalizarLinkAssinatura("javascript:alert(1)")).toBeNull();
    expect(normalizarLinkAssinatura("texto")).toBeNull();
  });
  it("mensagem inclui cliente, assessor e link", () => {
    const m = mensagemLinkAssinatura("Maria", "João", "https://x.com/c");
    expect(m).toContain("Olá, Maria!");
    expect(m).toContain("João da PROSFEC Energy");
    expect(m).toContain("https://x.com/c");
  });
});
