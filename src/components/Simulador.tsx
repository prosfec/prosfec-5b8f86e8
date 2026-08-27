// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  formatCNPJ,
  validateCNPJ,
  formatCurrencyBRL,
  formatPhone,
  formatCPF,
  formatCEP,
  triggerWebhookSimulation,
  brazilianUFs,
  validateCPF,
  validatePhone,
  fetchCNPJ
} from "../utils";
import { LeadData, SimulationResult } from "../types";
import { doc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";
import {
  Building,
  User,
  Shield,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Phone,
  Check,
  Send,
  Loader2,
  X,
  Sparkles,
  Clock,
  Bot,
  Copy,
  ExternalLink,
  TrendingDown,
  PiggyBank,
  Coins,
  Percent,
  Zap
} from "lucide-react";

interface SimuladorProps {
  onLeadCaptured: (lead: LeadData & { id: string; result: SimulationResult }) => void;
  referredByPartnerWhatsapp?: string | null;
  referredByPartnerNome?: string | null;
  referredByPartnerId?: string | null;
  initialData?: Partial<LeadData> | null;
  isModalMode?: boolean;
  onCancel?: () => void;
}

const initialLeadData: LeadData = {
  cnpj: "",
  razaoSocial: "",
  porte: "ME",
  dataAbertura: "",
  uf: "SP",
  ramo: "",
  menosDe12Meses: false,
  capitalSocial: 0,
  mediaReceitaMensal: 0,
  seloEmpregaMulher: false,
  faturamentoAnual: 0,
  nomeCompleto: "",
  email: "",
  whatsapp: "",
  cargo: "Sócio",
  situacaoCadastral: "Ativa",
  possuiDeclaracaoFaturamento: true,
  autorizaCompartilhamentoEcac: true,
  possuiRestricaoSerasa: false,
  possuiDividasTributarias: false,
  bancoPrincipal: "",
  possuiLinhaCreditoGovernamentalAtiva: false,
  linhaCreditoGovernamentalQual: "",
  possuiPatrimonioVinculado: "",
  objetivoRecurso: "capital_giro",
  tempoParaCaptacao: "medio_prazo"
};

export default function Simulador({ 
  onLeadCaptured, 
  referredByPartnerWhatsapp, 
  referredByPartnerNome,
  referredByPartnerId,
  initialData,
  isModalMode = false,
  onCancel
}: SimuladorProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<LeadData>(() => {
    if (initialData) {
      return {
        ...initialLeadData,
        ...initialData,
        cnpj: initialData.cnpj ? formatCNPJ(initialData.cnpj) : "",
        whatsapp: initialData.whatsapp ? formatPhone(initialData.whatsapp) : "",
        razaoSocial: initialData.razaoSocial || (initialData as any).nomeEmpresa || ""
      };
    }
    return initialLeadData;
  });
  const [tempFaturamento, setTempFaturamento] = useState(() => initialData?.faturamentoAnual ? formatCurrencyBRL(initialData.faturamentoAnual) : "");
  const [tempCapitalSocial, setTempCapitalSocial] = useState(() => initialData?.capitalSocial ? formatCurrencyBRL(initialData.capitalSocial) : "");
  const [tempMediaReceitaMensal, setTempMediaReceitaMensal] = useState(() => initialData?.mediaReceitaMensal ? formatCurrencyBRL(initialData.mediaReceitaMensal) : "");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [calculating, setCalculating] = useState(false);
  const [finished, setFinished] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  const [existingLeadTrack, setExistingLeadTrack] = useState<{ id: string; razaoSocial: string; dataCriacao: string; status: string } | null>(null);
  const [copiedLeadLink, setCopiedLeadLink] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false);
  const [cnpjInfoMessage, setCnpjInfoMessage] = useState<string | null>(null);

  // Check if lead already exists in Firestore database
  const checkDuplicateLead = async (cnpjVal: string, emailVal?: string) => {
    const cleanCnpj = cnpjVal.replace(/\D/g, "");
    if (cleanCnpj.length !== 14 && (!emailVal || !emailVal.includes("@"))) {
      setExistingLeadTrack(null);
      return;
    }
    try {
      setCheckingDuplicate(true);
      const leadsRef = collection(db, "leads");

      if (cleanCnpj.length === 14) {
        let q = query(leadsRef, where("cnpj", "==", cnpjVal.trim()), limit(1));
        let snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data();
          setExistingLeadTrack({
            id: d.id,
            razaoSocial: data.razaoSocial || data.nome || "Empresa Cadastrada",
            dataCriacao: data.dataCriacao || "",
            status: data.status || "em análise"
          });
          setCheckingDuplicate(false);
          return;
        }

        q = query(leadsRef, where("cnpj", "==", cleanCnpj), limit(1));
        snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data();
          setExistingLeadTrack({
            id: d.id,
            razaoSocial: data.razaoSocial || data.nome || "Empresa Cadastrada",
            dataCriacao: data.dataCriacao || "",
            status: data.status || "em análise"
          });
          setCheckingDuplicate(false);
          return;
        }
      }

      if (emailVal && emailVal.includes("@")) {
        const qEmail = query(leadsRef, where("email", "==", emailVal.trim().toLowerCase()), limit(1));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          const d = snapEmail.docs[0];
          const data = d.data();
          setExistingLeadTrack({
            id: d.id,
            razaoSocial: data.razaoSocial || data.nome || "Empresa Cadastrada",
            dataCriacao: data.dataCriacao || "",
            status: data.status || "em análise"
          });
          setCheckingDuplicate(false);
          return;
        }
      }

      setExistingLeadTrack(null);
    } catch (err) {
      console.warn("Error checking duplicate lead:", err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  useEffect(() => {
    const cleanCnpj = formData.cnpj.replace(/\D/g, "");
    if (cleanCnpj.length === 14 || (formData.email && formData.email.includes("@"))) {
      checkDuplicateLead(formData.cnpj, formData.email);
    } else {
      setExistingLeadTrack(null);
    }
  }, [formData.cnpj, formData.email]);

  // Exit-Intent State
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentDismissed, setExitIntentDismissed] = useState(false);

  // Track Exit-Intent (user tries to leave)
  useEffect(() => {
    if (isModalMode) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (exitIntentDismissed || finished) return;
      // Trigger when mouse moves out of top viewport (standard exit-intent metric)
      if (e.clientY < 30) {
        const hasData = formData.cnpj || formData.nomeCompleto || formData.whatsapp || step > 1;
        if (hasData) {
          setShowExitIntent(true);
        }
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [exitIntentDismissed, finished, formData.cnpj, formData.nomeCompleto, formData.whatsapp, step, isModalMode]);

  // Auto-fetch CNPJ info via BrasilAPI
  useEffect(() => {
    const cleanCnpj = formData.cnpj.replace(/\D/g, "");
    if (cleanCnpj.length === 14) {
      const runFetch = async () => {
        setIsConsultingCnpj(true);
        setCnpjInfoMessage(null);
        try {
          const info = await fetchCNPJ(cleanCnpj);
          
          let parsedPorte: "MEI" | "ME" | "EPP" | "EMP" | "EGP" = "ME";
          if (info.porte) {
            const p = String(info.porte).toUpperCase();
            if (p.includes("MICRO") || p.includes("MEI") || p === "01" || p === "ME") {
              parsedPorte = p.includes("INDIVIDUAL") || p.includes("MEI") ? "MEI" : "ME";
            } else if (p.includes("PEQUENO") || p === "03" || p === "EPP") {
              parsedPorte = "EPP";
            } else if (p.includes("MÉDIO") || p.includes("MEDIO") || p.includes("05") || p === "EMP") {
              parsedPorte = "EMP";
            } else if (p.includes("GRANDE") || p.includes("DEMAIS") || p === "EGP") {
              parsedPorte = "EGP";
            }
          }

          setFormData(prev => ({
            ...prev,
            razaoSocial: info.razao_social || info.nome_fantasia || prev.razaoSocial,
            porte: parsedPorte,
            uf: info.uf || prev.uf,
            situacaoCadastral: info.descricao_situacao_cadastral || prev.situacaoCadastral,
            dataAbertura: info.data_inicio_atividade || prev.dataAbertura
          }));

          setCnpjInfoMessage("✅ CNPJ consultado e preenchido automaticamente!");
        } catch (err: any) {
          console.warn("CNPJ lookup failed/rate-limited", err);
          setCnpjInfoMessage("⚠️ Consulta automática indisponível (limite ou indisponibilidade). Digite os dados manualmente.");
        } finally {
          setIsConsultingCnpj(false);
        }
      };
      runFetch();
    } else {
      setCnpjInfoMessage(null);
    }
  }, [formData.cnpj]);

  // Partners (Sócios) Data State
  const [socio1, setSocio1] = useState({
    nome: "",
    cpf: "",
    dataNascimento: "",
    participacao: "100",
    nomeMae: "",
    telefone: "",
    rg: "",
    orgaoEmissor: ""
  });
  const [enderecoSocio, setEnderecoSocio] = useState({
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "SP"
  });
  const [hasSocio2, setHasSocio2] = useState(false);
  const [socio2, setSocio2] = useState({
    nome: "",
    cpf: "",
    dataNascimento: "",
    participacao: "",
    telefone: ""
  });
  const [submittingSocios, setSubmittingSocios] = useState(false);
  const [sociosSubmitted, setSociosSubmitted] = useState(false);
  const [sociosError, setSociosError] = useState("");

  // Masks and state sync
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
    if (errors.cnpj) {
      setErrors({ ...errors, cnpj: "" });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, whatsapp: formatted });
    if (errors.whatsapp) {
      setErrors({ ...errors, whatsapp: "" });
    }
  };

  const handleFaturamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // strip everything but digits
    const clean = e.target.value.replace(/\D/g, "");
    const valueNum = clean ? parseInt(clean) / 100 : 0;
    
    setTempFaturamento(clean ? formatCurrencyBRL(valueNum) : "");
    setFormData({ ...formData, faturamentoAnual: valueNum });
    if (errors.faturamentoAnual) {
      setErrors({ ...errors, faturamentoAnual: "" });
    }
  };

  const handleCapitalSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "");
    const valueNum = clean ? parseInt(clean) / 100 : 0;
    
    setTempCapitalSocial(clean ? formatCurrencyBRL(valueNum) : "");
    setFormData({ ...formData, capitalSocial: valueNum });
    if (errors.capitalSocial) {
      setErrors({ ...errors, capitalSocial: "" });
    }
  };

  const handleMediaReceitaMensalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "");
    const valueNum = clean ? parseInt(clean) / 100 : 0;
    
    setTempMediaReceitaMensal(clean ? formatCurrencyBRL(valueNum) : "");
    setFormData({ ...formData, mediaReceitaMensal: valueNum });
    if (errors.mediaReceitaMensal) {
      setErrors({ ...errors, mediaReceitaMensal: "" });
    }
  };

  // Field validation per Step
  const validateStep = (currentStep: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (currentStep === 1) {
      if (!formData.cnpj) {
        newErrors.cnpj = "Por favor, digite o CNPJ da empresa.";
      } else if (!validateCNPJ(formData.cnpj)) {
        newErrors.cnpj = "CNPJ inválido. Digite um formato válido (14 dígitos).";
      }
      if (!formData.razaoSocial.trim()) {
        newErrors.razaoSocial = "Por favor, preencha a Razão Social / Nome Fantasia.";
      }
      if (!formData.porte) {
        newErrors.porte = "Selecione o porte tributário de enquadramento.";
      }
      if (formData.menosDe12Meses) {
        if ((formData.capitalSocial || 0) <= 0 && (formData.mediaReceitaMensal || 0) <= 0) {
          newErrors.capitalSocial = "Informe o Capital Social ou a Média de Faturamento Mensal.";
          newErrors.mediaReceitaMensal = "Informe o Capital Social ou a Média de Faturamento Mensal.";
        }
      } else {
        if (formData.faturamentoAnual <= 0) {
          newErrors.faturamentoAnual = "O faturamento deve ser maior do que zero.";
        }
      }
    } else if (currentStep === 2) {
      if (!formData.nomeCompleto.trim()) {
        newErrors.nomeCompleto = "Por favor, digite seu nome completo.";
      }
      if (!formData.email.trim()) {
        newErrors.email = "Por favor, digite seu e-mail corporativo.";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Digite um e-mail válido.";
      }
      if (!formData.whatsapp) {
        newErrors.whatsapp = "Por favor, preencha seu WhatsApp.";
      } else if (!validatePhone(formData.whatsapp)) {
        newErrors.whatsapp = "WhatsApp inválido. Digite um número de celular real com DDD.";
      }
    } else if (currentStep === 3) {
      if (!formData.autorizaCompartilhamentoEcac) {
        newErrors.autorizaCompartilhamentoEcac = "É altamente recomendado autorizar o e-CAC para o diagnóstico.";
      }
    } else if (currentStep === 4) {
      if (!formData.bancoPrincipal) {
        newErrors.bancoPrincipal = "Selecione ou digite o seu banco de preferência.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      // Trigger pixel style events as required
      triggerWebhookSimulation(`step_${step}_completed`, {
        step,
        partiallySaved: formData
      });
      
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const calculateResult = async () => {
    if (!validateStep(5)) return;

    setCalculating(true);
    
    try {
      const response = await fetch("/api/credit/diagnostico-simulador", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cnpj: formData.cnpj,
          razaoSocial: formData.razaoSocial,
          porte: formData.porte,
          uf: formData.uf,
          ramo: formData.ramo || "Geral / Comércio",
          menosDe12Meses: formData.menosDe12Meses,
          capitalSocial: formData.capitalSocial,
          mediaReceitaMensal: formData.mediaReceitaMensal,
          faturamentoAnual: formData.faturamentoAnual,
          seloEmpregaMulher: formData.seloEmpregaMulher,
          bancoPrincipal: formData.bancoPrincipal,
          possuiLinhaCreditoGovernamentalAtiva: formData.possuiLinhaCreditoGovernamentalAtiva,
          linhaCreditoGovernamentalQual: formData.linhaCreditoGovernamentalQual,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResult = await response.json();
      
      if (apiResult && apiResult.success) {
        let prepScore: "alto" | "medio" | "baixo" = "alto";
        const alerts: string[] = [];
        const recs: string[] = [];

        const effectiveAnnualRevenue = formData.menosDe12Meses 
          ? (formData.mediaReceitaMensal || 0) * 12 
          : formData.faturamentoAnual;

        if (formData.porte === "MEI" && effectiveAnnualRevenue > 81000) {
          prepScore = "baixo";
          alerts.push(`Seu faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} ultrapassa o limite legal anual de R$ 81.000,00 para MEI.`);
          recs.push("Será preciso solicitar o desenquadramento de MEI e migrar para ME (Microempresa) antes de protocolar.");
        } else if (formData.porte === "ME" && effectiveAnnualRevenue > 360000) {
          prepScore = "medio";
          alerts.push(`Seu faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} excede o limite de R$ 360.000,00 para Microempresa.`);
          recs.push("Sua empresa se enquadra na faixa de EPP (Empresa de Pequeno Porte). Nós ajudamos você no reenquadramento e upgrade tributário.");
        } else if (effectiveAnnualRevenue > 4800000) {
          if ((prepScore as string) === "baixo") {
            // keep if serasa/etc set it, otherwise alto
          } else {
            prepScore = "alto";
          }
          alerts.push(`Faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} qualifica seu CNPJ para linhas corporativas de médio/grande porte (FGI PEAC, BNDES Pequenas Empresas, FNE/FNO).`);
          recs.push("Sua empresa se enquadra em teto corporativo estendido com acesso a recursos via fundos garantidores e agentes repassadores.");
        }

        if (formData.possuiRestricaoSerasa) {
          prepScore = "baixo";
          alerts.push("Seu CNPJ possui restrições ativas no Serasa/SPC, o que bloqueia o andamento automático nos bancos.");
          recs.push("Nossa equipe pode te ajudar a identificar a origem do apontamento e orientar sobre a liquidação da dívida ou repactuação para destravar seu score bônus.");
        }

        if (formData.menosDe12Meses) {
          if (prepScore === "alto") prepScore = "medio";
          alerts.push("Empresa aberta há menos de 12 meses possui regras de limite proporcional diferenciadas.");
          recs.push("Apresentaremos balancete de abertura assinado pelo contador para comprovação de aporte de capital social.");
        }

        if (formData.possuiDividasTributarias) {
          if (prepScore === "alto") prepScore = "medio";
          alerts.push("A existência de dívidas fiscais sem parcelamento impede a liberação da CND (Certidão Negativa de Débitos).");
          recs.push("Ajudamos você a emitir a Guia de Regularização ou estruturar o parcelamento simples para emitir a CND exigida pelo agente financeiro.");
        }

        if (formData.possuiLinhaCreditoGovernamentalAtiva) {
          const linhaQual = formData.linhaCreditoGovernamentalQual || "governamental";
          alerts.push(`Sua empresa já possui operação de crédito ativa na linha ${linhaQual}.`);
          recs.push(`Mapearemos linhas de fomento complementares (ex: PEAC, FAMPE, FGI ou Fundos Regionais) para expandir seu limite sem atingir o teto da linha atual.`);
        }

        if (!formData.possuiDeclaracaoFaturamento) {
          prepScore = "baixo";
          alerts.push("Sem a transmissão da declaração anual de faturamento (DASN-SIMEI ou DEFIS), o banco não consegue validar sua receita bruta.");
          recs.push("Você precisará solicitar ao seu contador que transmita urgentemente as pendências declaratórias fiscais.");
        }

        if (formData.situacaoCadastral !== "Ativa") {
          prepScore = "baixo";
          alerts.push("CNPJ com situação cadastral inativa ou pendente não possui elegibilidade para solicitar crédito.");
          recs.push("É obrigatório reabilitar o CNPJ junto à Receita Federal para submeter qualquer proposta.");
        }

        if (alerts.length === 0) {
          alerts.push("CNPJ regularizado e limpo! Excelente elegibilidade para liberação rápida de crédito.");
          recs.push("Para agilizar a liberação, faça o login com sua conta gov.br Ouro/Prata e configure o compartilhamento de dados no portal da Receita Federal.");
          recs.push("Fale com nossos consultores para identificar os bancos parceiros que possuem taxas promocionais ativas hoje.");
        }

        const result: SimulationResult = {
          limiteEstimado: apiResult.recommendedLimit,
          nivelPreparacao: prepScore,
          principaisAlertas: alerts,
          recomendações: recs,
          creditLineCode: apiResult.creditLineCode,
          creditLineName: apiResult.creditLineName,
          rate: apiResult.rate,
          carencia: apiResult.carencia,
          prazo: apiResult.prazo,
          parcela: apiResult.parcela,
          justificativa: apiResult.justificativa,
          justificativaTecnica: apiResult.justificativaTecnica,
          documentosNecessarios: apiResult.documentosNecessarios,
          resumoPerfil: apiResult.resumoPerfil,
          fonte: apiResult.fonte,
          bancoDetalhes: apiResult.bancoDetalhes
        };

        setSimulationResult(result);
        setCalculating(false);
        setFinished(true);

        const submissionId = "PRF-" + Math.floor(100000 + Math.random() * 900000);
        setCreatedLeadId(submissionId);

        setSocio1({
          nome: formData.nomeCompleto,
          cpf: "",
          dataNascimento: "",
          participacao: "100",
          nomeMae: "",
          telefone: formData.whatsapp,
          rg: "",
          orgaoEmissor: ""
        });

        setSociosSubmitted(false);
        setSociosError("");
        setHasSocio2(false);
        setSocio2({
          nome: "",
          cpf: "",
          dataNascimento: "",
          participacao: "",
          telefone: ""
        });
        setEnderecoSocio({
          cep: "",
          logradouro: "",
          numero: "",
          bairro: "",
          cidade: "",
          uf: formData.uf || "SP"
        });

        const finalLead = {
          ...formData,
          id: submissionId,
          result
        };

        triggerWebhookSimulation("lead_simulation_completed", finalLead);
        onLeadCaptured(finalLead);
        return;
      }
    } catch (error) {
      console.warn("AI simulation api error, falling back to local heuristic calculations:", error);
    }

    // Heuristics fallback in case of API failure or network issue
    const faturamento = formData.faturamentoAnual;
    let calculatedLimit = 0;

    const effectiveAnnualRevenue = formData.menosDe12Meses 
      ? (formData.mediaReceitaMensal || 0) * 12 
      : formData.faturamentoAnual;

    if (formData.menosDe12Meses) {
      const capitalSocialVal = formData.capitalSocial || 0;
      const mediaReceitaVal = formData.mediaReceitaMensal || 0;
      const limitCapital = 0.5 * capitalSocialVal;
      const limitReceita = 0.5 * (12 * mediaReceitaVal);
      calculatedLimit = Math.max(limitCapital, limitReceita);
      
      if (formData.seloEmpregaMulher) {
        const limitReceitaMulher = 0.6 * (12 * mediaReceitaVal);
        if (limitReceitaMulher > calculatedLimit) {
          calculatedLimit = limitReceitaMulher;
        }
      }
    } else {
      calculatedLimit = faturamento * 0.6;
    }

    calculatedLimit = Math.min(calculatedLimit, 500000);

    let prepScore: "alto" | "medio" | "baixo" = "alto";
    const alerts: string[] = [];
    const recs: string[] = [];

    if (formData.porte === "MEI" && effectiveAnnualRevenue > 81000) {
      prepScore = "baixo";
      alerts.push(`Seu faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} ultrapassa o limite legal anual de R$ 81.000,00 para MEI.`);
      recs.push("Será preciso solicitar o desenquadramento de MEI e migrar para ME (Microempresa) antes de protocolar o Pronampe.");
    } else if (formData.porte === "ME" && effectiveAnnualRevenue > 360000) {
      prepScore = "medio";
      alerts.push(`Seu faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} excede o limite de R$ 360.000,00 para Microempresa.`);
      recs.push("Sua empresa se enquadra na faixa de EPP (Empresa de Pequeno Porte). Nós ajudamos você no reenquadramento e upgrade tributário.");
    } else if (formData.porte === "EPP" && effectiveAnnualRevenue > 4800000) {
      prepScore = "baixo";
      alerts.push(`Seu faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} excede o teto legal de R$ 4,8 milhões para EPP.`);
      recs.push("O Pronampe é restrito a empresas com receita de até R$ 4,8M. Fale com nossa assessoria para outras linhas corporativas específicas.");
    }

    if (formData.possuiRestricaoSerasa) {
      prepScore = "baixo";
      alerts.push("Seu CNPJ possui restrições ativas no Serasa/SPC, o que bloqueia o andamento automático nos bancos.");
      recs.push("Nossa equipe pode te ajudar a identificar a origem do apontamento e orientar sobre a liquidação da dívida ou repactuação para destravar seu score bônus.");
    }

    if (formData.menosDe12Meses) {
      if (prepScore === "alto") prepScore = "medio";
      alerts.push("Empresa aberta há menos de 12 meses possui regras de limite proporcional diferenciadas conforme regulamento do Pronampe.");
      recs.push("Apresentaremos balancete de abertura assinado pelo contador para comprovação de aporte de capital social.");
    }

    if (formData.possuiDividasTributarias) {
      if (prepScore === "alto") prepScore = "medio";
      alerts.push("A existência de dívidas fiscais sem parcelamento impede a liberação da CND (Certidão Negativa de Débitos).");
      recs.push("Ajudamos você a emitir a Guia de Regularização ou estruturar o parcelamento simples para emitir a CND exigida pelo agente financeiro.");
    }

    if (!formData.possuiDeclaracaoFaturamento) {
      prepScore = "baixo";
      alerts.push("Sem a transmissão da declaração anual de faturamento (DASN-SIMEI ou DEFIS), o banco não consegue validar sua receita bruta.");
      recs.push("Você precisará solicitar ao seu contador que transmita urgentemente as pendências declaratórias fiscais.");
    }

    if (formData.situacaoCadastral !== "Ativa") {
      prepScore = "baixo";
      alerts.push("CNPJ com situação cadastral inativa ou pendente não possui elegibilidade para solicitar crédito.");
      recs.push("É obrigatório reabilitar o CNPJ junto à Receita Federal para submeter qualquer proposta.");
    }

    if (alerts.length === 0) {
      alerts.push("CNPJ regularizado e limpo! Excelente elegibilidade para liberação rápida de crédito.");
      recs.push("Para agilizar a liberação, faça o login com sua conta gov.br Ouro/Prata e configure o compartilhamento de dados no portal da Receita Federal.");
      recs.push("Fale com nossos consultores para identificar os bancos parceiros que possuem taxas promocionais ativas hoje.");
    }

    const capTotalLocal = !formData.menosDe12Meses && faturamento > 0 ? faturamento * 0.30 : ((formData.capitalSocial || 0) * 0.5);
    const excedenteLocal = Math.max(0, capTotalLocal - calculatedLimit);
    const pLocal = calculatedLimit;
    const nLocal = 48;
    const rSubLocal = (16.5 / 12) / 100;
    const parcelaSubLocal = pLocal > 0 ? (pLocal * rSubLocal * Math.pow(1 + rSubLocal, nLocal)) / (Math.pow(1 + rSubLocal, nLocal) - 1) : 0;
    const rMktLocal = (38.0 / 12) / 100;
    const parcelaMktLocal = pLocal > 0 ? (pLocal * rMktLocal * Math.pow(1 + rMktLocal, nLocal)) / (Math.pow(1 + rMktLocal, nLocal) - 1) : 0;
    const econMensalLocal = Math.max(0, parcelaMktLocal - parcelaSubLocal);
    const econTotalLocal = Math.max(0, econMensalLocal * nLocal);

    // Score PROSFEC de Elegibilidade (0 a 100)
    let scoreCalculado = 85;
    const fatoresPositivos: string[] = [];
    const fatoresAtencao: string[] = [];

    if (formData.situacaoCadastral === "Ativa") {
      scoreCalculado += 5;
      fatoresPositivos.push("CNPJ ativo e regular perante a Receita Federal");
    } else {
      scoreCalculado -= 30;
      fatoresAtencao.push("Situação cadastral com restrições");
    }

    if (formData.possuiDeclaracaoFaturamento) {
      scoreCalculado += 5;
      fatoresPositivos.push("Declarações fiscais anuais transmitidas e atualizadas");
    } else {
      scoreCalculado -= 20;
      fatoresAtencao.push("Declarações de faturamento pendentes");
    }

    if (formData.autorizaCompartilhamentoEcac) {
      scoreCalculado += 5;
      fatoresPositivos.push("Autorização e-CAC concedida");
    }

    if (formData.possuiRestricaoSerasa) {
      scoreCalculado -= 25;
      fatoresAtencao.push("Apontamento restritivo ativo");
    } else {
      scoreCalculado += 5;
      fatoresPositivos.push("Sem restrições em órgãos de proteção");
    }

    if (formData.possuiDividasTributarias) {
      scoreCalculado -= 15;
      fatoresAtencao.push("Dívidas tributárias pendentes");
    } else {
      fatoresPositivos.push("Regularidade fiscal perante a Dívida Ativa");
    }

    if (formData.possuiPatrimonioVinculado === "sim") {
      scoreCalculado += 5;
      fatoresPositivos.push("Patrimônio registrado vinculado ao CPF/CNPJ");
    }

    if (formData.menosDe12Meses) {
      scoreCalculado -= 10;
      fatoresAtencao.push("Empresa com menos de 12 meses de fundação");
    }

    scoreCalculado = Math.max(15, Math.min(98, scoreCalculado));

    const result: SimulationResult = {
      limiteEstimado: calculatedLimit,
      nivelPreparacao: prepScore,
      scoreElegibilidade: scoreCalculado,
      scoreFatores: {
        positivos: fatoresPositivos,
        atencao: fatoresAtencao
      },
      principaisAlertas: alerts,
      recomendações: recs,
      creditLineCode: "PRONAMPE",
      creditLineName: "PRONAMPE (Programa Nacional de Apoio às Microempresas)",
      rate: 16.5,
      carencia: 12,
      prazo: 48,
      parcela: Math.round(parcelaSubLocal * 100) / 100,
      justificativa: "Sua empresa foi qualificada no enquadramento automático federal do Pronampe devido ao faturamento e porte compatível.",
      fonte: "Heuristic Engine",
      capacidadeTotal: Math.round(capTotalLocal),
      excedenteCapacidade: Math.round(excedenteLocal),
      economiaMensal: Math.round(econMensalLocal * 100) / 100,
      economiaTotal: Math.round(econTotalLocal * 100) / 100,
      taxaMercadoAnual: 38.0,
      parcelaMercado: Math.round(parcelaMktLocal * 100) / 100
    };

    setSimulationResult(result);
    setCalculating(false);
    setFinished(true);

    const submissionId = "PRF-" + Math.floor(100000 + Math.random() * 900000);
    setCreatedLeadId(submissionId);

    setSocio1({
      nome: formData.nomeCompleto,
      cpf: "",
      dataNascimento: "",
      participacao: "100",
      nomeMae: "",
      telefone: formData.whatsapp,
      rg: "",
      orgaoEmissor: ""
    });

    setSociosSubmitted(false);
    setSociosError("");
    setHasSocio2(false);
    setSocio2({
      nome: "",
      cpf: "",
      dataNascimento: "",
      participacao: "",
      telefone: ""
    });
    setEnderecoSocio({
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: formData.uf || "SP"
    });

    const finalLead = {
      ...formData,
      id: submissionId,
      result
    };

    triggerWebhookSimulation("lead_simulation_completed", finalLead);
    onLeadCaptured(finalLead);
  };

  const resetAll = () => {
    setFormData(initialLeadData);
    setTempFaturamento("");
    setStep(1);
    setFinished(false);
    setSimulationResult(null);
    setCreatedLeadId(null);
    setSociosSubmitted(false);
    setSociosError("");
  };

  const handleSociosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSociosError("");
    
    // Simple validation (only essential fields)
    if (!socio1.nome.trim() || !socio1.cpf || !socio1.dataNascimento) {
      setSociosError("Por favor, preencha todos os campos do Sócio 1 (Nome, CPF e Data de Nascimento).");
      return;
    }
    
    if (!validateCPF(socio1.cpf)) {
      setSociosError("CPF do Sócio 1 inválido. Por favor, digite um CPF válido.");
      return;
    }

    if (hasSocio2) {
      if (!socio2.nome.trim() || !socio2.cpf || !socio2.dataNascimento) {
        setSociosError("Por favor, preencha todos os campos do Sócio 2 (Nome, CPF e Data de Nascimento).");
        return;
      }
      if (!validateCPF(socio2.cpf)) {
        setSociosError("CPF do Sócio 2 inválido. Por favor, digite um CPF válido.");
        return;
      }
    }

    const cleanCPF = socio1.cpf.replace(/\D/g, "");

    setSubmittingSocios(true);
    try {
      const leadId = createdLeadId;
      if (!leadId) {
        throw new Error("ID do lead não encontrado.");
      }

      const refDoc = doc(db, "leads", leadId);
      
      const sociosList = [
        {
          nome: socio1.nome,
          cpf: cleanCPF,
          dataNascimento: socio1.dataNascimento,
          participacao: Number(socio1.participacao) || 100,
          nomeMae: socio1.nomeMae || "",
          telefone: socio1.telefone || formData.whatsapp,
          rg: socio1.rg || "",
          orgaoEmissor: socio1.orgaoEmissor || "",
          cargo: "Sócio Principal"
        }
      ];

      if (hasSocio2) {
        sociosList.push({
          nome: socio2.nome,
          cpf: socio2.cpf.replace(/\D/g, ""),
          dataNascimento: socio2.dataNascimento,
          participacao: Number(socio2.participacao) || 0,
          nomeMae: "",
          telefone: "",
          rg: "",
          orgaoEmissor: "",
          cargo: "Sócio 2"
        });
      }

      await updateDoc(refDoc, {
        socios: sociosList,
        enderecoSocioPrincipal: enderecoSocio,
        etapa: 3, // Advances to Step 3: Consulta diagnóstica no CPF e CNPJ
        status: "em atendimento" // Changes status to "em atendimento"
      });

      // Trigger standard Webhook simulation for step 2 completed
      triggerWebhookSimulation("socios_registration_completed", {
        leadId,
        socios: sociosList,
        endereco: enderecoSocio
      });

      setSociosSubmitted(true);
    } catch (err) {
      console.error("Error saving socios:", err);
      setSociosError("Erro ao salvar os dados no sistema. Tente novamente ou fale com o seu consultor.");
    } finally {
      setSubmittingSocios(false);
    }
  };

  // Translate portal steps helper
  const getStepHeader = () => {
    switch (step) {
      case 1:
        return { title: "Dados da Empresa", percent: "20%", active: "Empresa" };
      case 2:
        return { title: "Dados de Contato", percent: "40%", active: "Contato" };
      case 3:
        return { title: "Situação Fiscal", percent: "60%", active: "Fiscal" };
      case 4:
        return { title: "Perfil Financeiro", percent: "80%", active: "Financeiro" };
      case 5:
        return { title: "Objetivos de Crédito", percent: "100%", active: "Finalização" };
      default:
        return { title: "", percent: "0%", active: "" };
    }
  };

  const headerInfo = getStepHeader();

  const handleWhatsAppRedirect = () => {
    if (!simulationResult) return;
    const limitFormatted = formatCurrencyBRL(simulationResult.limiteEstimado);
    const text = `Olá ${referredByPartnerNome || "PROSFEC"}! Realizei a simulação do Pronampe 2026 para minha empresa${referredByPartnerNome ? " através do seu link de indicação" : ""}.
*CNPJ:* ${formData.cnpj}
*Razão Social:* ${formData.razaoSocial}
*Limite Potencial Estimado:* ${limitFormatted}
*Nível de Preparidade:* ${simulationResult.nivelPreparacao.toUpperCase()}

Gostaria de falar com você para dar andamento ao atendimento e agilizar a liberação do recurso.`;
    
    const encodedText = encodeURIComponent(text);
    const cleanPhone = formData.whatsapp.replace(/\D/g, "");
    
    // Choose partner whatsapp if available, else fallback to platform default
    const targetPhone = referredByPartnerWhatsapp ? referredByPartnerWhatsapp.replace(/\D/g, "") : "5598987353253";
    
    // Open WhatsApp link gracefully supporting iframe restrictions
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
    try {
      const opened = window.open(url, "_blank");
      if (!opened) {
        window.location.href = url;
      }
    } catch (e) {
      console.warn("Direct window.open blocked or failed inside iframe, trying location fallback", e);
      window.location.href = url;
    }
  };

  const handleExitIntentWhatsApp = () => {
    const targetPhone = referredByPartnerWhatsapp ? referredByPartnerWhatsapp.replace(/\D/g, "") : "5598987353253";
    
    let text = `Olá! Estava preenchendo o Simulador de Elegibilidade do Pronampe 2026 e gostaria de salvar meu progresso para garantir meu lugar na análise.`;
    if (formData.cnpj) {
      text += `\n*CNPJ:* ${formData.cnpj}`;
    }
    if (formData.razaoSocial) {
      text += `\n*Empresa:* ${formData.razaoSocial}`;
    }
    if (formData.nomeCompleto) {
      text += `\n*Nome:* ${formData.nomeCompleto}`;
    }
    text += `\n*Progresso atual:* Etapa ${step} de 5`;
    text += `\n\nPoderia me ajudar a reservar minha vaga e prosseguir de onde parei?`;

    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

    try {
      const opened = window.open(url, "_blank");
      if (!opened) {
        window.location.href = url;
      }
    } catch (e) {
      console.warn("Direct window.open blocked or failed inside iframe, trying location fallback", e);
      window.location.href = url;
    }

    setShowExitIntent(false);
    setExitIntentDismissed(true);
  };

  return (
    <div className={isModalMode ? "w-full" : "py-16 md:py-24 bg-brand-bg-light scroll-mt-20"} id={isModalMode ? undefined : "simulador"}>
      <div className={isModalMode ? "w-full" : "max-w-4xl mx-auto px-4 sm:px-6"}>
        
        {/* Section Title (only in full page mode) */}
        {!isModalMode && (
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <h2 className="font-display font-extrabold text-3xl text-brand-primary">
              Calcule seu limite potencial em 5 etapas
            </h2>
            <p className="text-gray-500 text-sm md:text-base font-semibold text-emerald-700">
              ⏳ Leva menos de 3 minutos · Simulador Consultivo Sem Compromisso
            </p>
          </div>
        )}

        {/* Card Simulator Container */}
        <div className={`bg-white ${isModalMode ? "rounded-2xl border-0 shadow-none" : "rounded-3xl border border-gray-100 shadow-xl"} overflow-hidden min-h-[500px]`}>
          
          <AnimatePresence mode="wait">
            {!finished ? (
              <div key="simulator-active">
                {/* Progress Bar & Steps indicators */}
                <div className="bg-gradient-to-r from-brand-primary via-[#0B4A37] to-brand-primary text-white px-6 py-4 md:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-900/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-accent/20 border border-brand-accent/30 text-brand-accent font-bold px-3 py-1 rounded-full text-xs tracking-wider uppercase">
                      Etapa {step} de 5
                    </div>
                    <span className="font-display font-semibold text-sm md:text-base tracking-tight text-white/95">
                      {headerInfo.title}
                    </span>
                  </div>
                  
                  {/* Visual tracking pills */}
                  <div className="flex gap-2 w-full sm:w-auto items-center">
                    <div className="flex gap-1.5 bg-white/10 p-1 rounded-full border border-white/5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div
                          key={s}
                          className={`w-6 h-2 rounded-full transition-all duration-500 ${
                            s === step 
                              ? "bg-brand-accent w-10 shadow-[0_0_8px_#00A86B]" 
                              : s < step 
                                ? "bg-brand-accent/60" 
                                : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form fields with Animation */}
                <div className="p-6 md:p-10 text-left">
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* Duplicate Lead Detection Alert */}
                      {existingLeadTrack && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-3 shadow-xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                              <AlertCircle className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-900">
                                Simulação Ativa Encontrada no Banco de Dados
                              </h4>
                              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                                Já identificamos que existe uma solicitação cadastrada para o CNPJ (<strong>{formData.cnpj}</strong>). Você pode acessar o link completo de acompanhamento em tempo real abaixo:
                              </p>
                            </div>
                          </div>

                          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 space-y-2">
                            <div className="flex justify-between items-center text-[11px] font-mono text-amber-900">
                              <span className="font-bold">ID da Solicitação: {existingLeadTrack.id}</span>
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-sans text-[10px] uppercase font-extrabold">
                                {existingLeadTrack.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Link de Acompanhamento Directo:
                            </p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={`https://prosfec.com.br/?leadTrack=${existingLeadTrack.id}`}
                                className="bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs px-3 py-2 rounded-lg flex-1 select-all outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`https://prosfec.com.br/?leadTrack=${existingLeadTrack.id}`);
                                  setCopiedLeadLink(true);
                                  setTimeout(() => setCopiedLeadLink(false), 3000);
                                }}
                                className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                              >
                                {copiedLeadLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedLeadLink ? "Copiado!" : "Copiar Link"}</span>
                              </button>
                            </div>
                            <div className="pt-1">
                              <a
                                href={`https://prosfec.com.br/?leadTrack=${existingLeadTrack.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-800 hover:text-amber-950 underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Clique aqui para abrir o acompanhamento em tempo real</span>
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="flex items-center gap-3 text-brand-primary border-b border-slate-100 pb-3">
                        <Building className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-semibold text-base">Identificação da Empresa</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            CNPJ da Empresa *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={formData.cnpj}
                              onChange={handleCNPJChange}
                              maxLength={18}
                              placeholder="00.000.000/0000-00"
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none hover:border-slate-300"
                            />
                            {isConsultingCnpj && (
                              <div className="absolute right-3.5 top-3.5 flex items-center">
                                <Loader2 className="w-5 h-5 text-brand-accent animate-spin" />
                              </div>
                            )}
                          </div>
                          {cnpjInfoMessage && (
                            <p className="text-[11px] font-bold mt-1.5 leading-tight text-emerald-800">
                              {cnpjInfoMessage}
                            </p>
                          )}
                          {errors.cnpj && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.cnpj}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Razão Social ou Nome Fantasia *
                          </label>
                          <input
                            type="text"
                            value={formData.razaoSocial}
                            onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                            placeholder="Minha Empresa Ltda"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none hover:border-slate-300"
                          />
                          {errors.razaoSocial && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.razaoSocial}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Porte da Empresa
                          </label>
                          <select
                            value={formData.porte}
                            onChange={(e: any) => setFormData({ ...formData, porte: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                          >
                            <option value="MEI">MEI (Microempreendedor Individual)</option>
                            <option value="ME">ME (Microempresa)</option>
                            <option value="EPP">EPP (Empresa de Pequeno Porte)</option>
                            <option value="EMP">EMP (Empresa de Médio Porte)</option>
                            <option value="EGP">EGP (Empresa de Grande Porte)</option>
                          </select>
                        </div>

                        {!formData.menosDe12Meses ? (
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                              Faturamento Bruto Anual (BRL) *
                            </label>
                            <input
                              type="text"
                              value={tempFaturamento}
                              onChange={handleFaturamentoChange}
                              placeholder="R$ 0,00"
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-extrabold transition-all duration-200 outline-none text-emerald-800 hover:border-slate-300"
                            />
                            {errors.faturamentoAnual && (
                              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.faturamentoAnual}
                              </p>
                            )}
                            <span className="text-[10px] text-gray-400 mt-1.5 block">
                              * Use o declarado no Simples / Sped Fiscal de 2025.
                            </span>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Capital Social Declarado (BRL) *
                              </label>
                              <input
                                type="text"
                                value={tempCapitalSocial}
                                onChange={handleCapitalSocialChange}
                                placeholder="R$ 0,00"
                                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-extrabold transition-all duration-200 outline-none text-emerald-800 hover:border-slate-300"
                              />
                              {errors.capitalSocial && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  {errors.capitalSocial}
                                </p>
                              )}
                              <span className="text-[10px] text-gray-400 mt-1.5 block">
                                * Conforme última alteração contratual / contrato de constituição.
                              </span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Média de Faturamento Mensal (BRL) *
                              </label>
                              <input
                                type="text"
                                value={tempMediaReceitaMensal}
                                onChange={handleMediaReceitaMensalChange}
                                placeholder="R$ 0,00"
                                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-extrabold transition-all duration-200 outline-none text-emerald-800 hover:border-slate-300"
                              />
                              {errors.mediaReceitaMensal && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  {errors.mediaReceitaMensal}
                                </p>
                              )}
                              <span className="text-[10px] text-gray-400 mt-1.5 block">
                                * Média do faturamento bruto dos meses em funcionamento.
                              </span>
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Data de Abertura
                          </label>
                          <input
                            type="date"
                            value={formData.dataAbertura}
                            onChange={(e) => setFormData({ ...formData, dataAbertura: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            UF / Estado
                          </label>
                          <select
                            value={formData.uf}
                            onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                          >
                            {brazilianUFs.map((uf) => (
                              <option key={uf.value} value={uf.value}>{uf.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Dynamic Warning Badges */}
                      {(() => {
                        const effectiveAnnualRevenue = formData.menosDe12Meses 
                          ? (formData.mediaReceitaMensal || 0) * 12 
                          : formData.faturamentoAnual;

                        if (formData.porte === "MEI" && effectiveAnnualRevenue > 81000) {
                          return (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs flex gap-3 items-start">
                              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                              <div>
                                <span className="font-bold block text-sm mb-0.5">Aviso de Limite Excedido (MEI)</span>
                                Seu faturamento projetado de <strong className="text-amber-950 font-extrabold">{formatCurrencyBRL(effectiveAnnualRevenue)}</strong> excede o limite legal anual do MEI (R$ 81.000,00). Para viabilizar a contratação do Pronampe, nossa consultoria ajuda você na migração tributária rápida para ME (Microempresa).
                              </div>
                            </div>
                          );
                        }

                        if (formData.porte === "ME" && effectiveAnnualRevenue > 360000) {
                          return (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs flex gap-3 items-start">
                              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                              <div>
                                <span className="font-bold block text-sm mb-0.5">Classificação do Porte (ME)</span>
                                Seu faturamento de <strong className="text-amber-950 font-extrabold">{formatCurrencyBRL(effectiveAnnualRevenue)}</strong> ultrapassa o teto de Microempresa (R$ 360.000,00). Sua empresa passará a operar na faixa de EPP (Empresa de Pequeno Porte) nos bancos parceiros. Realizamos esse upgrade cadastral para você.
                              </div>
                            </div>
                          );
                        }

                        if (formData.porte === "EPP" && effectiveAnnualRevenue > 4800000) {
                          return (
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs flex gap-3 items-start">
                              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                              <div>
                                <span className="font-bold block text-sm mb-0.5">Teto Máximo do Pronampe Ultrapassado</span>
                                O Pronampe é destinado a empresas com faturamento anual de até R$ 4,8 milhões. Para empresas de Médio Porte, possuímos convênios para outras linhas de crédito PJ específicas com garantias de repasse.
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })()}

                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3.5 bg-green-50 p-4 rounded-2xl border border-green-100">
                          <input
                            type="checkbox"
                            id="menosDe12Meses"
                            checked={formData.menosDe12Meses}
                            onChange={(e) => setFormData({ ...formData, menosDe12Meses: e.target.checked })}
                            className="w-5 h-5 accent-brand-accent rounded cursor-pointer shrink-0"
                          />
                          <label htmlFor="menosDe12Meses" className="text-xs text-gray-700 cursor-pointer font-medium leading-normal">
                            Minha empresa possui <strong>menos de 12 meses de funcionamento efetivo</strong> (regras de teto proporcional).
                          </label>
                        </div>

                        <div className="flex items-center gap-3.5 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                          <input
                            type="checkbox"
                            id="seloEmpregaMulher"
                            checked={formData.seloEmpregaMulher || false}
                            onChange={(e) => setFormData({ ...formData, seloEmpregaMulher: e.target.checked })}
                            className="w-5 h-5 accent-brand-accent rounded cursor-pointer shrink-0"
                          />
                          <label htmlFor="seloEmpregaMulher" className="text-xs text-gray-700 cursor-pointer font-medium leading-normal">
                            <strong>Selo Emprega + Mulher:</strong> Minha empresa possui mulheres como sócias majoritárias ou administradoras (direito assegurado ao teto de até 60% do faturamento em todas as faixas).
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 text-brand-primary border-b border-slate-100 pb-3">
                        <User className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-semibold text-base">Contato de Retorno</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Seu Nome Completo *
                          </label>
                          <input
                            type="text"
                            value={formData.nomeCompleto}
                            onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                            placeholder="Ex: João da Silva"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none hover:border-slate-300"
                          />
                          {errors.nomeCompleto && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.nomeCompleto}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            E-mail Corporativo *
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="nome@empresa.com.br"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none hover:border-slate-300"
                          />
                          {errors.email && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.email}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            WhatsApp com DDD *
                          </label>
                          <input
                            type="text"
                            value={formData.whatsapp}
                            onChange={handlePhoneChange}
                            placeholder="(00) 00000-0000"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none hover:border-slate-300"
                          />
                          {errors.whatsapp && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.whatsapp}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Seu cargo na empresa
                          </label>
                          <select
                            value={formData.cargo}
                            onChange={(e: any) => setFormData({ ...formData, cargo: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                          >
                            <option value="Sócio">Sócio Proprietário</option>
                            <option value="Diretor">Diretor Financeiro / CFO</option>
                            <option value="Contador">Contador</option>
                            <option value="Gerente">Gerente Financeiro</option>
                            <option value="Outros">Outros cargos</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 text-brand-primary border-b border-slate-100 pb-3">
                        <Shield className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-semibold text-base">Regularidade e Fiscal</h3>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                            Qual a Situação Cadastral atual do CNPJ?
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {["Ativa", "Inativa", "Pendente"].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setFormData({ ...formData, situacaoCadastral: status as any })}
                                className={`py-3.5 px-4 rounded-2xl text-sm font-bold border text-center transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                  formData.situacaoCadastral === status
                                    ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                }`}
                              >
                                {formData.situacaoCadastral === status && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                            Sua empresa transmitiu as declarações fiscais do último ano?
                          </label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiDeclaracaoFaturamento: true })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                formData.possuiDeclaracaoFaturamento
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {formData.possuiDeclaracaoFaturamento && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                              Sim, tudo em dia
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiDeclaracaoFaturamento: false })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                !formData.possuiDeclaracaoFaturamento
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {!formData.possuiDeclaracaoFaturamento && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                              Não / Tenho dúvidas
                            </button>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-2 block">
                            * Obrigatório para comprovação de faturamento oficial no e-CAC.
                          </span>
                        </div>

                        <div className="bg-brand-primary/5 p-5 rounded-2xl border border-brand-primary/10 space-y-3.5">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="autorizaCompartilhamentoEcac"
                              checked={formData.autorizaCompartilhamentoEcac}
                              onChange={(e) => setFormData({ ...formData, autorizaCompartilhamentoEcac: e.target.checked })}
                              className="w-5 h-5 accent-brand-accent rounded mt-0.5 cursor-pointer"
                            />
                            <div className="text-left">
                              <label htmlFor="autorizaCompartilhamentoEcac" className="text-xs text-gray-700 cursor-pointer font-bold block">
                                Autorização e-CAC (Receita Federal)
                              </label>
                              <p className="text-[11px] text-gray-500 leading-normal mt-1">
                                Eu concordo em autorizar o compartilhamento do faturamento oficial via login gov.br (e-CAC) com os agentes financeiros parceiros para obter estimativas fidedignas de crédito.
                              </p>
                            </div>
                          </div>
                          {errors.autorizaCompartilhamentoEcac && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.autorizaCompartilhamentoEcac}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 text-brand-primary border-b border-slate-100 pb-3">
                        <DollarSign className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-semibold text-base">Perfil Financeiro</h3>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                            Sua empresa possui alguma restrição ativa no Serasa, SPC ou Cadin?
                          </label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiRestricaoSerasa: true })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                formData.possuiRestricaoSerasa
                                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {formData.possuiRestricaoSerasa && <AlertCircle className="w-4 h-4 text-white shrink-0" />}
                              Sim, possui restrição
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiRestricaoSerasa: false })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                !formData.possuiRestricaoSerasa
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {!formData.possuiRestricaoSerasa && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                              Não/CNPJ limpo
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                            Existem dívidas tributárias inscritas em Dívida Ativa da União?
                          </label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiDividasTributarias: true })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                formData.possuiDividasTributarias
                                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {formData.possuiDividasTributarias && <AlertCircle className="w-4 h-4 text-white shrink-0" />}
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiDividasTributarias: false })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                !formData.possuiDividasTributarias
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {!formData.possuiDividasTributarias && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                              Não possuo dívidas fiscais
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                            Possui alguma linha de crédito governamental Ativa?
                          </label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiLinhaCreditoGovernamentalAtiva: true })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                formData.possuiLinhaCreditoGovernamentalAtiva
                                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {formData.possuiLinhaCreditoGovernamentalAtiva && <AlertCircle className="w-4 h-4 text-white shrink-0" />}
                              Sim, possui
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiLinhaCreditoGovernamentalAtiva: false, linhaCreditoGovernamentalQual: "" })}
                              className={`flex-1 py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                !formData.possuiLinhaCreditoGovernamentalAtiva
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {!formData.possuiLinhaCreditoGovernamentalAtiva && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                              Não possui
                            </button>
                          </div>
                        </div>

                        {formData.possuiLinhaCreditoGovernamentalAtiva && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1.5"
                          >
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                              Qual linha de crédito governamental está ativa? *
                            </label>
                            <select
                              value={formData.linhaCreditoGovernamentalQual || ""}
                              onChange={(e) => setFormData({ ...formData, linhaCreditoGovernamentalQual: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                            >
                              <option value="">Selecione a linha ativa...</option>
                              <option value="PRONAMPE">PRONAMPE (Programa Nacional de Apoio às Microempresas)</option>
                              <option value="FAMPE">FAMPE / SEBRAE (Fundo de Aval às Micro e Pequenas Empresas)</option>
                              <option value="FGI_PEAC">FGI PEAC (Programa Emergencial de Acesso a Crédito)</option>
                              <option value="PROGER">PROGER (Programa de Geração de Emprego e Renda)</option>
                              <option value="FUNGETUR">FUNGETUR / FSP (Fundo Geral do Turismo)</option>
                              <option value="FNE_FNO_FCO">FNE / FNO / FCO (Fundos Constitucionais Regionais)</option>
                              <option value="OUTRA">Outra linha de crédito governamental</option>
                            </select>
                          </motion.div>
                        )}

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                            Possui patrimônio ou ativos vinculados ao CPF dos sócios ou CNPJ? <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional - fortalece o perfil)</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiPatrimonioVinculado: "sim" })}
                              className={`py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                formData.possuiPatrimonioVinculado === "sim"
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {formData.possuiPatrimonioVinculado === "sim" && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                              Sim, possui
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiPatrimonioVinculado: "nao" })}
                              className={`py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                formData.possuiPatrimonioVinculado === "nao"
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {formData.possuiPatrimonioVinculado === "nao" && <CheckCircle className="w-4 h-4 text-brand-accent shrink-0" />}
                              Apenas fluxo operacional
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, possuiPatrimonioVinculado: "nao_informado" })}
                              className={`py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-98 hover:shadow-xs ${
                                formData.possuiPatrimonioVinculado === "nao_informado" || !formData.possuiPatrimonioVinculado
                                  ? "bg-slate-100 text-slate-700 border-slate-300"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              Prefiro não informar agora
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Qual o seu principal banco de relacionamento corporativo? *
                          </label>
                          <select
                            value={formData.bancoPrincipal}
                            onChange={(e) => setFormData({ ...formData, bancoPrincipal: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                          >
                            <option value="">Selecione uma instituição principal...</option>
                            <option value="Itaú">Itaú Unibanco</option>
                            <option value="Bradesco">Banco Bradesco</option>
                            <option value="Banco do Brasil">Banco do Brasil</option>
                            <option value="Caixa">Caixa Econômica Federal</option>
                            <option value="Santander">Santander Brasil</option>
                            <option value="Sicoob">Sicoob / Cooperativo</option>
                            <option value="Sicredi">Sicredi / Cooperativo</option>
                            <option value="Outro">Outro banco digital/regional</option>
                          </select>
                          {errors.bancoPrincipal && (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.bancoPrincipal}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 5 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 text-brand-primary border-b border-slate-100 pb-3">
                        <TrendingUp className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-semibold text-base">Alocação e Planejamento</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Principal objetivo para o recurso financeiro:
                          </label>
                          <select
                            value={formData.objetivoRecurso}
                            onChange={(e: any) => setFormData({ ...formData, objetivoRecurso: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                          >
                            <option value="capital_giro">Giro / Caixa Geral da Empresa</option>
                            <option value="investimento">Investir em Equipamentos / Reformas</option>
                            <option value="reorganizar_dividas">Reorganizar Dívidas Existentes</option>
                            <option value="outros">Outros Fins Corporativos</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Qual a sua urgência para liberação do caixa?
                          </label>
                          <select
                            value={formData.tempoParaCaptacao}
                            onChange={(e: any) => setFormData({ ...formData, tempoParaCaptacao: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent text-slate-800 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 outline-none cursor-pointer hover:border-slate-300"
                          >
                            <option value="urgente">Urgente (Nas próximas 2 semanas)</option>
                            <option value="medio_prazo">Médio Prazo (Até 45 dias)</option>
                            <option value="planejamento">Apenas planejamento estratégico</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h4 className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                          <Check className="w-4 h-4 stroke-[3]" />
                          Tudo pronto para processar simulação
                        </h4>
                        <p className="text-xs text-gray-600 leading-normal">
                          Ao clicar em calcular, faremos o cruzamento do seu enquadramento e alertaremos quais irregularidades podem atrasar seu processo nos bancos parceiros.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Buttons controls */}
                  <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-8 gap-4">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold h-12 px-6 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-98"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Anterior
                      </button>
                    ) : (
                      <div />
                    )}

                    {step < 5 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-bold h-12 px-7 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2 ml-auto cursor-pointer shadow-md hover:shadow-lg active:scale-98"
                      >
                        Próxima etapa
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={calculateResult}
                        disabled={calculating}
                        className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold h-12 px-8 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2 ml-auto cursor-pointer shadow-md hover:shadow-lg active:scale-98"
                      >
                        {calculating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analisando elegibilidade...
                          </>
                        ) : (
                          <>
                            Efetuar Simulação
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Simulation finished, show exact customized results card */
              <motion.div
                key="simulator-result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 md:p-10 text-left animate-in fade-in zoom-in-95 duration-500"
              >
                {/* Result Hero Badge */}
                <div className="bg-brand-primary text-white p-6 rounded-2xl relative overflow-hidden mb-6 shadow-inner">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                    <TrendingUp className="w-48 h-48 -rotate-12" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-300 block mb-1">
                        Limite Estimado Potencial do seu CNPJ
                      </span>
                      <p className="text-3xl md:text-4xl font-display font-extrabold">
                        {formatCurrencyBRL(simulationResult?.limiteEstimado || 0)}
                      </p>
                    </div>

                    {typeof simulationResult?.scoreElegibilidade === "number" && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 shrink-0">
                        <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-slate-900/60 border border-emerald-400/40">
                          <span className="text-lg font-black text-emerald-300 font-mono">
                            {simulationResult.scoreElegibilidade}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-extrabold text-emerald-300 tracking-wider block">
                            Score PROSFEC
                          </span>
                          <span className="text-xs font-bold text-white">
                            {simulationResult.scoreElegibilidade >= 80 
                              ? "Excelente Enquadramento" 
                              : simulationResult.scoreElegibilidade >= 60 
                                ? "Enquadramento Moderado" 
                                : "Necessita de Adequações"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-3">
                    {formData.menosDe12Meses 
                      ? `*Cálculo conforme regras da linha recomendada: limite proporcional ponderado de acordo com o capital social e média de receitas mensais.`
                      : formData.seloEmpregaMulher 
                        ? `*Cálculo conforme regras com Selo Emprega + Mulher: até 60% do faturamento anual, com direito a teto preferencial assegurado.`
                        : `*Cálculo otimizado pela PROSFEC IA: limite de crédito baseado no histórico de faturamento bruto anual e capacidade de enquadramento federal.`
                    }
                  </p>
                </div>

                {/* Dynamic Credit Line Recommendation Banner */}
                <div className="bg-gradient-to-r from-[#032e22] via-[#084534] to-[#043326] text-white p-6 rounded-3xl relative overflow-hidden mb-8 border border-emerald-800/60 shadow-xl">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                    <Sparkles className="w-48 h-48 -rotate-12 text-brand-accent" />
                  </div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] bg-brand-accent/20 border border-brand-accent/30 text-brand-accent font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Recomendação PROSFEC IA
                        </span>
                        {simulationResult?.bancoDetalhes && (
                          <span className="text-[10px] bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Building className="w-3 h-3 text-brand-accent" />
                            {simulationResult.bancoDetalhes.bancoNormalizado}
                          </span>
                        )}
                        {simulationResult?.fonte?.includes("Gemini") && (
                          <span className="text-[10px] bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            Análise IA
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-black text-xl md:text-2xl text-white tracking-tight">
                        {simulationResult?.creditLineName || "PRONAMPE 2026"}
                      </h3>
                      <p className="text-xs text-emerald-100/90 font-medium leading-relaxed mt-2 max-w-xl">
                        {simulationResult?.justificativa || "Sua empresa foi qualificada no enquadramento automático federal do Pronampe devido ao faturamento e porte compatível."}
                      </p>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-left shrink-0 w-full md:w-auto min-w-[200px] hover:bg-white/10 transition-colors duration-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block mb-0.5">Parcela Mensal Estimada</span>
                      <strong className="text-2xl font-black text-brand-accent block">
                        {formatCurrencyBRL(simulationResult?.parcela || (simulationResult?.limiteEstimado ? (simulationResult.limiteEstimado * 0.026) : 0))}
                      </strong>
                      <span className="text-[9px] text-emerald-100/70 leading-tight block mt-1">
                        Taxa de {simulationResult?.rate || 16.5}% a.a. em {simulationResult?.prazo || 48} meses.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Advanced Dynamic Credit Parameters Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 simulator-results-container">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-left min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Teto do Crédito</span>
                    <strong className="text-sm md:text-base text-emerald-800 font-extrabold block">
                      {formatCurrencyBRL(simulationResult?.limiteEstimado || 500000)}
                    </strong>
                    <span className="text-[9px] text-gray-500 leading-tight block mt-0.5">Limite máximo para o CNPJ.</span>
                  </div>
                  
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-left min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Prazo de Pagamento</span>
                    <strong className="text-sm md:text-base text-emerald-800 font-extrabold block">
                      Até {simulationResult?.prazo || 72} Meses
                    </strong>
                    <span className="text-[9px] text-emerald-700 font-semibold leading-tight block mt-0.5">Teto máximo estendido.</span>
                  </div>
                  
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-left min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Carência de Capital</span>
                    <strong className="text-sm md:text-base text-emerald-800 font-extrabold block">
                      Até {simulationResult?.carencia || 12} Meses
                    </strong>
                    <span className="text-[9px] text-emerald-700 font-semibold leading-tight block mt-0.5">Carência máxima garantida.</span>
                  </div>
                  
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-left min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Taxa de Juros</span>
                    <strong className="text-sm md:text-base text-emerald-800 font-extrabold block font-mono">
                      {simulationResult?.rate ? `${simulationResult.rate}% a.a.` : "Selic + até 6% a.a."}
                    </strong>
                    <span className="text-[9px] text-gray-500 leading-tight block mt-0.5">Taxas subsidiadas de fomento.</span>
                  </div>
                </div>

                {/* Partner Bank Specific Rules Card */}
                {simulationResult?.bancoDetalhes && (
                  <div className="mb-8 bg-emerald-950/40 border border-emerald-800/50 p-5 rounded-2xl text-left shadow-inner">
                    <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-emerald-800/40">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-brand-accent" />
                        <h4 className="font-display font-extrabold text-sm text-emerald-300">
                          Condições Específicas do Agente Financeiro: {simulationResult.bancoDetalhes.bancoNormalizado}
                        </h4>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {simulationResult.bancoDetalhes.categoria === "estatal" ? "Banco Público Estatal" :
                         simulationResult.bancoDetalhes.categoria === "cooperativa" ? "Cooperativa de Crédito" : "Banco Privado"}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/90 leading-relaxed font-medium mb-3">
                      {simulationResult.bancoDetalhes.destaqueEsteira}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-brand-accent" />
                        Esteira: {simulationResult.bancoDetalhes.modalidadeAprovacao}
                      </span>
                      <span className="bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-accent" />
                        Carência Padrão: {simulationResult.bancoDetalhes.carenciaPadrao} meses (Máx: {simulationResult.bancoDetalhes.carenciaMaxima}m)
                      </span>
                      <span className="bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-accent" />
                        Taxa Estimada no Banco: {simulationResult.bancoDetalhes.taxaAnualEstimada}% a.a.
                      </span>
                    </div>
                  </div>
                )}

                {/* Recomendação 1: Badge de Excedente de Capacidade de Crédito */}
                {((simulationResult?.excedenteCapacidade && simulationResult.excedenteCapacidade > 0) ||
                  ((simulationResult?.capacidadeTotal || 0) > (simulationResult?.limiteEstimado || 0))) && (
                  <div className="mb-8 bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/40 p-6 rounded-2xl text-left shadow-lg relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-amber-400">
                      <Zap className="w-40 h-40" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-500/20">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-display font-extrabold text-base text-amber-200">
                            Excedente de Capacidade de Crédito Identificado
                          </h4>
                          <span className="text-[11px] text-amber-300/80 font-medium block">
                            Capacidade fiscal superior ao teto individual do PRONAMPE
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                        ESTRUTURAÇÃO MULTI-LINHA
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Capacidade Bruta (e-CAC)</span>
                        <strong className="text-base font-extrabold text-white block">
                          {formatCurrencyBRL(simulationResult?.capacidadeTotal || 0)}
                        </strong>
                        <span className="text-[9px] text-slate-400 block mt-0.5">30% do faturamento anual declarado.</span>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Teto Alocado PRONAMPE</span>
                        <strong className="text-base font-extrabold text-emerald-400 block">
                          {formatCurrencyBRL(simulationResult?.limiteEstimado || 0)}
                        </strong>
                        <span className="text-[9px] text-emerald-300/80 block mt-0.5">Limite máximo no programa federal.</span>
                      </div>

                      <div className="bg-amber-950/60 border border-amber-500/30 p-3.5 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-amber-300 block mb-0.5">Saldo Excedente Disponível</span>
                        <strong className="text-base font-extrabold text-amber-200 block">
                          {formatCurrencyBRL(simulationResult?.excedenteCapacidade || Math.max(0, (simulationResult?.capacidadeTotal || 0) - (simulationResult?.limiteEstimado || 0)))}
                        </strong>
                        <span className="text-[9px] text-amber-300/80 block mt-0.5">Capacidade para linhas complementares.</span>
                      </div>
                    </div>

                    <p className="text-xs text-amber-100/90 leading-relaxed font-medium bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl">
                      💡 <strong>Recomendação de Alta Conversão Prosfec:</strong> Como o seu faturamento permite alocar até <strong>{formatCurrencyBRL(simulationResult?.capacidadeTotal || 0)}</strong>, nossa assessoria pode estruturar a captação do excedente de <strong>{formatCurrencyBRL(simulationResult?.excedenteCapacidade || 0)}</strong> combinando o PRONAMPE com garantias via <strong>FGI PEAC</strong> ou <strong>Linhas Corporativas de Giro com Fundo Garantidor</strong>.
                    </p>
                  </div>
                )}

                {/* Recomendação 2: Indicador de Economia Estimada (CET vs Mercado Tradicional) */}
                {((simulationResult?.economiaTotal && simulationResult.economiaTotal > 0) ||
                  ((simulationResult?.economiaMensal && simulationResult.economiaMensal > 0))) && (
                  <div className="mb-8 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/30 p-6 rounded-2xl text-left shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none text-brand-accent">
                      <PiggyBank className="w-48 h-48 -rotate-12" />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-emerald-500/20 relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                          <PiggyBank className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-display font-extrabold text-base text-emerald-300">
                            Indicador de Economia Estimada (CET vs. Mercado Tradicional)
                          </h4>
                          <span className="text-[11px] text-emerald-200/80 font-medium block">
                            Comparativo entre a taxa subsidiada de fomento e taxas de mercado sem subsídio
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                        ECONOMIA DIRETA NO CAIXA
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 relative z-10">
                      {/* Left: Total Savings Highlight */}
                      <div className="bg-emerald-900/40 border border-emerald-700/50 p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] uppercase font-bold text-emerald-300 tracking-wider block mb-1">
                            Economia Total Acumulada em Juros
                          </span>
                          <strong className="text-3xl md:text-4xl font-display font-black text-brand-accent block my-1">
                            {formatCurrencyBRL(simulationResult?.economiaTotal || 0)}
                          </strong>
                          <span className="text-xs text-emerald-100/90 font-medium block">
                            Economia estimada ao longo de {simulationResult?.prazo || 48} meses de contrato.
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-emerald-700/40 flex items-center justify-between">
                          <span className="text-xs text-emerald-200/80 font-medium">Redução na Parcela Mensal:</span>
                          <span className="text-sm font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-400/30">
                            - {formatCurrencyBRL(simulationResult?.economiaMensal || 0)} / mês
                          </span>
                        </div>
                      </div>

                      {/* Right: CET Benchmark Comparison */}
                      <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl space-y-3.5">
                        <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block border-b border-slate-800 pb-2">
                          Comparativo de Custo Efetivo Total (CET)
                        </span>

                        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
                          <div>
                            <span className="font-bold text-emerald-300 block">Linha Recomendada (Subsídio Federal)</span>
                            <span className="text-[10px] text-slate-400">Taxa de {simulationResult?.rate || 16.5}% a.a. (~1,28% a.m.)</span>
                          </div>
                          <strong className="text-sm font-extrabold text-emerald-400 font-mono">
                            {formatCurrencyBRL(simulationResult?.parcela || 0)} /mês
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-400 block">Mercado Tradicional Sem Fomento</span>
                            <span className="text-[10px] text-slate-500">Taxa média de {simulationResult?.taxaMercadoAnual || 38.0}% a.a. (~2,65% a.m.)</span>
                          </div>
                          <strong className="text-sm font-extrabold text-rose-400 font-mono line-through opacity-80">
                            {formatCurrencyBRL(simulationResult?.parcelaMercado || ((simulationResult?.parcela || 0) + (simulationResult?.economiaMensal || 0)))} /mês
                          </strong>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-emerald-100/90 leading-relaxed font-medium bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl relative z-10">
                      🎯 <strong>Vantagem Competitiva:</strong> Ao contratar essa operação por meio da assessoria qualificada Prosfec, sua empresa garante o enquadramento na taxa subsidiada pelo Fundo Garantidor (FGO), preservando <strong>{formatCurrencyBRL(simulationResult?.economiaTotal || 0)}</strong> de capital de giro no seu fluxo de caixa para reinvestir na sua operação.
                    </p>
                  </div>
                )}

                {/* Consultor de Crédito Governamental Parecer Técnico & Documentos */}
                {(simulationResult?.justificativaTecnica || (simulationResult?.documentosNecessarios && simulationResult.documentosNecessarios.length > 0)) && (
                  <div className="mb-8 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-5 shadow-lg">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Bot className="w-5 h-5 text-emerald-400" />
                      <h4 className="font-display font-extrabold text-sm text-emerald-400 uppercase tracking-wider">
                        Parecer do Consultor de Crédito Governamental
                      </h4>
                    </div>

                    {simulationResult?.justificativaTecnica && (
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        {simulationResult.justificativaTecnica}
                      </p>
                    )}

                    {simulationResult?.documentosNecessarios && simulationResult.documentosNecessarios.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Documentação Exigida para Enquadramento do Perfil:
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {simulationResult.documentosNecessarios.map((doc, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 text-xs text-slate-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="font-medium text-[11px] leading-tight">{doc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Integrity Checklist - 7 cols */}
                  <div className="md:col-span-7 space-y-5">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                      <Shield className="w-5 h-5 text-brand-primary" />
                      <h4 className="font-bold text-sm text-brand-primary uppercase">
                        Diagnóstico Geral de Viabilidade
                      </h4>
                    </div>

                    <div className="flex items-center gap-3.5 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <span className="text-xs font-bold text-gray-500 uppercase block shrink-0">
                        Nível de Disponibilidade Médio:
                      </span>
                      {simulationResult?.nivelPreparacao === "alto" ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-extrabold px-3 py-1 rounded-full">
                          ALTA APROVAÇÃO
                        </span>
                      ) : simulationResult?.nivelPreparacao === "medio" ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-extrabold px-3 py-1 rounded-full">
                          ATENÇÃO RECOMENDADA
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 text-[10px] uppercase font-extrabold px-3 py-1 rounded-full">
                          BLOQUEIO PROVÁVEL
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                        Apontamentos Críticos Verificados:
                      </span>
                      {simulationResult?.principaisAlertas.map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-rose-50/60 rounded-xl border border-rose-100/60">
                          {simulationResult?.nivelPreparacao === "alto" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <p className="text-xs font-medium text-gray-700 leading-normal">{alert}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PROSFEC consulting recommendations - 5 cols */}
                  <div className="md:col-span-5 bg-brand-bg-light/60 p-5 rounded-2xl border border-gray-200/50 space-y-4">
                    <h5 className="font-display font-bold text-sm text-brand-primary flex items-center gap-1.5">
                      <Check className="text-brand-accent w-4 h-4 stroke-[3]" />
                      Próximos Passos Recomendados
                    </h5>
                    
                    <ul className="space-y-3">
                      {simulationResult?.recomendações.map((rec, rIdx) => (
                        <li key={rIdx} className="flex gap-2 text-xs text-gray-600 leading-relaxed text-left">
                          <span className="text-brand-primary font-bold shrink-0">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2">
                      <span className="text-[10px] text-gray-400 leading-tight block">
                        Seu dossiê está pronto para análise humana. Nossos assessores possuem contato direto com os gerentes de contas dos principais bancos do Pronampe.
                      </span>
                    </div>
                  </div>

                </div>

                {/* Partner Registration Form (Etapa 2 - Coleta de dados dos sócios) */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <div className="bg-slate-50 rounded-2xl border border-gray-100 p-5 md:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                      <div>
                        <span className="text-[10px] bg-brand-primary text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                          Etapa 2 de 8 · Em Andamento
                        </span>
                        <h4 className="font-display font-extrabold text-lg text-brand-primary mt-2 flex items-center gap-2">
                          📋 Ficha de Cadastro dos Sócios
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Complete a qualificação dos sócios para habilitar a consulta diagnóstica de compliance (Etapa 3).
                        </p>
                      </div>
                      
                      {sociosSubmitted && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                          <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                          Ficha Enviada!
                        </span>
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      {!sociosSubmitted ? (
                        <form onSubmit={handleSociosSubmit} className="space-y-6">
                          {sociosError && (
                            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                              <span>{sociosError}</span>
                            </div>
                          )}

                          {/* Sócio 1 Section */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 font-mono">
                              👤 Sócio 1 (Sócio Principal)
                            </h5>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-1">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                  Nome Completo *
                                </label>
                                <input
                                  type="text"
                                  value={socio1.nome}
                                  onChange={(e) => setSocio1({ ...socio1, nome: e.target.value })}
                                  placeholder="Nome completo do sócio..."
                                  className="w-full bg-white border border-gray-200 focus:border-brand-accent text-gray-800 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                  CPF do Sócio *
                                </label>
                                <input
                                  type="text"
                                  value={socio1.cpf}
                                  onChange={(e) => setSocio1({ ...socio1, cpf: formatCPF(e.target.value) })}
                                  placeholder="000.000.000-00"
                                  maxLength={14}
                                  className="w-full bg-white border border-gray-200 focus:border-brand-accent text-gray-800 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                  Data de Nascimento *
                                </label>
                                <input
                                  type="date"
                                  value={socio1.dataNascimento}
                                  onChange={(e) => setSocio1({ ...socio1, dataNascimento: e.target.value })}
                                  className="w-full bg-white border border-gray-200 focus:border-brand-accent text-gray-800 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Sócio 2 Checkbox Toggle */}
                          <div className="pt-4 border-t border-gray-200 space-y-4">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                id="hasSocio2"
                                checked={hasSocio2}
                                onChange={(e) => setHasSocio2(e.target.checked)}
                                className="w-5 h-5 accent-brand-accent rounded cursor-pointer"
                              />
                              <label htmlFor="hasSocio2" className="text-xs font-bold text-gray-700 cursor-pointer">
                                Adicionar Sócio 2 (Se houver outro sócio na empresa)
                              </label>
                            </div>

                            {hasSocio2 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="space-y-4 border border-dashed border-gray-200 p-4 rounded-xl bg-white overflow-hidden"
                              >
                                <h6 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 font-mono">
                                  👤 Sócio 2 (Sócio Secundário)
                                </h6>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                      Nome Completo *
                                    </label>
                                    <input
                                      type="text"
                                      value={socio2.nome}
                                      onChange={(e) => setSocio2({ ...socio2, nome: e.target.value })}
                                      placeholder="Nome completo do sócio..."
                                      className="w-full bg-gray-50 border border-gray-200 focus:border-brand-accent text-gray-800 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                      CPF do Sócio 2 *
                                    </label>
                                    <input
                                      type="text"
                                      value={socio2.cpf}
                                      onChange={(e) => setSocio2({ ...socio2, cpf: formatCPF(e.target.value) })}
                                      placeholder="000.000.000-00"
                                      maxLength={14}
                                      className="w-full bg-gray-50 border border-gray-200 focus:border-brand-accent text-gray-800 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none font-mono"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                      Data de Nascimento *
                                    </label>
                                    <input
                                      type="date"
                                      value={socio2.dataNascimento}
                                      onChange={(e) => setSocio2({ ...socio2, dataNascimento: e.target.value })}
                                      className="w-full bg-gray-50 border border-gray-200 focus:border-brand-accent text-gray-800 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={submittingSocios}
                              className="w-full sm:w-auto bg-brand-primary hover:bg-zinc-800 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                            >
                              {submittingSocios ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  <span>Enviando ficha...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 text-brand-accent" />
                                  <span>Enviar Ficha Cadastral dos Sócios</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100 flex flex-col items-center text-center space-y-3"
                        >
                          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-full">
                            <CheckCircle2 className="w-8 h-8 text-emerald-700" />
                          </div>
                          <h5 className="font-display font-extrabold text-[#0A3D2E] text-base">
                            Ficha de Cadastro dos Sócios Enviada! 🎉
                          </h5>
                          <p className="text-xs text-gray-600 max-w-md leading-relaxed">
                            Parabéns! Os dados dos sócios foram integrados e a sua solicitação <strong>avançou para a Etapa 3 (Consulta diagnóstica no CPF e CNPJ)</strong>.
                          </p>
                          <p className="text-xs text-slate-500 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-100 font-mono">
                            Código de Rastreio: {createdLeadId}
                          </p>

                          {/* Direct Link Tracking Box */}
                          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs w-full max-w-md space-y-2 text-left my-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0A3D2E] block flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#00A86B]" />
                              Link Direto de Acompanhamento:
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={`https://prosfec.com.br/?leadTrack=${createdLeadId}`}
                                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] px-3 py-2 rounded-xl select-all outline-none font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`https://prosfec.com.br/?leadTrack=${createdLeadId}`);
                                  setCopiedLeadLink(true);
                                  setTimeout(() => setCopiedLeadLink(false), 3000);
                                }}
                                className="px-3.5 py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                              >
                                {copiedLeadLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedLeadLink ? "Copiado!" : "Copiar"}</span>
                              </button>
                            </div>
                            <a
                              href={`https://prosfec.com.br/?leadTrack=${createdLeadId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A3D2E] hover:text-[#00A86B] transition-colors pt-0.5"
                            >
                              <ExternalLink className="w-3 h-3 text-[#00A86B]" />
                              <span>Abrir página de acompanhamento em tempo real</span>
                            </a>
                          </div>
                          <p className="text-[11px] text-gray-400 max-w-xs leading-normal">
                            Nossa mesa de análise iniciou as consultas automáticas. O consultor {referredByPartnerNome || "PROSFEC"} responsável entrará em contato via WhatsApp para orientar sobre a Etapa 4 de Senha Gov.br.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Final Call to conversation (Brazillian Premium conversion focused) */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    onClick={resetAll}
                    className="text-xs font-bold text-gray-400 hover:text-brand-primary p-2 transition-all cursor-pointer"
                  >
                    ← Reiniciar Simulação
                  </button>

                  <button
                    onClick={handleWhatsAppRedirect}
                    className="w-full sm:w-auto bg-brand-accent hover:bg-brand-accent-hover text-brand-primary font-extrabold px-8 py-4 rounded-xl shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-sm"
                  >
                    <Phone className="w-4 h-4 shrink-0 fill-current" />
                    {referredByPartnerNome ? `Falar com ${referredByPartnerNome} no WhatsApp` : "Falar com Consultor no WhatsApp"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Card Informativo sobre Segurança de Dados e LGPD */}
        <div className="mt-6 p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100/60 flex flex-col sm:flex-row items-start gap-4 text-left">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-brand-primary">
              Segurança de Dados e Conformidade LGPD
            </h4>
            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
              Na <strong>PROSFEC</strong>, a proteção das suas informações é nossa prioridade máxima. Todos os dados da sua empresa (CNPJ, faturamento e contatos de sócios) são criptografados de ponta a ponta e processados em conformidade estrita com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Suas informações são utilizadas <strong>exclusivamente</strong> para calcular sua elegibilidade de crédito e nunca são repassadas a terceiros sem o seu consentimento explícito.
            </p>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {showExitIntent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" id="exit-intent-modal-overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowExitIntent(false);
                setExitIntentDismissed(true);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-w-md w-full p-6 text-center z-10"
              id="exit-intent-modal-content"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowExitIntent(false);
                  setExitIntentDismissed(true);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-50 cursor-pointer"
                title="Fechar"
                id="exit-intent-close-btn"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Badge Icon */}
              <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                <Clock className="w-7 h-7 text-emerald-600 animate-pulse" />
              </div>

              {/* Title */}
              <h3 className="font-display font-extrabold text-[#0A3D2E] text-xl leading-tight mb-2">
                Não perca seu lugar na fila de análise! ⏳
              </h3>

              {/* Description */}
              <p className="text-slate-600 text-xs leading-relaxed mb-6">
                Seu diagnóstico de elegibilidade para o <strong>Pronampe 2026</strong> está em andamento. Se você sair agora, seu progresso será perdido e você sairá da fila de atendimento prioritário.
              </p>

              {/* Step Progress Visual */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 text-left">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Progresso do Diagnóstico</span>
                  <span className="text-xs font-bold text-emerald-700">Etapa {step} de 5</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(step / 5) * 100}%` }}
                  />
                </div>
                {formData.cnpj && (
                  <div className="mt-3 pt-3 border-t border-slate-100/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span className="text-[11px] text-slate-500 font-medium truncate">
                      Dados salvos para o CNPJ: <strong className="font-semibold text-slate-700">{formData.cnpj}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Value Propositions list */}
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-start gap-2.5 text-[11px] text-slate-600 leading-snug">
                  <span className="text-emerald-600 bg-emerald-50 rounded-full shrink-0 w-4 h-4 flex items-center justify-center font-bold">✓</span>
                  <span>Garanta prioridade imediata na fila de análise oficial.</span>
                </li>
                <li className="flex items-start gap-2.5 text-[11px] text-slate-600 leading-snug">
                  <span className="text-emerald-600 bg-emerald-50 rounded-full shrink-0 w-4 h-4 flex items-center justify-center font-bold">✓</span>
                  <span>Salve as informações preenchidas até agora com segurança.</span>
                </li>
                <li className="flex items-start gap-2.5 text-[11px] text-slate-600 leading-snug">
                  <span className="text-emerald-600 bg-emerald-50 rounded-full shrink-0 w-4 h-4 flex items-center justify-center font-bold">✓</span>
                  <span>Suporte humanizado 1-a-1 gratuito com um de nossos especialistas.</span>
                </li>
              </ul>

              {/* Actions */}
              <div className="space-y-2.5">
                <button
                  onClick={handleExitIntentWhatsApp}
                  className="w-full bg-brand-accent hover:bg-brand-accent-hover text-brand-primary font-extrabold py-4 rounded-xl shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-sm"
                  id="exit-intent-submit-btn"
                >
                  <Phone className="w-4 h-4 shrink-0 fill-current" />
                  <span>Salvar meu Progresso via WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    setShowExitIntent(false);
                    setExitIntentDismissed(true);
                  }}
                  className="w-full text-xs font-bold text-slate-400 hover:text-brand-primary py-2 transition-colors cursor-pointer block"
                  id="exit-intent-cancel-btn"
                >
                  Continuar preenchendo no site (grátis)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
