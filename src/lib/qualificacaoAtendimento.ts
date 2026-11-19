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

// Fatura de energia: obrigatória para qualquer lead entrar no CRM solar.
export const FATURA_MAX_BYTES = 15 * 1024 * 1024;
const FATURA_TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const FATURA_EXT: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Valida a fatura e devolve o tipo final aceito pelo Storage, ou a mensagem de erro. */
export function validarFatura(arquivo: { name?: string; type?: string; size?: number } | null | undefined):
  { ok: true; tipo: string; ext: string } | { ok: false; erro: string } {
  if (!arquivo) return { ok: false, erro: "Anexe a fatura de energia do cliente (PDF ou foto)." };
  const ext = String(arquivo.name || "").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (ext === "heic" || ext === "heif" || /heic|heif/i.test(arquivo.type || "")) {
    return { ok: false, erro: "Foto do iPhone (HEIC) não é aceita. Envie em PDF, JPG ou PNG (tire um print da foto ou exporte como JPG)." };
  }
  const tipo = FATURA_TIPOS.includes(arquivo.type || "") ? (arquivo.type as string) : FATURA_EXT[ext];
  if (!tipo) return { ok: false, erro: "Envie a fatura em PDF ou foto (JPG, PNG ou WEBP)." };
  const size = Number(arquivo.size || 0);
  if (size <= 0) return { ok: false, erro: "O arquivo está vazio. Selecione a fatura novamente." };
  if (size > FATURA_MAX_BYTES) return { ok: false, erro: "O arquivo excede o limite de 15 MB." };
  const extFinal = Object.keys(FATURA_EXT).find((k) => FATURA_EXT[k] === tipo) || "bin";
  return { ok: true, tipo, ext: FATURA_EXT[ext] === tipo ? ext : extFinal };
}

export interface DadosEmpresaManual { nomeEmpresa: string; cidade: string; estado: string }

export function validarEmpresaManual(input: { nomeEmpresa: string; cidade: string; estado: string }):
  { ok: true; dados: DadosEmpresaManual } | { ok: false; erros: Partial<Record<"nomeEmpresa" | "cidade" | "estado", string>> } {
  const erros: Partial<Record<"nomeEmpresa" | "cidade" | "estado", string>> = {};
  const nomeEmpresa = String(input.nomeEmpresa || "").trim().replace(/\s+/g, " ");
  const cidade = String(input.cidade || "").trim().replace(/\s+/g, " ");
  const estado = String(input.estado || "").trim().toUpperCase();
  if (nomeEmpresa.length < 3) erros.nomeEmpresa = "Informe o nome da empresa ou do cliente.";
  else if (nomeEmpresa.length > 120) erros.nomeEmpresa = "Nome muito longo.";
  if (cidade.length < 2) erros.cidade = "Informe a cidade.";
  if (!/^[A-Z]{2}$/.test(estado)) erros.estado = "UF inválida.";
  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados: { nomeEmpresa, cidade, estado } };
}
