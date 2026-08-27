// @ts-nocheck
import React, { useState, useEffect } from "react";
import { sanitizeAndSyncServicosList, getHublaLinkForService, isServiceWithoutUpfrontCost, isDemandAccountingService, DEFAULT_SERVICES_CATALOG as DEFAULT_STRUCTURING_SERVICES, getApplicableContracts } from "../utils/serviceUtils";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  HelpCircle, 
  Phone, 
  ShieldCheck, 
  ArrowLeft, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  ChevronDown, 
  Search,
  ExternalLink,
  Lock,
  Building2,
  Bookmark,
  Bell,
  LogOut,
  X,
  Brain,
  Sliders,
  Save,
  RefreshCw,
  Calculator,
  ShieldAlert,
  DollarSign,
  Key,
  Eye,
  EyeOff,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SignaturePad from "./SignaturePad";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, onSnapshot, limit } from "firebase/firestore";
import { salvarLeadPortal } from "@/lib/portal-save";
import { db, handleFirestoreError, OperationType } from "../firebase";
import type { SystemNotification } from "./PartnerPortal";
import { formatCurrencyBRL, formatCPF, formatCEP, formatPhone, brazilianUFs, triggerWebhookSimulation, getAppDomain } from "../utils";
import { GOVERNMENT_CREDIT_LINES, validateCreditLineConditions } from "../utils/creditLineRules";
import FichaRatingCreditoForm from "./FichaRatingCreditoForm";
import { DiagnosticStep3Viewer } from "./DiagnosticStep3Viewer";
import { DossierComparativeViewer } from "./DossierComparativeViewer";

interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cnpj: string;
  cidade: string;
  interesse: string;
  status: string;
  dataCriacao: string;
  razaoSocial?: string;
  porte?: string;
  dataAbertura?: string;
  ramo?: string;
  menosDe12Meses?: boolean;
  faturamentoAnual?: number;
  cargo?: string;
  situacaoCadastral?: string;
  possuiDeclaracaoFaturamento?: boolean;
  autorizaCompartilhamentoEcac?: boolean;
  possuiRestricaoSerasa?: boolean;
  possuiDividasTributarias?: boolean;
  bancoPrincipal?: string;
  objetivoRecurso?: string;
  tempoParaCaptacao?: string;
  limiteEstimado?: number;
  nivelPreparacao?: "alto" | "medio" | "baixo";
  principaisAlertas?: string[];
  recomendações?: string[];
  etapa?: number;
  pendencias?: {
    mensagem: string;
    status: 'pendente' | 'resolvida';
    resposta?: string;
  } | null;
  govbrLogin?: string;
  govbrSenha?: string;
  serasaLogin?: string;
  serasaSenha?: string;
  propostaNegociada?: any;
  clienteSenha?: string;
  clienteSenhaHash?: string;
  clientePrimeiroAcessoConcluido?: boolean;
  clienteUltimoAcesso?: string;
  solicitacaoResetSenha?: {
    pendente: boolean;
    dataSolicitacao: string;
    solicitanteIp?: string;
    novaSenhaGerada?: string;
    dataAtendimento?: string;
    atendidoPor?: string;
  };
  fichaRatingCredito?: any;
  pagamentoConfirmado?: boolean;
  pagamentoServicosConfirmado?: boolean;
  liberarFichaRating?: boolean;
  servicosRecomendados?: any[];
  subEtapasPasso6?: any[];
  [key: string]: any;
}

interface ClientScheduleRow {
  mes: number;
  tipo: "Carência" | "Amortização";
  saldoInicial: number;
  amortizacao: number;
  juros: number;
  parcela: number;
  saldoFinal: number;
}

const calculateClientSchedule = (
  valor: number,
  carencia: number = 12,
  amortizacaoMeses: number = 48,
  sistema: "SAC" | "PRICE" = "SAC",
  taxaAnual: number = 16.5,
  pagarJurosCarencia: boolean = false
) => {
  const r_m = taxaAnual / 100 / 12;
  const C = carencia;
  const N = amortizacaoMeses;
  const rows: ClientScheduleRow[] = [];
  
  let currentBalance = valor;
  let accumulatedUncapitalizedInterest = 0;
  
  // 1. Grace Period (Carência)
  for (let t = 1; t <= C; t++) {
    const startBalance = currentBalance;
    const interest = startBalance * r_m;
    let payment = 0;
    
    if (pagarJurosCarencia) {
      payment = interest;
    } else {
      accumulatedUncapitalizedInterest += interest;
    }
    
    rows.push({
      mes: t,
      tipo: "Carência",
      saldoInicial: startBalance,
      amortizacao: 0,
      juros: interest,
      parcela: payment,
      saldoFinal: currentBalance
    });
  }
  
  const balanceAfterGrace = currentBalance;
  const amortizationAmountPerMonthUncapitalized = accumulatedUncapitalizedInterest / N;
  
  // 2. Amortization Period
  if (sistema === "PRICE") {
    let pmtBase = 0;
    if (r_m > 0) {
      pmtBase = balanceAfterGrace * (r_m * Math.pow(1 + r_m, N)) / (Math.pow(1 + r_m, N) - 1);
    } else {
      pmtBase = balanceAfterGrace / N;
    }
    
    for (let k = 1; k <= N; k++) {
      const t = C + k;
      const startBalance = currentBalance;
      const interest = startBalance * r_m;
      
      let amortization = pmtBase - interest;
      if (amortization > startBalance) {
        amortization = startBalance;
      }
      
      const extraUncapitalized = amortizationAmountPerMonthUncapitalized;
      const payment = pmtBase + extraUncapitalized;
      
      currentBalance = startBalance - amortization;
      
      rows.push({
        mes: t,
        tipo: "Amortização",
        saldoInicial: startBalance,
        amortizacao: amortization,
        juros: interest + extraUncapitalized,
        parcela: payment,
        saldoFinal: Math.max(0, currentBalance)
      });
    }
  } else {
    // SAC
    const sacAmortization = balanceAfterGrace / N;
    
    for (let k = 1; k <= N; k++) {
      const t = C + k;
      const startBalance = currentBalance;
      const interest = startBalance * r_m;
      
      let amortization = sacAmortization;
      if (amortization > startBalance) {
        amortization = startBalance;
      }
      
      const extraUncapitalized = amortizationAmountPerMonthUncapitalized;
      const payment = amortization + interest + extraUncapitalized;
      
      currentBalance = startBalance - amortization;
      
      rows.push({
        mes: t,
        tipo: "Amortização",
        saldoInicial: startBalance,
        amortizacao: amortization,
        juros: interest + extraUncapitalized,
        parcela: payment,
        saldoFinal: Math.max(0, currentBalance)
      });
    }
  }
  
  const totalJuros = rows.reduce((acc, row) => acc + row.juros, 0);
  const totalPago = rows.reduce((acc, row) => acc + row.parcela, 0);
  
  const amortRows = rows.filter(r => r.tipo === "Amortização");
  const parcelaInicial = amortRows.length > 0 ? amortRows[0].parcela : 0;
  const parcelaFinal = amortRows.length > 0 ? amortRows[amortRows.length - 1].parcela : 0;
  
  return {
    rows,
    totalJuros,
    totalPago,
    parcelaInicial,
    parcelaFinal
  };
};

interface TrackingPortalProps {
  onBackToHome?: () => void;
  initialLeadId?: string | null;
  embedded?: boolean;
}

