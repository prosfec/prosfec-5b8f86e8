// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, UploadCloud, Eye, Download, Trash2, RefreshCw, Loader2, FileText, Save } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { toast } from "sonner";

/**
 * Ficha cadastral + documentos do lead solar (coleção leads_energia).
 * Renderizada fora do layout (portal) com paleta própria para manter
 * contraste nos modos Claro e Escuro Tecnológico.
 */

const MAX_BYTES = 15 * 1024 * 1024;
const TIPOS_ACEITOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export const FICHA_CAMPOS = [
  { key: "nomeCompleto", label: "Nome completo", type: "text" },
  { key: "cpf", label: "CPF", type: "text" },
  { key: "email", label: "E-mail do titular", type: "email" },
  { key: "telefone", label: "Telefone", type: "tel" },
  { key: "estadoCivil", label: "Estado civil", type: "select" },
  { key: "profissao", label: "Profissão", type: "text" },
] as const;

export const FICHA_DOCUMENTOS = [
  { key: "rgFrente", label: "RG/CNH (Frente)" },
  { key: "rgVerso", label: "RG/CNH (Verso)" },
  { key: "contaLuz", label: "Conta de Luz (Bem legível)" },
] as const;

const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"];

export function fichaDocumentosEnviados(lead: any): number {
  const docs = lead?.documentos || {};
  return FICHA_DOCUMENTOS.filter((d) => docs[d.key]?.url).length;
}

function usePaleta() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark
    ? { bg: "#111827", surface: "#1F2937", border: "#374151", text: "#F9FAFB", muted: "#D1D5DB", soft: "#9CA3AF", input: "#0B1220", header: "#0A3D2E", ok: "#34D399", okBg: "rgba(16,185,129,0.15)", warn: "#FBBF24", warnBg: "rgba(251,191,36,0.12)", danger: "#F87171" }
    : { bg: "#FFFFFF", surface: "#F8FAFC", border: "#CBD5E1", text: "#0F172A", muted: "#334155", soft: "#64748B", input: "#FFFFFF", header: "#0A3D2E", ok: "#047857", okBg: "#ECFDF5", warn: "#B45309", warnBg: "#FFFBEB", danger: "#DC2626" };
}

interface Props {
  lead: any;
  podeEditar: boolean; // parceiro: edita dados e anexos; ADM: somente leitura/download
  onClose: () => void;
  onUpdated?: (updates: Record<string, any>) => void;
}

