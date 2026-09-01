// @ts-nocheck
import { Lead } from "../types";

export interface StepLockStatus {
  maxUnlockedStep: number;
  isStep1Complete: boolean;
  isStep2Complete: boolean;
  isStep3Complete: boolean;
  isStep4Complete: boolean;
  isStep5Complete: boolean;
  isStep6Complete: boolean;
  isStep7Complete: boolean;
  isStep8Complete: boolean;
  isStepUnlocked: (step: number) => boolean;
  isTabUnlocked: (tab: "details" | "socios" | "diagnostico" | "contrato" | "credenciais" | "simulador" | "apta_bancaria" | "passo7" | "rating_adm" | string) => boolean;
  getLockedReason: (tab: string) => string | null;
}

export function calculateLeadStepStatus(lead: Lead | null | undefined): StepLockStatus {
  if (!lead) {
    return {
      maxUnlockedStep: 1,
      isStep1Complete: false,
      isStep2Complete: false,
      isStep3Complete: false,
      isStep4Complete: false,
      isStep5Complete: false,
      isStep6Complete: false,
      isStep7Complete: false,
      isStep8Complete: false,
      isStepUnlocked: (step) => step === 1,
      isTabUnlocked: (tab) => tab === "details",
      getLockedReason: () => "Nenhum lead selecionado.",
    };
  }

  const currentEtapa = Number(lead.etapa || 1);

  // Step 1: CNPJ basic details
  const isStep1Complete = Boolean(
    (lead.cnpj && lead.cnpj.replace(/\D/g, "").length === 14) &&
    (lead.razaoSocial || lead.nome) &&
    (lead.faturamentoAnual || lead.mediaReceitaMensal || lead.capitalSocial)
  ) || currentEtapa >= 1;

  // Step 2: Sócios (Main socio details + address)
  const mainSocio = lead.socios?.[0];
  const addr = lead.enderecoSocioPrincipal;
  const isStep2Complete = Boolean(
    (mainSocio?.nome && mainSocio?.cpf && addr?.cep && addr?.cidade) ||
    (lead.socios && lead.socios.length > 0) ||
    currentEtapa >= 3
  );

  // Step 3: Consulta / Diagnóstico (Credit analysis or diagnosis done)
  const isStep3Complete = Boolean(
    currentEtapa >= 4 ||
    lead.diagnosticoPROSFEC !== undefined ||
    lead.diagnostico !== undefined ||
    (lead as any).diagnosticoIA !== undefined ||
    (lead as any).diagnosticoConsulta !== undefined ||
    (lead.consultasExecutadas && lead.consultasExecutadas.length > 0) ||
    lead.limiteEstimado !== undefined ||
    lead.nivelPreparacao !== undefined ||
    currentEtapa >= 3
  );

  // Step 4: Termos & Contrato (assinatura eletrônica OU contratos assinados via GOV.br)
  const isStep4Complete = Boolean(
    lead.contratoAssinado === true ||
    (typeof lead.contratosAssinadosUrl === "string" && lead.contratosAssinadosUrl.trim().length > 0) ||
    currentEtapa >= 4
  );


  // Step 5: Credenciais (GOV.br / Serasa / Certificado A1 passwords submitted)
  const isStep5Complete = Boolean(
    Boolean(lead.govbrSenha || lead.serasaSenha || lead.certificadoSenha || lead.credenciaisEnviadas) ||
    currentEtapa >= 5
  );

  // Step 6: Estruturação / Proposta de Crédito
  const isStep6Complete = Boolean(
    lead.propostaSalva === true ||
    Boolean(lead.propostaEmpresa) ||
    currentEtapa >= 6
  );

  // Step 7: Operação Apta
  const isStep7Complete = Boolean(currentEtapa >= 7);

  // Step 8: Crédito Final
  const isStep8Complete = Boolean(
    currentEtapa >= 8 || lead.status === "aprovado" || lead.status === "concluido"
  );

  // Calculate sequential max unlocked step
  let maxUnlockedStep = 1;
  if (isStep1Complete) maxUnlockedStep = 2;
  if (isStep1Complete && isStep2Complete) maxUnlockedStep = Math.max(3, currentEtapa);
  if (isStep1Complete && isStep2Complete && isStep3Complete) maxUnlockedStep = Math.max(4, currentEtapa);
  if (isStep1Complete && isStep2Complete && isStep3Complete && isStep4Complete) maxUnlockedStep = Math.max(5, currentEtapa);
  if (isStep1Complete && isStep2Complete && isStep3Complete && isStep4Complete && isStep5Complete) maxUnlockedStep = Math.max(6, currentEtapa);
  if (isStep1Complete && isStep2Complete && isStep3Complete && isStep4Complete && isStep5Complete && isStep6Complete) maxUnlockedStep = Math.max(7, currentEtapa);
  if (isStep1Complete && isStep2Complete && isStep3Complete && isStep4Complete && isStep5Complete && isStep6Complete && isStep7Complete) maxUnlockedStep = Math.max(8, currentEtapa);

  const isStepUnlocked = (step: number) => step <= maxUnlockedStep;

  const isTabUnlocked = (tab: string) => {
    switch (tab) {
      case "details":
        return isStepUnlocked(1);
      case "socios":
        return isStepUnlocked(2);
      case "diagnostico":
        return isStepUnlocked(3);
      case "contrato":
        return isStepUnlocked(4);
      case "credenciais":
        return isStepUnlocked(5);
      case "simulador":
        return isStepUnlocked(6);
      case "apta_bancaria":
      case "passo7":
      case "acompanhamento":
        return isStepUnlocked(7);
      default:
        return true;
    }
  };

  const getLockedReason = (tab: string) => {
    if (isTabUnlocked(tab)) return null;

    switch (tab) {
      case "socios":
        return "🔒 Preencha e salve os dados da empresa (Passo 1) no Firestore para liberar o cadastro dos sócios.";
      case "diagnostico":
        return "🔒 Complete e confirme a ficha dos sócios (Passo 2) no Firestore para liberar a consulta diagnóstica.";
      case "contrato":
        return "🔒 Execute a consulta diagnóstica (Passo 3) no Firestore para liberar os termos e contratos.";
      case "credenciais":
        return "🔒 O contrato deve ser assinado (Passo 4) no Firestore antes de enviar o certificado e senhas.";
      case "simulador":
        return "🔒 Forneça os acessos e credenciais (Passo 5) no Firestore para liberar a estruturação da proposta.";
      case "apta_bancaria":
      case "passo7":
      case "acompanhamento":
        return "🔒 Conclua a estruturação da proposta (Passo 6) no Firestore para liberar a validação de Operação Apta à solicitação bancária.";
      default:
        return "🔒 Preencha e salve os dados obrigatórios do passo anterior no Firestore para desbloquear esta etapa.";
    }
  };

  return {
    maxUnlockedStep,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    isStep4Complete,
    isStep5Complete,
    isStep6Complete,
    isStep7Complete,
    isStep8Complete,
    isStepUnlocked,
    isTabUnlocked,
    getLockedReason,
  };
}
