// @ts-nocheck
import React, { useRef, useState } from "react";
import { UploadCloud, Trash2, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db, auth, storage, createNotification } from "../firebase";

interface RelatorioPdfUploaderProps {
  consulta: any;
  onUpdated?: () => void;
}

const MAX_BYTES = 15 * 1024 * 1024;

export const RelatorioPdfUploader: React.FC<RelatorioPdfUploaderProps> = ({
  consulta,
  onUpdated,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasPdf = Boolean(consulta?.relatorioPdfUrl);
  const storagePath = `relatorios_consultas/${consulta?.id}.pdf`;

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file) return;

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
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file, {
        contentType: "application/pdf",
      });

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
          },
          (err) => reject(err),
          () => resolve(),
        );
      });

      const url = await getDownloadURL(task.snapshot.ref);
      const agora = new Date().toISOString();

      await updateDoc(doc(db, "consultas_realizadas", consulta.id), {
        relatorioPdfUrl: url,
        relatorioPdfNome: file.name,
        relatorioPdfTamanho: file.size,
        relatorioPdfEnviadoEm: agora,
        relatorioPdfEnviadoPor: auth.currentUser?.email || "equipe",
      });

      if (consulta.partnerId) {
        await createNotification(
          consulta.partnerId,
          "parceiro",
          "Relatório de crédito disponível",
          `O relatório PROSFEC DIAGNÓSTICO 360 do documento ${consulta.documento || ""} já está disponível na ficha do lead.`,
          "success",
        );
      }

      setSuccess("Relatório anexado com sucesso.");
      onUpdated?.();
    } catch (err: any) {
      console.error("Erro ao enviar relatório PDF:", err);
      setError(
        err?.code === "storage/unauthorized"
          ? "Sem permissão para enviar o arquivo. Verifique as regras de armazenamento."
          : "Não foi possível enviar o arquivo. Tente novamente.",
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remover o relatório anexado desta consulta?")) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (err: any) {
        if (err?.code !== "storage/object-not-found") throw err;
      }
      await updateDoc(doc(db, "consultas_realizadas", consulta.id), {
        relatorioPdfUrl: deleteField(),
        relatorioPdfNome: deleteField(),
        relatorioPdfTamanho: deleteField(),
        relatorioPdfEnviadoEm: deleteField(),
        relatorioPdfEnviadoPor: deleteField(),
      });
      setSuccess("Relatório removido.");
      onUpdated?.();
    } catch (err) {
      console.error("Erro ao remover relatório PDF:", err);
      setError("Não foi possível remover o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
          Relatório oficial (PDF) — equipe
        </span>
        {hasPdf && (
          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
            Anexado
          </span>
        )}
      </div>

      {hasPdf && (
        <div className="text-[10px] text-slate-500 font-mono truncate">
          {consulta.relatorioPdfNome || "relatorio.pdf"}
          {consulta.relatorioPdfEnviadoEm
            ? ` • ${new Date(consulta.relatorioPdfEnviadoEm).toLocaleString("pt-BR")}`
            : ""}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleSelect}
        className="hidden"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : hasPdf ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <UploadCloud className="w-3.5 h-3.5" />
          )}
          {uploading
            ? `Enviando ${progress}%`
            : hasPdf
              ? "Substituir PDF"
              : "Anexar PDF"}
        </button>

        {hasPdf && (
          <button
            type="button"
            disabled={uploading}
            onClick={handleRemove}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover
          </button>
        )}
      </div>

      {uploading && progress > 0 && (
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {success}
        </div>
      )}
    </div>
  );
};

export default RelatorioPdfUploader;
