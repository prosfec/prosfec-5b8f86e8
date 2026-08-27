// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  addDoc,
  setDoc,
  getDoc
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth, createNotification } from "../firebase";
import { PendenciaItem, SolicitacaoComissao } from "../types";
import { 
  Users, 
  TrendingUp, 
  Handshake, 
  Search, 
  Download, 
  Trash2, 
  ExternalLink, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Briefcase, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Clock, 
  Filter, 
  DollarSign, 
  Activity, 
  X,
  RefreshCw,
  Copy,
  ChevronRight,
  CreditCard,
  Bell,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Coins,
  Receipt,
  Megaphone,
  Plus,
  Edit,
  Pencil,
  MessageSquare,
  FileText,
  Eye,
  EyeOff,
  LayoutGrid,
  Settings,
  List,
  UserPlus,
  Sparkles,
  Key,
  Lock,
  Send,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Save,
  Link2,
  Calculator,
  Menu,
  LogOut
} from "lucide-react";

import { 
  formatCurrencyBRL, 
  getAppDomain, 
  calculateLeadMultilevelCommissions, 
  buildLeadMultilevelFirestorePayload, 
  calculateMultilevelCommission, 
  getServiceCommissionRate, 
  getMasterTeamServiceOverrideRate, 
  isFranquiaDigital, 
  getPlanServiceLabel
} from "../utils";
import { FintechDiagnosisView } from "./FintechDiagnosisView";
import LeadWorkspaceModal, { ETAPAS_LABELS } from "./LeadWorkspaceModal";
import { STEPS_CONFIG } from "./LeadStepTimeline";
import FunnelAnalyticsDashboard from "./FunnelAnalyticsDashboard";
import AdminServicosContabilidadeTab from "./AdminServicosContabilidadeTab";

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case "novo": return "Novo";
    case "contatado": return "Em Contato / Análise";
    case "aprovado": return "Aprovado";
    case "reprovado": return "Reprovado";
    case "concluido": return "Concluído";
    default: return status;
  }
};

interface Announcement {
  id: string;
  titulo: string;
  mensagem: string;
  imagemUrl?: string;
  linkUrl?: string;
  linkTexto?: string;
  publicoAlvo: "todos" | "executive" | "franquia" | "agent";
  ativo: boolean;
  dataCriacao: string;
}

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
  capitalSocial?: number;
  mediaReceitaMensal?: number;
  seloEmpregaMulher?: boolean;
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
  parceiroId?: string;
  parceiroNome?: string;
  valorAprovado?: number;
  comissaoPaga?: boolean;
  pendente?: boolean;
  pendenciaDescricao?: string;
  pendencias?: {
    mensagem: string;
    status: 'pendente' | 'resolvida';
    resposta?: string;
    historico?: PendenciaItem[];
  } | null;
  govbrLogin?: string;
  govbrSenha?: string;
  serasaLogin?: string;
  serasaSenha?: string;
  historicoEtapas?: any[];
  socios?: Array<{
    nome: string;
    cpf: string;
    dataNascimento: string;
    participacao: number;
    nomeMae?: string;
    telefone?: string;
    rg?: string;
    orgaoEmissor?: string;
    cargo?: string;
  }>;
  enderecoSocioPrincipal?: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    complemento?: string;
  };
}

interface Partner {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cnpj?: string;
  cidade: string;
  interesse: string;
  status: string;
  dataCriacao: string;
  cpf?: string;
  dataNascimento?: string;
  chavePix?: string;
  plano?: string;
  aceitouTermos?: boolean;
  dataUltimoPagamento?: string;
  duracaoDias?: number;
  parentPartnerId?: string;
  parentPartnerNome?: string;
  isTeamMember?: boolean;
  dataUltimoAcesso?: string;
  inativoPorInatividade?: boolean;
  motivoInativacao?: string;
  dataReativacao?: string;
  statusManual?: string;
  dataAtualizacaoStatus?: string;
  cacaLeadsCredits?: number;
  cacaLeadsCount?: number;
  cacaLeadsLastDate?: string;
}

export const getPlanName = (plano?: string) => {
  if (!plano) return "STARTER";
  const p = plano.toUpperCase();
  if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) {
    return "Master Partner";
  }
  return plano;
};

export const getCommissionMultiplier = (plano?: string) => {
  if (!plano) return 0.005; // 0.5% default fallback
  const p = plano.toUpperCase();
  if (p.includes("EXEC")) return 0.015; // 1.5%
  if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return 0.030; // 3.0%
  if (p.includes("STARTER")) return 0.005; // 0.5%
  if (p === "GOLD") return 0.015;
  if (p === "PLATINUM") return 0.030;
  if (p === "SILVER") return 0.005;
  return 0.005;
};

export const getCommissionRateText = (plano?: string) => {
  const p = plano?.toUpperCase() || "";
  if (p.includes("EXEC")) return "1,5%";
  if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return "3,0% (Direta + até 2,5% Equipe)";
  if (p.includes("STARTER")) return "0,5%";
  
  // Legacy / existing fallbacks:
  if (p === "SILVER") return "0,5%";
  if (p === "GOLD") return "1,5%";
  if (p === "PLATINUM") return "3,0% (Direta + até 2,5% Equipe)";
  
  return "0,5%"; // Default fallback
};

export const getCommissionDetailText = (plano?: string) => {
  const p = plano?.toUpperCase() || "";
  if (p.includes("EXECUTIVE")) return "1,5% do crédito liberado";
  if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return "3,0% do crédito liberado (3,0% direta + até 2,5% sobre equipe)";
  if (p.includes("STARTER")) return "0,5% do crédito liberado";
  
  // Legacy / existing fallbacks:
  if (p === "SILVER") return "0,5% do crédito liberado";
  if (p === "GOLD") return "1,5% do crédito liberado";
  if (p === "PLATINUM") return "3,0% do crédito liberado (3,0% direta + até 2,5% sobre equipe)";
  
  return "0,5% do crédito liberado"; // Default fallback
};

export const getSubscriptionStatus = (partner: Partner) => {
  const isTeamMember = partner.isTeamMember === true || (partner.plano && (partner.plano.toUpperCase().includes("CONSULTOR") || partner.plano.toUpperCase().includes("EQUIPE")));
  const isAfiliado = !!(partner.plano && partner.plano.toUpperCase().includes("AFILIADO"));

  if (isAfiliado) {
    return {
      status: "ativa" as const,
      daysLeft: 9999,
      expiryDate: new Date(Date.now() + 9999 * 24 * 60 * 60 * 1000),
      formattedExpiry: "Isento (Afiliado)",
      isTrial: false,
      isExempt: true,
      isManualBlocked: false
    };
  }

  if (partner.parentPartnerId && isTeamMember) {
    return {
      status: "ativa" as const,
      daysLeft: 9999,
      expiryDate: new Date(Date.now() + 9999 * 24 * 60 * 60 * 1000),
      formattedExpiry: "Isento (Vendedor)",
      isTrial: false,
      isExempt: true,
      isManualBlocked: false
    };
  }

  // Se bloqueado explicitamente pela administração
  if (partner.statusManual === "bloqueado" || partner.status === "bloqueado") {
    return {
      status: "vencida" as const,
      daysLeft: 0,
      expiryDate: new Date(),
      formattedExpiry: "Bloqueado pelo ADM",
      isTrial: false,
      isExempt: false,
      isManualBlocked: true
    };
  }

  const hasPaid = !!partner.dataUltimoPagamento;
  const isManualActive = partner.statusManual === "ativo" || partner.status === "ativo";
  const baseDateStr = partner.dataUltimoPagamento || partner.dataCriacao;
  if (!baseDateStr) {
    return {
      status: "ativa" as const,
      daysLeft: 3,
      formattedExpiry: "-",
      isTrial: !isManualActive,
      isManualBlocked: false
    };
  }
  
  const baseDate = new Date(baseDateStr);
  const duration = partner.duracaoDias !== undefined ? partner.duracaoDias : (hasPaid || isManualActive ? 365 : 3);
  
  const expiryDate = new Date(baseDate.getTime() + duration * 24 * 60 * 60 * 1000);
  const today = new Date();
  
  // Compare midnight to midnight
  const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryReset = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  
  const diffTime = expiryReset.getTime() - todayReset.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  let status: "ativa" | "vencendo" | "vencida" = "ativa";
  // For standard 30 days we warn with 5 days left. For a 3 day trial, we warn when there is <= 1 day left or expired.
  const warningThreshold = duration <= 3 ? 1 : 5;
  if (diffDays <= 0) {
    if (isManualActive && !hasPaid) {
      status = "ativa";
    } else {
      status = "vencida";
    }
  } else if (diffDays <= warningThreshold) {
    status = "vencendo";
  }
  
  return {
    status,
    daysLeft: diffDays <= 0 && isManualActive && !hasPaid ? 365 : diffDays,
    expiryDate,
    formattedExpiry: expiryDate.toLocaleDateString("pt-BR"),
    isTrial: !hasPaid && !isManualActive,
    isManualBlocked: false
  };
};

import { 
  DEFAULT_SERVICES_CATALOG, 
  sanitizeAndSyncServicosList, 
  ServiceCatalogItem, 
  HUBLA_SERVICE_LINKS, 
  getHublaLinkForService, 
  isServiceWithoutUpfrontCost,
  isDemandAccountingService,
  cleanForFirestore,
  sanitizeServiceCatalogForFirestore
} from "../utils/serviceUtils";
export { DEFAULT_SERVICES_CATALOG };
export type { ServiceCatalogItem };

