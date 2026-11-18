// Abre a pesquisa de CNPJ no Google em uma janela lateral reutilizável (desktop)
// ou em nova aba (celular). Roda no navegador do assessor: sem captcha e sem custo de IA.
const NOME_JANELA = "PROSFEC_GOOGLE_SEARCH";
const LARGURA = 500;

export function montarBuscaCnpjGoogle(nome?: string, cidade?: string, estado?: string): string {
  const limpo = (s?: string) => String(s || "").replace(/["“”]/g, "").replace(/\s+/g, " ").trim();
  const n = limpo(nome);
  const partes = [n ? `"${n}"` : "", limpo(cidade), limpo(estado), "CNPJ"].filter(Boolean);
  return `https://www.google.com/search?q=${encodeURIComponent(partes.join(" "))}`;
}

export function abrirBuscaCnpjGoogle(nome?: string, cidade?: string, estado?: string): void {
  if (typeof window === "undefined") return;
  const url = montarBuscaCnpjGoogle(nome, cidade, estado);
  const mobile = window.innerWidth < 1024 || window.matchMedia?.("(pointer: coarse)").matches;
  if (mobile) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const altura = window.screen?.availHeight || 900;
  const left = Math.max(0, (window.screen?.availWidth || 1440) - LARGURA);
  const recursos = `popup=yes,width=${LARGURA},height=${altura},left=${left},top=0,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes`;
  const janela = window.open(url, NOME_JANELA, recursos);
  if (!janela) {
    // Bloqueador de pop-up: cai para aba normal
    window.open(url, "_blank", "noopener");
    return;
  }
  try { janela.focus(); } catch {}
}
