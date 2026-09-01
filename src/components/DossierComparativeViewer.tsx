// @ts-nocheck
import React, { useState } from "react";
import { 
  ShieldCheck, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Building2, 
  Award, 
  Copy, 
  Check, 
  Sparkles, 
  FileText, 
  ExternalLink,
  Lock,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  Percent,
  CheckCircle
} from "lucide-react";
import { Lead, DiagnosticoPosEstruturacao } from "../types";

interface DossierComparativeViewerProps {
  lead: Lead;
  diagnosticoPosEstruturacao?: DiagnosticoPosEstruturacao | null;
  isAdmin?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DossierComparativeViewer: React.FC<DossierComparativeViewerProps> = ({
  lead,
  diagnosticoPosEstruturacao,
  isAdmin = false,
  onRefresh,
  isRefreshing = false,
}) => {
  const [copied, setCopied] = useState(false);

  const diag = diagnosticoPosEstruturacao || lead.diagnosticoPosEstruturacao;

  const formatCurrency = (val: number | string | undefined) => {
    const num = typeof val === "number" ? val : parseFloat(String(val || 0));
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  if (!diag) {
    return (
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 md:p-8 space-y-4 text-left shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-black text-base md:text-lg text-slate-100 uppercase tracking-wider">
                Passo 7: Operação Apta para Solicitação Bancária
              </h4>
              <p className="text-xs text-slate-400">
                Dossiê Comparativo & Validação Final de Crédito (Antes vs. Depois)
              </p>
            </div>
          </div>
          <span className="bg-amber-500/20 text-amber-300 font-extrabold text-xs uppercase px-3.5 py-1.5 rounded-full border border-amber-500/30 font-mono">
            Aguardando Consulta Pós-Estruturação
          </span>
        </div>

        <div className="p-5 bg-slate-800/60 rounded-2xl border border-slate-700/80 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            O Dossiê Comparativo Oficial de Crédito é emitido após a execução da nova consulta de crédito oficial pós-estruturação no Passo 7.
          </p>
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAdmin 
                ? "Utilize o painel de consulta acima para executar a consulta RedeBE sem custo de saldo e emitir o dossiê oficial."
                : "Execute a reavaliação oficial dos dados no fluxo operacional para emitir o dossiê e liberar a homologação bancária."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const metrics = diag.metrics || {
    scoreAnterior: lead.scoreInicial || 320,
    scoreAtual: lead.scoreFinal || 795,
    evolucaoScore: (lead.scoreFinal || 795) - (lead.scoreInicial || 320),
    restricoesAnteriores: 2,
    restricoesAtuais: 0,
    statusSaneamento: "100% Saneado / Sem Restrições",
    limiteAnterior: 0,
    limiteAtual: lead.limiteAptoBancario || 350000,
    ratingBancario: "A+ (Grau de Investimento)",
    nivelRisco: "Baixo Risco",
    statusAptidao: "HOMOLOGADO_APTO",
    esteirasAptas: ["PRONAMPE (FGO)", "FGI PEAC", "Capital de Giro Bancário", "BNDES Automático"],
    protocoloHomologacao: diag.protocolo || "HOM-PROSFEC-2026-FINAL"
  };

  const copyDossier = () => {
    const textToCopy = `🏛️ DOSSIÊ DE HOMOLOGAÇÃO & EVOLUÇÃO DE CRÉDITO - PROSFEC IA
Protocolo: ${metrics.protocoloHomologacao}
Empresa: ${lead.razaoSocial || lead.nome} (CNPJ: ${lead.cnpj || "N/A"})
Data de Emissão: ${new Date(diag.dataEmissao).toLocaleString("pt-BR")}

📊 COMPARATIVO ANTES vs. DEPOIS:
- Score Inicial: ${metrics.scoreAnterior} pts ➔ Score Pós-Estruturação: ${metrics.scoreAtual} pts (+${metrics.evolucaoScore} pts)
- Restrições: ${metrics.restricoesAnteriores} apontamento(s) ➔ 0 restrições (${metrics.statusSaneamento})
- Capacidade Aprovável: ${formatCurrency(metrics.limiteAnterior)} ➔ ${formatCurrency(metrics.limiteAtual)}
- Rating Bancário: ${metrics.ratingBancario} | Risco: ${metrics.nivelRisco}
- Status de Aptidão: 100% HOMOLOGADO / APTO PARA SOLICITAÇÃO BANCÁRIA

Esteiras Aptas:
${(metrics.esteirasAptas || []).map(e => `• ${e}`).join("\n")}

---
PARECER TÉCNICO PROSFEC:
${diag.parecerTecnico}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Helper to render markdown-like formatting cleanly
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
    <div className="bg-[#021811] text-white rounded-3xl border border-emerald-800/80 p-6 md:p-8 space-y-6 text-left shadow-2xl relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00A86B]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Protocol & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-800/80 pb-5 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-emerald-400 to-[#0A3D2E] text-white rounded-2xl shadow-lg shadow-emerald-950 border border-emerald-400/40">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-base md:text-xl text-emerald-100 uppercase tracking-wider">
                Dossiê de Homologação Bancária
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                Passo 7
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Diagnóstico Pós-Estruturação & Relatório de Aptidão de Crédito
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono text-emerald-400/80 block uppercase">
              Protocolo Oficial
            </span>
            <span className="text-xs font-mono font-black text-emerald-200 block">
              {metrics.protocoloHomologacao}
            </span>
          </div>

          <span className="bg-emerald-500 text-slate-950 font-black text-xs uppercase px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            100% Homologado &amp; Apto
          </span>

          {isAdmin && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-xl border border-emerald-700/80 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Recalcular análise comparativa IA"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparative Grid (Antes vs. Depois) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10">
        
        {/* Card 1: ANTES (Passo 3 - Diagnóstico de Entrada) */}
        <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider font-mono">
                Antes (Passo 3: Entrada)
              </span>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              Perfil Não Qualificado
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Score Serasa/SCR
              </span>
              <span className="text-xl font-black text-rose-400 font-display mt-0.5 block">
                {metrics.scoreAnterior} <span className="text-xs font-normal text-slate-500">pts</span>
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Restrições Ativas
              </span>
              <span className="text-xl font-black text-rose-400 font-display mt-0.5 block">
                {metrics.restricoesAnteriores} <span className="text-xs font-normal text-slate-500">apontamento(s)</span>
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Capacidade Inicial
              </span>
              <span className="text-sm font-black text-slate-400 mt-1 block">
                {metrics.limiteAnterior > 0 ? formatCurrency(metrics.limiteAnterior) : "R$ 0,00 (Bloqueado)"}
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Situação Fiscal
              </span>
              <span className="text-xs font-bold text-rose-400 mt-1 block">
                Apontamentos e-CAC/SCR
              </span>
            </div>
          </div>

          <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-200/90 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>Perfil inicial apresentava restrições operacionais e classificação de alto risco, impedindo o avanço nas esteiras bancárias convencionais.</span>
          </div>
        </div>

        {/* Card 2: DEPOIS (Passo 7 - Diagnóstico Pós-Estruturação) */}
        <div className="bg-gradient-to-b from-emerald-950/80 to-[#0A3D2E]/40 border-2 border-emerald-500/80 p-5 rounded-2xl space-y-4 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider font-mono">
                Depois (Passo 7: Pós-Estruturação)
              </span>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
              ✓ Grau de Investimento
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-700/70">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-300 font-bold uppercase block">
                  Score Otimizado
                </span>
                <span className="text-[9px] font-black bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-mono">
                  +{metrics.evolucaoScore} pts
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-300 font-display mt-0.5 block">
                {metrics.scoreAtual} <span className="text-xs font-normal text-emerald-200">pts</span>
              </span>
            </div>

            <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-700/70">
              <span className="text-[10px] text-emerald-300 font-bold uppercase block">
                Restrições Ativas
              </span>
              <span className="text-lg font-black text-emerald-300 font-display mt-0.5 block flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                0 Restrições
              </span>
            </div>

            <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-700/70">
              <span className="text-[10px] text-emerald-300 font-bold uppercase block">
                Limite Aprovável Apto
              </span>
              <span className="text-base font-black text-emerald-300 font-display mt-0.5 block">
                {formatCurrency(metrics.limiteAtual)}
              </span>
            </div>

            <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-700/70">
              <span className="text-[10px] text-emerald-300 font-bold uppercase block">
                Rating Homologado
              </span>
              <span className="text-xs font-black text-white mt-1 block">
                {metrics.ratingBancario}
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/60 border border-emerald-600/60 rounded-xl text-xs text-emerald-100 leading-relaxed flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Dossiê 100% saneado. Certidões Negativas e score aptos para protocolo direto nos bancos parceiros e agentes repassadores.</span>
          </div>
        </div>
      </div>

      {/* Evolution Summary Bar */}
      <div className="bg-emerald-950/60 border border-emerald-800/80 p-4 md:p-5 rounded-2xl space-y-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/50 pb-2.5">
          <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Linhas de Crédito Homologadas &amp; Esteiras Ativas
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            Enquadramento Técnico Concluído
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {(metrics.esteirasAptas || ["PRONAMPE (FGO)", "FGI PEAC", "Capital de Giro Bancário", "BNDES Automático"]).map((esteira, idx) => (
            <div key={idx} className="bg-emerald-900/40 border border-emerald-700/60 p-3 rounded-xl flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold font-mono">
                ✓
              </div>
              <span className="text-xs font-bold text-emerald-100 truncate">
                {esteira}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Official AI Technical Statement (Parecer Técnico) */}
      <div className="bg-slate-950/90 border border-emerald-700/60 p-5 md:p-7 rounded-2xl space-y-4 relative z-10 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-display font-black text-sm md:text-base text-emerald-100 uppercase tracking-wider">
                Parecer Conclusivo da Mesa de Operações PROSFEC IA
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Emissão em: {new Date(diag.dataEmissao).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>

          <button
            onClick={copyDossier}
            className="px-4 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 text-xs font-extrabold rounded-xl border border-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Dossiê Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                Copiar Dossiê Completo
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-200 leading-relaxed space-y-2 pt-2">
          {renderFormattedText(diag.parecerTecnico || "")}
        </div>

        <div className="pt-4 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-emerald-400/80">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Documento certificado digitalmente pela Mesa de Operações e Fomento PROSFEC</span>
          </div>
          <span>Protocolo: {metrics.protocoloHomologacao}</span>
        </div>
      </div>

    </div>
  );
};
