// @ts-nocheck
import React, { useState, useEffect } from "react";
import { doc, updateDoc, collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  DEFAULT_SERVICES_CATALOG, 
  sanitizeAndSyncServicosList, 
  isServiceWithoutUpfrontCost, 
  isDemandAccountingService,
  getApplicableContracts,
  getHublaLinkForService,
  cleanForFirestore,
  ServiceCatalogItem
} from "../utils/serviceUtils";
import { 
  formatCurrencyBRL, 
  triggerWebhookSimulation, 
  validateCNPJ, 
  validateCPF, 
  validatePhone,
  formatCNPJ,
  formatPhone,
  formatCPF,
  fetchCNPJ,
  getAppDomain,
  buildLeadMultilevelFirestorePayload,
  calculateMultilevelCommission,
  getPlanServiceLabel,
  getServiceCommissionRate,
  getMasterTeamServiceOverrideRate,
  isFranquiaDigital
} from "../utils";
import { motion } from "motion/react";
import { 
  X, 
  Briefcase, 
  Users, 
  Calculator, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  User, 
  Copy, 
  Check,
  Eye,
  Loader2,
  ShieldCheck,
  Printer,
  FileText,
  Download,
  AlertTriangle,
  Sparkles,
  Key,
  Clock,
  ArrowRight,
  Shield,
  Lock,
  Plus,
  DollarSign,
  CheckCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Bookmark,
  FileCheck
} from "lucide-react";
import LeadStepTimeline from "./LeadStepTimeline";
import LeadConciergeTracker from "./LeadConciergeTracker";
import FichaRatingAdmViewer from "./FichaRatingAdmViewer";
import FichaRatingCreditoForm from "./FichaRatingCreditoForm";
import { DossierComparativeViewer } from "./DossierComparativeViewer";
import { FintechDiagnosisView } from "./FintechDiagnosisView";
import { calculateLeadStepStatus } from "../utils/stepValidation";
import { 
  GOVERNMENT_CREDIT_LINES, 
  validateCreditLineConditions, 
  GovernmentCreditLineRule 
} from "../utils/creditLineRules";

export const ETAPAS_LABELS: Record<number, string> = {
  1: "Passo 1: Dados cadastrais do CNPJ",
  2: "Passo 2: Coleta de dados dos sócios",
  3: "Passo 3: Consulta Diagnóstica CPF e CNPJ",
  4: "Passo 4: Assinatura eletrônica de termos e Contratos",
  5: "Passo 5: Recolhimento Senha GOV, Serasa e Certificado Digital A1",
  6: "Passo 6: Estruturação da Operação (Aplicação de melhoria de crédito)",
  7: "Passo 7: Operação apta para solicitação bancária",
  8: "Passo 8: Crédito aprovado / Crédito Recusado",
};

import { PendenciaItem } from "../types";

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
  limiteEstimado?: number;
  valorAprovado?: number;
  comissaoPaga?: boolean;
  etapa?: number;
  porte?: string;
  ramo?: string;
  menosDe12Meses?: boolean;
  capitalSocial?: number;
  mediaReceitaMensal?: number;
  faturamentoAnual?: number;
  bancoPrincipal?: string;
  principaisAlertas?: string[];
  recomendações?: string[];
  parceiroNome?: string;
  socios?: any[];
  enderecoSocioPrincipal?: any;
  nivelPreparacao?: string;
  govbrLogin?: string;
  govbrSenha?: string;
  serasaLogin?: string;
  serasaSenha?: string;
  certificadoSenha?: string;
  certificadoFileName?: string;
  certificadoFileBase64?: string;
  propostaNegociada?: any;
  historicoEtapas?: any[];
  creditLineCode?: string;
  creditLineName?: string;
  result?: {
    creditLineCode?: string;
    creditLineName?: string;
    recommendedLimit?: number;
    rate?: number;
    carencia?: number;
    prazo?: number;
    justificativa?: string;
    fonte?: string;
  };
  contratoAssinado?: boolean;
  contratoAssinadoData?: string;
  contratoAssinadoIp?: string;
  contratoAssinadoNome?: string;
  contratoAssinadoCpf?: string;
  contratoAssinadoDispositivo?: string;
  contratoAssinadoDesenho?: string;
  pendente?: boolean;
  pendenciaDescricao?: string;
  pendencias?: {
    mensagem: string;
    status: 'pendente' | 'resolvida';
    resposta?: string;
    historico?: PendenciaItem[];
  } | null;
  diagnosticoGeracoesCount?: number;
  diagnosticoPROSFEC?: {
    texto: string;
    dataGeracao: string;
    consultasAnalisadas: number;
    geracoesCount?: number;
  } | null;
  servicosRecomendados?: any[];
  subEtapasPasso6?: any[];
  fichaRatingCredito?: any;
  pagamentoConfirmado?: boolean;
  pagamentoServicosConfirmado?: boolean;
  liberarFichaRating?: boolean;
  [key: string]: any;
}

interface Partner {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string;
  interesse: string;
  status: string;
  dataCriacao: string;
  plano?: string;
  parentPartnerId?: string;
  parentPartnerNome?: string;
  [key: string]: any;
}

interface LeadWorkspaceModalProps {
  lead: Lead;
  currentPartner?: Partner | null;
  onClose: () => void;
  onRefreshLeads?: () => void;
  onLeadUpdated?: (updated: any) => void;
  initialTab?: "details" | "socios" | "diagnostico" | "contrato" | "credenciais" | "simulador" | "apta_bancaria" | "rating_adm" | "rating_form" | "concierge";
  isAdmin?: boolean;
}

interface ScheduleRow {
  mes: number;
  tipo: "Carência" | "Amortização";
  saldoInicial: number;
  amortizacao: number;
  juros: number;
  parcela: number;
  saldoFinal: number;
}

