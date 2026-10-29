// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, UploadCloud, Eye, Download, Trash2, RefreshCw, Loader2, FileText, Save, User, Building2, ShieldCheck, Image as ImageIcon, Mail, Phone, Heart, Briefcase, IdCard, Hash } from "lucide-react";

const ICONES_CAMPO: Record<string, any> = {
  nomeCompleto: User, cpf: IdCard, razaoSocial: Building2, cnpj: Hash,
  email: Mail, telefone: Phone, estadoCivil: Heart, profissao: Briefcase,
};
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

const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "União Estável", "Divorciado(a)", "Viúvo(a)"];

const CAMPOS_TITULAR = [
  { key: "email", label: "E-mail do titular", type: "email" },
  { key: "telefone", label: "Telefone", type: "tel" },
  { key: "estadoCivil", label: "Estado civil", type: "select" },
  { key: "profissao", label: "Profissão", type: "text" },
];

export const FICHA_CAMPOS_PF = [
  { key: "nomeCompleto", label: "Nome completo", type: "text" },
  { key: "cpf", label: "CPF", type: "text" },
  ...CAMPOS_TITULAR,
];

export const FICHA_CAMPOS_PJ = [
  { key: "razaoSocial", label: "Razão Social", type: "text" },
  { key: "cnpj", label: "CNPJ", type: "text" },
  { key: "nomeCompleto", label: "Nome do sócio/representante", type: "text" },
  { key: "cpf", label: "CPF do titular", type: "text" },
  ...CAMPOS_TITULAR,
];

const DOC_ADICIONAIS = { key: "adicionais", label: "Arquivos adicionais (Opcional)", opcional: true };

export const FICHA_DOCUMENTOS_PF = [
  { key: "rgFrente", label: "RG/CNH (Frente)" },
  { key: "rgVerso", label: "RG/CNH (Verso)" },
  { key: "contaLuz", label: "Conta de Luz (Bem legível)" },
  DOC_ADICIONAIS,
];

export const FICHA_DOCUMENTOS_PJ = [
  { key: "cartaoCnpj", label: "Cartão CNPJ" },
  { key: "contratoSocial", label: "Contrato Social ou CCMEI" },
  { key: "contaLuz", label: "Conta de Luz (Bem legível)" },
  { key: "rgFrente", label: "RG/CNH do Sócio/Titular (Frente)" },
  { key: "rgVerso", label: "RG/CNH do Sócio/Titular (Verso)" },
  DOC_ADICIONAIS,
];

export function fichaTipo(lead: any): "PF" | "PJ" {
  const t = lead?.ficha?.tipo;
  if (t === "PF" || t === "PJ") return t;
  return lead?.cnpj || lead?.cnpjDetails ? "PJ" : "PF";
}

const docsDoTipo = (tipo: string) => (tipo === "PJ" ? FICHA_DOCUMENTOS_PJ : FICHA_DOCUMENTOS_PF);

export function fichaDocumentosTotal(lead: any): number {
  return docsDoTipo(fichaTipo(lead)).filter((d: any) => !d.opcional).length;
}