export default function TrackingPortal({ onBackToHome, initialLeadId, embedded = false }: TrackingPortalProps) {
  const [searchIdOrCnpj, setSearchIdOrCnpj] = useState("");
  const [showScheduleTable, setShowScheduleTable] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showEcaTutorial, setShowEcaTutorial] = useState(false);

  // Authentication & Password Gate States
  const [candidateLead, setCandidateLead] = useState<Lead | null>(null);
  // Indica se o lead já possui senha cadastrada (o servidor nunca devolve o hash).
  const [candidateTemSenha, setCandidateTemSenha] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [resetRequestedSuccess, setResetRequestedSuccess] = useState(false);

  const [partnerWhatsapp, setPartnerWhatsapp] = useState<string | null>(null);
  const [partnerNome, setPartnerNome] = useState<string | null>(null);
  const [mobilePortalTab, setMobilePortalTab] = useState<"esteira" | "ficha">("esteira");

  // System Notification States
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Dynamic Price Catalog loaded from ADM Settings (configuracoes/precos_consultas)
  const [catalogServices, setCatalogServices] = useState<{ id?: string; nome: string; valor: number }[]>([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        // A leitura de configuracoes exige sessão nas regras do Firestore;
        // o cliente ainda não está logado, então o servidor entrega o catálogo.
        const resp = await fetch("/api/portal/precos");
        if (!resp.ok) return;
        const data = await resp.json();
        if (Array.isArray(data?.servicos)) setCatalogServices(data.servicos);
      } catch (err) {
        console.warn("Could not load price catalog in TrackingPortal.");
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (!lead) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notificacoes"),
      where("recipientId", "==", lead.id),
      where("recipientType", "==", "lead"),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemNotification[];
      // Sort client-side by dataCriacao desc
      list.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
      setNotifications(list);
    }, (error) => {
      console.error("Error listening to lead notifications:", error);
    });

    return () => unsubscribe();
  }, [lead]);

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      // Deletar a notificação diretamente do Firestore para economizar espaço e evitar acúmulo no banco
      await deleteDoc(doc(db, "notificacoes", notifId));
    } catch (err) {
      console.error("Error deleting notification upon read:", err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      // Deletar todas as notificações do Firestore para limpar o banco
      await Promise.all(notifications.map(n => deleteDoc(doc(db, "notificacoes", n.id))));
    } catch (err) {
      console.error("Error deleting all notifications:", err);
    }
  };

  // Fetch partner details when lead changes
  useEffect(() => {
    if (lead) {
      const fetchPartner = async () => {
        const parceiroId = (lead as any).parceiroId;
        if (parceiroId) {
          try {
            const partnerSnap = await getDoc(doc(db, "parceiros", parceiroId));
            if (partnerSnap.exists()) {
              const data = partnerSnap.data();
              if (data) {
                if (data.whatsapp) {
                  setPartnerWhatsapp(data.whatsapp);
                }
                if (data.nome) {
                  setPartnerNome(data.nome);
                }
              }
            }
          } catch (err) {
            console.error("Error fetching partner details for tracking:", err);
          }
        } else {
          setPartnerWhatsapp(null);
          setPartnerNome(null);
        }
      };
      fetchPartner();
    } else {
      setPartnerWhatsapp(null);
      setPartnerNome(null);
    }
  }, [lead]);

  // Partners (Sócios) Data State for Tracking Portal
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

  // Load initial lead if provided
  useEffect(() => {
    if (initialLeadId) {
      fetchLead(initialLeadId);
    }
  }, [initialLeadId]);

  const [clientIp, setClientIp] = useState<string>("");
  const [signName, setSignName] = useState("");
  const [signCpf, setSignCpf] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<"contrato" | "termo" | "rating_score" | "bacen" | "rtb">("contrato");

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        if (data.ip) {
          setClientIp(data.ip);
        }
      } catch (err) {
        try {
          const response2 = await fetch("https://ipapi.co/json/");
          const data2 = await response2.json();
          if (data2.ip) {
            setClientIp(data2.ip);
          }
        } catch (e) {
          setClientIp("IP não detectado");
        }
      }
    };
    fetchIp();
  }, []);

  useEffect(() => {
    if (lead) {
      const repName = (lead as any).socios && (lead as any).socios.length > 0 
        ? (lead as any).socios[0].nome 
        : (lead.nome || "");
      setSignName(repName);

      const repCpf = (lead as any).socios && (lead as any).socios.length > 0 
        ? (lead as any).socios[0].cpf 
        : "";
      setSignCpf(repCpf);
    }
  }, [lead]);

  // Fintech Interactive Lead Simulation State
  const [clientLineCode, setClientLineCode] = useState<string>("PRONAMPE");
  const [clientValor, setClientValor] = useState<number>(100000);
  const [clientCarencia, setClientCarencia] = useState<number>(12);
  const [clientAmortizacao, setClientAmortizacao] = useState<number>(48);
  const [clientSistema, setClientSistema] = useState<"SAC" | "PRICE">("SAC");
  const [clientTaxaAnual, setClientTaxaAnual] = useState<number>(16.5);
  const [clientPagarJurosCarencia, setClientPagarJurosCarencia] = useState<boolean>(false);

  const [isSavingSimulation, setIsSavingSimulation] = useState<boolean>(false);
  const [saveSimulationSuccess, setSaveSimulationSuccess] = useState<boolean>(false);

  // Step 5: GOV.br and Serasa Credentials State
  const [govbrLogin, setGovbrLogin] = useState<string>("");
  const [govbrSenha, setGovbrSenha] = useState<string>("");
  const [serasaLogin, setSerasaLogin] = useState<string>("");
  const [serasaSenha, setSerasaSenha] = useState<string>("");
  const [showGovPassword, setShowGovPassword] = useState<boolean>(false);
  const [showSerasaPassword, setShowSerasaPassword] = useState<boolean>(false);
  const [submittingGov, setSubmittingGov] = useState<boolean>(false);
  const [govSuccess, setGovSuccess] = useState<boolean>(false);
  const [govError, setGovError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setGovbrLogin(lead.govbrLogin || lead.cnpj || "");
      setGovbrSenha(lead.govbrSenha || "");
      setSerasaLogin(lead.serasaLogin || lead.cnpj || "");
      setSerasaSenha(lead.serasaSenha || "");
    }
  }, [lead?.id]);

  const handleGovSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    if (!govbrLogin.trim() || !govbrSenha.trim()) {
      setGovError("Por favor, informe o login (CPF/CNPJ) e a senha do Portal GOV.br.");
      return;
    }

    setSubmittingGov(true);
    setGovError(null);

    try {
      const docRef = doc(db, "leads", lead.id);
      const prevEtapa = lead.etapa || 1;
      const targetEtapa = Math.max(prevEtapa, 6); // Advances to Step 6 (Estruturação)

      const payload = {
        govbrLogin,
        govbrSenha,
        serasaLogin: serasaLogin || govbrLogin,
        serasaSenha: serasaSenha || govbrSenha,
        etapa: targetEtapa,
        dataColetaSenhas: new Date().toISOString()
      };

      await salvarLeadPortal(lead.id, payload);

      triggerWebhookSimulation("gov_credentials_collected_portal", {
        leadId: lead.id,
        ...payload
      });

      setGovSuccess(true);
      await fetchLead(lead.id);
    } catch (err) {
      console.error("Error saving GOV credentials:", err);
      setGovError(`Erro ao salvar os dados: ${(err as any)?.message || "tente novamente"}`);
    } finally {
      setSubmittingGov(false);
    }
  };

  // Sync simulation values when lead loads or updates
  useEffect(() => {
    if (lead) {
      const code = lead.propostaNegociada?.creditLineCode || lead.creditLineCode || "PRONAMPE";
      const rule = GOVERNMENT_CREDIT_LINES[code] || GOVERNMENT_CREDIT_LINES.PRONAMPE;

      setClientLineCode(code);
      setClientValor(lead.propostaNegociada?.valorDesejado || lead.limiteEstimado || 100000);
      setClientCarencia(lead.propostaNegociada?.carenciaMeses ?? rule.defaultCarencia);
      setClientAmortizacao(lead.propostaNegociada?.amortizacaoMeses ?? rule.defaultPrazoAmortizacao);
      setClientSistema(lead.propostaNegociada?.sistemaAmortizacao || rule.defaultSistema);
      setClientTaxaAnual(lead.propostaNegociada?.taxaAnual ?? rule.defaultTaxaAnual);
      setClientPagarJurosCarencia(lead.propostaNegociada?.pagarJurosCarencia || false);
    }
  }, [lead?.id]);

  const handleSelectClientCreditLine = (code: string) => {
    const rule = GOVERNMENT_CREDIT_LINES[code] || GOVERNMENT_CREDIT_LINES.PRONAMPE;
    setClientLineCode(code);
    setClientTaxaAnual(rule.defaultTaxaAnual);
    setClientCarencia(rule.defaultCarencia);
    setClientAmortizacao(rule.defaultPrazoAmortizacao);
    setClientSistema(rule.defaultSistema);
    if (clientValor < rule.minValor) setClientValor(rule.minValor);
    if (clientValor > rule.maxValor) setClientValor(rule.maxValor);
  };

  const handleSaveClientSimulation = async () => {
    if (!lead) return;
    setIsSavingSimulation(true);
    setSaveSimulationSuccess(false);

    const rule = GOVERNMENT_CREDIT_LINES[clientLineCode] || GOVERNMENT_CREDIT_LINES.PRONAMPE;

    try {
      const docRef = doc(db, "leads", lead.id);
      const updatedProposal = {
        valorDesejado: clientValor,
        carenciaMeses: clientCarencia,
        amortizacaoMeses: clientAmortizacao,
        sistemaAmortizacao: clientSistema,
        taxaAnual: clientTaxaAnual,
        creditLineCode: clientLineCode,
        creditLineName: rule.name,
        pagarJurosCarencia: clientPagarJurosCarencia,
        dataSimulacaoLead: new Date().toISOString()
      };

      await salvarLeadPortal(lead.id, {
        propostaNegociada: updatedProposal,
        limiteEstimado: clientValor,
        creditLineCode: clientLineCode,
        creditLineName: rule.name
      });

      triggerWebhookSimulation("lead_simulation_updated", {
        leadId: lead.id,
        ...updatedProposal
      });

      setSaveSimulationSuccess(true);
      setTimeout(() => setSaveSimulationSuccess(false), 5000);
      await fetchLead(lead.id);
    } catch (err) {
      console.error("Error saving lead simulation:", err);
    } finally {
      setIsSavingSimulation(false);
    }
  };

  const handleSignatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    if (!signatureDataUrl) {
      setSignatureError("Por favor, desenhe sua assinatura no campo indicado.");
      return;
    }
    if (!signName.trim()) {
      setSignatureError("Por favor, digite seu nome completo para assinar.");
      return;
    }
    if (!signCpf.trim()) {
      setSignatureError("Por favor, preencha o seu CPF.");
      return;
    }
    if (!acceptTerms) {
      setSignatureError("Você precisa marcar a caixa de concordância para prosseguir.");
      return;
    }

    setIsSubmittingSignature(true);
    setSignatureError(null);

    try {
      const docRef = doc(db, "leads", lead.id);
      const prevEtapa = lead.etapa || 1;
      const targetEtapa = Math.max(prevEtapa, 5);
      
      const newHistoryItem = {
        data: new Date().toISOString(),
        etapaAnterior: prevEtapa,
        etapaNova: targetEtapa,
        autor: "Cliente",
        detalhes: "Assinatura Eletrônica de Termos e Contratos realizada com sucesso pelo cliente via portal de acompanhamento."
      };

      const updatedHistory = (lead as any).historicoEtapas 
        ? [...(lead as any).historicoEtapas, newHistoryItem]
        : [newHistoryItem];

      const signaturePayload = {
        contratoAssinado: true,
        contratoAssinadoData: new Date().toLocaleString("pt-BR"),
        contratoAssinadoIp: clientIp || "IP não detectado",
        contratoAssinadoNome: signName,
        contratoAssinadoCpf: signCpf,
        contratoAssinadoDispositivo: navigator.userAgent || "Dispositivo Móvel/Celular",
        contratoAssinadoDesenho: signatureDataUrl,
        
        termoAssinado: true,
        termoAssinadoData: new Date().toLocaleString("pt-BR"),
        termoAssinadoIp: clientIp || "IP não detectado",
        termoAssinadoNome: signName,
        termoAssinadoCpf: signCpf,
        termoAssinadoDispositivo: navigator.userAgent || "Dispositivo Móvel/Celular",
        termoAssinadoDesenho: signatureDataUrl,

        etapa: targetEtapa,
        historicoEtapas: updatedHistory
      };

      await salvarLeadPortal(lead.id, signaturePayload);

      // Trigger Webhook
      triggerWebhookSimulation("signature_completed_portal", {
        leadId: lead.id,
        ...signaturePayload
      });

      // Refetch
      await fetchLead(lead.id);
    } catch (err) {
      console.error("Error saving signature:", err);
      setSignatureError(`Erro ao salvar a assinatura: ${(err as any)?.message || "tente novamente"}`);
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  const getContractText = () => {
    if (!lead) return "";
    const razaoSocial = lead.razaoSocial || lead.nome || "[Razão Social]";
    const cnpj = lead.cnpj || "[CNPJ]";
    const cidade = lead.cidade || "[Cidade]";
    const representante = (lead as any).socios && (lead as any).socios.length > 0 
      ? (lead as any).socios[0].nome 
      : (lead.nome || "[Representante Legal]");
    const representanteCpf = (lead as any).socios && (lead as any).socios.length > 0 
      ? (lead as any).socios[0].cpf 
      : "[CPF]";
    const email = lead.email || "[E-mail do Encarregado]";

    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA E ASSESSORIA EM CRÉDITO EMPRESARIAL PJ

Pelo presente instrumento particular, as partes abaixo qualificadas têm entre si justo e contratado o seguinte:

CLÁUSULA 1 – DAS PARTES
CONTRATANTE: ${razaoSocial}, inscrita no CNPJ nº ${cnpj}, com sede em ${cidade}, neste ato representada por seu representante legal ${representante}, CPF nº ${representanteCpf}.
CONTRATADO: DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº 65.668.670/0001-26, com sede no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060, doravante denominada PROSFEC.

CLÁUSULA 2 – DO OBJETO E NATUREZA DOS SERVIÇOS
2.1. O presente contrato tem por objeto a prestação de serviços profissionais de consultoria e assessoria técnica em crédito empresarial pelo CONTRATADO à CONTRATANTE, compreendendo análise de elegibilidade, diagnóstico cadastral e financeiro, organização documental, montagem de dossiê técnico, orientação estratégica, protocolo e acompanhamento administrativo de propostas de crédito junto a instituições financeiras e agentes parceiros (incluindo linhas como PRONAMPE, Proger, FINEP, FAMP, BNDES e repasses bancários).
Parágrafo Primeiro. Os serviços possuem natureza exclusivamente consultiva e técnica. O CONTRATADO não é instituição financeira, não realiza concessão direta de crédito, não atua como correspondente bancário exclusivo de agente financeiro e não garante a aprovação final do financiamento, cuja decisão é de competência soberana e exclusiva da instituição financeira escolhida.
Parágrafo Segundo. A decisão quanto ao limite liberado, taxa de juros, prazo de amortização, carência e exigência de garantias ou avalistas compete unicamente ao agente financeiro concedente.

CLÁUSULA 3 – DOS HONORÁRIOS DE ÊXITO E FORMA DE PAGAMENTO
3.1. A remuneração do CONTRATADO adota o modelo 100% ÊXITO. A CONTRATANTE pagará ao CONTRATADO honorários de êxito correspondentes a 5% (cinco por cento) sobre o valor bruto do crédito efetivamente aprovado, contratado e liberado pela instituição financeira.
§1º Fato Gerador: O fato gerador da obrigação de pagamento é a efetiva disponibilização, crédito, liberação ou desembolso dos recursos na conta bancária da CONTRATANTE ou de seus sócios/garantidores por ela indicados.
§2º Prazo de Pagamento: Os honorários deverão ser pagos pela CONTRATANTE em até 2 (dois) dias úteis contados da efetiva liberação dos recursos na conta, via PIX ou transferência bancária para a conta oficial do CONTRATADO.
§3º Liberações Parciais: Em caso de liberação parcelada ou em tranches, os honorários de 5% incidirão proporcionalmente sobre o valor de cada parcela disponibilizada.
§4º Isenção Prévia: Não haverá qualquer cobrança antecipada de taxa de cadastro, análise documental, consulta ou abertura de crédito antes da liberação efetiva do valor.

CLÁUSULA 4 – DOS DEVERES DA CONTRATANTE E COOPERAÇÃO
4.1. A CONTRATANTE compromete-se a: (i) fornecer informações autênticas e documentos verídicos; (ii) atender às solicitações complementares do CONTRATADO e do banco no prazo máximo de 48 horas úteis; (iii) comunicar ao CONTRATADO, em até 24 (vinte e quatro) horas, a aprovação, assinatura de CCB ou efetiva liberação do crédito na conta bancária; (iv) não realizar pleitos duplicados simultâneos com a mesma documentação sem a prévia orientação do CONTRATADO para evitar travamento cadastral no sistema bancário.

CLÁUSULA 5 – DA CLÁUSULA ANTI-BURLA E BOA-FÉ CONTRATUAL
5.1. Caso a CONTRATANTE, após a montagem do dossiê, encaminhamento de proposta ou aprovação do crédito viabilizado pela assessoria do CONTRATADO, tente omitir a liberação dos recursos, cancelar este contrato de má-fé ou efetuar a contratação/desembolso diretamente com o agente financeiro para eximir-se do pagamento dos honorários, a comissão de 5% (cinco por cento) sobre o valor total viabilizado permanecerá integralmente devida.
Parágrafo Único. Na hipótese descrita no caput, incidirá ainda multa compensatória infracontratual de 10% (dez por cento) sobre o valor total do crédito aprovado, sem prejuízo da cobrança judicial de honorários e perdas e danos.

CLÁUSULA 6 – DAS ISENÇÕES DE RESPONSABILIDADE
6.1. O CONTRATADO não responde por: (i) reprovação de crédito decorrente de restrições cadastrais (SERASA, SPC, CADIN, SCR/BACEN), inconsistências fiscais ou falta de faturamento do CONTRATANTE; (ii) alteração unilateral de taxas, limites ou prazos promovida pelo agente financeiro; (iii) atrasos decorrentes de trâmites internos operacionais das instituições bancárias.

CLÁUSULA 7 – DA LIQUIDEZ, TÍTULO EXECUTIVO E MORA
7.1. O presente contrato, acompanhado do comprovante de liberação do crédito bancário, constitui título executivo extrajudicial (art. 784, III, do Código de Processo Civil), certo, líquido e exigível.
7.2. O atraso no pagamento sujeitará a CONTRATANTE a: (a) multa moratória de 2% (dois por cento) sobre o valor devido; (b) juros de mora de 1% (um por cento) ao mês pro rata die; (c) correção monetária pelo IPCA; e (d) honorários advocatícios de cobrança de 20% (vinte por cento) sobre o montante em atraso.

CLÁUSULA 8 – DA PROTEÇÃO DE DADOS (LGPD – LEI 13.709/2018)
8.1. O CONTRATADO tratará os dados pessoais e empresariais da CONTRATANTE, seus sócios e garantidores estritamente para a finalidade de análise de elegibilidade, elaboração do dossiê e instrução do pleito junto às instituições financeiras.
8.2. O CONTRATADO adota medidas técnicas de segurança para proteção dos dados e assume o dever de sigilo e confidencialidade, vedada qualquer comercialização com terceiros.

CLÁUSULA 9 – DA VALIDADE DA ASSINATURA ELETRÔNICA E FORO
9.1. As partes reconhecem expressamente a plena validade e eficácia jurídica da assinatura deste contrato por meios eletrônicos, digitais e biometria facial, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020.
9.2. Fica eleito o foro da comarca de São Luís - MA para dirimir eventuais litígios decorrentes deste instrumento, com renúncia expressa a qualquer outro.`;
  };

  const getTermoText = () => {
    if (!lead) return "";
    const razaoSocial = lead.razaoSocial || lead.nome || "[Razão Social]";
    const cnpj = lead.cnpj || "[CNPJ]";
    const representante = (lead as any).socios && (lead as any).socios.length > 0 
      ? (lead as any).socios[0].nome 
      : (lead.nome || "[Representante Legal]");
    const representanteCpf = (lead as any).socios && (lead as any).socios.length > 0 
      ? (lead as any).socios[0].cpf 
      : "[CPF]";

    return `TERMO DE RECONHECIMENTO E OBRIGAÇÃO DE PAGAMENTO DE HONORÁRIOS DE ÊXITO

Pelo presente instrumento particular, de um lado:
CONTRATANTE: ${razaoSocial}, inscrita no CNPJ nº ${cnpj}, neste ato representada por seu representante legal ${representante}, CPF nº ${representanteCpf}.

E, de outro lado,
CONTRATADO: DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº 65.668.670/0001-26, com sede no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060, doravante denominada PROSFEC.

As partes resolvem firmar o presente Termo de Reconhecimento e Obrigação de Pagamento de Honorários de Êxito, vinculado ao Contrato de Prestação de Serviços de Consultoria e Assessoria em Crédito Empresarial PJ, mediante as cláusulas seguintes:

CLÁUSULA 1 – DO RECONHECIMENTO
A CONTRATANTE declara expressamente que contratou o CONTRATADO para prestação de serviços de consultoria e assessoria técnica em crédito empresarial, tendo pleno conhecimento do escopo dos serviços, das atribuições de cada parte e do modelo de remuneração 100% focado no êxito.
A CONTRATANTE reitera que a comissão do CONTRATADO é devida exclusivamente na hipótese de aprovação e efetiva liberação do crédito pela instituição financeira.

CLÁUSULA 2 – DO FATO GERADOR
Considera-se ocorrido o fato gerador dos honorários a efetiva disponibilização, crédito ou desembolso de recursos financeiros na conta corrente da CONTRATANTE ou de seus representantes/sócios indicados.
Caso a disponibilização ocorra em liberações parciais, o direito aos honorários constitui-se imediatamente sobre cada parcela creditada.

CLÁUSULA 3 – DOS HONORÁRIOS
A CONTRATANTE reconhece de forma irrevogável ser devido ao CONTRATADO o pagamento correspondente a 5% (cinco por cento) sobre o valor bruto do crédito efetivamente liberado pela instituição financeira.

CLÁUSULA 4 – DO PRAZO PARA PAGAMENTO
Os honorários de 5% deverão ser pagos pela CONTRATANTE ao CONTRATADO no prazo máximo de até 2 (dois) dias úteis contados da efetiva disponibilização dos recursos financeiros na conta.
O pagamento será realizado via PIX ou transferência bancária para a chave/conta cadastral oficial da PROSFEC.

CLÁUSULA 5 – DA OBRIGAÇÃO DE COMUNICAÇÃO E CLÁUSULA ANTI-BURLA
A CONTRATANTE compromete-se a comunicar ao CONTRATADO, no prazo máximo de 24 (vinte e quatro) horas, a emissão do contrato bancário (CCB) e a efetiva liberação dos recursos.
A omissão intencional de comunicação ou a tentativa de contratação direta com a instituição financeira após a atuação técnica do CONTRATADO caracteriza infração grave, mantendo a exigibilidade integral dos honorários de 5%, acrescida das sanções e penalidades contratuais.

CLÁUSULA 6 – DA MORA E EXECUÇÃO
O descumprimento do prazo de pagamento sujeitará a CONTRATANTE à incidência de multa de 2%, juros moratórios de 1% ao mês, correção monetária e honorários advocatícios de 20%, constituindo este instrumento título executivo extrajudicial vinculante.

CLÁUSULA 7 – DA AUTONOMIA E DECLARAÇÃO FINAL
Este termo integra o Contrato de Prestação de Serviços de Consultoria em Crédito Empresarial PJ. A CONTRATANTE declara que leu integralmente este documento, compreendeu todas as suas cláusulas e concorda plenamente com suas disposições ao assinar eletronicamente.

Por estarem de acordo, as partes firmam o presente Termo.`;
  };

  const getContractRatingScoreText = () => {
    if (!lead) return "";
    const clienteNome = lead.razaoSocial || lead.nome || "[NOME COMPLETO/EMPRESA]";
    const clienteCpfCnpj = lead.cnpj || lead.cpf || "[CPF/CNPJ]";
    const clienteEndereco = [lead.endereco, lead.cidade, lead.uf].filter(Boolean).join(", ") || lead.cidade || "[ENDEREÇO COMPLETO COM CEP]";

    const servRatingScore = (lead as any).servicosRecomendados?.find((s: any) => 
      s.id === "serv_rating_score" || 
      (s.nome && s.nome.toLowerCase().includes("rating") && s.nome.toLowerCase().includes("score"))
    );
    const valorTotalNum = servRatingScore?.valor || 1100;
    const valorTotalStr = Number(valorTotalNum).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADMINISTRATIVOS
(ANÁLISE, ORGANIZAÇÃO E ADEQUAÇÃO DE RATING E SCORE)

Pelo presente instrumento particular, de um lado: 

CLIENTE: ${clienteNome}, pessoa física/jurídica, inscrita no CPF/CNPJ sob nº ${clienteCpfCnpj}, com endereço em ${clienteEndereco}. 

E, de outro lado: 

CONTRATADO: DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado, inscrita no CNPJ sob nº 65.668.670/0001-26, com endereço no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060, doravante denominada PROSFEC.

Têm entre si justo e contratado o presente Contrato de Prestação de Serviços de Análise, Organização e Acompanhamento de Informações Cadastrais. 

CLÁUSULA PRIMEIRA – DO OBJETO 
1.1. O presente contrato tem por objeto a prestação de serviços administrativos, consistentes na análise, organização, conferência e acompanhamento de informações cadastrais e documentais fornecidas pelo CLIENTE, bem como na orientação técnica de natureza operacional e informacional relacionada a tais dados. 
1.2. O CONTRATADO atuará unicamente no âmbito administrativo e informacional, sem ingerência, controle ou interferência sobre sistemas, políticas internas, critérios decisórios ou bases de dados de terceiros. 

CLÁUSULA SEGUNDA – DA NATUREZA DA OBRIGAÇÃO 
2.1. Os serviços objeto do presente contrato consistem na execução de atividades de natureza administrativa, organizacional, informacional e de acompanhamento técnico, desenvolvidas com base nos dados e documentos fornecidos pelo CLIENTE, observados critérios usuais de diligência, organização e conformidade operacional. 
2.2. A atuação do CONTRATADO limita-se ao processamento, análise lógica, conferência e orientação informacional dos elementos disponibilizados, inexistindo qualquer ingerência, poder decisório, controle direto ou indireto sobre sistemas, cadastros, políticas internas, critérios de avaliação ou procedimentos adotados por terceiros. 
2.3. O CLIENTE declara ciência de que eventuais análises, classificações, pontuações, avaliações, deferimentos, indeferimentos, concessões ou alterações promovidas por instituições, empresas, órgãos ou sistemas externos decorrem exclusivamente de critérios próprios desses entes, não se vinculando, condicionando ou subordinando à atuação do CONTRATADO. 

CLÁUSULA TERCEIRA – DAS LIMITAÇÕES DOS SERVIÇOS 
3.1. Não integram o objeto deste contrato, não sendo de responsabilidade do CONTRATADO: 
a) A obtenção, garantia ou promessa de score, rating, crédito, financiamento, limite ou aprovação de qualquer natureza; 
b) A realização de alterações, exclusões ou inserções diretas em bancos de dados, sistemas ou cadastros mantidos por terceiros; 
c) A negociação de dívidas, valores, prazos ou condições financeiras; 
d) A representação do CLIENTE perante órgãos públicos ou privados. 
3.2. Eventuais expectativas subjetivas do CLIENTE quanto a consequências futuras, avaliações externas ou benefícios pretendidos não integram o objeto contratual, nem constituem parâmetro de aferição da execução dos serviços. 

CLÁUSULA QUARTA – DAS OBRIGAÇÕES DO CLIENTE 
4.1. O CLIENTE compromete-se a fornecer informações e documentos verdadeiros, completos e atualizados, responsabilizando-se integralmente por seu conteúdo. 
4.2. O CLIENTE declara estar ciente de que condutas pessoais, comerciais ou financeiras praticadas durante a vigência do contrato são de sua exclusiva responsabilidade, não podendo ser atribuídas ao CONTRATADO eventuais impactos decorrentes dessas condutas. 
4.3. O CLIENTE compromete-se a observar as orientações administrativas e informacionais fornecidas pelo CONTRATADO, ciente de que seu descumprimento poderá comprometer a execução adequada dos serviços.

CLÁUSULA QUINTA – DO PRAZO 
5.1. O prazo estimado para execução dos serviços é de até 90 (noventa) dias úteis, contados da confirmação do pagamento e da entrega completa das informações pelo CLIENTE. 
5.2. O prazo acima indicado possui caráter meramente estimativo, não se confundindo com garantia de conclusão ou de qualquer efeito externo decorrente da execução dos serviços. 
5.3. O prazo poderá ser prorrogado em razão de fatores externos, necessidade de complementação de informações ou eventos alheios à atuação do CONTRATADO. 

CLÁUSULA SEXTA – DA EVENTUAL NECESSIDADE DE ATUAÇÃO JURÍDICA 
6.1. Caso, de forma excepcional e pontual, no curso da execução dos serviços administrativos objeto deste contrato, seja identificada eventual necessidade de adoção de providências de natureza jurídica, a atuação do CONTRATADO limitar-se-á exclusivamente à comunicação formal dessa circunstância ao CLIENTE, não estando obrigada a prestar, contratar, indicar ou viabilizar serviços jurídicos de qualquer espécie. 
6.2. O CLIENTE declara, de forma expressa, inequívoca e informada, que possui plena, irrestrita e absoluta liberdade para contratar profissionais regularmente habilitados de sua confiança, inexistindo entre as partes qualquer obrigação, exclusividade, condicionamento, direcionamento ou vinculação com o CONTRATADO. 
6.3. Eventual menção, pelo CONTRATADO, à existência genérica de profissionais juridicamente habilitados aptos à atuação terá caráter meramente informativo, impessoal e não vinculante, não configurando, sob nenhuma hipótese, indicação dirigida, intermediação, captação de clientela, participação na contratação ou qualquer forma de ingerência na escolha do profissional pelo CLIENTE. 
6.4. Na hipótese de o CLIENTE, por sua livre, expressa e espontânea vontade, optar pela contratação de serviços jurídicos eventualmente prestados por profissionais vinculados ou relacionados à estrutura empresarial do CONTRATADO, tal contratação ocorrerá fora do escopo do presente contrato, mediante a celebração de instrumento contratual próprio, específico e autônomo, com condições, valores, responsabilidades e prazos definidos exclusivamente entre as partes contratantes naquele instrumento.
6.5. Fica expressamente consignado que a eventual contratação jurídica referida no item anterior não integra, não decorre automaticamente, não constitui condição e não influencia a execução, continuidade ou conclusão dos serviços administrativos previstos neste contrato. 

CLÁUSULA SÉTIMA – DO VALOR E FORMA DE PAGAMENTO 
7.1. Pelos serviços ora contratados, o CLIENTE pagará ao CONTRATADO o valor total de R$ ${valorTotalStr}, na forma e condições ajustadas entre as partes na ordem de serviço ou fatura de contratação enviada via plataforma. 
7.2. Em caso de atraso no pagamento, poderá incidir multa moratória limitada a 1%, acrescida de juros legais, respeitados os limites da legislação aplicável. 

CLÁUSULA OITAVA – DA RESCISÃO 
8.1. O presente contrato poderá ser rescindido por qualquer das partes, mediante comunicação escrita, respeitados os serviços já executados até a data da rescisão. 
8.2. Em caso de rescisão imotivada pelo CLIENTE, será devido ao CONTRATADO o valor proporcional aos serviços efetivamente prestados até então. 
8.3. Não haverá devolução de valores relativos a serviços administrativos já executados. 

CLÁUSULA NONA – DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS 
9.1. As partes comprometem-se a manter sigilo absoluto sobre todas as informações, dados e documentos compartilhados em razão deste contrato. 
9.2. O tratamento de dados pessoais observará a legislação vigente de proteção de dados, sendo vedada qualquer divulgação sem autorização expressa da parte titular das informações.

CLÁUSULA DÉCIMA – DO FORO 
10.1. Fica eleito o foro da Comarca de São Luís - MA, para dirimir eventuais controvérsias oriundas deste contrato. 

E, por estarem justas e contratadas, firmam o presente instrumento.`;
  };

  const getContractBacenText = () => {
    if (!lead) return "";
    const clienteNome = lead.razaoSocial || lead.nome || "[NOME COMPLETO/EMPRESA]";
    const clienteCpfCnpj = lead.cnpj || lead.cpf || "[CPF/CNPJ]";
    const clienteEndereco = [lead.endereco, lead.cidade, lead.uf].filter(Boolean).join(", ") || lead.cidade || "[ENDEREÇO COMPLETO COM CEP]";

    const servBacen = (lead as any).servicosRecomendados?.find((s: any) => 
      s.id === "serv_reabilitacao" ||
      s.id === "serv_bacen" || 
      (s.nome && s.nome.toLowerCase().includes("reabilita")) ||
      (s.nome && s.nome.toLowerCase().includes("bacen")) ||
      (s.nome && s.nome.toLowerCase().includes("scr"))
    );
    const valorTotalNum = servBacen?.valor || 2000;
    const valorTotalStr = Number(valorTotalNum).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA E INTERMEDIAÇÃO ADMINISTRATIVA

CONTRATADA
DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado, inscrita no CNPJ sob nº 65.668.670/0001-26, com sede no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060, doravante denominada simplesmente CONTRATADA.

CONTRATANTE
${clienteNome}, pessoa física/jurídica, inscrita no CPF/CNPJ sob nº ${clienteCpfCnpj}, residente e domiciliado(a) à ${clienteEndereco}, doravante denominado(a) simplesmente CONTRATANTE.

CLÁUSULA 1ª – DO OBJETO
O presente contrato tem por objeto a prestação de serviços de consultoria e intermediação administrativa, visando a análise, acompanhamento e adoção de medidas administrativas relacionadas à regularização de apontamentos financeiros vinculados ao CPF ou CNPJ do CONTRATANTE perante sistemas de informações de crédito, incluindo registros de “Vencidos” e “Prejuízos” constantes no Sistema de Informações de Crédito do Banco Central do Brasil (SCR).
Parágrafo único. Os serviços poderão envolver:
I – análise documental e administrativa dos apontamentos existentes;
II – solicitação de exclusão de registros considerados prescritos, irregulares ou sem comprovação válida;
III – acompanhamento administrativo perante instituições financeiras;
IV – intermediação de propostas de renegociação de débitos, quando necessária ou cabível.

CLÁUSULA 2ª – DA NATUREZA DOS SERVIÇOS
Os serviços prestados pela CONTRATADA possuem natureza de obrigação de meio, não constituindo garantia absoluta de resultado específico.

CLÁUSULA 3ª – DO PRAZO
O prazo estimado para execução dos serviços será de 45 (quarenta e cinco) a 150 (cento e cinquenta) dias úteis, contados da assinatura deste instrumento e da confirmação do pagamento ajustado entre as partes.

CLÁUSULA 4ª – DA REMUNERAÇÃO
Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA o valor de R$ ${valorTotalStr}, na forma previamente ajustada entre as partes.

CLÁUSULA 5ª – DAS RESPONSABILIDADES
A CONTRATADA não se responsabiliza por novos apontamentos, restrições ou prejuízos lançados após a conclusão dos serviços.

CLÁUSULA 6ª – DA INADIMPLÊNCIA
Em caso de parcelamento, o inadimplemento de qualquer parcela implicará na imediata suspensão da prestação dos serviços até a regularização dos valores pendentes.

CLÁUSULA 7ª – DO CANCELAMENTO E DA DESISTÊNCIA
Não haverá devolução dos valores pagos em caso de desistência imotivada do CONTRATANTE após o início da execução dos trabalhos.

CLÁUSULA 8ª – DA MULTA E ENCARGOS
O atraso no pagamento acarretará multa moratória de 20%, juros de mora de 1% ao mês e atualização monetária.

CLÁUSULA 9ª – DAS LIMITAÇÕES DOS SERVIÇOS
A CONTRATADA não realizará quitação, pagamento ou assunção das dívidas do CONTRATANTE perante quaisquer instituições financeiras ou terceiros.

CLÁUSULA 10ª – DO FORO
Fica eleito o Foro da Comarca de São Luís - MA para dirimir quaisquer controvérsias oriundas deste contrato.

Por estarem de acordo, as partes firmam o presente instrumento.`;
  };

  const getContractRtbText = () => {
    if (!lead) return "";
    const clienteNome = lead.razaoSocial || lead.nome || "[NOME COMPLETO/EMPRESA]";
    const clienteCpfCnpj = lead.cnpj || lead.cpf || "[CPF/CNPJ]";
    const clienteEndereco = [lead.endereco, lead.cidade, lead.uf].filter(Boolean).join(", ") || lead.cidade || "[ENDEREÇO COMPLETO COM CEP]";

    return `TERMO DE CONTRATAÇÃO DE SERVIÇOS
RTB — RECUPERAÇÃO DE TARIFA BANCÁRIA
PROSFEC — ASSESSORIA FINANCEIRA EMPRESARIAL

Pelo presente instrumento eletrônico, de um lado:

CONTRATADA: DCS SOLUCOES TECNOLOGICAS E SERVICOS FINANCEIROS LTDA (DCS Tech & Finance), pessoa jurídica de direito privado, inscrita no CNPJ sob nº 65.668.670/0001-26, com endereço no Edif Office Tower Setor Coluna 1 Sala 501, Renascença, São Luís - MA, CEP: 65075-060, doravante denominada PROSFEC / CONTRATADA.

E, de outro lado:

CONTRATANTE: ${clienteNome}, pessoa física/jurídica, inscrita no CPF/CNPJ sob nº ${clienteCpfCnpj}, com endereço em ${clienteEndereco}, devidamente identificado no cadastro eletrônico da contratação.

Celebram o presente Termo de Contratação de Serviços de Recuperação de Tarifa Bancária — RTB, mediante as seguintes condições:

1. DO OBJETO
1.1. O presente contrato tem por objeto a prestação de serviços de análise documental, técnica e financeira de operações bancárias do CONTRATANTE, com a finalidade de identificar possíveis tarifas, encargos, produtos, seguros ou serviços acessórios que possam ter sido cobrados de forma indevida, não comprovada ou em condições que justifiquem apuração e eventual recuperação de valores.
1.2. O serviço será comercialmente denominado: RTB — RECUPERAÇÃO DE TARIFA BANCÁRIA.
1.3. A prestação poderá abranger operações realizadas por Pessoa Física ou Pessoa Jurídica, incluindo:
a) Cédula de Crédito Bancário — CCB;
b) financiamento de veículos;
c) empréstimos pessoais;
d) crédito consignado;
e) operações de capital de giro;
f) empréstimos empresariais;
g) financiamentos;
h) contratos de crédito e instrumentos acessórios;
i) outras operações bancárias que contenham elementos passíveis de análise.