export default function LeadWorkspaceModal({ 
  lead, 
  currentPartner, 
  onClose, 
  onRefreshLeads,
  onLeadUpdated,
  initialTab,
  isAdmin = false
}: LeadWorkspaceModalProps) {
  const isAdminUser = Boolean(
    isAdmin || 
    currentPartner?.id === "admin" || 
    (currentPartner as any)?.role === "admin" || 
    (currentPartner as any)?.isAdmin
  );
  const stepStatus = calculateLeadStepStatus(lead);
  const normalizedInitialTab = initialTab === "rating_form" ? "simulador" : initialTab;
  const [workspaceTab, setWorkspaceTab] = useState<"details" | "socios" | "diagnostico" | "contrato" | "credenciais" | "simulador" | "apta_bancaria" | "rating_adm" | "concierge">(
    normalizedInitialTab === "concierge" || (normalizedInitialTab && ((normalizedInitialTab as any) === "rating_adm" ? isAdminUser : stepStatus.isTabUnlocked(normalizedInitialTab as any))) ? (normalizedInitialTab as any) : "details"
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [contratosAssinadosUrl, setContratosAssinadosUrl] = useState<string>(lead?.contratosAssinadosUrl || "");
  const [savingContratosUrl, setSavingContratosUrl] = useState(false);
  const [contratosUrlFeedback, setContratosUrlFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);

  // Callbacks de pós-save NUNCA podem derrubar o fluxo para o catch de gravação:
  // executa de forma isolada e engole qualquer erro do callback com warn.
  const safeRefreshLeads = () => {
    try {
      if (typeof onRefreshLeads !== "function") return;
      const result = (onRefreshLeads as any)();
      if (result && typeof result.catch === "function") {
        result.catch((e: any) => console.warn("onRefreshLeads callback falhou (ignorado):", e));
      }
    } catch (e) {
      console.warn("onRefreshLeads callback falhou (ignorado):", e);
    }
  };

  const [generatingPasso7, setGeneratingPasso7] = useState(false);

  const handleTabClick = (rawTab: "details" | "socios" | "diagnostico" | "contrato" | "credenciais" | "simulador" | "apta_bancaria" | "rating_adm" | "rating_form" | "concierge") => {
    // A Ficha & Documentos agora vive dentro do Passo 6 (Estruturação)
    const tab = (rawTab === "rating_form" ? "simulador" : rawTab) as Exclude<typeof rawTab, "rating_form">;
    if (tab === "concierge") {
      setWorkspaceTab(tab);
      setWorkspaceError(null);
      setWorkspaceSuccess(null);
      return;
    }
    if (tab === "rating_adm") {
      if (!isAdminUser) {
        setWorkspaceError("🔒 Acesso restrito apenas para a Mesa de Operações / Administrador.");
        return;
      }
      setWorkspaceTab(tab);
      setWorkspaceError(null);
      setWorkspaceSuccess(null);
      return;
    }
    if (!stepStatus.isTabUnlocked(tab)) {
      const reason = stepStatus.getLockedReason(tab);
      setWorkspaceError(reason || "🔒 Esta etapa está bloqueada. É necessário preencher e salvar os dados obrigatórios da etapa anterior no Firestore.");
      setWorkspaceSuccess(null);
      return;
    }
    setWorkspaceTab(tab);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
  };
  const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);
  const [showContractPdfModal, setShowContractPdfModal] = useState(false);
  const [activePdfTab, setActivePdfTab] = useState<"contrato" | "termo" | "rating_score" | "bacen" | "rtb">("contrato");
  const [selectedConsultaForModal, setSelectedConsultaForModal] = useState<any | null>(null);

  // PROSFEC IA Diagnostic states
  const [leadConsultas, setLeadConsultas] = useState<any[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [generatingDiagnostico, setGeneratingDiagnostico] = useState(false);
  const [diagnosticoPROSFEC, setDiagnosticoPROSFEC] = useState<any>(lead.diagnosticoPROSFEC || null);
  const [copiedDiagnostico, setCopiedDiagnostico] = useState(false);

  // Serviços Recomendados e Precificação (Apenas ADM altera)
  const [servicosRecomendados, setServicosRecomendados] = useState<any[]>(() => {
    const raw = (lead as any).servicosRecomendados || ((lead.diagnosticoPROSFEC as any)?.servicosRecomendados) || [];
    return sanitizeAndSyncServicosList(raw, DEFAULT_SERVICES_CATALOG);
  });
  const [savingServicos, setSavingServicos] = useState(false);
  const [catalogServices, setCatalogServices] = useState<ServiceCatalogItem[]>(DEFAULT_SERVICES_CATALOG);

  useEffect(() => {
    let activeCatalog = catalogServices;
    const loadCatalog = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracoes", "precos_consultas"));
        if (snap.exists() && snap.data().servicos && Array.isArray(snap.data().servicos) && snap.data().servicos.length > 0) {
          activeCatalog = snap.data().servicos;
          setCatalogServices(activeCatalog);
        }
      } catch (err) {
        console.warn("Could not load catalog services:", err);
      } finally {
        const raw = (lead as any).servicosRecomendados || ((lead.diagnosticoPROSFEC as any)?.servicosRecomendados) || [];
        setServicosRecomendados(sanitizeAndSyncServicosList(raw, activeCatalog));
      }
    };
    loadCatalog();
  }, [lead]);

  const handleSaveServicos = async (updatedServicos?: any[]) => {
    const listToSave = updatedServicos || servicosRecomendados;
    setSavingServicos(true);
    try {
      const syncedSubEtapas = listToSave.map((s: any, idx: number) => {
        const existing = subEtapasPasso6.find(sub => sub.id === s.id || sub.titulo === s.nome);
        const item: any = {
          id: s.id || `sub_${Date.now()}_${idx + 1}`,
          titulo: s.nome || s.servico || `Serviço ${idx + 1}`,
          concluida: existing ? existing.concluida : (s.status === "concluido" || false),
          preco: typeof s.valor === "number" ? s.valor : (parseFloat(s.valor) || 0),
          statusPagamento: existing?.statusPagamento || (s.status === "concluido" ? "pago" : "pendente"),
        };
        const hLink = s.hublaLink || existing?.hublaLink;
        if (hLink) item.hublaLink = hLink;
        const forma = existing?.formaPagamento || s.formaPagamento;
        if (forma) item.formaPagamento = forma;
        const dataP = existing?.dataPagamento || s.dataPagamento;
        if (dataP) item.dataPagamento = dataP;
        return item;
      });

      // Calculate multilevel commission snapshot
      const commissionPayload = buildLeadMultilevelFirestorePayload(
        { ...lead, servicosRecomendados: listToSave },
        [],
        currentPartner,
        syncedSubEtapas
      );

      const firestoreUpdate = cleanForFirestore({
        servicosRecomendados: listToSave,
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel
      });

      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, firestoreUpdate);

      setServicosRecomendados(listToSave);
      setSubEtapasPasso6(commissionPayload.subEtapasPasso6);
      setWorkspaceSuccess("Serviços recomendados e comissões multinível atualizados com sucesso!");
      safeRefreshLeads();
      onLeadUpdated?.({
        ...lead,
        servicosRecomendados: listToSave,
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel
      });
    } catch (err: any) {
      console.error("Erro ao salvar serviços:", err);
      setWorkspaceError("Erro ao salvar precificação dos serviços: " + (err?.message || ""));
    } finally {
      setSavingServicos(false);
    }
  };

  // Sub-etapas do Passo 6 (Checklist de Estruturação)
  const getInitialSubEtapasPasso6 = () => {
    const servs = (lead as any).servicosRecomendados || (lead as any).diagnosticoPROSFEC?.servicosRecomendados || [];
    const existingList = Array.isArray((lead as any).subEtapasPasso6) ? (lead as any).subEtapasPasso6 : [];

    if (Array.isArray(servs) && servs.length > 0) {
      const merged = servs.map((s: any, idx: number) => {
        const existing = existingList.find((sub: any) => sub.id === s.id || sub.titulo === s.nome);
        const item: any = {
          id: s.id || existing?.id || `sub_serv_${idx + 1}`,
          titulo: s.nome || s.servico || `Serviço ${idx + 1}`,
          concluida: existing ? existing.concluida : (s.status === "concluido" || s.concluida || false),
          preco: typeof s.valor === "number" ? s.valor : (parseFloat(s.valor) || 0),
          statusPagamento: existing?.statusPagamento || (s.pago || s.statusPagamento === "pago" ? "pago" : "pendente"),
        };
        const forma = existing?.formaPagamento || s.formaPagamento;
        if (forma) item.formaPagamento = forma;
        const dataP = existing?.dataPagamento || s.dataPagamento;
        if (dataP) item.dataPagamento = dataP;
        const hLink = s.hublaLink || existing?.hublaLink;
        if (hLink) item.hublaLink = hLink;
        return item;
      });
      const extraCustom = existingList.filter((sub: any) => !servs.some((s: any) => s.id === sub.id || s.nome === sub.titulo));
      return [...merged, ...extraCustom];
    }

    if (existingList.length > 0) {
      return existingList;
    }
    return [];
  };

  const [subEtapasPasso6, setSubEtapasPasso6] = useState<{ id: string; titulo: string; concluida: boolean; preco?: number }[]>(getInitialSubEtapasPasso6);
  const [savingSubEtapasLocal, setSavingSubEtapasLocal] = useState(false);

  const handleSaveSubEtapasLocal = async (updatedList?: { id: string; titulo: string; concluida: boolean; preco?: number }[]) => {
    const listToSave = updatedList || subEtapasPasso6;
    setSavingSubEtapasLocal(true);
    try {
      const commissionPayload = buildLeadMultilevelFirestorePayload(
        lead,
        [],
        currentPartner,
        listToSave
      );

      // Keep servicosRecomendados in sync if subEtapas change
      const syncedServicos = listToSave
        .filter(sub => typeof sub.preco === "number" && sub.preco > 0)
        .map(sub => {
          const item: any = {
            id: sub.id,
            nome: sub.titulo,
            valor: sub.preco,
            status: sub.concluida ? "concluido" : ((sub as any).statusPagamento === "pago" ? "pago" : "pendente")
          };
          if ((sub as any).hublaLink) item.hublaLink = (sub as any).hublaLink;
          return item;
        });

      const firestoreUpdate: any = cleanForFirestore({
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel,
        ...(syncedServicos.length > 0 ? { servicosRecomendados: syncedServicos } : {})
      });

      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, firestoreUpdate);

      setSubEtapasPasso6(commissionPayload.subEtapasPasso6);
      if (syncedServicos.length > 0) {
        setServicosRecomendados(syncedServicos);
      }
      setWorkspaceSuccess("Checklist do Passo 6 e comissões atualizados com sucesso!");
      safeRefreshLeads();
      onLeadUpdated?.({
        ...lead,
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel,
        ...(syncedServicos.length > 0 ? { servicosRecomendados: syncedServicos } : {})
      });
    } catch (err: any) {
      console.error("Erro ao salvar sub-etapas do Passo 6:", err);
      setWorkspaceError("Erro ao salvar sub-etapas do Passo 6: " + (err?.message || ""));
    } finally {
      setSavingSubEtapasLocal(false);
    }
  };

  // Credit Query Integration states
  const [localCatalog, setLocalCatalog] = useState<any[]>([]);
  const [selectedProductCode, setSelectedProductCode] = useState("");
  const [executingLocalQuery, setExecutingLocalQuery] = useState(false);
  const [localQueryError, setLocalQueryError] = useState<string | null>(null);
  const [localQuerySuccess, setLocalQuerySuccess] = useState<string | null>(null);
  const [selectedQueryDocument, setSelectedQueryDocument] = useState(lead.cnpj || "");

  // Fetch local credit query catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch("/api/credit/catalogo");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.catalog) {
            setLocalCatalog(data.catalog);
            if (data.catalog.length > 0) {
              setSelectedProductCode(data.catalog[0].code);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching credit catalog in modal:", err);
      }
    };
    fetchCatalog();
  }, []);

  // Fetch matching consultations from Firestore
  const loadLeadConsultas = async () => {
    if (!lead.id) return;
    setLoadingConsultas(true);
    try {
      const docsToMatch: string[] = [];
      if (lead.cnpj) docsToMatch.push(lead.cnpj.replace(/\D/g, ""));
      if (lead.socios && Array.isArray(lead.socios)) {
        lead.socios.forEach((s: any) => {
          if (s.cpf) {
            docsToMatch.push(s.cpf.replace(/\D/g, ""));
          }
        });
      }

      if (docsToMatch.length === 0) {
        setLeadConsultas([]);
        setLoadingConsultas(false);
        return;
      }

      const q = query(
        collection(db, "consultas_realizadas"),
        where("documento", "in", docsToMatch)
      );
      
      const querySnap = await getDocs(q);
      const list = querySnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as any[];
      
      list.sort((a, b) => new Date(b.dataConsulta || 0).getTime() - new Date(a.dataConsulta || 0).getTime());
      setLeadConsultas(list);
    } catch (err) {
      console.error("Error loading lead queries:", err);
    } finally {
      setLoadingConsultas(false);
    }
  };

  // Run lead query listener on active tab
  useEffect(() => {
    if (workspaceTab === "diagnostico") {
      loadLeadConsultas();
    }
  }, [workspaceTab, lead.id]);

  // Execute a credit query directly from lead sheet
  const handleExecuteLocalQuery = async () => {
    if (!selectedQueryDocument) {
      setLocalQueryError("Por favor, selecione ou digite um documento.");
      return;
    }
    setExecutingLocalQuery(true);
    setLocalQueryError(null);
    setLocalQuerySuccess(null);
    try {
      const effectivePartnerId = (currentPartner?.id && currentPartner.id !== "admin")
        ? currentPartner.id
        : ((lead as any).parceiroId || (lead as any).partnerId || (lead as any).parceiro_id || currentPartner?.id || "admin");

      const res = await fetch("/api/credit/consultas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: effectivePartnerId,
          partnerNome: currentPartner?.nome || "Parceiro",
          produtoCode: selectedProductCode,
          documento: selectedQueryDocument.replace(/\D/g, "")
        })
      });
      const resText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(`A API do servidor retornou uma resposta inválida (Status ${res.status}).`);
      }
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Erro ao executar consulta.");
      }
      setLocalQuerySuccess(`Consulta realizada com sucesso! Produto: ${data.produto_nome || selectedProductCode}`);
      // Reload matching queries & refresh parent leads so partner credits update
      loadLeadConsultas();
      safeRefreshLeads();
    } catch (err: any) {
      setLocalQueryError(err.message || "Erro ao executar consulta.");
    } finally {
      setExecutingLocalQuery(false);
    }
  };

  // Check if both CNPJ and CPF credit queries have been performed for this lead
  const hasCnpjQuery = leadConsultas.some((c: any) => {
    const docDigits = String(c.documento || "").replace(/\D/g, "");
    if (docDigits.length === 14) return true;
    if (lead.cnpj && docDigits === lead.cnpj.replace(/\D/g, "")) return true;
    return false;
  });

  const hasCpfQuery = leadConsultas.some((c: any) => {
    const docDigits = String(c.documento || "").replace(/\D/g, "");
    if (docDigits.length === 11) return true;
    if (lead.socios && Array.isArray(lead.socios)) {
      return lead.socios.some((s: any) => s.cpf && docDigits === s.cpf.replace(/\D/g, ""));
    }
    return false;
  });

  const canGenerateDiagnostico = hasCnpjQuery && hasCpfQuery;

  // Generate PROSFEC IA Diagnosis via Backend Route
  const handleGeneratePROSFECDiagnostico = async () => {
    const currentCount = diagnosticoPROSFEC?.geracoesCount || lead?.diagnosticoGeracoesCount || (diagnosticoPROSFEC ? 1 : 0);
    if (diagnosticoPROSFEC && currentCount >= 2) {
      setWorkspaceError("O diagnóstico de IA já foi refeito 1 vez. O limite máximo de reanálises foi atingido para este lead.");
      return;
    }

    if (!canGenerateDiagnostico) {
      if (!hasCnpjQuery && !hasCpfQuery) {
        setWorkspaceError("Para gerar o Diagnóstico IA, é necessário realizar as consultas de crédito do CNPJ e de ao menos um CPF de sócio.");
      } else if (!hasCnpjQuery) {
        setWorkspaceError("Para gerar o Diagnóstico IA, é necessário realizar a consulta de crédito do CNPJ da empresa.");
      } else {
        setWorkspaceError("Para gerar o Diagnóstico IA, é necessário realizar a consulta de crédito de ao menos um CPF de sócio.");
      }
      return;
    }
    setGeneratingDiagnostico(true);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    try {
      const res = await fetch("/api/credit/diagnostico-prosfec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          partnerId: currentPartner?.id || "admin"
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao processar o diagnóstico de crédito.");
      }
      setDiagnosticoPROSFEC(data.diagnostico);
      if (data.subEtapasPasso6 && Array.isArray(data.subEtapasPasso6)) {
        setSubEtapasPasso6(data.subEtapasPasso6);
      }
      setWorkspaceSuccess("Diagnóstico PROSFEC IA gerado e Checklist do Passo 6 (Estruturação) configurado automaticamente com sucesso!");
      safeRefreshLeads();
      onLeadUpdated?.({
        ...lead,
        diagnosticoPROSFEC: data.diagnostico,
        servicosRecomendados: data.diagnostico?.servicosRecomendados || lead.servicosRecomendados,
        subEtapasPasso6: data.subEtapasPasso6 || lead.subEtapasPasso6
      });
    } catch (err: any) {
      setWorkspaceError(err.message || "Erro ao gerar diagnóstico.");
    } finally {
      setGeneratingDiagnostico(false);
    }
  };

  const copyDiagnosticoToClipboard = () => {
    if (!diagnosticoPROSFEC?.texto) return;
    navigator.clipboard.writeText(diagnosticoPROSFEC.texto);
    setCopiedDiagnostico(true);
    setTimeout(() => setCopiedDiagnostico(false), 2000);
  };

  function parseBoldText(text: string) {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-extrabold text-[#0A3D2E] bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200/80 font-sans mx-0.5 inline-block">
            {part}
          </strong>
        );
      }
      return part;
    });
  }

  function renderMarkdown(text: string) {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return (
          <div key={i} className="mt-5 mb-2">
            <h4 className="text-xs font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-2 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-[#00A86B] animate-pulse" />
              {trimmed.replace(/^###\s*/, "")}
            </h4>
          </div>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <div key={i} className="mt-6 mb-3">
            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wide bg-gradient-to-r from-[#022118] via-[#0A3D2E] to-[#022118] p-3.5 rounded-xl border border-emerald-500/30 flex items-center gap-2.5 shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              {trimmed.replace(/^##\s*/, "")}
            </h3>
          </div>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <div key={i} className="mt-6 mb-4">
            <h2 className="text-sm md:text-base font-black text-white uppercase tracking-wider bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#064e3b] p-4 rounded-2xl border border-emerald-400/30 shadow-md flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
              {trimmed.replace(/^#\s*/, "")}
            </h2>
          </div>
        );
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const content = trimmed.replace(/^[-*]\s*/, "");
        return (
          <div key={i} className="my-1.5 p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-emerald-300 transition-all flex items-start gap-2.5 group">
            <span className="p-1 bg-emerald-50 text-emerald-700 rounded-lg shrink-0 mt-0.5 border border-emerald-200/60 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <span className="text-xs text-slate-700 leading-relaxed flex-1 font-medium">
              {parseBoldText(content)}
            </span>
          </div>
        );
      }
      if (trimmed === "") {
        return <div key={i} className="h-1.5" />;
      }
      return (
        <p key={i} className="text-xs text-slate-700 leading-relaxed my-2 font-sans bg-slate-50/80 p-3 rounded-xl border border-slate-100/80">
          {parseBoldText(line)}
        </p>
      );
    });
  }

  const getContractText = () => {
    const razaoSocial = lead.razaoSocial || lead.nome || "[Razão Social]";
    const cnpj = lead.cnpj || "[CNPJ]";
    const cidade = lead.cidade || "[Cidade]";
    const representante = lead.socios && lead.socios.length > 0 
      ? lead.socios[0].nome 
      : (lead.nome || "[Representante Legal]");
    const representanteCpf = lead.socios && lead.socios.length > 0 
      ? lead.socios[0].cpf 
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
    const razaoSocial = lead.razaoSocial || lead.nome || "[Razão Social]";
    const cnpj = lead.cnpj || "[CNPJ]";
    const representante = lead.socios && lead.socios.length > 0 
      ? lead.socios[0].nome 
      : (lead.nome || "[Representante Legal]");
    const representanteCpf = lead.socios && lead.socios.length > 0 
      ? lead.socios[0].cpf 
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
    const clienteNome = lead.razaoSocial || lead.nome || "[NOME COMPLETO/EMPRESA]";
    const clienteCpfCnpj = lead.cnpj || (lead as any).cpf || "[CPF/CNPJ]";
    const clienteEndereco = [(lead as any).endereco, lead.cidade, (lead as any).uf].filter(Boolean).join(", ") || lead.cidade || "[ENDEREÇO COMPLETO COM CEP]";

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
    const clienteNome = lead.razaoSocial || lead.nome || "[NOME COMPLETO/EMPRESA]";
    const clienteCpfCnpj = lead.cnpj || (lead as any).cpf || "[CPF/CNPJ]";
    const clienteEndereco = [(lead as any).endereco, lead.cidade, (lead as any).uf].filter(Boolean).join(", ") || lead.cidade || "[ENDEREÇO COMPLETO COM CEP]";

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
    const clienteNome = lead.razaoSocial || lead.nome || "[NOME COMPLETO/EMPRESA]";
    const clienteCpfCnpj = lead.cnpj || (lead as any).cpf || "[CPF/CNPJ]";
    const clienteEndereco = [(lead as any).endereco, lead.cidade, (lead as any).uf].filter(Boolean).join(", ") || lead.cidade || "[ENDEREÇO COMPLETO COM CEP]";

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

  const handlePrint = () => {
    // Open a new print window with clean, professional A4 formatting
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita popups para imprimir o contrato.");
      return;
    }

    const title = activePdfTab === "contrato" 
      ? "Contrato de Prestacao de Servicos" 
      : activePdfTab === "termo"
      ? "Termo de Reconhecimento de Honorarios"
      : activePdfTab === "rating_score"
      ? "Contrato de Prestacao de Servicos - Rating e Score"
      : activePdfTab === "bacen"
      ? "Contrato de Prestacao de Servicos - BACEN e SCR"
      : "Termo de Contratacao de Servicos - RTB";

    let contentText = getContractText();
    if (activePdfTab === "termo") contentText = getTermoText();
    if (activePdfTab === "rating_score") contentText = getContractRatingScoreText();
    if (activePdfTab === "bacen") contentText = getContractBacenText();
    if (activePdfTab === "rtb") contentText = getContractRtbText();

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              font-size: 13px;
              background: #fff;
            }
            .header-logo {
              text-align: center;
              font-size: 24px;
              font-weight: 800;
              color: #0a3d2e;
              margin-bottom: 30px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .document-title {
              text-align: center;
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 30px;
              line-height: 1.4;
              border-bottom: 2px solid #0a3d2e;
              padding-bottom: 15px;
            }
            .content {
              white-space: pre-wrap;
              text-align: justify;
              margin-bottom: 40px;
            }
            .signature-block {
              margin-top: 50px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 24px;
              background: #f8fafc;
              page-break-inside: avoid;
            }
            .signature-title {
              font-size: 14px;
              font-weight: 700;
              color: #0a3d2e;
              margin-bottom: 15px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 120px;
              gap: 20px;
            }
            .meta-item {
              margin-bottom: 8px;
              font-size: 12px;
            }
            .meta-item strong {
              color: #334155;
            }
            .signature-image {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              background: #fff;
              padding: 10px;
              height: 80px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .signature-image img {
              max-height: 100%;
              max-width: 100%;
              object-contain: fit;
            }
            .footer-legal {
              text-align: center;
              font-size: 10px;
              color: #64748b;
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
            @media print {
              body {
                padding: 0;
                font-size: 12px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-logo">PROSFEC</div>
          <div class="document-title">${title.toUpperCase()}</div>
          <div class="content">${contentText}</div>

          ${lead.contratoAssinado ? `
            <div class="signature-block">
              <div class="signature-title">ASSINATURA DIGITAL E VALIDAÇÃO LEGAL</div>
              <div class="signature-grid">
                <div>
                  <div class="meta-item"><strong>Signatário:</strong> ${lead.contratoAssinadoNome}</div>
                  <div class="meta-item"><strong>CPF:</strong> ${lead.contratoAssinadoCpf}</div>
                  <div class="meta-item"><strong>IP de Origem:</strong> ${lead.contratoAssinadoIp}</div>
                  <div class="meta-item"><strong>Data/Hora da Assinatura:</strong> ${lead.contratoAssinadoData}</div>
                  <div class="meta-item" style="font-size: 9px; color: #64748b;"><strong>Dispositivo:</strong> ${lead.contratoAssinadoDispositivo}</div>
                </div>
                <div class="signature-image">
                  <img src="${lead.contratoAssinadoDesenho}" alt="Assinatura" />
                </div>
              </div>
            </div>
          ` : `
            <div style="margin-top: 50px; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; color: #64748b;">
              Documento pendente de assinatura digital pelo cliente.
            </div>
          `}

          <div class="footer-legal">
            Este documento possui validade jurídica em conformidade com a MP nº 2.200-2/2001 e a Lei nº 14.063/2020.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // TAB 1: Edit Company Details
  const [editRazaoSocial, setEditRazaoSocial] = useState(lead.razaoSocial || "");
  const [editCnpj, setEditCnpj] = useState(lead.cnpj || "");
  const [editNome, setEditNome] = useState(lead.nome || "");
  const [editWhatsapp, setEditWhatsapp] = useState(lead.whatsapp || "");
  const [editEmail, setEditEmail] = useState(lead.email || "");
  const [editRamo, setEditRamo] = useState(lead.ramo || "");
  const [editPorte, setEditPorte] = useState(lead.porte || "ME");
  const [editBancoPrincipal, setEditBancoPrincipal] = useState(lead.bancoPrincipal || "Banco do Brasil");
  const [editMenosDe12Meses, setEditMenosDe12Meses] = useState(lead.menosDe12Meses || false);
  const [editCapitalSocial, setEditCapitalSocial] = useState(lead.capitalSocial?.toString() || "");
  const [editMediaReceitaMensal, setEditMediaReceitaMensal] = useState(lead.mediaReceitaMensal?.toString() || "");
  const [editFaturamento, setEditFaturamento] = useState(lead.faturamentoAnual?.toString() || "");

  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false);
  const [cnpjInfoMessage, setCnpjInfoMessage] = useState<string | null>(null);

  // Auto-fetch CNPJ info via BrasilAPI in Edit Workspace Modal
  useEffect(() => {
    const cleanCnpj = editCnpj.replace(/\D/g, "");
    const cleanLeadCnpj = (lead.cnpj || "").replace(/\D/g, "");
    if (cleanCnpj.length === 14 && cleanCnpj !== cleanLeadCnpj) {
      const runFetch = async () => {
        setIsConsultingCnpj(true);
        setCnpjInfoMessage(null);
        try {
          const info = await fetchCNPJ(cleanCnpj);
          
          let parsedPorte = "ME";
          if (info.porte) {
            const p = String(info.porte).toUpperCase();
            if (p.includes("MICRO") || p.includes("MEI") || p === "01" || p === "ME") {
              parsedPorte = p.includes("INDIVIDUAL") || p.includes("MEI") ? "MEI" : "ME";
            } else if (p.includes("PEQUENO") || p === "03" || p === "EPP") {
              parsedPorte = "EPP";
            }
          }

          setEditRazaoSocial(info.razao_social || info.nome_fantasia || editRazaoSocial);
          setEditPorte(parsedPorte);
          
          if (info.cep) {
            setEditEndCep(info.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"));
          }
          if (info.logradouro) setEditEndLogradouro(info.logradouro);
          if (info.numero) setEditEndNumero(info.numero);
          if (info.bairro) setEditEndBairro(info.bairro);
          if (info.municipio) setEditEndCidade(info.municipio);
          if (info.uf) setEditEndUf(info.uf);
          if (info.complemento) setEditEndComplemento(info.complemento);

          if (info.email && !editEmail) setEditEmail(info.email);
          if (info.ddd_telefone_1 && !editWhatsapp) {
            const cleanPhone = info.ddd_telefone_1.replace(/\D/g, "");
            setEditWhatsapp(formatPhone(cleanPhone));
          }

          setCnpjInfoMessage("✅ CNPJ e endereço atualizados automaticamente!");
        } catch (err: any) {
          console.warn("CNPJ lookup failed/rate-limited in LeadWorkspaceModal", err);
          setCnpjInfoMessage("⚠️ Consulta automática indisponível. Digite os dados manualmente.");
        } finally {
          setIsConsultingCnpj(false);
        }
      };
      runFetch();
    } else {
      setCnpjInfoMessage(null);
    }
  }, [editCnpj, lead.cnpj]);
  const [govbrLogin, setGovbrLogin] = useState(lead.govbrLogin || "");
  const [govbrSenha, setGovbrSenha] = useState(lead.govbrSenha || "");
  const [serasaLogin, setSerasaLogin] = useState(lead.serasaLogin || "");
  const [serasaSenha, setSerasaSenha] = useState(lead.serasaSenha || "");
  const [certificadoSenha, setCertificadoSenha] = useState(lead.certificadoSenha || "");
  const [certificadoFileName, setCertificadoFileName] = useState(lead.certificadoFileName || "");
  const [certificadoFileBase64, setCertificadoFileBase64] = useState(lead.certificadoFileBase64 || "");

  const handleCertificadoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validação estrita do tamanho do arquivo: limite de 1MB (certificados reais costumam ter menos de 100KB)
      const maxSizeBytes = 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert("O arquivo selecionado é muito grande! Certificados digitais A1 (.pfx / .p12) costumam ter menos de 100KB. Por favor, envie um arquivo válido de até 1MB.");
        e.target.value = ""; // Limpa a seleção
        return;
      }

      setCertificadoFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCertificadoFileBase64(base64 || "");
      };
      reader.readAsDataURL(file);
    }
  };

  // TAB 2: Edit Socios
  const mainSocio = lead.socios?.[0] || {};
  const socio2 = lead.socios?.[1] || {};
  const addr = lead.enderecoSocioPrincipal || {};

  const [editSocio1Nome, setEditSocio1Nome] = useState(mainSocio.nome || "");
  const [editSocio1Cpf, setEditSocio1Cpf] = useState(mainSocio.cpf || "");
  const [editSocio1Birth, setEditSocio1Birth] = useState(mainSocio.dataNascimento || "");
  const [editSocio1Mae, setEditSocio1Mae] = useState(mainSocio.nomeMae || "");
  const [editSocio1Telefone, setEditSocio1Telefone] = useState(mainSocio.telefone || "");
  const [editSocio1Rg, setEditSocio1Rg] = useState(mainSocio.rg || "");
  const [editSocio1Orgao, setEditSocio1Orgao] = useState(mainSocio.orgaoEmissor || "");
  const [editSocio1Participacao, setEditSocio1Participacao] = useState(mainSocio.participacao?.toString() || "100");

  const [editHasSocio2, setEditHasSocio2] = useState(!!lead.socios?.[1]);
  const [editSocio2Nome, setEditSocio2Nome] = useState(socio2.nome || "");
  const [editSocio2Cpf, setEditSocio2Cpf] = useState(socio2.cpf || "");
  const [editSocio2Birth, setEditSocio2Birth] = useState(socio2.dataNascimento || "");
  const [editSocio2Telefone, setEditSocio2Telefone] = useState(socio2.telefone || "");
  const [editSocio2Participacao, setEditSocio2Participacao] = useState(socio2.participacao?.toString() || "");

  const [editEndCep, setEditEndCep] = useState(addr.cep || "");
  const [editEndLogradouro, setEditEndLogradouro] = useState(addr.logradouro || "");
  const [editEndNumero, setEditEndNumero] = useState(addr.numero || "");
  const [editEndBairro, setEditEndBairro] = useState(addr.bairro || "");
  const [editEndCidade, setEditEndCidade] = useState(addr.cidade || "");
  const [editEndUf, setEditEndUf] = useState(addr.uf || "SP");
  const [editEndComplemento, setEditEndComplemento] = useState(addr.complemento || "");

  // TAB 3: Advanced Simulator Parameters
  const [advValor, setAdvValor] = useState<number>(lead.propostaNegociada?.valorDesejado || lead.limiteEstimado || 150000);
  const [advCarencia, setAdvCarencia] = useState<number>(lead.propostaNegociada?.carenciaMeses !== undefined ? lead.propostaNegociada.carenciaMeses : 12);
  const [advPrazoAmortizacao, setAdvPrazoAmortizacao] = useState<number>(lead.propostaNegociada?.amortizacaoMeses !== undefined ? lead.propostaNegociada.amortizacaoMeses : 48);
  const [advAmortizacao, setAdvAmortizacao] = useState<"SAC" | "PRICE">(lead.propostaNegociada?.sistemaAmortizacao || "SAC");
  const [advTaxaAnual, setAdvTaxaAnual] = useState<number>(lead.propostaNegociada?.taxaAnual !== undefined ? lead.propostaNegociada.taxaAnual : 16.5);
  const [advPagarJurosCarencia, setAdvPagarJurosCarencia] = useState<boolean>(lead.propostaNegociada?.pagarJurosCarencia || false);
  const [advCreditLineCode, setAdvCreditLineCode] = useState<string>(lead.propostaNegociada?.creditLineCode || lead.creditLineCode || lead.result?.creditLineCode || "PRONAMPE");
  const [advCreditLineName, setAdvCreditLineName] = useState<string>(lead.propostaNegociada?.creditLineName || lead.creditLineName || lead.result?.creditLineName || "PRONAMPE (Programa Nacional de Apoio às Microempresas)");
  const [copiedProposalReport, setCopiedProposalReport] = useState(false);

  const [partnerReply, setPartnerReply] = useState("");
  const [savingPartnerReply, setSavingPartnerReply] = useState(false);

  // Sync state if lead changes
  useEffect(() => {
    setEditRazaoSocial(lead.razaoSocial || "");
    setEditCnpj(lead.cnpj || "");
    setEditNome(lead.nome || "");
    setEditWhatsapp(lead.whatsapp || "");
    setEditEmail(lead.email || "");
    setEditRamo(lead.ramo || "");
    setEditPorte(lead.porte || "ME");
    setEditBancoPrincipal(lead.bancoPrincipal || "Banco do Brasil");
    setEditMenosDe12Meses(lead.menosDe12Meses || false);
    setEditCapitalSocial(lead.capitalSocial?.toString() || "");
    setEditMediaReceitaMensal(lead.mediaReceitaMensal?.toString() || "");
    setEditFaturamento(lead.faturamentoAnual?.toString() || "");
    setGovbrLogin(lead.govbrLogin || "");
    setGovbrSenha(lead.govbrSenha || "");
    setSerasaLogin(lead.serasaLogin || "");
    setSerasaSenha(lead.serasaSenha || "");
    setCertificadoSenha(lead.certificadoSenha || "");
    setCertificadoFileName(lead.certificadoFileName || "");
    setCertificadoFileBase64(lead.certificadoFileBase64 || "");

    const mS = lead.socios?.[0] || {};
    const s2 = lead.socios?.[1] || {};
    const ad = lead.enderecoSocioPrincipal || {};

    setEditSocio1Nome(mS.nome || "");
    setEditSocio1Cpf(mS.cpf || "");
    setEditSocio1Birth(mS.dataNascimento || "");
    setEditSocio1Mae(mS.nomeMae || "");
    setEditSocio1Telefone(mS.telefone || "");
    setEditSocio1Rg(mS.rg || "");
    setEditSocio1Orgao(mS.orgaoEmissor || "");
    setEditSocio1Participacao(mS.participacao?.toString() || "100");

    setEditHasSocio2(!!lead.socios?.[1]);
    setEditSocio2Nome(s2.nome || "");
    setEditSocio2Cpf(s2.cpf || "");
    setEditSocio2Birth(s2.dataNascimento || "");
    setEditSocio2Telefone(s2.telefone || "");
    setEditSocio2Participacao(s2.participacao?.toString() || "");

    setEditEndCep(ad.cep || "");
    setEditEndLogradouro(ad.logradouro || "");
    setEditEndNumero(ad.numero || "");
    setEditEndBairro(ad.bairro || "");
    setEditEndCidade(ad.cidade || "");
    setEditEndUf(ad.uf || "SP");
    setEditEndComplemento(ad.complemento || "");

    const prop = lead.propostaNegociada || {};
    setAdvValor(prop.valorDesejado || lead.limiteEstimado || 150000);
    setAdvCarencia(prop.carenciaMeses !== undefined ? prop.carenciaMeses : 12);
    setAdvPrazoAmortizacao(prop.amortizacaoMeses !== undefined ? prop.amortizacaoMeses : 48);
    setAdvAmortizacao(prop.sistemaAmortizacao || "SAC");
    setAdvTaxaAnual(prop.taxaAnual !== undefined ? prop.taxaAnual : 16.5);
    setAdvPagarJurosCarencia(prop.pagarJurosCarencia || false);
    setAdvCreditLineCode(prop.creditLineCode || lead.creditLineCode || lead.result?.creditLineCode || "PRONAMPE");
    setAdvCreditLineName(prop.creditLineName || lead.creditLineName || lead.result?.creditLineName || "PRONAMPE (Programa Nacional de Apoio às Microempresas)");
  }, [lead]);

  const handleSelectCreditLine = (code: string) => {
    const rule = GOVERNMENT_CREDIT_LINES[code] || GOVERNMENT_CREDIT_LINES.PRONAMPE;
    setAdvCreditLineCode(code);
    setAdvCreditLineName(rule.name);
    setAdvTaxaAnual(rule.defaultTaxaAnual);
    setAdvCarencia(rule.defaultCarencia);
    setAdvPrazoAmortizacao(rule.defaultPrazoAmortizacao);
    setAdvAmortizacao(rule.defaultSistema);
  };

  const handleAutoFixConditions = () => {
    const rule = GOVERNMENT_CREDIT_LINES[advCreditLineCode] || GOVERNMENT_CREDIT_LINES.PRONAMPE;
    const currentCarencia = isNaN(advCarencia) ? rule.defaultCarencia : advCarencia;
    const currentPrazo = isNaN(advPrazoAmortizacao) ? rule.defaultPrazoAmortizacao : advPrazoAmortizacao;
    const currentTaxa = isNaN(advTaxaAnual) ? rule.defaultTaxaAnual : advTaxaAnual;

    setAdvCarencia(Math.min(Math.max(currentCarencia, rule.minCarencia), rule.maxCarencia));
    setAdvPrazoAmortizacao(Math.min(Math.max(currentPrazo, rule.minPrazoAmortizacao), rule.maxPrazoAmortizacao));
    setAdvTaxaAnual(Math.min(Math.max(currentTaxa, rule.minTaxaAnual), rule.maxTaxaAnual));
    if (!rule.allowedSistemas.includes(advAmortizacao)) {
      setAdvAmortizacao(rule.defaultSistema);
    }
  };

  // SAC/PRICE Simulator calculations based on PRONAMPE 2026 guidelines
  const calculateSchedule = () => {
    const r_m = advTaxaAnual / 100 / 12;
    const C = advCarencia;
    const N = advPrazoAmortizacao;
    const rows: ScheduleRow[] = [];
    
    let currentBalance = advValor;
    let accumulatedUncapitalizedInterest = 0;
    
    // 1. Grace Period (Carência)
    for (let t = 1; t <= C; t++) {
      const startBalance = currentBalance;
      const interest = startBalance * r_m;
      let payment = 0;
      
      if (advPagarJurosCarencia) {
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
    
    // Capitalize interest if not paid and if configured to capitalize
    // PRONAMPE rule is typically uncapitalized simple interest added as a constant or capitalized.
    // Let's keep a constant uncapitalized interest division per month to make amortization easy
    const balanceAfterGrace = currentBalance;
    const amortizationAmountPerMonthUncapitalized = accumulatedUncapitalizedInterest / N;
    
    // 2. Amortization Period
    if (advAmortizacao === "PRICE") {
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

  // TAB 1 Submit
  const handleSaveWorkspaceCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    if (!validateCNPJ(editCnpj)) {
      setWorkspaceError("O CNPJ informado é inválido. Por favor, verifique se os números estão corretos.");
      return;
    }

    if (!validatePhone(editWhatsapp)) {
      setWorkspaceError("O WhatsApp de contato informado é inválido. Digite um número real com DDD.");
      return;
    }

    setWorkspaceLoading(true);

    try {
      const valFaturamento = parseFloat(editFaturamento) || 0;
      const valCapital = parseFloat(editCapitalSocial) || 0;
      const valMediaReceita = parseFloat(editMediaReceitaMensal) || 0;

      let calculatedLimit = 0;
      const effectiveAnnualRevenue = editMenosDe12Meses ? valMediaReceita * 12 : valFaturamento;

      if (editMenosDe12Meses) {
        const opt1 = valCapital * 0.5;
        const opt2 = (valMediaReceita * 12) * 0.5;
        calculatedLimit = Math.max(opt1, opt2);
      } else {
        calculatedLimit = valFaturamento * 0.6;
      }
      calculatedLimit = Math.min(calculatedLimit, 500000);

      let prepScore: "alto" | "medio" | "baixo" = "alto";
      const alerts: string[] = [];
      const recs: string[] = [];

      if (editPorte === "MEI" && effectiveAnnualRevenue > 81000) {
        prepScore = "baixo";
        alerts.push(`Faturamento ultrapassa limite MEI.`);
        recs.push("Solicitar reenquadramento para ME.");
      } else if (editPorte === "ME" && effectiveAnnualRevenue > 360000) {
        prepScore = "medio";
        alerts.push(`Excede limite ME.`);
      }

      const currentEtapa = lead.etapa || 1;
      const leadRef = doc(db, "leads", lead.id);
      await updateDoc(leadRef, {
        razaoSocial: editRazaoSocial,
        cnpj: editCnpj,
        nome: editNome,
        whatsapp: editWhatsapp,
        email: editEmail,
        ramo: editRamo,
        porte: editPorte,
        bancoPrincipal: editBancoPrincipal,
        menosDe12Meses: editMenosDe12Meses,
        capitalSocial: valCapital,
        mediaReceitaMensal: valMediaReceita,
        faturamentoAnual: valFaturamento,
        limiteEstimado: calculatedLimit,
        nivelPreparacao: prepScore,
        principaisAlertas: alerts.length > 0 ? alerts : ["CNPJ regularizado!"],
        recomendações: recs.length > 0 ? recs : ["Pronto para envio."],
        etapa: Math.max(currentEtapa, 1)
      });

      setWorkspaceSuccess("Dados cadastrais do CNPJ (Passo 1) atualizados com sucesso!");
      safeRefreshLeads();
    } catch (err) {
      console.error(err);
      setWorkspaceError("Erro ao salvar alterações da empresa.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // Passo 4 — Link da pasta do Drive com os contratos assinados via GOV.br
  const handleSaveContratosAssinadosUrl = async () => {
    const url = (contratosAssinadosUrl || "").trim();
    setContratosUrlFeedback(null);

    if (!url) {
      setContratosUrlFeedback({ type: "error", msg: "Informe o link da pasta do Drive com os contratos assinados." });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setContratosUrlFeedback({ type: "error", msg: "O link deve começar com http:// ou https://" });
      return;
    }

    setSavingContratosUrl(true);
    try {
      const nowIso = new Date().toISOString();
      const currentEtapa = Number(lead.etapa || 1);
      const nextEtapa = Math.max(currentEtapa, 5);

      const payload: Record<string, any> = {
        contratosAssinadosUrl: url,
        contratosAssinadosAtualizadoEm: nowIso,
      };

      if (nextEtapa !== currentEtapa) {
        const newHistoryItem = {
          data: nowIso,
          etapaAnterior: currentEtapa,
          etapaNova: nextEtapa,
          autor: "Parceiro",
          detalhes: "Link da pasta com contratos assinados via GOV.br informado no Passo 4."
        };
        payload.etapa = nextEtapa;
        payload.historicoEtapas = lead.historicoEtapas ? [...lead.historicoEtapas, newHistoryItem] : [newHistoryItem];
      }

      await updateDoc(doc(db, "leads", lead.id), payload);

      setContratosUrlFeedback({
        type: "success",
        msg: nextEtapa !== currentEtapa
          ? "Link salvo! O lead avançou automaticamente para o Passo 5."
          : "Link dos contratos assinados salvo com sucesso."
      });
      safeRefreshLeads();
      onLeadUpdated?.({ ...lead, ...payload });
    } catch (err: any) {
      console.error("Erro ao salvar link dos contratos assinados:", err);
      setContratosUrlFeedback({
        type: "error",
        msg: err?.code === "permission-denied"
          ? "Permissão negada pelo banco ao salvar o link (permission-denied). Verifique as regras publicadas."
          : `Erro ao salvar o link${err?.code ? ` (${err.code})` : ""}.`
      });
    } finally {
      setSavingContratosUrl(false);
    }
  };


  const handleSaveCredenciais = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    try {
      const currentEtapa = lead.etapa || 1;
      const nextEtapa = Math.max(currentEtapa, 6);
      
      const newHistoryItem = {
        data: new Date().toISOString(),
        etapaAnterior: currentEtapa,
        etapaNova: nextEtapa,
        autor: "Parceiro",
        detalhes: "Credenciais de acesso (Gov.br / Serasa / Certificado A1) fornecidas."
      };
      const updatedHistory = lead.historicoEtapas 
        ? [...lead.historicoEtapas, newHistoryItem]
        : [newHistoryItem];

      const leadRef = doc(db, "leads", lead.id);
      await updateDoc(leadRef, {
        govbrLogin: govbrLogin || "",
        govbrSenha: govbrSenha || "",
        serasaLogin: serasaLogin || "",
        serasaSenha: serasaSenha || "",
        certificadoSenha: certificadoSenha || "",
        certificadoFileName: certificadoFileName || "",
        certificadoFileBase64: certificadoFileBase64 || "",
        etapa: nextEtapa,
        historicoEtapas: updatedHistory
      });

      setWorkspaceSuccess("Credenciais salvas com sucesso! O lead avançou para o Passo 6: Estruturação da Operação.");
      safeRefreshLeads();
    } catch (err) {
      console.error(err);
      setWorkspaceError("Erro ao salvar credenciais de acesso.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleSavePartnerReply = async () => {
    if (!partnerReply.trim()) return;
    setSavingPartnerReply(true);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    try {
      const leadRef = doc(db, "leads", lead.id);
      const currentPendencias = lead.pendencias || { 
        mensagem: lead.pendenciaDescricao || "", 
        status: lead.pendente ? "pendente" : "resolvida" 
      };
      
      const nowIso = new Date().toISOString();
      const currentHistorico = (currentPendencias as any).historico || [];
      const newHistoryItem: PendenciaItem = {
        id: Date.now().toString(),
        autor: "parceiro",
        nomeAutor: lead.parceiroNome || "Parceiro",
        mensagem: partnerReply.trim(),
        data: nowIso,
        tipo: "resposta"
      };

      const updatedPendencias = {
        id: (currentPendencias as any).id || Date.now().toString(),
        mensagem: (currentPendencias as any).mensagem || lead.pendenciaDescricao || "",
        status: (currentPendencias as any).status === "resolvida" ? "resolvida" : "aberta",
        dataCriacao: (currentPendencias as any).dataCriacao || nowIso,
        dataResposta: nowIso,
        resposta: partnerReply.trim(),
        historico: [...currentHistorico, newHistoryItem]
      };

      await updateDoc(leadRef, {
        pendencias: updatedPendencias
      });

      setWorkspaceSuccess("Sua resposta à pendência foi enviada com sucesso!");
      setPartnerReply("");
      safeRefreshLeads();
    } catch (err) {
      console.error("Error saving partner reply to Firestore:", err);
      setWorkspaceError("Erro ao enviar a resposta da pendência. Tente novamente.");
    } finally {
      setSavingPartnerReply(false);
    }
  };

  // TAB 2 Submit
  const handleSaveWorkspaceSocios = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    if (!editSocio1Nome.trim() || !editSocio1Cpf.trim() || !editSocio1Birth.trim()) {
      setWorkspaceError("Por favor, preencha Nome Completo, CPF e Data de Nascimento do Sócio Principal.");
      return;
    }

    if (!validateCPF(editSocio1Cpf)) {
      setWorkspaceError("O CPF do Sócio Principal informado é inválido.");
      return;
    }

    if (editHasSocio2) {
      if (!editSocio2Nome.trim() || !editSocio2Cpf.trim() || !editSocio2Birth.trim()) {
        setWorkspaceError("Por favor, preencha Nome Completo, CPF e Data de Nascimento do Segundo Sócio.");
        return;
      }
      if (!validateCPF(editSocio2Cpf)) {
        setWorkspaceError("O CPF do Segundo Sócio informado é inválido.");
        return;
      }
    }

    setWorkspaceLoading(true);

    try {
      const sociosList = [
        {
          nome: editSocio1Nome,
          cpf: editSocio1Cpf,
          dataNascimento: editSocio1Birth,
          participacao: parseFloat(editSocio1Participacao) || 100,
          nomeMae: editSocio1Mae || "",
          telefone: editSocio1Telefone || lead.whatsapp || "",
          rg: editSocio1Rg || "",
          orgaoEmissor: editSocio1Orgao || "",
          cargo: "Sócio Administrador"
        }
      ];

      if (editHasSocio2 && editSocio2Nome && editSocio2Cpf) {
        sociosList.push({
          nome: editSocio2Nome,
          cpf: editSocio2Cpf,
          dataNascimento: editSocio2Birth,
          participacao: parseFloat(editSocio2Participacao) || 0,
          nomeMae: "",
          telefone: editSocio2Telefone || "",
          rg: "",
          orgaoEmissor: "",
          cargo: "Sócio"
        });
      }

      const endPrincipal = {
        cep: editEndCep,
        logradouro: editEndLogradouro,
        numero: editEndNumero,
        bairro: editEndBairro,
        cidade: editEndCidade,
        uf: editEndUf,
        complemento: editEndComplemento
      };

      const prevEtapa = lead.etapa || 1;
      const targetEtapa = Math.max(prevEtapa, 3);
      const newHistoryItem = {
        data: new Date().toISOString(),
        etapaAnterior: prevEtapa,
        etapaNova: targetEtapa,
        autor: "Parceiro",
        detalhes: "Ficha cadastral e dos sócios preenchida com sucesso."
      };
      const updatedHistory = lead.historicoEtapas 
        ? [...lead.historicoEtapas, newHistoryItem]
        : [newHistoryItem];

      const leadRef = doc(db, "leads", lead.id);
      await updateDoc(leadRef, {
        socios: sociosList,
        enderecoSocioPrincipal: endPrincipal,
        etapa: targetEtapa, // Ensures stage never regresses
        historicoEtapas: updatedHistory
      });

      setWorkspaceSuccess(`Ficha Cadastral dos Sócios e Endereço atualizados! (Etapa: ${targetEtapa})`);
      safeRefreshLeads();
    } catch (err) {
      console.error(err);
      setWorkspaceError("Erro ao salvar dados dos sócios.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // TAB 3: Save negotiated proposal to Firestore
  const handleSaveProposalToLead = async () => {
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setWorkspaceLoading(true);

    try {
      const { totalJuros, totalPago, parcelaInicial, parcelaFinal } = calculateSchedule();

      const prevEtapa = lead.etapa || 1;
      const targetEtapa = Math.max(prevEtapa, 5);
      const newHistoryItem = {
        data: new Date().toISOString(),
        etapaAnterior: prevEtapa,
        etapaNova: targetEtapa,
        autor: "Parceiro",
        detalhes: `Proposta de fomento de ${formatCurrencyBRL(advValor)} vinculada e emitida com sucesso.`
      };
      const updatedHistory = lead.historicoEtapas 
        ? [...lead.historicoEtapas, newHistoryItem]
        : [newHistoryItem];

      const leadRef = doc(db, "leads", lead.id);
      await updateDoc(leadRef, {
        limiteEstimado: advValor, // Update to negotiated limit
        etapa: targetEtapa, // Advanced to stage 5 or maintains higher stage
        historicoEtapas: updatedHistory,
        creditLineCode: advCreditLineCode,
        creditLineName: advCreditLineName,
        propostaNegociada: {
          valorDesejado: advValor,
          carenciaMeses: advCarencia,
          amortizacaoMeses: advPrazoAmortizacao,
          sistemaAmortizacao: advAmortizacao,
          taxaAnual: advTaxaAnual,
          pagarJurosCarencia: advPagarJurosCarencia,
          parcelaInicial,
          parcelaFinal,
          totalJuros,
          totalPago,
          creditLineCode: advCreditLineCode,
          creditLineName: advCreditLineName,
          dataSimulacao: new Date().toISOString()
        }
      });

      setWorkspaceSuccess("Proposta comercial vinculada ao lead com sucesso! Etapa avançada para: 5. Proposta Emitida.");
      safeRefreshLeads();
    } catch (err) {
      console.error(err);
      setWorkspaceError("Erro ao vincular a proposta.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // TAB 3: Copy WhatsApp message
  const copyLeadProposalToClipboard = () => {
    const { totalJuros, totalPago, parcelaInicial, parcelaFinal } = calculateSchedule();
    
    const message = `*Olá, ${editNome}! Segue a proposta exclusiva de crédito governamental (${advCreditLineName}) para a ${editRazaoSocial}:*

💰 *Valor de Fomento:* ${formatCurrencyBRL(advValor)}
⏱ *Carência:* ${advCarencia} meses
🗓 *Prazo de Amortização:* ${advPrazoAmortizacao} meses
📊 *Amortização:* Tabela ${advAmortizacao}
📈 *Taxa Estimada:* ~${advTaxaAnual}% ao ano (Subsidiada de fomento)

📉 *Parcela Inicial:* ${formatCurrencyBRL(parcelaInicial)}
📉 *Parcela Final:* ${formatCurrencyBRL(parcelaFinal)}
💵 *Custo de Juros:* ${formatCurrencyBRL(totalJuros)}
💸 *Custo Total de Pagamento:* ${formatCurrencyBRL(totalPago)}

_Proposta válida sujeita à análise de mesa. Vamos prosseguir com as assinaturas da ficha de crédito?_`;

    navigator.clipboard.writeText(message);
    setCopiedProposalReport(true);
    setTimeout(() => setCopiedProposalReport(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 transition-all">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900/95 text-white w-full max-w-5xl rounded-3xl shadow-2xl border border-emerald-900/50 backdrop-blur-xl overflow-hidden flex flex-col max-h-[90vh] text-left relative"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 text-white p-6 border-b border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                Mesa de Operações &bull; Espaço IA
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ID: {lead.id}
              </span>
            </div>
            <h3 className="font-display font-extrabold text-xl mt-1.5 text-white">
              {lead.razaoSocial || lead.nome}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Capturado por: <span className="text-emerald-300 font-medium">{lead.parceiroNome || "Você"}</span>
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 active:bg-emerald-800 border border-emerald-800/80 text-emerald-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-sm relative z-10"
          >
            <X className="w-4 h-4 text-emerald-400" />
            Fechar Espaço
          </button>
        </div>

        {/* 8-Step Timeline Component */}
        <LeadStepTimeline
          currentEtapa={lead.etapa || 1}
          activeTab={workspaceTab}
          onSelectStep={(step, tab) => {
            handleTabClick(tab as any);
          }}
        />

        {/* Navigation Tabs */}
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 md:px-6 flex items-center overflow-x-auto gap-1 backdrop-blur-md text-xs font-extrabold scrollbar-none shrink-0 min-h-[52px]">
          <button
            type="button"
            onClick={() => handleTabClick("concierge")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              workspaceTab === "concierge"
                ? "border-[#00A86B] text-[#00A86B] bg-[#00A86B]/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            title="Visão Concierge do lead"
          >
            <Bookmark className="w-4 h-4 text-[#00A86B]" />
            Concierge
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("details")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              workspaceTab === "details"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-4 h-4 text-emerald-400" />
            Passo 1: Dados CNPJ
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("socios")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              workspaceTab === "socios"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : stepStatus.isTabUnlocked("socios")
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 opacity-60 cursor-not-allowed"
            }`}
            title={stepStatus.isTabUnlocked("socios") ? "Passo 2: Sócios" : (stepStatus.getLockedReason("socios") || "Bloqueado")}
          >
            {stepStatus.isTabUnlocked("socios") ? (
              <Users className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500/90" />
            )}
            Passo 2: Sócios
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("diagnostico")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              workspaceTab === "diagnostico"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : stepStatus.isTabUnlocked("diagnostico")
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 opacity-60 cursor-not-allowed"
            }`}
            title={stepStatus.isTabUnlocked("diagnostico") ? "Passo 3: Consulta Diagnóstica" : (stepStatus.getLockedReason("diagnostico") || "Bloqueado")}
          >
            {stepStatus.isTabUnlocked("diagnostico") ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500/90" />
            )}
            Passo 3: Consulta Diagnóstica
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("contrato")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              workspaceTab === "contrato"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : stepStatus.isTabUnlocked("contrato")
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 opacity-60 cursor-not-allowed"
            }`}
            title={stepStatus.isTabUnlocked("contrato") ? "Passo 4: Termos & Contratos" : (stepStatus.getLockedReason("contrato") || "Bloqueado")}
          >
            {stepStatus.isTabUnlocked("contrato") ? (
              <FileText className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500/90" />
            )}
            Passo 4: Termos & Contratos
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("credenciais")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              workspaceTab === "credenciais"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : stepStatus.isTabUnlocked("credenciais")
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 opacity-60 cursor-not-allowed"
            }`}
            title={stepStatus.isTabUnlocked("credenciais") ? "Passo 5: Senhas & Certificado A1" : (stepStatus.getLockedReason("credenciais") || "Bloqueado")}
          >
            {stepStatus.isTabUnlocked("credenciais") ? (
              <Key className="w-4 h-4 text-amber-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500/90" />
            )}
            Passo 5: Senhas & Certificado A1
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("simulador")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              workspaceTab === "simulador"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : stepStatus.isTabUnlocked("simulador")
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 opacity-60 cursor-not-allowed"
            }`}
            title={stepStatus.isTabUnlocked("simulador") ? "Passo 6: Estruturação" : (stepStatus.getLockedReason("simulador") || "Bloqueado")}
          >
            {stepStatus.isTabUnlocked("simulador") ? (
              <Calculator className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500/90" />
            )}
            Passo 6: Estruturação
            {lead.fichaRatingCredito?.pastaDocumentosUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Pasta de documentos informada" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("apta_bancaria")}
            className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              workspaceTab === "apta_bancaria"
                ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
                : stepStatus.isTabUnlocked("apta_bancaria")
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-600 opacity-60 cursor-not-allowed"
            }`}
            title={stepStatus.isTabUnlocked("apta_bancaria") ? "Passo 7: Apta para Solicitação" : (stepStatus.getLockedReason("apta_bancaria") || "Bloqueado")}
          >
            {stepStatus.isTabUnlocked("apta_bancaria") ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500/90" />
            )}
            Passo 7: Apta para Solicitação
          </button>



          {/* Dossiê Rating Comercial (Exclusivo ADM) */}
          {isAdminUser && (
            <button
              type="button"
              onClick={() => handleTabClick("rating_adm")}
              className={`py-3.5 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                workspaceTab === "rating_adm"
                  ? "border-amber-400 text-amber-300 bg-amber-500/10 font-bold"
                  : "border-transparent text-amber-400/80 hover:text-amber-300"
              }`}
              title="Dossiê de Rating Comercial CPF/CNPJ (Exclusivo Administrador)"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Dossiê Rating (ADM)</span>
              {lead.fichaRatingCredito?.dadosPreenchidos && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-slate-900">
          
          {(lead.pendencias?.status === "pendente" || lead.pendente) && (
            <div className="bg-amber-50 border-2 border-amber-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-start gap-4">
              <div className="bg-amber-100 p-2.5 rounded-xl text-amber-800 shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-700 animate-bounce" />
              </div>
              <div className="space-y-3 flex-1 w-full">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    ⚠️ PENDÊNCIA IDENTIFICADA PELA MESA DE OPERAÇÕES
                  </h4>
                  <p className="text-xs text-amber-800 font-bold leading-relaxed">
                    Este lead possui pendências de documentação ou perfil cadastral pendentes de regularização. Por favor, utilize o chat abaixo para responder à Mesa de Operações e acelerar a aprovação.
                  </p>
                </div>

                {/* Chat de Conversa com a Mesa de Operações */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3 text-left shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      💬 Conversa com a Mesa de Operações
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                      {lead.pendencias?.historico?.length || (lead.pendencias?.mensagem || lead.pendenciaDescricao ? 1 : 0)} mensagem(ns)
                    </span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {/* Exibe o histórico de mensagens estilo chat */}
                    {lead.pendencias?.historico && lead.pendencias.historico.length > 0 ? (
                      lead.pendencias.historico.map((item, idx) => {
                        const isAdmin = item.autor === "admin";
                        return (
                          <div
                            key={item.id || idx}
                            className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                          >
                            <div
                              className={`max-w-[88%] p-3 rounded-2xl text-xs space-y-1 shadow-sm ${
                                isAdmin
                                  ? "bg-amber-500/20 border border-amber-500/30 text-amber-100 rounded-tl-xs"
                                  : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-tr-xs"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                  isAdmin ? "bg-amber-500/30 text-amber-300" : "bg-emerald-500/30 text-emerald-300"
                                }`}>
                                  {isAdmin ? "🏛️ Mesa de Operações" : `👤 Você (${item.nomeAutor || "Parceiro"})`}
                                </span>
                                {item.data && (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {new Date(item.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                )}
                              </div>
                              <p className="font-medium leading-relaxed whitespace-pre-wrap text-slate-100">
                                {item.mensagem}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-start">
                        <div className="max-w-[88%] bg-amber-500/20 border border-amber-500/30 p-3 rounded-2xl rounded-tl-xs text-xs text-amber-100 space-y-1">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-300">
                            🏛️ Mesa de Operações
                          </span>
                          <p className="font-medium leading-relaxed whitespace-pre-wrap text-slate-100">
                            {lead.pendencias?.mensagem || lead.pendenciaDescricao || "Por favor, verifique a pendência cadastral com a equipe."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Responder / Enviar mensagem no Chat */}
                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-3 mt-3 text-left">
                  <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">
                    💬 Responder ou Enviar Mensagem para a Mesa de Operações:
                  </span>
                  <textarea
                    rows={3}
                    value={partnerReply}
                    onChange={(e) => setPartnerReply(e.target.value)}
                    placeholder="Escreva sua resposta, justificativa ou anexo de informação para a Mesa de Operações..."
                    className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-hidden bg-slate-50/50 text-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSavePartnerReply}
                      disabled={savingPartnerReply || !partnerReply.trim()}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingPartnerReply ? "Enviando..." : "💬 Enviar Mensagem no Chat"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {workspaceError && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{workspaceError}</span>
            </div>
          )}

          {workspaceSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{workspaceSuccess}</span>
            </div>
          )}

          {!stepStatus.isTabUnlocked(workspaceTab) ? (
            <div className="bg-slate-950/90 border border-amber-500/30 rounded-3xl p-8 text-center space-y-4 my-6 shadow-2xl">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-base font-extrabold text-white">Etapa Bloqueada no Fluxo do Lead</h3>
                <p className="text-xs text-amber-300 font-bold leading-relaxed">
                  {stepStatus.getLockedReason(workspaceTab)}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Para liberar esta etapa, retorne aos passos anteriores no menu superior e garanta que todas as informações obrigatórias foram salvas no Firestore.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTabClick("details")}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  Ir para Passo 1: Dados CNPJ
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB: Concierge B2B — visão do consultor */}
              {workspaceTab === "concierge" && (
                <LeadConciergeTracker lead={lead} />
              )}

              {/* TAB 1: Company details */}
          {workspaceTab === "details" && (
            <form onSubmit={handleSaveWorkspaceCompanyDetails} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="font-display font-extrabold text-sm text-[#0A3D2E] uppercase tracking-wider border-b border-slate-100 pb-2">
                  📋 Editar Dados Cadastrais da Empresa
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Razão Social *</label>
                    <input
                      type="text"
                      value={editRazaoSocial}
                      onChange={(e) => setEditRazaoSocial(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">CNPJ *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editCnpj}
                        onChange={(e) => setEditCnpj(formatCNPJ(e.target.value))}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E] pr-10"
                        required
                      />
                      {isConsultingCnpj && (
                        <div className="absolute right-3 top-3 flex items-center">
                          <Loader2 className="w-4 h-4 text-[#0A3D2E] animate-spin" />
                        </div>
                      )}
                    </div>
                    {cnpjInfoMessage && (
                      <p className="text-[10px] font-extrabold mt-1 text-emerald-800 leading-tight">
                        {cnpjInfoMessage}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Nome do Contato *</label>
                    <input
                      type="text"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">WhatsApp *</label>
                    <input
                      type="text"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(formatPhone(e.target.value))}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">E-mail *</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Ramo de Atividade *</label>
                    <input
                      type="text"
                      value={editRamo}
                      onChange={(e) => setEditRamo(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Porte da Empresa *</label>
                    <select
                      value={editPorte}
                      onChange={(e) => setEditPorte(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    >
                      <option value="MEI">MEI (Microfaturamento Individual)</option>
                      <option value="ME">ME (Microempresa)</option>
                      <option value="EPP">EPP (Empresa de Pequeno Porte)</option>
                      <option value="Médio">Médio / Grande Porte</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Banco de Preferência *</label>
                    <select
                      value={editBancoPrincipal}
                      onChange={(e) => setEditBancoPrincipal(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    >
                      <option value="Banco do Brasil">Banco do Brasil</option>
                      <option value="Caixa Econômica">Caixa Econômica Federal</option>
                      <option value="Itaú">Itaú Unibanco</option>
                      <option value="Bradesco">Bradesco</option>
                      <option value="Santander">Santander</option>
                      <option value="Sicoob">Sicoob</option>
                      <option value="Sicredi">Sicredi</option>
                      <option value="Outro">Outro Banco Homologado</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editMenosDe12Meses}
                      onChange={(e) => setEditMenosDe12Meses(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0A3D2E]"
                    />
                    <span className="text-xs font-extrabold text-[#0A3D2E]">
                      Empresa aberta há menos de 12 meses? (Regra {advCreditLineCode} Proporcional)
                    </span>
                  </label>

                  {editMenosDe12Meses ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 block">Capital Social (R$) *</label>
                        <input
                          type="number"
                          value={editCapitalSocial}
                          onChange={(e) => setEditCapitalSocial(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl"
                          required={editMenosDe12Meses}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 block">Média de Receita Mensal (R$) *</label>
                        <input
                          type="number"
                          value={editMediaReceitaMensal}
                          onChange={(e) => setEditMediaReceitaMensal(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl"
                          required={editMenosDe12Meses}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Faturamento Anual Declarado (R$) *</label>
                      <input
                        type="number"
                        value={editFaturamento}
                        onChange={(e) => setEditFaturamento(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl"
                        required={!editMenosDe12Meses}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="font-display font-extrabold text-sm text-[#0A3D2E] uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>💎 Análise de Elegibilidade e Enquadramento ({advCreditLineCode})</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-black font-mono">
                    {advCreditLineCode}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black">Previsão de Crédito Máximo</span>
                    <div className="text-lg font-black text-[#0A3D2E]">
                      {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Sob Análise"}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black">Perfil de Aprovação</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                        lead.nivelPreparacao === "alto" ? "bg-emerald-100 text-emerald-800" :
                        lead.nivelPreparacao === "medio" ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {lead.nivelPreparacao || "ALTO"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black">Situação de Cadastro</span>
                    <div className="text-xs font-extrabold text-emerald-800 flex items-center gap-1 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Regularizada / Ativa
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={workspaceLoading}
                  className="px-6 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {workspaceLoading ? "Salvando..." : "Salvar Alterações do Passo 1"}
                </button>

                <button
                  type="button"
                  onClick={() => setWorkspaceTab("socios")}
                  className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-[#0A3D2E] border border-emerald-200 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Avançar para Passo 2: Sócios</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

        {/* TAB 4: Contratos e Assinatura Eletrônica */}
        {workspaceTab === "contrato" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-display font-extrabold text-sm text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Passo 4: Termos e Contratos de Prestação de Serviços
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Acompanhe o status e a assinatura digital do contrato de prestação de serviços e termo de honorários.
                  </p>
                </div>
                <div>
                  {lead.contratoAssinado ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Assinado Digitalmente
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Pendente de Assinatura
                    </span>
                  )}
                </div>
              </div>

              {lead.contratoAssinado ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div className="space-y-1.5 text-slate-700">
                    <p><strong className="text-slate-900">Signatário:</strong> {lead.contratoAssinadoNome}</p>
                    <p><strong className="text-slate-900">CPF:</strong> {lead.contratoAssinadoCpf}</p>
                    <p><strong className="text-slate-900">IP de Origem:</strong> {lead.contratoAssinadoIp}</p>
                    <p><strong className="text-slate-900">Data/Hora:</strong> {lead.contratoAssinadoData}</p>
                    <p className="text-[10px] text-slate-400 font-mono leading-tight">
                      Dispositivo: {lead.contratoAssinadoDispositivo}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-between border-l border-slate-200/60 pl-4">
                    <div className="space-y-1 w-full">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rubrica digital:</p>
                      <div className="border border-slate-200 rounded-lg bg-white p-2 h-16 w-full flex items-center justify-center">
                        <img src={lead.contratoAssinadoDesenho} alt="Assinatura" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePdfTab("contrato");
                        setShowContractPdfModal(true);
                      }}
                      className="mt-3 w-full py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Visualizar Contrato / Gerar PDF</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-5 rounded-xl border border-dashed border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-500 max-w-md">
                    O cliente assina este termo eletronicamente no link de acompanhamento no <strong className="text-slate-700">Passo 4</strong>. Você pode também visualizar e imprimir a minuta completa.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePdfTab("contrato");
                      setShowContractPdfModal(true);
                    }}
                    className="py-2.5 px-4 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visualizar Minuta do Contrato</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWorkspaceTab("credenciais")}
                  className="px-5 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Avançar para Passo 5: Senhas & Certificado A1</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Credenciais (Senhas GOV, Serasa e Certificado Digital A1) */}
        {workspaceTab === "credenciais" && (
          <form onSubmit={handleSaveCredenciais} className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="font-display font-extrabold text-sm text-[#0A3D2E] uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Key className="w-5 h-5 text-amber-500" />
                Passo 5: Recolhimento de Senha GOV, Serasa e Certificado Digital A1
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Forneça as credenciais de acesso do cliente para extração do faturamento e-CAC, verificação de pendências no Serasa e geração de dossiê do certificado A1.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GOV.BR */}
                <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                    Acesso Gov.br (e-CAC)
                  </span>
                  <div className="space-y-2 mt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">CPF / Usuário Gov.br</label>
                      <input
                        type="text"
                        value={govbrLogin}
                        onChange={(e) => setGovbrLogin(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Senha Gov.br</label>
                      <input
                        type="text"
                        value={govbrSenha}
                        onChange={(e) => setGovbrSenha(e.target.value)}
                        placeholder="Senha gov.br"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      />
                    </div>
                  </div>
                </div>

                {/* SERASA */}
                <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                    Acesso SERASA Experian
                  </span>
                  <div className="space-y-2 mt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">CPF / CNPJ / Usuário SERASA</label>
                      <input
                        type="text"
                        value={serasaLogin}
                        onChange={(e) => setSerasaLogin(e.target.value)}
                        placeholder="Login do Serasa"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Senha SERASA</label>
                      <input
                        type="text"
                        value={serasaSenha}
                        onChange={(e) => setSerasaSenha(e.target.value)}
                        placeholder="Senha serasa"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      />
                    </div>
                  </div>
                </div>

                {/* CERTIFICADO DIGITAL A1 */}
                <div className="md:col-span-2 space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                    Certificado Digital A1
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Senha do Certificado A1</label>
                      <input
                        type="text"
                        value={certificadoSenha}
                        onChange={(e) => setCertificadoSenha(e.target.value)}
                        placeholder="Senha do certificado"
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#0A3D2E]"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Arquivo do Certificado Digital (.pfx / .p12)</label>
                      <div className="relative flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pfx,.p12"
                          onChange={handleCertificadoFileChange}
                          className="hidden"
                          id="cert-file-input"
                        />
                        <label
                          htmlFor="cert-file-input"
                          className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl hover:border-[#0A3D2E] transition-all flex items-center justify-between cursor-pointer font-medium text-slate-600 truncate"
                        >
                          <span className="truncate">{certificadoFileName || "Selecionar arquivo..."}</span>
                          <FileText className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                        </label>

                        {certificadoFileBase64 && (
                          <a
                            href={certificadoFileBase64}
                            download={certificadoFileName || "certificado.pfx"}
                            className="p-2.5 bg-[#0A3D2E]/5 text-[#0A3D2E] hover:bg-[#0A3D2E] hover:text-white rounded-xl transition-all"
                            title="Baixar Certificado"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={workspaceLoading}
                  className="px-6 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {workspaceLoading ? "Salvando..." : "Salvar Credenciais e Avançar"}
                </button>

                <button
                  type="button"
                  onClick={() => setWorkspaceTab("simulador")}
                  className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-[#0A3D2E] border border-emerald-200 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Ir para Passo 6: Estruturação</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        )}

          {/* TAB 2: Socios cadastral */}
          {workspaceTab === "socios" && (
            <form onSubmit={handleSaveWorkspaceSocios} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="font-display font-extrabold text-sm text-[#0A3D2E] uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  1. Sócio Administrador Principal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Nome Completo *</label>
                    <input
                      type="text"
                      value={editSocio1Nome}
                      onChange={(e) => setEditSocio1Nome(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">CPF *</label>
                    <input
                      type="text"
                      value={editSocio1Cpf}
                      onChange={(e) => setEditSocio1Cpf(formatCPF(e.target.value))}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">Data de Nascimento *</label>
                    <input
                      type="date"
                      value={editSocio1Birth}
                      onChange={(e) => setEditSocio1Birth(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Socio 2 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-display font-extrabold text-sm text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    2. Segundo Sócio (Opcional)
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editHasSocio2}
                      onChange={(e) => setEditHasSocio2(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0A3D2E]"
                    />
                    <span className="text-xs font-bold text-[#0A3D2E]">Incluir segundo sócio?</span>
                  </label>
                </div>

                {editHasSocio2 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Nome Completo *</label>
                      <input
                        type="text"
                        value={editSocio2Nome}
                        onChange={(e) => setEditSocio2Nome(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        required={editHasSocio2}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">CPF *</label>
                      <input
                        type="text"
                        value={editSocio2Cpf}
                        onChange={(e) => setEditSocio2Cpf(formatCPF(e.target.value))}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        required={editHasSocio2}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Data de Nascimento *</label>
                      <input
                        type="date"
                        value={editSocio2Birth}
                        onChange={(e) => setEditSocio2Birth(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        required={editHasSocio2}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={workspaceLoading}
                  className="px-6 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-50"
                >
                  {workspaceLoading ? "Salvando..." : "Salvar Ficha dos Sócios"}
                </button>
              </div>
            </form>
          )}

          {/* TAB: Consulta & Diagnóstico PROSFEC IA */}
          {workspaceTab === "diagnostico" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-display font-extrabold text-sm text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-[#00A86B]" />
                    Consulta & Diagnóstico PROSFEC IA
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Consulte o histórico de relatórios de crédito e gere diagnósticos comerciais estratégicos guiados pela inteligência da PROSFEC.
                  </p>
                </div>
              </div>

              {/* Grid 1: Documents & Run Credit query */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Document reference & Direct Consultation console */}
                <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <div>
                    <h5 className="font-extrabold text-xs text-[#0A3D2E] uppercase tracking-wider mb-2.5 flex items-center gap-1">
                      📌 Documentos de Referência (Lead)
                    </h5>
                    <div className="space-y-2">
                      {lead.cnpj && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">CNPJ da Empresa</span>
                            <span className="text-xs font-mono font-extrabold text-slate-700 block truncate">{lead.cnpj}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(lead.cnpj);
                              setLocalQuerySuccess("CNPJ copiado!");
                              setTimeout(() => setLocalQuerySuccess(null), 1500);
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 transition-all cursor-pointer"
                            title="Copiar CNPJ"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {lead.socios && lead.socios.map((socio, idx) => (
                        socio.cpf && (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase block">CPF - Sócio ({socio.nome || idx+1})</span>
                              <span className="text-xs font-mono font-extrabold text-slate-700 block truncate">{socio.cpf}</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(socio.cpf);
                                setLocalQuerySuccess(`CPF de ${socio.nome || "Sócio"} copiado!`);
                                setTimeout(() => setLocalQuerySuccess(null), 1500);
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              title="Copiar CPF"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Execute query block */}
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <h5 className="font-extrabold text-xs text-[#0A3D2E] uppercase tracking-wider">
                      ⚡ Executar Nova Consulta de Crédito
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      Consulte novos dados do SERASA ou órgãos diretamente debitando do seu Saldo Geral.
                    </p>

                    <div className="space-y-2.5">
                      {/* Document Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Documento p/ Consulta</label>
                        <select
                          value={selectedQueryDocument}
                          onChange={(e) => setSelectedQueryDocument(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                        >
                          {lead.cnpj && (
                            <option value={lead.cnpj}>CNPJ Empresa: {lead.cnpj}</option>
                          )}
                          {lead.socios && lead.socios.map((socio, idx) => (
                            socio.cpf && (
                              <option key={idx} value={socio.cpf}>CPF Sócio ({socio.nome || idx+1}): {socio.cpf}</option>
                            )
                          ))}
                          <option value="">-- Digitar Manualmente --</option>
                        </select>
                      </div>

                      {!selectedQueryDocument && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">CPF ou CNPJ Manual</label>
                          <input
                            type="text"
                            placeholder="Apenas números"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl"
                            onChange={(e) => setSelectedQueryDocument(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Product Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Consulta de Crédito Integrada</label>
                        {localCatalog.length > 1 ? (
                          <select
                            value={selectedProductCode}
                            onChange={(e) => setSelectedProductCode(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden text-ellipsis overflow-hidden font-medium text-slate-700"
                          >
                            {localCatalog.map((prod) => {
                              const priceVal = typeof prod.price === "number" ? prod.price : (typeof prod.partner_price === "number" ? prod.partner_price : 69.86);
                              return (
                                <option key={prod.code} value={prod.code}>
                                  {prod.name} (R$ {priceVal.toFixed(2).replace(".", ",")})
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div className="w-full text-xs px-3 py-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-2">
                            <span className="font-bold text-[#0A3D2E] truncate">
                              Rating + Diagnóstico Financeiro 360
                            </span>
                            <span className="font-mono font-black text-emerald-800 text-[11px] shrink-0 bg-white px-2 py-0.5 rounded-lg border border-emerald-200/50">
                              R$ {(localCatalog[0]?.price || 69.86).toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleExecuteLocalQuery}
                        disabled={executingLocalQuery || !selectedQueryDocument}
                        className="w-full py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {executingLocalQuery ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Processando Consulta...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Confirmar & Executar Consulta
                          </>
                        )}
                      </button>

                      {localQueryError && (
                        <div className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                          {localQueryError}
                        </div>
                      )}

                      {localQuerySuccess && (
                        <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                          {localQuerySuccess}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consultations List */}
                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-xs text-[#0A3D2E] uppercase tracking-wider">
                      📊 Relatórios e Consultas Efetuadas
                    </h5>
                    <span className="text-[10px] font-mono text-slate-400">
                      Total: {leadConsultas.length} relatórios
                    </span>
                  </div>

                  {loadingConsultas ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-[#00A86B]" />
                      <span className="text-xs">Sincronizando relatórios com o banco de dados...</span>
                    </div>
                  ) : leadConsultas.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2 bg-slate-50/50">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-xs font-extrabold text-slate-500">Nenhum relatório encontrado</div>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                        Para gerar o diagnóstico inteligente PROSFEC IA, execute uma ou mais consultas ao lado para o CNPJ do lead ou CPFs dos sócios.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {leadConsultas.map((consulta) => (
                        <div key={consulta.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded-sm uppercase font-mono tracking-wider">
                                {consulta.produto_code}
                              </span>
                              <h6 className="font-extrabold text-xs text-slate-800 mt-1">
                                {consulta.produto_nome}
                              </h6>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(consulta.dataConsulta).toLocaleString("pt-BR")}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <span className="font-bold">Doc consultado:</span>
                            <span className="font-mono">{consulta.documento}</span>
                          </div>

                          {/* Quick summary metrics */}
                          {consulta.resultado && (() => {
                            const res = consulta.resultado;
                            const redebeData = Array.isArray(res) ? res[0]?.RedeBE || res[0] : (res?.RedeBE || res);
                            const resumo = redebeData?.resumo || {};
                            const serasaResumo = redebeData?.complementar?.serasa?.RedeBE?.resumo || {};
                            const cadinResumo = redebeData?.complementar?.cadin || {};

                            const scoreVal = resumo?.score || resumo?.score_motor_credito || resumo?.score_analise || "Sucesso";
                            const ratingVal = resumo?.rating || resumo?.faixa_score || "";

                            const pendFinancCount = Number(resumo?.quantidade_restricoes_financeiras || resumo?.quantidade_pendencias_financeiras || serasaResumo?.quantidade_pendencias_financeiras || 0);
                            const protestosCount = Number(resumo?.quantidade_protestos || 0);
                            const protestoNacCount = Number(resumo?.quantidade_protesto_nacional || 0);
                            const cadinCount = Number(cadinResumo?.QUANTIDADE_OCORRENCIAS || resumo?.quantidade_cadin || 0);
                            const ccfCount = Number(resumo?.quantidade_ccf_bacen || 0);
                            const hasScrPrejuizo = Boolean(resumo?.scr_prejuizo && resumo?.scr_prejuizo !== "0,00" && resumo?.scr_prejuizo !== "0");

                            const rawOcorrencias = 
                              redebeData?.retorno?.principal?.CREDCADASTRAL?.RESTRICOES_FINANCEIRAS?.OCORRENCIAS ||
                              redebeData?.retorno?.principal?.CREDCADASTRAL?.PEND_FINANCEIRAS?.OCORRENCIAS ||
                              [];
                            const ocorrenciasCount = Array.isArray(rawOcorrencias) ? rawOcorrencias.length : 0;

                            const totalPendenciasCount = Math.max(
                              pendFinancCount + protestosCount + protestoNacCount + cadinCount + ccfCount + (hasScrPrejuizo ? 1 : 0),
                              ocorrenciasCount
                            );

                            const valorPendencias = resumo?.valor_total_restricoes_financeiras || resumo?.valor_total_pendencias_financeiras || "";

                            return (
                              <div className="space-y-2">
                                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-100 text-[10px] text-slate-700 grid grid-cols-2 gap-2 font-medium">
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase font-black block">Score / Rating</span>
                                    <span className="font-extrabold text-emerald-800">
                                      {scoreVal} {ratingVal ? `(Rating ${ratingVal})` : ""}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase font-black block">Pendências Financeiras</span>
                                    <span className={`font-extrabold ${totalPendenciasCount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                      {totalPendenciasCount > 0 ? `${totalPendenciasCount} pendência(s)` : "Nenhuma Ativa"}
                                      {totalPendenciasCount > 0 && valorPendencias && ` - ${valorPendencias}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: PROSFEC IA DIAGNOSTIC ENGINE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-display font-black text-sm text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                        Diagnóstico de Soluções Inteligentes PROSFEC IA
                      </h5>
                      <p className="text-[10px] text-slate-500">
                        Diagnóstico automático focado exclusivamente nos serviços de reestruturação administrativa, elevação de rating e score da PROSFEC.
                      </p>
                    </div>

                    {diagnosticoPROSFEC ? (
                      <div className="flex items-center gap-2">
                        <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Diagnóstico IA Concluído</span>
                        </div>
                        {((diagnosticoPROSFEC as any)?.geracoesCount || (lead as any)?.diagnosticoGeracoesCount || 1) >= 2 ? (
                          <button
                            disabled
                            title="O diagnóstico de IA já foi refeito 1 vez. Limite máximo de reanálises atingido para este lead."
                            className="px-3 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-75 shadow-2xs"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Refazer Bloqueado (1/1 usado)</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleGeneratePROSFECDiagnostico}
                            disabled={generatingDiagnostico || !canGenerateDiagnostico}
                            title="Refazer a análise da IA com novos dados das consultas de crédito (permitido 1 única vez)"
                            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${generatingDiagnostico ? "animate-spin" : ""}`} />
                            <span>{generatingDiagnostico ? "Atualizando..." : "Refazer Diagnóstico"}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={handleGeneratePROSFECDiagnostico}
                        disabled={generatingDiagnostico || !canGenerateDiagnostico}
                        title={
                          !canGenerateDiagnostico
                            ? "Execute as consultas de crédito de CNPJ e CPF no painel ao lado para liberar o Diagnóstico IA"
                            : "Gerar Diagnóstico pela PROSFEC IA"
                        }
                        className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                          !canGenerateDiagnostico || generatingDiagnostico
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                            : "bg-gradient-to-r from-[#0A3D2E] to-[#00A86B] hover:from-[#00A86B] hover:to-[#0A3D2E] text-white cursor-pointer"
                        }`}
                      >
                        {generatingDiagnostico ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Gerando Diagnóstico...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            Gerar Diagnóstico pela PROSFEC IA
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {!canGenerateDiagnostico && !generatingDiagnostico && (
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          {!hasCnpjQuery && !hasCpfQuery
                            ? "O Diagnóstico IA exige que as consultas de crédito do CNPJ e de ao menos um CPF de sócio sejam executadas antes."
                            : !hasCnpjQuery
                            ? "Pendente: Realize a consulta de crédito do CNPJ da empresa no painel ao lado para liberar a IA."
                            : "Pendente: Realize a consulta de crédito de ao menos um CPF de sócio no painel ao lado para liberar a IA."}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${hasCnpjQuery ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 border border-rose-200"}`}>
                          CNPJ {hasCnpjQuery ? "✓ Realizada" : "Pendente"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${hasCpfQuery ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 border border-rose-200"}`}>
                          CPF {hasCpfQuery ? "✓ Realizada" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {generatingDiagnostico ? (
                  <div className="py-16 text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#00A86B] mx-auto" />
                    <div className="text-xs font-extrabold text-[#0A3D2E] uppercase tracking-wider">
                      O Motor de Inteligência de Crédito está estruturando o plano administrativo...
                    </div>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                      Compilando as consultas de crédito realizadas, cruzando com os dados cadastrais e escrevendo uma resposta comercial focada no que a PROSFEC pode fazer para sanear esta empresa.
                    </p>
                  </div>
                ) : diagnosticoPROSFEC ? (
                  <div className="space-y-6">
                    {/* Visualização de Alto Padrão Fintech do Diagnóstico PROSFEC IA */}
                    <div className="p-6 bg-white border border-slate-200/90 rounded-2xl relative space-y-4 shadow-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-100 pb-2.5">
                        <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          RESULTADO DA PERÍCIA E DIAGNÓSTICO PROSFEC IA
                        </span>
                        <span className="font-mono text-slate-500">
                          Gerado em: {new Date(diagnosticoPROSFEC.dataGeracao).toLocaleString("pt-BR")}
                        </span>
                      </div>

                      <FintechDiagnosisView
                        lead={lead}
                        diagnostico={diagnosticoPROSFEC}
                        consultas={leadConsultas}
                        renderMarkdownContent={renderMarkdown}
                      />
                    </div>

                    {/* Recommended Services Pricing Block (Admin Editable) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            Serviços Recomendados & Precificação (Cobrados Separadamente)
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            A assessoria sobre o crédito é de <strong>5% exclusivamente sobre o valor liberado</strong>. Serviços operacionais de sanear o perfil são cobrados à parte.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAdminUser ? (
                            <button
                              type="button"
                              onClick={() => handleSaveServicos()}
                              disabled={savingServicos}
                              className="px-3.5 py-1.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                            >
                              {savingServicos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Salvar Preços dos Serviços
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                              🔒 Alteração de valores restrita ao ADM
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Admin notice banner */}
                      <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${isAdminUser ? "bg-emerald-50 text-emerald-800 border border-emerald-150" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                        <ShieldCheck className={`w-4 h-4 shrink-0 ${isAdminUser ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className="font-medium">
                          {isAdminUser 
                            ? "✏️ Você está logado como ADM: Você possui permissão exclusiva para alterar os valores dos serviços, incluir ou remover itens da precificação deste lead."
                            : "🔒 Visualização restrita: Os valores abaixo foram atribuídos pelo sistema e somente o Administrador (ADM) pode editá-los."}
                        </span>
                      </div>

                      {/* List of recommended services */}
                      {servicosRecomendados.length === 0 ? (
                        <div className="p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-xs text-emerald-800 flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-extrabold block">Perfil Adequado — Sem Serviços Adicionais Necessários</span>
                            <span className="text-[11px] text-emerald-700">O diagnóstico da IA indicou que este cliente possui perfil saudável para seguir diretamente para a Proposta de Crédito (comissão de 5% sobre o valor liberado).</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {servicosRecomendados.map((serv, sIdx) => (
                            <div key={serv.id || sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all">
                              <div className="flex-1 space-y-0.5">
                                <span className="font-extrabold text-xs text-slate-800 block">
                                  {serv.nome}
                                </span>
                                {serv.justificativa && (
                                  <span className="text-[11px] text-slate-500 block">
                                    💡 {serv.justificativa}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {(() => {
                                  const isDemand = isDemandAccountingService(serv);
                                  const rawPrice = typeof serv.valor === "number" ? serv.valor : typeof serv.preco === "number" ? serv.preco : parseFloat(serv.valor || serv.preco || 0);
                                  const hasCost = !isNaN(rawPrice) && rawPrice > 0;
                                  const isZeroCost = isServiceWithoutUpfrontCost(serv) || !hasCost;

                                  if (isZeroCost) {
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        {isDemand ? (
                                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-800 border-indigo-200">
                                            📋 Serviços Contratados por demanda
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-blue-50 text-blue-800 border-blue-200 flex items-center gap-1">
                                            🎯 Sem Custo Inicial (Remuneração no Êxito)
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }

                                  const isPaid = serv.statusPagamento === "pago" || serv.pago === true;
                                  const hublaUrl = !isPaid ? getHublaLinkForService(serv, lead, catalogServices) : null;
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      {isDemand && (
                                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-800 border-indigo-200">
                                          📋 Serviços Contratados por demanda
                                        </span>
                                      )}
                                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border ${
                                        isPaid 
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                          : "bg-amber-50 text-amber-800 border-amber-200"
                                      }`}>
                                        {isPaid ? `✓ Pago (${serv.formaPagamento === "manual" ? "Manual" : "Hubla"})` : "⏳ Pendente"}
                                      </span>
                                      {hublaUrl && (
                                        <a
                                          href={hublaUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-[#00A86B] hover:bg-[#0A3D2E] text-white px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer shrink-0"
                                          title="Contratar via Hubla"
                                        >
                                          <span>Contratar Serviço</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                      {isAdminUser && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...servicosRecomendados];
                                            if (isPaid) {
                                              updated[sIdx] = {
                                                ...updated[sIdx],
                                                statusPagamento: "pendente",
                                                formaPagamento: undefined,
                                                dataPagamento: undefined
                                              };
                                            } else {
                                              updated[sIdx] = {
                                                ...updated[sIdx],
                                                statusPagamento: "pago",
                                                formaPagamento: "manual",
                                                dataPagamento: new Date().toISOString()
                                              };
                                            }
                                            setServicosRecomendados(updated);
                                            handleSaveServicos(updated);
                                          }}
                                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                                            isPaid 
                                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                          }`}
                                          title={isPaid ? "Reverter pagamento para pendente" : "Confirmar pagamento manual deste serviço"}
                                        >
                                          {isPaid ? "Estornar" : "✓ Confirmar Pgt Manual"}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                                <div className="relative rounded-lg shadow-xs max-w-[140px]">
                                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                                    <span className="text-slate-400 text-xs font-bold">R$</span>
                                  </div>
                                  <input
                                    type="number"
                                    step="10"
                                    min="0"
                                    readOnly={!isAdminUser}
                                    disabled={!isAdminUser}
                                    value={serv.valor !== undefined ? serv.valor : ""}
                                    onChange={(e) => {
                                      if (!isAdminUser) return;
                                      const newVal = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                      const updated = [...servicosRecomendados];
                                      updated[sIdx] = { ...updated[sIdx], valor: newVal };
                                      setServicosRecomendados(updated);
                                    }}
                                    className={`block w-full rounded-lg border py-1.5 pl-8 pr-2 text-xs font-bold text-slate-800 ${isAdminUser ? "bg-white border-emerald-300 focus:border-[#00A86B] focus:ring-[#00A86B]/20 outline-none" : "bg-slate-100 border-slate-200 cursor-not-allowed"}`}
                                  />
                                </div>

                                {isAdminUser && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = servicosRecomendados.filter((_, i) => i !== sIdx);
                                      setServicosRecomendados(updated);
                                      handleSaveServicos(updated);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Remover serviço deste lead"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Total Box */}
                          <div className="flex items-center justify-between p-3.5 bg-emerald-900 text-white rounded-xl shadow-xs">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-200">
                              Total dos Serviços do Diagnóstico:
                            </span>
                            <span className="text-base font-black text-[#00A86B]">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                servicosRecomendados.reduce((acc, s) => acc + (Number(s.valor) || 0), 0)
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Admin Add Service dropdown */}
                      {isAdminUser && (
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                          <select
                            id="add-catalog-serv-select"
                            className="text-xs bg-slate-50 border border-slate-200 font-semibold rounded-xl p-2 outline-none flex-1"
                            defaultValue=""
                          >
                            <option value="" disabled>-- Adicionar Serviço do Catálogo PROSFEC --</option>
                            {catalogServices.map((serv) => (
                              <option key={serv.id} value={`${serv.nome}|${serv.valor}`}>
                                {serv.nome} ({new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(serv.valor)})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const sel = document.getElementById("add-catalog-serv-select") as HTMLSelectElement;
                              if (!sel || !sel.value) return;
                              const [nome, valStr] = sel.value.split("|");
                              const defaultVal = parseFloat(valStr) || 0;
                              const newServ = {
                                id: `serv_${Date.now()}`,
                                nome,
                                valor: defaultVal,
                                justificativa: "Incluso manualmente pelo Administrador ADM",
                                status: "pendente"
                              };
                              const updated = [...servicosRecomendados, newServ];
                              setServicosRecomendados(updated);
                              handleSaveServicos(updated);
                              sel.value = "";
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-700" />
                            Adicionar Serviço
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-xs font-bold text-slate-500">Nenhum diagnóstico gerado ainda</div>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                      Clique no botão acima para acionar a PROSFEC IA. O diagnóstico será gravado diretamente na ficha deste lead para acompanhamento contínuo.
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Actions from Step 3 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWorkspaceTab("socios")}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>← Voltar para Passo 2: Sócios</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceTab("contrato")}
                  className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Avançar para Passo 4: Termos & Contratos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: Central Unificada de Estruturação da Operação (Checklist IA, Simulação e Linha do Tempo) */}
          {workspaceTab === "simulador" && (() => {
            const currentRule = GOVERNMENT_CREDIT_LINES[advCreditLineCode] || GOVERNMENT_CREDIT_LINES.PRONAMPE;
            const validation = validateCreditLineConditions(
              advCreditLineCode,
              advValor,
              advCarencia,
              advPrazoAmortizacao,
              advTaxaAnual,
              advAmortizacao
            );
            const schedule = calculateSchedule();
            const concluidasCount = subEtapasPasso6.filter(s => s.concluida).length;
            const totalSubEtapas = subEtapasPasso6.length;
            const pctConcluido = totalSubEtapas > 0 ? Math.round((concluidasCount / totalSubEtapas) * 100) : 0;

            return (
              <div className="space-y-6 animate-fade-in">
                {/* Header Principal do Passo 6 */}
                <div className="bg-gradient-to-r from-[#0A3D2E] via-slate-900 to-[#0A3D2E] text-white p-6 rounded-3xl border border-emerald-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                        Passo 6 de 8 &bull; Fase Estrutural
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                        {currentRule.badge}
                      </span>
                    </div>
                    <h3 className="font-display font-extrabold text-lg sm:text-xl text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      Estruturação da Operação & Melhoria de Perfil de Crédito
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Central unificada do parceiro: acompanhe todas as ações técnicas de adequação cadastral configuradas pela PROSFEC IA, execute simulações em linhas governamentais e audite o histórico da operação em tempo real.
                    </p>
                  </div>

                  <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
                    <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-left md:text-right">
                      <span className="text-[9px] uppercase font-black tracking-wider text-emerald-300 block">Progresso da Estruturação</span>
                      <span className="text-base font-black text-white font-mono">{concluidasCount}/{totalSubEtapas} Concluídas ({pctConcluido}%)</span>
                    </div>
                    <button
                      onClick={copyLeadProposalToClipboard}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedProposalReport ? "Copiado!" : "Copiar Proposta WhatsApp"}
                    </button>
                  </div>
                </div>

                {/* SEÇÃO 0: FICHA DE RATING & DOCUMENTOS DO CLIENTE (Concierge B2B) */}
                {(() => {
                  const ficha: any = (lead as any).fichaRatingCredito || {};
                  const validacoes: any = ficha.validacoesDocumentos || {};
                  const vals = Object.values(validacoes) as any[];
                  const aprovados = vals.filter(v => v?.status === "aprovado").length;
                  const rejeitados = vals.filter(v => v?.status === "rejeitado");
                  const faseLabel =
                    ficha.faseRating === "concluido" ? "Rating concluído"
                    : ficha.faseRating === "em_aplicacao" ? "Rating em aplicação"
                    : ficha.faseRating === "documentos_recebidos" ? "Documentos recebidos"
                    : "Aguardando documentos";

                  return (
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-[#00A86B]" />
                            Ficha de Rating & Documentos do Cliente
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Preenchimento feito pelo parceiro em nome do cliente. Inclui o link da pasta de documentos em nuvem.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl border border-slate-200">
                            {faseLabel}
                          </span>
                          <span className="text-[11px] font-extrabold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                            {aprovados} aprovado(s) pela Mesa
                          </span>
                          {rejeitados.length > 0 && (
                            <span className="text-[11px] font-extrabold bg-red-50 text-red-700 px-3 py-1 rounded-xl border border-red-200">
                              {rejeitados.length} rejeitado(s)
                            </span>
                          )}
                        </div>
                      </div>

                      {rejeitados.length > 0 && (
                        <div className="px-6 py-3 bg-red-50/70 border-b border-red-100 space-y-1">
                          <p className="text-[11px] font-black text-red-700 uppercase tracking-wider">
                            Correções solicitadas pela Mesa de Operações
                          </p>
                          {rejeitados.slice(0, 5).map((v: any, i: number) => (
                            <p key={i} className="text-[11px] text-red-700">
                              • {v?.motivo || "Documento ilegível ou incorreto. Favor reenviar."}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="p-4 sm:p-6">
                        <FichaRatingCreditoForm
                          lead={lead as any}
                          isUnlocked={true}
                          onUpdateLead={(updated: any) => {
                            if (onLeadUpdated) {
                              onLeadUpdated(updated as any);
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}



                {/* SEÇÃO 1: CHECKLIST DA ETAPA 6 (ESTRUTURAÇÃO) — PROSFEC IA */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#00A86B]" />
                        Checklist Técnico de Estruturação & Adequação (PROSFEC IA)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Ações operacionais de saneamento e elevação de score aplicadas ao CNPJ e CPFs para viabilizar a tomada bancária.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                        {concluidasCount}/{totalSubEtapas} Concluídas
                      </span>
                      {isAdminUser && (
                        <button
                          type="button"
                          onClick={() => handleSaveSubEtapasLocal()}
                          disabled={savingSubEtapasLocal}
                          className="px-3.5 py-1.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          {savingSubEtapasLocal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Salvar Checklist
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso Visual */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-[#00A86B] h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pctConcluido)}%` }}
                    />
                  </div>

                  {/* Lista de Itens do Checklist */}
                  <div className="space-y-2.5">
                    {subEtapasPasso6.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Nenhuma sub-etapa configurada para este lead ainda.
                      </div>
                    ) : (
                      subEtapasPasso6.map((sub, idx) => {
                        const isDemand = isDemandAccountingService(sub);
                        const rawPrice = typeof sub.preco === "number" ? sub.preco : typeof (sub as any).valor === "number" ? (sub as any).valor : parseFloat(sub.preco || (sub as any).valor || 0);
                        const hasCost = !isNaN(rawPrice) && rawPrice > 0;
                        const isZeroCost = isServiceWithoutUpfrontCost(sub) || !hasCost;
                        const isPaid = (sub as any).statusPagamento === "pago" || (sub as any).pago === true;
                        const hublaUrl = (!isZeroCost && !isPaid) ? getHublaLinkForService(sub, lead, catalogServices) : null;
                        return (
                          <div
                            key={sub.id || idx}
                            className={`flex flex-wrap items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                              sub.concluida
                                ? "bg-emerald-50/40 border-emerald-200/80"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={sub.concluida}
                              disabled={!isAdminUser}
                              onChange={(e) => {
                                if (!isAdminUser) return;
                                const updated = [...subEtapasPasso6];
                                updated[idx] = { ...updated[idx], concluida: e.target.checked };
                                setSubEtapasPasso6(updated);
                                handleSaveSubEtapasLocal(updated);
                              }}
                              className={`w-4 h-4 accent-[#00A86B] rounded shrink-0 ${!isAdminUser ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                            />
                            
                            <div className="flex-1 min-w-[200px]">
                              <input
                                type="text"
                                value={sub.titulo}
                                readOnly={!isAdminUser}
                                disabled={!isAdminUser}
                                onChange={(e) => {
                                  if (!isAdminUser) return;
                                  const updated = [...subEtapasPasso6];
                                  updated[idx] = { ...updated[idx], titulo: e.target.value };
                                  setSubEtapasPasso6(updated);
                                }}
                                className={`w-full text-xs font-semibold px-2 py-1 rounded border border-transparent ${
                                  isAdminUser 
                                    ? "focus:border-emerald-300 focus:bg-slate-50 outline-none" 
                                    : "bg-transparent cursor-default"
                                } ${sub.concluida ? "line-through text-slate-400" : "text-slate-800"}`}
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {hasCost && (
                                <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200" title="Valor do Serviço">
                                  {formatCurrencyBRL(rawPrice)}
                                </span>
                              )}

                              {/* Multilevel Commission Badge */}
                              {hasCost && (() => {
                                const partnerPlan = currentPartner?.plano || lead.parceiroPlano || "";
                                const hasParentMaster = !!(currentPartner?.parentPartnerId || lead.parentPartnerId);
                                const isDirectMaster = isFranquiaDigital(partnerPlan);
                                const breakdown = calculateMultilevelCommission(rawPrice, {
                                  consultantPlan: partnerPlan,
                                  hasMasterParent: hasParentMaster,
                                  isDirectMaster
                                });

                                const isViewingAsMaster = isFranquiaDigital(currentPartner?.plano);
                                const commValue = breakdown.hasHierarchy && isViewingAsMaster
                                  ? breakdown.masterOverrideAmount
                                  : breakdown.consultantAmount;
                                const commRateLabel = breakdown.hasHierarchy && isViewingAsMaster
                                  ? breakdown.rateDisplayMaster
                                  : breakdown.rateDisplayConsultant;

                                return (
                                  <span 
                                    className="text-[10px] font-bold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-lg border border-emerald-200/80"
                                    title={breakdown.splitDescription}
                                  >
                                    💎 Com.: {formatCurrencyBRL(commValue)} ({commRateLabel})
                                  </span>
                                );
                              })()}

                              {isZeroCost ? (
                                <div className="flex items-center gap-1.5">
                                  {isDemand ? (
                                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-800 border-indigo-200">
                                      📋 Serviços Contratados por demanda
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-blue-50 text-blue-800 border-blue-200">
                                      🎯 Sem Custo Inicial (Remuneração no Êxito)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {isDemand && (
                                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-800 border-indigo-200">
                                      📋 Serviços Contratados por demanda
                                    </span>
                                  )}
                                  {hublaUrl && (
                                    <a
                                      href={hublaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-[#00A86B] hover:bg-[#0A3D2E] text-white px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer shrink-0"
                                      title="Contratar via Hubla com confirmação em tempo real"
                                    >
                                      <span>Contratar Serviço</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}

                                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 border ${
                                    isPaid 
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                  }`}>
                                    {isPaid ? `💰 Pago (${(sub as any).formaPagamento === "manual" ? "Manual" : "Hubla"})` : "⏳ Pgt Pendente"}
                                  </span>

                                  {isAdminUser && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...subEtapasPasso6];
                                        if (isPaid) {
                                          updated[idx] = {
                                            ...updated[idx],
                                            statusPagamento: "pendente",
                                            formaPagamento: undefined,
                                            dataPagamento: undefined
                                          } as any;
                                        } else {
                                          updated[idx] = {
                                            ...updated[idx],
                                            statusPagamento: "pago",
                                            formaPagamento: "manual",
                                            dataPagamento: new Date().toISOString(),
                                            concluida: true
                                          } as any;
                                        }
                                        setSubEtapasPasso6(updated);
                                        handleSaveSubEtapasLocal(updated);
                                      }}
                                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                        isPaid 
                                          ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                      }`}
                                      title={isPaid ? "Reverter pagamento para pendente" : "Confirmar pagamento manual desta sub-etapa"}
                                    >
                                      {isPaid ? "Estornar Pgt" : "✓ Confirmar Pgt Manual"}
                                    </button>
                                  )}
                                </>
                              )}

                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                                sub.concluida 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                                {sub.concluida ? "Concluída ✓" : "Em Andamento ⏳"}
                              </span>

                              {isAdminUser && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Deseja realmente remover o item/serviço "${sub.titulo}" deste lead?`)) {
                                      const updated = subEtapasPasso6.filter((_, i) => i !== idx);
                                      setSubEtapasPasso6(updated);
                                      handleSaveSubEtapasLocal(updated);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                                  title="Excluir este serviço/item do checklist"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Controles do Administrador e Informação ao Parceiro */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                    {isAdminUser ? (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            id="passo6-catalog-select"
                            className="text-xs bg-slate-50 border border-slate-200 font-semibold rounded-xl p-2 outline-none flex-1 min-w-[240px] focus:border-emerald-500"
                            defaultValue=""
                          >
                            <option value="" disabled>-- Selecione um Serviço do Catálogo para Acrescentar --</option>
                            {catalogServices.map((serv) => (
                              <option 
                                key={serv.id} 
                                value={JSON.stringify({ 
                                  id: serv.id, 
                                  nome: serv.nome, 
                                  valor: serv.valor, 
                                  hublaLink: serv.hublaLink || "" 
                                })}
                              >
                                {serv.nome} ({formatCurrencyBRL(serv.valor)})
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const sel = document.getElementById("passo6-catalog-select") as HTMLSelectElement;
                              if (!sel || !sel.value) return;
                              try {
                                const parsed = JSON.parse(sel.value);
                                const newSub = {
                                  id: parsed.id || `sub_serv_${Date.now()}`,
                                  titulo: parsed.nome,
                                  concluida: false,
                                  preco: typeof parsed.valor === "number" ? parsed.valor : 0,
                                  hublaLink: parsed.hublaLink || undefined,
                                  statusPagamento: "pendente"
                                };
                                const updated = [...subEtapasPasso6, newSub];
                                setSubEtapasPasso6(updated);
                                handleSaveSubEtapasLocal(updated);
                                sel.value = "";
                              } catch (err) {
                                console.error("Erro ao adicionar serviço do catálogo:", err);
                              }
                            }}
                            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-300" />
                            Acrescentar Serviço
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const newSub = {
                                id: `sub_custom_${Date.now()}`,
                                titulo: "Nova ação de melhoria de crédito...",
                                concluida: false,
                                preco: 0,
                                statusPagamento: "pendente"
                              };
                              const updated = [...subEtapasPasso6, newSub];
                              setSubEtapasPasso6(updated);
                              handleSaveSubEtapasLocal(updated);
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-600" />
                            Adicionar Item Avulso
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">
                        🛡️ Todas as etapas técnicas são gerenciadas e atualizadas diretamente pela equipe da PROSFEC IA em tempo real.
                      </span>
                    )}

                    <p className="text-[11px] text-slate-500 italic">
                      💡 Sincronizado automaticamente com o portal de acompanhamento do cliente e painel financeiro.
                    </p>
                  </div>
                </div>

                {/* SEÇÃO 2: SIMULADOR & PROPOSTA DE CRÉDITO GOVERNAMENTAL */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      Simulação & Proposta de Linha Governamental ({currentRule.code})
                    </h4>
                    <p className="text-xs text-[#00A86B] font-bold mt-0.5">
                      {currentRule.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Limite máximo sugerido para o CNPJ: <strong>{lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "sob consulta"}</strong>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Coluna Esquerda: Parâmetros Editáveis */}
                    <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                      
                      {/* Linha de Crédito Governamental */}
                      <div className="space-y-1.5 pb-3 border-b border-slate-200/60">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-emerald-900 uppercase block tracking-wider">
                            Linha de Crédito Governamental
                          </label>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {currentRule.badge}
                          </span>
                        </div>
                        <select
                          value={advCreditLineCode}
                          onChange={(e) => handleSelectCreditLine(e.target.value)}
                          disabled={lead.etapa === 7 || lead.etapa === 8}
                          className="w-full text-xs font-bold px-3.5 py-2.5 bg-white border border-emerald-300 text-emerald-950 rounded-xl cursor-pointer transition-colors"
                        >
                          {Object.values(GOVERNMENT_CREDIT_LINES).map((line) => (
                            <option key={line.code} value={line.code}>
                              {line.name} ({line.badge})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500 italic leading-snug pt-1">
                          {currentRule.description}
                        </p>
                      </div>

                      {/* Valor Desejado */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-slate-700">Valor Desejado (R$)</label>
                          <span className="font-mono font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            {formatCurrencyBRL(advValor)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={currentRule.minValor}
                            max={currentRule.maxValor}
                            step="1000"
                            value={isNaN(advValor) ? "" : advValor}
                            onChange={(e) => setAdvValor(parseFloat(e.target.value) || 0)}
                            disabled={lead.etapa === 7 || lead.etapa === 8}
                            className="w-1/2 text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          />
                          <input
                            type="range"
                            min="10000"
                            max={Math.max(500000, lead.limiteEstimado || 500000)}
                            step="5000"
                            value={isNaN(advValor) ? 10000 : advValor}
                            onChange={(e) => setAdvValor(parseInt(e.target.value) || 0)}
                            disabled={lead.etapa === 7 || lead.etapa === 8}
                            className="w-1/2 accent-[#0A3D2E] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                          />
                        </div>
                        {/* Presets */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[50000, 100000, 150000, 250000, 500000].map((presetVal) => (
                            <button
                              key={presetVal}
                              type="button"
                              onClick={() => setAdvValor(presetVal)}
                              disabled={lead.etapa === 7 || lead.etapa === 8}
                              className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                advValor === presetVal
                                  ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                                  : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {formatCurrencyBRL(presetVal)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Carência & Prazo de Amortização */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {/* Carência */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-700">Carência (Meses)</label>
                            <span className="text-[9px] text-slate-400 font-mono">
                              Máx: {currentRule.maxCarencia}m
                            </span>
                          </div>
                          <input
                            type="number"
                            min={currentRule.minCarencia}
                            max={currentRule.maxCarencia}
                            value={isNaN(advCarencia) ? "" : advCarencia}
                            onChange={(e) => setAdvCarencia(parseInt(e.target.value))}
                            disabled={lead.etapa === 7 || lead.etapa === 8}
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          />
                          <div className="flex flex-wrap gap-1">
                            {[0, 6, 12, 18, 24, 36]
                              .filter((m) => m <= currentRule.maxCarencia)
                              .map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setAdvCarencia(m)}
                                  disabled={lead.etapa === 7 || lead.etapa === 8}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                    advCarencia === m
                                      ? "bg-emerald-700 text-white border-emerald-700"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {m === 0 ? "0m" : `${m}m`}
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Prazo de Amortização */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-700">Amortização (Meses)</label>
                            <span className="text-[9px] text-slate-400 font-mono">
                              Máx: {currentRule.maxPrazoAmortizacao}m
                            </span>
                          </div>
                          <input
                            type="number"
                            min={currentRule.minPrazoAmortizacao}
                            max={currentRule.maxPrazoAmortizacao}
                            value={isNaN(advPrazoAmortizacao) ? "" : advPrazoAmortizacao}
                            onChange={(e) => setAdvPrazoAmortizacao(parseInt(e.target.value))}
                            disabled={lead.etapa === 7 || lead.etapa === 8}
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          />
                          <div className="flex flex-wrap gap-1">
                            {[12, 24, 36, 48, 60, 72]
                              .filter((m) => m <= currentRule.maxPrazoAmortizacao)
                              .map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setAdvPrazoAmortizacao(m)}
                                  disabled={lead.etapa === 7 || lead.etapa === 8}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                    advPrazoAmortizacao === m
                                      ? "bg-emerald-700 text-white border-emerald-700"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {m}m
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Sistema de Amortização & Taxa Anual */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {/* Sistema */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 block">Sistema Amortização</label>
                          <select
                            value={advAmortizacao}
                            onChange={(e) => setAdvAmortizacao(e.target.value as "SAC" | "PRICE")}
                            disabled={lead.etapa === 7 || lead.etapa === 8}
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          >
                            <option value="SAC">SAC (Decrescente)</option>
                            <option value="PRICE">PRICE (Constante)</option>
                          </select>
                        </div>

                        {/* Taxa de Juros Anual */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-slate-700 block">Taxa Anual (% a.a.)</label>
                            <span className="text-[8px] font-mono font-bold text-emerald-800 bg-white px-1 py-0.2 rounded border border-emerald-100">
                              {currentRule.minTaxaAnual}% - {currentRule.maxTaxaAnual}%
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            min={currentRule.minTaxaAnual}
                            max={currentRule.maxTaxaAnual}
                            value={isNaN(advTaxaAnual) ? "" : advTaxaAnual}
                            onChange={(e) => setAdvTaxaAnual(parseFloat(e.target.value))}
                            disabled={lead.etapa === 7 || lead.etapa === 8}
                            className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Checkbox Juros na Carência */}
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={advPagarJurosCarencia}
                            onChange={(e) => setAdvPagarJurosCarencia(e.target.checked)}
                            disabled={lead.etapa === 7 || lead.etapa === 8}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-blue-900 leading-tight">
                            Pagar juros mensalmente durante o período de carência?
                          </span>
                        </label>
                      </div>

                      {/* Validação de Regras */}
                      <div className="pt-1">
                        {!validation.isValid ? (
                          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-left animate-fade-in">
                            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Inconformidade com Regras Governamentais</span>
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-[10px] text-rose-700 font-medium">
                              {validation.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              onClick={handleAutoFixConditions}
                              className="mt-1 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Sparkles className="w-3 h-3" />
                              Ajustar Parâmetros aos Limites da Linha
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-left">
                            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Parâmetros em Conformidade ({currentRule.code})</span>
                            </div>
                            <p className="text-[10px] text-emerald-800 leading-tight">
                              Prazo total do contrato: <strong>{(advCarencia || 0) + (advPrazoAmortizacao || 0)} meses</strong> ({advCarencia || 0}m carência + {advPrazoAmortizacao || 0}m amortização).
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coluna Direita: Resultados & Tabela de Amortização */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-[#0A3D2E] text-white p-6 rounded-2xl grid grid-cols-2 gap-4 shadow-md">
                        <div>
                          <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider">Parcela Inicial</span>
                          <div className="text-xl font-black font-mono">{formatCurrencyBRL(schedule.parcelaInicial)}</div>
                        </div>
                        <div>
                          <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider">Parcela Final</span>
                          <div className="text-xl font-black font-mono">{formatCurrencyBRL(schedule.parcelaFinal)}</div>
                        </div>
                        <div className="col-span-2 border-t border-emerald-800/80 pt-3 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider block">Total de Juros Estimados</span>
                            <div className="text-sm font-bold font-mono text-emerald-300">{formatCurrencyBRL(schedule.totalJuros)}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider block">Custo Total (Amortização + Juros)</span>
                            <div className="text-xl font-black font-mono text-white">{formatCurrencyBRL(schedule.totalPago)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 max-h-56 overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-slate-500">
                              <th className="p-2 text-left">Mês</th>
                              <th className="p-2 text-left">Tipo</th>
                              <th className="p-2 text-right">Amortização</th>
                              <th className="p-2 text-right">Juros</th>
                              <th className="p-2 text-right">Parcela</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.rows.map(row => (
                              <tr key={row.mes} className="hover:bg-slate-50 border-b border-slate-100/50">
                                <td className="p-2 font-mono">Mês {row.mes}</td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                    row.tipo === "Carência" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {row.tipo}
                                  </span>
                                </td>
                                <td className="p-2 text-right font-mono">{row.amortizacao > 0 ? formatCurrencyBRL(row.amortizacao) : "-"}</td>
                                <td className="p-2 text-right font-mono">{formatCurrencyBRL(row.juros)}</td>
                                <td className="p-2 text-right font-black font-mono text-[#0A3D2E]">{formatCurrencyBRL(row.parcela)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      {!validation.isValid ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Corrija as inconsistências acima para liberar a emissão da proposta.
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Proposta comercial validada e pronta para emissão.
                        </span>
                      )}
                    </span>
                    <button
                      onClick={handleSaveProposalToLead}
                      disabled={workspaceLoading || lead.etapa === 7 || lead.etapa === 8 || !validation.isValid}
                      className="px-6 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {lead.etapa === 7 || lead.etapa === 8 
                        ? "Simulação Bloqueada (Crédito Finalizado)" 
                        : (workspaceLoading ? "Salvando..." : "Vincular Proposta ao Lead")}
                    </button>
                  </div>
                </div>

                {/* SEÇÃO 3: LINHA DO TEMPO & HISTÓRICO AUDITÁVEL DA OPERAÇÃO */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Linha do Tempo & Histórico Auditável da Operação
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Registro cronológico com todas as transições de etapas, validações e eventos deste lead.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">
                      {lead.historicoEtapas?.length || 0} evento(s)
                    </span>
                  </div>

                  {!lead.historicoEtapas || lead.historicoEtapas.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Nenhum registro de alteração de etapa para este lead ainda.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-emerald-200 pl-4 ml-2 space-y-4 pt-1">
                      {lead.historicoEtapas.map((hist: any, idx: number) => {
                        const isMesa = hist.autor === "admin" || hist.autor === "Mesa de Operações";
                        return (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                            <div className="bg-slate-50/70 hover:bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 transition-all">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                  isMesa
                                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                                    : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                }`}>
                                  {isMesa ? "🏛️ Mesa de Operações" : hist.autor ? `👤 ${hist.autor}` : "⚡ Sistema"}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 font-semibold">
                                  {new Date(hist.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                                {hist.detalhes || `Etapa alterada para: ${ETAPAS_LABELS[hist.etapaNova] || hist.etapaNova}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Botões de Avanço / Navegação */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab("credenciais")}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>← Voltar para Passo 5: Senhas & Certificado A1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (stepStatus.isTabUnlocked("apta_bancaria")) {
                        setWorkspaceTab("apta_bancaria");
                      } else {
                        onClose();
                      }
                    }}
                    className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>{stepStatus.isTabUnlocked("apta_bancaria") ? "Avançar para Passo 7: Apta para Solicitação →" : "Concluir e Fechar Ficha"}</span>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* TAB: Passo 7 - Operação Apta para Solicitação Bancária */}
          {workspaceTab === "apta_bancaria" && (
            <div className="space-y-6">
              <DossierComparativeViewer
                lead={lead as any}
                diagnosticoPosEstruturacao={(lead as any).diagnosticoPosEstruturacao}
                isAdmin={isAdminUser}
                isRefreshing={generatingPasso7}
                onRefresh={async () => {
                  setGeneratingPasso7(true);
                  setWorkspaceError(null);
                  setWorkspaceSuccess(null);
                  try {
                    const res = await fetch("/api/credit/diagnostico-pos-estruturacao", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        leadId: lead.id,
                        partnerId: currentPartner?.id || "admin"
                      })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                      throw new Error(data.error || "Erro ao gerar diagnóstico pós-estruturação.");
                    }
                    setWorkspaceSuccess("Dossiê Comparativo Pós-Estruturação gerado com sucesso!");
                    safeRefreshLeads();
                    onLeadUpdated?.({
                      ...lead,
                      etapa: Math.max(lead.etapa || 1, 7),
                      diagnosticoPosEstruturacao: data.diagnosticoPosEstruturacao
                    });
                  } catch (err: any) {
                    setWorkspaceError(err.message || "Erro ao gerar dossiê comparativo.");
                  } finally {
                    setGeneratingPasso7(false);
                  }
                }}
              />
            </div>
          )}




          {/* TAB: Dossiê de Rating Comercial (Exclusivo Administrador) */}
          {isAdminUser && workspaceTab === "rating_adm" && (
            <FichaRatingAdmViewer
              lead={lead as any}
              onLeadUpdated={(updated) => {
                if (onLeadUpdated) {
                  onLeadUpdated(updated);
                }
              }}
            />
          )}
            </>
          )}

        </div>
      </motion.div>

      {/* Contract & Termo Official PDF Viewer Modal */}
      {showContractPdfModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0b1329] border border-slate-700/50 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00A86B]" />
                <div>
                  <h3 className="font-display font-extrabold text-sm text-white">
                    {activePdfTab === "contrato" 
                      ? "Contrato de Prestação de Serviços (Consultoria)" 
                      : activePdfTab === "termo"
                      ? "Termo de Reconhecimento de Honorários"
                      : activePdfTab === "rating_score"
                      ? "Contrato de Serviços - Rating e Score"
                      : activePdfTab === "bacen"
                      ? "Contrato de Serviços - BACEN e SCR"
                      : "Termo de Contratação - RTB (Tarifas Bancárias)"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Visualização Oficial do Documento preenchido {lead.contratoAssinado ? "e assinado digitalmente" : "(Minuta)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#00A86B] hover:bg-[#008f5a] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setShowContractPdfModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Tabs (Dinâmicas com base nos serviços do lead) */}
            <div className="flex flex-wrap gap-2 px-5 pt-3 bg-slate-900/30 border-b border-slate-800 overflow-x-auto">
              {getApplicableContracts(lead).map((tab, idx) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePdfTab(tab.id)}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activePdfTab === tab.id
                      ? "border-[#00A86B] text-white"
                      : "border-transparent text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {idx + 1}. {tab.title}
                </button>
              ))}
            </div>

            {/* Modal Body (A4 sheet preview) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-950/40">
              <div className="bg-white text-slate-900 p-8 md:p-12 rounded-2xl shadow-lg border border-slate-200 max-w-3xl mx-auto font-sans text-xs leading-relaxed text-justify space-y-6">
                <div className="text-center pb-6 border-b border-slate-100">
                  <h2 className="font-display font-extrabold text-lg text-[#0A3D2E] tracking-wider uppercase">PROSFEC</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Assessoria e Consultoria de Crédito
                  </p>
                </div>

                <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800 text-left">
                  {activePdfTab === "contrato" 
                    ? getContractText() 
                    : activePdfTab === "termo"
                    ? getTermoText()
                    : activePdfTab === "rating_score"
                    ? getContractRatingScoreText()
                    : activePdfTab === "bacen"
                    ? getContractBacenText()
                    : getContractRtbText()}
                </div>

                {/* Signature Representation */}
                {lead.contratoAssinado ? (
                  <div className="mt-8 pt-6 border-t border-slate-200 text-left">
                    <h5 className="text-[11px] font-black text-[#0A3D2E] uppercase tracking-wider mb-4">
                      ASSINATURA DIGITAL E VALIDAÇÃO LEGAL
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <p><strong className="text-slate-800">Signatário:</strong> {lead.contratoAssinadoNome}</p>
                        <p><strong className="text-slate-800">CPF:</strong> {lead.contratoAssinadoCpf}</p>
                        <p><strong className="text-slate-800">IP de Origem:</strong> {lead.contratoAssinadoIp}</p>
                        <p><strong className="text-slate-800">Data/Hora:</strong> {lead.contratoAssinadoData}</p>
                        <p className="text-[9px] text-slate-400 font-mono leading-tight">
                          Dispositivo: {lead.contratoAssinadoDispositivo}
                        </p>
                      </div>
                      <div className="flex flex-col items-center justify-center bg-white border border-slate-200 p-2 rounded-xl">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest mb-1.5">
                          Assinatura Digital Recolhida
                        </span>
                        <div className="h-16 w-48 flex items-center justify-center">
                          <img src={lead.contratoAssinadoDesenho} alt="Assinatura digital" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-center text-slate-400 mt-4 leading-normal">
                      Este documento digital possui validade jurídica em todo território nacional, em conformidade com a MP nº 2.200-2/2001 e a Lei nº 14.063/2020.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 pt-6 border-t border-slate-200/60 border-dashed text-center py-6 bg-slate-50 rounded-xl text-slate-400 font-bold text-xs">
                    Documento pendente de assinatura digital pelo cliente no Portal de Acompanhamento.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40 rounded-b-3xl flex justify-end gap-3">
              <button
                onClick={() => setShowContractPdfModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fechar Visualização
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-[#00A86B] hover:bg-[#008f5a] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
