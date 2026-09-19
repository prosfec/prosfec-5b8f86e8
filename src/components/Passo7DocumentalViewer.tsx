// @ts-nocheck
import React from "react";
import { CheckCircle2, Download, Eye, FileCheck2, FileText, ShieldCheck } from "lucide-react";
import { RelatorioPdfUploader } from "./RelatorioPdfUploader";

interface Passo7DocumentalViewerProps {
  lead: any;
  consultas: any[];
  loading: boolean;
  error?: string | null;
  isAdmin: boolean;
  onReload: () => void;
  onView: (consulta: any, variant: "antes" | "depois") => void;
}

const PdfAction: React.FC<{
  consulta: any;
  variant: "antes" | "depois";
  onView: (consulta: any, variant: "antes" | "depois") => void;
}> = ({ consulta, variant, onView }) => {
  const isDepois = variant === "depois";
  const url = isDepois ? consulta.relatorioDepoisPdfUrl : consulta.relatorioPdfUrl;
  const nome = isDepois ? consulta.relatorioDepoisPdfNome : consulta.relatorioPdfNome;

  if (!url) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center gap-2 border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <FileText className="h-7 w-7 text-slate-400" />
        <span className="text-xs font-bold text-slate-600">
          {isDepois ? "Resultado final ainda não anexado" : "Relatório inicial ainda não anexado"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-2">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase text-emerald-700">PDF disponível</div>
          <div className="truncate text-xs text-slate-600">{nome || "relatorio.pdf"}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onView(consulta, variant)} className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-slate-800">
          <Eye className="h-3.5 w-3.5" /> Visualizar
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Baixar
        </a>
      </div>
    </div>
  );
};

export const Passo7DocumentalViewer: React.FC<Passo7DocumentalViewerProps> = ({
  lead,
  consultas,
  loading,
  error,
  isAdmin,
  onReload,
  onView,
}) => {
  const isApto = lead?.aptoMesaCredito === true;
  const partnerId = lead?.parceiroId || lead?.partnerId || lead?.parceiro_id || "";

  return (
    <div className="space-y-5">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-wider">Passo 7</span>
        </div>
        <h3 className="mt-1 text-lg font-black text-slate-900">
          {isApto ? "Documentação Validada pela Mesa de Operações" : "Resultado da Estruturação — Antes e Depois"}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {isApto
            ? "As documentações foram validadas e aceitas pela Mesa de Operações PROSFEC. A operação seguirá para análise de crédito bancária."
            : "Comparativo documental dos relatórios originais e dos resultados finais entregues após a estruturação."}
        </p>
      </header>

      {isApto && (
        <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <div className="text-xs font-black uppercase text-emerald-800">Documentação aceita</div>
            <p className="mt-1 text-xs text-emerald-800">A empresa está pronta para seguir à análise de crédito bancária.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-500">Carregando relatórios...</div>
      ) : error ? (
        <div className="border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700">
          {error}
          <button type="button" onClick={onReload} className="ml-2 font-black underline">Tentar novamente</button>
        </div>
      ) : consultas.length === 0 ? (
        <div className="border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-xs text-slate-500">Nenhum relatório do diagnóstico foi encontrado.</div>
      ) : (
        <div className="space-y-4">
          {consultas.map((consulta) => (
            <section key={consulta.id} className="border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{consulta.documentoNome || "Consulta de crédito"}</h4>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">{consulta.documento}</p>
                </div>
                <span className="text-[10px] text-slate-500">{consulta.dataConsulta ? new Date(consulta.dataConsulta).toLocaleString("pt-BR") : ""}</span>
              </div>

              <div className={`grid gap-4 ${isApto ? "grid-cols-1" : "lg:grid-cols-2"}`}>
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">{isApto ? "Relatório Inicial" : "Antes"}</div>
                  <PdfAction consulta={consulta} variant="antes" onView={onView} />
                </div>
                {!isApto && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Depois</div>
                    <PdfAction consulta={consulta} variant="depois" onView={onView} />
                    {isAdmin && (
                      <RelatorioPdfUploader consulta={consulta} variant="depois" recipientId={partnerId} onUpdated={onReload} />
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Passo7DocumentalViewer;