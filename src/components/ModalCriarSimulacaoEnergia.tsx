import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, Trash2, X, Send, Loader2, FileText, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { publicarSimulacoes, type OfertaDraft } from "../lib/simulacoesEnergia";
import CamposPropostaAutomatica from "./CamposPropostaAutomatica";
import { camposPropostaSolar } from "../lib/dadosSimulacaoProsfec";
import { validarPdfSimulacao, type LeadSolar } from "../lib/validacaoFichaSolar";
import PainelUsinasRecomendadas, { type PerfilPainel } from "./PainelUsinasRecomendadas";
import { identificarDistribuidora, nomeDistribuidora, regrasOfertaUsina, type UsinaCompativel } from "../lib/catalogoUsinas";

const novaOferta = (tipo: "gd" | "alugsol"): OfertaDraft => ({ id: crypto.randomUUID(), tipo, empresa: tipo === "alugsol" ? "AlugSol" : "", desconto: "", economia: "", locacao: "", regras: "", arquivo: null });
export default function ModalCriarSimulacaoEnergia({ lead, onClose, onUpdated }: { lead: LeadSolar; onClose: () => void; onUpdated: (lead: LeadSolar) => void }) {
  const [ofertas, setOfertas] = useState<OfertaDraft[]>(() => [{ ...novaOferta("gd"), proposta: camposPropostaSolar(lead) }]);
  const [pacoteId] = useState(() => crypto.randomUUID());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [perfil, setPerfil] = useState<PerfilPainel>(() => {
    const f = lead['ficha'] || {};
    const fatura = Number(lead['mediaContaReais']);
    return {
      distribuidora: identificarDistribuidora(f.distribuidora) || identificarDistribuidora(f.concessionaria) || identificarDistribuidora(lead['concessionaria']) || identificarDistribuidora(lead['distribuidora']) || "",
      consumo: lead['consumoKwhMes'] ? String(lead['consumoKwhMes']) : "",
      placa: f.possuiPlacaSolar === "Sim",
      ...(Number.isFinite(fatura) && fatura > 0 ? { valorFatura: fatura } : {}),
    };
  });
  const gds = ofertas.filter(o => o.tipo === "gd");
  const alvos = gds.map(o => ({ id: o.id, rotulo: `Oferta GD ${ofertas.indexOf(o) + 1}` }));
  const [alvoSel, setAlvoSel] = useState("");
  const alvo = alvos.some(a => a.id === alvoSel) ? alvoSel : (gds.find(o => !o.empresa.trim()) ?? gds[0])?.id ?? "";
  const aplicarUsina = (u: UsinaCompativel) => {
    const o = ofertas.find(x => x.id === alvo);
    if (!o) return;
    const distribuidora = perfil.distribuidora ? nomeDistribuidora(perfil.distribuidora) : "";
    alterar(o.id, { empresa: u.nome, desconto: String(u.desconto), economia: "", regras: regrasOfertaUsina(u), proposta: { ...(o.proposta || camposPropostaSolar(lead)), ...(distribuidora ? { distribuidora } : {}), ...(perfil.consumo.trim() ? { consumo: perfil.consumo.trim() } : {}) } });
  };
  const alterar = (id: string, updates: Partial<OfertaDraft>) => setOfertas(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (enviando) return;
    setEnviando(true); setErro("");
    try {
      const updated = await publicarSimulacoes(String(lead['id']), pacoteId, ofertas);
      onUpdated(updated); onClose();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível enviar. Tente novamente."); }
    finally { setEnviando(false); }
  }
  return <DialogPrimitive.Root open onOpenChange={open => { if (!open && !enviando) onClose(); }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="simulacao-overlay" />
      <DialogPrimitive.Content aria-describedby={undefined} className="simulacao-modal" translate="no" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (enviando) e.preventDefault(); }}>
        <header className="simulacao-modal-head">
          <div><p className="simulacao-eyebrow">MESA DE OPERAÇÕES</p><DialogPrimitive.Title asChild><h2><Zap size={20} /> Montar simulações</h2></DialogPrimitive.Title><p className="simulacao-muted break-words">{String(lead['nomeEmpresa'] || lead['ficha']?.nomeCompleto || "Lead")}</p></div>
          <Button type="button" variant="ghost" size="icon" title="Fechar" aria-label="Fechar simulações" disabled={enviando} onClick={onClose}><X /></Button>
        </header>
        <form onSubmit={enviar} className="simulacao-form">
          <PainelUsinasRecomendadas perfil={perfil} onPerfil={setPerfil} alvos={alvos} alvo={alvo} onAlvo={setAlvoSel} onAplicar={aplicarUsina} disabled={enviando} />
          <div className="simulacao-ofertas">
            {ofertas.map((o, index) => (
              <fieldset key={o.id} disabled={enviando} className="simulacao-editor">
                <div className="simulacao-editor-head"><h3>{o.tipo === "gd" ? `Oferta GD ${index + 1}` : "AlugSol · Locação"}</h3><Button type="button" variant="ghost" size="icon" title="Remover oferta" aria-label={`Remover oferta ${index + 1}`} onClick={() => setOfertas(prev => prev.filter(item => item.id !== o.id))}><Trash2 /></Button></div>
                <div className="simulacao-campos">
                  <label className="simulacao-full">Empresa / Usina<input required maxLength={200} value={o.empresa} onChange={e => alterar(o.id, { empresa: e.target.value })} /></label>
                  {o.tipo === "alugsol" && <label>Locação mensal (R$)<input value={o.locacao} maxLength={100} onChange={e => alterar(o.id, { locacao: e.target.value })} /></label>}
                  <label>{o.tipo === "gd" ? "Desconto (%)" : "Economia / Projeção"}<input maxLength={200} value={o.desconto} onChange={e => alterar(o.id, { desconto: e.target.value })} /></label>
                  <label>{o.tipo === "gd" && !o.arquivo ? "Economia mensal (R$) — calculada ao enviar" : o.tipo === "alugsol" ? "Economia mensal líquida (R$)" : "Economia mensal estimada (R$)"}<input maxLength={100} value={o.economia} onChange={e => alterar(o.id, { economia: e.target.value })} /></label>
                  {!o.arquivo && <CamposPropostaAutomatica campos={o.proposta || camposPropostaSolar(lead)} onChange={proposta => alterar(o.id, { proposta })} />}
                  <label className="simulacao-full">PDF próprio (opcional)<FileText size={16} /><input key={o.arquivo?.name || "sem-anexo"} type="file" accept="application/pdf,.pdf" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const error = validarPdfSimulacao(f); if (error) { setErro(error); e.target.value = ""; alterar(o.id, { arquivo: null }); return; } setErro(""); alterar(o.id, { arquivo: f }); }} />{o.arquivo && <span className="simulacao-muted break-words">{o.arquivo.name}</span>}</label>
                  {o.arquivo && <Button type="button" variant="outline" className="simulacao-button" onClick={() => alterar(o.id, { arquivo: null })}><Trash2 /> Remover PDF próprio</Button>}
                  <label className="simulacao-full">Roteiro e regras operacionais<textarea required rows={5} maxLength={10000} value={o.regras} onChange={e => alterar(o.id, { regras: e.target.value })} /></label>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="simulacao-actions">
            <Button type="button" variant="outline" className="simulacao-button" disabled={enviando} onClick={() => setOfertas(prev => [...prev, { ...novaOferta("gd"), proposta: prev[0]?.proposta || camposPropostaSolar(lead) }])}><Plus /> Outra oferta GD</Button>
            <label className="simulacao-check"><input type="checkbox" disabled={enviando} checked={ofertas.some(o => o.tipo === "alugsol")} onChange={e => setOfertas(prev => e.target.checked ? [...prev, { ...novaOferta("alugsol"), proposta: prev[0]?.proposta || camposPropostaSolar(lead) }] : prev.filter(o => o.tipo !== "alugsol"))} /> Incluir AlugSol</label>
          </div>
          {erro && <p className="simulacao-error" role="alert">{erro}</p>}
          <footer className="simulacao-footer"><Button type="button" variant="outline" className="simulacao-button" disabled={enviando} onClick={onClose}>Cancelar</Button><Button type="submit" className="simulacao-primary whitespace-normal" disabled={enviando || !ofertas.length}>{enviando ? <Loader2 className="animate-spin" /> : <Send />} {enviando ? "Enviando PDFs e simulações…" : "Enviar simulações ao assessor"}</Button></footer>
        </form>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}