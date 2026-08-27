// @ts-nocheck
/**
 * Etapa D — Centralização de variáveis de ambiente (uso exclusivo no servidor).
 *
 * Regras:
 *  - Nunca ler process.env no escopo de módulo: sempre dentro do handler.
 *  - Nenhum valor sensível pode ser logado ou devolvido ao cliente.
 */

export type EnvName =
  | "GEMINI_API_KEY"
  | "REDEBE_TOKEN"
  | "INTEGRADOR_API_KEY"
  | "INTEGRADOR_API_BASE_URL"
  | "GOOGLE_MAPS_API_KEY"
  | "PLACES_API_KEY"
  | "HUBLA_WEBHOOK_TOKEN"
  | "LASTLINK_WEBHOOK_TOKEN"
  | "MIGRATION_ADMIN_TOKEN"
  | "FIREBASE_API_KEY";

const read = (name: string): string => {
  try {
    const v = (typeof process !== "undefined" && process.env ? process.env[name] : "") || "";
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
};

/** Retorna a variável ou string vazia. Nunca lança. */
export const optionalEnv = (name: EnvName | string, fallback = ""): string =>
  read(name) || fallback;

/** Retorna a variável ou lança um erro sem expor o valor. */
export const requireEnv = (name: EnvName | string): string => {
  const v = read(name);
  if (!v) throw new Error(`Configuração ausente: ${name} não está definido no ambiente.`);
  return v;
};

/** Verdadeiro se a variável está configurada. */
export const hasEnv = (name: EnvName | string): boolean => read(name).length > 0;

/** Primeira variável configurada da lista (ex.: GOOGLE_MAPS_API_KEY -> PLACES_API_KEY). */
export const firstEnv = (...names: (EnvName | string)[]): string => {
  for (const n of names) {
    const v = read(n);
    if (v) return v;
  }
  return "";
};

// ---------------------------------------------------------------------------
// Helpers de sanitização de logs
// ---------------------------------------------------------------------------

/** joao.silva@dominio.com -> jo***@dominio.com */
export const maskEmail = (email: any): string => {
  const v = String(email || "").trim();
  if (!v || !v.includes("@")) return v ? "***" : "";
  const [user, domain] = v.split("@");
  const head = user.slice(0, 2);
  return `${head}***@${domain}`;
};

/** 12345678000199 -> 12******0199 (mantém apenas extremidades) */
export const maskDoc = (docNum: any): string => {
  const v = String(docNum || "").replace(/\D/g, "");
  if (!v) return "";
  if (v.length <= 6) return "***";
  return `${v.slice(0, 2)}${"*".repeat(Math.max(0, v.length - 6))}${v.slice(-4)}`;
};

const SENSITIVE_KEYS =
  /(senha|password|pass|token|secret|apikey|api_key|authorization|clientesenha|hash|salt)/i;

/** Remove/mascara campos sensíveis de um objeto antes de logar. */
export const redact = (input: any, depth = 0): any => {
  if (input == null || depth > 4) return input;
  if (Array.isArray(input)) return input.slice(0, 20).map((i) => redact(i, depth + 1));
  if (typeof input !== "object") return input;
  const out: any = {};
  for (const key of Object.keys(input)) {
    const val = (input as any)[key];
    if (SENSITIVE_KEYS.test(key)) {
      out[key] = "[REDACTED]";
    } else if (/email/i.test(key) && typeof val === "string") {
      out[key] = maskEmail(val);
    } else if (/(cpf|cnpj|documento|doc)$/i.test(key) && (typeof val === "string" || typeof val === "number")) {
      out[key] = maskDoc(val);
    } else if (typeof val === "object") {
      out[key] = redact(val, depth + 1);
    } else {
      out[key] = val;
    }
  }
  return out;
};
