import { useState } from "react";
import { CheckCircle2, Download, Lock, Zap, FileText, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { pendenciasFichaSolar, pendenciasSolicitacaoSolar, urlPdfSegura, type LeadSolar, type OfertaEnergia } from "../lib/validacaoFichaSolar";
import { escolherPropostaEnergia, solicitarCotacaoEnergia } from "../lib/simulacoesEnergia";

export function CardPropostasChatEnergia({ lead, ofertaIds, assessor = false, autor = "Assessor", onUpdated }: { lead: LeadSolar; ofertaIds: unknown; assessor?: boolean; autor?: string; onUpdated: (lead: LeadSolar) => void }) {
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const ids = Array.isArray(ofertaIds) ? ofertaIds.filter((id): id is string => typeof id === "string") : [];
  const pendencias = pendenciasFichaSolar(lead);
  const escolhido = lead['propostaEnergiaEscolhida']?.ofertaId;
  const fechado = ["concluido", "arquivado", "cancelado"].includes(lead['status']);
  async function escolher(o: OfertaEnergia) {
    if (saving || !window.confirm(`Confirmar a proposta de ${o.empresa}? A Mesa receberá sua escolha para dar continuidade ao contrato.`)) return;
    setSaving(o.id); setError("");
    try { onUpdated(await escolherPropostaEnergia(String(lead['id']), o.id, autor)); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível selecionar a proposta."); }
    finally { setSaving(""); }
  }
  return <div className="simulacoes-chat" translate="no">
    <div className="simulacao-pacote-head"><Zap size={16} /><span>Simulações da Mesa</span><span className="simulacao-muted">{ids.length} ofertas</span></div>
    {ids.map(id => {
      const o: OfertaEnergia | undefined = lead['ofertasEnergia']?.[id];
      if (!o || typeof o.empresa !== "string" || !urlPdfSegura(o.pdfUrl)) return <p key={id} className="simulacao-error">Proposta indisponível. Consulte a Mesa.</p>;
      const selecionada = escolhido === id;
      return <article key={id} className={`simulacao-card ${selecionada ? "simulacao-selecionada" : ""}`}>
        <div className="simulacao-card-top"><span className="simulacao-eyebrow">{o.tipo === "alugsol" ? "LOCAÇÃO · ALUGSOL" : "GERAÇÃO DISTRIBUÍDA"}</span>{selecionada && <span className="simulacao-selo"><CheckCircle2 size={14} /> Selecionada</span>}</div>
        <h3>{o.empresa}</h3>
        <div className="simulacao-indicadores">
          {typeof o.desconto === "string" && o.desconto && <div><span>{o.tipo === "gd" ? "Desconto estimado" : "Economia / Projeção"}</span><strong>{o.desconto}{o.tipo === "gd" && !o.desconto.includes("%") ? "%" : ""}</strong></div>}
          {typeof o.economia === "string" && o.economia && <div><span>Economia mensal estimada</span><strong>{o.economia.includes("R$") ? o.economia : `R$ ${o.economia}`}</strong></div>}
          {typeof o.locacao === "string" && o.locacao && <div><span>Locação mensal</span><strong>{o.locacao.includes("R$") ? o.locacao : `R$ ${o.locacao}`}</strong></div>}
        </div>
        <div className="simulacao-actions"><Button asChild variant="outline" size="sm" className="simulacao-button"><a href={o.pdfUrl} target="_blank" rel="noopener noreferrer"><Download /> Proposta PDF</a></Button></div>
        <details className="simulacao-regras"><summary><FileText size={14} /> Roteiro e regras operacionais</summary><p>{typeof o.regras === "string" ? o.regras : "Consulte a Mesa."}</p></details>
        {assessor && !escolhido && !fechado && <>
          {pendencias.length > 0 && <details className="simulacao-pendencias"><summary><Lock size={14} /> {pendencias.length} pendências para selecionar</summary><ul>{pendencias.map(p => <li key={p}>{p}</li>)}</ul></details>}
          <Button size="sm" className="simulacao-primary w-full whitespace-normal" disabled={pendencias.length > 0 || !!saving} onClick={() => escolher(o)}>{saving === id ? <Loader2 className="animate-spin" /> : pendencias.length ? <Lock /> : <CheckCircle2 />} Escolher esta proposta</Button>
        </>}
        {escolhido && !selecionada && <p className="simulacao-muted">Outra oferta foi selecionada.</p>}
      </article>;
    })}
    {error && <p role="alert" className="simulacao-error">{error}</p>}
  </div>;
}

export function SolicitarCotacaoEnergia({ lead, autor, onUpdated }: { lead: LeadSolar; autor: string; onUpdated: (lead: LeadSolar) => void }) {
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const pendencias = pendenciasSolicitacaoSolar(lead);
  const solicitada = lead['cotacaoEnergiaStatus'] === "solicitada";
  if (["concluido", "arquivado", "cancelado"].includes(lead['status']) || lead['propostaEnergiaEscolhida']) return null;
  async function solicitar() {
    if (saving) return;
    setSaving(true); setErro("");
    try { onUpdated(await solicitarCotacaoEnergia(String(lead['id']), autor)); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível solicitar a cotação."); }
    finally { setSaving(false); }
  }
  return <div className="simulacao-solicitar">
    <Button size="sm" className="simulacao-primary w-full whitespace-normal" disabled={saving || solicitada || pendencias.length > 0} onClick={solicitar}>{saving ? <Loader2 className="animate-spin" /> : <Zap />} {solicitada ? "Aguardando simulações da Mesa" : "Solicitar cotação à Mesa"}</Button>
    {pendencias.length > 0 && <p className="simulacao-muted">Pendente: {pendencias.join(", ")}.</p>}
    {erro && <p role="alert" className="simulacao-error">{erro}</p>}
  </div>;
}