// @ts-nocheck
import React, { useState } from "react";
import { Brain, CheckCircle2, Clock, Eye, FileText } from "lucide-react";
import { Lead } from "../types";
import { RedeBEReportViewerModal } from "./RedeBEReportViewerModal";

interface DiagnosticStep3ViewerProps {
  lead: Lead;
  consultas?: any[];
}

export const DiagnosticStep3Viewer: React.FC<DiagnosticStep3ViewerProps> = ({
  lead,
  consultas,
}) => {
  const [viewingConsulta, setViewingConsulta] = useState<any | null>(null);

  const listaConsultas: any[] = Array.isArray(consultas) && consultas.length > 0
    ? consultas
    : (Array.isArray((lead as any).consultasExecutadas) ? (lead as any).consultasExecutadas : []);

  if (listaConsultas.length === 0) {
    return (
      <div className="bg-white text-slate-800 rounded-xl border border-slate-200 p-5 md:p-6 space-y-4 text-left shadow-sm relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200/70">
              <Brain className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-display font-black text-sm md:text-base text-slate-900 uppercase tracking-wider">
                Passo 3: Consulta de Crédito CPF e CNPJ
              </h4>
              <p className="text-xs text-slate-500">
                Relatório oficial de crédito emitido pela RedeBE
              </p>
            </div>
          </div>
          <span className="bg-amber-50 text-amber-800 font-extrabold text-xs uppercase px-3 py-1 rounded-full border border-amber-200 font-mono">
            Aguardando Consulta via API
          </span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Assim que a consulta de crédito for executada pela equipe responsável, o relatório completo ficará disponível nesta etapa.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-5 text-left shadow-sm relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-3 shrink-0 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200/70">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-display font-black text-sm md:text-base text-slate-900 uppercase tracking-wider">
              Relatórios de Crédito RedeBE
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Resultado individual de cada documento consultado, exatamente como entregue pela RedeBE
            </p>
          </div>
        </div>
        <span className="bg-emerald-50 text-emerald-800 font-extrabold text-xs uppercase px-3 py-1.5 rounded-full border border-emerald-200/80 font-mono flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {listaConsultas.length} relatório(s)
        </span>
      </div>

      <div className="space-y-3">
        {listaConsultas.map((consulta: any, idx: number) => (
          <div
            key={consulta.id || idx}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded-sm uppercase font-mono tracking-wider">
                {consulta.produto_code || "REDEBE"}
              </span>
              <h6 className="font-extrabold text-xs text-slate-800">
                {consulta.documentoNome || consulta.produto_nome || "Consulta de crédito"}
              </h6>
              <div className="text-[10px] text-slate-500 font-mono">
                {consulta.documento}
                {consulta.dataConsulta
                  ? ` • ${new Date(consulta.dataConsulta).toLocaleString("pt-BR")}`
                  : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingConsulta(consulta)}
              className="px-3.5 py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver relatório completo
            </button>
          </div>
        ))}
      </div>

      <RedeBEReportViewerModal
        isOpen={Boolean(viewingConsulta)}
        onClose={() => setViewingConsulta(null)}
        consulta={viewingConsulta}
        lead={lead}
      />
    </div>
  );
};

export default DiagnosticStep3Viewer;
