import { useMemo } from "react";
import { Sparkles, Zap, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { DISTRIBUIDORAS, recomendarUsinas, type DistribuidoraId, type UsinaCompativel } from "../lib/catalogoUsinas";

export interface PerfilPainel { distribuidora: DistribuidoraId | ""; consumo: string; placa: boolean; valorFatura?: number }

export default function PainelUsinasRecomendadas({ perfil, onPerfil, alvos, alvo, onAlvo, onAplicar, disabled }: {
  perfil: PerfilPainel; onPerfil: (p: PerfilPainel) => void;
  alvos: { id: string; rotulo: string }[]; alvo: string; onAlvo: (id: string) => void;
  onAplicar: (u: UsinaCompativel) => void; disabled?: boolean;
}) {
  const consumo = Number(perfil.consumo.replace(/\./g, "").replace(",", "."));
  const { compativeis, recusadas } = useMemo(() => recomendarUsinas({ distribuidora: perfil.distribuidora || null, consumoKwh: consumo, possuiPlaca: perfil.placa, ...(perfil.valorFatura ? { valorFatura: perfil.valorFatura } : {}) }), [perfil, consumo]);
  const [melhor, ...outras] = compativeis;
  const rotuloAlvo = alvos.find(a => a.id === alvo)?.rotulo ?? "oferta";
  return <section className="usinas-painel" aria-label="Análise de usinas para este lead">
    <p className="simulacao-eyebrow"><Zap size={12} /> ANÁLISE DE USINAS PARA ESTE LEAD</p>
    <div className="usinas-perfil">
      <label>Distribuidora<select value={perfil.distribuidora} disabled={disabled} onChange={e => onPerfil({ ...perfil, distribuidora: e.target.value as DistribuidoraId | "" })}>
        <option value="">Selecione</option>
        {DISTRIBUIDORAS.map(d => <option key={d.id} value={d.id}>{d.nome} ({d.uf})</option>)}
      </select></label>
      <label>Consumo (kWh/mês)<input inputMode="decimal" value={perfil.consumo} disabled={disabled} maxLength={12} onChange={e => onPerfil({ ...perfil, consumo: e.target.value })} /></label>
      <label>Placa solar<select value={perfil.placa ? "sim" : "nao"} disabled={disabled} onChange={e => onPerfil({ ...perfil, placa: e.target.value === "sim" })}><option value="nao">Não</option><option value="sim">Sim</option></select></label>
      {alvos.length > 1 && <label>Aplicar em<select value={alvo} disabled={disabled} onChange={e => onAlvo(e.target.value)}>{alvos.map(a => <option key={a.id} value={a.id}>{a.rotulo}</option>)}</select></label>}
    </div>
    {!perfil.distribuidora ? <p className="simulacao-muted">Selecione a distribuidora do cliente para ver as usinas que atendem.</p>
      : !melhor ? <p className="usinas-vazio" role="status"><AlertTriangle size={16} /> Nenhuma usina GD atende este perfil{recusadas[0] ? ` (ex.: ${recusadas[0].nome}: ${recusadas[0].motivo.toLowerCase()})` : ""}. Sugestão: ofertar AlugSol (locação de usina).</p>
      : <>
        <div className="usinas-melhor">
          <p className="usinas-selo"><Sparkles size={14} /> RECOMENDADA PARA ESTE PERFIL</p>
          <div className="usinas-melhor-linha">
            <div className="min-w-0"><h3>{melhor.nome} · {melhor.desconto}% de desconto</h3><p className="simulacao-muted">{melhor.fatura} · {melhor.detalhe}{melhor.descontoMaximo > melhor.desconto ? ` · até ${melhor.descontoMaximo}%` : ""}{melhor.sobAnalise ? " · sob análise (placa solar)" : ""}</p></div>
            <Button type="button" className="simulacao-primary whitespace-normal" disabled={disabled || !alvos.length} onClick={() => onAplicar(melhor)}><Zap /> Aplicar na {rotuloAlvo}</Button>
          </div>
        </div>
        {outras.length > 0 && <div><p className="simulacao-muted">Outras usinas compatíveis:</p><div className="usinas-outras">{outras.map(u => <Button key={u.nome} type="button" variant="outline" className="simulacao-button" disabled={disabled || !alvos.length} title={`${u.fatura} · ${u.detalhe}`} onClick={() => onAplicar(u)}>{u.nome} ({u.desconto}%)</Button>)}</div></div>}
      </>}
  </section>;
}
