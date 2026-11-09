// Trava de qualificação: um lead do Painel de Oportunidades só entra na esteira
// solar depois que o assessor registra o primeiro atendimento com o decisor.

export const CONTA_MINIMA_REAIS = 150;
export const DIAS_MAX_PASSADO = 7;

export interface QualificacaoInput {
  nomeDecisor: string;
  whatsapp: string;
  mediaConta: string; // texto digitado, ex.: "3.850,00"
  dataAtendimento: string; // valor de <input type="datetime-local">
}

export interface QualificacaoValida {
  nomeDecisor: string;
  whatsapp: string; // somente dígitos (11)
  mediaContaReais: number;
  atendimentoEm: string; // ISO
}

export function parseReais(texto: string): number {
  const limpo = String(texto || "").replace(/[^\d,]/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function formatarReais(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function validarQualificacao(
  input: QualificacaoInput,
  agora: Date = new Date(),
): { ok: true; dados: QualificacaoValida } | { ok: false; erros: Partial<Record<keyof QualificacaoInput, string>> } {
  const erros: Partial<Record<keyof QualificacaoInput, string>> = {};

  const nome = String(input.nomeDecisor || "").trim().replace(/\s+/g, " ");
  const palavras = nome.split(" ").filter((p) => p.length >= 2);
  if (palavras.length < 2) erros.nomeDecisor = "Informe nome e sobrenome do sócio/representante.";
  else if (nome.length > 100) erros.nomeDecisor = "Nome muito longo.";

  const fone = String(input.whatsapp || "").replace(/\D/g, "");
  if (fone.length !== 11 || fone[2] !== "9") erros.whatsapp = "Informe um celular com DDD: (XX) 9XXXX-XXXX.";

  const valor = parseReais(input.mediaConta);
  if (!(valor > CONTA_MINIMA_REAIS)) erros.mediaConta = `A média da conta deve ser maior que ${formatarReais(CONTA_MINIMA_REAIS)}.`;

  const data = new Date(input.dataAtendimento);
  if (!input.dataAtendimento || Number.isNaN(data.getTime())) {
    erros.dataAtendimento = "Informe a data e o horário do atendimento.";
  } else if (data.getTime() > agora.getTime() + 60_000) {
    erros.dataAtendimento = "A data do atendimento não pode estar no futuro.";
  } else if (agora.getTime() - data.getTime() > DIAS_MAX_PASSADO * 86_400_000) {
    erros.dataAtendimento = `O atendimento deve ter ocorrido nos últimos ${DIAS_MAX_PASSADO} dias.`;
  }

  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados: { nomeDecisor: nome, whatsapp: fone, mediaContaReais: valor, atendimentoEm: data.toISOString() } };
}

export function formatarCelular(digitos: string): string {
  const d = String(digitos || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function notaPrimeiroAtendimento(q: QualificacaoValida): string {
  const d = new Date(q.atendimentoEm);
  const data = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `⚡ Primeiro atendimento realizado em ${data} às ${hora} com ${q.nomeDecisor} (WhatsApp ${formatarCelular(q.whatsapp)}). Média informada: ${formatarReais(q.mediaContaReais)}/mês.`;
}
