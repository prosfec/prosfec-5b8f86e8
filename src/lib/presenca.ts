// Regras do controle de presença do Assessor de Energia.
// Horário de Brasília; só conta tempo ativo entre 08:00 e 18:00.
export const PRESENCA_INICIO_HORA = 8;
export const PRESENCA_FIM_HORA = 18;
export const PRESENCA_INATIVIDADE_MS = 5 * 60 * 1000;
export const PRESENCA_HEARTBEAT_MS = 2 * 60 * 1000;

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function partes(d: Date) {
  const p: Record<string, string> = {};
  for (const x of fmt.formatToParts(d)) p[x.type] = x.value;
  return p;
}

/** Chave do dia (YYYY-MM-DD) no horário de Brasília. */
export function diaPresenca(d: Date = new Date()): string {
  const p = partes(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora:minuto (HH:MM) no horário de Brasília. */
export function horaPresenca(d: Date): string {
  const p = partes(d);
  return `${p.hour}:${p.minute}`;
}

/** Está dentro do horário comercial (08:00 até 17:59:59)? */
export function dentroHorarioComercial(d: Date = new Date()): boolean {
  const h = Number(partes(d).hour);
  return h >= PRESENCA_INICIO_HORA && h < PRESENCA_FIM_HORA;
}

/** Deve contar este segundo? */
export function deveContar(agora: Date, ultimaInteracao: number, abaVisivel: boolean): boolean {
  if (!abaVisivel) return false;
  if (agora.getTime() - ultimaInteracao >= PRESENCA_INATIVIDADE_MS) return false;
  return dentroHorarioComercial(agora);
}

export type StatusPresenca = "online" | "ausente" | "offline";

/** Status para o ADM com base no último sinal gravado. */
export function statusPresenca(ultimoSinal?: string | null, ativo?: boolean, agora: Date = new Date()): StatusPresenca {
  if (!ultimoSinal) return "offline";
  const diff = agora.getTime() - new Date(ultimoSinal).getTime();
  if (diff > PRESENCA_HEARTBEAT_MS * 2 + 30_000) return "offline";
  return ativo ? "online" : "ausente";
}

export function formatarDuracao(seg: number): string {
  const s = Math.max(0, Math.floor(seg || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}
