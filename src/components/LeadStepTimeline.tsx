// @ts-nocheck
import React from "react";
import { CheckCircle2, Loader2, Lock, ArrowRight } from "lucide-react";

export interface StepInfo {
  step: number;
  label: string;
  fullLabel: string;
  tab: "details" | "socios" | "diagnostico" | "contrato" | "credenciais" | "simulador" | "acompanhamento";
}

export const STEPS_CONFIG: StepInfo[] = [
  { step: 1, label: "Passo 1: Dados CNPJ", fullLabel: "Passo 1: Dados cadastrais do CNPJ", tab: "details" },
  { step: 2, label: "Passo 2: Sócios", fullLabel: "Passo 2: Coleta de dados dos sócios", tab: "socios" },
  { step: 3, label: "Passo 3: Consulta Diagnóstica", fullLabel: "Passo 3: Consulta Diagnóstica CPF e CNPJ", tab: "diagnostico" },
  { step: 4, label: "Passo 4: Termos & Contratos", fullLabel: "Passo 4: Assinatura eletrônica de termos e Contratos", tab: "contrato" },
  { step: 5, label: "Passo 5: Senhas & Certificado A1", fullLabel: "Passo 5: Recolhimento Senha GOV, Serasa e Certificado Digital A1", tab: "credenciais" },
  { step: 6, label: "Passo 6: Estruturação", fullLabel: "Passo 6: Estruturação da Operação (Aplicação de melhoria de crédito)", tab: "simulador" },
  { step: 7, label: "Passo 7: Operação Apta", fullLabel: "Passo 7: Operação apta para solicitação bancária", tab: "acompanhamento" },
  { step: 8, label: "Passo 8: Crédito Final", fullLabel: "Passo 8: Crédito aprovado / Crédito Recusado", tab: "acompanhamento" },
];

interface LeadStepTimelineProps {
  currentEtapa?: number;
  activeTab?: string;
  onSelectStep?: (step: number, tab: string) => void;
  compact?: boolean;
}

export const LeadStepTimeline: React.FC<LeadStepTimelineProps> = ({
  currentEtapa = 1,
  activeTab,
  onSelectStep,
  compact = false,
}) => {
  const safeEtapa = Math.max(1, Math.min(8, currentEtapa || 1));

  if (compact) {
    return (
      <div className="w-full bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
          <span className="text-slate-400 font-bold">Progresso na Jornada do Lead:</span>
          <span className="text-emerald-400 font-extrabold">{safeEtapa}/8 Concluído</span>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {STEPS_CONFIG.map((s) => {
            const isCompleted = s.step < safeEtapa;
            const isInProgress = s.step === safeEtapa;
            const isLocked = s.step > safeEtapa;

            return (
              <div
                key={s.step}
                title={`${s.fullLabel} (${isCompleted ? "Concluído" : isInProgress ? "Em Andamento" : "Bloqueado"})`}
                className={`h-2 rounded-full transition-all relative group ${
                  isCompleted
                    ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : isInProgress
                    ? "bg-amber-400 animate-pulse"
                    : "bg-slate-800"
                }`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 whitespace-nowrap bg-slate-950 text-white text-[10px] font-medium px-2 py-1 rounded border border-slate-700 shadow-xl pointer-events-none">
                  {s.fullLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/90 border-b border-slate-800/80 px-4 py-3.5 backdrop-blur-md overflow-x-auto scrollbar-none shrink-0">
      <div className="flex items-center justify-between min-w-max gap-2">
        {STEPS_CONFIG.map((s, index) => {
          const isCompleted = s.step < safeEtapa;
          const isInProgress = s.step === safeEtapa;
          const isLocked = s.step > safeEtapa;
          const isSelected = activeTab === s.tab;

          return (
            <React.Fragment key={s.step}>
              {index > 0 && (
                <div
                  className={`h-0.5 w-6 sm:w-8 shrink-0 transition-all ${
                    isCompleted ? "bg-emerald-500" : "bg-slate-800"
                  }`}
                />
              )}

              <button
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked && onSelectStep) {
                    onSelectStep(s.step, s.tab);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                  isLocked
                    ? "bg-slate-900/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-70"
                    : isCompleted
                    ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/40"
                    : "bg-amber-950/50 text-amber-300 border border-amber-600/60 animate-pulse"
                } ${
                  isSelected ? "ring-2 ring-emerald-400/80 shadow-lg shadow-emerald-500/10" : ""
                }`}
              >
                {/* Status Icon */}
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isInProgress ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                )}

                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-mono tracking-wider uppercase opacity-80">
                    Etapa {s.step}
                  </span>
                  <span className="text-[11px] font-bold whitespace-nowrap">
                    {s.label.replace(`Passo ${s.step}: `, "")}
                  </span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default LeadStepTimeline;
