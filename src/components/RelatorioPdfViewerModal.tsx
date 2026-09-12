// @ts-nocheck
import React, { Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { X, ShieldCheck, Download, FileText, Loader2 } from "lucide-react";

const PdfDocumentViewer = React.lazy(() => import("./PdfDocumentViewer"));

interface RelatorioPdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: any;
  lead?: any;
}

const ViewerFallback = () => (
  <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 bg-slate-800">
    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
    <span className="text-xs font-bold text-slate-300">Carregando laudo oficial...</span>
  </div>
);

export const RelatorioPdfViewerModal: React.FC<RelatorioPdfViewerModalProps> = ({
  isOpen,
  onClose,
  consulta,
  lead,
}) => {
  if (!isOpen || !consulta) return null;

  const url: string = consulta?.relatorioPdfUrl || "";

  const titular =
    consulta.documentoNome ||
    consulta.titular ||
    lead?.razaoSocial ||
    lead?.nome ||
    "Titular não informado";
  const documento = consulta.documento || "";
  const data = consulta.dataConsulta
    ? new Date(consulta.dataConsulta).toLocaleString("pt-BR")
    : "";
  const downloadName = `PROSFEC_DIAGNOSTICO_360_${(documento || "relatorio").replace(/\D/g, "") || "relatorio"}.pdf`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-0 backdrop-blur-md sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-slate-900 text-left text-slate-100 shadow-2xl sm:h-[94vh] sm:max-h-[94vh] sm:w-11/12 sm:max-w-6xl sm:rounded-2xl sm:border sm:border-slate-800">
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-3 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <span className="block truncate font-mono text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 sm:text-sm">
                Laudo Oficial PROSFEC DIAGNÓSTICO 360
              </span>
              <span className="block truncate font-mono text-[10px] text-slate-400">
                {titular}
                {documento ? ` • ${documento}` : ""}
                {data ? ` • ${data}` : ""}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download={downloadName}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 sm:h-9 sm:px-4 sm:text-xs"
                title="Baixar PDF completo"
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Baixar PDF Completo</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-white sm:h-9 sm:w-9"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-800">
          {!url ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <FileText className="h-8 w-8 text-amber-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                Relatório em preparação pela equipe
              </h3>
              <p className="max-w-md text-xs text-slate-400">
                A consulta já foi executada. Assim que a equipe PROSFEC anexar o relatório
                oficial em PDF, ele ficará disponível aqui.
              </p>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                PROSFEC DIAGNÓSTICO 360
              </span>
            </div>
          ) : (
            <ClientOnly fallback={<ViewerFallback />}>
              <Suspense fallback={<ViewerFallback />}>
                <PdfDocumentViewer url={url} />
              </Suspense>
            </ClientOnly>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatorioPdfViewerModal;
