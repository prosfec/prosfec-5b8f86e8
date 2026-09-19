// @ts-nocheck
import React from "react";
import { AlertCircle, CheckCircle2, Download, Eye, FileCheck2, FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { RelatorioPdfUploader } from "./RelatorioPdfUploader";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
          <FileText className="h-5 w-5" />
        </span>
        <span className="text-xs font-bold text-slate-600">
          {isDepois ? "Resultado final ainda não anexado" : "Relatório inicial ainda não anexado"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-state-success">
          <FileCheck2 className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase text-state-success">PDF disponível</div>
          <div className="truncate text-xs text-slate-600">{nome || "relatorio.pdf"}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="sm" onClick={() => onView(consulta, variant)} className="h-9 rounded-lg bg-brand-primary px-3 text-[10px] font-black uppercase hover:bg-brand-accent">
          <Eye className="h-3.5 w-3.5" /> Visualizar
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-lg border-slate-300 bg-white px-3 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50")}>
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
      <header className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-state-success">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="font-mono text-[10px] font-black uppercase tracking-wider text-state-success">Passo 7</span>
          <h3 className="mt-0.5 font-display text-base font-black text-slate-900 sm:text-lg">
            {isApto ? "Documentação Validada pela Mesa de Operações" : "Resultado da Estruturação — Antes e Depois"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {isApto
              ? "As documentações foram validadas e aceitas pela Mesa de Operações PROSFEC. A operação seguirá para análise de crédito bancária."
              : "Comparativo documental dos relatórios originais e dos resultados finais entregues após a estruturação."}
          </p>
        </div>
      </header>

      {isApto && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-state-success" />
          <div>
            <div className="text-xs font-black uppercase text-emerald-800">Documentação aceita</div>
            <p className="mt-1 text-xs text-emerald-800">A empresa está pronta para seguir à análise de crédito bancária.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-state-success" />
          Carregando relatórios...
        </div>
      ) : error ? (
        <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-center text-xs text-rose-700 shadow-sm">
          <AlertCircle className="h-6 w-6" />
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={onReload} className="rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-100">
            <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
          </Button>
        </div>
      ) : consultas.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
          <FileText className="h-7 w-7 opacity-50" />
          Nenhum relatório do diagnóstico foi encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {consultas.map((consulta) => (
            <section key={consulta.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                <div>
                  <span className="mb-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-state-success">PROSFEC Diagnóstico 360</span>
                  <h4 className="font-display text-sm font-black text-slate-900">{consulta.documentoNome || "Consulta de crédito"}</h4>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">{consulta.documento}</p>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{consulta.dataConsulta ? new Date(consulta.dataConsulta).toLocaleString("pt-BR") : ""}</span>
              </div>

              <div className={`grid gap-4 p-4 sm:p-5 ${isApto ? "grid-cols-1" : "lg:grid-cols-2"}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> {isApto ? "Relatório Inicial" : "Antes"}
                  </div>
                  <PdfAction consulta={consulta} variant="antes" onView={onView} />
                </div>
                {!isApto && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider text-state-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-state-success" /> Depois
                    </div>
                    <PdfAction consulta={consulta} variant="depois" onView={onView} />
                    {isAdmin && (
                      <RelatorioPdfUploader consulta={consulta} variant="depois" recipientId={partnerId} onUpdated={onReload} compact />
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