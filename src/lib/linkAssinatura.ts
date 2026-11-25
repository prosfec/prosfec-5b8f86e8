// Valida e monta a mensagem de envio do link de assinatura de contrato.
export function normalizarLinkAssinatura(valor: unknown): string | null {
  const bruto = String(valor ?? "").trim();
  if (!bruto || bruto.length > 2000) return null;
  try {
    const url = new URL(bruto);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function mensagemLinkAssinatura(cliente: string, assessor: string, link: string): string {
  const nome = cliente.trim() || "tudo bem";
  return [
    `Olá, ${nome}! Aqui é ${assessor.trim() || "seu assessor"} da PROSFEC Energy.`,
    "Segue o link seguro para a assinatura digital do seu contrato:",
    `👉 ${link}`,
    "Qualquer dúvida durante a assinatura, estou à sua disposição por aqui!",
  ].join("\n");
}
