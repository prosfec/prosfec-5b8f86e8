// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Zap, User, Phone, Lightbulb, CalendarClock, UploadCloud, FileText, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { validarQualificacao, formatarCelular, type QualificacaoValida } from "../lib/qualificacaoAtendimento";

const TIPOS_ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 15 * 1024 * 1024;

function agoraLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function mascaraReais(texto: string): string {
  const d = String(texto || "").replace(/\D/g, "").slice(0, 10);
  if (!d) return "";
  return (Number(d) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  place: any;
  salvando: boolean;
  onCancel: () => void;
  onConfirm: (dados: QualificacaoValida, fatura: File | null) => void;
}

export default function ModalQualificacaoAtendimento({ place, salvando, onCancel, onConfirm }: Props) {
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [conta, setConta] = useState("");
  const [data, setData] = useState(agoraLocal);
  const [fatura, setFatura] = useState<File | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const inputArquivo = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !salvando && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, salvando]);

  const escolherArquivo = (f?: File) => {
    if (!f) return;
    if (!TIPOS_ACEITOS.includes(f.type)) return setErros((e) => ({ ...e, fatura: "Envie PDF ou foto (JPG, PNG ou WEBP)." }));
    if (f.size > MAX_BYTES) return setErros((e) => ({ ...e, fatura: "O arquivo excede o limite de 15 MB." }));
    setErros((e) => ({ ...e, fatura: "" }));
    setFatura(f);
  };

  const confirmar = () => {
    if (salvando) return;
    const r = validarQualificacao({ nomeDecisor: nome, whatsapp: fone, mediaConta: conta, dataAtendimento: data });
    if (!r.ok) return setErros(r.erros as any);
    setErros({});
    onConfirm(r.dados, fatura);
  };

  const cnpj = place?.cnpjDetails?.cnpj || place?.cnpj || "";
  const local = [place?.cidade, place?.estado].filter(Boolean).join("/");
  const campo = "w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500";
  const rotulo = "block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1";
  const Erro = ({ k }: { k: string }) => (erros[k] ? <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">{erros[k]}</p> : null);

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => !salvando && onCancel()}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-[#ffffff] dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-[#0A3D2E] via-[#0D5C43] to-[#00A86B] px-5 py-4 text-white flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-amber-300 fill-current" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Qualificação de primeiro atendimento</p>
            <h3 className="font-extrabold text-base leading-tight truncate">{place?.nome || "Empresa"}</h3>
            <p className="text-[11px] text-emerald-100/90 truncate">{[cnpj && `CNPJ ${cnpj}`, local].filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" onClick={onCancel} disabled={salvando} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-white/15 disabled:opacity-50"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-900 dark:text-amber-200">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Este lead só entra na sua esteira comercial após o registro do primeiro contato com o tomador de decisão.</span>
          </div>

          <div>
            <label className={rotulo}>1. Nome do sócio / representante *</label>
            <div className="relative"><User className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-300" />
              <input className={campo} value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Marcos Vinícius da Silva" /></div>
            <Erro k="nomeDecisor" />
          </div>

          <div>
            <label className={rotulo}>2. Telefone / WhatsApp direto do decisor *</label>
            <div className="relative"><Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-300" />
              <input className={campo} inputMode="tel" value={fone} onChange={(e) => setFone(formatarCelular(e.target.value))} placeholder="(98) 99123-4567" /></div>
            <Erro k="whatsapp" />
          </div>

          <div>
            <label className={rotulo}>3. Média da conta de energia (R$) *</label>
            <div className="relative"><Lightbulb className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-300" />
              <span className="absolute left-9 top-2.5 text-sm font-semibold text-slate-500 dark:text-slate-300">R$</span>
              <input className={`${campo} pl-16`} inputMode="numeric" value={conta} onChange={(e) => setConta(mascaraReais(e.target.value))} placeholder="3.850,00" /></div>
            <Erro k="mediaConta" />
          </div>

          <div>
            <label className={rotulo}>4. Data e horário do atendimento realizado *</label>
            <div className="flex gap-2">
              <div className="relative flex-1"><CalendarClock className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-300" />
                <input type="datetime-local" className={campo} value={data} max={agoraLocal()} onChange={(e) => setData(e.target.value)} /></div>
              <button type="button" onClick={() => setData(agoraLocal())} className="px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap">Agora</button>
            </div>
            <Erro k="dataAtendimento" />
          </div>

          <div>
            <label className={rotulo}>5. Conta de energia recente (opcional · PDF ou foto)</label>
            <input ref={inputArquivo} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { escolherArquivo(e.target.files?.[0]); e.target.value = ""; }} />
            {fatura ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5">
                <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 truncate flex-1">{fatura.name}</span>
                <button type="button" onClick={() => setFatura(null)} aria-label="Remover arquivo" className="p-1 rounded-md text-slate-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => inputArquivo.current?.click()}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); escolherArquivo(e.dataTransfer.files?.[0]); }}
                className="w-full flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 px-3 py-4 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-700">
                <UploadCloud className="w-5 h-5" />
                <span className="text-xs font-semibold">Clique ou arraste a fatura, se o cliente já enviou</span>
              </button>
            )}
            <Erro k="fatura" />
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button type="button" onClick={onCancel} disabled={salvando} className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={confirmar} disabled={salvando} className="py-2.5 px-5 rounded-xl bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md disabled:opacity-60">
            {salvando ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando qualificação...</> : <><Zap className="w-3.5 h-3.5 text-amber-300 fill-current" /> Confirmar e migrar lead</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
