// @ts-nocheck
import React from "react";
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Info, 
  Layers,
  ArrowRight,
  DollarSign
} from "lucide-react";

/**
 * Função utilitária para converter negritos (**texto**) e itálicos (*texto*) em elementos React estilizáveis
 */
export function parseFormattedInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Primeiro trata negritos **texto**
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  return boldParts.map((boldPart, boldIdx) => {
    if (boldIdx % 2 === 1) {
      return (
        <strong
          key={`b-${boldIdx}`}
          className="font-extrabold text-emerald-950 bg-emerald-100/70 px-1 py-0.2 rounded border border-emerald-200/80 font-sans mx-0.5 inline"
        >
          {boldPart}
        </strong>
      );
    }

    // Dentro do que não é negrito, trata itálico *texto*
    const italicParts = boldPart.split(/\*([^*]+)\*/g);
    if (italicParts.length > 1) {
      return italicParts.map((itPart, itIdx) => {
        if (itIdx % 2 === 1) {
          return (
            <em key={`i-${itIdx}`} className="italic text-slate-800 font-medium font-sans">
              {itPart}
            </em>
          );
        }
        return itPart;
      });
    }

    return boldPart;
  });
}

/**
 * Renderizador de Markdown Executivo para Laudos de Crédito e Diagnósticos 360°
 */
export function renderExecutiveMarkdown(content: string): React.ReactNode {
  if (!content) return null;

  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let keyCounter = 0;

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      renderedElements.push(<div key={`sp-${idx}-${keyCounter++}`} className="h-2" />);
      return;
    }

    // 1. Título Nível 1 (# Título ou "1. ANÁLISE SITUACIONAL...")
    const isNumberedMainSection = /^(\d+)\.\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\(\)360°\/\-]+)$/.test(trimmed);
    const isHashH1 = trimmed.startsWith("# ");

    if (isHashH1 || (isNumberedMainSection && trimmed.length > 10)) {
      const cleanTitle = trimmed.replace(/^#\s*/, "");
      renderedElements.push(
        <div key={`h1-${idx}-${keyCounter++}`} className="mt-6 mb-3 first:mt-1">
          <div className="bg-gradient-to-r from-[#03281D] via-[#0A4B37] to-[#03281D] text-white p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 shadow-xs flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-300 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white leading-tight">
              {cleanTitle}
            </h3>
          </div>
        </div>
      );
      return;
    }

    // 2. Título Nível 2 (## Subtítulo)
    if (trimmed.startsWith("## ")) {
      const cleanTitle = trimmed.replace(/^##\s*/, "");
      renderedElements.push(
        <div key={`h2-${idx}-${keyCounter++}`} className="mt-5 mb-2.5">
          <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 flex items-center gap-2.5 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">
              {cleanTitle}
            </h4>
          </div>
        </div>
      );
      return;
    }

    // 3. Título Nível 3 (### Seção)
    if (trimmed.startsWith("### ")) {
      const cleanTitle = trimmed.replace(/^###\s*/, "");
      renderedElements.push(
        <div key={`h3-${idx}-${keyCounter++}`} className="mt-4 mb-2">
          <h5 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/70">
            <span className="w-2 h-2 rounded-full bg-[#00A86B] animate-pulse shrink-0" />
            <span>{cleanTitle}</span>
          </h5>
        </div>
      );
      return;
    }

    // 4. Sub-tópicos Numerados com Negrito (ex: "1. **Restrição Financeira Ativa no CPF:**" ou "2. **Divergência de Scores...**")
    const numberedTopicMatch = trimmed.match(/^(\d+)\.\s+(\*\*[^*]+\*\*|[A-Za-zÁÉÍÓÚÂÊÔÃÕÇ\s]+:?)(.*)$/);
    if (numberedTopicMatch) {
      const number = numberedTopicMatch[1];
      const topicTitle = (numberedTopicMatch[2] + (numberedTopicMatch[3] || "")).trim();

      renderedElements.push(
        <div key={`nt-${idx}-${keyCounter++}`} className="mt-3.5 mb-1.5 p-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl flex items-start gap-3">
          <span className="w-6 h-6 rounded-lg bg-[#00A86B] text-white flex items-center justify-center text-[11px] font-black shrink-0 font-mono shadow-2xs">
            {number}
          </span>
          <div className="text-xs text-emerald-950 font-bold leading-relaxed pt-0.5">
            {parseFormattedInlineText(topicTitle)}
          </div>
        </div>
      );
      return;
    }

    // 5. Linhas de Lista / Bullets (- ou * ou •)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const cleanBullet = trimmed.replace(/^[-*•]\s+/, "");
      const isPositiveNote = cleanBullet.toLowerCase().includes("nota positiva") || cleanBullet.toLowerCase().includes("ponto positivo");
      const isAlertNote = cleanBullet.toLowerCase().includes("restrição") || cleanBullet.toLowerCase().includes("risco") || cleanBullet.toLowerCase().includes("divergência") || cleanBullet.toLowerCase().includes("bloqueio");

      return renderedElements.push(
        <div 
          key={`li-${idx}-${keyCounter++}`} 
          className={`my-1.5 p-3 rounded-xl border transition-all flex items-start gap-2.5 text-xs leading-relaxed ${
            isPositiveNote 
              ? "bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:border-emerald-300"
              : isAlertNote
              ? "bg-white border-slate-200/90 text-slate-800 hover:border-emerald-300 shadow-2xs"
              : "bg-white border-slate-200/80 text-slate-800 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <span className={`p-1 rounded-md shrink-0 mt-0.5 border ${
            isPositiveNote 
              ? "bg-emerald-100 text-emerald-700 border-emerald-300" 
              : isAlertNote
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {isPositiveNote ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : isAlertNote ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            )}
          </span>
          <div className="flex-1 font-medium">
            {parseFormattedInlineText(cleanBullet)}
          </div>
        </div>
      );
    }

    // 6. Parágrafo Padrão Formatado
    renderedElements.push(
      <div 
        key={`p-${idx}-${keyCounter++}`} 
        className="my-2 p-3 bg-slate-50/80 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed font-sans"
      >
        {parseFormattedInlineText(trimmed)}
      </div>
    );
  });

  return <div className="space-y-1">{renderedElements}</div>;
}
