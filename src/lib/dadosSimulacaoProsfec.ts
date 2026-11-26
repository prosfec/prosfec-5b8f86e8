import type { DadosPropostaProsfec } from "./propostaProsfecPdf";
import { calcularPropostaProsfec } from "./propostaProsfecPdf";
import type { LeadSolar } from "./validacaoFichaSolar";

export interface CamposPropostaSolar {
  cliente: string; documento: string; cidadeUf: string; distribuidora: string;
  consumo: string; tarifa: string; disponibilidade: string; iluminacao: string;
  assessorNome: string; assessorWhatsapp: string; validade: string;
}
export type PropostaSolarSnapshot = Omit<DadosPropostaProsfec, "emissao"> & { emissao: string };
export const numeroSolar = (v: string) => {
  const value = v.replace(/R\$/g, "").replace(/[%\s]/g, "");
  if (!value || !/^-?[\d.,]+$/.test(value)) return Number.NaN;
  return Number(value.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
};
const texto = (v: unknown) => typeof v === "string" || typeof v === "number" ? String(v) : "";

export function camposPropostaSolar(lead: LeadSolar): CamposPropostaSolar {
  const f = lead['ficha'] || {};
  const pj = f.tipo === "PJ" || (f.tipo !== "PF" && !!lead['cnpj']);
  return {
    cliente: texto(pj ? f.razaoSocial || lead['razaoSocial'] || lead['nomeEmpresa'] : f.nomeCompleto || lead['nome'] || lead['nomeEmpresa']),
    documento: texto(pj ? f.cnpj || lead['cnpj'] : f.cpf),
    cidadeUf: [texto(lead['cidade']), texto(lead['estado'])].filter(Boolean).join(" - "),
    distribuidora: texto(f.distribuidora || f.concessionaria || lead['distribuidora']),
    consumo: texto(lead['consumoKwhMes']), tarifa: "", disponibilidade: "", iluminacao: "",
    assessorNome: texto(lead['parceiroNome']), assessorWhatsapp: texto(lead['parceiroWhatsapp']), validade: "10",
  };
}

export function prepararPropostaSolar(campos: CamposPropostaSolar, oferta: { id: string; tipo: "gd" | "alugsol"; empresa: string; desconto: string; economia: string; locacao: string }, emissao: string): PropostaSolarSnapshot {
  const consumoKwh = numeroSolar(campos.consumo), tarifa = numeroSolar(campos.tarifa);
  const descontoPct = oferta.tipo === "gd" ? numeroSolar(oferta.desconto) : 0;
  const disponibilidade = numeroSolar(campos.disponibilidade || "0"), iluminacao = numeroSolar(campos.iluminacao || "0");
  const validadeDias = numeroSolar(campos.validade);
  if (!campos.cliente.trim() || !Number.isFinite(consumoKwh) || consumoKwh <= 0 || !Number.isFinite(tarifa) || tarifa <= 0 || !Number.isFinite(consumoKwh * tarifa)) throw new Error("Informe cliente, consumo e tarifa para a proposta automática.");
  if (oferta.tipo === "gd" && (!Number.isFinite(descontoPct) || descontoPct <= 0 || descontoPct >= 100)) throw new Error("Informe desconto maior que 0 e menor que 100%.");
  if (![disponibilidade, iluminacao].every(v => Number.isFinite(v) && v >= 0)) throw new Error("Os custos fixos devem ser valores válidos, iguais ou maiores que zero.");
  if (!Number.isInteger(validadeDias) || validadeDias < 1 || validadeDias > 90) throw new Error("Informe validade de 1 a 90 dias.");
  const base = { cliente: campos.cliente.trim(), documento: campos.documento.trim(), cidadeUf: campos.cidadeUf.trim(), distribuidora: campos.distribuidora.trim(), consumoKwh, tarifa, descontoPct, disponibilidade, iluminacao, assessorNome: campos.assessorNome.trim(), assessorWhatsapp: campos.assessorWhatsapp.trim(), validadeDias, numero: oferta.id, emissao, empresa: oferta.empresa.trim(), modalidade: oferta.tipo };
  if (oferta.tipo === "alugsol") {
    const economiaMensalLocacao = numeroSolar(oferta.economia), locacaoMensal = numeroSolar(oferta.locacao);
    if (!Number.isFinite(economiaMensalLocacao) || economiaMensalLocacao <= 0 || !Number.isFinite(locacaoMensal) || locacaoMensal < 0 || economiaMensalLocacao + locacaoMensal > consumoKwh * tarifa || !oferta.locacao.trim()) throw new Error("Informe locação e economia mensal líquida válidas para AlugSol.");
    return { ...base, economiaMensalLocacao, locacaoMensal };
  }
  const calculada = calcularPropostaProsfec(base).economiaMensal;
  if (oferta.economia.trim() && (!Number.isFinite(numeroSolar(oferta.economia)) || Math.abs(numeroSolar(oferta.economia) - calculada) > 0.01)) throw new Error("A economia informada difere do consumo × tarifa × desconto. Confira os dados antes de enviar.");
  return base;
}

export function economiaPropostaSolar(dados: PropostaSolarSnapshot) {
  return calcularPropostaProsfec(dados).economiaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}