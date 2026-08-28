// @ts-nocheck
import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Lock, Bookmark, User, Calendar, ArrowRight } from "lucide-react";

interface LeadConciergeTrackerProps {
  lead: any;
}

const STEPS = [
  {
    number: 1,
    title: "Dados cadastrais do CNPJ",
    description: "CNPJ, razão social, dados de contato e enquadramento da empresa na linha de crédito.",
    acao: "Verifique e complete os dados da empresa na aba Passo 1.",
  },
  {
    number: 2,
    title: "Coleta de dados dos sócios",
    description: "Informações cadastrais, endereço e documentos dos sócios titulares.",
    acao: "Solicite e valide os dados dos sócios na aba Passo 2.",
  },
  {
    number: 3,
    title: "Consulta Diagnóstica CPF e CNPJ",
    description: "Diagnóstico de compliance, regularidade fiscal e restrições nos órgãos públicos.",
    acao: "Execute a consulta diagnóstica na aba Passo 3.",
  },
  {
    number: 4,
    title: "Assinatura eletrônica de termos e contratos",
    description: "Contrato de prestação de serviços e termo de honorários assinados digitalmente.",
    acao: "Envie o contrato para assinatura e acompanhe na aba Passo 4.",
  },
  {
    number: 5,
    title: "Recolhimento de senhas GOV, Serasa e Certificado A1",
    description: "Acessos fiscais e certificado digital necessários para a estruturação da operação.",
    acao: "Colete as credenciais na aba Passo 5.",
  },
  {
    number: 6,
    title: "Estruturação da operação (melhoria de crédito)",
    description: "Aplicação dos serviços recomendados e ajustes no perfil de crédito da empresa.",
    acao: "Gerencie os serviços e sub-etapas na aba Passo 6.",
  },
  {
    number: 7,
    title: "Operação apta para solicitação bancária",
    description: "Dossiê completo e encaminhamento formal da solicitação de crédito.",
    acao: "Gere o dossiê e valide a operação na aba Passo 7.",
  },
  {
    number: 8,
    title: "Crédito aprovado / Crédito recusado",
    description: "Resultado final da análise pelos agentes financeiros parceiros.",
    acao: "Registre o resultado final e próximos passos.",
  },
];

function getStepStatus(stepIndex: number, lead: any) {
  if (!lead) return "pending";

  let currentEtapa = lead.etapa;
  if (currentEtapa === undefined || currentEtapa === null) {
    const status = (lead.status || "novo").toLowerCase();
    if (status === "concluido" || status === "concluído") {
      currentEtapa = 7;
    } else if (status === "reprovado" || status === "recusado") {
      currentEtapa = 8;
    } else if (status === "em atendimento" || status === "atendimento") {
      currentEtapa = 5;
    } else {
      currentEtapa = 1;
    }
  }

  if (currentEtapa === 7 || currentEtapa === 8) {
    if (stepIndex <= 7) return "completed";
    return currentEtapa === 7 ? "completed" : "attention";
  }

  if (stepIndex < currentEtapa) return "completed";
  if (stepIndex === currentEtapa) return "active";
  return "pending";
}

