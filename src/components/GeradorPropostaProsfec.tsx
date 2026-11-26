import { useState } from "react";
import { FileDown, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import type { LeadSolar } from "../lib/validacaoFichaSolar";

const n = (v: string) => Number(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) || 0;
const s = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Gera a Proposta Comercial PROSFEC (4 lâminas) e entrega o PDF pronto para o envio da oferta. */
export default function GeradorPropostaProsfec({ lead, desconto, onGerado }: { lead: LeadSolar; desconto: string; onGerado: (arquivo: File, desconto: string, economia: string) => void }) {
  const ficha = (lead['ficha'] || {}) as Record<string, unknown>;
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [f, setF] = useState(() => ({
    cliente: s(lead['razaoSocial'] || lead['nomeEmpresa'] || ficha['nomeCompleto'] || lead['nome']),
    documento: s(lead['cnpj'] || ficha['cpf'] || ficha['cnpj']),
    cidadeUf: [s(lead['cidade']), s(lead['estado'])].filter(Boolean).join(" - "),
    distribuidora: s(ficha['distribuidora'] || ficha['concessionaria'] || lead['distribuidora']),
    consumo: s(lead['consumoKwhMes']), tarifa: "", desconto: desconto.replace("%", ""), disponibilidade: "", iluminacao: "",
    assessorNome: s(lead['parceiroNome']), assessorWhatsapp: "", validade: "10",
  }));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(prev => ({ ...prev, [k]: e.target.value }));

  async function gerar() {
    setErro("");
    if (!f.cliente.trim() || n(f.consumo) <= 0 || n(f.tarifa) <= 0 || n(f.desconto) <= 0 || n(f.desconto) >= 100) { setErro("Informe cliente, consumo, tarifa e desconto (entre 0 e 100%)."); return; }
    setGerando(true);
    try {
      const { gerarPropostaProsfecPdf, calcularPropostaProsfec } = await import("../lib/propostaProsfecPdf");
      const dados = { consumoKwh: n(f.consumo), tarifa: n(f.tarifa), descontoPct: n(f.desconto), disponibilidade: n(f.disponibilidade), iluminacao: n(f.iluminacao) };
      const numero = String(Date.now()).slice(-6);
      const bytes = await gerarPropostaProsfecPdf({ ...dados, cliente: f.cliente.trim(), documento: f.documento.trim(), cidadeUf: f.cidadeUf.trim(), distribuidora: f.distribuidora.trim(), assessorNome: f.assessorNome.trim(), assessorWhatsapp: f.assessorWhatsapp.trim(), validadeDias: Math.max(1, Math.min(90, n(f.validade) || 10)), numero, emissao: new Date() });
      const nome = `Proposta_PROSFEC_${f.cliente.trim().replace(/[^\p{L}\d]+/gu, "_").slice(0, 60)}.pdf`;
      const arquivo = new File([bytes as BlobPart], nome, { type: "application/pdf" });
      const eco = calcularPropostaProsfec(dados).economiaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      onGerado(arquivo, `${f.desconto}%`, eco);
      const url = URL.createObjectURL(arquivo); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000);
      setAberto(false);
    } catch { setErro("Não foi possível gerar a proposta. Tente novamente."); }
    finally { setGerando(false); }
  }

  if (!aberto) return <div className="simulacao-full"><Button type="button" variant="outline" className="simulacao-button" onClick={() => setAberto(true)}><Sparkles /> Gerar Proposta PROSFEC (PDF automático)</Button></div>;
  const campo = (k: keyof typeof f, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => <label>{rotulo}<input value={f[k]} onChange={set(k)} maxLength={200} {...extra} /></label>;
  return <div className="simulacao-full simulacao-editor">
    <div className="simulacao-editor-head"><h3>Proposta Comercial PROSFEC</h3></div>
    <div className="simulacao-campos">
      <label className="simulacao-full">Cliente / Razão Social<input value={f.cliente} onChange={set("cliente")} maxLength={200} /></label>
      {campo("documento", "CPF / CNPJ")}{campo("cidadeUf", "Cidade / UF")}
      {campo("distribuidora", "Distribuidora")}{campo("consumo", "Consumo médio (kWh/mês)", { inputMode: "decimal" })}
      {campo("tarifa", "Tarifa (R$/kWh)", { inputMode: "decimal", placeholder: "0,98" })}{campo("desconto", "Desconto (%)", { inputMode: "decimal" })}
      {campo("disponibilidade", "Custo de disponibilidade (R$)", { inputMode: "decimal" })}{campo("iluminacao", "Iluminação pública (R$)", { inputMode: "decimal" })}
      {campo("assessorNome", "Assessor responsável")}{campo("assessorWhatsapp", "WhatsApp do assessor")}
      {campo("validade", "Validade (dias)", { inputMode: "numeric" })}
    </div>
    {erro && <p className="simulacao-error" role="alert">{erro}</p>}
    <div className="simulacao-actions">
      <Button type="button" variant="outline" className="simulacao-button" disabled={gerando} onClick={() => setAberto(false)}>Fechar</Button>
      <Button type="button" className="simulacao-primary" disabled={gerando} onClick={gerar}>{gerando ? <Loader2 className="animate-spin" /> : <FileDown />} Gerar e anexar PDF</Button>
    </div>
  </div>;
}
