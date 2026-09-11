// @ts-nocheck
import React from "react";
import { X, ShieldCheck, Download, ExternalLink, Clock, FileText } from "lucide-react";

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
  if (!isOpen || !consulta) return null;

  const url: string = consulta.relatorioPdfUrl || "";
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white text-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] text-left">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold text-xs uppercase tracking-wider font-mono text-emerald-400 block">
                PROSFEC DIAGNÓSTICO 360
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                {titular}
                {documento ? ` • ${documento}` : ""}
                {data ? ` • ${data}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {url && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px] font-bold">Nova aba</span>
                </a>
                <a
                  href={url}
                  download={`PROSFEC_DIAGNOSTICO_360_${(documento || "relatorio").replace(/\D/g, "")}.pdf`}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
                  title="Baixar PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px] font-bold">Baixar</span>
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 overflow-hidden">
          {url ? (
            <iframe
              src={url}
              title="PROSFEC DIAGNÓSTICO 360"
              className="w-full h-[78vh] border-0 bg-white"
            />
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-6">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatorioPdfViewerModal;
