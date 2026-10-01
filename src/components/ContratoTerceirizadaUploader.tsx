// @ts-nocheck
import React, { useRef, useState } from "react";
import { UploadCloud, Trash2, Loader2, CheckCircle2, AlertCircle, RefreshCw, FileText, ExternalLink } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db, auth, storage } from "../firebase";

const MAX_BYTES = 15 * 1024 * 1024;

interface Props {
  lead: any;
  onUpdated?: (patch: Record<string, any>) => void;
}

/** Anexo do contrato de assessoria emitido pela empresa terceirizada (PDF). */
export default function ContratoTerceirizadaUploader({ lead, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, any>>({});

  const url = local.contratoTerceirizadaUrl ?? lead?.contratoTerceirizadaUrl;
  const nome = local.contratoTerceirizadaNome ?? lead?.contratoTerceirizadaNome;
  const enviadoEm = local.contratoTerceirizadaEnviadoEm ?? lead?.contratoTerceirizadaEnviadoEm;
  const storagePath = `contratos_terceirizada/${lead?.id}.pdf`;

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file || !lead?.id) return;
    setError(null);
    setSuccess(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecione um arquivo em formato PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("O arquivo excede o limite de 15 MB.");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const task = uploadBytesResumable(ref(storage, storagePath), file, { contentType: "application/pdf" });
      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve(),
        );
      });
      const downloadUrl = await getDownloadURL(task.snapshot.ref);
      const patch = {
        contratoTerceirizadaUrl: downloadUrl,
        contratoTerceirizadaNome: file.name,
        contratoTerceirizadaEnviadoEm: new Date().toISOString(),
        contratoTerceirizadaEnviadoPor: auth.currentUser?.email || "equipe",
      };
      await updateDoc(doc(db, "leads", lead.id), patch);
      setLocal(patch);
      onUpdated?.(patch);
      setSuccess("Contrato da terceirizada anexado com sucesso.");
    } catch (err: any) {
      console.error("Erro ao anexar contrato da terceirizada:", err);
      setError(
        err?.code === "storage/unauthorized"
          ? "Sem permissão para enviar o arquivo."
          : "Não foi possível enviar o arquivo. Tente novamente.",
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remover o contrato da terceirizada anexado?")) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (err: any) {
        if (err?.code !== "storage/object-not-found") throw err;
      }
      await updateDoc(doc(db, "leads", lead.id), {
        contratoTerceirizadaUrl: deleteField(),
        contratoTerceirizadaNome: deleteField(),
        contratoTerceirizadaEnviadoEm: deleteField(),
        contratoTerceirizadaEnviadoPor: deleteField(),
      });
      const cleared = { contratoTerceirizadaUrl: "", contratoTerceirizadaNome: "", contratoTerceirizadaEnviadoEm: "" };
      setLocal(cleared);
      onUpdated?.(cleared);
      setSuccess("Contrato removido.");
    } catch (err) {
      console.error("Erro ao remover contrato da terceirizada:", err);
      setError("Não foi possível remover o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          Contrato da Terceirizada / Assessoria Externa
        </h4>
        {url && (
          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
            Anexado
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        O contrato de assessoria é emitido diretamente pela empresa terceirizada. Anexe aqui o PDF assinado para histórico.
      </p>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 hover:underline truncate"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {nome || "contrato.pdf"}
          {enviadoEm ? ` • ${new Date(enviadoEm).toLocaleString("pt-BR")}` : ""}
        </a>
      )}

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleSelect} className="hidden" />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="h-9 px-4 rounded-xl bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-60 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : url ? <RefreshCw className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
          {uploading ? `Enviando ${progress}%` : url ? "Substituir PDF" : "Anexar PDF"}
        </button>
        {url && (
          <button
            type="button"
            disabled={uploading}
            onClick={handleRemove}
            className="h-9 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover
          </button>
        )}
      </div>

      {error && (
        <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {success}
        </div>
      )}
    </div>
  );
}
