// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Seguranca from "./components/Seguranca";
import Novidades from "./components/Novidades";
import ComoFunciona from "./components/ComoFunciona";
import Simulador from "./components/Simulador";
import Elegibilidade from "./components/Elegibilidade";
import Consultoria from "./components/Consultoria";
import Parceiros from "./components/Parceiros";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import AdminDashboard from "./components/AdminDashboard";
import TrackingPortal from "./components/TrackingPortal";
import PartnerPortal from "./components/PartnerPortal";
import UserRegistrationForm from "./components/UserRegistrationForm";
import { LeadData, SimulationResult } from "./types";
import { Phone, Calculator, Landmark, ShieldCheck, HelpCircle, Handshake } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

const extractHotmartCode = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/(?:go\.hotmart\.com\/|ref=)([A-Z0-9]+)/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return trimmed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
};

const extractHublaCode = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const parts = trimmed.split('/');
  const lastPart = parts[parts.length - 1].split('?')[0];
  return lastPart.replace(/[^A-Za-z0-9_-]/g, "");
};

export interface AnaliseRiscoInput {
  creditScore?: number;
  apontamentosRestritivos?: number;
  dividasAtivasUfg?: number;
  regularidadeFiscal?: boolean;
  cndEmitida?: boolean;
  faturamentoEstimadoBacen?: number;
  [key: string]: any;
}

/**
 * Etapa de Análise de Risco Preliminar da IA PROSFEC
 * Refina automaticamente o nível de preparação, alertas e recomendações
 * utilizando tanto as respostas fiscais do formulário quanto retornos de APIs externas de consulta de crédito.
 */
