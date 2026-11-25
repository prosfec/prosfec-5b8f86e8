import { z } from "zod";

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;
export const INTERESSES_ENERGIA = ["Geração distribuída / Energia por assinatura", "Cooperativa de energia", "Mercado Livre de Energia (ACL)", "Alocação de usinas solares", "Ainda não sei, preciso de orientação técnica"] as const;
export const CENTRAL_ENERGIA = "5598987353253";
export const referenciaEnergiaSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
export const portalEnergiaSchema = z.object({
  nome: z.string().trim().min(5, "Informe seu nome completo.").max(120).refine(v => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
  tipo: z.enum(["PF", "PJ"]),
  telefone: z.string().transform(v => v.replace(/\D/g, "")).refine(v => /^[1-9]{2}9\d{8}$/.test(v), "Informe WhatsApp com DDD e 11 dígitos."),
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  estado: z.enum(UFS),
  cidade: z.string().trim().min(2, "Informe sua cidade.").max(100),
  concessionaria: z.string().trim().min(2, "Informe sua distribuidora.").max(100),
  consumoKwhMes: z.coerce.number().finite().positive("Informe o consumo médio em kWh.").max(100000000),
  mediaContaReais: z.coerce.number().finite().positive("Informe o valor médio da conta.").max(100000000),
  interesse: z.enum(INTERESSES_ENERGIA),
  consentimento: z.literal(true, { errorMap: () => ({ message: "Autorize o tratamento dos dados para a análise." }) }),
  ref: z.union([referenciaEnergiaSchema, z.literal("")]).default(""),
  requestId: z.string().uuid(),
  challenge: z.string().min(20).max(500),
  website: z.string().max(0),
}).strict();
export type PortalEnergiaInput = z.infer<typeof portalEnergiaSchema>;

export function assessorEnergiaDisponivel(partner: Record<string, unknown> | null): boolean {
  if (!partner || typeof partner["nome"] !== "string") return false;
  const estados = [partner["status"], partner["statusManual"]];
  return !estados.some(v => ["bloqueado", "inativo", "cancelado", "excluido"].includes(String(v).toLowerCase()));
}

export function montarLeadPortalEnergia(input: PortalEnergiaInput, partner: Record<string, unknown> | null, agora: string) {
  return {
    nomeEmpresa: input.nome, razaoSocial: "", contatoNome: input.nome,
    telefone: input.telefone, email: input.email, cidade: input.cidade, estado: input.estado,
    concessionaria: input.concessionaria, consumoKwhMes: input.consumoKwhMes,
    mediaContaReais: input.mediaContaReais, modalidadeInteresse: input.interesse,
    parceiroId: partner ? input.ref : "", parceiroNome: partner ? String(partner["nome"] || "") : "",
    parceiroEmail: partner ? String(partner["email"] || "") : "",
    masterPartnerId: partner ? String(partner["parentPartnerId"] || "") : "",
    status: "novo", origem: "portal_institucional", criadoEm: agora, atualizadoEm: agora,
    historicoOrigem: partner ? "Captado via link de indicação do assessor" : "Captado direto pelo portal institucional",
    consentimentoLgpd: { aceito: true, em: agora, finalidade: "Análise comercial de energia e contato" },
    ficha: { tipo: input.tipo, nomeCompleto: input.nome, email: input.email, telefone: input.telefone },
    anotacoes: [{ texto: `Solicitação de análise: ${input.interesse}. Distribuidora: ${input.concessionaria}. Consumo informado: ${input.consumoKwhMes} kWh/mês. Conta média: R$ ${input.mediaContaReais.toFixed(2)}.`, autor: "Portal PROSFEC Energy", papel: "sistema", automatica: true, data: agora }],
  };
}