2. DA FINALIDADE DO RTB
2.1. O RTB tem como finalidade realizar uma análise individualizada da documentação disponibilizada pelo CONTRATANTE para identificar possíveis valores passíveis de questionamento, restituição, compensação, abatimento ou negociação.
2.2. A análise poderá considerar, entre outros:
• tarifas bancárias;
• seguros;
• produtos acessórios;
• serviços vinculados à operação;
• tarifas de avaliação de bem;
• tarifas de registro;
• títulos de capitalização;
• Reserva de Margem Consignável — RMC;
• outras cobranças relacionadas à operação de crédito.
2.3. A simples existência de determinada tarifa, seguro ou produto no contrato não significa automaticamente que exista irregularidade.
2.4. A possibilidade de recuperação será determinada após análise da documentação, das características da operação e das normas aplicáveis.

3. DOS ITENS PASSÍVEIS DE RECUPERAÇÃO
A análise poderá compreender, sem limitação:
3.1. Seguro Prestamista: Verificação de eventual seguro prestamista vinculado à operação, incluindo análise da documentação relacionada à contratação e à autorização do cliente.
3.2. Seguro de Vida e outros seguros: Verificação de seguros ou produtos securitários eventualmente vinculados à operação de crédito.
3.3. Tarifa de Avaliação do Bem: Análise da cobrança relacionada à avaliação de veículo, imóvel ou outro bem dado em garantia, considerando a documentação disponível e a efetiva prestação do serviço, quando aplicável.
3.4. Tarifa de Registro de Contrato: Análise de valores cobrados a título de registro contratual, considerando previsão contratual, documentação e características da operação.
3.5. Títulos de Capitalização: Identificação de títulos de capitalização eventualmente vinculados à contratação de crédito, especialmente em operações empresariais.
3.6. Reserva de Margem Consignável — RMC: Análise da existência de RMC ou produtos consignados relacionados à operação, quando aplicável.
3.7. Outras tarifas e produtos bancários: Poderão ser analisadas outras tarifas, encargos, produtos ou serviços identificados durante a avaliação documental.