export default function FichaLeadEnergiaModal({ lead, podeEditar, onClose, onUpdated }: Props) {
  const p = usePaleta();
  const [ficha, setFicha] = useState<Record<string, string>>(() => ({ ...(lead?.ficha || {}) }));
  const [documentos, setDocumentos] = useState<Record<string, any>>(() => ({ ...(lead?.documentos || {}) }));
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<{ slot: string; pct: number } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const salvarFicha = async () => {
    setSalvando(true);
    try {
      const limpa = Object.fromEntries(FICHA_CAMPOS.map((c) => [c.key, String(ficha[c.key] || "").trim()]));
      const updates = { ficha: limpa, fichaAtualizadaEm: new Date().toISOString() };
      await updateDoc(doc(db, "leads_energia", lead.id), updates);
      onUpdated?.(updates);
      toast.success("Ficha salva.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar a ficha. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const enviarArquivo = async (slot: string, file?: File) => {
    if (!file) return;
    if (!TIPOS_ACEITOS.includes(file.type)) return toast.error("Envie PDF ou foto (JPG, PNG ou WEBP).");
    if (file.size > MAX_BYTES) return toast.error("O arquivo excede o limite de 15 MB.");
    const anterior = documentos[slot];
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `documentos_energia/${lead.id}/${slot}_${Date.now()}.${ext}`;
    setEnviando({ slot, pct: 0 });
    try {
      const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
      await new Promise<void>((resolve, reject) =>
        task.on("state_changed", (s) => setEnviando({ slot, pct: Math.round((s.bytesTransferred / s.totalBytes) * 100) }), reject, () => resolve())
      );
      const url = await getDownloadURL(task.snapshot.ref);
      const registro = { url, path, nome: file.name, tipo: file.type, enviadoEm: new Date().toISOString() };
      const novos = { ...documentos, [slot]: registro };
      await updateDoc(doc(db, "leads_energia", lead.id), { [`documentos.${slot}`]: registro });
      setDocumentos(novos);
      onUpdated?.({ documentos: novos });
      if (anterior?.path) deleteObject(ref(storage, anterior.path)).catch(() => {});
      toast.success("Documento anexado.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar o arquivo. Tente novamente.");
    } finally {
      setEnviando(null);
    }
  };

  const excluirArquivo = async (slot: string) => {
    const atual = documentos[slot];
    if (!atual || !confirm("Excluir este documento?")) return;
    try {
      const novos = { ...documentos };
      delete novos[slot];
      await updateDoc(doc(db, "leads_energia", lead.id), { documentos: novos });
      setDocumentos(novos);
      onUpdated?.({ documentos: novos });
      if (atual.path) deleteObject(ref(storage, atual.path)).catch(() => {});
      toast.success("Documento excluído.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível excluir o documento.");
    }
  };

  const baixar = async (d: any) => {
    try {
      const blob = await (await fetch(d.url)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = d.nome || "documento";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      window.open(d.url, "_blank", "noopener");
    }
  };

  const campoStyle = { backgroundColor: p.input, color: p.text, borderColor: p.border };
  const btnSec = { backgroundColor: p.surface, color: p.text, borderColor: p.border };

  const conteudo = (
    <div
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(2,6,23,0.65)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Ficha e documentos do lead"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl border text-left"
        style={{ backgroundColor: p.bg, borderColor: p.border, color: p.text }}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ backgroundColor: p.header }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#A7F3D0" }}>Ficha & Documentos</p>
            <h3 className="font-extrabold text-base truncate" style={{ color: "#FFFFFF" }}>{lead?.nomeEmpresa || "Lead solar"}</h3>
            <p className="text-[11px] font-medium" style={{ color: "#D1FAE5" }}>
              {podeEditar ? "Preencha os dados e anexe os documentos. Pendências chegam pelo Histórico de Movimentações." : "Conferência da Mesa: visualize e baixe os documentos."}
            </p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="p-1.5 rounded-lg cursor-pointer hover:opacity-80" style={{ color: "#FFFFFF" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Dados do titular */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wide" style={{ color: p.muted }}>Dados do titular</h4>
            {FICHA_CAMPOS.map((c) => (
              <label key={c.key} className="block space-y-1">
                <span className="text-[11px] font-bold" style={{ color: p.muted }}>{c.label}</span>
                {!podeEditar ? (
                  <p className="text-sm font-semibold rounded-lg border px-3 py-2 break-words" style={{ ...campoStyle, backgroundColor: p.surface }}>
                    {ficha[c.key] || <span style={{ color: p.soft }}>Não informado</span>}
                  </p>
                ) : c.type === "select" ? (
                  <select value={ficha[c.key] || ""} onChange={(e) => setFicha({ ...ficha, [c.key]: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none" style={campoStyle}>
                    <option value="">Selecione</option>
                    {ESTADOS_CIVIS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={c.type} value={ficha[c.key] || ""} onChange={(e) => setFicha({ ...ficha, [c.key]: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none" style={campoStyle} />
                )}
              </label>
            ))}
            {podeEditar && (
              <button type="button" onClick={salvarFicha} disabled={salvando} className="w-full mt-1 px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60" style={{ backgroundColor: "#047857", color: "#FFFFFF" }}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar dados
              </button>
            )}
          </section>

          {/* Documentos */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wide" style={{ color: p.muted }}>Documentos ({fichaDocumentosEnviados({ documentos })}/3)</h4>
            {FICHA_DOCUMENTOS.map((d) => {
              const arq = documentos[d.key];
              const ocupado = enviando?.slot === d.key;
              return (
                <div key={d.key} className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: p.surface, borderColor: p.border }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold" style={{ color: p.text }}>{d.label}</p>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={arq ? { color: p.ok, backgroundColor: p.okBg } : { color: p.warn, backgroundColor: p.warnBg }}>
                      {arq ? "Enviado" : "Aguardando anexo"}
                    </span>
                  </div>
                  {arq && (
                    <p className="text-[11px] font-medium flex items-center gap-1 min-w-0" style={{ color: p.muted }}>
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{arq.nome}</span>
                      <span className="shrink-0" style={{ color: p.soft }}>• {arq.enviadoEm ? new Date(arq.enviadoEm).toLocaleDateString("pt-BR") : ""}</span>
                    </p>
                  )}
                  {ocupado && (
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: p.border }}>
                      <div className="h-full" style={{ width: `${enviando.pct}%`, backgroundColor: "#10B981" }} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {arq && (
                      <>
                        <a href={arq.url} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1" style={btnSec}>
                          <Eye className="w-3.5 h-3.5" /> Visualizar
                        </a>
                        <button type="button" onClick={() => baixar(arq)} className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer" style={btnSec}>
                          <Download className="w-3.5 h-3.5" /> Baixar
                        </button>
                      </>
                    )}
                    {podeEditar && (
                      <>
                        <input ref={(el) => (inputs.current[d.key] = el)} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; enviarArquivo(d.key, f); }} />
                        <button type="button" disabled={!!enviando} onClick={() => inputs.current[d.key]?.click()} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60" style={{ backgroundColor: "#047857", color: "#FFFFFF" }}>
                          {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : arq ? <RefreshCw className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
                          {arq ? "Substituir" : "Anexar"}
                        </button>
                        {arq && (
                          <button type="button" disabled={!!enviando} onClick={() => excluirArquivo(d.key)} className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60" style={{ ...btnSec, color: p.danger }}>
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] font-medium" style={{ color: p.soft }}>PDF ou foto (JPG, PNG, WEBP) de até 15 MB.</p>
          </section>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(conteudo, document.body) : null;
}