function formatDate(dateValue: any) {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const LeadConciergeTracker: React.FC<LeadConciergeTrackerProps> = ({ lead }) => {
  const currentEtapa = lead?.etapa || 1;
  const currentStep = STEPS.find((s) => s.number === currentEtapa) || STEPS[0];
  const statusLower = (lead?.status || "novo").toLowerCase();

  let statusLabel = "Novo lead";
  let statusVariant: "success" | "warning" | "danger" | "info" | "neutral" = "neutral";

  if (statusLower === "concluido" || statusLower === "concluído" || statusLower === "aprovado") {
    statusLabel = "Crédito aprovado";
    statusVariant = "success";
  } else if (statusLower === "reprovado" || statusLower === "recusado") {
    statusLabel = "Crédito recusado";
    statusVariant = "danger";
  } else if (statusLower === "em atendimento" || statusLower === "atendimento") {
    statusLabel = "Em atendimento";
    statusVariant = "warning";
  } else {
    statusLabel = "Novo lead";
    statusVariant = "info";
  }

  const statusColors = {
    success: "bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]/25",
    warning: "bg-[#d98207]/10 text-[#d98207] border-[#d98207]/25",
    danger: "bg-[#d64545]/10 text-[#d64545] border-[#d64545]/25",
    info: "bg-[#2f7fb8]/10 text-[#2f7fb8] border-[#2f7fb8]/25",
    neutral: "bg-[#eef2f0] text-[#5b6f68] border-[#cfd9d5]",
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="panel p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#5b6f68]">
              <Bookmark className="w-3.5 h-3.5 text-[#00A86B]" />
              Concierge B2B — Visão do Consultor
            </div>
            <h2 className="font-display font-extrabold text-lg text-[#0b1f18]">
              {lead?.razaoSocial || lead?.nome || "Lead sem nome"}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#5b6f68]">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {lead?.parceiroNome || "Consultor não atribuído"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Criado em {formatDate(lead?.dataCriacao)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusColors[statusVariant]}`}>
              {statusVariant === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
              {statusVariant === "warning" && <Clock className="w-3.5 h-3.5" />}
              {statusVariant === "danger" && <AlertTriangle className="w-3.5 h-3.5" />}
              {statusVariant === "info" && <Clock className="w-3.5 h-3.5" />}
              {statusLabel}
            </span>
            <span className="text-[11px] text-[#5b6f68]">
              Etapa atual: <strong className="text-[#0b1f18]">Passo {currentEtapa}</strong>
            </span>
          </div>
        </div>

        {/* Next action banner */}
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-[#02241a] to-[#0a3d2e] text-[#e8f5ef] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Próxima ação recomendada</span>
            <p className="text-sm font-semibold mt-0.5">{currentStep.acao}</p>
          </div>
          <ArrowRight className="w-5 h-5 opacity-70 hidden sm:block" />
        </div>
      </div>

      {/* Timeline */}
      <div className="panel p-6 md:p-8">
        <h3 className="font-display font-extrabold text-sm text-[#0b1f18] uppercase tracking-wider mb-6">
          Etapas da Jornada de Crédito
        </h3>

        <div className="relative border-l-2 border-[#e3e9e6] pl-6 ml-3 space-y-8">
          {STEPS.map((step) => {
            const status = getStepStatus(step.number, lead);
            const isCompleted = status === "completed";
            const isActive = status === "active";
            const isAttention = status === "attention";

            let circleClass = "bg-[#eef2f0] text-[#5b6f68] border-[#e3e9e6]";
            let icon = <Lock className="w-4 h-4" />;
            let badgeText = "Pendente";
            let badgeClass = "bg-[#eef2f0] text-[#5b6f68] border-[#cfd9d5]";

            if (isCompleted) {
              circleClass = "bg-[#00A86B]/12 text-[#00A86B] border-[#00A86B]/30";
              icon = <CheckCircle2 className="w-5 h-5" />;
              badgeText = "Concluído";
              badgeClass = "bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]/20";
            } else if (isActive) {
              circleClass = "bg-[#02241a] text-white border-[#00A86B]/40 animate-pulse";
              icon = <Clock className="w-4 h-4" />;
              badgeText = "Em Andamento";
              badgeClass = "bg-[#00A86B] text-white border-[#00A86B]";
            } else if (isAttention) {
              circleClass = "bg-[#d64545]/10 text-[#d64545] border-[#d64545]/25";
              icon = <AlertTriangle className="w-5 h-5" />;
              badgeText = step.number === 8 ? "Recusado" : "Atenção";
              badgeClass = "bg-[#d64545]/10 text-[#d64545] border-[#d64545]/20";
            }

            return (
              <div key={step.number} className="relative">
                <div
                  className={`absolute -left-[35px] top-0.5 rounded-full p-1.5 border-4 border-white flex items-center justify-center ${circleClass}`}
                >
                  {icon}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-sm text-[#0b1f18]">
                      Passo {step.number}: {step.title}
                    </h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                  <p className="text-xs text-[#5b6f68] mt-1 leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeadConciergeTracker;
