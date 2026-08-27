// @ts-nocheck
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
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Lead } from "../types";
import { FintechDiagnosisView } from "./FintechDiagnosisView";
import { renderExecutiveMarkdown } from "../utils/markdownRenderer";

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

  if (!hasRealConsulta) {
    return (
      <div className="bg-white text-slate-800 rounded-3xl border border-slate-200/90 p-6 md:p-8 space-y-4 text-left shadow-sm relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200/70">
              <Brain className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-display font-black text-sm md:text-base text-slate-900 uppercase tracking-wider">
                Passo 3: Consulta Diagnóstica CPF e CNPJ
              </h4>
              <p className="text-xs text-slate-500">
                Relatório Técnico de Fomento e Perfil de Crédito PROSFEC IA
              </p>
            </div>
          </div>
          <span className="bg-amber-50 text-amber-800 font-extrabold text-xs uppercase px-3 py-1 rounded-full border border-amber-200 font-mono">
            Aguardando Consulta via API
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed pt-1">
          O resultado detalhado do perfil financeiro e diagnóstico com inteligência artificial é gerado exclusivamente após a execução da consulta de crédito oficial via API realizada pelo seu consultor/parceiro credenciado PROSFEC.
        </p>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Assim que a consulta técnica for executada e processada, o diagnóstico completo da PROSFEC IA estará disponível instantaneamente nesta etapa.
          </span>
        </div>
      </div>
    );
  }

  // Prepara o objeto de diagnóstico para o visualizador Fintech
  const formattedDiag = typeof diagObj === "string" 
    ? { texto: diagObj, dataGeracao: (lead as any).consultaData || (lead as any).dataDiagnostico }
    : (diagObj || { 
        texto: (lead as any).diagnosticoIA || (lead as any).diagnosticoConsulta || "", 
        dataGeracao: (lead as any).consultaData || (lead as any).dataDiagnostico 
      });

  const handleCopyParecer = () => {
    if (!formattedDiag?.texto) return;
    navigator.clipboard.writeText(formattedDiag.texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 md:p-8 space-y-6 text-left shadow-sm relative overflow-hidden">
      
      {/* Header Executivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200/70 shadow-2xs">
            <Brain className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-black text-sm md:text-base text-slate-900 uppercase tracking-wider">
                Diagnóstico de Crédito &amp; Fomento PROSFEC
              </h4>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200">
                Passo 3 Concluído
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise pericial consolidada via API oficial com inteligência de crédito bancário
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyParecer}
            className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Parecer</span>
              </>
            )}
          </button>

          <span className="bg-emerald-50 text-emerald-800 font-extrabold text-xs uppercase px-3 py-1.5 rounded-full border border-emerald-200/80 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Consulta Homologada
          </span>
        </div>
      </div>

      {/* Componente Central Fintech de Diagnóstico 360° */}
      <FintechDiagnosisView
        lead={lead}
        diagnostico={formattedDiag}
        consultas={lead.consultasExecutadas || (lead as any).consultas}
        isClientView={true}
        defaultExpanded={true}
        renderMarkdownContent={renderExecutiveMarkdown}
      />
    </div>
  );
};

export default DiagnosticStep3Viewer;
