// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { X, ShieldCheck, Download, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface RelatorioPdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: any;
  lead?: any;
}

export const RelatorioPdfViewerModal: React.FC<RelatorioPdfViewerModalProps> = ({
  isOpen,
  onClose,
  consulta,
  lead,
}) => {
  const isMobile = useIsMobile();
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const url: string = consulta?.relatorioPdfUrl || "";

  useEffect(() => {
    setPreviewLoaded(false);
    setPreviewFailed(false);

    if (!isOpen || !url || isMobile) return;

    fallbackTimerRef.current = window.setTimeout(() => {
      setPreviewFailed(true);
    }, 8000);

    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [isOpen, isMobile, url]);

  if (!isOpen || !consulta) return null;

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
  const showDownloadCard = Boolean(url) && (isMobile || previewFailed);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white text-slate-800 w-full sm:w-11/12 sm:max-w-6xl h-[100dvh] sm:h-auto rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-slate-200 overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[94vh] text-left">
        <div className="bg-slate-900 text-white px-3 sm:px-5 py-3 sm:py-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] sm:text-sm uppercase tracking-wider font-mono text-emerald-400 block truncate">
                Laudo Oficial PROSFEC DIAGNÓSTICO 360
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                {titular}
                {documento ? ` • ${documento}` : ""}
                {data ? ` • ${data}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download={downloadName}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 sm:px-4 sm:text-xs"
                title="Baixar PDF completo"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Baixar PDF Completo</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 overflow-y-auto flex items-center justify-center p-4 sm:p-5">
          {!url ? (
            <div className="min-h-[60vh] h-full flex flex-col items-center justify-center gap-3 text-center px-6 py-10">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Relatório em preparação pela equipe
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                A consulta já foi executada. Assim que a equipe PROSFEC anexar o relatório
                oficial em PDF, ele ficará disponível aqui para download.
              </p>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                PROSFEC DIAGNÓSTICO 360
              </span>
            </div>
          ) : showDownloadCard ? (
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center space-y-6">
              <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wider">
                  Laudo Oficial PROSFEC DIAGNÓSTICO 360
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  O documento abaixo contém o detalhamento oficial da consulta de crédito.
                  Baixe o PDF completo para visualizar todas as informações.
                </p>
              </div>

              <div className="text-[10px] sm:text-xs text-slate-500 font-mono space-y-0.5">
                <div className="font-semibold text-slate-700">{titular}</div>
                <div>{documento || "Documento não informado"}</div>
                {data ? <div>{data}</div> : null}
              </div>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download={downloadName}
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Baixar PDF Completo
              </a>

              <span className="block text-[10px] text-slate-400 font-mono">
                PROSFEC DIAGNÓSTICO 360
              </span>
            </div>
          ) : (
            <div className="relative h-[75vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {!previewLoaded && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <FileText className="h-9 w-9 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-600">
                      Carregando laudo oficial...
                    </span>
                  </div>
                </div>
              )}
              <iframe
                src={url}
                title="Laudo Oficial PROSFEC DIAGNÓSTICO 360"
                className="h-full w-full border-0"
                onLoad={() => {
                  if (fallbackTimerRef.current !== null) {
                    window.clearTimeout(fallbackTimerRef.current);
                    fallbackTimerRef.current = null;
                  }
                  setPreviewLoaded(true);
                }}
                onError={() => setPreviewFailed(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatorioPdfViewerModal;
