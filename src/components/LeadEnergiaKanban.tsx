import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MapPin, Send, X, Zap } from "lucide-react";
import { fichaDocumentosEnviados, fichaDocumentosTotal } from "./FichaLeadEnergiaModal";

/**
 * Card compacto do Kanban solar (ADM e Assessor) + caixa flutuante com a visão completa.
 * O card mostra só o essencial; clique abre o detalhe. Atalhos de WhatsApp e Proposta
 * não abrem o detalhe (stopPropagation).
 */

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  atendimento: "Em Atendimento",
  concluido: "Concluído",
  arquivado: "Cancelado",
  cancelado: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  concluido: "bg-emerald-100 text-emerald-800 border-emerald-200",
  atendimento: "bg-blue-100 text-blue-800 border-blue-200",
  arquivado: "bg-slate-200 text-slate-600 border-slate-300",
  cancelado: "bg-slate-200 text-slate-600 border-slate-300",
  novo: "bg-amber-100 text-amber-800 border-amber-200",
};

export function nomeCurtoLeadEnergia(lead: any): string {
  const pessoa = String(lead?.ficha?.nomeCompleto || "").trim();
  if (pessoa) return pessoa.split(/\s+/)[0];
  return String(lead?.nomeEmpresa || lead?.nome || "Lead").trim();
}

interface CompactoProps {
  lead: any;
  novidade: boolean;
  onOpen: () => void;
  whatsappUrl?: string | null;
  onProposta?: (() => void) | null;
  extra?: ReactNode;
}

export function LeadEnergiaCardCompacto({ lead, novidade, onOpen, whatsappUrl, onProposta, extra }: CompactoProps) {
  const status = lead?.status || "novo";
  const enviados = fichaDocumentosEnviados(lead);
  const total = fichaDocumentosTotal(lead);
  const completo = total > 0 && enviados >= total;
  const local = [lead?.cidade, lead?.estado].filter(Boolean).join(" / ");
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="relative bg-white border border-slate-200 rounded-xl p-3 space-y-2 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
    >
      {novidade && (
        <span className="absolute -top-1 -right-1 z-10 flex w-3 h-3" title="Novidade no Chat operacional" aria-label="Novidade no Chat operacional">
          <span className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping" style={{ backgroundColor: "#EF4444" }} />
          <span className="relative inline-flex w-3 h-3 rounded-full border-2" style={{ backgroundColor: "#DC2626", borderColor: "#FFFFFF" }} />
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="font-extrabold text-sm text-slate-800 line-clamp-1 min-w-0">{nomeCurtoLeadEnergia(lead)}</p>
        <span className={`shrink-0 border font-extrabold px-1.5 py-0.5 rounded-full text-[9px] uppercase ${STATUS_STYLE[status] || STATUS_STYLE.novo}`}>
          {STATUS_LABEL[status] || status}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold text-slate-500">
        {lead?.ramo && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-extrabold text-[9px] truncate max-w-[140px]">{lead.ramo}</span>}
        {local && <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3 text-slate-400" />{local}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${completo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
          📋 {enviados}/{total}
        </span>
        <div className="flex items-center gap-1">
          {extra}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="WhatsApp"
              aria-label="Abrir WhatsApp"
              className="w-7 h-7 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
            </a>
          )}
          {onProposta && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onProposta(); }}
              title="Gerar Proposta"
              aria-label="Gerar Proposta"
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-700 text-amber-300 flex items-center justify-center cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LeadEnergiaDetalheModal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-6"
      style={{ backgroundColor: "rgba(4,29,22,0.6)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative my-auto w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ backgroundColor: "#0A3D2E" }}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#B7F34A" }}>PROSFEC Energy · Lead</p>
            <p className="text-sm font-extrabold truncate" style={{ color: "#FFFFFF" }}>{titulo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 sm:p-4 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