4. DA METODOLOGIA
A execução do RTB poderá compreender as seguintes etapas:
ETAPA 1 — RECEBIMENTO DA DOCUMENTAÇÃO: Recebimento dos contratos, CCBs, extratos, comprovantes, documentos bancários e demais informações disponibilizadas pelo CONTRATANTE.
ETAPA 2 — ANÁLISE DOCUMENTAL: Identificação das tarifas, produtos, seguros, encargos e demais componentes financeiros relacionados à operação.
ETAPA 3 — APURAÇÃO: Análise dos itens identificados e verificação da existência de elementos que possam justificar questionamento ou recuperação.
ETAPA 4 — ESTIMATIVA: Quando houver documentação suficiente, poderá ser realizada estimativa dos valores potencialmente envolvidos.
ETAPA 5 — PROCEDIMENTO DE RECUPERAÇÃO: Quando identificada oportunidade de recuperação, poderão ser adotadas medidas administrativas compatíveis com o serviço contratado, diretamente ou mediante encaminhamento a profissional habilitado.
ETAPA 6 — RESULTADO: O CONTRATANTE será informado sobre eventual resultado obtido e o benefício econômico correspondente.

5. DA NATUREZA DOS SERVIÇOS
5.1. O RTB possui natureza técnica, documental, financeira e administrativa.
5.2. A CONTRATADA realizará a análise dos documentos fornecidos pelo CONTRATANTE e poderá auxiliar na organização e condução administrativa da demanda.
5.3. A CONTRATADA não declara antecipadamente que qualquer cobrança é ilegal, abusiva ou indevida.
5.4. A existência de possibilidade de recuperação será determinada individualmente após análise da documentação.

6. DA AUSÊNCIA DE GARANTIA DE RESULTADO
6.1. A contratação do RTB não representa garantia de recuperação de valores.
6.2. O resultado poderá depender:
a) da documentação disponível;
b) das características da operação;
c) da instituição financeira envolvida;
d) da análise dos documentos;
e) da legislação e regulamentação aplicáveis;
f) da aceitação ou não da pretensão pela instituição financeira;
g) de eventual procedimento administrativo ou judicial.
6.3. A CONTRATADA não garante valor mínimo ou máximo de recuperação.

7. DA ATUAÇÃO JURÍDICA
7.1. Este instrumento não constitui contrato de prestação de serviços advocatícios.
7.2. A CONTRATADA não realizará atos privativos de advocacia por meio deste contrato.
7.3. Caso a demanda exija atuação jurídica, elaboração de medidas judiciais, representação processual ou outra atividade privativa de advogado, o CONTRATANTE poderá ser encaminhado a profissional ou escritório de advocacia devidamente habilitado.
7.4. Eventual contratação de advogado será realizada mediante instrumento próprio.
7.5. Honorários advocatícios eventualmente contratados não integram automaticamente a remuneração prevista neste instrumento.

8. DA REMUNERAÇÃO DE ÊXITO
8.1. Pela prestação dos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA remuneração exclusivamente condicionada ao êxito.
8.2. A remuneração será equivalente a 50% (CINQUENTA POR CENTO) do benefício econômico efetivamente obtido pelo CONTRATANTE em decorrência da demanda objeto do RTB.
8.3. Não haverá cobrança da remuneração de êxito quando não houver benefício econômico efetivamente obtido, ressalvadas despesas extraordinárias previamente autorizadas pelo CONTRATANTE.

9. DO BENEFÍCIO ECONÔMICO
Para fins deste contrato, considera-se benefício econômico:
I — valores efetivamente restituídos;
II — valores creditados;
III — valores compensados;
IV — valores abatidos;
V — redução do saldo devedor;
VI — descontos obtidos mediante negociação;
VII — quitação de obrigação por valor inferior ao originalmente exigido;
VIII — qualquer outra vantagem financeira direta e mensurável decorrente da demanda.

10. DA REDUÇÃO DE DÍVIDA
10.1. Caso o resultado obtido não seja uma restituição em dinheiro, mas uma redução do saldo devedor ou obrigação financeira, será considerado benefício econômico o valor efetivamente economizado pelo CONTRATANTE.
10.2. A apuração poderá utilizar contrato original, saldo devedor, termo de acordo, extratos, demonstrativos, comprovantes, documentos emitidos pela instituição financeira e outros documentos hábeis.

11. DO PAGAMENTO
11.1. Quando o benefício econômico for recebido em parcela única, a remuneração será devida após a efetiva disponibilização do valor ao CONTRATANTE.
11.2. Quando o benefício for recebido parceladamente, a remuneração poderá ser paga proporcionalmente ao recebimento das parcelas.
11.3. Quando o benefício consistir em redução de dívida, a remuneração será calculada sobre o valor efetivamente economizado.
11.4. O pagamento da remuneração de êxito deverá ser realizado pelo CONTRATANTE no prazo e meio de pagamento disponibilizados pela CONTRATADA.

12. DA COMUNICAÇÃO DO ÊXITO
12.1. O CONTRATANTE deverá comunicar à CONTRATADA qualquer resultado relacionado à demanda.
12.2. O CONTRATANTE deverá apresentar, quando solicitado, documentos que comprovem restituição, crédito, compensação, abatimento, desconto, acordo, redução de dívida, quitação ou qualquer outro benefício econômico.
12.3. O CONTRATANTE compromete-se a não ocultar deliberadamente resultado obtido em decorrência da demanda.

13. DAS OBRIGAÇÕES DO CONTRATANTE
São obrigações do CONTRATANTE:
a) fornecer documentos verdadeiros;
b) disponibilizar os contratos necessários;
c) fornecer informações completas sobre as operações;
d) informar renegociações e alterações contratuais;
e) fornecer documentos complementares solicitados;
f) manter os dados cadastrais atualizados;
g) informar acordos realizados com a instituição financeira;
h) comunicar eventual benefício econômico obtido.

14. DAS OBRIGAÇÕES DA CONTRATADA
São obrigações da CONTRATADA:
a) analisar a documentação recebida;
b) realizar a análise técnica e financeira;
c) identificar possíveis oportunidades de recuperação;
d) organizar as informações da demanda;
e) apresentar diagnóstico quando aplicável;
f) orientar o CONTRATANTE quanto aos próximos procedimentos;
g) manter sigilo sobre as informações recebidas;
h) comunicar o CONTRATANTE sobre o andamento da demanda.

15. DA RESPONSABILIDADE PELOS DOCUMENTOS
15.1. O CONTRATANTE declara que os documentos apresentados são legítimos e verdadeiros.
15.2. A CONTRATADA não será responsável por prejuízos decorrentes de informações falsas, documentos adulterados, documentos incompletos ou informações relevantes deliberadamente omitidas pelo CONTRATANTE.

16. DO TRATAMENTO DE DADOS
16.1. O CONTRATANTE autoriza o tratamento dos dados pessoais, financeiros, bancários e empresariais necessários à execução do serviço.
16.2. Os dados poderão ser utilizados para:
a) análise da operação;
b) elaboração de diagnóstico;
c) comunicação com o CONTRATANTE;
d) organização documental;
e) execução de procedimentos administrativos;
f) encaminhamento a profissionais habilitados, quando necessário e autorizado.
16.3. A CONTRATADA deverá adotar medidas razoáveis para proteção das informações recebidas.

17. DA CONFIDENCIALIDADE
17.1. A CONTRATADA manterá sigilo sobre os documentos e informações recebidos do CONTRATANTE.
17.2. O compartilhamento de informações poderá ocorrer quando necessário para execução do serviço, mediante autorização do CONTRATANTE ou quando exigido por lei.

18. DA PARTICIPAÇÃO DE TERCEIROS
18.1. Dependendo da natureza da demanda, poderão ser necessários profissionais especializados.
18.2. Poderão participar, conforme o caso: advogados, contadores, peritos, consultores, especialistas financeiros e outros profissionais habilitados.
18.3. Eventuais honorários ou custos de terceiros não estarão automaticamente incluídos na remuneração de êxito da PROSFEC.

19. DO PRAZO DE EXECUÇÃO
19.1. O serviço terá início após o recebimento da documentação mínima necessária.
19.2. O prazo de execução dependerá da complexidade da operação, quantidade de contratos, qualidade dos documentos e eventual necessidade de informações adicionais.
19.3. Prazos dependentes de instituições financeiras ou terceiros não serão considerados como atraso imputável à CONTRATADA.

20. DA RESCISÃO
20.1. O contrato poderá ser rescindido por qualquer das partes.
20.2. A rescisão não prejudicará eventual remuneração de êxito caso seja posteriormente comprovado que o benefício econômico obtido decorreu diretamente do trabalho realizado durante a vigência deste contrato.
20.3. Não haverá cobrança de êxito se não houver benefício econômico, ressalvadas despesas extraordinárias previamente autorizadas.

21. DO DIREITO DE ARREPENDIMENTO
21.1. Nas hipóteses em que houver aplicação da legislação consumerista, serão respeitados os direitos legalmente assegurados ao CONTRATANTE.
21.2. Caso o CONTRATANTE solicite expressamente o início da execução do serviço antes do término do prazo legal aplicável, serão observadas as disposições legais relativas aos serviços já iniciados ou executados.

22. DA ASSINATURA ELETRÔNICA
22.1. O CONTRATANTE reconhece como válida sua manifestação de vontade realizada por meio eletrônico.
22.2. Poderão ser utilizados como elementos de comprovação: assinatura eletrônica, aceite eletrônico, autenticação, código de confirmação, data e hora, endereço IP, identificação da conta e registro eletrônico da contratação.

23. DA DECLARAÇÃO DE CIÊNCIA
Ao aceitar este instrumento, o CONTRATANTE declara expressamente:
[X] Que leu e compreendeu o presente contrato.
[X] Que compreendeu que o RTB consiste em análise e busca de recuperação de possíveis valores relacionados a tarifas, produtos, seguros e demais cobranças bancárias.
[X] Que compreendeu que a existência de uma tarifa ou produto não significa automaticamente que exista irregularidade.
[X] Que compreendeu que não existe garantia de recuperação de valores.
[X] Que compreendeu que a remuneração da PROSFEC corresponde a 50% do benefício econômico efetivamente obtido.
[X] Que compreendeu como será calculado o benefício econômico.
[X] Que fornecerá documentos e informações verdadeiros.
[X] Que autoriza o tratamento dos dados necessários à execução do serviço.
[X] Que está ciente de que eventual atuação jurídica será realizada por profissional legalmente habilitado.

24. DO FORO
24.1. Fica eleito o foro da Comarca de São Luís - MA para dirimir quaisquer controvérsias oriundas deste contrato, respeitadas as normas legais aplicáveis.

