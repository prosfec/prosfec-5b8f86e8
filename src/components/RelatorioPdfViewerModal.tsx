// @ts-nocheck
import React, { useEffect, useState } from "react";
import { X, ShieldCheck, Download, ExternalLink, Clock, FileText, AlertCircle } from "lucide-react";
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
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const url: string = consulta?.relatorioPdfUrl || "";

  useEffect(() => {
    setLoaded(false);
    setLoadFailed(false);
    if (!isOpen || !url || isMobile) return;
    const timer = window.setTimeout(() => {
      setLoaded((ok) => {
        if (!ok) setLoadFailed(true);
        return ok;
      });
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [isOpen, url, isMobile]);

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

  const acoes = (
    <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex-1 px-4 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        Abrir relatório
      </a>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={downloadName}
        className="flex-1 px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        Baixar PDF
      </a>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white text-slate-800 w-full sm:max-w-5xl h-[100dvh] sm:h-auto rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-slate-200 overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[94vh] text-left">
        <div className="bg-slate-900 text-white px-3 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold text-[11px] sm:text-xs uppercase tracking-wider font-mono text-emerald-400 block">
                PROSFEC DIAGNÓSTICO 360
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                {titular}
                {documento ? ` • ${documento}` : ""}
                {data ? ` • ${data}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {url && !isMobile && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden md:inline text-[11px] font-bold">Nova aba</span>
                </a>
                <a
                  href={url}
                  download={downloadName}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
                  title="Baixar PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline text-[11px] font-bold">Baixar</span>
                </a>
              </>
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

        <div className="flex-1 bg-slate-100 overflow-y-auto">
          {!url ? (
            <div className="min-h-[60vh] h-full flex flex-col items-center justify-center gap-3 text-center px-6 py-10">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Relatório em preparação pela equipe
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                A consulta já foi executada. Assim que a equipe PROSFEC anexar o relatório
                oficial em PDF, ele ficará disponível aqui para visualização e download.
              </p>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                PROSFEC DIAGNÓSTICO 360
              </span>
            </div>
          ) : isMobile || loadFailed ? (
            <div className="min-h-[60vh] h-full flex flex-col items-center justify-center gap-4 text-center px-6 py-10">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                {loadFailed && !isMobile ? (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                ) : (
                  <FileText className="w-8 h-8 text-emerald-600" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  {loadFailed && !isMobile
                    ? "Não foi possível exibir aqui"
                    : "Relatório disponível"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Toque em um dos botões abaixo para abrir o relatório oficial no leitor de PDF
                  do seu aparelho ou salvar o arquivo.
                </p>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {titular}
                {documento ? ` • ${documento}` : ""}
                {data ? ` • ${data}` : ""}
              </div>
              {acoes}
              <span className="text-[10px] text-slate-400 font-mono">
                PROSFEC DIAGNÓSTICO 360
              </span>
            </div>
          ) : (
            <iframe
              src={url}
              title="PROSFEC DIAGNÓSTICO 360"
              onLoad={() => setLoaded(true)}
              className="w-full h-[78vh] border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatorioPdfViewerModal;
