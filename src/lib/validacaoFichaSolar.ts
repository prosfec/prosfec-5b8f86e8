export type LeadSolar = Record<string, any>;
export const MAX_PDF_SIMULACAO = 15 * 1024 * 1024;
const titular = [
  ["nomeCompleto", "Nome do titular/representante"], ["cpf", "CPF"],
  ["email", "E-mail do titular"], ["telefone", "Telefone"],
  ["estadoCivil", "Estado civil"], ["profissao", "Profissão"],
];
const docsTitular = [["contaLuz", "Conta de luz"], ["rgFrente", "RG/CNH frente"], ["rgVerso", "RG/CNH verso"]];
export function tipoFichaSolar(lead: LeadSolar) {
  return lead['ficha']?.tipo === "PJ" || (lead['ficha']?.tipo !== "PF" && (lead['cnpj'] || lead['cnpjDetails'])) ? "PJ" : "PF";
}
export function pendenciasFichaSolar(lead: LeadSolar): string[] {
  const ficha = lead['ficha'] || {};
  const pj = tipoFichaSolar(lead) === "PJ";
  const campos = pj ? [...titular, ["razaoSocial", "Razão social"], ["cnpj", "CNPJ"]] : titular;
  const docs = pj ? [...docsTitular, ["cartaoCnpj", "Cartão CNPJ"], ["contratoSocial", "Contrato Social ou CCMEI"]] : docsTitular;
  return [
    ...campos.filter(([key]) => !key || typeof ficha[key] !== "string" || !ficha[key].trim()).map(([, label]) => String(label)),
    ...docs.filter(([key]) => !key || !urlPdfSegura(lead['documentos']?.[key]?.url)).map(([, label]) => String(label)),
  ];
}
export function pendenciasSolicitacaoSolar(lead: LeadSolar): string[] {
  const f = lead['ficha'] || {};
  return [
    !(f.nomeCompleto || lead['nomeRepresentante'] || lead['nomeEmpresa']) && "Nome",
    !(f.email || lead['email']) && "E-mail",
    !(f.telefone || lead['telefone']) && "Telefone",
    !urlPdfSegura(lead['documentos']?.contaLuz?.url) && "Conta de luz",
  ].filter((p): p is string => typeof p === "string");
}
export function urlPdfSegura(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
export function validarPdfSimulacao(file: { size: number; type: string; name: string }): string | null {
  if (file.size <= 0 || file.size >= MAX_PDF_SIMULACAO) return "O PDF deve ter menos de 15 MB.";
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) return "Anexe uma proposta em PDF.";
  return null;
}
export interface OfertaEnergia {
  id: string; pacoteId: string; tipo: "gd" | "alugsol"; empresa: string;
  desconto: string; economia: string; locacao: string; regras: string;
  pdfUrl: string; pdfNome: string; criadaEm: string;
}
export function validarOfertasEnergia(ofertas: OfertaEnergia[]): string | null {
  if (!ofertas.length) return "Adicione pelo menos uma oferta.";
  for (const o of ofertas) {
    if (!o.empresa.trim() || !o.regras.trim() || !urlPdfSegura(o.pdfUrl)) return "Toda oferta precisa de empresa, regras operacionais e PDF.";
    if (o.empresa.length > 200 || o.regras.length > 10000) return "Reduza o nome da empresa ou as regras operacionais.";
    if (!["gd", "alugsol"].includes(o.tipo)) return "Tipo de oferta inválido.";
  }
  return null;
}