Por estarem de acordo, as partes firmam o presente instrumento eletrônico.`;
  };

  const initializePartnerForm = (fetchedLead: Lead) => {
    setSocio1({
      nome: fetchedLead.nome || "",
      cpf: "",
      dataNascimento: "",
      participacao: "100",
      nomeMae: "",
      telefone: fetchedLead.whatsapp || "",
      rg: "",
      orgaoEmissor: ""
    });
    setEnderecoSocio({
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: fetchedLead.cidade || "",
      uf: "SP"
    });
    setHasSocio2(false);
    setSocio2({
      nome: "",
      cpf: "",
      dataNascimento: "",
      participacao: "",
      telefone: ""
    });
    setSociosSubmitted(false);
    setSociosError("");
  };

  const fetchLead = async (idOrCnpj: string, skipPasswordCheck = false) => {
    setLoading(true);
    setError(null);
    setAuthError(null);
    const cleanedSearch = idOrCnpj.trim().replace(/\D/g, ""); // strip format if it is a CNPJ

    try {
      let fetchedLead: Lead | null = null;

      // A busca do cliente acontece antes de qualquer login, e as regras do
      // Firestore não permitem leitura anônima de /leads. O servidor faz a
      // consulta (protocolo, CNPJ ou WhatsApp) e devolve só campos não sensíveis.
      const resp = await fetch("/api/portal/buscar-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termo: idOrCnpj.trim() })
      });

      if (resp.status === 429) {
        setError("Muitas buscas seguidas. Aguarde um minuto e tente novamente.");
        setLead(null);
        setCandidateLead(null);
        setLoading(false);
        return;
      }

      if (resp.ok) {
        const data = await resp.json();
        if (data?.lead?.id) {
          fetchedLead = data.lead as Lead;
          // O servidor remove os campos de senha do payload; o indicador
          // "temSenha" é a única fonte confiável para decidir a tela.
          setCandidateTemSenha(!!data.temSenha);
        }
      }


      if (!fetchedLead) {
        setError("Solicitação não encontrada. Por favor, verifique o ID ou CNPJ digitado.");
        setLead(null);
        setCandidateLead(null);
        setLoading(false);
        return;
      }

      // If already authenticated or skipPasswordCheck is true, set lead directly
      if (skipPasswordCheck) {
        setLead(fetchedLead);
        initializePartnerForm(fetchedLead);
        setCandidateLead(null);
        setLoading(false);
        return;
      }

      // Password gating: Store candidate lead and prompt for password or first-access password setup
      setCandidateLead(fetchedLead);
      setEnteredPassword("");
      setNewPassword1("");
      setNewPassword2("");
      setAuthError(null);
      setResetRequestedSuccess(false);

    } catch (err) {
      console.error(err);
      setError("Erro ao buscar a solicitação. Entre em contato com o suporte.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateLead) return;

    if (!enteredPassword.trim()) {
      setAuthError("Por favor, digite sua senha de acesso.");
      return;
    }

    // Etapa B-2: a senha nunca é comparada no navegador. O servidor valida o
    // hash (PBKDF2) e faz a migração automática de senhas antigas.
    try {
      const resp = await fetch("/api/auth/cliente-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: candidateLead.id, senha: enteredPassword.trim() })
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 409 || errData?.error === "SEM_SENHA_CADASTRADA") {
          // Ainda não existe senha: envia o cliente para o primeiro acesso.
          setCandidateTemSenha(false);
          setAuthError("Este acesso ainda não possui senha. Crie sua senha abaixo.");
          return;
        }
        setAuthError(
          resp.status === 401
            ? "Senha incorreta. Verifique os caracteres ou solicite a redefinição de senha com seu consultor."
            : (errData?.error || "Não foi possível validar seu acesso agora.")
        );
        return;
      }
    } catch (err) {
      setAuthError("Não foi possível validar seu acesso agora. Tente novamente em instantes.");
      return;
    }

    // Success! Update last access timestamp and log in
    try {
      const now = new Date().toISOString();
      await salvarLeadPortal(candidateLead.id, {
        clienteUltimoAcesso: now,
        clientePrimeiroAcessoConcluido: true
      });
    } catch (err) {
      console.warn("Could not record last access:", err);
    }

    setLead({ ...candidateLead, clienteUltimoAcesso: new Date().toISOString() });
    initializePartnerForm(candidateLead);
    setCandidateLead(null);
    setEnteredPassword("");
    setAuthError(null);
  };

  const handleFirstAccessSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateLead) return;

    if (!newPassword1.trim() || newPassword1.length < 4) {
      setAuthError("A senha deve conter no mínimo 4 caracteres.");
      return;
    }

    if (newPassword1 !== newPassword2) {
      setAuthError("As senhas digitadas não coincidem. Digite novamente.");
      return;
    }

    setIsSettingPassword(true);
    setAuthError(null);

    try {
      const now = new Date().toISOString();
      const pass = newPassword1.trim();

      // Etapa B-2: a senha vai apenas para o servidor, que grava o hash.
      const resp = await fetch("/api/auth/cliente-definir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: candidateLead.id, senha: pass })
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 409) {
          // Já existe senha: leva o cliente para a tela de login.
          setCandidateTemSenha(true);
          setAuthError("Este acesso já possui senha. Digite sua senha ou solicite a redefinição.");
          setIsSettingPassword(false);
          return;
        }
        setAuthError(errData?.error || "Erro ao salvar a nova senha. Tente novamente.");
        setIsSettingPassword(false);
        return;
      }

      const updatedLead = {
        ...candidateLead,
        clienteSenha: undefined,
        clienteSenhaHash: "definida",
        clientePrimeiroAcessoConcluido: true,
        clienteUltimoAcesso: now
      };

      setLead(updatedLead);
      initializePartnerForm(updatedLead);
      setCandidateLead(null);
      setNewPassword1("");
      setNewPassword2("");
    } catch (err) {
      console.error("Error setting client password:", err);
      setAuthError("Erro ao salvar a nova senha. Tente novamente.");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!candidateLead) return;
    setIsRequestingReset(true);
    setAuthError(null);

    try {
      const now = new Date().toISOString();
      await salvarLeadPortal(candidateLead.id, {
        solicitacaoResetSenha: {
          pendente: true,
          dataSolicitacao: now,
          solicitanteIp: clientIp || "não identificado"
        }
      });

      // Update candidateLead locally
      setCandidateLead(prev => prev ? ({
        ...prev,
        solicitacaoResetSenha: {
          pendente: true,
          dataSolicitacao: now,
          solicitanteIp: clientIp || "não identificado"
        }
      }) : null);

      setResetRequestedSuccess(true);
      setTimeout(() => {
        setShowForgotModal(false);
      }, 3500);
    } catch (err) {
      console.error("Error requesting password reset:", err);
      setAuthError(`Erro ao enviar solicitação de reset: ${(err as any)?.message || "tente novamente"}`);
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleSociosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSociosError("");
    
    if (!lead) return;

    // Validation (only essential fields)
    if (!socio1.nome.trim() || !socio1.cpf || !socio1.dataNascimento) {
      setSociosError("Por favor, preencha todos os campos do Sócio 1 (Nome, CPF e Data de Nascimento).");
      return;
    }
    
    const cleanCPF = socio1.cpf.replace(/\D/g, "");
    if (cleanCPF.length !== 11) {
      setSociosError("CPF do Sócio 1 inválido. O CPF deve conter 11 dígitos.");
      return;
    }

    if (hasSocio2) {
      if (!socio2.nome.trim() || !socio2.cpf || !socio2.dataNascimento) {
        setSociosError("Por favor, preencha todos os campos do Sócio 2 (Nome, CPF e Data de Nascimento).");
        return;
      }
      const cleanCPF2 = socio2.cpf.replace(/\D/g, "");
      if (cleanCPF2.length !== 11) {
        setSociosError("CPF do Sócio 2 inválido. O CPF deve conter 11 dígitos.");
        return;
      }
    }

    setSubmittingSocios(true);
    try {
      const refDoc = doc(db, "leads", lead.id);
      
      const sociosList = [
        {
          nome: socio1.nome,
          cpf: cleanCPF,
          dataNascimento: socio1.dataNascimento,
          participacao: Number(socio1.participacao) || 100,
          nomeMae: socio1.nomeMae || "",
          telefone: socio1.telefone || lead.whatsapp,
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

      await salvarLeadPortal(lead.id, {
        socios: sociosList,
        enderecoSocioPrincipal: enderecoSocio,
        etapa: 3, // Advances to Step 3: Consulta diagnóstica no CPF e CNPJ
        status: "em atendimento"
      });

      triggerWebhookSimulation("socios_registration_completed_portal", {
        leadId: lead.id,
        socios: sociosList,
        endereco: enderecoSocio
      });

      setSociosSubmitted(true);
      
      // Refetch lead to update tracking steps automatically
      await fetchLead(lead.id);
    } catch (err) {
      console.error("Error saving socios:", err);
      setSociosError(`Erro ao salvar os dados: ${(err as any)?.message || "tente novamente"}`);
    } finally {
      setSubmittingSocios(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchIdOrCnpj.trim()) return;
    fetchLead(searchIdOrCnpj);
  };

  const handleCopyLink = () => {
    if (!lead) return;
    const link = `${getAppDomain()}/portal-cliente?lead=${lead.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to determine active/completed state of each tracking step
  const getStepStatus = (stepIndex: number) => {
    if (!lead) return "pending";

    // Determine current stage/step (1 to 8)
    let currentEtapa = lead.etapa;
    if (currentEtapa === undefined || currentEtapa === null) {
      const status = (lead.status || "novo").toLowerCase();
      if (status === "concluido" || status === "concluído") {
        currentEtapa = 7; // Crédito Aprovado
      } else if (status === "reprovado" || status === "recusado") {
        currentEtapa = 8; // Crédito Recusado
      } else if (status === "em atendimento" || status === "atendimento") {
        currentEtapa = 5; // Recolhimento de dados (Senha Gov.br / Serasa)
      } else {
        currentEtapa = 1; // Dados cadastrais CNPJ recebido
      }
    }

    // 1. If lead is in terminal stage 7 (Crédito Aprovado) or 8 (Crédito Recusado)
    if (currentEtapa === 7 || currentEtapa === 8) {
      if (stepIndex <= 7) {
        return "completed";
      }
      if (stepIndex === 8) {
        return currentEtapa === 7 ? "completed" : "attention";
      }
    }

    // 2. Standard flow for stages 1 to 6
    if (stepIndex < currentEtapa) {
      return "completed";
    }
    if (stepIndex === currentEtapa) {
      return "active";
    }
    return "pending";
  };

  const faqs = [
    {
      q: "Como a PROSFEC estrutura uma empresa para deixá-la apta ao crédito?",
      a: "A PROSFEC atua como uma mesa de inteligência e inteligência de crédito dedicada. Analisamos detalhadamente a saúde financeira do CNPJ e dos sócios, identificamos gargalos operacionais e reestruturamos a apresentação do perfil da sua empresa. Dessa forma, apresentamos seu negócio aos bancos parceiros com máxima atratividade e altíssima taxa de aprovação."
    },
    {
      q: "Empresas com restrições ou score baixo podem passar pela estruturação?",
      a: "Com certeza! A essência da estruturação PROSFEC é justamente pegar empresas com travas de crédito, pendências fiscais ou ratings desfavoráveis e reorganizar suas métricas. Através das nossas soluções de saneamento e adequação de perfil, preparamos o CNPJ para que os algoritmos de crédito das instituições aprovem limites expressivos."
    },
    {
      q: "Qual é a importância da autorização do Portal GOV.br e e-CAC no processo?",
      a: "A autorização do e-CAC é o comprovante oficial e incontestável do faturamento real da sua empresa registrado na Receita Federal. Ela permite que a PROSFEC comprove seu verdadeiro potencial financeiro junto às instituições financeiras, eliminando burocracias e garantindo acesso direto às melhores linhas de crédito empresarial do mercado."
    },
    {
      q: "Por que fazer a estruturação com a PROSFEC em vez de ir direto ao banco?",
      a: "Solicitar crédito diretamente no banco sem o perfil devidamente ajustado gera frequentemente recusas automáticas, queda no score e perda de tempo. A PROSFEC elimina pontos fracos do seu perfil antes da submissão aos bancos, direcionando seu processo diretamente aos tomadores de decisão com condições muito mais vantajosas."
    },
    {
      q: "Qual é o prazo médio do processo de estruturação e liberação dos recursos?",
      a: "Todo o processo é 100% digital e otimizado. Após o envio das informações e alinhamento da estratégia de estruturação, a análise e a liberação das propostas de crédito ocorrem em média entre 5 e 15 dias úteis, com acompanhamento transparente em tempo real por esta plataforma."
    }
  ];

  return (
    <div className={embedded ? "w-full text-slate-800 font-sans selection:bg-[#00A86B]/20" : "min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-[#00A86B]/20 select-none"}>
      {/* Top Header */}
      {!embedded && (
        <header className="bg-[#0A3D2E] text-white sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button 
              onClick={onBackToHome}
              className="flex items-center gap-2 text-sm text-slate-200 hover:text-white transition-all font-semibold focus:outline-hidden"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Portal PROSFEC</span>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#00A86B]/25 text-[#40E0A0] border border-[#00A86B]/40 font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" />
                Seguro &amp; Criptografado
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Main Body */}
      <main className={embedded ? "w-full py-2" : `flex-1 ${lead ? "max-w-[1600px]" : "max-w-4xl"} mx-auto w-full px-4 py-8 md:py-10`}>
        
        {/* Search Header or Password Challenge if no lead authenticated */}
        {!lead ? (
          <div className="max-w-xl mx-auto text-center py-8 md:py-16">
            {!candidateLead ? (
              // Stage 1: Identification (CNPJ or ID)
              <div>
                <div className="inline-flex p-3.5 bg-[#0A3D2E]/5 rounded-3xl mb-6 text-[#0A3D2E]">
                  <Search className="w-10 h-10" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-[#0A3D2E] tracking-tight font-display mb-3">
                  Acompanhe sua Solicitação
                </h1>
                <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto">
                  Insira o ID da sua simulação ou o CNPJ da sua empresa para acessar o portal com sigilo e segurança.
                </p>

                <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-2xl shadow-xl border border-slate-200/60 flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                    <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="ID da Simulação ou CNPJ..." 
                      value={searchIdOrCnpj}
                      onChange={(e) => setSearchIdOrCnpj(e.target.value)}
                      className="bg-transparent border-0 w-full focus:ring-0 focus:outline-hidden text-slate-800 text-sm font-semibold placeholder:text-slate-400"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-sm py-3.5 px-6 rounded-xl shrink-0 transition-all active:scale-97 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Acessar Portal</span>
                      </>
                    )}
                  </button>
                </form>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Quick Helper */}
                <div className="mt-12 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-left">
                  <span className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider font-mono">Dica de segurança</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    As informações mostradas aqui são sigilosas e em conformidade com a LGPD. Se você esqueceu seu ID, fale com o consultor PROSFEC que iniciou seu atendimento ou verifique suas mensagens no WhatsApp.
                  </p>
                </div>
              </div>
            ) : candidateTemSenha ? (
              // Stage 2A: Password Login (Password already exists)
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 text-left space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider font-mono block">
                        Área de Segurança do Cliente
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                        {candidateLead.razaoSocial || candidateLead.nome}
                      </h2>
                      <span className="text-xs text-slate-400 font-mono">
                        CNPJ: {candidateLead.cnpj || "N/A"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateLead(null);
                      setEnteredPassword("");
                      setAuthError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Trocar CNPJ
                  </button>
                </div>

                {candidateLead.solicitacaoResetSenha?.pendente && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Existe uma solicitação de redefinição de senha em processamento pelo consultor. Caso já tenha recebido a nova senha via WhatsApp, digite-a abaixo.
                    </span>
                  </div>
                )}

                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Digite sua Senha de Acesso ao Portal
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={enteredPassword}
                        onChange={(e) => setEnteredPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoFocus
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-mono font-bold text-slate-900 outline-none transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Entrar no Portal</span>
                  </button>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setResetRequestedSuccess(false);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                    >
                      Esqueceu sua senha?
                    </button>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Acesso Criptografado
                    </span>
                  </div>
                </form>
              </motion.div>
            ) : (
              // Stage 2B: First Access Setup (No password configured yet)
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 text-left space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider font-mono block">
                        Primeiro Acesso ao Portal
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                        {candidateLead.razaoSocial || candidateLead.nome}
                      </h2>
                      <span className="text-xs text-slate-400 font-mono">
                        CNPJ: {candidateLead.cnpj || "N/A"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateLead(null);
                      setNewPassword1("");
                      setNewPassword2("");
                      setAuthError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Trocar CNPJ
                  </button>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs rounded-2xl leading-relaxed">
                  👋 <strong>Bem-vindo ao Portal PROSFEC!</strong> Como este é o seu primeiro acesso, crie uma senha segura para proteger as informações financeiras e contratuais da sua empresa.
                </div>

                <form onSubmit={handleFirstAccessSetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Crie sua Nova Senha de Acesso
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword1}
                        onChange={(e) => setNewPassword1(e.target.value)}
                        placeholder="Mínimo 4 caracteres (ex: Prosfec@2026)"
                        autoFocus
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-900 outline-none transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirme a Nova Senha
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword2}
                      onChange={(e) => setNewPassword2(e.target.value)}
                      placeholder="Repita a mesma senha..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>

                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isSettingPassword}
                    className="w-full py-3.5 bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSettingPassword ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Cadastrar Senha &amp; Entrar</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Modal: Forgot Password / Redefinição de Senha */}
            <AnimatePresence>
              {showForgotModal && candidateLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-left">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-extrabold text-sm text-slate-900 font-display flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-600" />
                        Redefinição de Senha
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {resetRequestedSuccess ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2 text-xs">
                        <p className="font-extrabold flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Solicitação Registrada com Sucesso!
                        </p>
                        <p className="leading-relaxed text-emerald-900/90">
                          A central PROSFEC e seu consultor especialista foram notificados. Em instantes uma nova senha provisória será gerada e encaminhada ao seu WhatsApp cadastrado.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs text-slate-600">
                        <p className="leading-relaxed">
                          Por motivos de segurança e conformidade bancária, o reset de senha é processado pela central com envio direto de nova credencial ao seu consultor e WhatsApp.
                        </p>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 font-mono text-[11px]">
                          <div>Empresa: <strong>{candidateLead.razaoSocial || candidateLead.nome}</strong></div>
                          <div>CNPJ: <strong>{candidateLead.cnpj || "N/A"}</strong></div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowForgotModal(false)}
                            className="px-3.5 py-2 text-slate-500 hover:text-slate-800 font-bold rounded-xl cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleRequestPasswordReset}
                            disabled={isRequestingReset}
                            className="px-4 py-2 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isRequestingReset ? (
                              <span>Enviando...</span>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Solicitar Redefinição</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top Back & Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 text-white p-6 rounded-2xl border border-emerald-900/50 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-md inline-block uppercase tracking-wider font-mono mb-2">
                  Portal do Cliente PROSFEC IA
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight font-display">
                  {lead.razaoSocial || lead.nome}
                </h1>
                <p className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2">
                  <span>CNPJ: {lead.cnpj || "Não cadastrado"}</span>
                  <span>•</span>
                  <span className="text-emerald-400">ID: {lead.id}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 relative z-10">
                <button 
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-[#0A3D2E]/10 text-slate-700 hover:text-[#0A3D2E] text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-97 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    setLead(null);
                    setCandidateLead(null);
                    setEnteredPassword("");
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sair do Portal</span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Tabs (Shown on screens < lg) */}
            <div className="flex lg:hidden items-center p-1.5 bg-slate-200/80 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setMobilePortalTab("esteira")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobilePortalTab === "esteira"
                    ? "bg-[#0A3D2E] text-white shadow-sm"
                    : "text-slate-700 hover:bg-white/60"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Acompanhamento da Esteira</span>
              </button>

              <button
                type="button"
                onClick={() => setMobilePortalTab("ficha")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobilePortalTab === "ficha"
                    ? "bg-[#0A3D2E] text-white shadow-sm"
                    : "text-slate-700 hover:bg-white/60"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ficha de Rating</span>
                {Boolean(
                  lead.pagamentoConfirmado || 
                  lead.pagamentoServicosConfirmado || 
                  lead.liberarFichaRating || 
                  lead.servicosRecomendados?.some((s: any) => s.pago || s.statusPagamento === 'pago' || s.status === 'pago') || 
                  lead.subEtapasPasso6?.some((s: any) => s.pago || s.statusPagamento === 'pago') || 
                  (lead.etapa && lead.etapa >= 6)
                ) ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                ) : (
                  <Lock className="w-3 h-3 text-amber-500" />
                )}
              </button>
            </div>

            {/* Split Layout: Left Column (Ficha Rating) & Right Column (Esteira de Crédito) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Ficha de Cadastro de Rating Comercial */}
              <div className={`lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 space-y-6 ${mobilePortalTab === "ficha" ? "block" : "hidden lg:block"}`}>
                <FichaRatingCreditoForm
                  lead={lead}
                  isUnlocked={Boolean(
                    lead.pagamentoConfirmado || 
                    lead.pagamentoServicosConfirmado || 
                    lead.liberarFichaRating || 
                    lead.servicosRecomendados?.some((s: any) => s.pago || s.statusPagamento === 'pago' || s.status === 'pago') || 
                    lead.subEtapasPasso6?.some((s: any) => s.pago || s.statusPagamento === 'pago') || 
                    (lead.etapa && lead.etapa >= 6)
                  )}
                  onUpdateLead={(updated) => setLead(updated)}
                  partnerWhatsapp={partnerWhatsapp || (lead as any).parceiroWhatsapp}
                />
              </div>

              {/* Right Column: Esteira & Demais Funcionalidades */}
              <div className={`lg:col-span-7 xl:col-span-7 space-y-8 min-w-0 ${mobilePortalTab === "esteira" ? "block" : "hidden lg:block"}`}>

            {/* Simulated Credit Box & Basic Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Box 1: Limite Estimado */}
              <div className="md:col-span-2 bg-gradient-to-br from-[#0A3D2E] to-[#0D5B44] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-4 translate-x-4">
                  <Sparkles className="w-48 h-48" />
                </div>
                <div>
                  <span className="text-xs text-emerald-300 font-bold tracking-wider uppercase flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    Limite de Fomento Recomendado ({lead.propostaNegociada?.creditLineCode || lead.creditLineCode || "PRONAMPE"})
                  </span>
                  <div className="text-3xl md:text-4xl font-black mt-2 font-display">
                    {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Sob Consulta"}
                  </div>
                </div>
                <p className="text-xs text-emerald-100/80 leading-relaxed mt-4 max-w-md">
                  Este limite é pré-calculado com base nas variáveis fiscais de faturamento enviadas. Nossos consultores atuam junto aos bancos homologados para buscar a liberação integral.
                </p>
              </div>

              {/* Box 2: Diagnóstico Simples */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider font-mono">
                    Nível de Preparação
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-sm px-3 py-1 font-black rounded-full uppercase ${
                      lead.nivelPreparacao === "alto" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : lead.nivelPreparacao === "medio" 
                        ? "bg-amber-100 text-amber-800" 
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {lead.nivelPreparacao || "médio"}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-slate-50 pt-3">
                  <span className="text-xs text-slate-500 block">Cidade / Estado</span>
                  <span className="text-sm font-bold text-slate-800 block mt-0.5">{lead.cidade || "Não Informado"}</span>
                </div>
              </div>
            </div>

            {/* FINTECH INTERACTIVE SIMULATION DETAIL SECTION */}
            {(() => {
              const rule = GOVERNMENT_CREDIT_LINES[clientLineCode] || GOVERNMENT_CREDIT_LINES.PRONAMPE;

              const simSchedule = calculateClientSchedule(
                clientValor,
                clientCarencia,
                clientAmortizacao,
                clientSistema,
                clientTaxaAnual,
                clientPagarJurosCarencia
              );

              const validation = validateCreditLineConditions(
                clientLineCode,
                clientValor,
                clientCarencia,
                clientAmortizacao,
                clientTaxaAnual,
                clientSistema
              );

              return (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
                  {/* Header & Status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-base font-display font-extrabold text-[#0A3D2E] flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-[#00A86B]" />
                        Simulador Personalizado de Proposta
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ajuste o valor do crédito, prazo e carência abaixo. As estimativas de parcelas e custos são recalculadas em tempo real.
                      </p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono flex items-center gap-1.5 shrink-0">
                      <Sparkles className="w-3 h-3 text-[#00A86B] animate-pulse" />
                      Ajuste em Tempo Real
                    </span>
                  </div>

                  {/* Credit Line Info (Defined by IA / Partner evaluation) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Linha de Crédito Enquadrada
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#0A3D2E] font-display">
                          {rule.code} - {rule.name}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md font-mono">
                          {rule.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        {rule.description}
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold px-3 py-2 rounded-xl flex items-center gap-2 shrink-0">
                      <Brain className="w-4 h-4 text-[#00A86B] shrink-0" />
                      <span>Avaliado automaticamente de acordo com o perfil do CNPJ</span>
                    </div>
                  </div>

                  {/* Sliders Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    {/* Slider 1: Valor do Crédito */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Valor Solicitado
                        </label>
                        <span className="text-base font-black text-[#0A3D2E] font-display">
                          {formatCurrencyBRL(clientValor)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={rule.minValor}
                        max={rule.maxValor}
                        step={10000}
                        value={clientValor}
                        onChange={(e) => setClientValor(Number(e.target.value))}
                        className="w-full accent-[#00A86B] cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>{formatCurrencyBRL(rule.minValor)}</span>
                        <span>{formatCurrencyBRL(rule.maxValor)}</span>
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[50000, 100000, 250000, 500000].map((preset) => (
                          preset >= rule.minValor && preset <= rule.maxValor && (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setClientValor(preset)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all ${
                                clientValor === preset
                                  ? "bg-[#0A3D2E] text-white"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                              }`}
                            >
                              {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                            </button>
                          )
                        ))}
                      </div>
                    </div>

                    {/* Slider 2: Prazo de Amortização */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Prazo Amortização
                        </label>
                        <span className="text-base font-black text-slate-800 font-display">
                          {clientAmortizacao} meses
                        </span>
                      </div>
                      <input
                        type="range"
                        min={rule.minPrazoAmortizacao}
                        max={rule.maxPrazoAmortizacao}
                        step={6}
                        value={clientAmortizacao}
                        onChange={(e) => setClientAmortizacao(Number(e.target.value))}
                        className="w-full accent-[#00A86B] cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>{rule.minPrazoAmortizacao}m</span>
                        <span>{rule.maxPrazoAmortizacao}m</span>
                      </div>
                      {/* Month pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[12, 24, 36, 48, 60, 72].map((m) => (
                          m >= rule.minPrazoAmortizacao && m <= rule.maxPrazoAmortizacao && (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setClientAmortizacao(m)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all ${
                                clientAmortizacao === m
                                  ? "bg-[#0A3D2E] text-white"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                              }`}
                            >
                              {m} mes
                            </button>
                          )
                        ))}
                      </div>
                    </div>

                    {/* Slider 3: Período de Carência */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Período de Carência
                        </label>
                        <span className="text-base font-black text-amber-700 font-display">
                          {clientCarencia} meses
                        </span>
                      </div>
                      <input
                        type="range"
                        min={rule.minCarencia}
                        max={rule.maxCarencia}
                        step={3}
                        value={clientCarencia}
                        onChange={(e) => setClientCarencia(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>{rule.minCarencia}m</span>
                        <span>{rule.maxCarencia}m</span>
                      </div>
                      {/* Month pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[0, 6, 12, 18, 24].map((c) => (
                          c >= rule.minCarencia && c <= rule.maxCarencia && (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setClientCarencia(c)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all ${
                                clientCarencia === c
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                              }`}
                            >
                              {c === 0 ? "Sem carência" : `${c}m carência`}
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Amortization system & Options row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-mono">
                        Sistema:
                      </span>
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => setClientSistema("SAC")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            clientSistema === "SAC" ? "bg-white text-[#0A3D2E] shadow-xs" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Tabela SAC (Decrescente)
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientSistema("PRICE")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            clientSistema === "PRICE" ? "bg-white text-[#0A3D2E] shadow-xs" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Tabela PRICE (Fixas)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setClientPagarJurosCarencia(!clientPagarJurosCarencia)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          clientPagarJurosCarencia
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {clientPagarJurosCarencia ? "✓ Pagar Juros Mensais na Carência" : "Acumular Juros na Carência"}
                      </button>
                    </div>
                  </div>

                  {/* Calculated Bento Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Parcela Inicial</span>
                      <span className="text-lg font-black text-[#0A3D2E] block mt-1">
                        {formatCurrencyBRL(simSchedule.parcelaInicial)}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Após a carência de {clientCarencia}m</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Parcela Final Estimada</span>
                      <span className="text-lg font-black text-slate-800 block mt-1">
                        {formatCurrencyBRL(simSchedule.parcelaFinal)}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Com amortização gradativa</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Prazo Total do Contrato</span>
                      <span className="text-lg font-black text-slate-800 block mt-1">
                        {clientCarencia + clientAmortizacao} meses
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">({clientCarencia}m carência + {clientAmortizacao}m pagto)</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Custo Total Simulado</span>
                      <span className="text-lg font-black text-slate-800 block mt-1">
                        {formatCurrencyBRL(simSchedule.totalPago)}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Total de Juros: {formatCurrencyBRL(simSchedule.totalJuros)}</span>
                    </div>
                  </div>

                  {/* Validation Alerts */}
                  {!validation.isValid ? (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>Ajuste necessário para enquadramento regulatório:</span>
                      </div>
                      {validation.errors.map((err, idx) => (
                        <p key={idx} className="text-[11px] text-rose-700 font-medium pl-6">• {err}</p>
                      ))}
                    </div>
                  ) : validation.warnings.length > 0 ? (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Observações para aprovação bancária:</span>
                      </div>
                      {validation.warnings.map((warn, idx) => (
                        <p key={idx} className="text-[11px] text-amber-700 font-medium pl-6">• {warn}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Parâmetros 100% enquadrados nas normas oficiais do {rule.code}.</span>
                    </div>
                  )}

                  {/* Save Simulation Action Box */}
                  <div className="bg-gradient-to-r from-[#0A3D2E] to-[#0D5B44] text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
                    <div className="space-y-1 text-center md:text-left">
                      <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider block font-mono">
                        Deseja fixar estes valores na sua proposta?
                      </span>
                      <p className="text-xs text-emerald-100/90 leading-relaxed max-w-xl">
                        Ao clicar em <strong>Gravar Simulação</strong>, o valor de {formatCurrencyBRL(clientValor)} em {clientCarencia + clientAmortizacao} meses será gravado na sua Ficha Comercial e enviado diretamente para o seu parceiro e mesa de fomento.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={handleSaveClientSimulation}
                        disabled={isSavingSimulation || !validation.isValid}
                        className="bg-[#00A86B] hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg transition-all active:scale-97 flex items-center gap-2 cursor-pointer"
                      >
                        {isSavingSimulation ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Gravando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Gravar Simulação</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Success Confirmation Toast */}
                  {saveSimulationSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-3 text-xs font-bold"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="block font-black text-sm text-emerald-950">Simulação Gravada com Sucesso!</span>
                        <span className="text-emerald-700 font-normal">A sua preferência de fomento foi atualizada na sua proposta oficial. Seu parceiro PROSFEC já tem visibilidade dessa simulação.</span>
                      </div>
                    </motion.div>
                  )}

                  {lead.propostaNegociada?.justificativa && (
                    <div className="bg-gradient-to-r from-emerald-500/5 to-[#00A86B]/5 p-4 rounded-xl border border-emerald-500/15 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#00A86B] animate-pulse" />
                        <span className="text-[10px] text-[#00A86B] font-black uppercase tracking-wider block">Parecer de Fomento da PROSFEC IA</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {lead.propostaNegociada.justificativa}
                      </p>
                      {lead.propostaNegociada.fonte && (
                        <span className="text-[9px] text-slate-400 font-bold uppercase block text-right">Fonte de Análise: {lead.propostaNegociada.fonte}</span>
                      )}
                    </div>
                  )}

                  {/* Flow chart collapsible details */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0A3D2E]/5 p-4 rounded-xl border border-[#0A3D2E]/10">
                      <div>
                        <span className="text-xs font-bold text-[#0A3D2E] block">📊 Cronograma Provisório de Fomento</span>
                        <p className="text-[10px] text-slate-600 mt-0.5">Explore o fluxo completo de amortização, mês a mês.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowScheduleTable(!showScheduleTable)}
                        className="text-xs font-bold text-[#00A86B] hover:text-[#0A3D2E] transition-all flex items-center gap-1 cursor-pointer bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"
                      >
                        <span>{showScheduleTable ? "Ocultar Planilha" : "Visualizar Planilha Completa"}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showScheduleTable ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {showScheduleTable && (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-[11px] bg-white">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                              <th className="p-2.5">Mês</th>
                              <th className="p-2.5">Tipo</th>
                              <th className="p-2.5 text-right">Saldo Inicial</th>
                              <th className="p-2.5 text-right">Amortização</th>
                              <th className="p-2.5 text-right">Juros Estimados</th>
                              <th className="p-2.5 text-right">Valor da Parcela</th>
                              <th className="p-2.5 text-right">Saldo Final</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-600 font-mono">
                            {simSchedule.rows.map((row) => (
                              <tr key={row.mes} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2.5 font-bold text-slate-900">Mês {row.mes}</td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    row.tipo === "Carência" 
                                      ? "bg-amber-100 text-amber-800" 
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {row.tipo}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right">{formatCurrencyBRL(row.saldoInicial)}</td>
                                <td className="p-2.5 text-right">{formatCurrencyBRL(row.amortizacao)}</td>
                                <td className="p-2.5 text-right text-rose-600">+{formatCurrencyBRL(row.juros)}</td>
                                <td className="p-2.5 text-right font-bold text-[#0A3D2E] bg-slate-50/20">{formatCurrencyBRL(row.parcela)}</td>
                                <td className="p-2.5 text-right">{formatCurrencyBRL(row.saldoFinal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stepper (Linha do Tempo de Acompanhamento) */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-lg font-black text-slate-900 mb-6 font-display flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#00A86B]" />
                Etapas de Liberação do seu Crédito
              </h3>

              <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-8">
                {[
                  {
                    number: 1,
                    title: "Dados cadastrais CNPJ",
                    description: "Os dados cadastrais e o CNPJ da sua empresa foram recebidos com sucesso pela nossa mesa de análise.",
                  },
                  {
                    number: 2,
                    title: "Coleta de dados dos Sócios",
                    description: "Coleta e verificação das informações básicas dos sócios para qualificação cadastral na operação.",
                  },
                  {
                    number: 3,
                    title: "Consulta Diagnóstica CPF e CNPJ",
                    description: "Realização do diagnóstico completo de compliance, regularidade fiscal e restrições nos principais órgãos.",
                  },
                  {
                    number: 4,
                    title: "Assinatura Eletrônica de Termos e Contratos",
                    description: "Assinatura digital do contrato de prestação de serviços e termo de honorários de forma 100% digital e segura.",
                  },
                  {
                    number: 5,
                    title: "Recolhimento de Senha GOV e Serasa",
                    description: "Compartilhamento seguro dos dados fiscais para apuração oficial do faturamento e limite disponível no Pronampe.",
                  },
                  {
                    number: 6,
                    title: "Estruturação da Operação (Aplicação de melhoria de perfil de crédito)",
                    description: "Nossa assessoria atua otimizando o rating de crédito da empresa e estruturando a defesa para aprovação bancária.",
                  },
                  {
                    number: 7,
                    title: "Operação Apta para Solicitação Bancária",
                    description: "Dossiê completo e solicitação formal de crédito encaminhados aos nossos agentes de crédito parceiros.",
                  },
                  {
                    number: 8,
                    title: "Crédito Aprovado / Crédito Recusado",
                    description: "Análise concluída pelos agentes financeiros parceiros com o resultado final da liberação do seu crédito.",
                  }
                ].map((step) => {
                  const status = getStepStatus(step.number);
                  
                  let circleBg = "bg-slate-100 text-slate-300";
                  let icon = <Clock className="w-4 h-4" />;
                  let badgeText = "Pendente";
                  let badgeBg = "bg-slate-100 text-slate-500";

                  if (status === "completed") {
                    circleBg = "bg-emerald-100 text-emerald-600";
                    icon = <CheckCircle2 className="w-5 h-5" />;
                    badgeText = "Concluído";
                    badgeBg = "bg-emerald-100 text-emerald-800";
                  } else if (status === "active") {
                    circleBg = "bg-[#0A3D2E] text-white animate-pulse";
                    icon = <Clock className="w-4 h-4" />;
                    badgeText = "Em Andamento";
                    badgeBg = "bg-emerald-500 text-white";
                  } else if (status === "attention") {
                    circleBg = "bg-rose-100 text-rose-600";
                    icon = <AlertTriangle className="w-5 h-5" />;
                    badgeText = step.number === 8 ? "Recusado" : "Atenção";
                    badgeBg = "bg-rose-100 text-rose-800";
                  }

                  // Customize Step 8 details based on outcome
                  let displayTitle = step.title;
                  let displayDescription = step.description;

                  if (step.number === 8) {
                    if (status === "completed") {
                      displayTitle = "Crédito Aprovado";
                      displayDescription = "Parabéns! O crédito foi aprovado pelo agente financeiro e está pronto para contratação.";
                      badgeText = "Aprovado";
                      badgeBg = "bg-emerald-100 text-emerald-800";
                      circleBg = "bg-emerald-100 text-emerald-600";
                      icon = <CheckCircle2 className="w-5 h-5" />;
                    } else if (status === "attention") {
                      displayTitle = "Crédito Recusado";
                      displayDescription = "Identificamos inconsistências ou restrições graves que impediram a liberação nesta rodada.";
                      badgeText = "Recusado";
                      badgeBg = "bg-rose-100 text-rose-800";
                      circleBg = "bg-rose-100 text-rose-600";
                      icon = <AlertTriangle className="w-5 h-5" />;
                    }
                  }

                  return (
                    <div key={step.number} className="relative">
                      {/* Circle Indicator */}
                      <div className={`absolute -left-[35px] top-0.5 rounded-full p-1 border-4 border-white flex items-center justify-center ${circleBg}`}>
                        {icon}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-950 text-sm">Passo {step.number}: {displayTitle}</h4>
                          <span className={`${badgeBg} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase`}>
                            {badgeText}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {displayDescription}
                        </p>

                        {/* Inline Form for Step 2 */}
                        {step.number === 2 && status === "active" && (
                          <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-100 p-4 md:p-6 space-y-4 text-left">
                            <div className="border-b border-slate-200 pb-3">
                              <h5 className="font-display font-bold text-sm text-[#0A3D2E] flex items-center gap-1.5">
                                📋 Preencha a Ficha Cadastral dos Sócios
                              </h5>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Envie os dados para nossa mesa de análise liberar a consulta diagnóstica de compliance.
                              </p>
                            </div>

                            <form onSubmit={handleSociosSubmit} className="space-y-4">
                              {sociosError && (
                                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                                  <span>{sociosError}</span>
                                </div>
                              )}

                              {/* Sócio 1 */}
                              <div className="space-y-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                                  👤 Sócio 1 (Principal)
                                </span>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="sm:col-span-1">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      Nome Completo *
                                    </label>
                                    <input
                                      type="text"
                                      value={socio1.nome}
                                      onChange={(e) => setSocio1({ ...socio1, nome: e.target.value })}
                                      placeholder="Nome completo do sócio..."
                                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none focus:border-[#00A86B]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      CPF *
                                    </label>
                                    <input
                                      type="text"
                                      value={socio1.cpf}
                                      onChange={(e) => setSocio1({ ...socio1, cpf: formatCPF(e.target.value) })}
                                      placeholder="000.000.000-00"
                                      maxLength={14}
                                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none font-mono focus:border-[#00A86B]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      Data Nascimento *
                                    </label>
                                    <input
                                      type="date"
                                      value={socio1.dataNascimento}
                                      onChange={(e) => setSocio1({ ...socio1, dataNascimento: e.target.value })}
                                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none focus:border-[#00A86B] cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Sócio 2 Checkbox */}
                              <div className="pt-3 border-t border-slate-200 space-y-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="hasSocio2Portal"
                                    checked={hasSocio2}
                                    onChange={(e) => setHasSocio2(e.target.checked)}
                                    className="w-4 h-4 accent-[#00A86B] rounded cursor-pointer"
                                  />
                                  <label htmlFor="hasSocio2Portal" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                                    Adicionar Sócio 2
                                  </label>
                                </div>

                                {hasSocio2 && (
                                  <div className="border border-dashed border-slate-200 p-3 rounded-xl bg-white space-y-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                                      👤 Sócio 2
                                    </span>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                          Nome Completo *
                                        </label>
                                        <input
                                          type="text"
                                          value={socio2.nome}
                                          onChange={(e) => setSocio2({ ...socio2, nome: e.target.value })}
                                          placeholder="Nome..."
                                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                          CPF *
                                        </label>
                                        <input
                                          type="text"
                                          value={socio2.cpf}
                                          onChange={(e) => setSocio2({ ...socio2, cpf: formatCPF(e.target.value) })}
                                          placeholder="000.000.000-00"
                                          maxLength={14}
                                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none font-mono"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                          Data Nascimento *
                                        </label>
                                        <input
                                          type="date"
                                          value={socio2.dataNascimento}
                                          onChange={(e) => setSocio2({ ...socio2, dataNascimento: e.target.value })}
                                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end">
                                <button
                                  type="submit"
                                  disabled={submittingSocios}
                                  className="bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-xs py-3 px-5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                                >
                                  {submittingSocios ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                      <span>Enviando ficha...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Enviar Ficha Cadastral dos Sócios</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Resultado e Diagnóstico da Consulta de Crédito PROSFEC IA for Step 3 */}
                        {step.number === 3 && (status === "active" || status === "completed") && (
                          <div className="mt-4">
                            <DiagnosticStep3Viewer lead={lead as any} />
                          </div>
                        )}

                        {/* Termos de Assinatura for Step 4 */}
                        {step.number === 4 && (status === "active" || status === "completed") && (
                          <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-100 p-4 md:p-6 space-y-4 text-left">
                            <div className="border-b border-slate-200 pb-3">
                              <h5 className="font-display font-bold text-sm text-[#0A3D2E] flex items-center gap-1.5">
                                ✍️ Assinatura Eletrônica de Termos e Contrato
                              </h5>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Visualize, leia e assine os termos de consultoria e remuneração de forma 100% digital e segura.
                              </p>
                            </div>

                            {(lead as any).contratoAssinado ? (
                              <div className="bg-emerald-50 border border-emerald-200 p-4 md:p-5 rounded-xl space-y-3">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Contratos Assinados Digitalmente com Sucesso!</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 font-medium">
                                  <div className="space-y-1">
                                    <p><strong className="text-slate-900">Signatário:</strong> {(lead as any).contratoAssinadoNome}</p>
                                    <p><strong className="text-slate-900">CPF:</strong> {(lead as any).contratoAssinadoCpf}</p>
                                    <p><strong className="text-slate-900">IP de Origem:</strong> {(lead as any).contratoAssinadoIp}</p>
                                    <p><strong className="text-slate-900">Data/Hora:</strong> {(lead as any).contratoAssinadoData}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assinatura Digital recolhida:</p>
                                    <div className="border border-slate-200 rounded-lg bg-white p-2 h-16 w-44 flex items-center justify-center">
                                      <img src={(lead as any).contratoAssinadoDesenho} alt="Assinatura" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                                    </div>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-400 leading-normal border-t border-emerald-100 pt-2 font-mono">
                                  Dispositivo: {(lead as any).contratoAssinadoDispositivo}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Document Tabs (Dinâmicas com base nos serviços contratados/diagnosticados) */}
                                {(() => {
                                  const applicableTabs = getApplicableContracts(lead);
                                  return (
                                    <>
                                      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-1">
                                        {applicableTabs.map((tab, index) => (
                                          <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`pb-2 px-2.5 text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                                              activeTab === tab.id
                                                ? "border-[#00A86B] text-[#0A3D2E]"
                                                : "border-transparent text-slate-400 hover:text-slate-600"
                                            }`}
                                          >
                                            {index + 1}. {tab.label}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Scrollable Document Text */}
                                      <div className="h-52 overflow-y-auto border border-slate-200 rounded-xl p-4 text-[11px] font-mono bg-slate-50 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {activeTab === "contrato" 
                                          ? getContractText() 
                                          : activeTab === "termo" 
                                          ? getTermoText() 
                                          : activeTab === "rating_score"
                                          ? getContractRatingScoreText()
                                          : activeTab === "bacen"
                                          ? getContractBacenText()
                                          : getContractRtbText()}
                                      </div>
                                    </>
                                  );
                                })()}

                                <form onSubmit={handleSignatureSubmit} className="space-y-4 pt-2">
                                  {signatureError && (
                                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                                      <span>{signatureError}</span>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Nome do Signatário *
                                      </label>
                                      <input
                                        type="text"
                                        value={signName}
                                        onChange={(e) => setSignName(e.target.value)}
                                        placeholder="Nome completo..."
                                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none focus:border-[#00A86B]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        CPF do Signatário *
                                      </label>
                                      <input
                                        type="text"
                                        value={signCpf}
                                        onChange={(e) => setSignCpf(formatCPF(e.target.value))}
                                        placeholder="000.000.000-00"
                                        maxLength={14}
                                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium transition-all outline-none font-mono focus:border-[#00A86B]"
                                      />
                                    </div>
                                  </div>

                                  {/* Signature Drawing Pad */}
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Desenhe sua assinatura na tela *
                                    </label>
                                    <SignaturePad 
                                      onSave={(dataUrl) => setSignatureDataUrl(dataUrl)} 
                                      onClear={() => setSignatureDataUrl("")}
                                    />
                                  </div>

                                  {/* Metadata Badge for IP and Device */}
                                  <div className="bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                                    <span className="flex items-center gap-1">
                                      🌐 IP Capturado: <strong>{clientIp || "Carregando..."}</strong>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      📱 Dispositivo validado para assinatura eletrônica
                                    </span>
                                  </div>

                                  {/* Accept Checkbox */}
                                  <div className="flex items-start gap-2 pt-2">
                                    <input
                                      type="checkbox"
                                      id="acceptTermsCheckbox"
                                      checked={acceptTerms}
                                      onChange={(e) => setAcceptTerms(e.target.checked)}
                                      className="w-4 h-4 accent-[#00A86B] rounded cursor-pointer mt-0.5"
                                    />
                                    <label htmlFor="acceptTermsCheckbox" className="text-[11px] text-slate-600 font-semibold cursor-pointer select-none leading-normal">
                                      Declaro que li, compreendi e concordo integralmente com todas as cláusulas do <span className="text-slate-900 font-bold">Contrato de Prestação de Serviços</span> e do <span className="text-slate-900 font-bold">Termo de Honorários</span> descritos acima, autorizando a coleta da minha assinatura digital e IP.
                                    </label>
                                  </div>

                                  {/* Submit button */}
                                  <div className="flex justify-end pt-2">
                                    <button
                                      type="submit"
                                      disabled={isSubmittingSignature}
                                      className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold text-xs py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                                    >
                                      {isSubmittingSignature ? (
                                        <>
                                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                          <span>Salvando Assinatura...</span>
                                        </>
                                      ) : (
                                        <>
                                          <ShieldCheck className="w-4 h-4" />
                                          <span>Assinar Contratos Eletronicamente</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        )}

                        {step.number === 4 && status === "pending" && (
                          <div className="mt-4 bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-center text-slate-500 text-xs font-semibold">
                            🔒 Os contratos e termos de adesão estarão disponíveis para assinatura eletrônica assim que o lead chegar nesta etapa.
                          </div>
                        )}

                        {/* Step 5: Recolhimento de Senha GOV e Serasa */}
                        {step.number === 5 && (status === "active" || status === "completed") && (
                          <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-200 p-4 md:p-6 space-y-4 text-left shadow-xs">
                            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h5 className="font-display font-bold text-sm text-[#0A3D2E] flex items-center gap-1.5">
                                  🔐 Recolhimento Seguro de Acesso GOV.br e Serasa
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Compartilhamento de acesso oficial para apuração de faturamento no e-CAC e emissão da Carta Pronampe.
                                </p>
                              </div>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Criptografia de Ponta a Ponta
                              </span>
                            </div>

                            {lead.govbrSenha || status === "completed" ? (
                              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Dados de Acesso GOV.br e Serasa Recebidos e Homologados!</span>
                                </div>
                                <p className="text-xs text-emerald-800 leading-relaxed">
                                  Sua senha e chave de acesso foram enviadas em ambiente seguro com criptografia de ponta a ponta. Nossa mesa técnica está realizando a extração da DTE/e-CAC para validação da sua Carta de Faturamento Pronampe.
                                </p>
                                <div className="text-[10px] font-mono text-emerald-700 pt-1 border-t border-emerald-200/60 flex flex-wrap justify-between gap-2">
                                  <span>Login GOV.br: {lead.govbrLogin || lead.cnpj}</span>
                                  <span>Status: Validado e em processamento</span>
                                </div>
                              </div>
                            ) : (
                              <form onSubmit={handleGovSubmit} className="space-y-4">
                                {govError && (
                                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{govError}</span>
                                  </div>
                                )}

                                {govSuccess && (
                                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Acessos gravados com sucesso! Avançando proposta...</span>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* GOV.br Card */}
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                                      <Lock className="w-3.5 h-3.5 text-[#00A86B]" />
                                      Portal GOV.br (e-CAC)
                                    </span>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        CPF ou CNPJ de Acesso *
                                      </label>
                                      <input
                                        type="text"
                                        value={govbrLogin}
                                        onChange={(e) => setGovbrLogin(e.target.value)}
                                        placeholder="000.000.000-00"
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium font-mono outline-none focus:border-[#00A86B]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Senha GOV.br *
                                      </label>
                                      <div className="relative">
                                        <input
                                          type={showGovPassword ? "text" : "password"}
                                          value={govbrSenha}
                                          onChange={(e) => setGovbrSenha(e.target.value)}
                                          placeholder="Sua senha GOV.br..."
                                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium font-mono outline-none focus:border-[#00A86B] pr-10"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setShowGovPassword(!showGovPassword)}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                        >
                                          {showGovPassword ? "Ocultar" : "Mostrar"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Serasa Card */}
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                      Portal Serasa Experian (Opcional)
                                    </span>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        CPF / Login Serasa
                                      </label>
                                      <input
                                        type="text"
                                        value={serasaLogin}
                                        onChange={(e) => setSerasaLogin(e.target.value)}
                                        placeholder="CPF cadastrado no Serasa..."
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium font-mono outline-none focus:border-[#00A86B]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Senha Serasa
                                      </label>
                                      <div className="relative">
                                        <input
                                          type={showSerasaPassword ? "text" : "password"}
                                          value={serasaSenha}
                                          onChange={(e) => setSerasaSenha(e.target.value)}
                                          placeholder="Sua senha do Serasa..."
                                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium font-mono outline-none focus:border-[#00A86B] pr-10"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setShowSerasaPassword(!showSerasaPassword)}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                        >
                                          {showSerasaPassword ? "Ocultar" : "Mostrar"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-slate-100 p-3 rounded-xl text-[10px] text-slate-500 flex items-center gap-2">
                                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>
                                    Seus acessos são protegidos sob sigilo bancário da Lei Complementar nº 105/2001 e LGPD, sendo utilizados estritamente para consulta e validação de faturamento.
                                  </span>
                                </div>

                                <div className="flex justify-end pt-1">
                                  <button
                                    type="submit"
                                    disabled={submittingGov}
                                    className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold text-xs py-3 px-6 rounded-xl transition-all active:scale-97 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md w-full sm:w-auto"
                                  >
                                    {submittingGov ? (
                                      <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Enviando Acessos...</span>
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>Enviar Acessos com Segurança</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}

                        {step.number === 5 && status === "pending" && (
                          <div className="mt-4 bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-center text-slate-500 text-xs font-semibold">
                            🔒 O formulário de envio de senhas GOV.br e Serasa estará disponível assim que as etapas anteriores forem concluídas.
                          </div>
                        )}

                        {/* Sub-etapas do Passo 6: Melhoria do Perfil de Crédito (Visível apenas após a Etapa 5 ser concluída) */}
                        {step.number === 6 && getStepStatus(5) === "completed" && (
                          <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-200/80 p-4 md:p-6 space-y-4 text-left">
                            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h5 className="font-display font-bold text-sm text-[#0A3D2E] flex items-center gap-1.5">
                                  🛠️ Sub-etapas & Aplicação dos Serviços Recomendados
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Acompanhe a aplicação técnica dos serviços recomendados no diagnóstico executada pelos especialistas PROSFEC.
                                </p>
                              </div>

                              {(() => {
                                const rawServs = (lead as any).servicosRecomendados || ((lead as any).diagnosticoPROSFEC && (lead as any).diagnosticoPROSFEC.servicosRecomendados) || [];
                                const existingSub = (lead as any).subEtapasPasso6;

                                const subList = (Array.isArray(existingSub) && existingSub.length > 0)
                                  ? existingSub.map((sub: any, idx: number) => ({
                                      ...sub,
                                      id: sub.id || DEFAULT_STRUCTURING_SERVICES[idx]?.id || `sub_${idx}`,
                                      titulo: sub.titulo || sub.nome || DEFAULT_STRUCTURING_SERVICES[idx]?.nome,
                                      concluida: sub.concluida || sub.statusPagamento === "pago" || sub.pago === true,
                                      preco: typeof sub.preco === "number" && sub.preco > 0 ? sub.preco : (DEFAULT_STRUCTURING_SERVICES[idx]?.valor || 0)
                                    }))
                                  : ((Array.isArray(rawServs) && rawServs.length > 0)
                                      ? rawServs.map((s: any, idx: number) => ({
                                          id: s.id || DEFAULT_STRUCTURING_SERVICES[idx]?.id || `sub_serv_${idx}`,
                                          titulo: s.nome || s.servico || DEFAULT_STRUCTURING_SERVICES[idx]?.nome,
                                          concluida: s.status === "concluido" || s.concluida || s.statusPagamento === "pago" || s.pago === true,
                                          statusPagamento: s.statusPagamento,
                                          formaPagamento: s.formaPagamento,
                                          dataPagamento: s.dataPagamento,
                                          preco: typeof s.valor === "number" && s.valor > 0 ? s.valor : (DEFAULT_STRUCTURING_SERVICES[idx]?.valor || 0)
                                        }))
                                      : DEFAULT_STRUCTURING_SERVICES.map(ds => ({
                                          id: ds.id,
                                          titulo: ds.nome,
                                          concluida: status === "completed",
                                          preco: ds.valor
                                        })));

                                const completedCount = subList.filter((s: any) => s.concluida).length;
                                const pct = subList.length > 0 ? Math.round((completedCount / subList.length) * 100) : 0;

                                return (
                                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                                    <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                      <div 
                                        className="bg-[#00A86B] h-full transition-all duration-500" 
                                        style={{ width: `${pct}%` }} 
                                      />
                                    </div>
                                    <span className="text-xs font-mono font-extrabold text-[#0A3D2E]">
                                      {pct}% ({completedCount}/{subList.length})
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Informativo de Liquidação Financeira e Início dos Serviços */}
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-2">
                                <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-extrabold block text-emerald-900">Prazo de Compensação & Início dos Serviços:</span>
                                  <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                                    Conforme as regras de liquidação do intermediador (Hubla), o início técnico de cada serviço ocorre após a confirmação em conta: <strong>48h para pagamentos via PIX</strong> e <strong>15 dias corridos para pagamentos via Cartão de Crédito</strong>.
                                  </p>
                                </div>
                              </div>
                              <span className="text-[9px] font-black font-mono uppercase bg-white text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-lg shrink-0">
                                PIX 48h • Cartão 15d
                              </span>
                            </div>

                            <div className="space-y-2">
                              {(() => {
                                const rawServs = (lead as any).servicosRecomendados || ((lead as any).diagnosticoPROSFEC && (lead as any).diagnosticoPROSFEC.servicosRecomendados) || [];
                                const existingSub = (lead as any).subEtapasPasso6;

                                return (Array.isArray(existingSub) && existingSub.length > 0)
                                  ? existingSub.map((sub: any, idx: number) => ({
                                      ...sub,
                                      id: sub.id || DEFAULT_STRUCTURING_SERVICES[idx]?.id || `sub_${idx}`,
                                      titulo: sub.titulo || sub.nome || DEFAULT_STRUCTURING_SERVICES[idx]?.nome,
                                      concluida: sub.concluida || sub.statusPagamento === "pago" || sub.pago === true,
                                      statusPagamento: sub.statusPagamento,
                                      formaPagamento: sub.formaPagamento,
                                      metodoPagamento: sub.metodoPagamento,
                                      dataPagamento: sub.dataPagamento,
                                      dataLiberacaoSaque: sub.dataLiberacaoSaque,
                                      preco: typeof sub.preco === "number" && sub.preco > 0 ? sub.preco : (DEFAULT_STRUCTURING_SERVICES[idx]?.valor || 0)
                                    }))
                                  : ((Array.isArray(rawServs) && rawServs.length > 0)
                                      ? rawServs.map((s: any, idx: number) => ({
                                          id: s.id || DEFAULT_STRUCTURING_SERVICES[idx]?.id || `sub_serv_${idx}`,
                                          titulo: s.nome || s.servico || DEFAULT_STRUCTURING_SERVICES[idx]?.nome,
                                          concluida: s.status === "concluido" || s.concluida || s.statusPagamento === "pago" || s.pago === true,
                                          statusPagamento: s.statusPagamento,
                                          formaPagamento: s.formaPagamento,
                                          metodoPagamento: s.metodoPagamento,
                                          dataPagamento: s.dataPagamento,
                                          dataLiberacaoSaque: s.dataLiberacaoSaque,
                                          preco: typeof s.valor === "number" && s.valor > 0 ? s.valor : (DEFAULT_STRUCTURING_SERVICES[idx]?.valor || 0)
                                        }))
                                      : DEFAULT_STRUCTURING_SERVICES.map(ds => ({
                                          id: ds.id,
                                          titulo: ds.nome,
                                          concluida: status === "completed",
                                          preco: ds.valor
                                        })));
                              })().map((subItem: any, i: number) => {
                                const isZeroCost = isServiceWithoutUpfrontCost(subItem) || !subItem.preco || subItem.preco <= 0;
                                const isPaid = subItem.statusPagamento === "pago" || subItem.pago === true;
                                const hublaUrl = isZeroCost ? null : getHublaLinkForService(subItem, lead, catalogServices);
                                const isLiquidated = !subItem.dataLiberacaoSaque || new Date(subItem.dataLiberacaoSaque).getTime() <= Date.now();
                                
                                return (
                                  <div 
                                    key={subItem.id || i} 
                                    className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-medium transition-all ${
                                      subItem.concluida 
                                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                                        : "bg-white border-slate-200 text-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[10px] ${
                                        subItem.concluida ? "bg-emerald-600" : "bg-slate-300"
                                      }`}>
                                        {subItem.concluida ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                                      </div>
                                      <div className="min-w-0">
                                        <span className={`block truncate ${subItem.concluida ? "font-bold text-emerald-950" : "text-slate-700"}`}>
                                          {subItem.titulo}
                                        </span>
                                        {/* Detalhamento dos pilares unificados se for o Programa de Reabilitação */}
                                        {(subItem.id === "serv_reabilitacao" || subItem.titulo?.toLowerCase().includes("reabilitação") || subItem.titulo?.toLowerCase().includes("reabilitacao")) && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                              1. Renegociação de Dívidas
                                            </span>
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                              2. Liminar Limpa Nome
                                            </span>
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                              3. Regularização SCR/BACEN
                                            </span>
                                          </div>
                                        )}
                                        {isZeroCost ? (
                                          <div className="text-[10px] text-blue-700 font-medium flex items-center gap-1.5 mt-0.5">
                                            <span>Incluso no projeto • Remuneração apenas no êxito da operação</span>
                                          </div>
                                        ) : isPaid ? (
                                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                            <span>Forma: <strong>{subItem.metodoPagamento || "PIX/Cartão"}</strong></span>
                                            <span>•</span>
                                            {isLiquidated ? (
                                              <span className="text-emerald-700 font-bold">Início dos serviços liberado</span>
                                            ) : (
                                              <span className="text-amber-700 font-bold">
                                                Compensação até {new Date(subItem.dataLiberacaoSaque).toLocaleDateString("pt-BR")} ({subItem.metodoPagamento === "PIX" ? "48h PIX" : "15 dias Cartão"})
                                              </span>
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {(() => {
                                        const isDemand = isDemandAccountingService(subItem);
                                        if (isZeroCost) {
                                          return (
                                            <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                                              🎯 Sem Custo Inicial (Êxito)
                                            </span>
                                          );
                                        }

                                        return (
                                          <>
                                            {isDemand && (
                                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                                                📋 Serviços Contratados por demanda
                                              </span>
                                            )}
                                            {typeof subItem.preco === "number" && subItem.preco > 0 && (
                                              <span className="text-[10px] font-mono font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                {formatCurrencyBRL(subItem.preco)}
                                              </span>
                                            )}
                                            {isPaid ? (
                                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                Pago
                                              </span>
                                            ) : hublaUrl ? (
                                              <a
                                                href={hublaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-[#00A86B] hover:bg-[#0A3D2E] text-white px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer"
                                                title="Contratar via Hubla com confirmação em tempo real"
                                              >
                                                <span>Contratar Serviço</span>
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            ) : null}
                                          </>
                                        );
                                      })()}
                                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                        subItem.concluida 
                                          ? "bg-emerald-100 text-emerald-800" 
                                          : "bg-amber-100 text-amber-800"
                                      }`}>
                                        {subItem.concluida ? "Concluída ✓" : "Em Andamento"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {step.number === 6 && getStepStatus(5) !== "completed" && (
                          <div className="mt-4 bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-center text-slate-500 text-xs font-semibold">
                            🔒 A aplicação das sub-etapas e serviços de estruturação de crédito estará disponível assim que a Etapa 5 (Recolhimento de Senha GOV e Serasa) for concluída.
                          </div>
                        )}

                        {step.number === 7 && (
                          <div className="mt-4">
                            <DossierComparativeViewer 
                              lead={lead as any} 
                              diagnosticoPosEstruturacao={(lead as any).diagnosticoPosEstruturacao} 
                              isAdmin={false}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendations / Alerts Box if any */}
            {lead.principaisAlertas && lead.principaisAlertas.length > 0 && (
              <div className="bg-amber-50/50 border border-amber-200/60 p-6 rounded-2xl">
                <span className="text-xs font-bold text-amber-800 block uppercase tracking-wider font-mono mb-3">
                  Pontos de Atenção Identificados
                </span>
                <ul className="space-y-2.5">
                  {lead.principaisAlertas.map((alerta, i) => (
                    <li key={i} className="text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{alerta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Interactive Actions Area */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              <h3 className="text-lg font-black text-slate-900 font-display">
                Ações Recomendadas para Acelerar a Liberação
              </h3>

              <div className="max-w-xl">
                {/* Action Card 1: Speak to PROSFEC consultant */}
                <div className="border border-slate-100 hover:border-slate-200 bg-[#0A3D2E]/5 p-6 rounded-2xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="p-2.5 bg-[#25D366]/10 text-[#25D366] rounded-xl inline-block mb-3.5">
                      <Phone className="w-5 h-5 fill-current p-0.5" />
                    </div>
                    <h4 className="font-extrabold text-[#0A3D2E] text-base">
                      {partnerNome ? `Falar com ${partnerNome}` : "Falar com o setor administrativo"}
                    </h4>
                    <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                      {partnerNome 
                        ? `Fale agora mesmo com ${partnerNome}, seu consultor indicado, para regularizar pendências em sua proposta ou tirar dúvidas técnicas.` 
                        : "Fale agora mesmo com o setor administrativo para regularizar pendências em sua proposta ou tirar dúvidas técnicas."}
                    </p>
                  </div>
                  <a 
                    href={partnerWhatsapp 
                      ? `https://api.whatsapp.com/send?phone=${partnerWhatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(partnerNome || "")}!%20Estou%20no%20meu%20painel%20de%20acompanhamento%20da%20minha%20empresa%20${encodeURIComponent(lead.razaoSocial || lead.nome)}%20(ID:%20${lead.id})%20e%20gostaria%20de%20dar%20andamento%20na%20minha%20solicita%C3%A7%C3%A3o.`
                      : `https://api.whatsapp.com/send?phone=5598987353253&text=Ol%C3%A1!%20Estou%20no%20meu%20painel%20de%20acompanhamento%20da%20minha%20empresa%20${encodeURIComponent(lead.razaoSocial || lead.nome)}%20(ID:%20${lead.id})%20e%20gostaria%20de%20resolver%20as%20pend%C3%AAncias%20que%20constam%20no%20meu%20painel.`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center justify-center gap-1.5 w-full bg-[#25D366] hover:bg-[#20ba5a] text-sm font-bold py-3 px-4 rounded-xl transition-all active:scale-97 cursor-pointer text-white"
                  >
                    <Phone className="w-4 h-4 fill-current" />
                    <span>{partnerNome ? `Falar com ${partnerNome}` : "Falar com o setor administrativo"}</span>
                  </a>
                </div>
              </div>

            </div>

            {/* Micro FAQ under tracking */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-xs">
              <h3 className="text-lg font-black text-slate-900 font-display mb-6">
                Perguntas Frequentes do Processo
              </h3>

              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
                    <button 
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full py-4 px-4 text-left flex justify-between items-center hover:bg-slate-50 transition-all focus:outline-hidden"
                    >
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`} />
                    </button>
                    {openFaq === idx && (
                      <div className="py-3.5 px-4 text-xs text-slate-600 border-t border-slate-100 bg-white leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            </div> {/* Close Right Column */}
          </div> {/* Close Split Layout Grid */}

            {/* Secure Environment Notice */}
            <div className="text-center py-4">
              <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 uppercase tracking-wider font-mono">
                <Lock className="w-3 h-3" />
                <span>Dados protegidos pela LGPD &amp; Criptografia ponta a ponta PROSFEC</span>
              </p>
            </div>

          </div>
        )}

      </main>

      {/* Small Footer */}
      {!embedded && (
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
          <p>© {new Date().getFullYear()} PROSFEC Ltda. Todos os direitos reservados.</p>
        </footer>
      )}
    </div>
  );
}