export function fichaDocumentosEnviados(lead: any): number {
  const docs = lead?.documentos || {};
  return docsDoTipo(fichaTipo(lead)).filter((d: any) => !d.opcional && docs[d.key]?.url).length;
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
    ? { dark: true, bg: "#0B111A", surface: "#131C2E", border: "#1E2E42", text: "#FFFFFF", value: "#F1F5F9", muted: "#94A3B8", soft: "#64748B", input: "#0A101D", inputBorder: "#1E2E42", btn: "#1E293B", btnBorder: "#334155", btnText: "#E2E8F0", ok: "#34D399", okBg: "rgba(16,185,129,0.12)", okBorder: "rgba(52,211,153,0.35)", warn: "#FBBF24", warnBg: "rgba(245,158,11,0.10)", warnBorder: "rgba(251,191,36,0.35)", danger: "#F87171", ring: "rgba(16,185,129,0.25)", seg: "#0A101D", shadow: "0 30px 80px -20px rgba(16,185,129,0.18), 0 20px 50px -20px rgba(0,0,0,0.8)" }
    : { dark: false, bg: "#FFFFFF", surface: "#F8FAFC", border: "#E2E8F0", text: "#0F172A", value: "#1E293B", muted: "#475569", soft: "#64748B", input: "#FFFFFF", inputBorder: "#CBD5E1", btn: "#FFFFFF", btnBorder: "#CBD5E1", btnText: "#334155", ok: "#065F46", okBg: "#ECFDF5", okBorder: "#A7F3D0", warn: "#92400E", warnBg: "#FFFBEB", warnBorder: "#FDE68A", danger: "#DC2626", ring: "rgba(5,150,105,0.15)", seg: "#F1F5F9", shadow: "0 30px 80px -24px rgba(15,23,42,0.35), 0 8px 24px -12px rgba(15,23,42,0.15)" };
}

interface Props {
  lead: any;
  podeEditar: boolean; // parceiro: edita dados e anexos; ADM: somente leitura/download
  onClose: () => void;
  onUpdated?: (updates: Record<string, any>) => void;
}