export function executarAnaliseRiscoPreliminar(
  lead: LeadData,
  result: SimulationResult,
  externalCreditData?: AnaliseRiscoInput
): SimulationResult {
  let nivelPreparacao: "alto" | "medio" | "baixo" = result.nivelPreparacao || "alto";
  const alertas: string[] = [...(result.principaisAlertas || [])];
  const recomendacoes: string[] = [...(result.recomendações || [])];

  const addAlert = (msg: string) => { if (!alertas.includes(msg)) alertas.push(msg); };
  const addRec = (msg: string) => { if (!recomendacoes.includes(msg)) recomendacoes.push(msg); };

  // 1. Validação de Enquadramento Tributário & Porte
  const effectiveAnnualRevenue = lead.menosDe12Meses
    ? (lead.mediaReceitaMensal || 0) * 12
    : lead.faturamentoAnual || 0;

  if (lead.porte === "MEI" && effectiveAnnualRevenue > 81000) {
    nivelPreparacao = "baixo";
    addAlert(`[Análise de Risco] Faturamento anual de R$ ${effectiveAnnualRevenue.toLocaleString('pt-BR')} excede o teto MEI (R$ 81.000).`);
    addRec("Solicitar o desenquadramento de MEI para ME junto ao portal e-CAC antes de dar entrada na proposta.");
  } else if (lead.porte === "ME" && effectiveAnnualRevenue > 360000) {
    if (nivelPreparacao === "alto") nivelPreparacao = "medio";
    addAlert(`[Análise de Risco] Faturamento anual de R$ ${effectiveAnnualRevenue.toLocaleString('pt-BR')} supera a faixa de Microempresa.`);
    addRec("Efetuar a atualização de enquadramento para EPP (Empresa de Pequeno Porte).");
  }

  // 2. Análise de Situação Cadastral
  if (lead.situacaoCadastral && lead.situacaoCadastral !== "Ativa") {
    nivelPreparacao = "baixo";
    addAlert(`[Risco Cadastral] O CNPJ apresenta situação "${lead.situacaoCadastral}" perante a Receita Federal.`);
    addRec("Regularizar a situação cadastral do CNPJ junto à Receita Federal para viabilizar a submissão bancária.");
  }

  // 3. Análise de apontamentos de restrição
  if (lead.possuiRestricaoSerasa) {
    nivelPreparacao = "baixo";
    addAlert("[Risco de Crédito] Identificado apontamento restritivo ativo nos órgãos de proteção ao crédito (Serasa/SPC).");
    addRec("Consultar a origem do apontamento e proceder com a repactuação ou quitação para destravar o score.");
  }

  // 4. Análise de Dívidas Tributárias
  if (lead.possuiDividasTributarias) {
    if (nivelPreparacao === "alto") nivelPreparacao = "medio";
    addAlert("[Risco Fiscal] Existência de débitos fiscais pendentes de parcelamento.");
    addRec("Emitir o parcelamento simplificado e-CAC/PGFN para obter a Certidão Negativa com Efeito de Negativa (CPEN).");
  }

  // 5. Análise de tempo de fundação
  if (lead.menosDe12Meses) {
    if (nivelPreparacao === "alto") nivelPreparacao = "medio";
    addAlert("[Risco Operacional] Empresa aberta há menos de 12 meses sujeita a regras de fomento proporcional.");
    addRec("Anexar o Balancete de Abertura assinado pelo contador para comprovação de aporte de capital social.");
  }

  // 6. Refinamento Dinâmico com dados da Consulta de Crédito via API Externa (quando disponível)
  if (externalCreditData) {
    if (typeof externalCreditData.creditScore === "number") {
      const score = externalCreditData.creditScore;
      if (score < 400) {
        nivelPreparacao = "baixo";
        addAlert(`[Consulta de Crédito API] Score de crédito preliminar baixo (${score}/1000 pts).`);
        addRec("Encaminhar proposta via fundos garantidores estendidos com complemento de garantias reais/fidejussórias.");
      } else if (score < 650) {
        if (nivelPreparacao === "alto") nivelPreparacao = "medio";
        addAlert(`[Consulta de Crédito API] Score de crédito moderado (${score}/1000 pts).`);
        addRec("Submeter histórico de faturamento e-CAC autenticado dos últimos 12 meses para compensação no comitê.");
      } else {
        addAlert(`[Consulta de Crédito API] Score de crédito excelente (${score}/1000 pts). Alto potencial de aprovação expressa.`);
      }
    }

    if (externalCreditData.apontamentosRestritivos && externalCreditData.apontamentosRestritivos > 0) {
      nivelPreparacao = "baixo";
      addAlert(`[Consulta de Crédito API] Detectado(s) ${externalCreditData.apontamentosRestritivos} apontamento(s) no sistema SCR/Serasa.`);
      addRec("Solicitar extrato detalhado para saneamento prévio antes do envio ao banco.");
    }

    if (externalCreditData.cndEmitida === false) {
      if (nivelPreparacao === "alto") nivelPreparacao = "medio";
      addAlert("[Consulta de Crédito API] Ausência de Certidão Negativa de Débitos (CND) no sistema da Dívida Ativa.");
      addRec("Efetuar levantamento de débitos na PGFN e solicitar emissão de guia de arrecadação.");
    }
  }

  // 7. Cálculo do Score PROSFEC de Elegibilidade (0 a 100)
  let scoreCalculado = 85; // Base inicial para perfil standard
  const fatoresPositivos: string[] = [];
  const fatoresAtencao: string[] = [];

  if (lead.situacaoCadastral === "Ativa") {
    scoreCalculado += 5;
    fatoresPositivos.push("CNPJ ativo e regular perante a Receita Federal");
  } else {
    scoreCalculado -= 30;
    fatoresAtencao.push("Situação cadastral inativa ou com pendência");
  }

  if (lead.possuiDeclaracaoFaturamento) {
    scoreCalculado += 5;
    fatoresPositivos.push("Declarações fiscais anuais transmitidas e atualizadas");
  } else {
    scoreCalculado -= 20;
    fatoresAtencao.push("Pendência na transmissão das declarações de faturamento");
  }

  if (lead.autorizaCompartilhamentoEcac) {
    scoreCalculado += 5;
    fatoresPositivos.push("Autorização e-CAC de compartilhamento habilitada");
  }

  if (lead.possuiRestricaoSerasa) {
    scoreCalculado -= 25;
    fatoresAtencao.push("Apontamento restritivo ativo em órgãos de proteção");
  } else {
    scoreCalculado += 5;
    fatoresPositivos.push("Sem restrições declaradas nos órgãos de crédito");
  }

  if (lead.possuiDividasTributarias) {
    scoreCalculado -= 15;
    fatoresAtencao.push("Dívidas tributárias pendentes de parcelamento");
  } else {
    fatoresPositivos.push("Regularidade fiscal e ausência de débitos na Dívida Ativa");
  }

  if (lead.possuiPatrimonioVinculado === "sim") {
    scoreCalculado += 5;
    fatoresPositivos.push("Patrimônio registrado vinculado a sócios/empresa");
  }

  if (lead.menosDe12Meses) {
    scoreCalculado -= 10;
    fatoresAtencao.push("Tempo de abertura inferior a 12 meses");
  }

  // Normalização entre 15 e 98
  scoreCalculado = Math.max(15, Math.min(98, scoreCalculado));

  const resumoRisco = nivelPreparacao === "alto"
    ? "Perfil de Elevada Preparação (Baixo Risco): Elegibilidade plena para pleitear limites elevados com rápida liberação."
    : nivelPreparacao === "medio"
    ? "Perfil de Preparação Intermediária (Risco Moderado): Requer adequações contábeis/fiscais simples para máxima aprovação."
    : "Perfil de Baixa Preparação (Alto Risco): Necessita de saneamento cadastral ou fiscal antes da submissão aos bancos.";

  return {
    ...result,
    nivelPreparacao,
    scoreElegibilidade: result.scoreElegibilidade || scoreCalculado,
    scoreFatores: result.scoreFatores || {
      positivos: fatoresPositivos,
      atencao: fatoresAtencao
    },
    principaisAlertas: alertas,
    recomendações: recomendacoes,
    resumoPerfil: result.resumoPerfil ? `${result.resumoPerfil} • ${resumoRisco}` : resumoRisco,
    justificativaTecnica: result.justificativaTecnica
      ? `${result.justificativaTecnica}\n\n[Análise de Risco Preliminar PROSFEC IA]: Score de Elegibilidade: ${scoreCalculado}/100 pts. Classificação: "${nivelPreparacao.toUpperCase()}".`
      : `[Análise de Risco Preliminar PROSFEC IA]: Score de Elegibilidade: ${scoreCalculado}/100 pts. Classificação: "${nivelPreparacao.toUpperCase()}".`
  };
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientTrackingId, setClientTrackingId] = useState<string | null>(null);
  const [showTracking, setShowTracking] = useState(false);
  const [showPartnerPortal, setShowPartnerPortal] = useState(false);
  const [showUserRegistration, setShowUserRegistration] = useState(false);
  const [referredByPartnerId, setReferredByPartnerId] = useState<string | null>(null);
  const [referredByPartnerNome, setReferredByPartnerNome] = useState<string | null>(null);
  const [referredByPartnerWhatsapp, setReferredByPartnerWhatsapp] = useState<string | null>(null);

  // States to pass plan registration data to PartnerPortal
  const [partnerInitialPlan, setPartnerInitialPlan] = useState<string>("Executive Partner PROSFEC");
  const [partnerInitialRegister, setPartnerInitialRegister] = useState<boolean>(false);

  const handleSelectPlanForPartner = (planName: string) => {
    setPartnerInitialPlan(planName);
    setPartnerInitialRegister(true);
    setShowPartnerPortal(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("admin") || params.get("painel") || params.get("chave");
    if (token === "admprosfec") {
      setIsAdmin(true);
    }

    const trackId = params.get("acompanhamento") || params.get("tracking") || params.get("status") || params.get("leadTrack");
    if (trackId) {
      // A partir de agora o acompanhamento do cliente vive na rota própria
      // /portal-cliente. Redireciona links antigos para a nova URL.
      window.location.replace(`/portal-cliente?lead=${encodeURIComponent(trackId)}`);
      return;
    }

    const isRegisterForm = params.get("cadastro") === "true" || params.get("cadastro-usuario") === "true" || params.get("cadastro-consultor") === "true" || params.get("novo-usuario") === "true";
    if (isRegisterForm) {
      setShowUserRegistration(true);
    }

    const partnerLogin = params.get("portal-parceiro") || params.get("area-parceiro") || params.get("parceiro-login");
    if (partnerLogin === "true" || params.has("parceiro-login") || params.has("area-parceiro")) {
      setShowPartnerPortal(true);
    }

    // Capture referrer parameters
    const rawRefId = params.get("ref") || params.get("master") || params.get("indicador") || params.get("parceiro");
    const refId = rawRefId ? rawRefId.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, "").trim() : null;
    if (refId) {
      setReferredByPartnerId(refId);
      localStorage.setItem("lca_referred_by", refId);

      const fetchPartnerDetails = async () => {
        try {
          const partnerSnap = await getDoc(doc(db, "parceiros", refId));
          if (partnerSnap.exists()) {
            const data = partnerSnap.data();
            if (data) {
              if (data.nome) {
                setReferredByPartnerNome(data.nome);
                localStorage.setItem("lca_referred_by_nome", data.nome);
              }
              if (data.whatsapp) {
                setReferredByPartnerWhatsapp(data.whatsapp);
                localStorage.setItem("lca_referred_by_whatsapp", data.whatsapp);
              }
              if (data.hotmartCode) {
                localStorage.setItem("lca_referred_by_hotmart_code", data.hotmartCode);
              } else if (data.hotmartLink) {
                const code = extractHotmartCode(data.hotmartLink);
                if (code) {
                  localStorage.setItem("lca_referred_by_hotmart_code", code);
                }
              } else {
                localStorage.removeItem("lca_referred_by_hotmart_code");
              }

              // Capture Hubla codes for custom checkouts
              if (data.hublaCodeStarter) {
                localStorage.setItem("lca_referred_by_hubla_starter", extractHublaCode(data.hublaCodeStarter));
              } else {
                localStorage.removeItem("lca_referred_by_hubla_starter");
              }
              if (data.hublaCodeExecutive) {
                localStorage.setItem("lca_referred_by_hubla_executive", extractHublaCode(data.hublaCodeExecutive));
              } else {
                localStorage.removeItem("lca_referred_by_hubla_executive");
              }
              if (data.hublaCodeMaster) {
                localStorage.setItem("lca_referred_by_hubla_master", extractHublaCode(data.hublaCodeMaster));
              } else {
                localStorage.removeItem("lca_referred_by_hubla_master");
              }
            }
          }
        } catch (err) {
          console.error("Error fetching partner details for referral:", err);
        }
      };
      fetchPartnerDetails();
    } else {
      // Clear referral data from local storage on direct access to ensure the main site is clean and points to the central number
      localStorage.removeItem("lca_referred_by");
      localStorage.removeItem("lca_referred_by_nome");
      localStorage.removeItem("lca_referred_by_whatsapp");
      localStorage.removeItem("lca_referred_by_hotmart_code");
      localStorage.removeItem("lca_referred_by_hubla_starter");
      localStorage.removeItem("lca_referred_by_hubla_executive");
      localStorage.removeItem("lca_referred_by_hubla_master");
      setReferredByPartnerId(null);
      setReferredByPartnerNome(null);
      setReferredByPartnerWhatsapp(null);
    }
  }, []);

  const handleLeadCaptured = async (lead: LeadData & { id: string; result: SimulationResult }) => {
    console.log("Saving lead to Firestore:", lead.id);

    // Executa Etapa de Análise de Risco Preliminar para refinar nivelPreparacao e recomendações
    const refinedResult = executarAnaliseRiscoPreliminar(lead, lead.result);

    try {
      const leadDoc = {
        nome: lead.nomeCompleto,
        whatsapp: lead.whatsapp,
        email: lead.email,
        cnpj: lead.cnpj,
        cidade: lead.uf,
        interesse: "simulação",
        status: "novo",
        dataCriacao: new Date().toISOString(),
        razaoSocial: lead.razaoSocial,
        porte: lead.porte,
        dataAbertura: lead.dataAbertura || "",
        ramo: lead.ramo || "",
        menosDe12Meses: lead.menosDe12Meses,
        capitalSocial: lead.capitalSocial || 0,
        mediaReceitaMensal: lead.mediaReceitaMensal || 0,
        seloEmpregaMulher: lead.seloEmpregaMulher || false,
        faturamentoAnual: lead.faturamentoAnual,
        cargo: lead.cargo,
        situacaoCadastral: lead.situacaoCadastral,
        possuiDeclaracaoFaturamento: lead.possuiDeclaracaoFaturamento,
        autorizaCompartilhamentoEcac: lead.autorizaCompartilhamentoEcac,
        possuiRestricaoSerasa: lead.possuiRestricaoSerasa,
        possuiDividasTributarias: lead.possuiDividasTributarias,
        bancoPrincipal: lead.bancoPrincipal,
        objetivoRecurso: lead.objetivoRecurso,
        tempoParaCaptacao: lead.tempoParaCaptacao,
        limiteEstimado: refinedResult.limiteEstimado,
        nivelPreparacao: refinedResult.nivelPreparacao,
        principaisAlertas: refinedResult.principaisAlertas,
        recomendações: refinedResult.recomendações,
        resumoPerfil: refinedResult.resumoPerfil,
        justificativaTecnica: refinedResult.justificativaTecnica,
        analiseRiscoPreliminar: {
          dataAnalise: new Date().toISOString(),
          nivel: refinedResult.nivelPreparacao,
          resumo: refinedResult.resumoPerfil,
          alertasCount: refinedResult.principaisAlertas.length,
          recomendacoesCount: refinedResult.recomendações.length
        },
        creditLineCode: refinedResult.creditLineCode || "PRONAMPE",
        creditLineName: refinedResult.creditLineName || "PRONAMPE (Programa Nacional de Apoio às Microempresas)",
        propostaNegociada: refinedResult.creditLineCode ? {
          valorDesejado: refinedResult.limiteEstimado,
          carenciaMeses: refinedResult.carencia !== undefined ? refinedResult.carencia : 12,
          amortizacaoMeses: refinedResult.prazo !== undefined ? (refinedResult.prazo - (refinedResult.carencia || 0)) : 36,
          sistemaAmortizacao: "SAC",
          taxaAnual: refinedResult.rate !== undefined ? refinedResult.rate : 16.5,
          pagarJurosCarencia: false,
          creditLineCode: refinedResult.creditLineCode,
          creditLineName: refinedResult.creditLineName,
          justificativa: refinedResult.justificativa,
          fonte: refinedResult.fonte || "PROSFEC IA"
        } : {
          valorDesejado: refinedResult.limiteEstimado,
          carenciaMeses: 12,
          amortizacaoMeses: 36,
          sistemaAmortizacao: "SAC",
          taxaAnual: 16.5,
          pagarJurosCarencia: false,
          creditLineCode: "PRONAMPE",
          creditLineName: "PRONAMPE (Programa Nacional de Apoio às Microempresas)",
          justificativa: "Enquadramento automático na linha padrão federal.",
          fonte: "Heuristic Engine"
        },
        parceiroId: referredByPartnerId || "",
        parceiroNome: referredByPartnerNome || ""
      };

      await setDoc(doc(db, "leads", lead.id), leadDoc);
      console.log("Lead saved successfully to Firestore with refined AI risk analysis!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `leads/${lead.id}`);
    }
  };

  // Scroll to simulator action
  const handleScrollToSimulador = () => {
    const element = document.getElementById("simulador");
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  if (isAdmin) {
    return (
      <AdminDashboard
        onExit={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("admin");
          url.searchParams.delete("painel");
          url.searchParams.delete("chave");
          window.history.replaceState({}, "", url.toString());
          setIsAdmin(false);
        }}
      />
    );
  }

  if (showTracking) {
    return (
      <TrackingPortal
        initialLeadId={clientTrackingId}
        onBackToHome={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("acompanhamento");
          url.searchParams.delete("tracking");
          url.searchParams.delete("status");
          url.searchParams.delete("leadTrack");
          window.history.replaceState({}, "", url.toString());
          setClientTrackingId(null);
          setShowTracking(false);
        }}
      />
    );
  }

  if (showUserRegistration) {
    return (
      <UserRegistrationForm
        onBackToHome={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("cadastro");
          url.searchParams.delete("cadastro-usuario");
          url.searchParams.delete("cadastro-consultor");
          url.searchParams.delete("novo-usuario");
          window.history.replaceState({}, "", url.toString());
          setShowUserRegistration(false);
        }}
        onGoToLogin={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("cadastro");
          url.searchParams.delete("cadastro-usuario");
          url.searchParams.delete("cadastro-consultor");
          url.searchParams.delete("novo-usuario");
          url.searchParams.set("portal-parceiro", "true");
          window.history.replaceState({}, "", url.toString());
          setShowUserRegistration(false);
          setShowPartnerPortal(true);
        }}
      />
    );
  }

  if (showPartnerPortal) {
    return (
      <PartnerPortal
        initialPlan={partnerInitialPlan}
        initialIsRegistering={partnerInitialRegister}
        onBackToHome={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("portal-parceiro");
          url.searchParams.delete("area-parceiro");
          url.searchParams.delete("parceiro-login");
          window.history.replaceState({}, "", url.toString());
          setShowPartnerPortal(false);
          setPartnerInitialRegister(false); // Reset
        }}
      />
    );
  }

  return (
    <div className="font-sans antialiased text-gray-800 bg-white min-h-screen flex flex-col">
      {/* Navbar with callbacks */}
      <Navbar
        onSimulateClick={handleScrollToSimulador}
        onPartnerPortalClick={() => setShowPartnerPortal(true)}
      />

      {referredByPartnerNome && (
        <div className="bg-[#0A3D2E] text-white text-xs py-2.5 px-4 text-center font-semibold flex items-center justify-center gap-1.5 border-b border-emerald-500/20 shadow-sm">
          <Handshake className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Você está no portal oficial da PROSFEC indicado pelo consultor <strong className="font-extrabold text-emerald-300">{referredByPartnerNome}</strong></span>
          {referredByPartnerWhatsapp && (
            <span className="hidden sm:inline">
              {" "}· Fale direto:{" "}
              <a 
                href={`https://api.whatsapp.com/send?phone=${referredByPartnerWhatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(referredByPartnerNome)}!%20Estou%20no%20seu%20link%20de%20parceiro%20da%20PROSFEC%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline text-emerald-400 hover:text-emerald-300 transition-colors font-bold"
              >
                {referredByPartnerWhatsapp}
              </a>
            </span>
          )}
        </div>
      )}

      {/* Landing fold layouts */}
      <main className="flex-1">
        {/* 1. HERO */}
        <Hero onSimulateClick={handleScrollToSimulador} />

        {/* SEGURANÇA E CONFIABILIDADE */}
        <Seguranca />

        {/* 2. NOVIDADES 2026 */}
        <Novidades />

        {/* 3. COMO FUNCIONA */}
        <ComoFunciona />

        {/* 4. SIMULADOR (FORMULÁRIO MULTI-STEP) */}
        <Simulador 
          onLeadCaptured={handleLeadCaptured} 
          referredByPartnerWhatsapp={referredByPartnerWhatsapp}
          referredByPartnerNome={referredByPartnerNome}
        />

        {/* 5. ELEGIBILIDADE */}
        <Elegibilidade />

        {/* 6. CONSULTORIA */}
        <Consultoria onSimulateClick={handleScrollToSimulador} />

        {/* 7. PROGRAMA DE PARCEIROS */}
        <Parceiros onSelectPlan={handleSelectPlanForPartner} />

        {/* 8. FAQ */}
        <FAQ />
      </main>

      {/* 9. RODAPÉ */}
      <Footer
        onSimulateClick={handleScrollToSimulador}
        referredByPartnerWhatsapp={referredByPartnerWhatsapp}
        referredByPartnerNome={referredByPartnerNome}
      />

      {/* FLOATING WHATSAPP BUTTON */}
      <a
        href={referredByPartnerWhatsapp 
          ? `https://api.whatsapp.com/send?phone=${referredByPartnerWhatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(referredByPartnerNome || "")}!%20Gostaria%20de%20falar%20sobre%20a%20minha%20empresa%20no%20Pronampe%202026.`
          : "https://api.whatsapp.com/send?phone=5598987353253&text=Ol%C3%A1%20PROSFEC!%20Gostaria%20de%20falar%20com%20um%20consultor%20especialista%20do%20Pronampe%202026."
        }
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-6 bottom-20 md:bottom-6 z-50 flex items-center gap-2 group cursor-pointer"
        aria-label="Falar no WhatsApp"
      >
        {/* WhatsApp Icon Circle Container */}
        <div className="bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 relative">
          {/* Subtle pulse ring around button */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping pointer-events-none"></span>
          
          <svg
            className="w-7 h-7 fill-current"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
          </svg>
        </div>
      </a>

      {/* MOBILE STICKY CTA (Bottom of mobile screen) - Clean, premium conversion focused */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl p-3 z-45 flex gap-3 h-16 items-center">
        <button
          onClick={handleScrollToSimulador}
          className="flex-1 bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
        >
          <Calculator className="w-5 h-5" />
          Simular Limite
        </button>

        <a
          href={referredByPartnerWhatsapp 
            ? `https://api.whatsapp.com/send?phone=${referredByPartnerWhatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(referredByPartnerNome || "")}!%20Gostaria%20de%20falar%20sobre%20a%20minha%20empresa%20no%20Pronampe%202026.`
            : "https://api.whatsapp.com/send?phone=5598987353253&text=Ol%C3%A1%20PROSFEC!%20Gostaria%20de%20falar%20com%20um%20consultor%20especialista%20do%20Pronampe%202026."
          }
          target="_blank"
          rel="noreferrer"
          className="flex-1 bg-brand-primary text-white hover:bg-zinc-800 font-extrabold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
        >
          <Phone className="w-4.5 h-4.5 fill-current" />
          Falar c/ Especialista
        </a>
      </div>
    </div>
  );
}