export default function AdminDashboard({ onExit }: { onExit: () => void }) {
  // Segurança: a sessão administrativa vem SEMPRE do Firebase Auth.
  // Nada de sessionStorage nem de senha embutida no código.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<"admin" | "contador">("admin");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [loggingIn, setLoggingIn] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recargas, setRecargas] = useState<any[]>([]);
  const [comissoes, setComissoes] = useState<SolicitacaoComissao[]>([]);
  const [comissoesFilter, setComissoesFilter] = useState<"todas" | "pendente" | "pago" | "recusado">("todas");
  const [comissoesSearch, setComissoesSearch] = useState("");
  const [processingComissaoId, setProcessingComissaoId] = useState<string | null>(null);
  const [comissaoReceiptText, setComissaoReceiptText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "partners" | "announcements" | "recargas" | "comissoes" | "precos" | "servicos_contabilidade" | "funnel" | "resets">("leads");
  const [resetNewPasswords, setResetNewPasswords] = useState<Record<string, string>>({});
  const [savingResetLeadId, setSavingResetLeadId] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetsFilter, setResetsFilter] = useState<"pendentes" | "todos">("pendentes");
  const [resetsSearch, setResetsSearch] = useState("");
  const [showLeadPortalSenha, setShowLeadPortalSenha] = useState<Record<string, boolean>>({});
  const [copiedLeadPortalSenha, setCopiedLeadPortalSenha] = useState<Record<string, boolean>>({});
  const [customBasePrices, setCustomBasePrices] = useState<Record<string, number>>({});
  const [editPrices, setEditPrices] = useState<Record<string, number>>({});
  const [customServices, setCustomServices] = useState<ServiceCatalogItem[]>(DEFAULT_SERVICES_CATALOG);
  const [newServNome, setNewServNome] = useState("");
  const [newServValor, setNewServValor] = useState<number | "">("");
  const [newServHublaLink, setNewServHublaLink] = useState("");

  const CREDIT_PRODUCTS = [
    { code: "REDEBE_DIAGNOSTICO_360", name: "Rating de Crédito + Diagnóstico Finan. 360", defaultPrice: 49.90 }
  ];

  useEffect(() => {
    setEditPrices(customBasePrices);
  }, [customBasePrices]);

  const [subFilter, setSubFilter] = useState<"todos" | "teste_ativo" | "cobranca_pendente" | "assinatura_ativa" | "assinatura_vencida">("todos");
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [porteFilter, setPorteFilter] = useState("todos");
  const [preparacaoFilter, setPreparacaoFilter] = useState("todos");
  const [etapaFilter, setEtapaFilter] = useState("todos");
  const [ratingFilter, setRatingFilter] = useState("todos");
  const [quickFilter, setQuickFilter] = useState<"todos" | "pendentes" | "novos" | "atendimento" | "concluidos">("todos");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isPendingPanelCollapsed, setIsPendingPanelCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [leadsViewMode, setLeadsViewMode] = useState<"grid" | "list">("list");
  const [hideTeamMembers, setHideTeamMembers] = useState<boolean>(true);

  // Pagination
  const [leadsPage, setLeadsPage] = useState(1);
  const [partnersPage, setPartnersPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setLeadsPage(1);
  }, [searchTerm, statusFilter, porteFilter, preparacaoFilter, etapaFilter, ratingFilter, quickFilter]);

  useEffect(() => {
    setPartnersPage(1);
  }, [searchTerm, statusFilter, porteFilter]);

  // Selection for details
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingPendenciaDesc, setEditingPendenciaDesc] = useState("");
  const [editingPendenciasMsg, setEditingPendenciasMsg] = useState("");
  const [editingPendenciasStatus, setEditingPendenciasStatus] = useState<'pendente' | 'resolvida'>("pendente");
  const [savingPendencia, setSavingPendencia] = useState(false);

  // Lead Workspace Modal State
  const [workspaceLead, setWorkspaceLead] = useState<any | null>(null);

  // Passo 6 Sub-etapas & Servicos Recomendados State
  const [editingSubEtapasPasso6, setEditingSubEtapasPasso6] = useState<{ id: string; titulo: string; concluida: boolean }[]>([]);
  const [savingSubEtapas, setSavingSubEtapas] = useState(false);
  const [editingServicosRecomendados, setEditingServicosRecomendados] = useState<any[]>([]);
  const [savingServicos, setSavingServicos] = useState(false);

  const prevSelectedLeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedLead) {
      setEditingPendenciaDesc(selectedLead.pendenciaDescricao || "");
      if (prevSelectedLeadIdRef.current !== selectedLead.id) {
        prevSelectedLeadIdRef.current = selectedLead.id;
        setEditingPendenciasMsg("");
      }
      const pStatus = selectedLead.pendencias?.status;
      setEditingPendenciasStatus(pStatus === "resolvida" && !selectedLead.pendente ? "resolvida" : "pendente");

      const rawServicos = selectedLead.servicosRecomendados || selectedLead.diagnosticoPROSFEC?.servicosRecomendados || [];
      const currentServicos = sanitizeAndSyncServicosList(rawServicos, customServices);
      setEditingServicosRecomendados(currentServicos);

      // Verificação de Integridade: As sub-etapas do Passo 6 só são carregadas e exibidas se o lead estiver no Passo 6
      const isPasso6OrAbove = (selectedLead.etapa || 1) >= 6;

      if (isPasso6OrAbove) {
        if (selectedLead.subEtapasPasso6 && Array.isArray(selectedLead.subEtapasPasso6) && selectedLead.subEtapasPasso6.length > 0) {
          if (currentServicos.length > 0) {
            // Filtro de Integridade: Preserva apenas sub-etapas verificadas do Diagnóstico (Passo 3) ou criadas explicitamente
            const merged = currentServicos.map((s: any, idx: number) => {
              const existing = selectedLead.subEtapasPasso6.find((sub: any) => sub.id === s.id || sub.titulo === s.nome);
              return {
                id: s.id || existing?.id || `sub_${Date.now()}_${idx + 1}`,
                titulo: s.nome || s.servico || `Serviço ${idx + 1}`,
                concluida: existing ? existing.concluida : (s.status === "concluido" || s.concluida || false),
                preco: typeof s.valor === "number" ? s.valor : (parseFloat(s.valor) || 0),
                statusPagamento: existing?.statusPagamento || (s.pago || s.statusPagamento === "pago" ? "pago" : "pendente"),
                formaPagamento: existing?.formaPagamento || s.formaPagamento,
                dataPagamento: existing?.dataPagamento || s.dataPagamento
              };
            });
            const extraCustom = selectedLead.subEtapasPasso6.filter((sub: any) => 
              (sub.id?.startsWith("sub_custom_") || sub.id?.startsWith("sub_")) && 
              !currentServicos.some((s: any) => s.id === sub.id || s.nome === sub.titulo)
            );
            setEditingSubEtapasPasso6([...merged, ...extraCustom]);
          } else {
            // Se não houver serviços diagnosticados no Passo 3, carrega apenas itens manuais válidos
            const onlyManual = selectedLead.subEtapasPasso6.filter((sub: any) => sub.id?.startsWith("sub_custom_"));
            setEditingSubEtapasPasso6(onlyManual);
          }
        } else if (currentServicos.length > 0) {
          setEditingSubEtapasPasso6(currentServicos.map((s: any, idx: number) => ({
            id: s.id || `sub_${Date.now()}_${idx + 1}`,
            titulo: s.nome || s.servico || `Serviço ${idx + 1}`,
            concluida: s.status === "concluido" || s.concluida || false,
            preco: typeof s.valor === "number" ? s.valor : (parseFloat(s.valor) || 0),
            statusPagamento: s.pago || s.statusPagamento === "pago" ? "pago" : "pendente",
            formaPagamento: s.formaPagamento,
            dataPagamento: s.dataPagamento
          })));
        } else {
          setEditingSubEtapasPasso6([]);
        }
      } else {
        // Bloqueio de Integridade: Lead está nas etapas 1 a 5, não popula sub-etapas do Passo 6 prematuramente
        setEditingSubEtapasPasso6([]);
      }
    } else {
      setEditingPendenciaDesc("");
      setEditingPendenciasMsg("");
      setEditingPendenciasStatus("pendente");
      setEditingSubEtapasPasso6([]);
      setEditingServicosRecomendados([]);
    }
    // Sempre esconde as senhas ao alternar de lead por privacidade
    setShowGovbrSenha(false);
    setShowSerasaSenha(false);
    setShowCertificadoSenha(false);
  }, [selectedLead, customServices]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);
  const [copiedPartnerId, setCopiedPartnerId] = useState<string | null>(null);
  const [copiedGovbr, setCopiedGovbr] = useState(false);
  const [copiedSerasa, setCopiedSerasa] = useState(false);
  const [copiedCertificado, setCopiedCertificado] = useState(false);

  // Estados de controle de exibição de senhas (máscara)
  const [showGovbrSenha, setShowGovbrSenha] = useState(false);
  const [showSerasaSenha, setShowSerasaSenha] = useState(false);
  const [showCertificadoSenha, setShowCertificadoSenha] = useState(false);

  // Estado para Direcionamento de Lead para Parceiro Master
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [selectedMasterPartnerId, setSelectedMasterPartnerId] = useState<string>("");
  const [isAssigningMaster, setIsAssigningMaster] = useState(false);

  useEffect(() => {
    if (assigningLead) {
      setSelectedMasterPartnerId(assigningLead.parceiroId || "");
    } else {
      setSelectedMasterPartnerId("");
    }
  }, [assigningLead]);

  const isMasterPartner = (p: Partner) => {
    if (!p.plano) return false;
    const pName = p.plano.toUpperCase();
    return pName.includes("FRANQUIA") || pName.includes("DIGITAL") || pName.includes("MASTER") || pName === "PLATINUM";
  };

  const masterPartners = partners.filter(isMasterPartner);

  const handleConfirmAssignMaster = async () => {
    if (!assigningLead) return;
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para vincular parceiros.");
      return;
    }
    if (!selectedMasterPartnerId) {
      alert("Por favor, selecione um Parceiro Master.");
      return;
    }

    const masterPartner = partners.find(p => p.id === selectedMasterPartnerId);
    if (!masterPartner) {
      alert("Parceiro Master selecionado não foi encontrado.");
      return;
    }

    try {
      setIsAssigningMaster(true);
      const leadRef = doc(db, "leads", assigningLead.id);
      await updateDoc(leadRef, {
        parceiroId: masterPartner.id,
        parceiroNome: masterPartner.nome
      });

      // Update local state
      setLeads(prev => prev.map(l => l.id === assigningLead.id ? {
        ...l,
        parceiroId: masterPartner.id,
        parceiroNome: masterPartner.nome
      } : l));

      if (selectedLead?.id === assigningLead.id) {
        setSelectedLead(prev => prev ? {
          ...prev,
          parceiroId: masterPartner.id,
          parceiroNome: masterPartner.nome
        } : null);
      }

      // Notify partner
      try {
        await createNotification(
          masterPartner.id,
          "parceiro",
          "Novo Lead Direcionado",
          `O Administrador direcionou o lead "${assigningLead.razaoSocial || assigningLead.nome}" para a sua carteira de atendimento!`,
          "info"
        );
      } catch (notifErr) {
        console.warn("Não foi possível gerar notificação:", notifErr);
      }

      alert(`Lead "${assigningLead.razaoSocial || assigningLead.nome}" direcionado com sucesso para o Parceiro Master ${masterPartner.nome}!`);
      setAssigningLead(null);
    } catch (err: any) {
      console.error("Erro ao vincular lead:", err);
      alert("Erro ao vincular lead ao Parceiro Master: " + (err?.message || String(err)));
    } finally {
      setIsAssigningMaster(false);
    }
  };

  // Announcement States & Handlers
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  const [annTitulo, setAnnTitulo] = useState("");
  const [annMensagem, setAnnMensagem] = useState("");
  const [annImagemUrl, setAnnImagemUrl] = useState("");
  const [annLinkUrl, setAnnLinkUrl] = useState("");
  const [annLinkTexto, setAnnLinkTexto] = useState("");
  const [annPublicoAlvo, setAnnPublicoAlvo] = useState<"todos" | "executive" | "franquia" | "agent">("todos");
  const [annAtivo, setAnnAtivo] = useState(true);

  const handleOpenNewAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnTitulo("");
    setAnnMensagem("");
    setAnnImagemUrl("");
    setAnnLinkUrl("");
    setAnnLinkTexto("");
    setAnnPublicoAlvo("todos");
    setAnnAtivo(true);
    setShowAnnouncementModal(true);
  };

  const handleOpenEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setAnnTitulo(ann.titulo);
    setAnnMensagem(ann.mensagem);
    setAnnImagemUrl(ann.imagemUrl || "");
    setAnnLinkUrl(ann.linkUrl || "");
    setAnnLinkTexto(ann.linkTexto || "");
    setAnnPublicoAlvo(ann.publicoAlvo);
    setAnnAtivo(ann.ativo);
    setShowAnnouncementModal(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitulo.trim() || !annMensagem.trim()) {
      alert("Por favor, preencha o título e a mensagem.");
      return;
    }

    setSavingAnnouncement(true);
    try {
      const annData = {
        titulo: annTitulo.trim(),
        mensagem: annMensagem.trim(),
        imagemUrl: annImagemUrl.trim() || null,
        linkUrl: annLinkUrl.trim() || null,
        linkTexto: annLinkTexto.trim() || null,
        publicoAlvo: annPublicoAlvo,
        ativo: annAtivo,
        dataCriacao: editingAnnouncement ? editingAnnouncement.dataCriacao : new Date().toISOString()
      };

      if (editingAnnouncement) {
        const docRef = doc(db, "comunicados", editingAnnouncement.id);
        await updateDoc(docRef, annData);
      } else {
        await addDoc(collection(db, "comunicados"), annData);
      }

      await fetchData();
      setShowAnnouncementModal(false);
    } catch (err) {
      console.error("Error saving announcement:", err);
      alert("Erro ao salvar comunicado no Firestore.");
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const generateClientPassword = () => {
    const nums = Math.floor(1000 + Math.random() * 9000);
    return `PROSFEC-${nums}`;
  };

  const handleAdminResetClientPassword = async (targetLead: Lead, customPassword?: string) => {
    const passwordToSet = customPassword || resetNewPasswords[targetLead.id] || generateClientPassword();
    if (!passwordToSet.trim()) {
      alert("Por favor, digite ou gere uma nova senha para o cliente.");
      return;
    }

    setSavingResetLeadId(targetLead.id);
    setResetSuccessMessage(null);

    try {
      const now = new Date().toISOString();
      const docRef = doc(db, "leads", targetLead.id);

      // Etapa B-2: a senha nunca é gravada em texto puro. O servidor calcula o
      // hash (PBKDF2) e só o hash fica no Firestore.
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch("/api/auth/cliente-reset-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-idtoken": idToken || ""
        },
        body: JSON.stringify({ leadId: targetLead.id, senha: passwordToSet.trim() })
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData?.error || "Falha ao redefinir a senha no servidor.");
      }

      // Marca o atendimento da solicitação (sem armazenar a senha gerada)
      await updateDoc(docRef, {
        clientePrimeiroAcessoConcluido: true,
        solicitacaoResetSenha: {
          pendente: false,
          dataAtendimento: now,
          atendidoPor: "Administração PROSFEC"
        },
        updated_at: now
      });

      // Find the consultant (partner) for this lead
      const consultant = partners.find(p => p.id === (targetLead as any).parceiroId);
      const consultantName = consultant?.nome || "Consultor Especialista";
      const consultantPhone = consultant?.whatsapp ? consultant.whatsapp.replace(/\D/g, "") : "";
      const companyName = targetLead.razaoSocial || targetLead.nome || "Empresa";
      const portalLink = `${getAppDomain()}?acompanhamento=${targetLead.id}`;

      // 1. Create in-app notification for the Consultant
      if ((targetLead as any).parceiroId) {
        try {
          await addDoc(collection(db, "notificacoes"), {
            recipientId: (targetLead as any).parceiroId,
            recipientType: "parceiro",
            titulo: `🔑 Senha do Portal Redefinida: ${companyName}`,
            mensagem: `A administração da PROSFEC redefiniu a senha do Portal do Cliente da empresa ${companyName} (CNPJ: ${targetLead.cnpj || "N/A"}). A nova credencial foi enviada ao consultor pelo WhatsApp — por segurança, ela não é armazenada no sistema.`,
            lida: false,
            dataCriacao: now,
            tipo: "senha_redefinida",
            leadId: targetLead.id
          });
        } catch (notifErr) {
          console.error("Error creating notification for consultant:", notifErr);
        }
      }

      // 2. Prepare WhatsApp message for Consultant
      const waText = encodeURIComponent(
        `Olá *${consultantName}*!\n\n` +
        `A administração da *PROSFEC* atendeu à solicitação de redefinição de senha de acesso ao *Portal do Cliente* da empresa *${companyName}* (CNPJ: ${targetLead.cnpj || "Não informado"}).\n\n` +
        `🔐 *Nova Senha de Acesso do Cliente:* *${passwordToSet.trim()}*\n` +
        `🔗 *Link do Portal:* ${portalLink}\n\n` +
        `Por favor, encaminhe esta mensagem com a nova senha para o seu cliente acessar o portal com total segurança.`
      );

      // Open WhatsApp to consultant
      if (consultantPhone) {
        window.open(`https://api.whatsapp.com/send?phone=${consultantPhone}&text=${waText}`, "_blank");
      } else {
        window.open(`https://api.whatsapp.com/send?text=${waText}`, "_blank");
      }

      setResetSuccessMessage(`Senha redefinida com sucesso para "${passwordToSet.trim()}". Mensagem do WhatsApp gerada para envio ao consultor!`);
      setTimeout(() => setResetSuccessMessage(null), 8000);

      // Clear input state for this lead
      setResetNewPasswords(prev => {
        const copy = { ...prev };
        delete copy[targetLead.id];
        return copy;
      });

      await fetchData();
    } catch (err) {
      console.error("Error resetting client password:", err);
      alert("Erro ao redefinir a senha do cliente. Tente novamente.");
    } finally {
      setSavingResetLeadId(null);
    }
  };

  const handleToggleAnnouncementActive = async (ann: Announcement) => {
    try {
      const docRef = doc(db, "comunicados", ann.id);
      await updateDoc(docRef, { ativo: !ann.ativo });
      await fetchData();
    } catch (err) {
      console.error("Error toggling announcement status:", err);
      alert("Erro ao alterar status do comunicado.");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para excluir comunicados.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir permanentemente este comunicado?")) {
      return;
    }

    try {
      const docRef = doc(db, "comunicados", id);
      await deleteDoc(docRef);
      await fetchData();
    } catch (err) {
      console.error("Error deleting announcement:", err);
      alert("Erro ao excluir comunicado.");
    }
  };

  const syncAllExistingLeadsWithCatalog = async (activeCatalog: ServiceCatalogItem[]): Promise<number> => {
    try {
      const leadsSnap = await getDocs(collection(db, "leads"));
      const batchPromises: Promise<any>[] = [];
      let updatedCount = 0;

      for (const d of leadsSnap.docs) {
        const leadData = d.data();
        let changed = false;
        const updates: any = {};

        if (Array.isArray(leadData.servicosRecomendados) && leadData.servicosRecomendados.length > 0) {
          const synced = sanitizeAndSyncServicosList(leadData.servicosRecomendados, activeCatalog);
          updates.servicosRecomendados = synced;
          changed = true;
        }

        if (Array.isArray(leadData.subEtapasPasso6) && leadData.subEtapasPasso6.length > 0) {
          const synced = sanitizeAndSyncServicosList(leadData.subEtapasPasso6, activeCatalog);
          updates.subEtapasPasso6 = synced;
          changed = true;
        }

        if (changed) {
          const rawForMultilevel = updates.subEtapasPasso6 || updates.servicosRecomendados;
          const commPayload = buildLeadMultilevelFirestorePayload(
            { ...leadData, ...updates, id: d.id },
            partners,
            null,
            rawForMultilevel
          );
          updates.subEtapasPasso6 = commPayload.subEtapasPasso6;
          updates.comissaoMultinivel = commPayload.comissaoMultinivel;

          batchPromises.push(updateDoc(d.ref, cleanForFirestore(updates)));
          updatedCount++;
        }
      }

      if (batchPromises.length > 0) {
        await Promise.all(batchPromises);
      }
      return updatedCount;
    } catch (e) {
      console.error("Error batch updating existing leads:", e);
      return 0;
    }
  };

  const handleSyncAllLeadsManual = async () => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para alterar preços.");
      return;
    }
    if (!confirm("Deseja sincronizar os preços do catálogo atual em todos os leads cadastrados no painel? Os valores dos serviços e as comissões multinível serão recalculados.")) {
      return;
    }
    try {
      setLoading(true);
      const sanitizedServices = sanitizeServiceCatalogForFirestore(customServices);
      const count = await syncAllExistingLeadsWithCatalog(sanitizedServices);
      alert(`Sincronização concluída com sucesso! ${count} lead(s) foram atualizados com a tabela de preços vigente.`);
      await fetchData();
    } catch (err) {
      console.error("Erro na sincronização manual de leads:", err);
      alert("Erro ao sincronizar leads: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrices = async () => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para alterar preços das consultas.");
      return;
    }

    try {
      setLoading(true);
      const configRef = doc(db, "configuracoes", "precos_consultas");

      const sanitizedServices = sanitizeServiceCatalogForFirestore(customServices);
      const sanitizedPrices: Record<string, number> = {};
      if (editPrices && typeof editPrices === "object") {
        for (const [k, v] of Object.entries(editPrices)) {
          if (v !== undefined && v !== null && !isNaN(Number(v))) {
            sanitizedPrices[k] = Number(v);
          }
        }
      }

      const payload = cleanForFirestore({
        precos: sanitizedPrices,
        servicos: sanitizedServices,
        updatedAt: new Date().toISOString()
      });

      await setDoc(configRef, payload, { merge: true });

      // Synchronize all existing leads in the database with updated catalog prices & commissions
      const updatedLeadsCount = await syncAllExistingLeadsWithCatalog(sanitizedServices);

      setCustomBasePrices(sanitizedPrices);
      setCustomServices(sanitizedServices);
      alert(`Tabela de preços de consultas e catálogo de serviços atualizada com sucesso!${updatedLeadsCount > 0 ? `\n\n${updatedLeadsCount} lead(s) cadastrados no painel tiveram seus serviços e comissões atualizados automaticamente.` : ''}`);
      await fetchData();
    } catch (err) {
      console.error("Error saving prices:", err);
      alert("Erro ao salvar preços no Firestore: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para alterar preços.");
      return;
    }

    if (!confirm("Tem certeza que deseja restaurar os preços e serviços para a tabela padrão? Isso também atualizará os serviços nos leads cadastrados.")) {
      return;
    }

    try {
      setLoading(true);
      const configRef = doc(db, "configuracoes", "precos_consultas");
      const defaultSanitized = sanitizeServiceCatalogForFirestore(DEFAULT_SERVICES_CATALOG);

      const payload = cleanForFirestore({
        precos: {},
        servicos: defaultSanitized,
        updatedAt: new Date().toISOString()
      });

      await setDoc(configRef, payload, { merge: true });

      // Synchronize all existing leads in the database with default catalog prices & commissions
      const updatedLeadsCount = await syncAllExistingLeadsWithCatalog(defaultSanitized);

      setCustomBasePrices({});
      setEditPrices({});
      setCustomServices(defaultSanitized);
      alert(`Preços e catálogo de serviços restaurados para o padrão!${updatedLeadsCount > 0 ? `\n\n${updatedLeadsCount} lead(s) sincronizados com o padrão.` : ''}`);
      await fetchData();
    } catch (err) {
      console.error("Error resetting prices:", err);
      alert("Erro ao restaurar preços padrão: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomService = () => {
    if (!newServNome.trim()) {
      alert("Por favor, digite o nome do novo serviço.");
      return;
    }
    const val = typeof newServValor === "number" ? newServValor : 0;
    const newServ: ServiceCatalogItem = {
      id: `serv_custom_${Date.now()}`,
      nome: newServNome.trim(),
      valor: val,
      ...(newServHublaLink.trim() ? { hublaLink: newServHublaLink.trim() } : {})
    };
    setCustomServices(prev => [...prev, newServ]);
    setNewServNome("");
    setNewServValor("");
    setNewServHublaLink("");
  };

  const handleRemoveCustomService = (id: string) => {
    setCustomServices(prev => prev.filter(s => s.id !== id));
  };

  const handleApproveRefill = async (refill: any) => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para liberar recargas.");
      return;
    }

    const isConsulta = refill.tipo === "consultas";
    const confirmMsg = isConsulta
      ? `Deseja aprovar e liberar R$ ${refill.valor.toFixed(2).replace(".", ",")} de saldo geral (Consultas & Contabilidade) para o parceiro ${refill.partnerNome}?`
      : `Deseja aprovar e liberar ${refill.buscas} buscas para o parceiro ${refill.partnerNome}?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      // 1. Update refill status
      const refillRef = doc(db, "recargas", refill.id);
      await updateDoc(refillRef, {
        status: "aprovada",
        dataAprovacao: new Date().toISOString()
      });

      // 2. Update partner balance/credits
      const partnerRef = doc(db, "parceiros", refill.partnerId);
      const partner = partners.find(p => p.id === refill.partnerId);

      if (isConsulta) {
        const currentBalance = partner?.saldoGeral !== undefined ? Number(partner.saldoGeral) : (partner?.saldoConsultas !== undefined ? Number(partner.saldoConsultas) : 0.00);
        const newBalance = Number((currentBalance + refill.valor).toFixed(2));
        await updateDoc(partnerRef, {
          saldoGeral: newBalance,
          saldoConsultas: newBalance
        });
        
        // Notify the partner through the notifications system
        try {
          await addDoc(collection(db, "notificacoes"), {
            recipientId: refill.partnerId,
            recipientType: "parceiro",
            titulo: "Saldo Geral Liberado",
            mensagem: `Sua recarga de R$ ${refill.valor.toFixed(2).replace(".", ",")} de saldo geral foi aprovada e já está disponível para Consultas de Crédito e Serviços de Contabilidade!`,
            tipo: "success",
            lida: false,
            dataCriacao: new Date().toISOString()
          });
        } catch (notifErr) {
          console.error("Erro ao criar notificação de recarga aprovada:", notifErr);
        }

        alert(`Recarga de R$ ${refill.valor.toFixed(2).replace(".", ",")} de saldo geral liberada com sucesso para ${refill.partnerNome}!`);
      } else {
        const currentCredits = partner?.cacaLeadsCredits || 0;
        const newCredits = currentCredits + refill.buscas;
        await updateDoc(partnerRef, {
          cacaLeadsCredits: newCredits
        });
        alert(`Recarga de ${refill.buscas} buscas liberada com sucesso para ${refill.partnerNome}!`);
      }

      await fetchData();
    } catch (err) {
      console.error("Erro ao aprovar recarga:", err);
      alert("Erro ao aprovar recarga: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCancelRefill = async (id: string) => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para recusar recargas.");
      return;
    }

    if (!confirm("Deseja recusar esta solicitação de recarga?")) {
      return;
    }

    try {
      const refillRef = doc(db, "recargas", id);
      await updateDoc(refillRef, {
        status: "cancelada",
        dataAprovacao: new Date().toISOString()
      });
      alert("Solicitação de recarga recusada com sucesso.");
      await fetchData();
    } catch (err) {
      console.error("Erro ao cancelar recarga:", err);
      alert("Erro ao recusar recarga: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handlePayCommission = async (solicitacao: SolicitacaoComissao) => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para liquidar comissões.");
      return;
    }

    const valorFormatado = formatCurrencyBRL(solicitacao.valor);
    if (!confirm(`Confirmar que o pagamento manual de ${valorFormatado} foi realizado via PIX para o parceiro ${solicitacao.partnerNome}?\nChave PIX: ${solicitacao.chavePix}`)) {
      return;
    }

    setProcessingComissaoId(solicitacao.id);
    try {
      const docRef = doc(db, "solicitacoes_comissao", solicitacao.id);
      const comprovanteText = comissaoReceiptText[solicitacao.id]?.trim() || "Comprovante Pix processado via Administração PROSFEC";
      const now = new Date().toISOString();

      await updateDoc(docRef, {
        status: "pago",
        dataPagamento: now,
        comprovante: comprovanteText
      });

      // Notify partner
      if (solicitacao.partnerId) {
        try {
          await addDoc(collection(db, "notificacoes"), {
            recipientId: solicitacao.partnerId,
            recipientType: "parceiro",
            titulo: "💰 Comissão Paga com Sucesso!",
            mensagem: `O seu repasse de comissão no valor de ${valorFormatado} foi pago com sucesso na chave PIX: ${solicitacao.chavePix}.`,
            tipo: "success",
            lida: false,
            dataCriacao: now
          });
        } catch (notifErr) {
          console.warn("Erro ao criar notificação de comissão paga:", notifErr);
        }
      }

      alert(`Pagamento de ${valorFormatado} registrado como PAGO com sucesso para ${solicitacao.partnerNome}!`);
      await fetchData();
    } catch (err) {
      console.error("Erro ao marcar comissão como paga:", err);
      alert("Erro ao processar o pagamento da comissão no Firestore.");
    } finally {
      setProcessingComissaoId(null);
    }
  };

  const handleRejectCommission = async (id: string, partnerNome: string) => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para recusar comissões.");
      return;
    }

    const motivo = prompt(`Informe o motivo da recusa da solicitação de ${partnerNome}:`, "Dados bancários/Pix incorretos ou inconsistência de liquidação");
    if (motivo === null) return;

    setProcessingComissaoId(id);
    try {
      const docRef = doc(db, "solicitacoes_comissao", id);
      await updateDoc(docRef, {
        status: "recusado",
        observacoes: motivo.trim() || "Solicitação recusada pela administração",
        dataAtualizacao: new Date().toISOString()
      });

      alert("Solicitação de comissão recusada.");
      await fetchData();
    } catch (err) {
      console.error("Erro ao recusar comissão:", err);
      alert("Erro ao recusar solicitação.");
    } finally {
      setProcessingComissaoId(null);
    }
  };

  const handleApplyPreset = (preset: {
    titulo: string;
    mensagem: string;
    imagemUrl: string;
    linkUrl: string;
    linkTexto: string;
    publicoAlvo: "todos" | "executive" | "franquia" | "agent";
  }) => {
    setAnnTitulo(preset.titulo);
    setAnnMensagem(preset.mensagem);
    setAnnImagemUrl(preset.imagemUrl);
    setAnnLinkUrl(preset.linkUrl);
    setAnnLinkTexto(preset.linkTexto);
    setAnnPublicoAlvo(preset.publicoAlvo);
  };

  const ANNOUNCEMENT_PRESETS = [
    {
      titulo: "Campanha Promocional Pronampe 2026",
      mensagem: "Olá parceiro! Lançamos uma nova campanha de indicação de leads com comissão turbinada para este mês. Indique empresas e receba seus honorários em tempo recorde!",
      imagemUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
      linkUrl: "https://t.me/prosfec_parceiros",
      linkTexto: "Acessar Grupo Telegram",
      publicoAlvo: "todos" as const,
    },
    {
      titulo: "Nova Linha de Crédito para Microempresas",
      mensagem: "Atualizamos o simulador com novas taxas reduzidas para microempresas (ME) com faturamento até R$ 360 mil. Aproveite para reengajar seus contatos antigos!",
      imagemUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
      linkUrl: "",
      linkTexto: "",
      publicoAlvo: "todos" as const,
    },
    {
      titulo: "Material de Apoio e Treinamento PROSFEC",
      mensagem: "Disponibilizamos novos criativos para você postar no seu Instagram e WhatsApp. Acesse o drive oficial do parceiro clicando no botão abaixo.",
      imagemUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
      linkUrl: "https://drive.google.com",
      linkTexto: "Acessar Drive de Materiais",
      publicoAlvo: "todos" as const,
    }
  ];

  const handleCopyTrackingLink = (leadId: string) => {
    const link = `${getAppDomain()}?acompanhamento=${leadId}`;
    navigator.clipboard.writeText(link);
    setCopiedLeadId(leadId);
    setTimeout(() => setCopiedLeadId(null), 2000);
  };

  const handleCopyPartnerLink = (partnerId: string) => {
    const link = `${getAppDomain()}?ref=${partnerId}`;
    navigator.clipboard.writeText(link);
    setCopiedPartnerId(partnerId);
    setTimeout(() => setCopiedPartnerId(null), 2000);
  };

  // Stats
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalPartners: 0,
    totalCreditSimulated: 0,
    avgFaturamento: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Leads
      const leadsQuery = query(collection(db, "leads"), orderBy("dataCriacao", "desc"));
      const leadsSnapshot = await getDocs(leadsQuery);
      const leadsList = leadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];

      // 2. Fetch Partners
      const partnersQuery = query(collection(db, "parceiros"), orderBy("dataCriacao", "desc"));
      let partnersSnapshot = await getDocs(partnersQuery);
      
      // Se a coleção de parceiros estiver vazia, cria um parceiro exemplo de boas-vindas
      if (partnersSnapshot.empty) {
        try {
          const examplePartner = {
            nome: "Parceiro Oficial de Demonstração",
            whatsapp: "(11) 99999-9999",
            email: "parceiro.teste@prosfec.com.br",
            cidade: "São Paulo - SP",
            interesse: "ser parceiro",
            status: "aprovado",
            dataCriacao: new Date().toISOString(),
            plano: "premium",
            aceitouTermos: true,
            chavePix: "prosfec.tesouraria@gmail.com"
          };
          await addDoc(collection(db, "parceiros"), examplePartner);
          partnersSnapshot = await getDocs(partnersQuery);
        } catch (errInitPartner) {
          console.warn("Could not auto-initialize partners collection:", errInitPartner);
        }
      }

      const partnersList = partnersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Partner[];

      setLeads(leadsList);
      setPartners(partnersList);

      // 3. Fetch Announcements
      try {
        const announcementsQuery = query(collection(db, "comunicados"), orderBy("dataCriacao", "desc"));
        let announcementsSnapshot = await getDocs(announcementsQuery);
        
        // Se a coleção de comunicados estiver vazia, cria o primeiro comunicado de boas-vindas automaticamente
        if (announcementsSnapshot.empty) {
          try {
            const welcomeAnnouncement = {
              titulo: "Bem-vindo ao Portal de Parceiros PROSFEC!",
              mensagem: "Este é o seu portal oficial de comunicados, campanhas de incentivo e avisos importantes. Fique atento às nossas postagens!",
              imagemUrl: null,
              linkUrl: null,
              linkTexto: null,
              publicoAlvo: "todos",
              ativo: true,
              dataCriacao: new Date().toISOString()
            };
            await addDoc(collection(db, "comunicados"), welcomeAnnouncement);
            announcementsSnapshot = await getDocs(announcementsQuery);
          } catch (errInitAnn) {
            console.warn("Could not auto-initialize announcements collection:", errInitAnn);
          }
        }

        const announcementsList = announcementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Announcement[];
        setAnnouncements(announcementsList);
      } catch (errAnn) {
        console.warn("Could not load announcements, might be empty:", errAnn);
        setAnnouncements([]);
      }

      // 4. Calculate Stats
      const totalLeads = leadsList.length;
      const totalPartners = partnersList.length;
      const totalCreditSimulated = leadsList.reduce((acc, lead) => acc + (lead.limiteEstimado || 0), 0);
      const faturamentos = leadsList.filter(l => l.faturamentoAnual).map(l => l.faturamentoAnual || 0);
      const avgFaturamento = faturamentos.length > 0 
        ? faturamentos.reduce((acc, val) => acc + val, 0) / faturamentos.length 
        : 0;

      setStats({
        totalLeads,
        totalPartners,
        totalCreditSimulated,
        avgFaturamento
      });

      // 5. Fetch Recargas
      try {
        const recargasQuery = query(collection(db, "recargas"), orderBy("dataSolicitacao", "desc"));
        const recargasSnapshot = await getDocs(recargasQuery);
        const recargasList = recargasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecargas(recargasList);
      } catch (errRec) {
        console.warn("Could not load recargas:", errRec);
        setRecargas([]);
      }

      // 5.1 Fetch Solicitações de Comissão (Saques de Parceiros)
      try {
        const comissoesQuery = query(collection(db, "solicitacoes_comissao"), orderBy("dataSolicitacao", "desc"));
        const comissoesSnapshot = await getDocs(comissoesQuery);
        const comissoesList = comissoesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SolicitacaoComissao[];
        setComissoes(comissoesList);
      } catch (errCom) {
        console.warn("Could not load solicitacoes_comissao:", errCom);
        setComissoes([]);
      }

      // 6. Fetch Custom Base Prices & Services Catalog
      try {
        const configSnap = await getDoc(doc(db, "configuracoes", "precos_consultas"));
        if (configSnap.exists()) {
          const data = configSnap.data();
          setCustomBasePrices(data.precos || {});
          if (data.servicos && Array.isArray(data.servicos) && data.servicos.length > 0) {
            // Remove obsolete items: "Diagnóstico de Crédito — CPF ou CNPJ", "Recarga do Caça-Leads" e BACEN avulso legado
            const rawServs = data.servicos.filter((s: any) => 
              s.id !== "serv_diagnostico" && 
              s.id !== "serv_caca_leads" && 
              s.id !== "serv_bacen" &&
              !s.nome?.toLowerCase().includes("diagnóstico de crédito") &&
              !s.nome?.toLowerCase().includes("caça-leads") &&
              !s.nome?.toLowerCase().includes("atuação administrativa bacen")
            );
            const hasSeparate = rawServs.some((s: any) => 
              s.id === "serv_score" || 
              s.id === "serv_rating" || 
              (s.nome && s.nome.toLowerCase().includes("score") && !s.nome.toLowerCase().includes("rating")) ||
              (s.nome && s.nome.toLowerCase().includes("rating") && !s.nome.toLowerCase().includes("score"))
            );
            let processedCatalog = rawServs;
            if (hasSeparate) {
              let scoreVal = 400;
              let ratingVal = 700;
              const filtered = rawServs.filter((s: any) => {
                if (s.id === "serv_score" || (s.nome && s.nome.toLowerCase().includes("score") && !s.nome.toLowerCase().includes("rating"))) {
                  if (s.valor) scoreVal = Number(s.valor);
                  return false;
                }
                if (s.id === "serv_rating" || (s.nome && s.nome.toLowerCase().includes("rating") && !s.nome.toLowerCase().includes("score"))) {
                  if (s.valor) ratingVal = Number(s.valor);
                  return false;
                }
                return true;
              });
              if (!filtered.some((s: any) => s.id === "serv_rating_score" || (s.nome && s.nome.toLowerCase().includes("rating") && s.nome.toLowerCase().includes("score")))) {
                filtered.splice(1, 0, {
                  id: "serv_rating_score",
                  nome: "Melhoria e Adequação de Rating e Score",
                  valor: scoreVal + ratingVal,
                  hublaLink: HUBLA_SERVICE_LINKS.serv_rating_score
                });
              }
              processedCatalog = filtered;
            }

            // Garantir presença do Programa de Reabilitação Financeira e Creditícia (R$ 2.000,00)
            const hasReabilitacao = processedCatalog.some((s: any) =>
              s.id === "serv_reabilitacao" ||
              s.nome?.toLowerCase().includes("reabilitação") ||
              s.nome?.toLowerCase().includes("reabilitacao")
            );
            if (!hasReabilitacao) {
              processedCatalog.unshift({
                id: "serv_reabilitacao",
                nome: "Programa de Reabilitação Financeira e Creditícia",
                valor: 2000,
                hublaLink: HUBLA_SERVICE_LINKS.serv_reabilitacao
              });
            }

            // Atribuir links padrão para serviços pré-definidos caso não tenham link customizado
            processedCatalog = processedCatalog.map((s: any) => {
              if (!s.hublaLink && s.id && (HUBLA_SERVICE_LINKS as any)[s.id]) {
                return { ...s, hublaLink: (HUBLA_SERVICE_LINKS as any)[s.id] };
              }
              return s;
            });

            setCustomServices(processedCatalog);
          } else {
            setCustomServices(DEFAULT_SERVICES_CATALOG);
          }
        } else {
          setCustomBasePrices({});
          setCustomServices(DEFAULT_SERVICES_CATALOG);
        }
      } catch (errConfig) {
        console.warn("Could not load custom base prices:", errConfig);
      }

    } catch (err: any) {
      console.error("Error fetching admin dashboard data:", err);
      const code = String(err?.code || "");
      if (code.includes("permission-denied") || code.includes("unauthenticated")) {
        setError(
          "Acesso negado pelas regras do Firestore. Confirme que você entrou com uma conta autorizada (prosfec.tesouraria@gmail.com) e tente sair e entrar novamente."
        );
      } else {
        setError("Erro ao se conectar ao banco de dados Firestore. Certifique-se de que os cadastros foram realizados e que as permissões de acesso estão corretas.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        // Garante que o token do Firebase Auth já está disponível antes de ler o Firestore
        await auth.currentUser?.getIdToken();
      } catch {
        /* ignore */
      }
      if (!cancelled) fetchData();
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);


  const ADMIN_UID = "Nso5FBoBVHXNY60RDw6NNKeaCC23";
  const CONTADOR_UID = "vKZFCNniHJfzJ9B3yWlzErNC3892";

  // Mesma lista autorizada das regras do Firestore (firestore.rules)
  const ADMIN_EMAILS = ["prosfec.tesouraria@gmail.com"];
  const CONTADOR_EMAILS = ["contador.prosfec@gmail.com"];

  const resolveRole = (user: any): "admin" | "contador" | null => {
    if (!user) return null;
    const email = String(user.email || "").toLowerCase();
    if (user.uid === ADMIN_UID || ADMIN_EMAILS.includes(email)) return "admin";
    if (user.uid === CONTADOR_UID || CONTADOR_EMAILS.includes(email)) return "contador";
    return null;
  };

  // Sessão administrativa controlada exclusivamente pelo Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const role = resolveRole(user);
      if (user && role) {
        setUserRole(role);
        setIsAuthenticated(true);
      } else {
        if (user) {
          // Usuário autenticado, porém sem permissão administrativa
          try {
            await signOut(auth);
          } catch {
            /* ignore */
          }
          setLoginError("Esta conta não tem permissão de acesso ao painel administrativo.");
        }
        setIsAuthenticated(false);
      }
      setCheckingSession(false);
    });

    return () => unsubscribe();
  }, []);

  // Security: Inactivity auto-logout (30 minutes of no user interaction)
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.warn("[Segurança] Sessão administrativa encerrada por inatividade.");
        handleLogout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [isAuthenticated]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);

    const normalizedEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    try {
      // 1. First attempt: Authenticate directly with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, cleanPassword);
      const user = userCredential.user;
      const detectedRole = resolveRole(user);

      if (!detectedRole) {
        await signOut(auth);
        setLoginError("Esta conta não tem permissão de acesso ao painel administrativo.");
        return;
      }

      setUserRole(detectedRole);
      setIsAuthenticated(true);
      setPasswordInput("");
    } catch (authErr: any) {
      const code = authErr?.code || "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-email"
      ) {
        setLoginError("E-mail ou senha incorretos. Verifique suas credenciais.");
      } else if (code === "auth/too-many-requests") {
        setLoginError("Muitas tentativas malsucedidas. Por segurança, tente novamente em alguns instantes.");
      } else if (code === "auth/network-request-failed") {
        setLoginError("Falha de conexão. Verifique sua internet e tente novamente.");
      } else {
        setLoginError("Não foi possível concluir a autenticação. Tente novamente.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Error signing out from Firebase Auth.");
    }
    setIsAuthenticated(false);
    setUserRole("admin");
    setEmailInput("");
    setPasswordInput("");
    onExit();
  };

  const handleUpdateStatus = async (id: string, collectionName: "leads" | "parceiros", newStatus: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, { status: newStatus });
      
      // Update local state
      if (collectionName === "leads") {
        setLeads(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
        if (selectedLead?.id === id) {
          setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
        }
        
        // Notify Lead and Partner!
        const lead = leads.find(l => l.id === id);
        if (lead) {
          const statusText = getStatusLabel(newStatus);
          
          // Notify Lead
          await createNotification(
            id,
            "lead",
            "Atualização de Status",
            `O status da sua solicitação de crédito para a empresa "${lead.razaoSocial || lead.nome}" foi atualizado para: ${statusText}.`,
            newStatus === "reprovado" ? "error" : newStatus === "aprovado" ? "success" : "info"
          );
          
          // Notify Partner if present
          if (lead.parceiroId) {
            await createNotification(
              lead.parceiroId,
              "parceiro",
              "Status do Lead Atualizado",
              `O lead "${lead.nome}" (${lead.razaoSocial || "Simulação"}) teve seu status alterado para: ${statusText}.`,
              newStatus === "reprovado" ? "error" : newStatus === "aprovado" ? "success" : "info"
            );
          }
        }
      } else {
        setPartners(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
        if (selectedPartner?.id === id) {
          setSelectedPartner(prev => prev ? { ...prev, status: newStatus } : null);
        }
        
        // Notify Partner about partnership status update
        const partner = partners.find(p => p.id === id);
        if (partner) {
          const statusText = getStatusLabel(newStatus);
          await createNotification(
            id,
            "parceiro",
            "Status da Parceria",
            `Seu cadastro como parceiro PROSFEC foi atualizado para: ${statusText}.`,
            newStatus === "reprovado" ? "error" : newStatus === "aprovado" ? "success" : "info"
          );
        }
      }
    } catch (err) {
      console.error("Error updating status in Firestore:", err);
      alert("Falha ao atualizar o status no Firestore. Tente novamente.");
    }
  };

  const handleUpdateEtapa = async (id: string, newEtapa: number) => {
    try {
      const docRef = doc(db, "leads", id);
      const leadToUpdate = leads.find(l => l.id === id);
      const prevEtapa = leadToUpdate?.etapa || 1;
      
      const newHistoryItem = {
        data: new Date().toISOString(),
        etapaAnterior: prevEtapa,
        etapaNova: newEtapa,
        autor: "Administrador",
        detalhes: `Etapa alterada de "${ETAPAS_LABELS[prevEtapa] || prevEtapa}" para "${ETAPAS_LABELS[newEtapa] || newEtapa}"`
      };
      
      const updatedHistory = leadToUpdate?.historicoEtapas 
        ? [...leadToUpdate.historicoEtapas, newHistoryItem]
        : [newHistoryItem];

      await updateDoc(docRef, { 
        etapa: newEtapa,
        historicoEtapas: updatedHistory
      });
      
      // Update local state
      setLeads(prev => prev.map(item => item.id === id ? { ...item, etapa: newEtapa, historicoEtapas: updatedHistory } : item));
      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? { ...prev, etapa: newEtapa, historicoEtapas: updatedHistory } : null);
      }

      // Notify Lead and Partner
      if (leadToUpdate) {
        const stageName = ETAPAS_LABELS[newEtapa] || `Etapa ${newEtapa}`;
        await createNotification(
          id,
          "lead",
          "Avanço da Proposta",
          `Sua solicitação de crédito avançou para a etapa: "${stageName}".`,
          "success"
        );
        
        if (leadToUpdate.parceiroId) {
          await createNotification(
            leadToUpdate.parceiroId,
            "parceiro",
            "Etapa do Lead Atualizada",
            `A proposta do lead "${leadToUpdate.nome}" avançou para a etapa: "${stageName}".`,
            "success"
          );
        }
      }
    } catch (err) {
      console.error("Error updating etapa in Firestore:", err);
      alert("Falha ao atualizar a etapa no Firestore. Tente novamente.");
    }
  };

  const handleUpdateValorAprovado = async (id: string, valor: number) => {
    try {
      const docRef = doc(db, "leads", id);
      const isApproved = valor > 0;
      const updateData: any = { 
        valorAprovado: valor,
        resultadoAnaliseCredito: isApproved ? "aprovado" : "em_analise"
      };
      if (isApproved) {
        updateData.status = "concluido";
        updateData.etapa = 7;
      }
      await updateDoc(docRef, updateData);
      
      // Update local state
      setLeads(prev => prev.map(item => item.id === id ? { 
        ...item, 
        valorAprovado: valor,
        resultadoAnaliseCredito: updateData.resultadoAnaliseCredito,
        status: isApproved ? "concluido" : item.status,
        etapa: isApproved ? 7 : item.etapa
      } : item));

      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? { 
          ...prev, 
          valorAprovado: valor,
          resultadoAnaliseCredito: updateData.resultadoAnaliseCredito,
          status: isApproved ? "concluido" : prev.status,
          etapa: isApproved ? 7 : prev.etapa
        } : null);
      }

      // Notify Lead and Partner of approval value
      const leadToUpdate = leads.find(l => l.id === id);
      if (leadToUpdate && isApproved) {
        const formattedValue = formatCurrencyBRL(valor);
        await createNotification(
          id,
          "lead",
          "Crédito Liberado!",
          `Parabéns! Foi liberado um valor aprovado de ${formattedValue} para a sua empresa.`,
          "success"
        );
        
        if (leadToUpdate.parceiroId) {
          await createNotification(
            leadToUpdate.parceiroId,
            "parceiro",
            "Crédito Aprovado para Indicação",
            `Excelente! A proposta do seu indicado "${leadToUpdate.nome}" foi aprovada no valor de ${formattedValue}.`,
            "success"
          );
        }
      }
    } catch (err) {
      console.error("Error updating valorAprovado in Firestore:", err);
      alert("Falha ao atualizar o valor aprovado no Firestore. Tente novamente.");
    }
  };

  const handleSetCreditoRecusado = async (id: string, motivo?: string) => {
    try {
      const docRef = doc(db, "leads", id);
      const updateData = {
        valorAprovado: 0,
        status: "recusado",
        resultadoAnaliseCredito: "recusado",
        motivoRecusa: motivo || "Recusa técnica na esteira bancária devido a apontamentos ou políticas de crédito vigentes.",
        dataResultadoAnalise: new Date().toISOString()
      };
      await updateDoc(docRef, updateData);

      setLeads(prev => prev.map(item => item.id === id ? { ...item, ...updateData } : item));
      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? { ...prev, ...updateData } : null);
      }

      const leadToUpdate = leads.find(l => l.id === id);
      if (leadToUpdate) {
        await createNotification(
          id,
          "lead",
          "Resultado da Análise de Crédito",
          `A análise de crédito da empresa "${leadToUpdate.nomeEmpresa || leadToUpdate.nome}" não pôde ser aprovada nesta rodada pelos agentes financeiros parceiros.`,
          "error"
        );

        if (leadToUpdate.parceiroId) {
          await createNotification(
            leadToUpdate.parceiroId,
            "parceiro",
            "Crédito Recusado para Indicação",
            `A proposta de crédito do seu indicado "${leadToUpdate.nome}" foi recusada pelos agentes bancários parceiros.`,
            "error"
          );
        }
      }
      alert("Status do lead atualizado para 'Crédito Recusado' com sucesso!");
    } catch (err) {
      console.error("Error marking credit as refused:", err);
      alert("Falha ao marcar crédito como recusado no Firestore.");
    }
  };

  const handleToggleServicoPago = async (id: string, marcarComoPago: boolean) => {
    try {
      const leadToUpdate = leads.find(l => l.id === id);
      if (!leadToUpdate) return;

      // Verificação de Integridade: Pagamento de serviços é exclusivo do Passo 6
      if ((leadToUpdate.etapa || 1) < 6) {
        alert("Verificação de Integridade: O status de pagamento de serviços só pode ser alterado quando o lead estiver no Passo 6 (Melhoria do Perfil de Crédito).");
        return;
      }

      const rawDiagnosticoServices = leadToUpdate.servicosRecomendados || leadToUpdate.diagnosticoPROSFEC?.servicosRecomendados || [];
      const verifiedServices = sanitizeAndSyncServicosList(rawDiagnosticoServices, customServices);

      const currentSubEtapas = Array.isArray(leadToUpdate.subEtapasPasso6) && leadToUpdate.subEtapasPasso6.length > 0
        ? leadToUpdate.subEtapasPasso6
        : (editingSubEtapasPasso6.length > 0 
            ? editingSubEtapasPasso6 
            : verifiedServices.map((s: any, idx: number) => ({
                id: s.id || `sub_${Date.now()}_${idx + 1}`,
                titulo: s.nome || s.servico || `Serviço ${idx + 1}`,
                concluida: s.status === "concluido" || s.concluida || false,
                preco: typeof s.valor === "number" ? s.valor : (parseFloat(s.valor) || 0),
                statusPagamento: "pendente"
              }))
          );

      const updatedSubEtapas = currentSubEtapas.map((sub: any) => ({
        ...sub,
        statusPagamento: marcarComoPago ? "pago" : "pendente",
        dataPagamento: marcarComoPago ? (sub.dataPagamento || new Date().toISOString()) : null
      }));

      const commissionPayload = buildLeadMultilevelFirestorePayload(
        leadToUpdate,
        partners,
        null,
        updatedSubEtapas
      );

      const updateData: any = {
        servicoPago: marcarComoPago,
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel,
        dataConfirmacaoPagamentoServico: marcarComoPago ? new Date().toISOString() : null
      };

      const docRef = doc(db, "leads", id);
      await updateDoc(docRef, updateData);

      setLeads(prev => prev.map(item => item.id === id ? { ...item, ...updateData } : item));
      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? { ...prev, ...updateData } : null);
      }
      if (updatedSubEtapas.length > 0) {
        setEditingSubEtapasPasso6(commissionPayload.subEtapasPasso6);
      }

      // Notify partner
      if (leadToUpdate.parceiroId) {
        await createNotification(
          leadToUpdate.parceiroId,
          "parceiro",
          marcarComoPago ? "Serviço Pago pelo Cliente!" : "Status de Serviço Atualizado",
          marcarComoPago 
            ? `O pagamento do serviço pelo cliente "${leadToUpdate.nome}" foi confirmado pelo ADM! As comissões já constam como pagas/em liquidação.`
            : `O status de pagamento do serviço do lead "${leadToUpdate.nome}" foi alterado para pendente.`,
          marcarComoPago ? "success" : "info"
        );
      }

      alert(marcarComoPago ? "Serviço marcado como PAGO com sucesso! Comissões e sub-etapas sincronizadas." : "Serviço marcado como PENDENTE com sucesso.");
    } catch (err) {
      console.error("Error toggling servicoPago:", err);
      alert("Falha ao atualizar o status de pagamento do serviço no Firestore.");
    }
  };

  const handleUpdateComissaoPaga = async (id: string, paga: boolean) => {
    try {
      const docRef = doc(db, "leads", id);
      await updateDoc(docRef, { comissaoPaga: paga });
      
      // Update local state
      setLeads(prev => prev.map(item => item.id === id ? { ...item, comissaoPaga: paga } : item));
      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? { ...prev, comissaoPaga: paga } : null);
      }

      // Notify Partner if present
      const leadToUpdate = leads.find(l => l.id === id);
      if (leadToUpdate && leadToUpdate.parceiroId && paga) {
        await createNotification(
          leadToUpdate.parceiroId,
          "parceiro",
          "Comissão Paga!",
          `O pagamento da comissão referente ao indicado "${leadToUpdate.nome}" foi realizado e liquidado com sucesso!`,
          "success"
        );
      }
    } catch (err) {
      console.error("Error updating comissaoPaga in Firestore:", err);
      alert("Falha ao atualizar o status de comissão no Firestore. Tente novamente.");
    }
  };

  const handleUpdateSubEtapasPasso6 = async () => {
    if (!selectedLead) return;

    // Verificação de Integridade: Impede salvar sub-etapas do Passo 6 se o lead não estiver na etapa 6
    if ((selectedLead.etapa || 1) < 6) {
      alert("Verificação de Integridade: As sub-etapas do Passo 6 só podem ser persistidas após o lead avançar para a Etapa 6.");
      return;
    }

    const rawDiagnosticoServices = selectedLead.servicosRecomendados || selectedLead.diagnosticoPROSFEC?.servicosRecomendados || [];
    const verifiedServices = sanitizeAndSyncServicosList(rawDiagnosticoServices, customServices);

    // Filtra e valida sub-etapas garantindo que correspondam ao diagnóstico da Etapa 3 ou a adições manuais explícitas
    const validatedSubEtapas = editingSubEtapasPasso6.filter(sub => {
      if (!sub.titulo || sub.titulo.trim() === "") return false;
      const isDiagnosed = verifiedServices.some(s => s.id === sub.id || s.nome === sub.titulo);
      const isManual = sub.id?.startsWith("sub_custom_") || sub.id?.startsWith("sub_");
      return isDiagnosed || isManual;
    });

    setSavingSubEtapas(true);
    try {
      const commissionPayload = buildLeadMultilevelFirestorePayload(
        selectedLead,
        partners,
        null,
        validatedSubEtapas
      );

      const firestoreUpdate = cleanForFirestore({
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel
      });

      const docRef = doc(db, "leads", selectedLead.id);
      await updateDoc(docRef, firestoreUpdate);
      setLeads(prev => prev.map(item => item.id === selectedLead.id ? { ...item, subEtapasPasso6: commissionPayload.subEtapasPasso6, comissaoMultinivel: commissionPayload.comissaoMultinivel } : item));
      setSelectedLead(prev => prev ? { ...prev, subEtapasPasso6: commissionPayload.subEtapasPasso6, comissaoMultinivel: commissionPayload.comissaoMultinivel } : null);
      alert("Sub-etapas do Passo 6 verificadas e comissões multinível salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar sub-etapas:", err);
      alert("Erro ao salvar sub-etapas do Passo 6.");
    } finally {
      setSavingSubEtapas(false);
    }
  };

  const handleSaveServicosRecomendados = async () => {
    if (!selectedLead) return;
    setSavingServicos(true);
    try {
      const syncedSubEtapas = editingServicosRecomendados.map((s: any, idx: number) => {
        const existing = editingSubEtapasPasso6.find(sub => sub.id === s.id || sub.titulo === s.nome);
        const item: any = {
          id: s.id || `sub_${Date.now()}_${idx + 1}`,
          titulo: s.nome || s.servico || `Serviço ${idx + 1}`,
          concluida: existing ? existing.concluida : (s.status === "concluido" || false),
          preco: typeof s.valor === "number" ? s.valor : (parseFloat(s.valor) || 0),
          statusPagamento: existing?.statusPagamento || (s.status === "concluido" ? "pago" : "pendente"),
        };
        if (s.hublaLink || existing?.hublaLink) item.hublaLink = s.hublaLink || existing?.hublaLink;
        if (existing?.formaPagamento || s.formaPagamento) item.formaPagamento = existing?.formaPagamento || s.formaPagamento;
        if (existing?.dataPagamento || s.dataPagamento) item.dataPagamento = existing?.dataPagamento || s.dataPagamento;
        return item;
      });

      const commissionPayload = buildLeadMultilevelFirestorePayload(
        { ...selectedLead, servicosRecomendados: editingServicosRecomendados },
        partners,
        null,
        syncedSubEtapas
      );

      const firestoreUpdate = cleanForFirestore({
        servicosRecomendados: editingServicosRecomendados,
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel
      });

      const docRef = doc(db, "leads", selectedLead.id);
      await updateDoc(docRef, firestoreUpdate);
      setEditingSubEtapasPasso6(commissionPayload.subEtapasPasso6);
      setLeads(prev => prev.map(item => item.id === selectedLead.id ? { ...item, servicosRecomendados: editingServicosRecomendados, subEtapasPasso6: commissionPayload.subEtapasPasso6, comissaoMultinivel: commissionPayload.comissaoMultinivel } : item));
      setSelectedLead(prev => prev ? { ...prev, servicosRecomendados: editingServicosRecomendados, subEtapasPasso6: commissionPayload.subEtapasPasso6, comissaoMultinivel: commissionPayload.comissaoMultinivel } : null);
      alert("Serviços recomendados, sub-etapas e comissões sincronizados com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar serviços recomendados:", err);
      alert("Erro ao salvar serviços recomendados.");
    } finally {
      setSavingServicos(false);
    }
  };

  const toggleManualPaymentForSubEtapa = async (idx: number) => {
    if (!selectedLead) return;

    // Verificação de Integridade: Apenas leads no Passo 6 podem ter baixa manual nas sub-etapas
    if ((selectedLead.etapa || 1) < 6) {
      alert("Verificação de Integridade: Confirmação manual de pagamento só é liberada no Passo 6.");
      return;
    }

    const target = editingSubEtapasPasso6[idx];
    const isPaid = (target as any)?.statusPagamento === "pago" || (target as any)?.pago === true;
    const newPaidState = !isPaid;

    const updated = [...editingSubEtapasPasso6];
    updated[idx] = {
      ...updated[idx],
      statusPagamento: newPaidState ? "pago" : "pendente",
      formaPagamento: newPaidState ? "manual_adm" : null,
      dataPagamento: newPaidState ? new Date().toISOString() : null,
      pago: newPaidState,
      concluida: newPaidState ? true : updated[idx].concluida
    } as any;

    const commissionPayload = buildLeadMultilevelFirestorePayload(
      selectedLead,
      partners,
      null,
      updated
    );

    setEditingSubEtapasPasso6(commissionPayload.subEtapasPasso6);

    try {
      const firestoreUpdate = cleanForFirestore({ 
        subEtapasPasso6: commissionPayload.subEtapasPasso6,
        comissaoMultinivel: commissionPayload.comissaoMultinivel
      });
      const leadRef = doc(db, "leads", selectedLead.id);
      await updateDoc(leadRef, firestoreUpdate);
      setSelectedLead(prev => prev ? { ...prev, subEtapasPasso6: commissionPayload.subEtapasPasso6, comissaoMultinivel: commissionPayload.comissaoMultinivel } : null);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, subEtapasPasso6: commissionPayload.subEtapasPasso6, comissaoMultinivel: commissionPayload.comissaoMultinivel } : l));
      alert(newPaidState ? "Pagamento verificado e confirmado manualmente com sucesso!" : "Status de pagamento alterado para pendente.");
    } catch (err) {
      console.error("Erro ao salvar baixa manual:", err);
      alert("Erro ao registrar confirmação manual no Firestore.");
    }
  };

  const handleUpdatePendencias = async (id: string, status: 'pendente' | 'resolvida', mensagem: string) => {
    setSavingPendencia(true);
    try {
      const docRef = doc(db, "leads", id);
      const isPendente = status === "pendente";
      
      const existingLead = leads.find(l => l.id === id);
      const currentHistorico = existingLead?.pendencias?.historico || [];

      const nowIso = new Date().toISOString();
      const statusFormat = isPendente ? "pendente" : "resolvida";

      // Create history entry if a message or status change occurred
      const newHistoryItem: PendenciaItem | null = mensagem.trim() ? {
        id: Date.now().toString(),
        autor: "admin",
        nomeAutor: "Mesa de Operações",
        mensagem: mensagem.trim(),
        data: nowIso,
        tipo: isPendente ? "pendencia" : "resolucao"
      } : null;

      const updatedHistorico = newHistoryItem ? [...currentHistorico, newHistoryItem] : currentHistorico;
      const lastSummaryMsg = mensagem.trim() || (existingLead?.pendencias as any)?.mensagem || (isPendente ? existingLead?.pendenciaDescricao : "") || "";
      
      const pendenciasObj = {
        id: Date.now().toString(),
        mensagem: isPendente ? lastSummaryMsg : "",
        status: statusFormat,
        dataCriacao: (existingLead?.pendencias as any)?.dataCriacao || nowIso,
        dataResposta: !isPendente ? nowIso : null,
        resposta: "", // Reseta a resposta ao enviar uma nova réplica/instrução do Admin
        historico: updatedHistorico
      };

      await updateDoc(docRef, { 
        pendente: isPendente,
        pendenciaDescricao: isPendente ? lastSummaryMsg : "",
        pendencias: pendenciasObj
      });
      
      // Update local state
      setLeads(prev => prev.map(item => item.id === id ? { 
        ...item, 
        pendente: isPendente, 
        pendenciaDescricao: lastSummaryMsg, 
        pendencias: pendenciasObj 
      } : item));
      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? { 
          ...prev, 
          pendente: isPendente, 
          pendenciaDescricao: lastSummaryMsg, 
          pendencias: pendenciasObj 
        } : null);
      }

      // Notify Lead and Partner of Pendência changes
      if (existingLead) {
        if (status === "pendente") {
          await createNotification(
            id,
            "lead",
            "Pendência de Documentação",
            `Atenção: sua proposta de crédito necessita de ajustes: "${mensagem}". Por favor, envie os documentos solicitados.`,
            "warning"
          );
          
          if (existingLead.parceiroId) {
            await createNotification(
              existingLead.parceiroId,
              "parceiro",
              "Pendência no Indicado",
              `O seu indicado "${existingLead.nome}" possui uma nova pendência: "${mensagem}". Ajude-o a regularizar.`,
              "warning"
            );
          }
        } else if (status === "resolvida") {
          await createNotification(
            id,
            "lead",
            "Pendências Regularizadas",
            `Excelente! Seus documentos pendentes foram recebidos e validados pela assessoria PROSFEC.`,
            "success"
          );
          
          if (existingLead.parceiroId) {
            await createNotification(
              existingLead.parceiroId,
              "parceiro",
              "Pendências Resolvidas",
              `As pendências do seu indicado "${existingLead.nome}" foram regularizadas com sucesso.`,
              "success"
            );
          }
        }
      }

      alert("Pendência atualizada com sucesso!");
      setEditingPendenciasMsg("");
    } catch (err) {
      console.error("Error updating pendencias in Firestore:", err);
      alert("Falha ao atualizar pendências no Firestore. Tente novamente.");
    } finally {
      setSavingPendencia(false);
    }
  };

  const handleClearChatHistory = async (id: string) => {
    if (!window.confirm("Deseja realmente apagar todo o histórico de conversas/pendências deste lead para economizar armazenamento?")) {
      return;
    }
    setSavingPendencia(true);
    try {
      const docRef = doc(db, "leads", id);
      const updatedPendencias = {
        id: Date.now().toString(),
        mensagem: "",
        status: "resolvida",
        dataCriacao: new Date().toISOString(),
        dataResposta: null,
        resposta: "",
        historico: []
      };
      await updateDoc(docRef, {
        pendente: false,
        pendenciaDescricao: "",
        pendencias: updatedPendencias
      });

      setLeads(prev => prev.map(item => item.id === id ? {
        ...item,
        pendente: false,
        pendenciaDescricao: "",
        pendencias: updatedPendencias
      } : item));

      if (selectedLead?.id === id) {
        setSelectedLead(prev => prev ? {
          ...prev,
          pendente: false,
          pendenciaDescricao: "",
          pendencias: updatedPendencias
        } : null);
      }
      setEditingPendenciasMsg("");
      alert("Histórico de conversas limpo com sucesso!");
    } catch (err) {
      console.error("Error clearing chat history:", err);
      alert("Erro ao limpar histórico de conversas.");
    } finally {
      setSavingPendencia(false);
    }
  };

  const handleDeleteRecord = async (id: string, collectionName: "leads" | "parceiros") => {
    if (userRole === "contador") {
      alert("Acesso Restrito: Contadores não possuem permissão para excluir registros.");
      return;
    }

    const itemType = collectionName === "leads" ? "este Lead" : "este Parceiro";
    const confirmed = window.confirm(`Tem certeza que deseja excluir definitivamente ${itemType} do banco de dados Firestore? Esta ação não poderá ser desfeita.`);
    if (!confirmed) return;

    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      
      // Update local state
      if (collectionName === "leads") {
        setLeads(prev => prev.filter(item => item.id !== id));
        if (selectedLead?.id === id) setSelectedLead(null);
      } else {
        setPartners(prev => prev.filter(item => item.id !== id));
        if (selectedPartner?.id === id) setSelectedPartner(null);
      }
      
      // Recalculate quick stats
      setStats(prev => {
        if (collectionName === "leads") {
          const removedLead = leads.find(l => l.id === id);
          const newLeadsCount = Math.max(0, prev.totalLeads - 1);
          const newCredit = prev.totalCreditSimulated - (removedLead?.limiteEstimado || 0);
          return {
            ...prev,
            totalLeads: newLeadsCount,
            totalCreditSimulated: Math.max(0, newCredit)
          };
        } else {
          return {
            ...prev,
            totalPartners: Math.max(0, prev.totalPartners - 1)
          };
        }
      });

      // Reset delete state
      setIsDeletingId(null);
      setConfirmDelete(false);
    } catch (err: any) {
      console.error("Error deleting document from Firestore:", err);
      alert(`Falha ao excluir o documento no Firestore: ${err?.message || "Erro desconhecido"}`);
    }
  };

  const handleTogglePartnerStatus = async (partner: Partner, targetStatus?: "ativo" | "bloqueado") => {
    try {
      const currentStatus = (partner as any).statusManual || (partner.status === "bloqueado" ? "bloqueado" : "ativo");
      const newStatus = targetStatus || (currentStatus === "bloqueado" ? "ativo" : "bloqueado");
      const docRef = doc(db, "parceiros", partner.id);
      
      const nowStr = new Date().toISOString();
      const updates: any = { 
        statusManual: newStatus,
        status: newStatus === "bloqueado" ? "bloqueado" : "ativo",
        dataAtualizacaoStatus: nowStr
      };

      // Quando ativa/desbloqueia manualmente, garante a liberação da licença por 365 dias
      if (newStatus === "ativo") {
        updates.dataUltimoPagamento = nowStr;
        updates.duracaoDias = 365;
      }

      await updateDoc(docRef, updates);

      setPartners(prev => prev.map(p => p.id === partner.id ? { 
        ...p, 
        ...updates
      } : p));

      if (selectedPartner?.id === partner.id) {
        setSelectedPartner(prev => prev ? { 
          ...prev, 
          ...updates
        } : null);
      }
    } catch (err) {
      console.error("Error toggling partner status in Firestore:", err);
      alert("Falha ao alterar o status do parceiro. Tente novamente.");
    }
  };

  const handleRenewSubscription = async (id: string) => {
    try {
      const todayStr = new Date().toISOString();
      const docRef = doc(db, "parceiros", id);
      await updateDoc(docRef, { 
        dataUltimoPagamento: todayStr,
        duracaoDias: 365
      });
      
      // Update local state
      setPartners(prev => prev.map(item => item.id === id ? { ...item, dataUltimoPagamento: todayStr, duracaoDias: 365 } : item));
      if (selectedPartner?.id === id) {
        setSelectedPartner(prev => prev ? { ...prev, dataUltimoPagamento: todayStr, duracaoDias: 365 } : null);
      }
    } catch (err) {
      console.error("Error renewing subscription in Firestore:", err);
      alert("Falha ao renovar a anuidade no Firestore. Tente novamente.");
    }
  };

  // Export as CSV
  const exportToCSV = () => {
    const escapeCSV = (field: any) => {
      if (field === undefined || field === null) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    let filename = "";
    let headers: string[] = [];
    let rows: string[] = [];

    if (activeTab === "leads") {
      const leadsToExport = filteredLeads.length > 0 ? filteredLeads : leads;
      if (leadsToExport.length === 0) {
        alert("Nenhum lead disponível para exportação.");
        return;
      }

      filename = `Leads_PROSFEC_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        "ID",
        "Data Cadastro",
        "Razão Social / Empresa",
        "Nome Contato",
        "CNPJ",
        "Porte",
        "Status",
        "Etapa do Funil",
        "Faturamento Anual (R$)",
        "Média Receita Mensal (R$)",
        "Limite Estimado (R$)",
        "Nível Preparação",
        "Parceiro Indicador",
        "WhatsApp",
        "E-mail",
        "Cidade",
        "Linha Crédito Govt. Ativa",
        "Linha Crédito Qual",
        "Restrição Serasa",
        "Dívidas Tributárias",
        "Banco Principal",
        "Objetivo Recurso",
        "Pendência Ativa",
        "Mensagem Pendência",
        "Valor Aprovado (R$)"
      ];

      rows = leadsToExport.map((l) => {
        const etapaLabel = ETAPAS_LABELS[l.etapa || 1] || `Etapa ${l.etapa || 1}`;
        const temLinhaGovt = (l as any).possuiLinhaCreditoGovernamentalAtiva ? "Sim" : "Não";
        const linhaGovtQual = (l as any).linhaCreditoGovernamentalQual || "";
        const temPendencia = l.pendente || l.pendencias?.status === "pendente" ? "Sim" : "Não";
        const pendenciaMsg = l.pendencias?.mensagem || l.pendenciaDescricao || "";
        const parceiroNome = l.parceiroNome || (l.parceiroId ? (partners.find(p => p.id === l.parceiroId)?.nome || l.parceiroId) : "Sem parceiro");

        return [
          escapeCSV(l.id),
          escapeCSV(l.dataCriacao ? new Date(l.dataCriacao).toLocaleString("pt-BR") : ""),
          escapeCSV(l.razaoSocial || l.nome || ""),
          escapeCSV(l.nome || ""),
          escapeCSV(l.cnpj || ""),
          escapeCSV(l.porte || ""),
          escapeCSV(l.status || "novo"),
          escapeCSV(`${l.etapa || 1}. ${etapaLabel}`),
          escapeCSV(l.faturamentoAnual ? l.faturamentoAnual.toFixed(2) : "0.00"),
          escapeCSV(l.mediaReceitaMensal ? l.mediaReceitaMensal.toFixed(2) : "0.00"),
          escapeCSV(l.limiteEstimado ? l.limiteEstimado.toFixed(2) : "0.00"),
          escapeCSV(l.nivelPreparacao || ""),
          escapeCSV(parceiroNome),
          escapeCSV(l.whatsapp || ""),
          escapeCSV(l.email || ""),
          escapeCSV(l.cidade || ""),
          escapeCSV(temLinhaGovt),
          escapeCSV(linhaGovtQual),
          escapeCSV(l.possuiRestricaoSerasa ? "Sim" : "Não"),
          escapeCSV(l.possuiDividasTributarias ? "Sim" : "Não"),
          escapeCSV(l.bancoPrincipal || ""),
          escapeCSV(l.objetivoRecurso || ""),
          escapeCSV(temPendencia),
          escapeCSV(pendenciaMsg),
          escapeCSV(l.valorAprovado ? l.valorAprovado.toFixed(2) : "0.00")
        ].join(";");
      });
    } else {
      filename = `Parceiros_PROSFEC_${new Date().toISOString().slice(0, 10)}.csv`;

      const partnersToExport = filteredPartners.length > 0 ? filteredPartners : partners;
      if (partnersToExport.length === 0) {
        alert("Nenhum parceiro disponível para exportação.");
        return;
      }

      headers = [
        "ID",
        "Data Criação",
        "Nome",
        "E-mail",
        "WhatsApp",
        "Cidade/UF",
        "CPF",
        "CNPJ",
        "Data Nascimento",
        "Chave Pix",
        "Plano",
        "Status"
      ];

      rows = partnersToExport.map((p) => {
        return [
          escapeCSV(p.id),
          escapeCSV(p.dataCriacao ? new Date(p.dataCriacao).toLocaleDateString("pt-BR") : ""),
          escapeCSV(p.nome || ""),
          escapeCSV(p.email || ""),
          escapeCSV(p.whatsapp || ""),
          escapeCSV(p.cidade || ""),
          escapeCSV(p.cpf || ""),
          escapeCSV(p.cnpj || ""),
          escapeCSV(p.dataNascimento || ""),
          escapeCSV(p.chavePix || ""),
          escapeCSV(p.plano || ""),
          escapeCSV(p.status || "novo")
        ].join(";");
      });
    }

    // Standard UTF-8 BOM so Microsoft Excel / Google Sheets open Brazilian characters correctly formatted in columns
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper formatting functions
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "-";
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "novo":
        return "bg-blue-50 text-blue-700 border border-blue-200 font-semibold";
      case "em atendimento":
      case "atendimento":
        return "bg-amber-50 text-amber-700 border border-amber-200 font-semibold";
      case "concluido":
      case "concluído":
      case "parceria ativa":
      case "aprovado":
        return "bg-emerald-50 text-[#00A86B] border border-emerald-200 font-semibold";
      case "perdido":
      case "recusado":
      case "cancelado":
        return "bg-rose-50 text-rose-700 border border-rose-200 font-semibold";
      case "arquivado":
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200 font-semibold";
    }
  };

  const getPreparationBadgeClass = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "alto":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold";
      case "medio":
      case "médio":
        return "bg-amber-50 text-amber-800 border border-amber-200 font-semibold";
      case "baixo":
        return "bg-rose-50 text-rose-800 border border-rose-200 font-semibold";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200 font-medium";
    }
  };

  // Filter logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.cnpj && lead.cnpj.includes(searchTerm)) ||
      (lead.razaoSocial && lead.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()));

    // Quick filter check
    if (quickFilter === "pendentes" && !(lead.pendente === true || lead.pendencias?.status === "pendente")) {
      return false;
    }
    if (quickFilter === "novos" && lead.status !== "novo") {
      return false;
    }
    if (quickFilter === "atendimento" && lead.status !== "em atendimento" && lead.status !== "atendimento") {
      return false;
    }
    if (quickFilter === "concluidos" && lead.status !== "concluido" && lead.status !== "concluído") {
      return false;
    }

    const matchesStatus = statusFilter === "todos" || lead.status === statusFilter;
    const matchesPorte = porteFilter === "todos" || lead.porte === porteFilter;
    const matchesPrep = preparacaoFilter === "todos" || lead.nivelPreparacao === preparacaoFilter;
    const matchesEtapa = etapaFilter === "todos" || String(lead.etapa) === etapaFilter;

    const matchesRating = ratingFilter === "todos" || 
      (ratingFilter === "aguardando_documentos" && (lead.fichaRatingCredito?.faseRating === "aguardando_documentos" || ((!lead.fichaRatingCredito?.faseRating || (lead.fichaRatingCredito?.progressoPercentual || 0) <= 30) && (lead.liberarFichaRating || (lead.etapa && lead.etapa >= 6))))) ||
      (ratingFilter === "documentos_recebidos" && (lead.fichaRatingCredito?.faseRating === "documentos_recebidos" || ((lead.fichaRatingCredito?.progressoPercentual || 0) > 30 && lead.fichaRatingCredito?.faseRating !== "concluido" && lead.fichaRatingCredito?.faseRating !== "em_aplicacao"))) ||
      (ratingFilter === "em_aplicacao" && lead.fichaRatingCredito?.faseRating === "em_aplicacao") ||
      (ratingFilter === "concluido" && (lead.fichaRatingCredito?.faseRating === "concluido" || Boolean(lead.fichaRatingCredito?.conclusaoRating?.notaFinalRating)));

    return matchesSearch && matchesStatus && matchesPorte && matchesPrep && matchesEtapa && matchesRating;
  });

  const paginatedLeads = filteredLeads.slice((leadsPage - 1) * itemsPerPage, leadsPage * itemsPerPage);

  const filteredPartners = partners.filter(p => {
    if (hideTeamMembers) {
      const isTeam = p.isTeamMember === true || (p.plano && (p.plano.toUpperCase().includes("CONSULTOR") || p.plano.toUpperCase().includes("EQUIPE")));
      if (p.parentPartnerId && isTeam) {
        return false;
      }
    }

    const matchesSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.whatsapp && p.whatsapp.includes(searchTerm)) ||
      (p.cidade && p.cidade.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
    const matchesPlan = porteFilter === "todos" || 
      p.plano === porteFilter ||
      (porteFilter === "STARTER" && (!p.plano || p.plano.toUpperCase() === "SILVER" || p.plano.toUpperCase() === "STARTER")) ||
      (porteFilter === "Executive Partner PROSFEC" && (p.plano?.toUpperCase() === "GOLD" || p.plano?.toUpperCase() === "EXECUTIVE" || p.plano?.toUpperCase() === "EXECUTIVE PARTNER PROSFEC")) ||
      ((porteFilter === "MASTER PARTNER" || porteFilter === "FRANQUIA DIGITAL") && (p.plano?.toUpperCase() === "PLATINUM" || p.plano?.toUpperCase() === "FRANQUIA" || p.plano?.toUpperCase() === "FRANQUIA DIGITAL" || p.plano?.toUpperCase() === "MASTER PARTNER"));

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const paginatedPartners = filteredPartners.slice((partnersPage - 1) * itemsPerPage, partnersPage * itemsPerPage);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 font-sans">
        <div className="h-10 w-10 rounded-full border-2 border-[#00A86B] border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Verificando sessão administrativa...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased relative overflow-hidden">
        {/* Decorative subtle ambient lights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00A86B] opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0A3D2E] opacity-20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
          <div className="mx-auto h-14 w-14 bg-[#00A86B] rounded-2xl flex items-center justify-center text-white shadow-xl transform hover:rotate-12 transition-transform duration-300">
            <TrendingUp className="w-7 h-7" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold font-display text-white tracking-tight">
            Painel de Controle PROSFEC
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400 font-medium">
            Acesse o gerenciamento de Leads e Parceiros Pronampe 2026
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
          <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-100/10">
            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  E-mail de Acesso
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="prosfec.tesouraria@gmail.com"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00A86B] focus:border-transparent text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white/75 backdrop-blur-xl transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Senha de Segurança
                </label>
                <div className="mt-1.5">
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="appearance-none block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00A86B] focus:border-transparent text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white/75 backdrop-blur-xl transition-all shadow-inner"
                  />
                </div>
              </div>

              {loginError && (
                <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-100 flex gap-2 text-rose-800 text-xs font-semibold animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={onExit}
                  className="text-xs font-bold text-slate-500 hover:text-[#00A86B] cursor-pointer transition-colors"
                >
                  Voltar para o site institucional
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-black text-white bg-[#0A3D2E] hover:bg-[#00A86B] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#00A86B] transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>Autenticando no Firebase...</span>
                    </>
                  ) : (
                    <span>Acessar Painel Seguro</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      {/* Top Banner Header */}
      <header className="glass-panel-dark rounded-none text-slate-100 border-x-0 border-t-0 py-3.5 px-4 sm:px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-950/70 p-2.5 rounded-xl text-emerald-300 border border-emerald-700/40 shadow-xs">
              <TrendingUp className="w-5.5 h-5.5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white font-display">Painel Administrativo</h1>
                {userRole === "contador" ? (
                  <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-amber-400/30">
                    Área do Contador
                  </span>
                ) : (
                  <span className="text-[11px] bg-emerald-500/20 text-[#00A86B] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-500/30">
                    Engine PROSFEC IA v2.6
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-300/90 font-bold tracking-wider uppercase font-mono mt-0.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A86B] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A86B]"></span>
                </span>
                <span>Mesa de Crédito &bull; PRONAMPE 2026 Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button 
              onClick={fetchData}
              className="py-2 px-3.5 bg-emerald-950/60 hover:bg-emerald-900/80 active:bg-emerald-800 text-emerald-200 rounded-xl border border-emerald-800/40 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs min-h-[40px]"
              title="Sincronizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <button
              onClick={handleLogout}
              className="py-2 px-3.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-bold rounded-xl border border-rose-400/30 text-xs transition-all cursor-pointer min-h-[40px]"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Two-Column Sidebar Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          
          {/* Sidebar Left Column */}
          <div className="w-full lg:w-80 shrink-0 space-y-6 lg:sticky lg:top-24">
            {/* Admin Profile/Control Card */}
            <div className="glass-panel-dark glass-raise text-white p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              <div className="absolute right-[-40px] top-[-40px] w-36 h-36 rounded-full bg-emerald-400/10 pointer-events-none" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] bg-emerald-500/20 text-[#00A86B] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/30">
                    {userRole === "contador" ? "Contador" : "Administrador"}
                  </span>
                  <TrendingUp className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-lg leading-tight text-white">
                    {userRole === "contador" ? "Painel Contábil" : "Painel Executivo"}
                  </h2>
                  <p className="text-xs text-emerald-200/90 mt-1 truncate">PROSFEC PRONAMPE</p>
                </div>
              </div>
            </div>

            {/* Vertical Navigation Tabs */}
            <div className="glass-panel p-3 flex flex-col gap-1 text-left">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest px-3 py-1 mb-1 block">Gestão do Sistema</span>
              
              <button
                onClick={() => { setActiveTab("funnel"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group ${
                  activeTab === "funnel"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <TrendingUp className={`w-5 h-5 ${activeTab === "funnel" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Funil & Conversão
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "funnel" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("leads"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group ${
                  activeTab === "leads"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className={`w-5 h-5 ${activeTab === "leads" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Leads ({leads.length})
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "leads" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("partners"); setSearchTerm(""); setStatusFilter("todos"); setPartnersPage(1); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group ${
                  activeTab === "partners"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Handshake className={`w-5 h-5 ${activeTab === "partners" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Parceiros ({partners.length})
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "partners" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("announcements"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group ${
                  activeTab === "announcements"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Megaphone className={`w-5 h-5 ${activeTab === "announcements" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Comunicados
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "announcements" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("recargas"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group relative ${
                  activeTab === "recargas"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Coins className={`w-5 h-5 ${activeTab === "recargas" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Recargas
                  {recargas.filter(r => r.status === "pendente").length > 0 && (
                    <span className="bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                      {recargas.filter(r => r.status === "pendente").length} Pendentes
                    </span>
                  )}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "recargas" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("comissoes"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group relative ${
                  activeTab === "comissoes"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Receipt className={`w-5 h-5 ${activeTab === "comissoes" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Comissões & Saques
                  {comissoes.filter(c => c.status === "pendente").length > 0 && (
                    <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse shadow-xs">
                      {comissoes.filter(c => c.status === "pendente").length} Saque(s)
                    </span>
                  )}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "comissoes" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("precos"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group ${
                  activeTab === "precos"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <DollarSign className={`w-5 h-5 ${activeTab === "precos" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Preços & Serviços
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "precos" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("servicos_contabilidade"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group ${
                  activeTab === "servicos_contabilidade"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Calculator className={`w-5 h-5 ${activeTab === "servicos_contabilidade" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={1.75} />
                  Serviços de Contabilidade
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "servicos_contabilidade" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => { setActiveTab("resets"); setSearchTerm(""); setStatusFilter("todos"); }}
                className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-left flex items-center justify-between group relative ${
                  activeTab === "resets"
                    ? "bg-linear-to-r from-emerald-100/90 to-emerald-50/40 text-[#064e3b] border-l-4 border-[#00A86B] shadow-[0_6px_18px_-10px_rgba(0,168,107,0.9)]"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Key className={`w-5 h-5 ${activeTab === "resets" ? "text-emerald-700" : "text-slate-400"}`} strokeWidth={2} />
                  Reset de Senhas
                  {leads.filter(l => l.solicitacaoResetSenha?.pendente).length > 0 && (
                    <span className="bg-rose-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse shadow-xs">
                      {leads.filter(l => l.solicitacaoResetSenha?.pendente).length} Pendente(s)
                    </span>
                  )}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === "resets" ? "translate-x-0.5 text-emerald-700" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Right Column - Main Content Card */}
          <div className="flex-grow w-full space-y-6 min-w-0">
            {/* Main Database view card */}
            <div className="bg-white/75 backdrop-blur-xl rounded-2xl shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] border border-slate-200/90 overflow-hidden">
              
              {/* Navigation tabs inside list card */}
              <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                
                <div>
                  <h3 className="font-display font-extrabold text-sm text-[#064e3b] uppercase tracking-wider flex items-center gap-2">
                    {activeTab === "leads" && <><Users className="w-4 h-4 text-emerald-600" /> Banco de Leads</>}
                    {activeTab === "partners" && <><Handshake className="w-4 h-4 text-emerald-600" /> Parceiros de Negócios</>}
                    {activeTab === "announcements" && <><Megaphone className="w-4 h-4 text-emerald-600" /> Painel de Comunicados</>}
                    {activeTab === "recargas" && <><Coins className="w-4 h-4 text-emerald-600" /> Solicitações de Recarga</>}
                    {activeTab === "comissoes" && <><Receipt className="w-4 h-4 text-emerald-600" /> Painel Financeiro &amp; Solicitações de Saque de Comissões</>}
                    {activeTab === "precos" && <><DollarSign className="w-4 h-4 text-emerald-600" /> Preços de Consultas &amp; Catálogo de Serviços</>}
                    {activeTab === "servicos_contabilidade" && <><Calculator className="w-4 h-4 text-emerald-600" /> Catálogo de Serviços de Contabilidade</>}
                    {activeTab === "funnel" && <><TrendingUp className="w-4 h-4 text-emerald-600" /> Funil de Conversão do Simulador</>}
                    {activeTab === "resets" && <><Key className="w-4 h-4 text-emerald-600" /> Central de Senhas &amp; Reset do Portal do Cliente</>}
                  </h3>
                </div>
     
                {/* Export action */}
                {activeTab !== "announcements" && activeTab !== "recargas" && activeTab !== "comissoes" && activeTab !== "precos" && activeTab !== "servicos_contabilidade" && activeTab !== "funnel" && activeTab !== "resets" && (
                  <button
                    onClick={exportToCSV}
                    disabled={loading || (activeTab === "leads" ? leads.length === 0 : partners.length === 0)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer ${
                      activeTab === "leads"
                        ? "bg-[#064e3b] hover:bg-[#047857] text-white border border-emerald-600/30"
                        : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                    }`}
                    title={activeTab === "leads" ? "Exportar todos os dados dos leads filtrados em planilha CSV" : "Exportar dados em planilha CSV"}
                  >
                    <Download className={`w-3.5 h-3.5 ${activeTab === "leads" ? "text-emerald-300" : ""}`} />
                    <span>{activeTab === "leads" ? "Exportar Leads (CSV)" : "Exportar CSV"}</span>
                  </button>
                )}
              </div>

              {/* Filtering controls bar */}
          {activeTab !== "announcements" && activeTab !== "recargas" && activeTab !== "comissoes" && activeTab !== "precos" && activeTab !== "servicos_contabilidade" && activeTab !== "funnel" && activeTab !== "resets" ? (
            <div className="p-4 bg-white border-b border-slate-100 space-y-3">
              {/* Primary Search & Quick Filter Row */}
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={activeTab === "leads" ? "Buscar por empresa, CNPJ, razão social ou email..." : "Buscar por parceiro, WhatsApp, email..."}
                    className="pl-9 pr-8 py-2 w-full text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#00A86B] focus:bg-white/75 backdrop-blur-xl transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Filters for Leads */}
                {activeTab === "leads" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                    <button
                      onClick={() => setQuickFilter("todos")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        quickFilter === "todos"
                          ? "bg-[#0A3D2E] text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      Todos <span className="font-mono font-bold">({leads.length})</span>
                    </button>

                    {(() => {
                      const pendCount = leads.filter(l => l.pendente === true || l.pendencias?.status === "pendente").length;
                      if (pendCount === 0) return null;
                      return (
                        <button
                          onClick={() => setQuickFilter(quickFilter === "pendentes" ? "todos" : "pendentes")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            quickFilter === "pendentes"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Pendências <span className="font-mono font-bold">({pendCount})</span>
                        </button>
                      );
                    })()}

                    <button
                      onClick={() => setQuickFilter(quickFilter === "novos" ? "todos" : "novos")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        quickFilter === "novos"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
                      }`}
                    >
                      Novos <span className="font-mono font-bold">({leads.filter(l => l.status === "novo").length})</span>
                    </button>

                    <button
                      onClick={() => setQuickFilter(quickFilter === "atendimento" ? "todos" : "atendimento")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        quickFilter === "atendimento"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"
                      }`}
                    >
                      Em Atendimento <span className="font-mono font-bold">({leads.filter(l => l.status === "em atendimento" || l.status === "atendimento").length})</span>
                    </button>

                    <button
                      onClick={() => setQuickFilter(quickFilter === "concluidos" ? "todos" : "concluidos")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        quickFilter === "concluidos"
                          ? "bg-[#00A86B] text-white shadow-xs"
                          : "bg-emerald-50 text-[#00A86B] border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      Concluídos <span className="font-mono font-bold">({leads.filter(l => l.status === "concluido" || l.status === "concluído").length})</span>
                    </button>
                  </div>
                )}

                {/* Right controls: Advanced Filter Toggle & View Switcher */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Advanced Filters Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      showAdvancedFilters || (statusFilter !== "todos" || porteFilter !== "todos" || preparacaoFilter !== "todos" || etapaFilter !== "todos" || ratingFilter !== "todos")
                        ? "bg-emerald-50 text-[#0A3D2E] border-emerald-300 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Filtros</span>
                    {(() => {
                      const count = (statusFilter !== "todos" ? 1 : 0) + (porteFilter !== "todos" ? 1 : 0) + (preparacaoFilter !== "todos" ? 1 : 0) + (etapaFilter !== "todos" ? 1 : 0) + (ratingFilter !== "todos" ? 1 : 0);
                      if (count > 0) {
                        return (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {count}
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {/* View Mode Toggle */}
                  {(activeTab === "leads" || activeTab === "partners") && (
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => activeTab === "leads" ? setLeadsViewMode("grid") : setViewMode("grid")}
                        className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          (activeTab === "leads" ? leadsViewMode === "grid" : viewMode === "grid") 
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/20" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="Exibição em Cards"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => activeTab === "leads" ? setLeadsViewMode("list") : setViewMode("list")}
                        className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          (activeTab === "leads" ? leadsViewMode === "list" : viewMode === "list") 
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200/20" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="Exibição em Tabela"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tabela</span>
                      </button>
                    </div>
                  )}

                  {/* Hide Team Members Switch (Partners Only) */}
                  {activeTab === "partners" && (
                    <button
                      type="button"
                      onClick={() => setHideTeamMembers(!hideTeamMembers)}
                      className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                        hideTeamMembers
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{hideTeamMembers ? "Ocultar Equipe" : "Ver Todos"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Advanced Filters Drawer */}
              {showAdvancedFilters && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 animate-in fade-in duration-200">
                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="py-1.5 px-2.5 w-full text-xs bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#00A86B] text-slate-800 font-medium cursor-pointer"
                    >
                      <option value="todos">Todos os Status</option>
                      <option value="novo">Novo</option>
                      <option value="em atendimento">Em Atendimento</option>
                      <option value="concluido">Concluído</option>
                      <option value="arquivado">Arquivado</option>
                    </select>
                  </div>

                  {/* Porte / Plano Filter */}
                  {activeTab === "leads" ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Porte Empresarial</label>
                      <select
                        value={porteFilter}
                        onChange={(e) => setPorteFilter(e.target.value)}
                        className="py-1.5 px-2.5 w-full text-xs bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#00A86B] text-slate-800 font-medium cursor-pointer"
                      >
                        <option value="todos">Todos os Portes</option>
                        <option value="MEI">MEI</option>
                        <option value="ME">ME</option>
                        <option value="EPP">EPP</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Plano do Parceiro</label>
                      <select
                        value={porteFilter}
                        onChange={(e) => setPorteFilter(e.target.value)}
                        className="py-1.5 px-2.5 w-full text-xs bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#00A86B] text-slate-800 font-medium cursor-pointer"
                      >
                        <option value="todos">Todos os Planos</option>
                        <option value="STARTER">STARTER</option>
                        <option value="Executive Partner PROSFEC">Executive Partner</option>
                        <option value="MASTER PARTNER">MASTER PARTNER</option>
                      </select>
                    </div>
                  )}

                  {/* Preparation Filter (Leads Only) */}
                  {activeTab === "leads" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nível de Preparação</label>
                      <select
                        value={preparacaoFilter}
                        onChange={(e) => setPreparacaoFilter(e.target.value)}
                        className="py-1.5 px-2.5 w-full text-xs bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#00A86B] text-slate-800 font-medium cursor-pointer"
                      >
                        <option value="todos">Todos os Níveis</option>
                        <option value="alto">Alto</option>
                        <option value="medio">Médio</option>
                        <option value="baixo">Baixo</option>
                      </select>
                    </div>
                  )}

                  {/* Etapa Filter (Leads Only) */}
                  {activeTab === "leads" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Etapa do Funil</label>
                      <select
                        value={etapaFilter}
                        onChange={(e) => setEtapaFilter(e.target.value)}
                        className="py-1.5 px-2.5 w-full text-xs bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#00A86B] text-slate-800 font-medium cursor-pointer truncate"
                      >
                        <option value="todos">Todas as Etapas (1 a 8)</option>
                        <option value="1">1. Dados cadastrais CNPJ</option>
                        <option value="2">2. Coleta dados Sócios</option>
                        <option value="3">3. Consulta Diagnóstica</option>
                        <option value="4">4. Assinatura Termos</option>
                        <option value="5">5. Senhas GOV / Serasa</option>
                        <option value="6">6. Estruturação Rating</option>
                        <option value="7">7. Operação Apta</option>
                        <option value="8">8. Crédito Aprovado/Recusado</option>
                      </select>
                    </div>
                  )}

                  {/* Esteira de Rating Filter (Leads Only) */}
                  {activeTab === "leads" && (
                    <div>
                      <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Esteira Rating</label>
                      <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className="py-1.5 px-2.5 w-full text-xs bg-emerald-50 border border-emerald-200 rounded-lg focus:outline-hidden focus:border-[#00A86B] text-slate-800 font-bold cursor-pointer truncate"
                      >
                        <option value="todos">Todas as Fases</option>
                        <option value="aguardando_documentos">1. Aguardando Docs</option>
                        <option value="documentos_recebidos">2. Docs Recebidos</option>
                        <option value="em_aplicacao">3. Em Aplicação</option>
                        <option value="concluido">4. Concluído / Nota</option>
                      </select>
                    </div>
                  )}

                  {/* Reset Filters action */}
                  <div className="sm:col-span-2 lg:col-span-5 flex justify-end items-center pt-1 border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("todos");
                        setPorteFilter("todos");
                        setPreparacaoFilter("todos");
                        setEtapaFilter("todos");
                        setRatingFilter("todos");
                        setQuickFilter("todos");
                        setSearchTerm("");
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Limpar todos os filtros
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Error State */}
          {error && (
            <div className="p-8 text-center bg-rose-50 text-rose-800 border-b border-rose-100">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <p className="font-bold mb-1">Falha na Conexão</p>
              <p className="text-sm text-slate-600 max-w-xl mx-auto">{error}</p>
              <button 
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="p-20 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#00A86B] mx-auto animate-spin" />
              <p className="text-sm font-semibold">Carregando dados do Firestore...</p>
            </div>
          ) : (
            <div>
              
              {/* LEADS LIST VIEW */}
              {activeTab === "leads" && (
                <>
                  {/* Visual Funnel Pipeline & Counters */}
                  {(() => {
                    const countsByStage = Array(8).fill(0).map((_, i) => {
                      const stageNum = i + 1;
                      return leads.filter(l => (l.etapa || 1) === stageNum).length;
                    });

                    const shortEtapas = [
                      "Dados CNPJ",
                      "Coleta Sócios",
                      "Diagnóstico",
                      "Assinatura",
                      "Senhas GOV",
                      "Estruturação",
                      "Operação Apta",
                      "Resultado Final"
                    ];

                    return (
                      <div className="mx-4 mt-4 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-5 h-5 text-[#00A86B]" strokeWidth={2} />
                            Pipeline de Vendas ({leads.length} Leads Ativos)
                          </h4>
                          {etapaFilter !== "todos" && (
                            <button
                              onClick={() => setEtapaFilter("todos")}
                              className="text-xs bg-white/75 backdrop-blur-xl hover:bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]"
                            >
                              Mostrar Todas Etapas
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                          {shortEtapas.map((name, idx) => {
                            const stageNum = idx + 1;
                            const count = countsByStage[idx];
                            const isActive = etapaFilter === String(stageNum);
                            return (
                              <button
                                key={idx}
                                onClick={() => setEtapaFilter(isActive ? "todos" : String(stageNum))}
                                className={`p-2.5 rounded-xl border text-left transition-all duration-150 relative cursor-pointer flex flex-col justify-between min-h-[62px] ${
                                  isActive
                                    ? "bg-[#0A3D2E] text-white border-[#00A86B] shadow-xs ring-2 ring-[#00A86B]/20"
                                    : count > 0
                                      ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                                      : "bg-slate-50/60 border-slate-200/60 text-slate-400 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${isActive ? 'bg-[#00A86B] text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {stageNum}
                                  </span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    isActive
                                      ? 'bg-white text-[#0A3D2E]'
                                      : count > 0 
                                        ? 'bg-emerald-50 text-[#0A3D2E] border border-emerald-200' 
                                        : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {count}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold leading-tight line-clamp-1 mt-1.5" title={name}>{name}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Critical Action / Pending Tasks Panel */}
                  {(() => {
                    const pendingLeads = leads.filter(l => {
                      return l.pendente === true || l.pendencias?.status === "pendente";
                    });

                    if (pendingLeads.length === 0) return null;

                    return (
                      <div className="mx-4 mb-4 bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-5 h-5" strokeWidth={2} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                Atenção Requerida ({pendingLeads.length} {pendingLeads.length === 1 ? "Pendência Ativa" : "Pendências Ativas"})
                              </h4>
                              <p className="text-xs text-amber-800/80 font-normal">
                                Leads aguardando conferência documental ou validação de respostas enviadas pelo parceiro.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsPendingPanelCollapsed(!isPendingPanelCollapsed)}
                            className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white/80 hover:bg-white rounded-lg border border-amber-200 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
                          >
                            <span>{isPendingPanelCollapsed ? "Expandir" : "Recolher"}</span>
                            {isPendingPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                        </div>

                        {!isPendingPanelCollapsed && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-amber-200/80">
                            {pendingLeads.slice(0, 6).map((lead) => {
                              const isAnswered = !!lead.pendencias?.resposta;
                              return (
                                <div 
                                  key={lead.id} 
                                  className={`bg-white p-4 rounded-xl border transition-all ${
                                    isAnswered 
                                      ? "border-emerald-300 shadow-xs ring-2 ring-emerald-500/10" 
                                      : "border-slate-200 hover:border-amber-300 shadow-xs"
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-1">
                                    <div className="min-w-0 flex-1">
                                      <h5 className="font-bold text-xs text-slate-900 truncate" title={lead.razaoSocial || lead.nome}>
                                        {lead.razaoSocial || lead.nome}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                                        Indicador: {lead.parceiroNome || partners.find(p => p.id === lead.parceiroId)?.nome || "Direto / Sem parceiro"}
                                      </p>
                                    </div>
                                    {isAnswered ? (
                                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                        RESPONDIDO
                                      </span>
                                    ) : (
                                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                        PENDENTE
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600">
                                    <span className="font-semibold text-[10px] uppercase text-slate-400 block mb-0.5">Motivo:</span>
                                    <span className="line-clamp-2">{lead.pendencias?.mensagem || lead.pendenciaDescricao || "Documento ou login inválido."}</span>
                                  </div>

                                  {isAnswered && (
                                    <div className="mt-2 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100 text-xs text-emerald-900">
                                      <span className="font-semibold text-[10px] uppercase text-emerald-700 block mb-0.5">Resposta do Parceiro:</span>
                                      <span className="italic line-clamp-2">"{lead.pendencias?.resposta}"</span>
                                    </div>
                                  )}

                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex gap-2 justify-end">
                                    <a
                                      href={`https://api.whatsapp.com/send?phone=${lead.whatsapp.replace(/\D/g, "")}&text=${encodeURIComponent(`Olá! Referente ao lead ${lead.razaoSocial || lead.nome}, precisamos verificar a seguinte pendência: ${lead.pendencias?.mensagem || lead.pendenciaDescricao || ""}`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-[#00A86B] hover:text-white rounded-lg border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Phone className="w-4 h-4" strokeWidth={2} />
                                      Cobrar
                                    </a>
                                    <button
                                      onClick={() => setSelectedLead(lead)}
                                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0A3D2E] hover:bg-[#00A86B] rounded-lg transition-all duration-150 cursor-pointer shadow-xs active:scale-95"
                                    >
                                      Resolver
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {pendingLeads.length > 6 && (
                              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 flex flex-col justify-center items-center text-center">
                                <p className="text-xs font-bold text-slate-800">+{pendingLeads.length - 6} outras pendências</p>
                                <p className="text-xs text-slate-500 mt-0.5">Filtre por "Pendências" para ver todas.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* MAIN CONTENT ACCORDING TO VIEW MODE TOGGLE */}
                  {filteredLeads.length === 0 ? (
                    <div className="py-20 px-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Users className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">Nenhum lead encontrado</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Não encontramos nenhum registro correspondente aos filtros ou termo de busca aplicados.
                      </p>
                    </div>
                  ) : leadsViewMode === "grid" ? (
                    /* GRID CARDS VIEW FOR LEADS */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      {paginatedLeads.map((lead) => {
                        const hasActivePendency = lead.pendente === true || lead.pendencias?.status === "pendente";
                        const isAnswered = !!lead.pendencias?.resposta;
                        const stageNum = lead.etapa || 1;

                        return (
                          <div 
                            key={lead.id} 
                            className={`bg-white rounded-2xl border transition-all flex flex-col h-full shadow-2xs hover:shadow-md relative overflow-hidden ${
                              hasActivePendency 
                                ? isAnswered 
                                  ? "border-emerald-300 ring-2 ring-emerald-500/15" 
                                  : "border-amber-300 shadow-sm"
                                : "border-slate-200/80 hover:border-slate-300"
                            }`}
                          >
                            {/* Decorative status-based top line accent */}
                            <div className={`h-1.5 w-full ${
                              lead.status === "concluido" || lead.status === "concluído" || lead.status === "aprovado"
                                ? "bg-[#00A86B]" 
                                : lead.status === "em atendimento" || lead.status === "atendimento"
                                  ? "bg-amber-500" 
                                  : lead.status === "perdido" || lead.status === "recusado" || lead.status === "cancelado"
                                    ? "bg-rose-500"
                                    : lead.status === "arquivado" 
                                      ? "bg-slate-400" 
                                      : "bg-blue-500"
                            }`}></div>

                            {/* Header details */}
                            <div className="p-4 flex-1 space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-sm text-slate-900 tracking-tight line-clamp-1" title={lead.razaoSocial || lead.nome || "Não informado"}>
                                    {lead.razaoSocial || lead.nome || "Não informado"}
                                  </h4>
                                  <span className="text-[11px] text-slate-500 font-mono block mt-0.5">{lead.cnpj || "-"}</span>
                                </div>

                                {/* Quick status dropdown in card */}
                                <select
                                  value={lead.status || "novo"}
                                  onChange={(e) => handleUpdateStatus(lead.id, "leads", e.target.value)}
                                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full cursor-pointer focus:outline-hidden transition-all ${getStatusBadgeClass(lead.status)}`}
                                >
                                  <option value="novo">Novo</option>
                                  <option value="em atendimento">Atendimento</option>
                                  <option value="concluido">Concluído</option>
                                  <option value="arquivado">Arquivado</option>
                                </select>
                              </div>

                              {/* Funnel pipeline visualization bar */}
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Progresso do Funil</span>
                                  <span className="text-[10px] font-bold text-[#0A3D2E] font-mono">Passo {stageNum}/8</span>
                                </div>
                                
                                {/* Mini-blocks progress bar */}
                                <div className="flex gap-1 mb-2">
                                  {Array(8).fill(0).map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={`h-1.5 flex-1 rounded-sm transition-all ${
                                        (i + 1) <= stageNum 
                                          ? "bg-[#00A86B]" 
                                          : "bg-slate-200"
                                      }`}
                                    ></div>
                                  ))}
                                </div>

                                {/* Stage selector inside card */}
                                <select
                                  value={stageNum}
                                  onChange={(e) => handleUpdateEtapa(lead.id, Number(e.target.value))}
                                  className="w-full text-[10px] px-2 py-1.5 rounded-lg font-bold bg-white/75 backdrop-blur-xl border border-slate-200 text-slate-700 focus:outline-hidden cursor-pointer truncate"
                                >
                                  <option value={1}>1. Dados CNPJ</option>
                                  <option value={2}>2. Dados Sócios</option>
                                  <option value={3}>3. Diagnóstico</option>
                                  <option value={4}>4. Assinatura</option>
                                  <option value={5}>5. Senha GOV</option>
                                  <option value={6}>6. Estruturação</option>
                                  <option value={7}>7. Operação Apta</option>
                                  <option value={8}>8. Crédito Final</option>
                                </select>
                              </div>

                              {/* Financial / Attribution Info */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                  <span className="text-[8px] text-slate-400 font-black block uppercase tracking-wider">Limite Estimado</span>
                                  <span className="text-xs font-bold font-mono text-[#0A3D2E] truncate block">
                                    {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "N/D"}
                                  </span>
                                </div>
                                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
                                  <span className="text-[8px] text-slate-400 font-black block uppercase tracking-wider">Certificado</span>
                                  <span className="truncate block mt-0.5">
                                    {lead.certificadoFileBase64 ? (
                                      <span className="bg-emerald-50 text-[#00A86B] text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-emerald-200">Anexado</span>
                                    ) : lead.certificadoSenha ? (
                                      <span className="bg-amber-50 text-amber-700 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-amber-200">Pendente</span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-600 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-slate-200">Ausente</span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Attribution Handshake / Directing Button */}
                              {lead.parceiroId ? (
                                partners.length > 0 && !partners.find(p => p.id === lead.parceiroId) ? (
                                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[8px] text-rose-800 font-black block uppercase tracking-wider">Lead órfão</span>
                                        <p className="text-[10px] text-rose-900 font-bold truncate">
                                          {lead.parceiroNome ? `${lead.parceiroNome} (removido)` : "Parceiro removido do sistema"}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setAssigningLead(lead)}
                                      className="text-[9px] font-black text-white bg-rose-600 hover:bg-rose-700 px-1.5 py-0.5 rounded-md cursor-pointer shrink-0 transition-colors"
                                      title="Reatribuir este lead a um Parceiro Master ativo"
                                    >
                                      Reatribuir
                                    </button>
                                  </div>
                                ) : (
                                <div className="bg-emerald-50/60 border border-emerald-100/70 rounded-xl p-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Handshake className="w-3.5 h-3.5 text-[#00A86B] shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[8px] text-emerald-800 font-black block uppercase tracking-wider">Parceiro</span>
                                      <p className="text-[10px] text-[#0A3D2E] font-bold truncate">
                                        {lead.parceiroNome || partners.find(p => p.id === lead.parceiroId)?.nome || "Parceiro"}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setAssigningLead(lead)}
                                    className="text-[9px] font-black text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md cursor-pointer shrink-0 transition-colors"
                                    title="Alterar Parceiro Master"
                                  >
                                    Alterar
                                  </button>
                                </div>
                                )
                              ) : (
                                <button
                                  onClick={() => setAssigningLead(lead)}
                                  className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl p-1.5 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  title="Direcionar este lead para um Parceiro Master"
                                >
                                  <UserPlus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Direcionar p/ Master</span>
                                </button>
                              )}

                              {/* Active pendency banner inside card */}
                              {hasActivePendency && (
                                <div className={`p-2 rounded-xl border text-[10px] ${
                                  isAnswered 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                                    : "bg-amber-50 border-amber-100 text-amber-900"
                                }`}>
                                  <p className="font-extrabold uppercase tracking-wider text-[8px] flex items-center gap-1">
                                    <AlertTriangle className={`w-3 h-3 ${isAnswered ? 'text-emerald-600' : 'text-amber-600'}`} />
                                    {isAnswered ? "Respondido pelo parceiro" : "Pendência Ativa"}
                                  </p>
                                  <p className="mt-0.5 line-clamp-1 font-medium italic">
                                    "{isAnswered ? lead.pendencias?.resposta : (lead.pendencias?.mensagem || lead.pendenciaDescricao)}"
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Actions footer bar */}
                            <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="flex-1 py-1.5 bg-[#0A3D2E]/10 hover:bg-[#0A3D2E] text-[#0A3D2E] hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
                              >
                                Ver Ficha
                              </button>

                              <button
                                onClick={() => setWorkspaceLead(lead)}
                                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                                title="Abrir Workspace do Lead & Diagnóstico IA"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span className="hidden sm:inline">Workspace</span>
                              </button>

                              <button
                                onClick={() => handleCopyTrackingLink(lead.id)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                  copiedLeadId === lead.id 
                                    ? "bg-emerald-600 text-white border-emerald-600" 
                                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                                title="Copiar Link de Acompanhamento"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={`https://api.whatsapp.com/send?phone=${lead.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#20ba5a] hover:text-white rounded-lg transition-all shrink-0 border border-[#25D366]/20"
                                title="Chamar no WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5 fill-current" />
                              </a>

                              <button
                                onClick={() => handleDeleteRecord(lead.id, "leads")}
                                disabled={userRole === "contador"}
                                className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                                  userRole === "contador"
                                    ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                                    : isDeletingId === lead.id && confirmDelete 
                                      ? "bg-rose-600 text-white border-rose-600 animate-bounce cursor-pointer" 
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 cursor-pointer"
                                }`}
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* REFINED TABLE VIEW FOR LEADS */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                            <th className="py-3.5 px-4 font-extrabold">Empresa / Razão</th>
                            <th className="py-3.5 px-3 font-extrabold">Porte</th>
                            <th className="py-3.5 px-3 font-extrabold">Limite Est.</th>
                            <th className="py-3.5 px-3 font-extrabold">Preparação</th>
                            <th className="py-3.5 px-3 font-extrabold">Certificado</th>
                            <th className="py-3.5 px-3 font-extrabold">Etapa</th>
                            <th className="py-3.5 px-3 font-extrabold">Status</th>
                            <th className="py-3.5 px-4 text-right font-extrabold">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                          {paginatedLeads.map((lead, idx) => (
                            <tr 
                              key={lead.id} 
                              className={`transition-colors hover:bg-emerald-50/40 ${
                                idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-bold text-slate-900">{lead.razaoSocial || lead.nome || "Não informado"}</div>
                                  {lead.pendencias?.resposta && (lead.pendencias?.status === "pendente" || lead.pendente) && (
                                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md animate-pulse shadow-xs shrink-0" title="Parceiro respondeu à pendência!">
                                      <MessageSquare className="w-2.5 h-2.5 text-white fill-white/20" />
                                      <span>RESPONDIDO</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{lead.cnpj || "-"}</div>
                                {lead.parceiroId ? (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#0A3D2E] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md w-max" title="Lead indicado por parceiro">
                                    <Handshake className="w-3 h-3 text-[#00A86B] shrink-0" />
                                    <span>{lead.parceiroNome || partners.find(p => p.id === lead.parceiroId)?.nome || "Parceiro PROSFEC"}</span>
                                    <button
                                      onClick={() => setAssigningLead(lead)}
                                      className="ml-1 text-[9px] text-amber-700 hover:text-amber-900 underline font-bold cursor-pointer"
                                      title="Reatribuir lead para outro Parceiro Master"
                                    >
                                      Alterar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setAssigningLead(lead)}
                                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-1.5 py-0.5 rounded-md transition-all shadow-2xs cursor-pointer"
                                    title="Direcionar este lead para um Parceiro Master"
                                  >
                                    <UserPlus className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Direcionar p/ Master</span>
                                  </button>
                                )}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                                  {lead.porte || "N/A"}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap font-bold font-mono text-[#0A3D2E]">
                                {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Simulação Indisp."}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md ${getPreparationBadgeClass(lead.nivelPreparacao)}`}>
                                  {lead.nivelPreparacao || "-"}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {lead.certificadoFileBase64 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 border border-emerald-200 text-[#00A86B] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md" title={lead.certificadoFileName}>
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <span>Anexado</span>
                                  </span>
                                ) : lead.certificadoSenha ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md" title="Senha informada mas arquivo pendente">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    <span>Pendente</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-medium uppercase tracking-wider px-2 py-0.5 rounded-md">
                                    <span>Ausente</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <select
                                  value={lead.etapa || 1}
                                  onChange={(e) => handleUpdateEtapa(lead.id, Number(e.target.value))}
                                  className="text-[11px] px-2 py-1 rounded-lg font-bold cursor-pointer focus:outline-hidden bg-white/75 backdrop-blur-xl border border-slate-200 text-slate-700 hover:bg-slate-50 max-w-[125px] truncate"
                                >
                                  <option value={1}>1. Dados CNPJ</option>
                                  <option value={2}>2. Sócios</option>
                                  <option value={3}>3. Diagnóstico</option>
                                  <option value={4}>4. Assinatura</option>
                                  <option value={5}>5. Senha Gov</option>
                                  <option value={6}>6. Estruturação</option>
                                  <option value={7}>7. Apto</option>
                                  <option value={8}>8. Aprovado/Recusado</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <select
                                  value={lead.status || "novo"}
                                  onChange={(e) => handleUpdateStatus(lead.id, "leads", e.target.value)}
                                  className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md cursor-pointer focus:outline-hidden transition-all ${getStatusBadgeClass(lead.status)}`}
                                >
                                  <option value="novo">Novo</option>
                                  <option value="em atendimento">Atendimento</option>
                                  <option value="concluido">Concluído</option>
                                  <option value="arquivado">Arquivado</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                                <button
                                  onClick={() => setSelectedLead(lead)}
                                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-[#0A3D2E] text-slate-700 hover:text-white rounded-lg font-bold transition-all cursor-pointer"
                                >
                                  Ficha
                                </button>

                                <button
                                  onClick={() => setWorkspaceLead(lead)}
                                  className="px-2 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                  title="Abrir Workspace do Lead & Diagnóstico IA"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-600" />
                                  <span>Workspace</span>
                                </button>

                                <button
                                  onClick={() => handleCopyTrackingLink(lead.id)}
                                  className={`px-2 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                                    copiedLeadId === lead.id 
                                      ? "bg-emerald-600 text-white" 
                                      : "bg-emerald-50 hover:bg-[#00A86B]/25 text-[#0A3D2E] border border-emerald-100"
                                  }`}
                                  title="Copiar Link de Acompanhamento do Cliente"
                                >
                                  {copiedLeadId === lead.id ? "Copiado!" : "Link"}
                                </button>
                                
                                <a
                                  href={`https://api.whatsapp.com/send?phone=${lead.whatsapp.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center p-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#20ba5a] hover:text-white rounded-lg transition-all"
                                  title="Falar no WhatsApp"
                                >
                                  <Phone className="w-3.5 h-3.5 fill-current" />
                                </a>

                                <button
                                  onClick={() => handleDeleteRecord(lead.id, "leads")}
                                  disabled={userRole === "contador"}
                                  className={`p-1.5 rounded-lg transition-all inline-flex items-center ${
                                    userRole === "contador"
                                      ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-60"
                                      : isDeletingId === lead.id && confirmDelete 
                                        ? "bg-rose-600 text-white animate-bounce cursor-pointer" 
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                                  }`}
                                  title={userRole === "contador" ? "Acesso restrito para contador" : isDeletingId === lead.id && confirmDelete ? "Clique novamente para Confirmar Exclusão" : "Excluir Registro"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Leads Pagination */}
                  {filteredLeads.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                      <div className="text-xs text-slate-500 font-medium">
                        Mostrando <span className="font-bold font-mono text-slate-700">{((leadsPage - 1) * itemsPerPage) + 1}</span> a{" "}
                        <span className="font-bold font-mono text-slate-700">{Math.min(leadsPage * itemsPerPage, filteredLeads.length)}</span> de{" "}
                        <span className="font-bold font-mono text-slate-700">{filteredLeads.length}</span> leads
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setLeadsPage(prev => Math.max(prev - 1, 1))}
                          disabled={leadsPage === 1}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white/75 backdrop-blur-xl hover:bg-slate-50 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Anterior
                        </button>
                        {[...Array(Math.ceil(filteredLeads.length / itemsPerPage))].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setLeadsPage(i + 1)}
                            className={`px-3 py-1.5 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer ${
                              leadsPage === i + 1
                                ? "bg-[#0A3D2E] text-white"
                                : "text-slate-600 bg-white hover:bg-slate-50 border border-slate-200"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setLeadsPage(prev => Math.min(prev + 1, Math.ceil(filteredLeads.length / itemsPerPage)))}
                          disabled={leadsPage === Math.ceil(filteredLeads.length / itemsPerPage)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white/75 backdrop-blur-xl hover:bg-slate-50 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PARTNERS LIST TABLE */}
              {activeTab === "partners" && (
                <>
                  {filteredPartners.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">
                      <Handshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-bold text-slate-600">Nenhum parceiro encontrado</p>
                      <p className="text-xs mt-1">Tente ajustar seus filtros de busca.</p>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                      {paginatedPartners.map((partner) => {
                        const partnerLeads = leads.filter(l => l.parceiroId === partner.id);
                        
                        // team members
                        const isFranquia = partner.plano?.toUpperCase().includes("FRANQUIA") || partner.plano?.toUpperCase().includes("DIGITAL") || partner.plano?.toUpperCase().includes("MASTER") || partner.plano?.toUpperCase() === "PLATINUM";
                        const teamMembers = partners.filter(p => p.parentPartnerId === partner.id);
                        const teamLeads = leads.filter(l => teamMembers.some(m => m.id === l.parceiroId));
                        
                        // pendencies count
                        const pendingLeadsCount = [...partnerLeads, ...teamLeads].filter(l => l.pendente === true || l.pendencias?.status === "pendente").length;
                        
                        const sub = getSubscriptionStatus(partner);
                        
                        // initials for avatar
                        const initials = partner.nome ? partner.nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() : "P";

                        return (
                          <div key={partner.id} className="bg-white rounded-2xl border border-slate-150 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 relative overflow-hidden group">
                            {/* Subtle top bar decorative */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${
                              partner.plano?.toUpperCase().includes("FRANQUIA") || partner.plano?.toUpperCase().includes("DIGITAL") || partner.plano?.toUpperCase().includes("MASTER") || partner.plano?.toUpperCase() === "PLATINUM"
                                ? "bg-indigo-500"
                                : partner.plano?.toUpperCase().includes("EXECUTIVE")
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}></div>

                            {/* Header Section */}
                            <div className="flex items-start justify-between gap-3 pt-1">
                              <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                                  partner.plano?.toUpperCase().includes("FRANQUIA") || partner.plano?.toUpperCase().includes("DIGITAL") || partner.plano?.toUpperCase().includes("MASTER") || partner.plano?.toUpperCase() === "PLATINUM"
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                    : partner.plano?.toUpperCase().includes("EXECUTIVE")
                                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                }`}>
                                  {initials}
                                </div>
                                <div className="text-left">
                                  <h4 className="font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-1">{partner.nome}</h4>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0A3D2E]">
                                      {getPlanName(partner.plano)}
                                    </span>
                                    {partner.parentPartnerNome && (
                                      <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1 py-0.2 rounded-sm border border-slate-200">
                                        Filiado a {partner.parentPartnerNome}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Status Dropdown */}
                              <select
                                value={partner.status || "novo"}
                                onChange={(e) => handleUpdateStatus(partner.id, "parceiros", e.target.value)}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border cursor-pointer focus:outline-hidden ${getStatusBadgeClass(partner.status)}`}
                              >
                                <option value="novo">Novo</option>
                                <option value="em atendimento">Atendimento</option>
                                <option value="parceria ativa">Ativa</option>
                                <option value="arquivado">Arquivado</option>
                              </select>
                            </div>

                            {/* Contact & Info */}
                            <div className="space-y-2 text-xs text-slate-600 border-t border-slate-50 pt-3 text-left">
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate" title={partner.email}>{partner.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono">{partner.whatsapp}</span>
                              </div>
                              {partner.cidade && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{partner.cidade}</span>
                                </div>
                              )}
                              
                              {/* Access Status Badge inside Card */}
                              <div className="pt-1">
                                {(() => {
                                  const isConsultant = !!partner.parentPartnerId || partner.isTeamMember === true || (partner.plano && (partner.plano.toUpperCase().includes("CONSULTOR") || partner.plano.toUpperCase().includes("EQUIPE")));
                                  const isBlocked = partner.statusManual === "bloqueado" || partner.status === "bloqueado";
                                  const sub = getSubscriptionStatus(partner);

                                  if (isConsultant) {
                                    const lastActiveStr = partner.dataUltimoAcesso || partner.dataCriacao;
                                    let isInactiveByTime = false;
                                    if (lastActiveStr) {
                                      const diffDays = Math.floor((Date.now() - new Date(lastActiveStr).getTime()) / (1000 * 60 * 60 * 24));
                                      if (diffDays >= 3) isInactiveByTime = true;
                                    }
                                    const isInactive = partner.status === "inativo" || isInactiveByTime;

                                    if (isInactive) {
                                      return (
                                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-rose-100">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                          Consultor Inativo (3+ dias)
                                        </span>
                                      );
                                    }

                                    return (
                                      <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-blue-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                        Consultor Ativo
                                      </span>
                                    );
                                  } else if (isBlocked) {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-rose-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                        Parceiro Bloqueado
                                      </span>
                                    );
                                  } else if (sub.status === "vencida") {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                        {sub.isTrial ? "Trial Vencido" : "Licença Vencida"}
                                      </span>
                                    );
                                  } else if (sub.isTrial) {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                        Teste Grátis ({sub.daysLeft}d)
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                        Parceiro Ativo
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                            </div>

                            {/* Balances Strip: Saldo Geral & Caça-Leads */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/90 text-left">
                              <div>
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Geral</span>
                                <span className="text-xs font-mono font-extrabold text-emerald-800 block truncate">
                                  {formatCurrencyBRL(
                                    partner.saldoGeral !== undefined
                                      ? Number(partner.saldoGeral)
                                      : (partner.saldoConsultas !== undefined ? Number(partner.saldoConsultas) : 0)
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Caça-Leads</span>
                                <span className="text-xs font-mono font-extrabold text-slate-700 block truncate">
                                  {partner.cacaLeadsCredits || 0} <span className="text-[9px] font-normal text-slate-500">buscas</span>
                                </span>
                              </div>
                            </div>

                            {/* Performance Grid */}
                            <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-3 text-center">
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Leads</span>
                                <span className="text-sm font-black text-slate-800">{partnerLeads.length}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Equipe</span>
                                <span className="text-sm font-black text-slate-800">
                                  {isFranquia ? teamMembers.length : "-"}
                                </span>
                              </div>
                              <div className={`p-2 rounded-xl border transition-all ${
                                pendingLeadsCount > 0 
                                  ? "bg-amber-50 border-amber-200" 
                                  : "bg-slate-50 border-slate-100"
                              }`}>
                                <span className={`text-[9px] font-bold block uppercase tracking-wider ${pendingLeadsCount > 0 ? "text-amber-700 font-black animate-pulse" : "text-slate-400"}`}>Pendentes</span>
                                <span className={`text-sm font-black ${pendingLeadsCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
                                  {pendingLeadsCount}
                                </span>
                              </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="border-t border-slate-50 pt-3 flex items-center justify-between gap-2 mt-auto">
                              <button
                                type="button"
                                onClick={() => setSelectedPartner(partner)}
                                className="flex-1 py-1.5 bg-[#0A3D2E]/10 hover:bg-[#0A3D2E] text-[#0A3D2E] hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
                              >
                                Abrir Operação
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyPartnerLink(partner.id)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                  copiedPartnerId === partner.id 
                                    ? "bg-emerald-600 text-white border-emerald-600" 
                                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                                title="Copiar Link de Indicação"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={`https://api.whatsapp.com/send?phone=${partner.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#20ba5a] hover:text-white rounded-lg transition-all shrink-0 border border-[#25D366]/20"
                                title="WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5 fill-current" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(partner.id, "parceiros")}
                                disabled={userRole === "contador"}
                                className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                                  userRole === "contador"
                                    ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                                    : isDeletingId === partner.id && confirmDelete 
                                      ? "bg-rose-600 text-white border-rose-600 animate-bounce cursor-pointer" 
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 cursor-pointer"
                                }`}
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="py-3.5 px-4">Data / Hora</th>
                          <th className="py-3.5 px-4">Nome Parceiro</th>
                          <th className="py-3.5 px-4">E-mail / WhatsApp</th>
                          <th className="py-3.5 px-4">Cidade / UF</th>
                          <th className="py-3.5 px-4">Chave Pix</th>
                          <th className="py-3.5 px-4">Plano</th>
                          <th className="py-3.5 px-4">Saldos da Conta</th>
                          <th className="py-3.5 px-4">Situação / Acesso</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {paginatedPartners.map((partner) => (
                          <tr key={partner.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                              {formatDate(partner.dataCriacao)}
                            </td>
                            <td className="py-3 px-4 text-slate-900">
                              <div className="font-extrabold text-left">{partner.nome}</div>
                              {partner.parentPartnerNome ? (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-md text-[9px] font-black">
                                  ✦ Equipe: {partner.parentPartnerNome}
                                </span>
                              ) : (partner.plano?.toUpperCase().includes("FRANQUIA") || partner.plano?.toUpperCase().includes("DIGITAL") || partner.plano?.toUpperCase().includes("MASTER") || partner.plano?.toUpperCase() === "PLATINUM") ? (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-md text-[9px] font-black">
                                  👑 Gestor de Equipe
                                </span>
                              ) : null}
                            </td>
                            <td className="py-3 px-4 text-left">
                              <div className="font-medium text-slate-700">{partner.email}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{partner.whatsapp}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium text-left">
                              {partner.cidade || "-"}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-600 text-left">
                              {partner.chavePix || "-"}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-left">
                              <span className="bg-amber-100 text-amber-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-200">
                                {getPlanName(partner.plano)} ({getCommissionRateText(partner.plano)})
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-left">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Geral:</span>
                                  <span className="font-mono font-extrabold text-emerald-800 text-xs">
                                    {formatCurrencyBRL(
                                      partner.saldoGeral !== undefined
                                        ? Number(partner.saldoGeral)
                                        : (partner.saldoConsultas !== undefined ? Number(partner.saldoConsultas) : 0)
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Buscas:</span>
                                  <span className="font-mono font-bold text-slate-700 text-xs">
                                    {partner.cacaLeadsCredits || 0}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-left">
                              {(() => {
                                const isConsultant = !!partner.parentPartnerId || partner.isTeamMember === true || (partner.plano && (partner.plano.toUpperCase().includes("CONSULTOR") || partner.plano.toUpperCase().includes("EQUIPE")));
                                const isBlocked = partner.statusManual === "bloqueado" || partner.status === "bloqueado";
                                const sub = getSubscriptionStatus(partner);

                                if (isConsultant) {
                                  const lastActiveStr = partner.dataUltimoAcesso || partner.dataCriacao;
                                  let isInactiveByTime = false;
                                  if (lastActiveStr) {
                                    const diffDays = Math.floor((Date.now() - new Date(lastActiveStr).getTime()) / (1000 * 60 * 60 * 24));
                                    if (diffDays >= 3) isInactiveByTime = true;
                                  }
                                  const isInactive = partner.status === "inativo" || isInactiveByTime;

                                  if (isInactive) {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                        Consultor Inativo (3+ dias)
                                      </span>
                                    );
                                  }

                                  return (
                                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                      Consultor Ativo
                                    </span>
                                  );
                                } else if (isBlocked) {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                      Parceiro Bloqueado
                                    </span>
                                  );
                                } else if (sub.status === "vencida") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                      {sub.isTrial ? "Trial Vencido" : "Licença Vencida"}
                                    </span>
                                  );
                                } else if (sub.isTrial) {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                      Teste Grátis ({sub.daysLeft}d)
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      Parceiro Ativo
                                    </span>
                                  );
                                }
                              })()}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-left">
                              <select
                                value={partner.status || "novo"}
                                onChange={(e) => handleUpdateStatus(partner.id, "parceiros", e.target.value)}
                                className={`text-xs px-2.5 py-1 rounded-full font-bold cursor-pointer focus:outline-hidden ${getStatusBadgeClass(partner.status)}`}
                              >
                                <option value="novo">Novo</option>
                                <option value="em atendimento">Em Atendimento</option>
                                <option value="parceria ativa">Parceria Ativa</option>
                                <option value="arquivado">Arquivado</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedPartner(partner)}
                                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-[#0A3D2E] text-slate-700 hover:text-white rounded-md font-bold transition-all cursor-pointer"
                              >
                                Detalhes
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyPartnerLink(partner.id)}
                                className={`px-2.5 py-1 text-xs rounded-md font-bold transition-all cursor-pointer ${
                                  copiedPartnerId === partner.id 
                                    ? "bg-emerald-600 text-white animate-pulse" 
                                    : "bg-emerald-50 hover:bg-[#00A86B]/25 text-[#0A3D2E] border border-emerald-100"
                                }`}
                                title="Copiar Link de Indicação do Parceiro"
                              >
                                {copiedPartnerId === partner.id ? "Copiado!" : "Copiar Link"}
                              </button>

                              <a
                                href={`https://api.whatsapp.com/send?phone=${partner.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center p-1 bg-[#25D366]/10 hover:bg-[#25D366] text-[#20ba5a] hover:text-white rounded-md transition-all"
                                title="Falar no WhatsApp"
                              >
                                <Phone className="w-4.5 h-4.5 fill-current p-0.5" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(partner.id, "parceiros")}
                                disabled={userRole === "contador"}
                                className={`p-1.5 rounded-md transition-all inline-flex items-center ${
                                  userRole === "contador"
                                    ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-60"
                                    : isDeletingId === partner.id && confirmDelete 
                                      ? "bg-rose-600 text-white animate-bounce cursor-pointer" 
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                                }`}
                                title={userRole === "contador" ? "Acesso restrito para contador" : isDeletingId === partner.id && confirmDelete ? "Clique novamente para Confirmar Exclusão" : "Excluir Registro"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}

                  {/* Partners Pagination */}
                  {filteredPartners.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                      <div className="text-xs text-slate-500 font-medium">
                        Mostrando <span className="font-bold text-slate-700">{((partnersPage - 1) * itemsPerPage) + 1}</span> a{" "}
                        <span className="font-bold text-slate-700">{Math.min(partnersPage * itemsPerPage, filteredPartners.length)}</span> de{" "}
                        <span className="font-bold text-slate-700">{filteredPartners.length}</span> parceiros
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPartnersPage(prev => Math.max(prev - 1, 1))}
                          disabled={partnersPage === 1}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white/75 backdrop-blur-xl hover:bg-slate-50 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Anterior
                        </button>
                        {[...Array(Math.ceil(filteredPartners.length / itemsPerPage))].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPartnersPage(i + 1)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              partnersPage === i + 1
                                ? "bg-[#0A3D2E] text-white"
                                : "text-slate-600 bg-white hover:bg-slate-50 border border-slate-200"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setPartnersPage(prev => Math.min(prev + 1, Math.ceil(filteredPartners.length / itemsPerPage)))}
                          disabled={partnersPage === Math.ceil(filteredPartners.length / itemsPerPage)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white/75 backdrop-blur-xl hover:bg-slate-50 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Próximo
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ANNOUNCEMENTS MANAGER VIEW */}
              {activeTab === "announcements" && (
                <div className="p-6">
                  {/* Header / Intro */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Comunicados e Campanhas de Incentivo</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Crie e gerencie informativos ou campanhas que aparecerão na tela inicial dos seus parceiros assim que eles acessarem o portal.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenNewAnnouncement}
                      className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer self-start"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Comunicado
                    </button>
                  </div>

                  {/* List of current announcements */}
                  {announcements.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center">
                      <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-bold text-sm">Nenhum comunicado criado ainda</p>
                      <p className="text-slate-400 text-xs mt-1 mb-4">Que tal criar o seu primeiro comunicado usando um dos nossos modelos?</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {ANNOUNCEMENT_PRESETS.map((preset, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              handleOpenNewAnnouncement();
                              handleApplyPreset(preset);
                            }}
                            className="px-3 py-1.5 bg-white/75 backdrop-blur-xl border border-slate-200 hover:border-indigo-400 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-indigo-500" />
                            {preset.titulo}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {announcements.map((ann) => (
                        <div
                          key={ann.id}
                          className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col relative ${
                            ann.ativo ? "border-slate-200" : "border-slate-150 opacity-70"
                          }`}
                        >
                          {/* Image preview or standard icon banner */}
                          {ann.imagemUrl ? (
                            <div className="h-40 w-full overflow-hidden bg-slate-100 relative">
                              <img
                                src={ann.imagemUrl}
                                alt={ann.titulo}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {!ann.ativo && (
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                                  <span className="bg-slate-800 text-slate-200 text-xs font-black px-3 py-1 rounded-full border border-slate-700 uppercase tracking-wider">
                                    Inativo / Oculto
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-32 bg-indigo-50 flex items-center justify-center relative">
                              <Megaphone className="w-12 h-12 text-indigo-400" />
                              {!ann.ativo && (
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
                                  <span className="bg-slate-800 text-slate-200 text-xs font-black px-3 py-1 rounded-full border border-slate-700 uppercase tracking-wider">
                                    Inativo / Oculto
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                ann.publicoAlvo === "todos" 
                                  ? "bg-slate-100 text-slate-800" 
                                  : ann.publicoAlvo === "executive" 
                                  ? "bg-amber-100 text-amber-800"
                                  : ann.publicoAlvo === "franquia"
                                  ? "bg-indigo-100 text-indigo-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {ann.publicoAlvo === "todos" ? "Todos os Planos" : ann.publicoAlvo === "executive" ? "Executive Partner" : ann.publicoAlvo === "franquia" ? "Master Partner" : "Vendedor Isento"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(ann.dataCriacao).toLocaleDateString("pt-BR")}
                              </span>
                            </div>

                            <h3 className="font-bold text-slate-800 line-clamp-1 text-sm">{ann.titulo}</h3>
                            <p className="text-xs text-slate-500 mt-1 flex-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">{ann.mensagem}</p>

                            {/* CTA link preview */}
                            {ann.linkUrl && (
                              <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-150 flex items-center gap-2 text-[11px] text-slate-600">
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-bold shrink-0">{ann.linkTexto || "Botão"}:</span>
                                <span className="truncate text-slate-400 font-mono">{ann.linkUrl}</span>
                              </div>
                            )}

                            {/* Actions footer */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <button
                                onClick={() => handleToggleAnnouncementActive(ann)}
                                className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                                  ann.ativo
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                    : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                                }`}
                              >
                                {ann.ativo ? "Ativo" : "Pausado"}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditAnnouncement(ann)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnouncement(ann.id)}
                                  disabled={userRole === "contador"}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    userRole === "contador"
                                      ? "text-slate-300 cursor-not-allowed bg-slate-50 opacity-50"
                                      : "hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  }`}
                                  title={userRole === "contador" ? "Acesso restrito para contador" : "Excluir"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab RECARGAS CAÇA-LEADS */}
              {activeTab === "recargas" && (
                <div className="p-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-600" />
                        Aprovação de Recargas (Saldo Geral &amp; Caça-Leads)
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        Aprove ou cancele as solicitações de recarga enviadas manualmente pelos parceiros.
                      </p>
                    </div>
                  </div>

                  {recargas.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Coins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 text-sm font-bold">Nenhuma solicitação de recarga registrada</p>
                      <p className="text-slate-400 text-xs mt-1">As solicitações enviadas pelos parceiros aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase border-b border-slate-100">
                            <th className="py-3 px-4">Parceiro</th>
                            <th className="py-3 px-4">Pacote / Buscas</th>
                            <th className="py-3 px-4">Valor</th>
                            <th className="py-3 px-4">Data Solicitação</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {recargas.map((refill) => (
                            <tr key={refill.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-800">{refill.partnerNome}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{refill.partnerWhatsapp || "N/A"}</div>
                              </td>
                              <td className="py-3 px-4">
                                {refill.tipo === "consultas" ? (
                                  <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wide">
                                    Saldo Geral (Consultas / Contab.)
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-black text-[#0A3D2E] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wide">
                                      {refill.pacote}
                                    </span>
                                    <span className="ml-2 font-medium text-slate-600">
                                      ({refill.buscas} buscas)
                                    </span>
                                  </>
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-700">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(refill.valor)}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {refill.dataSolicitacao ? new Date(refill.dataSolicitacao).toLocaleString("pt-BR") : "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  refill.status === "pendente" 
                                    ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                    : refill.status === "aprovada"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}>
                                  {refill.status === "pendente" && <Clock className="w-3 h-3 animate-spin" />}
                                  {refill.status === "aprovada" && <CheckCircle className="w-3 h-3" />}
                                  {refill.status === "cancelada" && <X className="w-3 h-3" />}
                                  {refill.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {refill.status === "pendente" ? (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleApproveRefill(refill)}
                                      disabled={userRole === "contador"}
                                      className={`px-2.5 py-1 rounded-lg text-white font-bold transition-all text-[11px] flex items-center gap-1 shrink-0 ${
                                        userRole === "contador"
                                          ? "bg-slate-300 cursor-not-allowed opacity-50"
                                          : "bg-[#00A86B] hover:bg-[#008F5A] active:scale-95 cursor-pointer animate-pulse"
                                      }`}
                                      title={userRole === "contador" ? "Acesso restrito para contador" : "Aprovar e Liberar Crédito"}
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Aprovar
                                    </button>
                                    <button
                                      onClick={() => handleCancelRefill(refill.id)}
                                      disabled={userRole === "contador"}
                                      className={`px-2.5 py-1 rounded-lg text-slate-700 bg-white border border-slate-200 font-bold transition-all text-[11px] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 flex items-center gap-1 shrink-0 ${
                                        userRole === "contador"
                                          ? "bg-slate-300 cursor-not-allowed opacity-50"
                                          : "active:scale-95 cursor-pointer"
                                      }`}
                                      title={userRole === "contador" ? "Acesso restrito para contador" : "Recusar / Cancelar Solicitação"}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      Recusar
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Processada {refill.dataAprovacao ? `em ${new Date(refill.dataAprovacao).toLocaleDateString("pt-BR")}` : ""}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab COMISSÕES & SAQUES FINANCEIROS DE TODA A BASE */}
              {activeTab === "comissoes" && (
                <div className="p-6 animate-fade-in space-y-6 text-left">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 font-display">
                        <Receipt className="w-5 h-5 text-emerald-600" />
                        Desempenho &amp; Controle Financeiro de Comissões
                      </h2>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Gerencie todas as solicitações de saque de comissões enviadas pelos parceiros, acompanhe a liquidação da Hubla (Pix 48h / Cartão 15 dias) e controle os pagamentos manuais via Pix.
                      </p>
                    </div>

                    <button
                      onClick={fetchData}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar Dados
                    </button>
                  </div>

                  {/* Top KPI Metric Cards for Financial Overview */}
                  {(() => {
                    // Global calculations based on all leads in base with tiered and multilevel commission logic
                    let totalVolumeServicosGeral = 0;
                    let totalComissoesGeradasGeral = 0;
                    let totalComissoesLiquidadasHubla = 0;
                    let totalComissoesAguardandoHubla = 0;
                    let totalComissoesPendentesCliente = 0;

                    leads.forEach((l) => {
                      const summary = calculateLeadMultilevelCommissions(l, partners);
                      totalVolumeServicosGeral += summary.valorTotalServicos;
                      totalComissoesGeradasGeral += summary.valorTotalComissao;
                      totalComissoesLiquidadasHubla += summary.valorComissaoLiberadaSaque;
                      totalComissoesAguardandoHubla += summary.valorAguardandoCompensacao;
                      totalComissoesPendentesCliente += summary.valorComissaoPendente;
                    });

                    const totalSolicitacoesPendentesValor = comissoes
                      .filter(c => c.status === "pendente")
                      .reduce((acc, c) => acc + (c.valor || 0), 0);

                    const totalSolicitacoesPagasValor = comissoes
                      .filter(c => c.status === "pago")
                      .reduce((acc, c) => acc + (c.valor || 0), 0);

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                          {/* Card 1 */}
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
                            <div className="flex items-center justify-between text-emerald-800 mb-1">
                              <span className="text-[11px] font-black uppercase tracking-wider font-mono">Saques Pendentes</span>
                              <Clock className="w-4 h-4 text-emerald-700" />
                            </div>
                            <div className="text-xl font-black text-[#022118] font-display">
                              {formatCurrencyBRL(totalSolicitacoesPendentesValor)}
                            </div>
                            <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                              {comissoes.filter(c => c.status === "pendente").length} solicitação(ões) aguardando Pix
                            </p>
                          </div>

                          {/* Card 2 */}
                          <div className="bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between text-slate-600 mb-1">
                              <span className="text-[11px] font-black uppercase tracking-wider font-mono">Comissões Pagas</span>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="text-xl font-black text-slate-900 font-display">
                              {formatCurrencyBRL(totalSolicitacoesPagasValor)}
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold mt-1">
                              {comissoes.filter(c => c.status === "pago").length} repasse(s) já liquidados via Pix
                            </p>
                          </div>

                          {/* Card 3 */}
                          <div className="bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between text-blue-800 mb-1">
                              <span className="text-[11px] font-black uppercase tracking-wider font-mono">Aguardando Hubla</span>
                              <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-xl font-black text-blue-950 font-display">
                              {formatCurrencyBRL(totalComissoesAguardandoHubla)}
                            </div>
                            <p className="text-[10px] text-blue-700 font-semibold mt-1">
                              Em compensação (Pix 48h / Cartão 15d)
                            </p>
                          </div>

                          {/* Card 4 */}
                          <div className="bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between text-slate-600 mb-1">
                              <span className="text-[11px] font-black uppercase tracking-wider font-mono">Volume Total Serviços</span>
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="text-xl font-black text-slate-900 font-display">
                              {formatCurrencyBRL(totalVolumeServicosGeral)}
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold mt-1">
                              Potencial Total de Comissões: {formatCurrencyBRL(totalComissoesGeradasGeral)}
                            </p>
                          </div>
                        </div>

                        {/* Hubla Policy Banner */}
                        <div className="bg-slate-50 border border-slate-200/90 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div className="text-slate-700">
                              <strong className="text-slate-900">Regra de Saque Hubla &amp; Execução dos Serviços:</strong> Pix liberado após <strong>48h úteis</strong> e Cartão de Crédito após <strong>15 dias corridos</strong>. Os serviços só devem ser iniciados após o dinheiro estar disponível.
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-200">Pix: 48h</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-lg border border-blue-200">Cartão: 15d</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setComissoesFilter("todas")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          comissoesFilter === "todas"
                            ? "bg-[#0A3D2E] text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        Todas ({comissoes.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setComissoesFilter("pendente")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          comissoesFilter === "pendente"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <span>Pendentes</span>
                        {comissoes.filter(c => c.status === "pendente").length > 0 && (
                          <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.2 rounded-full font-black">
                            {comissoes.filter(c => c.status === "pendente").length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setComissoesFilter("pago")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          comissoesFilter === "pago"
                            ? "bg-emerald-700 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        Pagas ({comissoes.filter(c => c.status === "pago").length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={comissoesSearch}
                        onChange={(e) => setComissoesSearch(e.target.value)}
                        placeholder="Buscar por parceiro, e-mail, chave PIX..."
                        className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {/* List / Table of Commission Requests */}
                  {(() => {
                    const filteredComissoes = comissoes.filter((c) => {
                      let matches = true;
                      if (comissoesFilter !== "todas") {
                        matches = c.status === comissoesFilter;
                      }
                      const q = comissoesSearch.toLowerCase().trim();
                      if (matches && q) {
                        matches = (
                          (c.partnerNome && c.partnerNome.toLowerCase().includes(q)) ||
                          (c.partnerEmail && c.partnerEmail.toLowerCase().includes(q)) ||
                          (c.partnerWhatsapp && c.partnerWhatsapp.includes(q)) ||
                          (c.chavePix && c.chavePix.toLowerCase().includes(q)) ||
                          (c.detalhes?.leadsEnvolvidos && c.detalhes.leadsEnvolvidos.some(ln => ln.toLowerCase().includes(q)))
                        );
                      }
                      return matches;
                    });

                    if (filteredComissoes.length === 0) {
                      return (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-600 text-sm font-bold">Nenhuma solicitação de saque encontrada</p>
                          <p className="text-slate-400 text-xs mt-1">
                            Quando os parceiros solicitarem o repasse de suas comissões liberadas, elas aparecerão listadas aqui para controle e pagamento manual via Pix.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-2xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[11px] font-black tracking-wider text-slate-600 uppercase border-b border-slate-100">
                              <th className="py-3 px-4">Data Solicitação</th>
                              <th className="py-3 px-4">Parceiro</th>
                              <th className="py-3 px-4">Chave PIX Informada</th>
                              <th className="py-3 px-4">Valor do Saque</th>
                              <th className="py-3 px-4">Leads / Detalhes</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Ação Financeira (ADM)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredComissoes.map((sol) => (
                              <tr key={sol.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                  {sol.dataSolicitacao ? new Date(sol.dataSolicitacao).toLocaleString("pt-BR") : "N/A"}
                                </td>

                                <td className="py-3 px-4">
                                  <div className="font-extrabold text-slate-900">{sol.partnerNome}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sol.partnerEmail}</div>
                                  {sol.partnerWhatsapp && (
                                    <div className="text-[10px] text-emerald-700 font-mono">{sol.partnerWhatsapp}</div>
                                  )}
                                  <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                    (sol as any).origem === "vendas"
                                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}>
                                    {(sol as any).origem === "vendas" ? "Comissões de Vendas" : "Serviços Passo 6"}
                                  </span>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 select-all">
                                      {sol.chavePix}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(sol.chavePix);
                                        alert("Chave Pix copiada para a área de transferência!");
                                      }}
                                      className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                      title="Copiar Chave Pix"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className="font-black text-emerald-800 text-sm font-mono">
                                    {formatCurrencyBRL(sol.valor)}
                                  </span>
                                </td>

                                <td className="py-3 px-4">
                                  {sol.detalhes?.leadsEnvolvidos && sol.detalhes.leadsEnvolvidos.length > 0 ? (
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Leads:</span>
                                      <span className="text-slate-700 font-medium text-[11px] block truncate max-w-[200px]" title={sol.detalhes.leadsEnvolvidos.join(", ")}>
                                        {sol.detalhes.leadsEnvolvidos.join(", ")}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Comissão de serviços</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    sol.status === "pendente"
                                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                                      : sol.status === "pago"
                                      ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                      : "bg-rose-100 text-rose-900 border border-rose-200"
                                  }`}>
                                    {sol.status === "pendente" && <Clock className="w-3 h-3 text-amber-700" />}
                                    {sol.status === "pago" && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                                    {sol.status === "recusado" && <X className="w-3 h-3 text-rose-700" />}
                                    {sol.status === "pendente" ? "Aguardando Pix" : sol.status === "pago" ? "Pago via Pix" : "Recusado"}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  {sol.status === "pendente" ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        disabled={processingComissaoId === sol.id || userRole === "contador"}
                                        onClick={() => handlePayCommission(sol)}
                                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                        title="Confirmar pagamento manual via PIX"
                                      >
                                        {processingComissaoId === sol.id ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                        <span>Confirmar Pix Pago</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={processingComissaoId === sol.id || userRole === "contador"}
                                        onClick={() => handleRejectCommission(sol.id, sol.partnerNome)}
                                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 font-bold text-xs rounded-xl transition-all border border-slate-200 flex items-center gap-1 cursor-pointer"
                                        title="Recusar solicitação"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Recusar</span>
                                      </button>
                                    </div>
                                  ) : sol.status === "pago" ? (
                                    <div className="text-right">
                                      <span className="text-[10px] text-emerald-800 font-bold block">
                                        Pago em {sol.dataPagamento ? new Date(sol.dataPagamento).toLocaleDateString("pt-BR") : "N/A"}
                                      </span>
                                      {sol.comprovante && (
                                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[160px] inline-block" title={sol.comprovante}>
                                          {sol.comprovante}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-right">
                                      <span className="text-[10px] text-rose-700 font-bold block">Recusada</span>
                                      {sol.observacoes && (
                                        <span className="text-[10px] text-slate-400 truncate max-w-[160px] inline-block" title={sol.observacoes}>
                                          {sol.observacoes}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab TABELA DE PREÇOS CONSULTAS */}
              {activeTab === "precos" && (
                <div className="p-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Tabela de Preços Base (Consultas de Crédito)
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        Defina o custo base das consultas. O sistema aplicará automaticamente o <strong>markup de 40% (lucro)</strong> sobre esses valores base antes de exibi-los aos parceiros.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleResetToDefaults}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Restaurar Padrões
                      </button>
                      <button
                        onClick={handleSavePrices}
                        className="px-3.5 py-2 bg-[#0A3D2E] hover:bg-[#072a20] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Salvar Todos os Preços
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-amber-800 text-xs">
                    <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Como funciona a precificação:</p>
                      <p className="mt-1">
                        O parceiro vê e paga o valor calculado com 40% de margem (Valor Final). O lucro da plataforma é a diferença entre o custo real e o Valor Final pago pelo parceiro.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase border-b border-slate-100">
                          <th className="py-3 px-4 w-20">Código</th>
                          <th className="py-3 px-4">Nome da Consulta</th>
                          <th className="py-3 px-4 w-40">Preço de Custo Base (R$)</th>
                          <th className="py-3 px-4 w-48">Preço p/ Parceiro (Margem Real de 40%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {CREDIT_PRODUCTS.map((prod) => {
                          const customVal = editPrices[prod.code];
                          const basePrice = customVal !== undefined ? customVal : prod.defaultPrice;
                          const partnerPrice = Number((basePrice * 1.40).toFixed(2));

                          return (
                            <tr key={prod.code} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                                {prod.code}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-800">{prod.name}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="relative rounded-lg shadow-xs max-w-[120px]">
                                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                                    <span className="text-slate-400 text-[11px] font-medium">R$</span>
                                  </div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customVal !== undefined ? customVal : ""}
                                    placeholder={prod.defaultPrice.toFixed(2)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditPrices(prev => ({
                                        ...prev,
                                        [prod.code]: val === "" ? prod.defaultPrice : Number(val)
                                      }));
                                    }}
                                    className="block w-full rounded-lg border border-slate-200 py-1 pl-7 pr-2 text-xs focus:border-[#00A86B] focus:ring-[#00A86B]/30 focus:outline-hidden font-bold text-slate-700 bg-slate-50/50"
                                  />
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[#0A3D2E] text-sm">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(partnerPrice)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    (Lucro: R$ {(partnerPrice - basePrice).toFixed(2).replace(".", ",")})
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Catálogo de Serviços de Saneamento & Adequação (Diagnóstico / Workspace do Lead) */}
                  <div className="mt-10 pt-8 border-t border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <Settings className="w-5 h-5 text-emerald-600" />
                          Catálogo de Serviços de Saneamento & Adequação
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">
                          Gerencie os serviços disponíveis no Diagnóstico/Workspace do Lead (Renegociação de Dívidas, Score, Rating, BACEN, Contabilidade, etc.) e ajuste seus valores de referência ou adicione novos serviços personalizados.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6">
                      <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        Adicionar Novo Serviço ao Catálogo
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nome do Serviço / Solução</label>
                          <input
                            type="text"
                            value={newServNome}
                            onChange={(e) => setNewServNome(e.target.value)}
                            placeholder="Ex: Regularização de Protestos e Cartórios"
                            className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newServValor}
                            onChange={(e) => setNewServValor(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="350.00"
                            className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Link de Checkout LastLink (Opcional)</label>
                          <div className="relative">
                            <input
                              type="url"
                              value={newServHublaLink}
                              onChange={(e) => setNewServHublaLink(e.target.value)}
                              placeholder="https://lastlink.com/p/..."
                              className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 font-mono"
                            />
                            <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleAddCustomService}
                            className="w-full px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase border-b border-slate-100">
                            <th className="py-3 px-4">Nome do Serviço</th>
                            <th className="py-3 px-4 w-36">Valor (R$)</th>
                            <th className="py-3 px-4">Link Checkout LastLink</th>
                            <th className="py-3 px-4 w-20 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {customServices.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                                Nenhum serviço cadastrado no catálogo. Adicione novos serviços acima.
                              </td>
                            </tr>
                          ) : (
                            customServices.map((serv, sIdx) => (
                              <tr key={serv.id || sIdx} className="hover:bg-slate-50/50 transition-all">
                                <td className="py-3 px-4">
                                  <input
                                    type="text"
                                    value={serv.nome}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCustomServices(prev => prev.map((item, idx) => idx === sIdx ? { ...item, nome: val } : item));
                                    }}
                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 font-bold text-slate-800 py-1 outline-none text-xs"
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  <div className="relative rounded-lg shadow-xs max-w-[130px]">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                                      <span className="text-slate-400 text-[11px] font-medium">R$</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={serv.valor}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setCustomServices(prev => prev.map((item, idx) => idx === sIdx ? { ...item, valor: val } : item));
                                      }}
                                      className="block w-full rounded-lg border border-slate-200 py-1 pl-6 pr-2 text-xs focus:border-[#00A86B] focus:ring-[#00A86B]/30 focus:outline-hidden font-bold text-slate-800 bg-slate-50/50"
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className="relative flex-1">
                                      <input
                                        type="url"
                                        value={serv.hublaLink || ""}
                                        placeholder="https://lastlink.com/p/..."
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setCustomServices(prev => prev.map((item, idx) => {
                                            if (idx !== sIdx) return item;
                                            const updated = { ...item };
                                            if (val.trim()) {
                                              updated.hublaLink = val.trim();
                                            } else {
                                              delete updated.hublaLink;
                                            }
                                            return updated;
                                          }));
                                        }}
                                        className="w-full rounded-lg border border-slate-200 py-1 pl-7 pr-2 text-xs font-mono text-slate-700 bg-slate-50/50 focus:bg-white/75 backdrop-blur-xl focus:border-emerald-500 focus:outline-none"
                                      />
                                      <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                    </div>
                                    {serv.hublaLink && serv.hublaLink.startsWith("http") && (
                                      <a
                                        href={serv.hublaLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                                        title="Testar Link de Checkout"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomService(serv.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Remover Serviço"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Botão de Salvar Rápido do Catálogo e Sincronização */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <p className="text-[11px] text-slate-500">
                        {customServices.length} serviço(s) configurado(s) no catálogo de saneamento e adequação.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleSyncAllLeadsManual}
                          disabled={loading || userRole === "contador"}
                          className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          title="Recalcula preços e comissões de todos os leads cadastrados no painel usando o catálogo atual"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Sincronizar Leads Existentes
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePrices}
                          disabled={loading || userRole === "contador"}
                          className="w-full sm:w-auto px-4 py-2 bg-[#00A86B] hover:bg-[#008f5b] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Save className="w-4 h-4" />
                          {loading ? "Salvando no Firestore..." : "Salvar Catálogo & Preços"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab FUNIL & CONVERSÃO DO SIMULADOR */}
              {activeTab === "funnel" && (
                <div className="p-6 animate-fade-in">
                  <FunnelAnalyticsDashboard
                    leads={leads}
                    onRefresh={fetchData}
                  />
                </div>
              )}

              {/* Tab SERVIÇOS DE CONTABILIDADE */}
              {activeTab === "servicos_contabilidade" && (
                <AdminServicosContabilidadeTab userRole={userRole} />
              )}

              {/* Tab GESTÃO DE SENHAS & RESETS DO PORTAL DO CLIENTE */}
              {activeTab === "resets" && (
                <div className="p-6 animate-fade-in space-y-6 text-left">
                  {/* Top Intro */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 font-display">
                        <Key className="w-5 h-5 text-emerald-600" />
                        Central de Senhas &amp; Reset do Portal do Cliente
                      </h2>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Atenda às solicitações de redefinição de senha dos clientes do Portal. Digite ou gere uma nova senha e envie diretamente para o consultor responsável repassar ao cliente com segurança e sigilo.
                      </p>
                    </div>
                  </div>

                  {resetSuccessMessage && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-3 animate-fade-in shadow-2xs">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="flex-1">{resetSuccessMessage}</div>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setResetsFilter("pendentes")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          resetsFilter === "pendentes"
                            ? "bg-[#0A3D2E] text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <span>Solicitações Pendentes</span>
                        {leads.filter(l => l.solicitacaoResetSenha?.pendente).length > 0 && (
                          <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                            {leads.filter(l => l.solicitacaoResetSenha?.pendente).length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setResetsFilter("todos")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          resetsFilter === "todos"
                            ? "bg-[#0A3D2E] text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        Todos os Leads ({leads.length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={resetsSearch}
                        onChange={(e) => setResetsSearch(e.target.value)}
                        placeholder="Buscar por Razão, CNPJ ou Nome..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* List / Cards of Leads for Reset */}
                  {(() => {
                    const filtered = leads.filter(l => {
                      if (resetsFilter === "pendentes" && !l.solicitacaoResetSenha?.pendente) {
                        return false;
                      }
                      if (resetsSearch.trim()) {
                        const term = resetsSearch.toLowerCase();
                        const nome = (l.razaoSocial || l.nome || "").toLowerCase();
                        const cnpj = (l.cnpj || "").toLowerCase();
                        return nome.includes(term) || cnpj.includes(term);
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-2">
                          <Key className="w-10 h-10 text-slate-300 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-700">
                            {resetsFilter === "pendentes" 
                              ? "Nenhuma solicitação de reset de senha pendente no momento." 
                              : "Nenhum lead encontrado para os filtros selecionados."}
                          </h4>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Quando um cliente clicar em "Esqueci minha senha" no Portal, a solicitação aparecerá aqui automaticamente para atendimento.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {filtered.map((leadItem) => {
                          const consultant = partners.find(p => p.id === (leadItem as any).parceiroId);
                          const isPending = leadItem.solicitacaoResetSenha?.pendente;
                          const currentPass = leadItem.clienteSenha || (leadItem as any).clienteSenhaHash ? "••••••••" : "";
                          const typedPass = resetNewPasswords[leadItem.id] || "";
                          const isShowPass = showLeadPortalSenha[leadItem.id];
                          const isSaving = savingResetLeadId === leadItem.id;

                          return (
                            <div
                              key={leadItem.id}
                              className={`p-5 rounded-2xl border transition-all space-y-4 bg-white shadow-2xs ${
                                isPending
                                  ? "border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20"
                                  : "border-slate-200/90 hover:border-slate-300"
                              }`}
                            >
                              {/* Card Header */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-slate-900 font-display">
                                      {leadItem.razaoSocial || leadItem.nome}
                                    </span>
                                    {isPending && (
                                      <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                                        ⚠️ Solicitação de Reset Pendente
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                                    <span>CNPJ: <strong>{leadItem.cnpj || "Não informado"}</strong></span>
                                    <span>•</span>
                                    <span>WhatsApp: <strong>{leadItem.whatsapp || "Não informado"}</strong></span>
                                    <span>•</span>
                                    <span>ID: {leadItem.id}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <a
                                    href={`${getAppDomain()}?acompanhamento=${leadItem.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Abrir Portal</span>
                                  </a>
                                </div>
                              </div>

                              {/* Details & Action Grid */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                                {/* Consultant Info */}
                                <div className="lg:col-span-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                    Consultor Responsável
                                  </span>
                                  <p className="text-xs font-bold text-slate-800">
                                    {consultant ? consultant.nome : "Sem consultor vinculado (Atendimento Direto)"}
                                  </p>
                                  {consultant?.whatsapp && (
                                    <p className="text-[11px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {consultant.whatsapp}
                                    </p>
                                  )}
                                  {leadItem.solicitacaoResetSenha?.dataSolicitacao && (
                                    <p className="text-[10px] text-amber-700 font-semibold pt-1 border-t border-slate-200/60 mt-1">
                                      Solicitado em: {new Date(leadItem.solicitacaoResetSenha.dataSolicitacao).toLocaleString("pt-BR")}
                                    </p>
                                  )}
                                </div>

                                {/* Current Password Badge */}
                                <div className="lg:col-span-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                    Senha Atual do Portal
                                  </span>
                                  {currentPass ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-black text-slate-900 bg-white/75 backdrop-blur-xl border border-slate-200 px-2 py-1 rounded-lg">
                                        {isShowPass ? currentPass : "••••••••"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setShowLeadPortalSenha(prev => ({ ...prev, [leadItem.id]: !prev[leadItem.id] }))}
                                        className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                                        title={isShowPass ? "Ocultar" : "Mostrar"}
                                      >
                                        {isShowPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(currentPass);
                                          setCopiedLeadPortalSenha(prev => ({ ...prev, [leadItem.id]: true }));
                                          setTimeout(() => setCopiedLeadPortalSenha(prev => ({ ...prev, [leadItem.id]: false })), 2000);
                                        }}
                                        className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                                        title="Copiar Senha"
                                      >
                                        {copiedLeadPortalSenha[leadItem.id] ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium italic">
                                      Primeiro acesso pendente
                                    </span>
                                  )}
                                </div>

                                {/* Reset Form Controls */}
                                <div className="lg:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="text"
                                      value={typedPass}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setResetNewPasswords(prev => ({ ...prev, [leadItem.id]: val }));
                                      }}
                                      placeholder="Nova senha ou gere ->"
                                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const gen = generateClientPassword();
                                        setResetNewPasswords(prev => ({ ...prev, [leadItem.id]: gen }));
                                      }}
                                      className="absolute right-1.5 top-1.5 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                      title="Gerar Senha Automática"
                                    >
                                      🎲 Gerar
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleAdminResetClientPassword(leadItem)}
                                    disabled={isSaving}
                                    className="px-3.5 py-2 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                                    title="Salva a nova senha no Firestore e abre o WhatsApp para enviar ao consultor"
                                  >
                                    {isSaving ? (
                                      <span>Salvando...</span>
                                    ) : (
                                      <>
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Salvar &amp; Enviar</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          )}

          {/* Table Footer count info */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-medium flex justify-between items-center">
            <div>
              Exibindo {activeTab === "leads" ? filteredLeads.length : activeTab === "recargas" ? recargas.length : activeTab === "precos" ? CREDIT_PRODUCTS.length : activeTab === "servicos_contabilidade" ? 33 : activeTab === "funnel" ? leads.length : activeTab === "resets" ? leads.length : activeTab === "partners" ? filteredPartners.length : partners.length} registros
            </div>
            <div>
              Desenvolvido de forma segura &bull; Firestore ativo
            </div>
          </div>
        </div>
      </div>
    </div>

      </main>

      {/* LEAD DETAIL MODAL - Caixa Flutuante (Floating Modal) */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-scale-in">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 p-6 bg-slate-50/50 shrink-0">
              <div>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Ficha de Lead de Crédito
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2 font-display leading-tight">{selectedLead.nome}</h2>
                <p className="text-xs text-slate-500 mt-1 font-mono">ID do Registro: {selectedLead.id}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Details Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              
              {/* Linha do Tempo Visual de Progresso das Etapas (Stepper Interativo) */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black text-slate-200 uppercase tracking-wider font-mono">
                      Jornada do Lead (Etapa {selectedLead.etapa || 1} de 8)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-400 font-extrabold bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-800/60">
                      {ETAPAS_LABELS[selectedLead.etapa || 1] || `Passo ${selectedLead.etapa || 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWorkspaceLead(selectedLead)}
                      className="px-2.5 py-1 bg-[#0A3D2E] hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Abrir Workspace Completo deste Lead"
                    >
                      <Briefcase className="w-3 h-3 text-emerald-300" />
                      <span>Abrir Workspace</span>
                    </button>
                  </div>
                </div>

                {/* Stepper Horizontal Interativo */}
                <div className="overflow-x-auto pb-1 pt-1 scrollbar-none">
                  <div className="flex items-center justify-between min-w-[620px] gap-1 px-1">
                    {STEPS_CONFIG.map((s, idx) => {
                      const currentEtapaNum = selectedLead.etapa || 1;
                      const isCompleted = s.step < currentEtapaNum;
                      const isCurrent = s.step === currentEtapaNum;

                      return (
                        <React.Fragment key={s.step}>
                          {idx > 0 && (
                            <div
                              className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-300 ${
                                isCompleted ? "bg-emerald-500" : isCurrent ? "bg-amber-400/70" : "bg-slate-800"
                              }`}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => handleUpdateEtapa(selectedLead.id, s.step)}
                            title={`Clique para avançar/retornar lead para ${s.fullLabel}`}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer group ${
                              isCurrent
                                ? "bg-amber-950/50 border border-amber-500/80 shadow-md ring-1 ring-amber-400/40"
                                : isCompleted
                                ? "bg-slate-800/50 hover:bg-slate-800 border border-emerald-900/60"
                                : "bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/50 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                isCompleted
                                  ? "bg-emerald-500 text-slate-950 font-bold"
                                  : isCurrent
                                  ? "bg-amber-400 text-slate-950 font-black ring-4 ring-amber-400/20 animate-pulse"
                                  : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-slate-950" />
                              ) : (
                                <span>{s.step}</span>
                              )}
                            </div>

                            <span
                              className={`text-[10px] font-bold whitespace-nowrap text-center ${
                                isCurrent
                                  ? "text-amber-300 font-extrabold"
                                  : isCompleted
                                  ? "text-emerald-300"
                                  : "text-slate-400 group-hover:text-slate-300"
                              }`}
                            >
                              {s.label.replace(`Passo ${s.step}: `, "")}
                            </span>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Contact & Status Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 font-bold uppercase">Status do Lead</p>
                  <select
                    value={selectedLead.status || "novo"}
                    onChange={(e) => handleUpdateStatus(selectedLead.id, "leads", e.target.value)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-extrabold cursor-pointer focus:outline-hidden ${getStatusBadgeClass(selectedLead.status)}`}
                  >
                    <option value="novo">Novo</option>
                    <option value="em atendimento">Em Atendimento</option>
                    <option value="concluido">Concluído</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Data de Cadastro</p>
                  <p className="text-sm text-slate-700 font-medium font-mono">{formatDate(selectedLead.dataCriacao)}</p>
                </div>
              </div>

              {/* Controle de Pendências e Alertas para o Parceiro */}
              <div className="bg-amber-50/50 border border-amber-300 p-5 rounded-2xl space-y-4 text-left">
                <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                  <h4 className="text-sm font-black text-amber-950 uppercase tracking-wider font-display">
                    💬 Chat de Pendências &amp; Atendimento (Mesa de Operações)
                  </h4>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed font-bold">
                    Troque mensagens diretamente com o parceiro deste lead. Cada orientação enviada fica registrada no histórico em tempo real.
                  </p>

                  {/* Histórico estilo Chat de Conversa */}
                  <div className="bg-slate-900/90 text-white p-4 rounded-2xl border border-slate-800 space-y-3 text-left shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        💬 Linha do Tempo da Conversa
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                          {selectedLead.pendencias?.historico?.length || (selectedLead.pendencias?.resposta ? 1 : 0)} mensagem(ns)
                        </span>
                        {((selectedLead.pendencias?.historico && selectedLead.pendencias.historico.length > 0) || selectedLead.pendencias?.resposta || selectedLead.pendencias?.mensagem) && (
                          <button
                            type="button"
                            onClick={() => handleClearChatHistory(selectedLead.id)}
                            disabled={savingPendencia}
                            className="text-[10px] bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold px-2 py-0.5 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
                            title="Apagar todo o histórico de mensagens deste lead"
                          >
                            🗑️ Limpar Chat
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {selectedLead.pendencias?.historico && selectedLead.pendencias.historico.length > 0 ? (
                        selectedLead.pendencias.historico.map((item, idx) => {
                          const isAdmin = item.autor === "admin";
                          return (
                            <div
                              key={item.id || idx}
                              className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                            >
                              <div
                                className={`max-w-[88%] p-3.5 rounded-2xl text-xs space-y-1.5 shadow-sm ${
                                  isAdmin
                                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-100 rounded-tl-xs"
                                    : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-100 rounded-tr-xs"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                    isAdmin ? "bg-amber-500/30 text-amber-300" : "bg-emerald-500/30 text-emerald-300"
                                  }`}>
                                    {isAdmin ? "🏛️ Mesa de Operações" : `👤 ${item.nomeAutor || "Parceiro"}`}
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
                      ) : selectedLead.pendencias?.resposta ? (
                        <div className="flex flex-col items-end">
                          <div className="max-w-[88%] bg-emerald-500/15 border border-emerald-500/30 p-3.5 rounded-2xl rounded-tr-xs text-xs text-emerald-100 space-y-1">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300">
                              👤 Resposta do Parceiro
                            </span>
                            <p className="font-medium leading-relaxed whitespace-pre-wrap text-slate-100">
                              {selectedLead.pendencias.resposta}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500 text-xs font-semibold italic">
                          Nenhuma mensagem registrada. Digite uma instrução abaixo para iniciar o chat com o parceiro.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-slate-600 font-black uppercase tracking-wider block">
                      Status Atual da Pendência:
                    </label>
                    <select
                      value={editingPendenciasStatus}
                      onChange={(e) => setEditingPendenciasStatus(e.target.value as 'pendente' | 'resolvida')}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] focus:outline-hidden bg-white/75 backdrop-blur-xl text-slate-800"
                    >
                      <option value="pendente">⚠️ Pendente (Requer Atenção do Parceiro)</option>
                      <option value="resolvida">✓ Resolvida / Sem Pendências</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-600 font-black uppercase tracking-wider block">
                      Enviar Nova Mensagem da Mesa de Operações:
                    </label>
                    <textarea
                      rows={3}
                      value={editingPendenciasMsg}
                      onChange={(e) => setEditingPendenciasMsg(e.target.value)}
                      placeholder="Ex: Por gentileza, nos envie a declaração de faturamento dos últimos 12 meses assinada pelo contador."
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] focus:outline-hidden bg-white/75 backdrop-blur-xl text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdatePendencias(selectedLead.id, editingPendenciasStatus, editingPendenciasMsg)}
                      disabled={savingPendencia}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingPendencia ? "Enviando..." : "💬 Enviar Mensagem no Chat"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção: Acesso do Cliente ao Portal (Senha & Reset) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" /> Acesso do Cliente ao Portal &amp; Senha
                </h4>
                <div className={`p-4 rounded-xl border space-y-3 bg-white shadow-xs ${
                  selectedLead.solicitacaoResetSenha?.pendente ? "border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30" : "border-slate-100"
                }`}>
                  {selectedLead.solicitacaoResetSenha?.pendente && (
                    <div className="p-3 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        Solicitação de redefinição de senha pendente enviada pelo cliente.
                      </span>
                      {selectedLead.solicitacaoResetSenha.dataSolicitacao && (
                        <span className="text-[10px] text-amber-800 font-mono">
                          {new Date(selectedLead.solicitacaoResetSenha.dataSolicitacao).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block mb-1">Status do Acesso:</span>
                      <span className={`px-2.5 py-1 rounded-full font-bold inline-block text-[11px] ${
                        (selectedLead.clienteSenha || (selectedLead as any).clienteSenhaHash) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {(selectedLead.clienteSenha || (selectedLead as any).clienteSenhaHash) ? "✓ Senha Cadastrada" : "⏳ Primeiro Acesso Pendente"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block mb-1">Senha Atual do Portal:</span>
                      <span className="text-slate-500 italic text-[11px] leading-snug block">
                        Protegida por criptografia (hash). Não é possível visualizar — gere uma nova senha abaixo para enviar ao consultor.
                      </span>
                    </div>
                  </div>

                  {/* Quick Reset in Modal */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={resetNewPasswords[selectedLead.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResetNewPasswords(prev => ({ ...prev, [selectedLead.id]: val }));
                        }}
                        placeholder="Digitar ou gerar nova senha ->"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const gen = generateClientPassword();
                          setResetNewPasswords(prev => ({ ...prev, [selectedLead.id]: gen }));
                        }}
                        className="absolute right-1 top-1 px-2 py-0.5 bg-white/75 backdrop-blur-xl hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 cursor-pointer"
                      >
                        🎲 Gerar
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdminResetClientPassword(selectedLead)}
                      disabled={savingResetLeadId === selectedLead.id}
                      className="px-3.5 py-1.5 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{selectedLead.solicitacaoResetSenha?.pendente ? "Atender Reset & Enviar WhatsApp" : "Redefinir & Enviar ao Consultor"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Painel Financeiro e Comissões do Lead */}
              <div className="bg-[#052E22]/5 border border-emerald-500/20 p-5 rounded-2xl space-y-4 text-left">
                <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                  <Coins className="w-5 h-5 text-[#0A3D2E]" />
                  <h4 className="text-sm font-black text-[#0A3D2E] uppercase tracking-wider font-display">
                    Painel Financeiro &amp; Controle de Comissão
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo de Valor Real Aprovado & Controles de Análise */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-700 font-black uppercase block">
                          Crédito Real Aprovado (R$)
                        </label>
                        {selectedLead.status === "recusado" || selectedLead.resultadoAnaliseCredito === "recusado" ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            Crédito Recusado
                          </span>
                        ) : (selectedLead.valorAprovado && selectedLead.valorAprovado > 0) ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Aprovado: {formatCurrencyBRL(selectedLead.valorAprovado)}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            Em Análise Bancária
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          placeholder="0,00"
                          value={selectedLead.valorAprovado ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            handleUpdateValorAprovado(selectedLead.id, val);
                          }}
                          className="w-full text-xs font-black pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] focus:outline-hidden"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        *Preencha o valor liberado pelos bancos parceiros na Etapa 7.
                      </span>
                    </div>

                    {/* Botões de Ação Rápida: Recusado / Aprovado / Pagamento do Serviço */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                      {/* Botão de Crédito Recusado */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedLead.status === "recusado" || selectedLead.resultadoAnaliseCredito === "recusado") {
                            // Desmarcar recusa e colocar em análise
                            handleUpdateStatus(selectedLead.id, "leads", "em atendimento");
                          } else {
                            if (window.confirm(`Deseja marcar a análise de crédito do lead "${selectedLead.nome}" como RECUSADA?`)) {
                              handleSetCreditoRecusado(selectedLead.id);
                            }
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          selectedLead.status === "recusado" || selectedLead.resultadoAnaliseCredito === "recusado"
                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                            : "bg-white hover:bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                        title="Marcar crédito do lead como recusado no sistema e notificar parceiro"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>
                          {selectedLead.status === "recusado" || selectedLead.resultadoAnaliseCredito === "recusado" 
                            ? "✓ Crédito Recusado" 
                            : "Marcar Recusado"}
                        </span>
                      </button>

                      {/* Botão de Status Pagamento do Serviço PROSFEC (Apenas no Passo 6) */}
                      {(selectedLead.etapa === 6 || selectedLead.etapa >= 6) && (
                        <button
                          type="button"
                          onClick={() => handleToggleServicoPago(selectedLead.id, !selectedLead.servicoPago)}
                          className={`py-2 px-3 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                            selectedLead.servicoPago
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-white hover:bg-amber-50 text-amber-800 border border-amber-300"
                          }`}
                          title="Alternar se o cliente já realizou o pagamento dos serviços do Passo 6 ou se está pendente"
                        >
                          {selectedLead.servicoPago ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Serviço Pago ✓</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Serviço Pendente ⏳</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {(selectedLead.etapa === 6 || selectedLead.etapa >= 6) && (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-bold">Status do Pagamento do Serviço (Passo 6):</span>
                        {selectedLead.servicoPago ? (
                          <span className="font-black text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                            Pago pelo Cliente (Liberado no Painel do Parceiro)
                          </span>
                        ) : (
                          <span className="font-black text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded">
                            Pendente de Pagamento
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Detalhes de Comissão se houver parceiro */}
                  {selectedLead.parceiroId ? (() => {
                    const partnerObj = partners.find(p => p.id === selectedLead.parceiroId);
                    const commissionMultiplier = getCommissionMultiplier(partnerObj?.plano);
                    const isConcluidoOrAprovado = selectedLead.etapa === 7 || selectedLead.status === "concluido";
                    const directCommissionValue = (selectedLead.valorAprovado || selectedLead.limiteEstimado || 0) * commissionMultiplier;

                    return (
                      <div className="bg-white p-3.5 border border-emerald-100 rounded-xl space-y-3 text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] uppercase font-black text-slate-400 block">Parceiro</span>
                            <span className="text-xs font-bold text-slate-800">{partnerObj?.nome || selectedLead.parceiroNome || "Não identificado"}</span>
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Plano {partnerObj?.plano || "Starter"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-xs">
                          <span className="text-slate-500 font-medium">Repasse ({(commissionMultiplier * 100).toFixed(1)}%):</span>
                          <span className="font-extrabold text-[#0A3D2E]">
                            {formatCurrencyBRL(directCommissionValue)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Status Repasse:</span>
                            {selectedLead.comissaoPaga ? (
                              <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                Pago
                              </span>
                            ) : isConcluidoOrAprovado ? (
                              <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                Pendente
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                Aguardando
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleUpdateComissaoPaga(selectedLead.id, !selectedLead.comissaoPaga)}
                            className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                              selectedLead.comissaoPaga
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            }`}
                          >
                            {selectedLead.comissaoPaga ? "Marcar Pendente" : "Marcar Pago ✓"}
                          </button>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="bg-slate-100/50 p-4 border border-slate-200/60 rounded-xl flex items-center justify-center text-center text-xs text-slate-400">
                      Este lead não possui parceiro indicado associado. Nenhuma comissão é gerada.
                    </div>
                  )}
                </div>
              </div>

              {/* 1. Informações Básicas da Empresa */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">1. Dados Básicos da Empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Razão Social</span>
                    <span className="text-sm text-slate-800 font-semibold">{selectedLead.razaoSocial || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">CNPJ</span>
                    <span className="text-sm text-slate-800 font-mono font-bold">{selectedLead.cnpj || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Porte da Empresa</span>
                    <span className="text-sm text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-sm inline-block mt-0.5">{selectedLead.porte || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Ramo de Atuação</span>
                    <span className="text-sm text-slate-800 font-semibold">{selectedLead.ramo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Cidade / UF</span>
                    <span className="text-sm text-slate-800 font-semibold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedLead.cidade || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Data de Abertura</span>
                    <span className="text-sm text-slate-800 font-semibold">{selectedLead.dataAbertura || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Parceiro Indicador / Directing Status */}
              {selectedLead.parceiroId ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <Handshake className="w-4.5 h-4.5 text-emerald-600 shrink-0" /> Origem do Lead: Indicação de Parceiro
                    </h4>
                    <button
                      onClick={() => setAssigningLead(selectedLead)}
                      className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Alterar Parceiro Master</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-emerald-100 p-4 rounded-xl bg-emerald-50/30 shadow-xs">
                    <div>
                      <span className="text-xs text-slate-400 block font-bold">Nome do Parceiro</span>
                      <span className="text-sm text-slate-800 font-extrabold text-[#0A3D2E]">
                        {selectedLead.parceiroNome || partners.find(p => p.id === selectedLead.parceiroId)?.nome || "Parceiro PROSFEC"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold">ID de Afiliação</span>
                      <span className="text-sm text-slate-600 font-mono text-xs">{selectedLead.parceiroId}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="text-xs font-extrabold text-amber-900 block flex items-center gap-1">
                      <UserPlus className="w-4 h-4 text-amber-600" /> Lead Sem Parceiro Vinculado
                    </span>
                    <span className="text-[11px] text-amber-700 block mt-0.5">
                      Este lead entrou diretamente e ainda não possui nenhum parceiro responsável.
                    </span>
                  </div>
                  <button
                    onClick={() => setAssigningLead(selectedLead)}
                    className="px-3.5 py-1.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Direcionar para Master</span>
                  </button>
                </div>
              )}

              {/* 2. Informações de Contato */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">2. Contato do Responsável</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Nome do Solicitante</span>
                    <span className="text-sm text-slate-800 font-semibold">{selectedLead.nome}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Cargo</span>
                    <span className="text-sm text-slate-800 font-semibold">{selectedLead.cargo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">WhatsApp</span>
                    <a 
                      href={`https://api.whatsapp.com/send?phone=${selectedLead.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-emerald-600 hover:text-[#25D366] font-bold flex items-center gap-1 inline-block mt-0.5"
                    >
                      <Phone className="w-4 h-4 fill-current" /> {selectedLead.whatsapp} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">E-mail</span>
                    <a 
                      href={`mailto:${selectedLead.email}`}
                      className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 inline-block mt-0.5"
                    >
                      <Mail className="w-4 h-4" /> {selectedLead.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Dados dos Sócios & Endereço Residencial */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Dados dos Sócios e Residência</h4>
                <div className="border border-slate-100 p-4 rounded-xl bg-white shadow-xs space-y-4">
                  {selectedLead.socios && selectedLead.socios.length > 0 ? (
                    <div className="space-y-4">
                      {selectedLead.socios.map((socio, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                          <span className="text-[10px] font-black uppercase text-[#0A3D2E] block">
                            👤 Sócio {idx + 1}: {socio.cargo || (idx === 0 ? "Sócio Principal" : "Sócio Secundário")}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 font-bold block">Nome Completo:</span>
                              <span className="font-semibold text-slate-800">{socio.nome}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block">CPF:</span>
                              <span className="font-mono text-slate-800">{socio.cpf}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block">Data de Nascimento:</span>
                              <span className="text-slate-800">{socio.dataNascimento ? new Date(socio.dataNascimento + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block">Participação:</span>
                              <span className="font-bold text-slate-800">{socio.participacao}%</span>
                            </div>
                            {socio.nomeMae && (
                              <div>
                                <span className="text-slate-400 font-bold block">Nome da Mãe:</span>
                                <span className="text-slate-800">{socio.nomeMae}</span>
                              </div>
                            )}
                            {socio.telefone && (
                              <div>
                                <span className="text-slate-400 font-bold block">Telefone:</span>
                                <span className="text-slate-800">{socio.telefone}</span>
                              </div>
                            )}
                            {socio.rg && (
                              <div>
                                <span className="text-slate-400 font-bold block">RG / Órgão Emissor:</span>
                                <span className="text-slate-800">{socio.rg} {socio.orgaoEmissor ? `/ ${socio.orgaoEmissor}` : ""}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Endereço Residencial do Sócio Principal */}
                      {selectedLead.enderecoSocioPrincipal && (
                        <div className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-100/60 space-y-2 text-xs">
                          <span className="text-[10px] font-black uppercase text-[#0A3D2E] block">
                            🏠 Endereço Residencial (Sócio Principal)
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="md:col-span-2">
                              <span className="text-slate-400 font-bold">Logradouro:</span>{" "}
                              <span className="text-slate-800">{selectedLead.enderecoSocioPrincipal.logradouro}, Nº {selectedLead.enderecoSocioPrincipal.numero} {selectedLead.enderecoSocioPrincipal.complemento ? ` - ${selectedLead.enderecoSocioPrincipal.complemento}` : ""}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold">Bairro:</span>{" "}
                              <span className="text-slate-800">{selectedLead.enderecoSocioPrincipal.bairro}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold">CEP:</span>{" "}
                              <span className="font-mono text-slate-800">{selectedLead.enderecoSocioPrincipal.cep}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold">Cidade / UF:</span>{" "}
                              <span className="text-slate-800">{selectedLead.enderecoSocioPrincipal.cidade} - {selectedLead.enderecoSocioPrincipal.uf}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum dado de sócios registrado para este lead.</p>
                  )}
                </div>
              </div>

              {/* 3. Situação Fiscal & Faturamento */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">3. Diagnóstico Fiscal e Financeiro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Faturamento Anual Declarado</span>
                    <span className="text-lg font-black text-[#0A3D2E] block mt-0.5">
                      {selectedLead.faturamentoAnual ? formatCurrencyBRL(selectedLead.faturamentoAnual) : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Idade da Empresa</span>
                    <span className="text-sm text-slate-800 font-semibold block mt-0.5">
                      {selectedLead.menosDe12Meses ? "Menos de 12 meses (Abertura recente)" : "Mais de 12 meses de funcionamento"}
                    </span>
                  </div>
                  {selectedLead.menosDe12Meses && (
                    <>
                      <div>
                        <span className="text-xs text-slate-400 block font-bold">Capital Social Declarado</span>
                        <span className="text-sm text-slate-800 font-semibold block mt-0.5">
                          {selectedLead.capitalSocial ? formatCurrencyBRL(selectedLead.capitalSocial) : "R$ 0,00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block font-bold">Faturamento Médio Mensal</span>
                        <span className="text-sm text-slate-800 font-semibold block mt-0.5">
                          {selectedLead.mediaReceitaMensal ? formatCurrencyBRL(selectedLead.mediaReceitaMensal) : "R$ 0,00"}
                        </span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Selo Emprega + Mulher</span>
                    <span className={`text-xs px-2 py-0.5 font-bold rounded-md inline-block mt-1 ${
                      selectedLead.seloEmpregaMulher 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {selectedLead.seloEmpregaMulher ? "Sim (Liderança Feminina ativa)" : "Não"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Situação Cadastral Receita</span>
                    <span className={`text-xs px-2 py-0.5 font-bold rounded-md inline-block mt-1 ${
                      selectedLead.situacaoCadastral === "Ativa" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {selectedLead.situacaoCadastral || "Não declarada"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Declaração de Faturamento Ativa</span>
                    <span className="text-sm text-slate-800 font-semibold block mt-0.5">
                      {selectedLead.possuiDeclaracaoFaturamento ? "Sim (Pronto para e-CAC)" : "Não possui"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Compartilhamento de Dados e-CAC</span>
                    <span className="text-sm text-emerald-700 font-bold block mt-0.5">
                      {selectedLead.autorizaCompartilhamentoEcac ? "✓ Autorizado com a PROSFEC" : "Não autorizado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Restrições no Serasa / SPC</span>
                    <span className={`text-xs px-2 py-0.5 font-bold rounded-md inline-block mt-1 ${
                      selectedLead.possuiRestricaoSerasa 
                        ? "bg-rose-100 text-rose-800" 
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {selectedLead.possuiRestricaoSerasa ? "Sim (Possui restrições)" : "Não (Ficha Limpa)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Dívidas Tributárias Ativas</span>
                    <span className={`text-xs px-2 py-0.5 font-bold rounded-md inline-block mt-1 ${
                      selectedLead.possuiDividasTributarias 
                        ? "bg-rose-100 text-rose-800" 
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {selectedLead.possuiDividasTributarias ? "Sim (Dívidas pendentes)" : "Não (Certidão Negativa OK)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Banco de Preferência</span>
                    <span className="text-sm text-slate-800 font-semibold block mt-0.5">{selectedLead.bancoPrincipal || "-"}</span>
                  </div>
                </div>
              </div>

              {/* 4. Objetivo e Urgência */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">4. Plano de Captação e Urgência</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Objetivo do Recurso</span>
                    <span className="text-sm text-slate-800 font-semibold capitalize">
                      {selectedLead.objetivoRecurso ? selectedLead.objetivoRecurso.replace("_", " ") : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Tempo para Captação</span>
                    <span className="text-sm text-slate-800 font-bold text-amber-700 capitalize">
                      {selectedLead.tempoParaCaptacao || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Resultado da Simulação (Aprovado / Alertas) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-4.5 h-4.5 text-[#00A86B]" /> 5. Resultado Calculado da Simulação
                </h4>
                <div className="border border-[#00A86B]/30 p-4 rounded-xl bg-slate-50/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-400 block font-bold">Limite de Crédito Estimado</span>
                      <span className="text-2xl font-black text-[#00A86B]">
                        {selectedLead.limiteEstimado ? formatCurrencyBRL(selectedLead.limiteEstimado) : "Sob Consulta"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold">Nível de Preparação da Empresa</span>
                      <span className={`text-xs px-3 py-1 font-bold rounded-full capitalize inline-block mt-1 ${getPreparationBadgeClass(selectedLead.nivelPreparacao)}`}>
                        {selectedLead.nivelPreparacao || "Em análise"}
                      </span>
                    </div>
                  </div>

                  {/* Alertas */}
                  {selectedLead.principaisAlertas && selectedLead.principaisAlertas.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-rose-700 font-bold block flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Impedimentos / Alertas de Risco:
                      </span>
                      <ul className="list-disc list-inside text-xs text-rose-800 space-y-1 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                        {selectedLead.principaisAlertas.map((alerta, i) => (
                          <li key={i}>{alerta}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recomendações */}
                  {selectedLead.recomendações && selectedLead.recomendações.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-emerald-800 font-bold block">
                        Recomendações Técnicas para o Especialista:
                      </span>
                      <ul className="list-disc list-inside text-xs text-emerald-900 space-y-1 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        {selectedLead.recomendações.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 5.1 Diagnóstico PROSFEC IA & Serviços Recomendados (Sincronizado) */}
              <div className="space-y-4 border border-emerald-200/90 bg-emerald-50/30 p-5 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-2 font-display">
                      <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                      Diagnóstico IA & Serviços Aplicados ao Lead
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Resultado e pacote de serviços de saneamento/adequação gerados para este lead.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWorkspaceLead(selectedLead)}
                    className="px-3.5 py-2 bg-gradient-to-r from-[#0A3D2E] to-[#00A86B] hover:from-[#00A86B] hover:to-[#0A3D2E] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Abrir Workspace do Lead</span>
                  </button>
                </div>

                {/* Texto do Diagnóstico IA e Serviços Recomendados (Apenas se Passo 3 concluído) */}
                {selectedLead.diagnosticoPROSFEC ? (
                  <>
                    <div className="bg-white/75 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-2.5">
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Resultado da Perícia & Diagnóstico PROSFEC IA
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          {selectedLead.diagnosticoPROSFEC.dataGeracao && (
                            <span>Gerado em: {new Date(selectedLead.diagnosticoPROSFEC.dataGeracao).toLocaleString('pt-BR')}</span>
                          )}
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Refazeres: {selectedLead.diagnosticoPROSFEC.geracoesCount || selectedLead.diagnosticoGeracoesCount || 1}/2
                          </span>
                        </div>
                      </div>

                      <FintechDiagnosisView
                        lead={selectedLead}
                        diagnostico={selectedLead.diagnosticoPROSFEC}
                        consultas={[]}
                      />
                    </div>

                    {/* Lista de Serviços Recomendados do Lead */}
                    <div className="bg-white/75 backdrop-blur-xl border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          Serviços de Saneamento & Adequação Recomendados
                        </h5>
                        <span className="text-xs font-extrabold text-[#0A3D2E] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          Total do Lead: {formatCurrencyBRL(editingServicosRecomendados.reduce((acc, s) => acc + (Number(s.valor !== undefined ? s.valor : s.price) || 0), 0))}
                        </span>
                      </div>

                      {editingServicosRecomendados.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">
                          Nenhum serviço individual cadastrado para este lead ainda.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {editingServicosRecomendados.map((serv, idx) => (
                            <div key={serv.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 block truncate">{serv.nome || serv.name}</span>
                                {serv.descricao && <span className="text-[10px] text-slate-500 block truncate">{serv.descricao}</span>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg px-2 py-1">
                                  <span className="text-[10px] text-slate-400 font-bold">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={serv.valor !== undefined ? serv.valor : (serv.price || 0)}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const updated = [...editingServicosRecomendados];
                                      updated[idx] = { ...updated[idx], valor: val, price: val };
                                      setEditingServicosRecomendados(updated);
                                    }}
                                    className="w-20 text-xs font-mono font-bold text-slate-800 outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = editingServicosRecomendados.filter((_, i) => i !== idx);
                                    setEditingServicosRecomendados(updated);
                                  }}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Remover serviço deste lead"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            const newServ = {
                              id: `serv_custom_${Date.now()}`,
                              nome: "Serviço Personalizado de Saneamento",
                              valor: 150,
                              price: 150,
                              categoria: "Adequação"
                            };
                            setEditingServicosRecomendados([...editingServicosRecomendados, newServ]);
                          }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          Adicionar Serviço ao Lead
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveServicosRecomendados}
                          disabled={savingServicos}
                          className="px-4 py-2 bg-[#0A3D2E] hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {savingServicos ? (
                            <span>Salvando...</span>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Salvar Serviços Recomendados</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-center space-y-2">
                    <p className="text-xs font-bold text-amber-900">
                      Nenhum Diagnóstico PROSFEC IA gerado até o momento para este lead.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Os serviços de estruturação e adequação serão liberados nesta ficha após a conclusão do Diagnóstico (Passo 3) no Workspace do Lead.
                    </p>
                    <button
                      type="button"
                      onClick={() => setWorkspaceLead(selectedLead)}
                      className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Acessar Workspace & Gerar
                    </button>
                  </div>
                )}
              </div>

              {/* Seção de Credenciais de Acesso para Assessoria */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  🔑 Credenciais de Acesso do Cliente
                </h4>
                <div className="border border-slate-100 p-4 rounded-xl bg-white shadow-xs space-y-3">
                  <p className="text-[11px] text-slate-500 font-medium">
                    As credenciais abaixo foram disponibilizadas pelo parceiro para consulta de faturamento no e-CAC e verificação de restrições de crédito.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GOV.BR */}
                    <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl space-y-2 text-xs">
                      <span className="text-[10px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                        Acesso Gov.br (e-CAC)
                      </span>
                      <div className="space-y-1 mt-1">
                        <div>
                          <span className="text-slate-400 font-bold block">Usuário/CPF:</span>
                          <span className="font-mono text-slate-800 font-bold">{selectedLead.govbrLogin || "Não informado"}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 font-bold block mb-0.5">Senha Gov.br:</span>
                          {selectedLead.govbrSenha ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs select-all">
                                {showGovbrSenha ? selectedLead.govbrSenha : "••••••••"}
                              </span>
                              <button
                                onClick={() => setShowGovbrSenha(!showGovbrSenha)}
                                className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-all cursor-pointer"
                                title={showGovbrSenha ? "Ocultar Senha" : "Mostrar Senha"}
                              >
                                {showGovbrSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedLead.govbrSenha || "");
                                  setCopiedGovbr(true);
                                  setTimeout(() => setCopiedGovbr(false), 2000);
                                }}
                                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer shrink-0"
                                title="Copiar Senha"
                              >
                                {copiedGovbr ? "Copiado!" : "Copiar"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Não informada</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SERASA */}
                    <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-xl space-y-2 text-xs">
                      <span className="text-[10px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                        Acesso SERASA Experian
                      </span>
                      <div className="space-y-1 mt-1">
                        <div>
                          <span className="text-slate-400 font-bold block">Usuário:</span>
                          <span className="font-mono text-slate-800 font-bold">{selectedLead.serasaLogin || "Não informado"}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 font-bold block mb-0.5">Senha SERASA:</span>
                          {selectedLead.serasaSenha ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs select-all">
                                {showSerasaSenha ? selectedLead.serasaSenha : "••••••••"}
                              </span>
                              <button
                                onClick={() => setShowSerasaSenha(!showSerasaSenha)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer"
                                title={showSerasaSenha ? "Ocultar Senha" : "Mostrar Senha"}
                              >
                                {showSerasaSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedLead.serasaSenha || "");
                                  setCopiedSerasa(true);
                                  setTimeout(() => setCopiedSerasa(false), 2000);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer shrink-0"
                                title="Copiar Senha"
                              >
                                {copiedSerasa ? "Copiado!" : "Copiar"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Não informada</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CERTIFICADO DIGITAL A1 */}
                    <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-2 text-xs md:col-span-2">
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                        Certificado Digital A1
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">Senha do Certificado:</span>
                          {selectedLead.certificadoSenha ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs select-all">
                                {showCertificadoSenha ? selectedLead.certificadoSenha : "••••••••"}
                              </span>
                              <button
                                onClick={() => setShowCertificadoSenha(!showCertificadoSenha)}
                                className="p-1 hover:bg-emerald-100 text-emerald-600 rounded transition-all cursor-pointer"
                                title={showCertificadoSenha ? "Ocultar Senha" : "Mostrar Senha"}
                              >
                                {showCertificadoSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedLead.certificadoSenha || "");
                                  setCopiedCertificado(true);
                                  setTimeout(() => setCopiedCertificado(false), 2000);
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer shrink-0"
                                title="Copiar Senha"
                              >
                                {copiedCertificado ? "Copiado!" : "Copiar"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Não informada</span>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">Arquivo do Certificado:</span>
                          {selectedLead.certificadoFileName && selectedLead.certificadoFileBase64 ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] max-w-[120px] truncate" title={selectedLead.certificadoFileName}>
                                {selectedLead.certificadoFileName}
                              </span>
                              <a
                                href={selectedLead.certificadoFileBase64}
                                download={selectedLead.certificadoFileName}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer"
                                title="Baixar Arquivo"
                              >
                                <Download className="w-3 h-3" /> Baixar
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Não anexado</span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Seção: Acesso do Cliente ao Portal (Senha & Reset) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" /> Acesso do Cliente ao Portal &amp; Senha
                </h4>
                <div className={`p-4 rounded-xl border space-y-3 bg-white shadow-xs ${
                  selectedLead.solicitacaoResetSenha?.pendente ? "border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30" : "border-slate-100"
                }`}>
                  {selectedLead.solicitacaoResetSenha?.pendente && (
                    <div className="p-3 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                        Solicitação de redefinição de senha pendente enviada pelo cliente.
                      </span>
                      {selectedLead.solicitacaoResetSenha.dataSolicitacao && (
                        <span className="text-[10px] text-amber-800 font-mono">
                          {new Date(selectedLead.solicitacaoResetSenha.dataSolicitacao).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block mb-1">Status do Acesso:</span>
                      <span className={`px-2.5 py-1 rounded-full font-bold inline-block text-[11px] ${
                        (selectedLead.clienteSenha || (selectedLead as any).clienteSenhaHash) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {(selectedLead.clienteSenha || (selectedLead as any).clienteSenhaHash) ? "✓ Senha Cadastrada" : "⏳ Primeiro Acesso Pendente"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block mb-1">Senha Atual do Portal:</span>
                      <span className="text-slate-500 italic text-[11px] leading-snug block">
                        Protegida por criptografia (hash). Não é possível visualizar — gere uma nova senha abaixo para enviar ao consultor.
                      </span>
                    </div>
                  </div>

                  {/* Quick Reset in Modal */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={resetNewPasswords[selectedLead.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResetNewPasswords(prev => ({ ...prev, [selectedLead.id]: val }));
                        }}
                        placeholder="Digitar ou gerar nova senha ->"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const gen = generateClientPassword();
                          setResetNewPasswords(prev => ({ ...prev, [selectedLead.id]: gen }));
                        }}
                        className="absolute right-1 top-1 px-2 py-0.5 bg-white/75 backdrop-blur-xl hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 cursor-pointer"
                      >
                        🎲 Gerar
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdminResetClientPassword(selectedLead)}
                      disabled={savingResetLeadId === selectedLead.id}
                      className="px-3.5 py-1.5 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{selectedLead.solicitacaoResetSenha?.pendente ? "Atender Reset & Enviar WhatsApp" : "Redefinir & Enviar ao Consultor"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Gestão de Sub-etapas do Passo 6 (Melhoria do Perfil de Crédito) */}
              <div className="bg-emerald-50/40 border border-emerald-200 p-5 rounded-2xl space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-emerald-300/30 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-700" />
                    <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wider font-display">
                      Sub-etapas do Passo 6: Melhoria do Perfil de Crédito (ADM)
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase">
                    Gestão Administrativa
                  </span>
                </div>

                {(selectedLead.etapa === 6 || selectedLead.etapa >= 6) ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Defina e marque a conclusão das sub-etapas do Passo 6. As alterações serão refletidas em tempo real no link de acompanhamento do cliente.
                      </p>
                      {/* Resumo da Regra de Comissionamento Estruturação */}
                      {(() => {
                        const directPartner = partners.find(p => p.id === selectedLead.parceiroId);
                        const partnerPlan = directPartner?.plano || selectedLead.parceiroPlano || "Executive Partner PROSFEC";
                        const hasParentMaster = !!(directPartner?.parentPartnerId || selectedLead.parentPartnerId);
                        const isDirectMaster = isFranquiaDigital(partnerPlan);
                        const sample = calculateMultilevelCommission(1000, {
                          consultantPlan: partnerPlan,
                          hasMasterParent: hasParentMaster,
                          isDirectMaster
                        });
                        return (
                          <div className="text-[11px] font-bold text-emerald-900 bg-emerald-100/70 border border-emerald-300/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs" title={sample.splitDescription}>
                            <span>💎 <strong>Regra de Repasse (Teto 30%):</strong> {sample.splitDescription}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {editingSubEtapasPasso6.length === 0 ? (
                      <div className="text-center py-6 px-4 bg-white/75 backdrop-blur-xl rounded-xl border border-dashed border-slate-200 space-y-2">
                        <p className="text-xs font-bold text-slate-600">
                          Nenhuma sub-etapa configurada para o Passo 6 deste lead ainda.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          As sub-etapas são sincronizadas automaticamente com os Serviços Recomendados do Diagnóstico (Passo 3) ou você pode adicionar uma sub-etapa manual abaixo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {editingSubEtapasPasso6.map((sub: any, idx: number) => {
                          const isPaid = sub.statusPagamento === "pago" || sub.pago === true;
                          return (
                            <div key={sub.id || idx} className="flex flex-wrap items-center justify-between gap-2.5 bg-white/75 backdrop-blur-xl p-3 rounded-xl border border-slate-200 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                              <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                                <input
                                  type="checkbox"
                                  checked={sub.concluida}
                                  onChange={(e) => {
                                    const updated = [...editingSubEtapasPasso6];
                                    updated[idx] = { ...updated[idx], concluida: e.target.checked };
                                    setEditingSubEtapasPasso6(updated);
                                  }}
                                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                                />
                                <input
                                  type="text"
                                  value={sub.titulo}
                                  onChange={(e) => {
                                    const updated = [...editingSubEtapasPasso6];
                                    updated[idx] = { ...updated[idx], titulo: e.target.value };
                                    setEditingSubEtapasPasso6(updated);
                                  }}
                                  className={`flex-1 text-xs font-semibold px-2 py-1 rounded border border-transparent focus:border-slate-300 focus:bg-slate-50 outline-none ${
                                    sub.concluida ? "line-through text-slate-400" : "text-slate-800"
                                  }`}
                                />
                                {sub.preco ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[11px] font-mono font-extrabold text-[#0A3D2E] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 shrink-0">
                                      {formatCurrencyBRL(sub.preco)}
                                    </span>
                                    {(() => {
                                      const directPartner = partners.find(p => p.id === selectedLead.parceiroId);
                                      const partnerPlan = directPartner?.plano || selectedLead.parceiroPlano || "Executive Partner PROSFEC";
                                      const hasParentMaster = !!(directPartner?.parentPartnerId || selectedLead.parentPartnerId);
                                      const isDirectMaster = isFranquiaDigital(partnerPlan);
                                      const breakdown = calculateMultilevelCommission(sub.preco, {
                                        consultantPlan: partnerPlan,
                                        hasMasterParent: hasParentMaster,
                                        isDirectMaster
                                      });

                                      return (
                                        <span
                                          className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                          title={breakdown.splitDescription}
                                        >
                                          {breakdown.hasHierarchy ? (
                                            <>
                                              <span className="text-emerald-700 font-extrabold">Dir: {formatCurrencyBRL(breakdown.consultantAmount)} ({Math.round(breakdown.consultantRate * 100)}%)</span>
                                              <span className="mx-1 text-slate-300">|</span>
                                              <span className="text-amber-700 font-extrabold">Master: {formatCurrencyBRL(breakdown.masterOverrideAmount)} ({Math.round(breakdown.masterOverrideRate * 100)}%)</span>
                                            </>
                                          ) : (
                                            <span className="text-emerald-700 font-extrabold">Comissão: {formatCurrencyBRL(breakdown.consultantAmount)} ({Math.round(breakdown.consultantRate * 100)}%)</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                ) : null}
                              </div>

                              {/* Botão de Confirmar Pagamento Manual */}
                              <div className="flex items-center gap-2 shrink-0">
                                {(() => {
                                  const isDemand = isDemandAccountingService(sub);
                                  const rawPrice = typeof sub.preco === "number" ? sub.preco : typeof (sub as any).valor === "number" ? (sub as any).valor : parseFloat(sub.preco || (sub as any).valor || 0);
                                  const hasCost = !isNaN(rawPrice) && rawPrice > 0;
                                  const isZeroCost = isServiceWithoutUpfrontCost(sub) || !hasCost;

                                  if (isZeroCost) {
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        {isDemand ? (
                                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold rounded-lg">
                                            📋 Serviços Contratados por demanda
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold rounded-lg">
                                            🎯 Sem Custo Inicial (Remuneração no Êxito)
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }

                                  if (isPaid) {
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        {isDemand && (
                                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold rounded-lg">
                                            📋 Serviços Contratados por demanda
                                          </span>
                                        )}
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold rounded-lg flex items-center gap-1">
                                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                          Pago (Manual ADM)
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => toggleManualPaymentForSubEtapa(idx)}
                                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                          title="Estornar/Voltar para Pendente"
                                        >
                                          Estornar
                                        </button>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center gap-1.5">
                                      {isDemand && (
                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold rounded-lg">
                                          📋 Serviços Contratados por demanda
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => toggleManualPaymentForSubEtapa(idx)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                        title="Confirmar recebimento do pagamento manual via PIX/Transferência para esta sub-etapa"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                                        <span>Confirmar Pagamento Manual</span>
                                      </button>
                                    </div>
                                  );
                                })()}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = editingSubEtapasPasso6.filter((_, i) => i !== idx);
                                    setEditingSubEtapasPasso6(updated);
                                  }}
                                  className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                                  title="Remover sub-etapa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newSub = {
                              id: `sub_custom_${Date.now()}`,
                              titulo: "Nova sub-etapa de melhoria de crédito...",
                              concluida: false
                            };
                            setEditingSubEtapasPasso6([...editingSubEtapasPasso6, newSub]);
                          }}
                          className="px-3 py-1.5 bg-white/75 backdrop-blur-xl border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          Adicionar Sub-etapa
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleUpdateSubEtapasPasso6}
                        disabled={savingSubEtapas}
                        className="px-4 py-2 bg-[#0A3D2E] hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {savingSubEtapas ? (
                          <span>Salvando...</span>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Salvar Sub-etapas do Passo 6</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 p-5 rounded-xl text-center text-slate-500 text-xs font-semibold space-y-1.5">
                    <p className="font-bold text-slate-700 text-sm">🔒 Gestão de Sub-etapas e Pagamento do Passo 6 (Bloqueado)</p>
                    <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                      Esta função de acompanhamento de sub-etapas e confirmação manual de pagamento de serviços é liberada exclusivamente quando o lead avançar para o <strong>Passo 6 (Melhoria do Perfil de Crédito)</strong>, sincronizando os serviços identificados no <strong>Diagnóstico (Passo 3)</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline Card */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6 space-y-4">
                <span className="text-[10px] font-black text-[#0A3D2E] bg-emerald-100 px-2.5 py-1 rounded-md inline-block uppercase tracking-wider font-mono">
                  ⏳ Linha do Tempo (Alterações de Etapas)
                </span>
                <p className="text-[11px] text-slate-500">
                  Histórico completo de transições de etapas deste lead:
                </p>

                {!selectedLead.historicoEtapas || selectedLead.historicoEtapas.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-bold bg-white/75 backdrop-blur-xl rounded-xl border border-dashed border-slate-200">
                    Nenhum registro de alteração de etapa para este lead ainda.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-5">
                    {selectedLead.historicoEtapas.map((hist: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-50 shadow-xs"></div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-emerald-800 bg-emerald-100/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {hist.autor || "Sistema"}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 font-semibold">
                              {new Date(hist.data).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 leading-normal">
                            {hist.detalhes || `Etapa alterada para: ${ETAPAS_LABELS[hist.etapaNova] || hist.etapaNova}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

             {/* Modal Actions Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex flex-wrap gap-2.5 justify-end shrink-0">
              <button 
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Fechar Detalhes
              </button>

              <button
                onClick={() => handleCopyTrackingLink(selectedLead.id)}
                className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer ${
                  copiedLeadId === selectedLead.id 
                    ? "bg-emerald-600 text-white animate-pulse" 
                    : "bg-[#0A3D2E]/10 hover:bg-[#0A3D2E]/20 text-[#0A3D2E]"
                }`}
              >
                <Copy className="w-4 h-4" />
                {copiedLeadId === selectedLead.id ? "Link Copiado!" : "Copiar Link de Acompanhamento"}
              </button>

              <a
                href={`https://api.whatsapp.com/send?phone=${selectedLead.whatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(selectedLead.nome)}!%20Geramos%20o%20seu%20link%20de%20acompanhamento%20exclusivo%20da%20PROSFEC%20para%20a%20sua%20simula%C3%A7%C3%A3o%20Pronampe%202026.%20Acompanhe%20as%20etapas%20de%20libera%C3%A7%C3%A3o%20em%20tempo%20real:%20${encodeURIComponent(getAppDomain() + "?acompanhamento=" + selectedLead.id)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#00A86B] hover:bg-[#00905c] text-white font-extrabold text-sm rounded-lg flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <Phone className="w-4 h-4 fill-current" />
                Enviar Link p/ WhatsApp
              </a>
              
              <a
                href={`https://api.whatsapp.com/send?phone=${selectedLead.whatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(selectedLead.nome)}!%20Sou%20consultor%20da%20PROSFEC.%20Recebi%20seu%20cadastro%20no%20nosso%20Simulador%20Pronampe%20e%20gostaria%20de%20apresentar%20seu%20diagn%C3%B3stico%20de%20cr%C3%A9dito.`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm rounded-lg flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <Phone className="w-4 h-4 fill-current" />
                Iniciar Atendimento WhatsApp
              </a>
            </div>

          </div>
        </div>
      )}

      {/* PARTNER DETAIL MODAL - Caixa Flutuante (Floating Modal) */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-scale-in">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 p-6 bg-slate-50/50 shrink-0">
              <div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Parceiro Comercial
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2 font-display leading-tight">{selectedPartner.nome}</h2>
                <p className="text-xs text-slate-500 mt-1 font-mono">ID do Registro: {selectedPartner.id}</p>
              </div>
              <button 
                onClick={() => setSelectedPartner(null)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Details Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              
              {/* Quick Contact & Status Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 font-bold uppercase">Status da Parceria</p>
                  <select
                    value={selectedPartner.status || "novo"}
                    onChange={(e) => handleUpdateStatus(selectedPartner.id, "parceiros", e.target.value)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-extrabold cursor-pointer focus:outline-hidden ${getStatusBadgeClass(selectedPartner.status)}`}
                  >
                    <option value="novo">Novo</option>
                    <option value="em atendimento">Em Atendimento</option>
                    <option value="parceria ativa">Parceria Ativa</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase">Data de Cadastro</p>
                  <p className="text-sm text-slate-700 font-medium font-mono">{formatDate(selectedPartner.dataCriacao)}</p>
                </div>
              </div>

              {/* Informações Pessoais do Parceiro */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Dados Básicos do Parceiro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Nome Completo</span>
                    <span className="text-sm text-slate-800 font-semibold">{selectedPartner.nome}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">CPF</span>
                    <span className="text-sm text-slate-800 font-mono font-bold">{selectedPartner.cpf || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Data de Nascimento</span>
                    <span className="text-sm text-slate-800 font-semibold">{selectedPartner.dataNascimento || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Cidade / UF</span>
                    <span className="text-sm text-slate-800 font-semibold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedPartner.cidade || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações de Contato e Financeiras */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Contato e Chave PIX (Para pagamento de indicações)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">WhatsApp</span>
                    <a 
                      href={`https://api.whatsapp.com/send?phone=${selectedPartner.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-emerald-600 hover:text-[#25D366] font-bold flex items-center gap-1 inline-block mt-0.5"
                    >
                      <Phone className="w-4 h-4 fill-current" /> {selectedPartner.whatsapp} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">E-mail</span>
                    <a 
                      href={`mailto:${selectedPartner.email}`}
                      className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 inline-block mt-0.5"
                    >
                      <Mail className="w-4 h-4" /> {selectedPartner.email}
                    </a>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-xs text-slate-400 block font-bold">Chave PIX Cadastrada</span>
                    <span className="text-sm text-slate-800 font-mono font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg inline-block mt-1 w-full text-center">
                      {selectedPartner.chavePix || "Não declarada"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plano Selecionado */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Plano de Parceria e Termos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Plano Escolhido</span>
                    <span className="text-lg font-black text-[#0A3D2E] block mt-0.5">
                      {getPlanName(selectedPartner.plano)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">Comissão Estimada por Conversão</span>
                    <span className="text-sm text-slate-800 font-bold block mt-1">
                      {getCommissionDetailText(selectedPartner.plano)}
                    </span>
                  </div>
                  {selectedPartner.parentPartnerNome && (
                    <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4 text-emerald-700 shrink-0 animate-bounce" />
                      <div className="text-left">
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Vendedor Vinculado ao Master Partner</span>
                        <span className="text-xs text-emerald-900 font-bold">
                          Filiado à: <strong className="font-black underline">{selectedPartner.parentPartnerNome}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="text-xs text-slate-400 block font-bold font-semibold">Declaração de Termos Aceitos</span>
                    <span className="text-sm text-emerald-800 font-bold block mt-1 flex items-center gap-1">
                      ✓ Aceitou os termos de compartilhamento e responsabilidade civil em {formatDate(selectedPartner.dataCriacao)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Saldos e Créditos da Conta */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Saldos e Créditos da Conta</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                  <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl text-left">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <Coins className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">Saldo Geral (Consultas &amp; Serviços)</span>
                    </div>
                    <span className="text-2xl font-black font-mono text-emerald-950 block mt-1.5">
                      {formatCurrencyBRL(
                        selectedPartner.saldoGeral !== undefined
                          ? Number(selectedPartner.saldoGeral)
                          : (selectedPartner.saldoConsultas !== undefined ? Number(selectedPartner.saldoConsultas) : 0)
                      )}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                      Válido para consultas SPC/Serasa e serviços contábeis
                    </span>
                  </div>

                  <div className="bg-teal-50/60 border border-teal-100 p-3.5 rounded-xl text-left">
                    <div className="flex items-center gap-2 text-teal-800">
                      <Search className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">Saldo Caça Leads (buscas)</span>
                    </div>
                    <span className="text-2xl font-black font-mono text-teal-950 block mt-1.5">
                      {selectedPartner.cacaLeadsCredits || 0}{" "}
                      <span className="text-xs font-bold font-sans uppercase text-teal-700">buscas</span>
                    </span>
                    <span className="text-[10px] text-teal-700 font-medium block mt-0.5">
                      Créditos de prospecção e busca de empresas em tempo real
                    </span>
                  </div>
                </div>
              </div>

              {/* Se for Franquia Digital, mostrar equipe e override */}
              {(() => {
                const isFranquia = selectedPartner.plano?.toUpperCase().includes("FRANQUIA") || selectedPartner.plano?.toUpperCase().includes("DIGITAL") || selectedPartner.plano?.toUpperCase().includes("MASTER") || selectedPartner.plano?.toUpperCase() === "PLATINUM";
                if (!isFranquia) return null;

                const teamMembers = partners.filter(p => 
                  p.parentPartnerId === selectedPartner.id && 
                  (p.isTeamMember === true || (p.plano && (p.plano.toUpperCase().includes("CONSULTOR") || p.plano.toUpperCase().includes("EQUIPE"))))
                );
                const teamLeads = leads.filter(l => teamMembers.some(m => m.id === l.parceiroId));
                
                const concludedTeamLeads = teamLeads.filter(l => l.status === "concluido");
                const totalConcludedTeamSales = concludedTeamLeads.reduce((acc, l) => acc + (l.limiteEstimado || 0), 0);
                
                // Dynamic override calculation
                const totalOverrideEarned = concludedTeamLeads.reduce((acc, l) => {
                  const m = teamMembers.find(member => member.id === l.parceiroId);
                  const isExecutive = m?.plano?.toUpperCase().includes("EXEC");
                  const overrideMultiplier = isExecutive ? 0.015 : 0.025;
                  return acc + ((l.limiteEstimado || 0) * overrideMultiplier);
                }, 0);

                return (
                  <div className="space-y-3 bg-[#0A3D2E]/5 border border-[#0A3D2E]/10 p-5 rounded-2xl text-left">
                    <div className="flex items-center justify-between border-b border-emerald-850/10 pb-2">
                      <div className="flex items-center gap-1.5 text-[#0A3D2E]">
                        <Users className="w-4.5 h-4.5" />
                        <h4 className="text-xs font-black uppercase tracking-wider font-display">Gestão de Equipe (Master Partner)</h4>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                        {teamMembers.length} Consultor(es)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-xs">
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Faturamento da Equipe (Concluído)</span>
                        <span className="text-sm font-black text-slate-800 block mt-0.5">
                          {formatCurrencyBRL(totalConcludedTeamSales)}
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-0.5">Total de {teamLeads.length} leads indicados</span>
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/15 p-3 rounded-xl shadow-xs">
                        <span className="text-[9px] text-amber-700 uppercase font-black block">Override da Equipe Dinâmico</span>
                        <span className="text-sm font-black text-amber-700 block mt-0.5">
                          {formatCurrencyBRL(totalOverrideEarned)}
                        </span>
                        <span className="text-[8px] text-amber-600 block mt-0.5">Ganhos indiretos a pagar</span>
                      </div>
                    </div>

                    {teamMembers.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[9px] text-slate-400 uppercase font-black block mb-1.5">Membros da Equipe</span>
                        <div className="max-h-40 overflow-y-auto border border-slate-150 rounded-lg bg-white divide-y divide-slate-100">
                          {teamMembers.map(member => {
                            const memberLeadsCount = teamLeads.filter(l => l.parceiroId === member.id).length;
                            const memberConcluded = teamLeads.filter(l => l.parceiroId === member.id && l.status === "concluido");
                            const memberConcludedValue = memberConcluded.reduce((acc, l) => acc + (l.limiteEstimado || 0), 0);
                            const isExec = member.plano?.toUpperCase().includes("EXEC");
                            
                            const lastActiveStr = member.dataUltimoAcesso || member.dataCriacao;
                            let diffDays = 0;
                            if (lastActiveStr) {
                              diffDays = Math.floor((Date.now() - new Date(lastActiveStr).getTime()) / (1000 * 60 * 60 * 24));
                            }
                            const isInactive = member.status === "inativo" || diffDays >= 3;

                            return (
                              <div key={member.id} className={`p-2.5 flex justify-between items-center text-xs transition-all ${isInactive ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-slate-50"}`}>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 block">{member.nome}</span>
                                    <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded border ${
                                      isInactive
                                        ? "bg-rose-100 text-rose-800 border-rose-200"
                                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    }`}>
                                      {isInactive ? `Inativo (${diffDays}d sem uso)` : "Ativo"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-purple-700 font-bold bg-purple-50 border border-purple-100/50 px-1.5 py-0.2 rounded">
                                      {isExec ? "Executive (1.5%)" : "Starter (0.5%)"}
                                    </span>
                                    <span className="text-[9px] text-slate-500">{member.whatsapp}</span>
                                    {lastActiveStr && (
                                      <span className="text-[8.5px] text-slate-400 font-mono">
                                        Último: {new Date(lastActiveStr).toLocaleDateString("pt-BR")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <div>
                                    <span className="font-bold text-slate-700 block">{memberLeadsCount} Leads</span>
                                    <span className="text-[9px] text-emerald-700 font-bold block">{formatCurrencyBRL(memberConcludedValue)} concluído</span>
                                  </div>
                                  {isInactive && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const nowIso = new Date().toISOString();
                                          await updateDoc(doc(db, "parceiros", member.id), {
                                            status: "ativo",
                                            inativoPorInatividade: false,
                                            motivoInativacao: null,
                                            dataUltimoAcesso: nowIso,
                                            dataReativacao: nowIso
                                          });
                                          setPartners(prev => prev.map(p => p.id === member.id ? {
                                            ...p,
                                            status: "ativo",
                                            inativoPorInatividade: false,
                                            motivoInativacao: undefined,
                                            dataUltimoAcesso: nowIso,
                                            dataReativacao: nowIso
                                          } : p));
                                        } catch (e) {
                                          console.error("Error reactivating member from admin:", e);
                                        }
                                      }}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[9px] font-bold transition-all cursor-pointer shrink-0"
                                      title="Reativar acesso do consultor e zerar 3 dias"
                                    >
                                      Reativar
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Controle de Acesso do Parceiro (Status e Teste Grátis) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>🔐 Controle de Acesso do Parceiro</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">Gestão Anual (Hubla) & Teste Grátis</span>
                </h4>
                <div className="border border-slate-100 p-4 rounded-xl bg-white shadow-xs space-y-4">
                  {(() => {
                    const sub = getSubscriptionStatus(selectedPartner);
                    const planName = getPlanName(selectedPartner.plano);
                    const commissionText = getCommissionRateText(selectedPartner.plano);
                    const isManualBlocked = selectedPartner.statusManual === "bloqueado" || selectedPartner.status === "bloqueado";

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-slate-400 block font-bold">Data de Cadastro / Início</span>
                            <span className="text-sm text-slate-800 font-semibold font-mono">
                              {formatDate(selectedPartner.dataCriacao)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400 block font-bold">Situação de Acesso</span>
                            <span className="text-sm text-slate-800 font-semibold font-mono flex items-center gap-1.5 mt-0.5">
                              {isManualBlocked ? (
                                <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                                  <UserX className="w-3.5 h-3.5 text-rose-600" />
                                  Acesso Bloqueado
                                </span>
                              ) : sub.status === "vencida" ? (
                                <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                                  {sub.isTrial ? "Trial Vencido (Expirado)" : "Licença Anual Vencida"}
                                </span>
                              ) : sub.isTrial ? (
                                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  Teste Grátis Ativo ({sub.daysLeft}d restantes)
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  Acesso Liberado ({sub.daysLeft}d restantes - até {sub.formattedExpiry})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Quick action buttons for Activation / Blocking */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2 flex-wrap">
                          {isManualBlocked || sub.status === "vencida" ? (
                            <button
                              onClick={() => handleTogglePartnerStatus(selectedPartner, "ativo")}
                              className="w-full sm:flex-1 py-2.5 px-4 bg-[#00A86B] hover:bg-[#008f5a] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-98"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>Ativar / Liberar Acesso do Parceiro (1 Ano)</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRenewSubscription(selectedPartner.id)}
                                className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                              >
                                <Clock className="w-4 h-4 text-emerald-600" />
                                <span>Renovar Licença (+1 Ano)</span>
                              </button>
                              <button
                                onClick={() => handleTogglePartnerStatus(selectedPartner, "bloqueado")}
                                className="w-full sm:w-auto py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-98"
                              >
                                <UserX className="w-4 h-4" />
                                <span>Bloquear Acesso</span>
                              </button>
                            </>
                          )}

                          <a
                            href={`https://api.whatsapp.com/send?phone=${selectedPartner.whatsapp.replace(/\D/g, "")}&text=${encodeURIComponent(`Olá ${selectedPartner.nome}! Tudo bem? Gostaria de conversar referente ao seu acesso e parceria na PROSFEC.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto py-2.5 px-4 border border-slate-200 hover:border-[#25D366] text-slate-700 hover:text-[#20ba5a] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span>Contato WhatsApp</span>
                          </a>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Referred Leads by this Partner & Team Operation */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4.5 h-4.5 text-[#00A86B]" /> 🏆 Painel Operacional de Leads (Parceiro & Vendedores)
                </h4>
                <div className="border border-slate-150 p-4 rounded-xl bg-white shadow-xs space-y-3">
                  {(() => {
                    const isFranquia = selectedPartner.plano?.toUpperCase().includes("FRANQUIA") || selectedPartner.plano?.toUpperCase().includes("DIGITAL") || selectedPartner.plano?.toUpperCase().includes("MASTER") || selectedPartner.plano?.toUpperCase() === "PLATINUM";
                    const teamMembers = partners.filter(p => p.parentPartnerId === selectedPartner.id);
                    const directLeads = leads.filter(l => l.parceiroId === selectedPartner.id);
                    const teamLeads = leads.filter(l => teamMembers.some(m => m.id === l.parceiroId));
                    
                    const combinedLeads = [
                      ...directLeads.map(l => ({ ...l, originType: "Direto" as const, originName: selectedPartner.nome })),
                      ...teamLeads.map(l => {
                        const member = teamMembers.find(m => m.id === l.parceiroId);
                        return { ...l, originType: "Equipe" as const, originName: member ? member.nome : "Vendedor" };
                      })
                    ];

                    if (combinedLeads.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 text-center py-6 font-medium">
                          Nenhum lead registrado por este parceiro ou equipe até o momento.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <p className="text-xs text-slate-600 font-extrabold">Total de {combinedLeads.length} lead(s) na operação:</p>
                          {isFranquia && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                              Equipe de Vendas: {teamMembers.length} consultores
                            </span>
                          )}
                        </div>
                        <div className="space-y-3 divide-y divide-slate-100 pt-1">
                          {combinedLeads.map((lead, idx) => {
                            const hasPendency = lead.pendente === true || lead.pendencias?.status === "pendente";
                            
                            return (
                              <div key={lead.id} className={`pt-3 first:pt-0 pb-3 flex flex-col gap-3 text-left ${idx > 0 ? "border-t border-slate-100" : ""}`}>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-slate-950 text-sm">{lead.nome}</span>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        lead.originType === "Direto" 
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                                          : "bg-indigo-50 text-indigo-800 border border-indigo-100"
                                      }`}>
                                        {lead.originType === "Direto" ? "Indicação Direta" : `Vendedor: ${lead.originName}`}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">{lead.razaoSocial || "Razão Social não informada"} • CNPJ: {lead.cnpj || "-"}</p>
                                  </div>

                                  <div className="text-left sm:text-right shrink-0">
                                    <p className="font-extrabold text-[#00A86B] text-sm">
                                      {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Sob Consulta"}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold">Faturamento: {lead.faturamentoAnual ? formatCurrencyBRL(lead.faturamentoAnual) : "-"}</p>
                                  </div>
                                </div>

                                {/* Controller Section: Interactive Etapa and Status */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Etapa do Funil</label>
                                    <select
                                      value={lead.etapa}
                                      onChange={(e) => handleUpdateEtapa(lead.id, Number(e.target.value))}
                                      className="w-full py-1 px-2 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 cursor-pointer focus:border-[#00A86B] focus:outline-hidden"
                                    >
                                      <option value="1">1. Dados cadastrais CNPJ</option>
                                      <option value="2">2. Coleta de dados dos Sócios</option>
                                      <option value="3">3. Consulta Diagnóstica</option>
                                      <option value="4">4. Assinatura Eletrônica</option>
                                      <option value="5">5. Recolhimento Senhas</option>
                                      <option value="6">6. Estruturação</option>
                                      <option value="7">7. Operação Apta</option>
                                      <option value="8">8. Crédito Aprovado/Recusado</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Status Interno</label>
                                    <select
                                      value={lead.status}
                                      onChange={(e) => handleUpdateStatus(lead.id, "leads", e.target.value)}
                                      className="w-full py-1 px-2 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 cursor-pointer focus:border-[#00A86B] focus:outline-hidden"
                                    >
                                      <option value="novo">Novo</option>
                                      <option value="em atendimento">Em Atendimento</option>
                                      <option value="concluido">Concluído</option>
                                      <option value="arquivado">Arquivado</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Display and Resolve Pendency Controller */}
                                {hasPendency && (
                                  <div className="bg-amber-500/5 border border-amber-200 p-2.5 rounded-lg space-y-1.5">
                                    <p className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      Pendência Ativa Cadastrada:
                                    </p>
                                    <p className="text-slate-800 font-bold text-[11px]">"{lead.pendenciaDescricao}"</p>
                                    
                                    {lead.pendencias?.resposta ? (
                                      <div className="bg-white p-2 rounded border border-amber-100 text-[11px]">
                                        <p className="text-[9px] font-black text-emerald-800 uppercase">💬 Resposta enviada pelo parceiro:</p>
                                        <p className="text-slate-700 italic mt-0.5">"{lead.pendencias.resposta}"</p>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-amber-600 italic">Aguardando resposta do parceiro no portal...</p>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePendencias(lead.id, "resolvida", lead.pendenciaDescricao || "")}
                                      className="py-1 px-2.5 bg-emerald-600 hover:bg-[#00A86B] text-white font-extrabold rounded text-[10px] shadow-2xs cursor-pointer inline-flex items-center gap-1 transition-colors"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Marcar Pendência como Resolvida
                                    </button>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 justify-end mt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLead(lead);
                                    }}
                                    className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all border border-slate-250/30"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    Visualizar Ficha Completa do Lead
                                  </button>

                                  <a
                                    href={`https://api.whatsapp.com/send?phone=${lead.whatsapp?.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-1 px-2.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#20ba5a] hover:text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all border border-[#25D366]/20"
                                  >
                                    <Phone className="w-3.5 h-3.5 fill-current" />
                                    Falar com o Cliente no WhatsApp
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3 justify-end shrink-0">
              <button 
                onClick={() => setSelectedPartner(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Fechar Detalhes
              </button>
              
              <a
                href={`https://api.whatsapp.com/send?phone=${selectedPartner.whatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(selectedPartner.nome)}!%20Sou%20respons%C3%A1vel%20pelo%20Programa%20de%20Parceiros%20da%20PROSFEC.%20Gostaria%20de%20dar%20as%20boas%20vindas%20e%20explicar%20os%20pr%C3%B3ximos%20passos%20do%20seu%20cadastro.`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm rounded-lg flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <Phone className="w-4 h-4 fill-current" />
                Chamar Parceiro WhatsApp
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ANNOUNCEMENT CREATE / EDIT MODAL */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden max-h-[90vh] animate-scale-up">
            
            {/* Form Column */}
            <form onSubmit={handleSaveAnnouncement} className="flex-1 p-6 overflow-y-auto space-y-4 border-r border-slate-100">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {editingAnnouncement ? "Editar Comunicado" : "Novo Comunicado"}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Defina as informações e imagens da campanha</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Models / Presets Quick Selection */}
              {!editingAnnouncement && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                  <p className="text-[11px] font-bold text-indigo-800 mb-2 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5" />
                    Modelos Rápidos (Prefill):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ANNOUNCEMENT_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2.5 py-1 bg-white/75 backdrop-blur-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 rounded-lg text-[10px] font-bold transition-all shadow-2xs hover:border-indigo-300 cursor-pointer"
                      >
                        {preset.titulo.split(" ")[0]} - {preset.titulo.split(" ").slice(1, 3).join(" ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título do Comunicado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Super Campanha de Indicação Pronampe"
                  value={annTitulo}
                  onChange={(e) => setAnnTitulo(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl text-slate-800 transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mensagem do Comunicado *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreva a mensagem detalhada que o parceiro irá visualizar. Dica: você pode pular linhas para organizar o texto."
                  value={annMensagem}
                  onChange={(e) => setAnnMensagem(e.target.value)}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl text-slate-800 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Image URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL da Imagem de Campanha (opcional)</label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/banner.jpg"
                    value={annImagemUrl}
                    onChange={(e) => setAnnImagemUrl(e.target.value)}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl text-slate-800 transition-all font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Use uma URL pública de imagem JPG/PNG.</span>
                </div>

                {/* Target Plan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Público-Alvo (Plano)</label>
                  <select
                    value={annPublicoAlvo}
                    onChange={(e) => setAnnPublicoAlvo(e.target.value as any)}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl text-slate-800 transition-all"
                  >
                    <option value="todos">Todos os Parceiros</option>
                    <option value="executive">Apenas Executive Partners</option>
                    <option value="franquia">Apenas Master Partners / Gestores</option>
                    <option value="agent">Apenas Parceiros Isentos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Link URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link do Botão de Ação (opcional)</label>
                  <input
                    type="url"
                    placeholder="https://t.me/seu_grupo"
                    value={annLinkUrl}
                    onChange={(e) => setAnnLinkUrl(e.target.value)}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl text-slate-800 transition-all font-mono"
                  />
                </div>

                {/* Link Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Texto do Botão de Ação</label>
                  <input
                    type="text"
                    placeholder="Ex: Acessar Grupo Telegram"
                    value={annLinkTexto}
                    onChange={(e) => setAnnLinkTexto(e.target.value)}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl text-slate-800 transition-all"
                  />
                </div>
              </div>

              {/* Ativo Status Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="annAtivo"
                  checked={annAtivo}
                  onChange={(e) => setAnnAtivo(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="annAtivo" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Exibir imediatamente para o público-alvo (Ativo)
                </label>
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAnnouncement}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {savingAnnouncement ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Comunicado"
                  )}
                </button>
              </div>
            </form>

            {/* Live Preview Column */}
            <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col justify-between overflow-y-auto max-h-[40vh] md:max-h-none">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-4">
                  Visualização em Tempo Real (Portal do Parceiro)
                </span>

                <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {annImagemUrl ? (
                    <div className="h-32 bg-slate-100 overflow-hidden relative">
                      <img
                        src={annImagemUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-24 bg-indigo-50 flex items-center justify-center text-indigo-400">
                      <Megaphone className="w-10 h-10" />
                    </div>
                  )}

                  <div className="p-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        {annPublicoAlvo === "todos" ? "Todos os Planos" : annPublicoAlvo === "executive" ? "Executive Partner" : annPublicoAlvo === "franquia" ? "Master Partner" : "Isento"}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-xs line-clamp-1">
                      {annTitulo || "Título de Exemplo"}
                    </h4>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {annMensagem || "Digite a mensagem para ver a prévia..."}
                    </p>

                    {annLinkUrl && (
                      <button
                        type="button"
                        className="w-full mt-3.5 py-2 px-3 bg-indigo-600 text-white rounded-lg text-xs font-bold text-center block"
                      >
                        {annLinkTexto || "Botão de Ação"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 mt-6 pt-3 border-t border-slate-200 font-medium leading-relaxed">
                ℹ️ Este comunicado aparecerá em destaque na tela inicial do parceiro logo após ele entrar no sistema.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE DIRECIOMANENTO DE LEAD PARA PARCEIRO MASTER */}
      {assigningLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Direcionar Lead para Parceiro Master
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vincule este lead a um Parceiro Master para atendimento dedicado.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningLead(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Empresa / Razão:</span>
                <span className="font-bold text-slate-800">{assigningLead.razaoSocial || assigningLead.nome}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">CNPJ:</span>
                <span className="font-mono text-slate-700">{assigningLead.cnpj || "Não informado"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Contato / Cidade:</span>
                <span className="text-slate-700">{assigningLead.nome} ({assigningLead.cidade || "N/I"})</span>
              </div>
              {assigningLead.parceiroId && (
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-200/80 mt-1">
                  <span className="text-amber-700 font-bold">Atualmente vinculado a:</span>
                  <span className="font-bold text-amber-900">
                    {assigningLead.parceiroNome || partners.find(p => p.id === assigningLead.parceiroId)?.nome || "Parceiro"}
                  </span>
                </div>
              )}
            </div>

            {/* Select Master Partner */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Selecione o Parceiro Master Responsável
              </label>
              {masterPartners.length === 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 text-xs font-medium">
                  Nenhum parceiro com plano Master (Franquia / Digital / Master) encontrado no sistema.
                </div>
              ) : (
                <select
                  value={selectedMasterPartnerId}
                  onChange={(e) => setSelectedMasterPartnerId(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00A86B]"
                >
                  <option value="">-- Selecione um Parceiro Master --</option>
                  {masterPartners.map((master) => (
                    <option key={master.id} value={master.id}>
                      {master.nome} ({master.cidade || "Sem Cidade"}) - {master.whatsapp || master.email}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-400 italic">
                * Apenas parceiros cadastrados com plano Master / Franquia listados acima receberão este lead no portal.
              </p>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssigningLead(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignMaster}
                disabled={!selectedMasterPartnerId || isAssigningMaster || masterPartners.length === 0}
                className="px-5 py-2 text-xs font-extrabold text-white bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isAssigningMaster ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Confirmar Direcionamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Workspace Modal for Credit Queries and IA Diagnosis */}
      {workspaceLead && (
        <LeadWorkspaceModal
          lead={workspaceLead}
          isAdmin={true}
          onClose={() => setWorkspaceLead(null)}
          onLeadUpdated={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            if (selectedLead?.id === updated.id) {
              setSelectedLead(updated);
            }
            setWorkspaceLead(updated);
          }}
        />
      )}

    </div>
  );
}
