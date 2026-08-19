import React, { useState } from "react";
import { 
  Brain, 
  CheckCircle2, 
  DollarSign, 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  FileText, 
  Copy, 
  Check, 
  Sparkles,
  Lock,
  Clock,
  ExternalLink
} from "lucide-react";
import { Lead } from "../types";

interface DiagnosticStep3ViewerProps {
  lead: Lead;
  diagnostico?: any;
  onCopy?: () => void;
}

export const DiagnosticStep3Viewer: React.FC<DiagnosticStep3ViewerProps> = ({
  lead,
  diagnostico,
}) => {
  const [copied, setCopied] = useState(false);

  const diagObj = diagnostico || lead.diagnosticoPROSFEC || (lead as any).diagnosticoIA || (lead as any).diagnosticoConsulta;
  
  const hasRealConsulta = Boolean(
    (lead as any).consultaEfetuada || 
    (lead as any).consultaData || 
    (lead as any).consultaResultado || 
    diagObj ||
    (lead.consultasExecutadas && lead.consultasExecutadas.length > 0)
  );

  const formatCurrency = (val: number | string | undefined) => {
    const num = typeof val === "number" ? val : parseFloat(String(val || 0));
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  if (!hasRealConsulta) {
    return (
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-700 p-6 md:p-8 space-y-4 text-left shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-black text-sm md:text-base text-slate-100 uppercase tracking-wider">
                Passo 3: Consulta Diagnóstica CPF e CNPJ
              </h4>
              <p className="text-xs text-slate-400">
                Relatório Técnico de Fomento e Perfil de Crédito PROSFEC IA
              </p>
            </div>
          </div>
          <span className="bg-amber-500/20 text-amber-300 font-extrabold text-xs uppercase px-3 py-1 rounded-full border border-amber-500/30 font-mono">
            Aguardando Consulta via API
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed pt-1">
          O resultado detalhado do perfil financeiro e diagnóstico com inteligência artificial é gerado exclusivamente após a execução da consulta de crédito oficial via API realizada pelo seu consultor/parceiro credenciado PROSFEC.
        </p>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 text-xs text-slate-400 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Assim que a consulta técnica for executada e processada, o diagnóstico completo da PROSFEC IA estará disponível instantaneamente nesta etapa.
          </span>
        </div>
      </div>
    );
  }

  const limiteVal = diagObj?.limiteEstimado || (lead as any).valorAprovado || lead.limiteEstimado;
  const prepVal = diagObj?.nivelPreparacao || lead.nivelPreparacao;
  const alertasVal = diagObj?.principaisAlertas || diagObj?.alertas || lead.principaisAlertas;
  const recomendacoesVal = diagObj?.recomendacoes || diagObj?.recomendações || lead.recomendações;
  const textoVal = diagObj?.texto || (lead as any).diagnosticoIA || (lead as any).diagnosticoConsulta;
  const situacaoCad = (lead as any).situacaoCadastral || "02 - ATIVA / REGULAR";
  const temPendencias = alertasVal && alertasVal.length > 0;

  const handleCopy = () => {
    if (!textoVal) return;
    navigator.clipboard.writeText(textoVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const renderFormattedText = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return (
          <h5 key={i} className="text-sm font-black text-emerald-300 uppercase tracking-wider mt-4 mb-2 flex items-center gap-1.5">
            {line.replace("### ", "")}
          </h5>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h4 key={i} className="text-base font-black text-white uppercase tracking-wider mt-5 mb-2.5 pb-1 border-b border-emerald-800/60">
            {line.replace("## ", "")}
          </h4>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} className="text-xs text-slate-200 ml-4 mb-1 list-disc leading-relaxed">
            {line.replace(/^[-*]\s+/, "")}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      return (
        <p key={i} className="text-xs text-slate-300 leading-relaxed mb-2 font-normal">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="bg-emerald-950 text-white rounded-3xl border border-emerald-800/80 p-6 md:p-8 space-y-6 text-left shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/80 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display font-black text-sm md:text-base text-emerald-100 uppercase tracking-wider">
                Diagnóstico de Crédito &amp; Fomento PROSFEC
              </h4>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/40">
                Passo 3
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Análise consolidada via API oficial com inteligência de mercado
            </p>
          </div>
        </div>

        <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase px-3.5 py-1.5 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Consulta Concluída
        </span>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
        <div className="bg-emerald-900/40 border border-emerald-800/70 p-4 rounded-2xl flex items-start justify-between space-y-1">
          <div>
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
              Limite Estimado
            </span>
            <span className="text-lg font-black text-emerald-300 block font-display mt-0.5">
              {limiteVal ? formatCurrency(limiteVal) : "Sob Análise"}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-emerald-900/40 border border-emerald-800/70 p-4 rounded-2xl flex items-start justify-between space-y-1">
          <div>
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
              Nível de Perfil
            </span>
            <span className="text-sm font-black text-white block mt-1 capitalize font-display">
              {prepVal ? `Perfil ${String(prepVal).toUpperCase()}` : "Em Qualificação"}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Brain className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-emerald-900/40 border border-emerald-800/70 p-4 rounded-2xl flex items-start justify-between space-y-1">
          <div>
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
              Situação Cadastral
            </span>
            <span className="text-xs font-black text-emerald-200 block mt-1">
              {situacaoCad}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-emerald-900/40 border border-emerald-800/70 p-4 rounded-2xl flex items-start justify-between space-y-1">
          <div>
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
              Status do Perfil
            </span>
            <span className={`text-xs font-black block mt-1 ${temPendencias ? "text-amber-300" : "text-emerald-300"}`}>
              {temPendencias ? "Apontamento(s)" : "Sem Restrições"}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl ${temPendencias ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            {temPendencias ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Alerts and Recommendations */}
      <div className="space-y-3 relative z-10">
        {alertasVal && alertasVal.length > 0 && (
          <div className="bg-amber-950/50 border border-amber-800/60 p-5 rounded-2xl space-y-2.5 shadow-xs">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider block flex items-center gap-2 border-b border-amber-800/40 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              Apontamentos e Impedimentos Identificados (Entrada):
            </span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-100 pt-1">
              {alertasVal.map((alerta: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 bg-amber-900/30 p-2.5 rounded-xl border border-amber-800/40">
                  <span className="text-amber-400 font-extrabold shrink-0 mt-0.5">•</span>
                  <span className="leading-snug">{alerta}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recomendacoesVal && recomendacoesVal.length > 0 && (
          <div className="bg-emerald-900/40 border border-emerald-800/60 p-5 rounded-2xl space-y-2.5 shadow-xs">
            <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider block flex items-center gap-2 border-b border-emerald-800/40 pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Estratégia Recomendada para Liberação de Crédito:
            </span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-emerald-100 pt-1">
              {recomendacoesVal.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                  <span className="text-emerald-400 font-extrabold shrink-0 mt-0.5">•</span>
                  <span className="leading-snug">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed technical statement */}
        {textoVal && (
          <div className="bg-[#021811]/90 border border-emerald-700/60 p-5 md:p-7 rounded-2xl shadow-2xl space-y-3 relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-100 uppercase tracking-wider block font-display">
                    Parecer Técnico &amp; Plano de Ação PROSFEC IA
                  </span>
                  <span className="text-[10px] text-emerald-400/80 block">
                    Análise automatizada de reestruturação empresarial
                  </span>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 text-xs font-extrabold rounded-xl border border-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    Copiar Parecer
                  </>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-200 leading-relaxed space-y-2 pt-2">
              {renderFormattedText(textoVal)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
