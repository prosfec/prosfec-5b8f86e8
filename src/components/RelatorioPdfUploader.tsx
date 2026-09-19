// @ts-nocheck
import React, { useRef, useState } from "react";
import { UploadCloud, Trash2, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db, auth, storage, createNotification } from "../firebase";
import { Button } from "@/components/ui/button";

interface RelatorioPdfUploaderProps {
  consulta: any;
  onUpdated?: () => void;
  variant?: "antes" | "depois";
  recipientId?: string;
  compact?: boolean;
}

const MAX_BYTES = 15 * 1024 * 1024;

export const RelatorioPdfUploader: React.FC<RelatorioPdfUploaderProps> = ({
  consulta,
  onUpdated,
  variant = "antes",
  recipientId,
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDepois = variant === "depois";
  const fieldPrefix = isDepois ? "relatorioDepoisPdf" : "relatorioPdf";
  const pdfUrl = consulta?.[`${fieldPrefix}Url`];
  const pdfNome = consulta?.[`${fieldPrefix}Nome`];
  const pdfEnviadoEm = consulta?.[`${fieldPrefix}EnviadoEm`];
  const hasPdf = Boolean(pdfUrl);
  const storagePath = isDepois
    ? `relatorios_consultas/${consulta?.id}_depois.pdf`
    : `relatorios_consultas/${consulta?.id}.pdf`;

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
        [`${fieldPrefix}Url`]: url,
        [`${fieldPrefix}Nome`]: file.name,
        [`${fieldPrefix}Tamanho`]: file.size,
        [`${fieldPrefix}EnviadoEm`]: agora,
        [`${fieldPrefix}EnviadoPor`]: auth.currentUser?.email || "equipe",
      });

      const notificationRecipient = recipientId || consulta.partnerId;
      if (notificationRecipient && notificationRecipient !== "admin") {
        await createNotification(
          notificationRecipient,
          "parceiro",
          isDepois ? "Resultado final disponível" : "Relatório de crédito disponível",
          isDepois
            ? `O relatório final do documento ${consulta.documento || ""} já está disponível no Passo 7.`
            : `O relatório PROSFEC DIAGNÓSTICO 360 do documento ${consulta.documento || ""} já está disponível na ficha do lead.`,
          "success",
        );
      }

      setSuccess(isDepois ? "Resultado final anexado com sucesso." : "Relatório anexado com sucesso.");
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
        [`${fieldPrefix}Url`]: deleteField(),
        [`${fieldPrefix}Nome`]: deleteField(),
        [`${fieldPrefix}Tamanho`]: deleteField(),
        [`${fieldPrefix}EnviadoEm`]: deleteField(),
        [`${fieldPrefix}EnviadoPor`]: deleteField(),
      });
      setSuccess(isDepois ? "Resultado final removido." : "Relatório removido.");
      onUpdated?.();
    } catch (err) {
      console.error("Erro ao remover relatório PDF:", err);
      setError("Não foi possível remover o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={compact ? "space-y-2 border-t border-line-soft pt-3" : "space-y-2 rounded-xl border border-line-soft bg-surface-raised p-3"}>
      {!compact && <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
          {isDepois ? "Resultado final (PDF) — equipe" : "Relatório oficial (PDF) — equipe"}
        </span>
        {hasPdf && (
          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
            Anexado
          </span>
        )}
      </div>}

      {hasPdf && !compact && (
        <div className="text-[10px] text-slate-500 font-mono truncate">
          {pdfNome || "relatorio.pdf"}
          {pdfEnviadoEm
            ? ` • ${new Date(pdfEnviadoEm).toLocaleString("pt-BR")}`
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
        <Button
          type="button"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="h-8 rounded-lg bg-brand-primary px-3 text-[10px] font-black uppercase tracking-wider hover:bg-brand-accent"
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
        </Button>

        {hasPdf && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
            className="h-8 rounded-lg border-rose-200 bg-rose-50 px-3 text-[10px] font-black uppercase tracking-wider text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover
          </Button>
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