export default function FichaLeadEnergiaModal({ lead, podeEditar, onClose, onUpdated }: Props) {
  const p = usePaleta();
  const [ficha, setFicha] = useState<Record<string, string>>(() => {
    const cd = lead?.cnpjDetails || {};
    return {
      ...(lead?.ficha || {}),
      tipo: fichaTipo(lead),
      razaoSocial: lead?.ficha?.razaoSocial || cd.razao_social || cd.razaoSocial || "",
      cnpj: lead?.ficha?.cnpj || cd.cnpj || lead?.cnpj || "",
    };
  });
  const tipo = ficha.tipo === "PJ" ? "PJ" : "PF";
  const CAMPOS = tipo === "PJ" ? FICHA_CAMPOS_PJ : FICHA_CAMPOS_PF;
  const DOCS = docsDoTipo(tipo);
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
      const limpa: Record<string, string> = { ...(lead?.ficha || {}), tipo };
      CAMPOS.forEach((c) => { limpa[c.key] = String(ficha[c.key] || "").trim(); });
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

  const campoStyle = { backgroundColor: p.input, color: p.value, borderColor: p.inputBorder, "--ring": p.ring } as any;
  const btnSec = { backgroundColor: p.btn, color: p.btnText, borderColor: p.btnBorder };
  const btnPrim = { background: "linear-gradient(135deg,#059669,#047857)", color: "#FFFFFF", boxShadow: "0 6px 18px -6px rgba(5,150,105,0.55)" };
  const enviados = fichaDocumentosEnviados({ documentos, ficha: { tipo } });
  const total = fichaDocumentosTotal({ ficha: { tipo } });
  const pct = total ? Math.round((enviados / total) * 100) : 0;
  const completo = enviados >= total;
  const inputCls = "w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none transition-shadow focus:shadow-[0_0_0_4px_var(--ring)]";
  const actBtn = "h-8 px-3 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed";

  const conteudo = (
    <div
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-md"
      style={{ backgroundColor: "rgba(2,6,23,0.7)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Ficha e documentos do lead"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-t-3xl md:rounded-[28px] overflow-hidden border text-left"
        style={{ backgroundColor: p.bg, borderColor: p.border, color: p.text, boxShadow: p.shadow }}
      >
        {/* Cabeçalho dossiê */}
        <div className="relative px-6 pt-5 pb-5 overflow-hidden" style={{ background: "linear-gradient(135deg,#042217 0%,#0A3D2E 60%,#0E4D3A 100%)" }}>
          <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle,rgba(52,211,153,0.22),transparent 70%)" }} />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#6EE7B7" }}>PROSFEC Energy • Dossiê Cadastral</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ color: "#D1FAE5", borderColor: "rgba(167,243,208,0.3)", backgroundColor: "rgba(255,255,255,0.06)" }}>
                  {podeEditar ? "Modo Preenchimento" : "Auditoria & Conferência"}
                </span>
              </div>
              <h3 className="font-bold text-xl tracking-tight truncate" style={{ color: "#FFFFFF" }}>{lead?.nomeEmpresa || "Lead solar"}</h3>
              <p className="text-xs" style={{ color: "rgba(209,250,229,0.8)" }}>
                {podeEditar ? "Preencha os dados e anexe os documentos. Pendências chegam pelo Histórico de Movimentações." : "Conferência da Mesa: visualize e baixe os documentos."}
              </p>
            </div>
            <button type="button" aria-label="Fechar" onClick={onClose} className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/15" style={{ color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.08)" }}>
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="relative mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span style={{ color: "#D1FAE5" }}>{pct}% concluído • {enviados} de {total} documentos anexados</span>
              <span className="px-2 py-0.5 rounded-full" style={completo ? { color: "#042217", backgroundColor: "#6EE7B7" } : { color: "#FDE68A", backgroundColor: "rgba(251,191,36,0.15)" }}>
                {completo ? "Dossiê Completo" : "Pendente Documentação"}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#10B981,#6EE7B7)", boxShadow: "0 0 12px rgba(110,231,183,0.6)" }} />
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-5 md:p-6 space-y-5">
          {/* Categoria PF / PJ */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: p.muted }}>Categoria do cliente</p>
              {podeEditar && <p className="text-[11px]" style={{ color: p.soft }}>Ao trocar a categoria, clique em "Salvar dados cadastrais".</p>}
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border md:min-w-[340px]" style={{ backgroundColor: p.seg, borderColor: p.border }}>
              {[{ v: "PF", l: "Pessoa Física", i: User }, { v: "PJ", l: "Pessoa Jurídica", i: Building2 }].map((o) => {
                const ativo = tipo === o.v;
                const Ic = o.i;
                return (
                  <button key={o.v} type="button" disabled={!podeEditar} aria-pressed={ativo} onClick={() => setFicha({ ...ficha, tipo: o.v })}
                    className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default transition-all"
                    style={ativo ? { ...btnPrim } : { color: p.muted, opacity: podeEditar ? 1 : 0.55 }}>
                    <Ic className="w-3.5 h-3.5" /> {o.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Dados cadastrais */}
            <section className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: p.surface, borderColor: p.border }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.okBg, color: p.ok }}><ShieldCheck className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: p.text }}>{tipo === "PJ" ? "Dados da empresa e titular" : "Dados do titular"}</h4>
                  <p className="text-[11px]" style={{ color: p.soft }}>Informações cadastrais do cliente</p>
                </div>
              </div>
              <div className="space-y-3">
                {CAMPOS.map((c) => {
                  const Ic = ICONES_CAMPO[c.key] || FileText;
                  return (
                    <label key={c.key} className="block space-y-1.5">
                      <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: p.muted }}><Ic className="w-3.5 h-3.5" />{c.label}</span>
                      {!podeEditar ? (
                        <p className="text-sm font-medium rounded-xl border px-3.5 py-2.5 break-words" style={{ ...campoStyle, backgroundColor: p.bg }}>
                          {ficha[c.key] || <span style={{ color: p.soft }}>Não informado</span>}
                        </p>
                      ) : c.type === "select" ? (
                        <select value={ficha[c.key] || ""} onChange={(e) => setFicha({ ...ficha, [c.key]: e.target.value })} className={inputCls} style={campoStyle}>
                          <option value="">Selecione</option>
                          {ESTADOS_CIVIS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={c.type} value={ficha[c.key] || ""} onChange={(e) => setFicha({ ...ficha, [c.key]: e.target.value })} className={inputCls} style={campoStyle} />
                      )}
                    </label>
                  );
                })}
              </div>
              {podeEditar && (
                <button type="button" onClick={salvarFicha} disabled={salvando} className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98] disabled:opacity-60" style={btnPrim}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar dados cadastrais
                </button>
              )}
            </section>

            {/* Documentos */}
            <section className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: p.surface, borderColor: p.border }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.okBg, color: p.ok }}><FileText className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: p.text }}>Custódia de documentos</h4>
                    <p className="text-[11px]" style={{ color: p.soft }}>PDF ou foto (JPG, PNG, WEBP) até 15 MB</p>
                  </div>
                </div>
                <span className="text-xs font-bold tabular-nums" style={{ color: p.text }}>{enviados}/{total}</span>
              </div>
              <div className="space-y-2.5">
                {DOCS.map((d: any) => {
                  const arq = documentos[d.key];
                  const ocupado = enviando?.slot === d.key;
                  const isPdf = arq?.tipo === "application/pdf" || /\.pdf$/i.test(arq?.nome || "");
                  const TipoIc = arq ? (isPdf ? FileText : ImageIcon) : UploadCloud;
                  return (
                    <div key={d.key} className="rounded-xl border p-3.5 space-y-3 transition-colors" style={{ backgroundColor: p.bg, borderColor: arq ? p.okBorder : p.border }}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border"
                          style={arq ? (isPdf ? { color: "#DC2626", backgroundColor: p.dark ? "rgba(220,38,38,0.12)" : "#FEF2F2", borderColor: p.dark ? "rgba(248,113,113,0.3)" : "#FECACA" } : { color: p.ok, backgroundColor: p.okBg, borderColor: p.okBorder }) : { color: p.soft, backgroundColor: p.surface, borderColor: p.border, borderStyle: "dashed" }}>
                          <TipoIc className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold" style={{ color: p.text }}>{d.label}</p>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5"
                              style={arq ? { color: p.ok, backgroundColor: p.okBg, borderColor: p.okBorder } : d.opcional ? { color: p.muted, backgroundColor: p.surface, borderColor: p.border } : { color: p.warn, backgroundColor: p.warnBg, borderColor: p.warnBorder }}>
                              {arq && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: p.ok }} />}
                              {arq ? "Anexado" : d.opcional ? "Opcional" : "Aguardando anexo"}
                            </span>
                          </div>
                          {arq && (
                            <p className="text-[11px] flex items-center gap-1 min-w-0 mt-0.5" style={{ color: p.muted }}>
                              <span className="truncate">{arq.nome}</span>
                              {arq.enviadoEm && <span className="shrink-0" style={{ color: p.soft }}>• {new Date(arq.enviadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      {ocupado && (
                        <div className="space-y-1">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: p.border }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${enviando.pct}%`, background: "linear-gradient(90deg,#059669,#34D399)" }} />
                          </div>
                          <p className="text-[10px] font-semibold tabular-nums" style={{ color: p.ok }}>Enviando… {enviando.pct}%</p>
                        </div>
                      )}
                      {(arq || podeEditar) && (
                        <div className="flex flex-wrap gap-1.5">
                          {arq && (
                            <>
                              <a href={arq.url} target="_blank" rel="noreferrer" className={actBtn} style={btnSec}><Eye className="w-3.5 h-3.5" /> Visualizar</a>
                              <button type="button" onClick={() => baixar(arq)} className={actBtn} style={btnSec}><Download className="w-3.5 h-3.5" /> Baixar</button>
                            </>
                          )}
                          {podeEditar && (
                            <>
                              <input ref={(el) => (inputs.current[d.key] = el)} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; enviarArquivo(d.key, f); }} />
                              <button type="button" disabled={!!enviando} onClick={() => inputs.current[d.key]?.click()} className={actBtn} style={{ ...btnPrim, borderColor: "transparent" }}>
                                {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : arq ? <RefreshCw className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
                                {arq ? "Substituir" : "Anexar"}
                              </button>
                              {arq && (
                                <button type="button" disabled={!!enviando} onClick={() => excluirArquivo(d.key)} className={actBtn} style={{ ...btnSec, color: p.danger }}>
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(conteudo, document.body) : null;
}
