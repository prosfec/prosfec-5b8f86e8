// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  getDoc,
  onSnapshot,
  arrayUnion
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, createNotification } from "../firebase";
import { formatCurrencyBRL, triggerWebhookSimulation, validateCNPJ, validateCPF, validatePhone, getAppDomain } from "../utils";
import { TermosDeUsoContent } from "./TermosDeUsoContent";
import LeadRegisterForm from "./LeadRegisterForm";
import Simulador from "./Simulador";
import { LeadData, SimulationResult, SolicitacaoComissao } from "../types";
import { executarAnaliseRiscoPreliminar } from "../App";
import LeadWorkspaceModal from "./LeadWorkspaceModal";
import LeadStepTimeline from "./LeadStepTimeline";
import { calculateLeadStepStatus } from "../utils/stepValidation";
import { TeamPerformanceChart } from "./TeamPerformanceChart";
import PartnerServicosContabilidadeTab from "./PartnerServicosContabilidadeTab";
import { sanitizeAndSyncServicosList, ServiceCatalogItem, DEFAULT_SERVICES_CATALOG } from "../utils/serviceUtils";
import { 
  Handshake, 
  Copy, 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  TrendingUp, 
  DollarSign, 
  Calculator, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  Users,
  MapPin, 
  Calendar, 
  Key, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Briefcase,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Coins,
  Plus,
  X,
  Search,
  Filter,
  Clock,
  Send,
  Megaphone,
  Bell,
  AlertTriangle,
  Link,
  Save,
  List,
  Kanban,
  Sparkles,
  Bot,
  Loader2,
  CheckSquare,
  Square,
  MessageSquare,
  Trash2,
  ArrowRightLeft,
  UserPlus,
  History,
  RotateCcw,
  Receipt,
  CreditCard,
  ArrowUpRight,
  Wallet,
  XCircle,
  ArrowLeft,
  ArrowRight,
  QrCode
} from "lucide-react";

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

interface CacaLeadsSearchHistoryItem {
  id: string;
  partnerId: string;
  keyword: string;
  city: string;
  state?: string;
  limit: number;
  totalResults: number;
  timestamp: string;
  results: any[];
  nextPageToken?: string | null;
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
  parceiroId?: string;
  socios?: any[];
  enderecoSocioPrincipal?: any;
  nivelPreparacao?: string;
  pendente?: boolean;
  pendenciaDescricao?: string;
  pendencias?: {
    mensagem: string;
    status: 'pendente' | 'resolvida';
    resposta?: string;
  } | null;
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
  cpf?: string;
  cnpj?: string;
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
  hotmartLink?: string;
  hotmartCode?: string;
  hublaCodeStarter?: string;
  hublaCodeExecutive?: string;
  hublaCodeMaster?: string;
}

export const getInactivityDetails = (partner: {
  dataUltimoAcesso?: string;
  dataCriacao?: string;
  status?: string;
  inativoPorInatividade?: boolean;
  motivoInativacao?: string;
  parentPartnerId?: string;
  isTeamMember?: boolean;
  plano?: string;
}) => {
  const isConsultant = !!partner.parentPartnerId || partner.isTeamMember === true || (partner.plano && (partner.plano.toUpperCase().includes("CONSULTOR") || partner.plano.toUpperCase().includes("EQUIPE")));
  const lastActiveStr = partner.dataUltimoAcesso || partner.dataCriacao;
  
  if (!lastActiveStr) {
    return {
      isConsultant,
      isInactiveByTime: false,
      diffDays: 0,
      diffHours: 0,
      formattedLastAccess: "Sem registro",
      timeSinceLabel: "Nunca acessou"
    };
  }

  const lastActive = new Date(lastActiveStr).getTime();
  const now = new Date().getTime();
  const diffMs = Math.max(0, now - lastActive);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let timeSinceLabel = "Hoje";
  if (diffHours < 1) {
    timeSinceLabel = "Agora há pouco";
  } else if (diffHours < 24) {
    timeSinceLabel = `Há ${diffHours}h`;
  } else if (diffDays === 1) {
    timeSinceLabel = "Ontem";
  } else {
    timeSinceLabel = `Há ${diffDays} dias`;
  }

  const isInactiveByTime = isConsultant && (diffDays >= 3 || diffHours >= 72);

  const dateObj = new Date(lastActiveStr);
  const formattedLastAccess = !isNaN(dateObj.getTime())
    ? `${dateObj.toLocaleDateString("pt-BR")} às ${dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "-";

  return {
    isConsultant,
    isInactiveByTime,
    diffDays,
    diffHours,
    formattedLastAccess,
    timeSinceLabel
  };
};

export interface SystemNotification {
  id: string;
  recipientId: string;
  recipientType: "parceiro" | "lead";
  titulo: string;
  mensagem: string;
  tipo: "info" | "success" | "warning" | "error";
  lida: boolean;
  dataCriacao: string;
  link?: string;
}


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

const getSubscriptionStatus = (partner: Partner) => {
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
  
  const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryReset = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  
  const diffTime = expiryReset.getTime() - todayReset.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  let status: "ativa" | "vencendo" | "vencida" = "ativa";
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

const BRAZIL_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" }
];

const CITIES_BY_STATE: Record<string, string[]> = {
  AC: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Tarauacá", "Feijó"],
  AL: ["Maceió", "Arapiraca", "Rio Largo", "Palmeira dos Índios", "União dos Palmares", "Penedo"],
  AM: ["Manaus", "Parintins", "Itacoatiara", "Manacapuru", "Coari", "Tefé"],
  AP: ["Macapá", "Santana", "Laranjal do Jari", "Oiapoque"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Juazeiro", "Itabuna", "Lauro de Freitas", "Ilhéus", "Jequié", "Teixeira de Freitas", "Barreiras", "Porto Seguro", "Simões Filho"],
  CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral", "Crato", "Itapipoca", "Maranguape", "Iguatu"],
  DF: ["Brasília", "Ceilândia", "Taguatinga", "Samambaia", "Planaltina", "Águas Claras", "Guará", "Gama"],
  ES: ["Serra", "Vila Velha", "Cariacica", "Vitória", "Cachoeiro de Itapemirim", "Linhares", "Colatina", "Guarapari"],
  GO: ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde", "Luziânia", "Águas Lindas de Goiás", "Valparaíso de Goiás", "Trindade", "Itumbiara", "Catalão", "Senador Canedo"],
  MA: ["São Luís", "Imperatriz", "São José de Ribamar", "Timon", "Caxias", "Codó", "Paço do Lumiar", "Açailândia", "Bacabal"],
  MG: ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros", "Ribeirão das Neves", "Uberaba", "Governador Valadares", "Ipatinga", "Sete Lagoas", "Divinópolis", "Santa Luzia", "Poços de Caldas", "Ibirité", "Patos de Minas", "Pouso Alegre"],
  MS: ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá", "Ponta Porã"],
  MT: ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Tangará da Serra", "Sorriso", "Primavera do Leste", "Barra do Garças"],
  PA: ["Belém", "Ananindeua", "Santarém", "Marabá", "Parauapebas", "Castanhal", "Abaetetuba", "Cametá", "Marituba", "Altamira", "Tucuruí"],
  PB: ["João Pessoa", "Campina Grande", "Santa Rita", "Patos", "Bayeux", "Sousa", "Cajazeiras"],
  PE: ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina", "Paulista", "Cabo de Santo Agostinho", "Camaragibe", "Garanhuns", "Vitória de Santo Antão"],
  PI: ["Teresina", "Parnaíba", "Picos", "Floriano", "Piripiri"],
  PR: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais", "Foz do Iguaçu", "Colombo", "Guarapuava", "Paranaguá", "Apucarana", "Toledo", "Pinhais", "Campo Largo", "Arapongas"],
  RJ: ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói", "Campos dos Goytacazes", "Belford Roxo", "São João de Meriti", "Petrópolis", "Volta Redonda", "Macaé", "Magé", "Itaboraí", "Cabo Frio", "Angra dos Reis", "Nova Friburgo", "Barra Mansa", "Teresópolis", "Mesquita"],
  RN: ["Natal", "Mossoró", "Parnamirim", "Caicó", "Macaíba", "Ceará-Mirim"],
  RO: ["Porto Velho", "Ji-Paraná", "Ariquemes", "Cacoal", "Vilhena"],
  RR: ["Boa Vista", "Rorainópolis", "Caracaraí"],
  RS: ["Porto Alegre", "Caxias do Sul", "Canoas", "Pelotas", "Santa Maria", "Gravataí", "Viamão", "Novo Hamburgo", "São Leopoldo", "Rio Grande", "Alvorada", "Passo Fundo", "Santa Cruz do Sul", "Erechim", "Uruguaiana", "Bento Gonçalves", "Bagé"],
  SC: ["Joinville", "Florianópolis", "Blumenau", "São José", "Chapecó", "Itajaí", "Criciúma", "Jaraguá do Sul", "Lages", "Palhoça", "Balneário Camboriú", "Brusque", "Tubarão"],
  SE: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto", "Itabaiana", "Estância"],
  SP: ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "São José dos Campos", "Osasco", "Ribeirão Preto", "Sorocaba", "Mauá", "São José do Rio Preto", "Mogi das Cruzes", "Santos", "Diadema", "Jundiaí", "Piracicaba", "Carapicuíba", "Bauru", "Itaquaquecetuba", "São Vicente", "Franca", "Praia Grande", "Guarujá", "Taubaté", "Limeira", "Suzano", "Taboão da Serra", "Sumaré", "Barueri", "Embu das Artes", "Indaiatuba", "Cotia", "Americana", "Jacareí", "Itapevi", "Araraquara", "Hortolândia", "Presidente Prudente", "São Carlos"],
  TO: ["Palmas", "Araguaína", "Gurupi", "Porto Nacional"]
};


const executeCacaLeadsClientSide = async (keyword: string, city: string, limit: number, pageToken?: string) => {
  const queryStr = `${keyword} em ${city}`;
  console.log(`Executing client-side Google Places API search for: "${queryStr}"`);

  const payload: any = {
    textQuery: queryStr,
    pageSize: Math.min(20, limit)
  };
  if (pageToken) payload.pageToken = pageToken;

  // Proxy no servidor: a chave do Google Places nunca é exposta no navegador.
  const response = await fetch("/api/proxy/places-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Erro na busca de leads via Google Places.");
  }


  const data = await response.json();
  const places = data.places || [];

  const results = places.map((item: any, idx: number) => ({
    id: item.id || `place-cs-${Date.now()}-${idx}`,
    nome: item.displayName?.text || "Sem nome",
    telefone: item.nationalPhoneNumber || "",
    website: item.websiteUri || "",
    endereco: item.formattedAddress || "",
    categoria: item.primaryTypeDisplayName?.text || keyword,
    nota: item.rating ?? null,
    avaliacoes: item.userRatingCount ?? 0,
    mapsUrl: item.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.displayName?.text || "") + " " + city)}`
  }));

  return {
    results,
    nextPageToken: data.nextPageToken || null
  };
};

export default function PartnerPortal({ 
  onBackToHome,
  initialPlan,
  initialIsRegistering = false
}: { 
  onBackToHome: () => void;
  initialPlan?: string;
  initialIsRegistering?: boolean;
}) {
  // Authentication & View states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("partner_authenticated") === "true";
  });
  const [currentPartner, setCurrentPartner] = useState<Partner | null>(() => {
    const saved = sessionStorage.getItem("partner_data");
    return saved ? JSON.parse(saved) : null;
  });

  const isSubMember = !!(
    currentPartner?.parentPartnerId || 
    currentPartner?.isTeamMember === true || 
    (currentPartner?.plano && (currentPartner.plano.toUpperCase().includes("CONSULTOR") || currentPartner.plano.toUpperCase().includes("EQUIPE")))
  );

  // Announcement States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncementShow, setCurrentAnnouncementShow] = useState<Announcement | null>(null);

  const [isRegistering, setIsRegistering] = useState(initialIsRegistering);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // System Notification States
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !currentPartner) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notificacoes"),
      where("recipientId", "==", currentPartner.id),
      where("recipientType", "==", "parceiro"),
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
      console.error("Error listening to notifications:", error);
    });

    return () => unsubscribe();
  }, [isAuthenticated, currentPartner]);

  // Real-time synchronization of currentPartner data (including balance/saldoConsultas)
  useEffect(() => {
    if (!isAuthenticated || !currentPartner?.id) return;

    const partnerRef = doc(db, "parceiros", currentPartner.id);
    const unsubscribe = onSnapshot(partnerRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentPartner(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            ...data,
            id: snapshot.id
          } as Partner;
          sessionStorage.setItem("partner_data", JSON.stringify(updated));
          return updated;
        });
      }
    }, (error) => {
      console.error("Error listening to partner document changes:", error);
    });

    return () => unsubscribe();
  }, [isAuthenticated, currentPartner?.id]);

  const handleNotifyCreditRecharge = async (amount: number) => {
    if (!currentPartner?.id) return;
    if (amount < 140.00) {
      alert("O valor mínimo para recarga de consultas é de R$ 140,00.");
      return;
    }
    setNotifyingRecharge(true);
    try {
      await addDoc(collection(db, "recargas"), {
        partnerId: currentPartner.id,
        partnerNome: currentPartner.nome || "Parceiro",
        partnerWhatsapp: currentPartner.whatsapp || "N/A",
        pacote: "Saldo de Consultas",
        tipo: "consultas",
        valor: amount,
        buscas: 0,
        status: "pendente",
        dataSolicitacao: new Date().toISOString()
      });
      setRechargeNotifySuccess(true);
    } catch (err) {
      console.error("Erro ao solicitar recarga de consultas:", err);
      alert("Erro ao enviar notificação de recarga.");
    } finally {
      setNotifyingRecharge(false);
    }
  };

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

  // Login Form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration Form
  const [regName, setRegName] = useState("");
  const [regCPF, setRegCPF] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regCityUF, setRegCityUF] = useState("");
  const [regPix, setRegPix] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regPlan, setRegPlan] = useState(initialPlan || "Executive Partner PROSFEC");
  const [regAcceptedTerms, setRegAcceptedTerms] = useState(false);

  // Sync props when they change
  React.useEffect(() => {
    if (initialIsRegistering !== undefined) {
      setIsRegistering(initialIsRegistering);
    }
  }, [initialIsRegistering]);

  React.useEffect(() => {
    if (initialPlan) {
      setRegPlan(initialPlan);
    }
  }, [initialPlan]);

  // Dynamic Price Catalog loaded from ADM Settings (configuracoes/precos_consultas)
  // Optimized with sessionStorage cache to prevent repeated real-time reads on static prices
  const [catalogServices, setCatalogServices] = useState<ServiceCatalogItem[]>(() => {
    try {
      const cached = sessionStorage.getItem("cached_precos_consultas");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SERVICES_CATALOG;
  });

  useEffect(() => {
    // Check if we have valid fresh cache in this session
    const cachedTime = sessionStorage.getItem("cached_precos_consultas_time");
    const now = Date.now();
    if (cachedTime && now - parseInt(cachedTime, 10) < 1000 * 60 * 30) {
      // Use cached for 30 minutes without reading Firestore
      return;
    }

    getDoc(doc(db, "configuracoes", "precos_consultas")).then((snap) => {
      if (snap.exists() && snap.data().servicos && Array.isArray(snap.data().servicos)) {
        setCatalogServices(snap.data().servicos);
        sessionStorage.setItem("cached_precos_consultas", JSON.stringify(snap.data().servicos));
        sessionStorage.setItem("cached_precos_consultas_time", String(Date.now()));
      }
    }).catch((err) => {
      console.warn("Could not load price catalog in PartnerPortal:", err);
    });
  }, []);

  // Dashboard Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [etapaFilter, setEtapaFilter] = useState("todos");
  const [leadsViewMode, setLeadsViewMode] = useState<"lista" | "kanban">("lista");

  // Pagination for Partners
  const [leadsPage, setLeadsPage] = useState(1);
  const itemsPerPage = 10;

  // Create recharge solicitation states
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeStep, setRechargeStep] = useState<1 | 2>(1);
  const [rechargeAmount, setRechargeAmount] = useState<number>(140);
  const [notifyingRecharge, setNotifyingRecharge] = useState(false);
  const [rechargeNotifySuccess, setRechargeNotifySuccess] = useState(false);
  const [rechargeCopiedPix, setRechargeCopiedPix] = useState(false);

  // Sync solicitacoesComissao with Firestore in real-time
  React.useEffect(() => {
    if (!isAuthenticated || !currentPartner?.id) {
      setSolicitacoesComissao([]);
      return;
    }

    const q = query(
      collection(db, "solicitacoes_comissao"),
      where("partnerId", "==", currentPartner.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SolicitacaoComissao[];
      // Sort client-side by dataSolicitacao desc
      list.sort((a, b) => new Date(b.dataSolicitacao || 0).getTime() - new Date(a.dataSolicitacao || 0).getTime());
      setSolicitacoesComissao(list);
    }, (error) => {
      console.warn("Error listening to solicitacoes_comissao:", error);
    });

    return () => unsubscribe();
  }, [isAuthenticated, currentPartner]);

  React.useEffect(() => {
    setLeadsPage(1);
  }, [searchTerm, statusFilter, etapaFilter]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUserRegistrationLink, setCopiedUserRegistrationLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "leads" | "terms" | "equipe" | "afiliados" | "caca-leads" | "servicos-contabilidade" | "perfil">("dashboard");
  const [showLeadRegisterForm, setShowLeadRegisterForm] = useState(false);

  // Helper function to check if consultant/partner profile is completely filled out
  const isProfileComplete = (partner: Partner | null): boolean => {
    if (!partner) return false;
    const hasNome = !!(partner.nome && partner.nome.trim().length >= 2);
    const hasCPF = !!((partner.cpf || partner.cnpj) && (partner.cpf || partner.cnpj)!.trim().length >= 11);
    const hasWhatsapp = !!(partner.whatsapp && partner.whatsapp.trim().length >= 8);
    const hasCidade = !!(partner.cidade && partner.cidade.trim().length >= 2);
    const hasChavePix = !!(partner.chavePix && partner.chavePix.trim().length >= 3);
    return hasNome && hasCPF && hasWhatsapp && hasCidade && hasChavePix;
  };

  // Profile Edit States
  const [profileNome, setProfileNome] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileCPF, setProfileCPF] = useState("");
  const [profileBirth, setProfileBirth] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profilePix, setProfilePix] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Enforce redirection to profile tab if profile is incomplete
  React.useEffect(() => {
    if (isAuthenticated && currentPartner && !isProfileComplete(currentPartner)) {
      setActiveTab("perfil");
    }
  }, [isAuthenticated, currentPartner]);

  // Tab switch handler with profile completion guard
  const handleTabClick = (tab: "dashboard" | "leads" | "terms" | "equipe" | "afiliados" | "caca-leads" | "servicos-contabilidade" | "perfil") => {
    if (isAuthenticated && currentPartner && !isProfileComplete(currentPartner) && tab !== "perfil") {
      setProfileErrorMsg("Para sua segurança, é obrigatório preencher e salvar todos os seus dados cadastrais (Nome, CPF/CNPJ, WhatsApp, Cidade e Chave Pix) antes de acessar as outras funções do sistema.");
      setActiveTab("perfil");
      return;
    }
    setActiveTab(tab);
  };

  React.useEffect(() => {
    if (currentPartner) {
      setProfileNome(currentPartner.nome || "");
      setProfileEmail(currentPartner.email || "");
      setProfileCPF(currentPartner.cpf || currentPartner.cnpj || "");
      setProfileBirth(currentPartner.dataNascimento || "");
      setProfilePhone(currentPartner.whatsapp || "");
      setProfileCity(currentPartner.cidade || "");
      setProfilePix(currentPartner.chavePix || "");
    }
  }, [currentPartner]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPartner?.id) return;

    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    if (!profileNome.trim() || profileNome.trim().length < 2) {
      setProfileErrorMsg("Por favor, informe seu Nome Completo ou Razão Social.");
      return;
    }
    if (!profileCPF.trim() || profileCPF.trim().length < 11) {
      setProfileErrorMsg("Por favor, informe um CPF ou CNPJ completo.");
      return;
    }
    if (!profilePhone.trim() || profilePhone.trim().length < 8) {
      setProfileErrorMsg("Por favor, informe seu WhatsApp com DDD.");
      return;
    }
    if (!profileCity.trim() || profileCity.trim().length < 2) {
      setProfileErrorMsg("Por favor, informe sua Cidade e Estado (ex: São Paulo - SP).");
      return;
    }
    if (!profilePix.trim() || profilePix.trim().length < 3) {
      setProfileErrorMsg("Por favor, informe sua Chave Pix para recebimento de comissões.");
      return;
    }

    if (profileNewPassword) {
      if (profileNewPassword !== profileConfirmPassword) {
        setProfileErrorMsg("As novas senhas digitadas não coincidem.");
        return;
      }
      if (profileNewPassword.length < 6) {
        setProfileErrorMsg("A nova senha deve ter no mínimo 6 caracteres.");
        return;
      }
    }

    setSavingProfile(true);

    try {
      const updatedFields: any = {
        nome: profileNome.trim(),
        email: profileEmail.trim().toLowerCase(),
        cpf: profileCPF.trim(),
        dataNascimento: profileBirth.trim(),
        whatsapp: profilePhone.trim(),
        cidade: profileCity.trim(),
        chavePix: profilePix.trim(),
      };

      if (profileNewPassword) {
        updatedFields.senha = profileNewPassword;
      }

      await updateDoc(doc(db, "parceiros", currentPartner.id), updatedFields);

      const newPartnerData: Partner = {
        ...currentPartner,
        ...updatedFields
      };

      setCurrentPartner(newPartnerData);
      sessionStorage.setItem("partner_data", JSON.stringify(newPartnerData));

      setProfileNewPassword("");
      setProfileConfirmPassword("");
      if (isProfileComplete(newPartnerData)) {
        setProfileSuccessMsg("Perfil concluído e verificado com sucesso! Todas as funcionalidades do sistema foram liberadas.");
      } else {
        setProfileSuccessMsg("Seu perfil foi atualizado com sucesso!");
      }
    } catch (err: any) {
      console.error("Error updating partner profile:", err);
      setProfileErrorMsg("Erro ao salvar as alterações do perfil. Tente novamente.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Hubla custom affiliate states
  const [hublaCodeStarter, setHublaCodeStarter] = useState("");
  const [hublaCodeExecutive, setHublaCodeExecutive] = useState("");
  const [hublaCodeMaster, setHublaCodeMaster] = useState("");
  const [savingLinks, setSavingLinks] = useState(false);
  const [saveLinksSuccess, setSaveLinksSuccess] = useState(false);
  
  // Registration checkout flow states
  const [registeredPartnerPlan, setRegisteredPartnerPlan] = useState<string | null>(null);

  // Parent Hubla codes for active logged-in partner paying their own renewal
  const [parentHublaCodes, setParentHublaCodes] = useState<{ starter?: string; executive?: string; master?: string } | null>(null);

  React.useEffect(() => {
    if (currentPartner) {
      setHublaCodeStarter(currentPartner.hublaCodeStarter || "");
      setHublaCodeExecutive(currentPartner.hublaCodeExecutive || "");
      setHublaCodeMaster(currentPartner.hublaCodeMaster || "");
    }
  }, [currentPartner]);

  React.useEffect(() => {
    if (currentPartner && currentPartner.parentPartnerId) {
      const fetchParentDetails = async () => {
        try {
          const parentSnap = await getDoc(doc(db, "parceiros", currentPartner.parentPartnerId!));
          if (parentSnap.exists()) {
            const data = parentSnap.data();
            if (data) {
              setParentHublaCodes({
                starter: data.hublaCodeStarter || undefined,
                executive: data.hublaCodeExecutive || undefined,
                master: data.hublaCodeMaster || undefined
              });
            }
          }
        } catch (err) {
          console.error("Error fetching parent hubla codes for payment:", err);
        }
      };
      fetchParentDetails();
    }
  }, [currentPartner]);

  const handleSaveAffiliateLinks = async () => {
    if (!currentPartner) return;
    setSavingLinks(true);
    setSaveLinksSuccess(false);
    try {
      const extStarter = extractHublaCode(hublaCodeStarter);
      const extExecutive = extractHublaCode(hublaCodeExecutive);
      const extMaster = extractHublaCode(hublaCodeMaster);

      const partnerDocRef = doc(db, "parceiros", currentPartner.id);
      await updateDoc(partnerDocRef, {
        hublaCodeStarter: extStarter,
        hublaCodeExecutive: extExecutive,
        hublaCodeMaster: extMaster
      });
      
      const updatedPartner = {
        ...currentPartner,
        hublaCodeStarter: extStarter,
        hublaCodeExecutive: extExecutive,
        hublaCodeMaster: extMaster
      };
      setCurrentPartner(updatedPartner);
      sessionStorage.setItem("partner_data", JSON.stringify(updatedPartner));
      setHublaCodeStarter(extStarter);
      setHublaCodeExecutive(extExecutive);
      setHublaCodeMaster(extMaster);
      setSaveLinksSuccess(true);
      setTimeout(() => setSaveLinksSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving affiliate codes:", err);
      alert("Ocorreu um erro ao salvar as configurações de checkout. Tente novamente.");
    } finally {
      setSavingLinks(false);
    }
  };

  const getPaymentLinkForPlan = (plan: string) => {
    const defaultLinks = {
      starter: "https://pay.hub.la/sSn9gIMlvXPt1ESeJJ4A",
      executive: "https://pay.hub.la/UQLcJNaQrlNRsBl1bc2Y",
      franquia: "https://pay.hub.la/UZOZ2DtEyahRALjFN3ra"
    };

    const planLower = plan.toLowerCase();
    const isStarter = planLower.includes("starter");
    const isExecutive = planLower.includes("executive");
    const isFranquia = planLower.includes("franquia") || planLower.includes("digital") || planLower.includes("master");

    let planKey: 'starter' | 'executive' | 'franquia' = 'starter';
    if (isExecutive) planKey = 'executive';
    if (isFranquia) planKey = 'franquia';

    const defaultLink = defaultLinks[planKey];

    // 1. If there is an active parent partner with a custom Hubla affiliate link, apply it
    if (currentPartner && currentPartner.parentPartnerId && parentHublaCodes) {
      const customCode = planKey === 'starter' ? parentHublaCodes.starter 
                       : planKey === 'executive' ? parentHublaCodes.executive 
                       : parentHublaCodes.master;
      if (customCode) {
        return `https://pay.hub.la/${customCode}`;
      }
    }

    // 2. Check if the current user landed on the site using a referral's Hubla codes
    const storageKey = planKey === 'starter' ? 'lca_referred_by_hubla_starter'
                     : planKey === 'executive' ? 'lca_referred_by_hubla_executive'
                     : 'lca_referred_by_hubla_master';
    const savedReferralCode = localStorage.getItem(storageKey);
    if (savedReferralCode) {
      return `https://pay.hub.la/${savedReferralCode}`;
    }

    return defaultLink;
  };

  // Referred Partners states
  const [referredPartners, setReferredPartners] = useState<Partner[]>([]);
  const [referredPartnersLoading, setReferredPartnersLoading] = useState<boolean>(false);

  // Floating Workspace states
  const [selectedLeadForWorkspace, setSelectedLeadForWorkspace] = useState<Lead | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"details" | "socios" | "diagnostico" | "contrato" | "credenciais" | "simulador" | "apta_bancaria" | "rating_adm">("details");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);

  // Caça Leads (Apify Google Places) states
  const [huntKeyword, setHuntKeyword] = useState("");
  const [huntState, setHuntState] = useState("");
  const [huntCitySelect, setHuntCitySelect] = useState("");
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [huntCity, setHuntCity] = useState("");
  const [huntLimit, setHuntLimit] = useState(20);
  const [huntResults, setHuntResults] = useState<any[]>([]);
  const [huntLoading, setHuntLoading] = useState(false);
  const [huntError, setHuntError] = useState<string | null>(null);
  const [copiedHuntContactId, setCopiedHuntContactId] = useState<string | null>(null);
  const [cacaLeadsCount, setCacaLeadsCount] = useState<number>(0);
  const [cacaLeadsLastDate, setCacaLeadsLastDate] = useState<string>("");

  // Caça Leads Search History states (Max 5 items)
  const [cacaLeadsHistory, setCacaLeadsHistory] = useState<CacaLeadsSearchHistoryItem[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [huntHistoryLoading, setHuntHistoryLoading] = useState<boolean>(false);
  
  // Google Places API Pagination & CNPJ Enrichment states
  const [huntNextPageToken, setHuntNextPageToken] = useState<string | null>(null);
  const [loadingNextPage, setLoadingNextPage] = useState<boolean>(false);
  const [cnpjDetailsMap, setCnpjDetailsMap] = useState<{ [placeId: string]: any }>({});
  const [cnpjQueryLoading, setCnpjQueryLoading] = useState<{ [placeId: string]: boolean }>({});
  const [activeCnpjModal, setActiveCnpjModal] = useState<{ place: any; details?: any } | null>(null);
  const [cnpjInputModal, setCnpjInputModal] = useState<{ place: any; inputCnpj: string; error?: string } | null>(null);

  // Batch Lead Distribution states for Master
  const [selectedHuntPlaces, setSelectedHuntPlaces] = useState<string[]>([]);
  const [batchConsultantId, setBatchConsultantId] = useState<string>("");
  const [batchDistributing, setBatchDistributing] = useState<boolean>(false);

  // Consultant Directed Leads filters & notes states
  const [consultantSearchQuery, setConsultantSearchQuery] = useState("");
  const [consultantCategoryFilter, setConsultantCategoryFilter] = useState("");
  const [consultantCnpjFilter, setConsultantCnpjFilter] = useState<"ALL" | "WITH_CNPJ" | "WITHOUT_CNPJ">("ALL");
  const [activeNoteInput, setActiveNoteInput] = useState<{ [leadId: string]: string }>({});
  const [addingNoteForLeadId, setAddingNoteForLeadId] = useState<string | null>(null);
  const [expandedNotesLeadId, setExpandedNotesLeadId] = useState<string | null>(null);
  
  // Refill search limit states (Caça-Leads)
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillStep, setRefillStep] = useState<1 | 2>(1);
  const [refillPackage, setRefillPackage] = useState<"Bronze" | "Prata" | "Ouro">("Bronze");
  const [refillCopiedPix, setRefillCopiedPix] = useState(false);
  const [refillNotifySuccess, setRefillNotifySuccess] = useState(false);
  const [myRefills, setMyRefills] = useState<any[]>([]);
  const [refillSubmitting, setRefillSubmitting] = useState(false);

  // Step 6 Services Performance & Financial Control states
  const [dashboardServiceFilter, setDashboardServiceFilter] = useState<"todos" | "pendente" | "pago" | "cancelado">("todos");
  const [dashboardServiceSearch, setDashboardServiceSearch] = useState("");
  const [expandedServiceLeadId, setExpandedServiceLeadId] = useState<string | null>(null);
  const [solicitacoesComissao, setSolicitacoesComissao] = useState<SolicitacaoComissao[]>([]);
  // Origem da caixa de saque: "vendas" (comissões de planos/vendas) ou "servicos" (Passo 6)
  const [payoutModalOrigin, setPayoutModalOrigin] = useState<null | "vendas" | "servicos">(null);
  const showCommissionPayoutModal = payoutModalOrigin !== null;
  const setShowCommissionPayoutModal = (open: any) => setPayoutModalOrigin(open ? "servicos" : null);
  const [commissionPayoutSubmitting, setCommissionPayoutSubmitting] = useState(false);
  const [commissionPayoutSuccess, setCommissionPayoutSuccess] = useState<string | null>(null);
  const [payoutPixKey, setPayoutPixKey] = useState("");
  const [payoutAmountCustom, setPayoutAmountCustom] = useState<string>("");

  // Edit fields
  const [editRazaoSocial, setEditRazaoSocial] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPorte, setEditPorte] = useState("ME");
  const [editFaturamento, setEditFaturamento] = useState("");
  const [editRamo, setEditRamo] = useState("");
  const [editBancoPrincipal, setEditBancoPrincipal] = useState("Banco do Brasil");
  const [editMenosDe12Meses, setEditMenosDe12Meses] = useState(false);
  const [editCapitalSocial, setEditCapitalSocial] = useState("");
  const [editMediaReceitaMensal, setEditMediaReceitaMensal] = useState("");

  const [editSocio1Nome, setEditSocio1Nome] = useState("");
  const [editSocio1Cpf, setEditSocio1Cpf] = useState("");
  const [editSocio1Birth, setEditSocio1Birth] = useState("");
  const [editSocio1Mae, setEditSocio1Mae] = useState("");
  const [editSocio1Telefone, setEditSocio1Telefone] = useState("");
  const [editSocio1Rg, setEditSocio1Rg] = useState("");
  const [editSocio1Orgao, setEditSocio1Orgao] = useState("");
  const [editSocio1Participacao, setEditSocio1Participacao] = useState("100");

  const [editHasSocio2, setEditHasSocio2] = useState(false);
  const [editSocio2Nome, setEditSocio2Nome] = useState("");
  const [editSocio2Cpf, setEditSocio2Cpf] = useState("");
  const [editSocio2Birth, setEditSocio2Birth] = useState("");
  const [editSocio2Telefone, setEditSocio2Telefone] = useState("");
  const [editSocio2Participacao, setEditSocio2Participacao] = useState("");

  const [editEndCep, setEditEndCep] = useState("");
  const [editEndLogradouro, setEditEndLogradouro] = useState("");
  const [editEndNumero, setEditEndNumero] = useState("");
  const [editEndBairro, setEditEndBairro] = useState("");
  const [editEndCidade, setEditEndCidade] = useState("");
  const [editEndUf, setEditEndUf] = useState("SP");
  const [editEndComplemento, setEditEndComplemento] = useState("");

  // Advanced Proposal Simulator states
  const [advValor, setAdvValor] = useState<number>(150000);
  const [advCarencia, setAdvCarencia] = useState<number>(12);
  const [advPrazoAmortizacao, setAdvPrazoAmortizacao] = useState<number>(48);
  const [advAmortizacao, setAdvAmortizacao] = useState<"SAC" | "PRICE">("SAC");
  const [advPagarJurosCarencia, setAdvPagarJurosCarencia] = useState<boolean>(false);
  const [advIncorporarJurosCarencia, setAdvIncorporarJurosCarencia] = useState<boolean>(true);
  const [advTaxaAnual, setAdvTaxaAnual] = useState<number>(16.5);
  const [copiedProposalReport, setCopiedProposalReport] = useState<boolean>(false);

  // Form states to register lead with socios
  const [leadNome, setLeadNome] = useState("");
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCnpj, setLeadCnpj] = useState("");
  const [leadRazaoSocial, setLeadRazaoSocial] = useState("");
  const [leadPorte, setLeadPorte] = useState("ME");
  const [leadFaturamento, setLeadFaturamento] = useState<string>("");
  const [leadBancoPrincipal, setLeadBancoPrincipal] = useState("Banco do Brasil");
  const [leadRamo, setLeadRamo] = useState("");
  const [leadMenosDe12Meses, setLeadMenosDe12Meses] = useState(false);
  const [leadCapitalSocial, setLeadCapitalSocial] = useState<string>("");
  const [leadMediaReceitaMensal, setLeadMediaReceitaMensal] = useState<string>("");

  // Socio 1
  const [socio1Nome, setSocio1Nome] = useState("");
  const [socio1Cpf, setSocio1Cpf] = useState("");
  const [socio1Birth, setSocio1Birth] = useState("");
  const [socio1Mae, setSocio1Mae] = useState("");
  const [socio1Telefone, setSocio1Telefone] = useState("");
  const [socio1Rg, setSocio1Rg] = useState("");
  const [socio1Orgao, setSocio1Orgao] = useState("");
  const [socio1Participacao, setSocio1Participacao] = useState<string>("100");

  // Socio 2
  const [hasSocio2, setHasSocio2] = useState(false);
  const [socio2Nome, setSocio2Nome] = useState("");
  const [socio2Cpf, setSocio2Cpf] = useState("");
  const [socio2Birth, setSocio2Birth] = useState("");
  const [socio2Telefone, setSocio2Telefone] = useState("");
  const [socio2Participacao, setSocio2Participacao] = useState<string>("");

  // Endereço do Sócio Principal
  const [endCep, setEndCep] = useState("");
  const [endLogradouro, setEndLogradouro] = useState("");
  const [endNumero, setEndNumero] = useState("");
  const [endBairro, setEndBairro] = useState("");
  const [endCidade, setEndCidade] = useState("");
  const [endUf, setEndUf] = useState("SP");
  const [endComplemento, setEndComplemento] = useState("");

  const [regLeadLoading, setRegLeadLoading] = useState(false);
  const [regLeadError, setRegLeadError] = useState<string | null>(null);
  const [regLeadSuccess, setRegLeadSuccess] = useState<string | null>(null);
  const [registeredLeadId, setRegisteredLeadId] = useState<string | null>(null);
  const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);

  // Franquia Digital Team States
  const [teamMembers, setTeamMembers] = useState<Partner[]>([]);
  const [teamLeads, setTeamLeads] = useState<Lead[]>([]);
  const [teamMemberName, setTeamMemberName] = useState("");
  const [teamMemberEmail, setTeamMemberEmail] = useState("");
  const [teamMemberPhone, setTeamMemberPhone] = useState("");
  const [teamMemberCPF, setTeamMemberCPF] = useState("");
  const [teamMemberPix, setTeamMemberPix] = useState("");
  const [teamMemberPassword, setTeamMemberPassword] = useState("");
  const [teamMemberPlan, setTeamMemberPlan] = useState("STARTER");
  const [addingMember, setAddingMember] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);
  const [copiedTeamMemberLinkId, setCopiedTeamMemberLinkId] = useState<string | null>(null);
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);

  // Franchise Team Accordion and Search States
  const [isTeamMembersExpanded, setIsTeamMembersExpanded] = useState(false);
  const [isTeamPipelineExpanded, setIsTeamPipelineExpanded] = useState(false);
  const [teamMemberSearchTerm, setTeamMemberSearchTerm] = useState("");
  const [teamPipelineSearchTerm, setTeamPipelineSearchTerm] = useState("");
  const [teamPipelineStatusFilter, setTeamPipelineStatusFilter] = useState("todos");

  // Franchise lead distribution states
  const [distributedLeadsMap, setDistributedLeadsMap] = useState<Record<string, { teamMemberName: string, date: string, status: string, id: string }>>({});
  const [allParentDistributedLeads, setAllParentDistributedLeads] = useState<any[]>([]);
  const [selectedConsultantForInspection, setSelectedConsultantForInspection] = useState<Partner | null>(null);
  const [inspectionSearchTerm, setInspectionSearchTerm] = useState("");
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState("todos");
  const [leadsDistributedToMe, setLeadsDistributedToMe] = useState<any[]>([]);
  const [distributedLeadsLoading, setDistributedLeadsLoading] = useState(false);
  const [selectedLeadForRegistration, setSelectedLeadForRegistration] = useState<any | null>(null);
  const [assigningHuntLeadId, setAssigningHuntLeadId] = useState<string | null>(null);

  // Redirection states for distributed leads
  const [leadToReassign, setLeadToReassign] = useState<any | null>(null);
  const [reassignTargetMemberId, setReassignTargetMemberId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");
  const [reassigningLoading, setReassigningLoading] = useState(false);
  const [bulkReassignConsultantSource, setBulkReassignConsultantSource] = useState<Partner | null>(null);
  const [bulkReassignTargetId, setBulkReassignTargetId] = useState<string>("");
  const [bulkReassignMode, setBulkReassignMode] = useState<"single" | "equal">("single");
  const [bulkReassigningLoading, setBulkReassigningLoading] = useState(false);
  const [distributeEquallyLoading, setDistributeEquallyLoading] = useState(false);
  const [bulkDeletingDiscardedLoading, setBulkDeletingDiscardedLoading] = useState(false);

  // Calculator states
  const [calcLeadsCount, setCalcLeadsCount] = useState(3);
  const [calcAvgValue, setCalcAvgValue] = useState(150000);

  // Derived filtered & paginated leads lists
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.cnpj && lead.cnpj.includes(searchTerm)) ||
      (lead.razaoSocial && lead.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "todos" || lead.status === statusFilter;
    const matchesEtapa = etapaFilter === "todos" || String(lead.etapa) === etapaFilter;

    return matchesSearch && matchesStatus && matchesEtapa;
  });

  const paginatedLeads = filteredLeads.slice((leadsPage - 1) * itemsPerPage, leadsPage * itemsPerPage);

  // Determine commission multiplier based on plan name (Credit Operations)
  const getCommissionMultiplier = (plan?: string) => {
    const p = plan?.toUpperCase() || "";
    if (p.includes("EXEC")) return 0.015; // 1.5%
    if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return 0.030; // 3.0%
    if (p.includes("STARTER")) return 0.005; // 0.5%
    return 0.005; // Default fallback
  };

  const getDirectCommissionMultiplier = (plan?: string) => {
    const p = plan?.toUpperCase() || "";
    if (p.includes("EXEC")) return 0.015; // 1.5%
    if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return 0.030; // 3.0%
    if (p.includes("STARTER")) return 0.005; // 0.5%
    return 0.005; // Default fallback
  };

  // Percentual de Comissão sobre Serviços de Estruturação Técnica (Passo 6)
  // Starter: 10% | Executive: 20% | Master: 30%
  const getServiceCommissionRate = (plan?: string): number => {
    const p = plan?.toUpperCase() || "";
    if (p.includes("STARTER")) return 0.10; // Starter: 10%
    if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return 0.30; // Master: 30%
    if (p.includes("EXEC")) return 0.20; // Executive: 20%
    return 0.20; // Default fallback (Executive)
  };

  // Ganhos sobre Equipe para Master Partner (Override/Spread sobre Serviços de Estruturação)
  // Master ganha 30%. Se o consultor for Executive (20%), Master ganha 10%. Se o consultor for Starter (10%), Master ganha 20%.
  const getMasterTeamServiceOverrideRate = (consultantPlan?: string): number => {
    const cp = consultantPlan?.toUpperCase() || "";
    if (cp.includes("STARTER")) return 0.20; // 30% Master - 10% Starter = 20% spread
    if (cp.includes("EXEC")) return 0.10; // 30% Master - 20% Executive = 10% spread
    if (cp.includes("FRANQUIA") || cp.includes("DIGITAL") || cp.includes("MASTER")) return 0.00;
    return 0.10; // Default fallback para consultor da equipe (10% spread)
  };

  const getPlanServiceLabel = (plan?: string): string => {
    const p = plan?.toUpperCase() || "";
    if (p.includes("STARTER")) return "10% (Starter)";
    if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return "30% Direta / Repasse de Equipe (Teto 30%)";
    if (p.includes("EXEC")) return "20% (Executive)";
    return "20% (Executive)";
  };

  const getPlanDisplayName = (plan?: string) => {
    if (!plan) return "STARTER";
    const p = plan.toUpperCase();
    if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return "Master Partner";
    return plan;
  };

  const isFranquiaDigital = (plan?: string) => {
    const p = plan?.toUpperCase() || "";
    return p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER");
  };

  const isEligibleForAffiliates = (_plan?: string, _partnerObj?: Partner | null) => {
    return false;
  };

  const getCacaLeadsLimit = (plan?: string): number => {
    const p = plan?.toUpperCase() || "";
    if (p.includes("AFILIADO")) return 0;
    if (p.includes("FRANQUIA") || p.includes("DIGITAL") || p.includes("MASTER")) return 3;
    if (p.includes("EXEC")) return 2;
    if (p.includes("STARTER")) return 1;
    return 1; // fallback
  };

  const getAffiliateCommissionDetails = (subPartner: Partner) => {
    const plan = subPartner.plano?.toUpperCase() || "";
    let subscriptionValue = 0;
    let commissionValue = 0;

    if (plan.includes("EXEC")) {
      subscriptionValue = 800;
      commissionValue = 240.00; // 30% of 800
    } else if (plan.includes("FRANQUIA") || plan.includes("DIGITAL") || plan.includes("MASTER")) {
      subscriptionValue = 1500;
      commissionValue = 450.00; // 30% of 1500
    } else if (plan.includes("STARTER")) {
      subscriptionValue = 500;
      commissionValue = 150.00; // 30% of 500
    }

    const subStatus = getSubscriptionStatus(subPartner);
    const hasPaid = !!subPartner.dataUltimoPagamento;
    const isExempt = subStatus.isExempt;
    const isTrial = !hasPaid && subStatus.status !== "vencida";
    
    // Only generate commission if active, has paid, and is not exempt
    const isCommissionActive = subStatus.status !== "vencida" && hasPaid && !isExempt;

    return {
      subscriptionValue,
      commissionValue: isCommissionActive ? commissionValue : 0,
      potentialCommission: commissionValue,
      isActive: subStatus.status !== "vencida",
      hasPaid,
      isTrial,
      isExempt,
      status: subStatus
    };
  };

  const fetchReferredPartners = async (partnerId: string) => {
    setReferredPartnersLoading(true);
    try {
      const q = query(
        collection(db, "parceiros"),
        where("parentPartnerId", "==", partnerId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Partner))
        .filter(p => p.isTeamMember !== true && (!p.plano || (!p.plano.toUpperCase().includes("CONSULTOR") && !p.plano.toUpperCase().includes("EQUIPE"))));
      setReferredPartners(list);
    } catch (err) {
      console.error("Error fetching referred partners:", err);
    } finally {
      setReferredPartnersLoading(false);
    }
  };

  const calculatedCommission = calcLeadsCount * calcAvgValue * getCommissionMultiplier(currentPartner?.plano);

  // Fetch team details for Franquia Digital
  const fetchTeamDetails = async (partnerId: string) => {
    try {
      // 1. Fetch team members
      const qTeam = query(
        collection(db, "parceiros"),
        where("parentPartnerId", "==", partnerId)
      );
      const teamSnap = await getDocs(qTeam);
      const rawTeamList = teamSnap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Partner))
        .filter(p => p.isTeamMember === true || (p.plano && (p.plano.toUpperCase().includes("CONSULTOR") || p.plano.toUpperCase().includes("EQUIPE"))));

      // Check inactivity for each consultant (3-day rule)
      const nowTime = new Date().getTime();
      const updatedTeamList = await Promise.all(
        rawTeamList.map(async (member) => {
          const lastActiveStr = member.dataUltimoAcesso || member.dataCriacao;
          if (lastActiveStr) {
            const lastActiveTime = new Date(lastActiveStr).getTime();
            const diffMs = nowTime - lastActiveTime;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const isInactiveByTime = diffDays >= 3;

            // If partner has been inactive for >= 3 days and is not yet marked inativo
            if (isInactiveByTime && member.status !== "inativo") {
              try {
                await updateDoc(doc(db, "parceiros", member.id), {
                  status: "inativo",
                  inativoPorInatividade: true,
                  motivoInativacao: `Inatividade de ${diffDays} dias sem uso do sistema`
                });
                return {
                  ...member,
                  status: "inativo",
                  inativoPorInatividade: true,
                  motivoInativacao: `Inatividade de ${diffDays} dias sem uso do sistema`
                };
              } catch (e) {
                console.error("Error auto-updating inactive status for consultant:", member.id, e);
              }
            }
          }
          return member;
        })
      );

      setTeamMembers(updatedTeamList);

      // 2. Fetch team leads
      if (updatedTeamList.length > 0) {
        const teamIds = updatedTeamList.map(t => t.id);
        const allTeamLeads: Lead[] = [];
        
        // Split in chunks of 10 to avoid Firestore "in" query limitations
        for (let i = 0; i < teamIds.length; i += 10) {
          const chunk = teamIds.slice(i, i + 10);
          const qTeamLeads = query(
            collection(db, "leads"),
            where("parceiroId", "in", chunk)
          );
          const teamLeadsSnap = await getDocs(qTeamLeads);
          teamLeadsSnap.docs.forEach(doc => {
            allTeamLeads.push({
              id: doc.id,
              ...doc.data()
            } as Lead);
          });
        }
        
        allTeamLeads.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
        setTeamLeads(allTeamLeads);
      } else {
        setTeamLeads([]);
      }
    } catch (err) {
      console.error("Error fetching team details:", err);
    }
  };

  const handleReactivateTeamMember = async (memberId: string) => {
    try {
      const nowIso = new Date().toISOString();
      const docRef = doc(db, "parceiros", memberId);
      await updateDoc(docRef, {
        status: "ativo",
        inativoPorInatividade: false,
        motivoInativacao: null,
        dataUltimoAcesso: nowIso,
        dataReativacao: nowIso
      });

      setTeamMembers(prev => prev.map(m => m.id === memberId ? {
        ...m,
        status: "ativo",
        inativoPorInatividade: false,
        motivoInativacao: undefined,
        dataUltimoAcesso: nowIso,
        dataReativacao: nowIso
      } : m));

      setTeamSuccess("Acesso do consultor reativado com sucesso! A contagem de 3 dias de inatividade foi zerada.");
      setTimeout(() => setTeamSuccess(null), 4000);
    } catch (err) {
      console.error("Error reactivating team member:", err);
      setTeamError("Erro ao reativar acesso do consultor.");
      setTimeout(() => setTeamError(null), 3500);
    }
  };

  const handleToggleTeamMemberStatus = async (memberId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
      const nowIso = new Date().toISOString();
      const docRef = doc(db, "parceiros", memberId);
      const updatePayload: any = {
        status: newStatus
      };

      if (newStatus === "ativo") {
        updatePayload.inativoPorInatividade = false;
        updatePayload.motivoInativacao = null;
        updatePayload.dataUltimoAcesso = nowIso;
        updatePayload.dataReativacao = nowIso;
      } else {
        updatePayload.motivoInativacao = "Inativado manualmente pelo Master";
      }

      await updateDoc(docRef, updatePayload);

      setTeamMembers(prev => prev.map(m => m.id === memberId ? {
        ...m,
        ...updatePayload
      } : m));

      setTeamSuccess(`Status do consultor alterado para ${newStatus.toUpperCase()} com sucesso!`);
      setTimeout(() => setTeamSuccess(null), 3500);
    } catch (err) {
      console.error("Error toggling member status:", err);
      setTeamError("Erro ao alterar status do consultor.");
      setTimeout(() => setTeamError(null), 3500);
    }
  };

  const getOverrideMultiplierForLead = (leadObj: Lead) => {
    const member = teamMembers.find(t => t.id === leadObj.parceiroId);
    if (!member) return 0.025; // Default fallback for starter (3.0% - 0.5% = 2.5%)
    const p = member.plano?.toUpperCase() || "";
    if (p.includes("EXEC")) return 0.015; // 3.0% - 1.5% = 1.5%
    return 0.025; // 3.0% - 0.5% = 2.5% for Starter / others
  };

  // ===== Saldo de COMISSÕES DE VENDAS (planos / Lastlink-Hubla) — usado no card e na caixa de saque "vendas"
  const salesCommissionStats = (() => {
    const directMultiplier = getDirectCommissionMultiplier(currentPartner?.plano);
    const isPaidLead = (l: any) => l.comissaoPaga === true || l.servicoPago === true || l.comissaoMultinivel?.statusGeral === "pago";
    const isPendingLead = (l: any) =>
      l.comissaoPaga !== true && l.servicoPago !== true && l.comissaoMultinivel?.statusGeral !== "pago" &&
      (l.etapa === 7 || l.status === "concluido" || l.servicosRecomendados?.length > 0 || (l.subEtapasPasso6 && l.subEtapasPasso6.length > 0));

    const directPaid = (leads || []).filter(isPaidLead).reduce((acc: number, l: any) =>
      acc + (l.comissaoMultinivel?.valorComissaoDireta || ((l.valorAprovado || l.limiteEstimado || 0) * directMultiplier)), 0);
    const directPending = (leads || []).filter(isPendingLead).reduce((acc: number, l: any) =>
      acc + (l.comissaoMultinivel?.valorComissaoDireta || ((l.valorAprovado || l.limiteEstimado || 0) * directMultiplier)), 0);

    const teamPaid = (teamLeads || []).filter(isPaidLead).reduce((acc: number, l: any) =>
      acc + (l.comissaoMultinivel?.valorComissaoEquipe || ((l.valorAprovado || l.limiteEstimado || 0) * getOverrideMultiplierForLead(l))), 0);
    const teamPending = (teamLeads || []).filter(isPendingLead).reduce((acc: number, l: any) =>
      acc + (l.comissaoMultinivel?.valorComissaoEquipe || ((l.valorAprovado || l.limiteEstimado || 0) * getOverrideMultiplierForLead(l))), 0);

    const master = isFranquiaDigital(currentPartner?.plano);
    return {
      totalPaid: directPaid + (master ? teamPaid : 0),
      totalPending: directPending + (master ? teamPending : 0),
      leadsPagos: (leads || []).filter(isPaidLead).map((l: any) => l.nomeEmpresa || l.nome || "Empresa"),
    };
  })();

  // Origem de uma solicitação antiga (sem campo) = serviços (comportamento anterior)
  const getSolicitacaoOrigem = (s: any): "vendas" | "servicos" => (s?.origem === "vendas" ? "vendas" : "servicos");

  const somaSaques = (origem: "vendas" | "servicos", status: string) =>
    (solicitacoesComissao || [])
      .filter((s: any) => getSolicitacaoOrigem(s) === origem && s.status === status)
      .reduce((acc: number, s: any) => acc + (s.valor || 0), 0);

  const saquesVendasPagos = somaSaques("vendas", "pago");
  const saquesVendasPendentes = somaSaques("vendas", "pendente");
  const saldoVendasDisponivel = Math.max(0, salesCommissionStats.totalPaid - (saquesVendasPagos + saquesVendasPendentes));



  const handleUpdateTeamMemberPlan = async (memberId: string, newPlan: string) => {
    try {
      const isExec = newPlan.toUpperCase().includes("EXEC");
      const planName = isExec ? "Consultor Executive" : "Consultor Starter";
      const comissaoVal = isExec ? 1.5 : 0.5;
      const docRef = doc(db, "parceiros", memberId);
      await updateDoc(docRef, { 
        plano: planName,
        comissao: comissaoVal 
      });
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, plano: planName, comissao: comissaoVal } : m));
      setTeamSuccess(`Categoria do consultor atualizada para ${planName} (${comissaoVal}%) com sucesso!`);
      setTimeout(() => setTeamSuccess(null), 3500);
    } catch (err) {
      console.error("Error updating team member plan:", err);
      setTeamError("Erro ao atualizar categoria do consultor no banco de dados.");
      setTimeout(() => setTeamError(null), 3500);
    }
  };

  const handleAssignLead = async (leadId: string, member: Partner) => {
    try {
      const docRef = doc(db, "leads", leadId);
      await updateDoc(docRef, {
        parceiroId: member.id,
        parceiroNome: member.nome
      });
      setLeads(prev => prev.filter(l => l.id !== leadId));
      if (currentPartner) {
        await fetchTeamDetails(currentPartner.id);
      }
      setAssigningLead(null);
    } catch (err) {
      console.error("Error reassigning lead:", err);
    }
  };

  // Fetch distributed leads map (for Franchisee view)
  const fetchDistributedLeads = async (franchiseId: string) => {
    try {
      const q = query(
        collection(db, "leads_distribuidos"),
        where("parentPartnerId", "==", franchiseId)
      );
      const snap = await getDocs(q);
      const map: Record<string, { teamMemberName: string, date: string, status: string, id: string }> = {};
      const fullList: any[] = [];
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const item = { id: docSnap.id, ...data };
        fullList.push(item);
        const key = `${data.nomeEmpresa}_${data.telefone}`;
        map[key] = {
          teamMemberName: data.teamMemberNome,
          date: new Date(data.dataDistribuicao).toLocaleDateString("pt-BR"),
          status: data.status || "pendente",
          id: docSnap.id
        };
      });
      setDistributedLeadsMap(map);
      setAllParentDistributedLeads(fullList);
    } catch (error) {
      console.error("Erro ao buscar leads distribuídos:", error);
    }
  };

  // Fetch leads distributed to me (for Team Member/Consultant view)
  const fetchLeadsDistributedToMe = async (memberId: string) => {
    setDistributedLeadsLoading(true);
    try {
      const q = query(
        collection(db, "leads_distribuidos"),
        where("teamMemberId", "==", memberId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      list.sort((a: any, b: any) => new Date(b.dataDistribuicao).getTime() - new Date(a.dataDistribuicao).getTime());
      setLeadsDistributedToMe(list);
    } catch (error) {
      console.error("Erro ao carregar leads direcionados:", error);
    } finally {
      setDistributedLeadsLoading(false);
    }
  };

  // Handle distributing a lead to a consultant
  const handleDistributeLead = async (place: any, teamMember: Partner) => {
    if (!currentPartner) return;
    try {
      const cachedCnpj = cnpjDetailsMap[place.id];
      const payload = {
        parentPartnerId: currentPartner.id,
        teamMemberId: teamMember.id,
        teamMemberNome: teamMember.nome,
        nomeEmpresa: place.nome,
        telefone: place.telefone || "",
        endereco: place.endereco || "",
        website: place.website || "",
        categoria: place.categoria || huntKeyword || "",
        cidade: place.cidade || huntCity || "",
        estado: place.estado || huntState || "",
        cnpj: cachedCnpj?.cnpj || place.cnpj || "",
        cnpjDetails: cachedCnpj || place.cnpjDetails || null,
        dataDistribuicao: new Date().toISOString(),
        status: "pendente"
      };
      
      const docRef = await addDoc(collection(db, "leads_distribuidos"), payload);
      
      // Update local state
      const key = `${place.nome}_${place.telefone || ""}`;
      setDistributedLeadsMap(prev => ({
        ...prev,
        [key]: {
          teamMemberName: teamMember.nome,
          date: new Date().toLocaleDateString("pt-BR"),
          status: "pendente",
          id: docRef.id
        }
      }));
      setAllParentDistributedLeads(prev => [
        { id: docRef.id, ...payload },
        ...prev
      ]);
    } catch (error) {
      console.error("Erro ao distribuir lead:", error);
    }
  };

  // Handle batch distributing multiple selected leads to a consultant
  const handleBatchDistributeLeads = async () => {
    if (!currentPartner || selectedHuntPlaces.length === 0 || !batchConsultantId) return;
    const targetMember = teamMembers.find(m => m.id === batchConsultantId);
    if (!targetMember) return;

    setBatchDistributing(true);
    try {
      let successCount = 0;
      for (const placeId of selectedHuntPlaces) {
        const place = huntResults.find(p => p.id === placeId);
        if (place) {
          await handleDistributeLead(place, targetMember);
          successCount++;
        }
      }
      setSelectedHuntPlaces([]);
      setBatchConsultantId("");
    } catch (err) {
      console.error("Erro ao direcionar lote de leads:", err);
    } finally {
      setBatchDistributing(false);
    }
  };

  // Handle distributing selected leads EQUALLY (Round-Robin) among all team consultants
  const handleDistributeLeadsEqually = async () => {
    if (!currentPartner || selectedHuntPlaces.length === 0 || teamMembers.length === 0) return;

    setDistributeEquallyLoading(true);
    try {
      let memberIndex = 0;
      for (const placeId of selectedHuntPlaces) {
        const place = huntResults.find(p => p.id === placeId);
        if (place) {
          const targetMember = teamMembers[memberIndex % teamMembers.length];
          await handleDistributeLead(place, targetMember);
          memberIndex++;
        }
      }
      setSelectedHuntPlaces([]);
      setBatchConsultantId("");
    } catch (err) {
      console.error("Erro ao distribuir leads por igual:", err);
    } finally {
      setDistributeEquallyLoading(false);
    }
  };

  // Handle adding an interaction note/history item to a consultant lead
  const handleAddLeadNote = async (leadId: string) => {
    const text = activeNoteInput[leadId]?.trim();
    if (!text || !currentPartner) return;

    setAddingNoteForLeadId(leadId);
    try {
      const docRef = doc(db, "leads_distribuidos", leadId);
      const newNoteObj = {
        id: `note-${Date.now()}`,
        text: text,
        date: new Date().toISOString(),
        author: currentPartner.nome || "Consultor"
      };

      await updateDoc(docRef, {
        historico: arrayUnion(newNoteObj)
      });

      // Update local state
      setLeadsDistributedToMe(prev => prev.map(l => {
        if (l.id === leadId) {
          const existingHist = Array.isArray(l.historico) ? l.historico : [];
          return { ...l, historico: [...existingHist, newNoteObj] };
        }
        return l;
      }));

      setActiveNoteInput(prev => ({ ...prev, [leadId]: "" }));
    } catch (err) {
      console.error("Erro ao adicionar nota ao lead:", err);
    } finally {
      setAddingNoteForLeadId(null);
    }
  };

  // Handle discard or delete a distributed lead (for team member or franchisee)
  const handleDiscardDistributedLead = async (leadId: string) => {
    try {
      const docRef = doc(db, "leads_distribuidos", leadId);
      await updateDoc(docRef, { status: "descartado" });
      
      // Update local states
      setLeadsDistributedToMe(prev => prev.map(l => l.id === leadId ? { ...l, status: "descartado" } : l));
      setAllParentDistributedLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: "descartado" } : l));
      setDistributedLeadsMap(prev => {
        const copy = { ...prev };
        const key = Object.keys(copy).find(k => copy[k].id === leadId);
        if (key) {
          copy[key].status = "descartado";
        }
        return copy;
      });
    } catch (error) {
      console.error("Erro ao descartar lead:", error);
    }
  };

  // Handle permanent deletion of a single distributed lead from Firestore
  const handleDeleteDistributedLeadPermanent = async (leadId: string) => {
    if (!confirm("Deseja excluir definitivamente este lead da carteira? Esta ação removerá o registro permanentemente do banco de dados e atualizará o saldo.")) return;
    try {
      const docRef = doc(db, "leads_distribuidos", leadId);
      await deleteDoc(docRef);

      // Update local states
      setLeadsDistributedToMe(prev => prev.filter(l => l.id !== leadId));
      setAllParentDistributedLeads(prev => prev.filter(l => l.id !== leadId));
      setDistributedLeadsMap(prev => {
        const copy = { ...prev };
        const key = Object.keys(copy).find(k => copy[k].id === leadId);
        if (key) {
          delete copy[key];
        }
        return copy;
      });
    } catch (error) {
      console.error("Erro ao excluir lead permanentemente:", error);
      alert("Erro ao excluir o lead definitivamente.");
    }
  };

  // Handle bulk permanent deletion of ALL discarded leads for a specific consultant
  const handleBulkDeleteDiscardedLeadsForConsultant = async (consultantId: string, consultantName: string) => {
    const discardedLeads = allParentDistributedLeads.filter(
      l => l.teamMemberId === consultantId && l.status === "descartado"
    );

    if (discardedLeads.length === 0) {
      alert("Não há leads descartados para este consultor.");
      return;
    }

    const confirmMsg = `Deseja excluir definitivamente todos os ${discardedLeads.length} leads descartados pelo consultor ${consultantName}?\n\nEsta ação removerá todos os registros permanentemente do banco de dados e liberará o saldo do seu painel.`;
    if (!confirm(confirmMsg)) return;

    setBulkDeletingDiscardedLoading(true);
    try {
      const deletePromises = discardedLeads.map(l => deleteDoc(doc(db, "leads_distribuidos", l.id)));
      await Promise.all(deletePromises);

      const discardedIds = new Set(discardedLeads.map(l => l.id));

      // Update local states
      setAllParentDistributedLeads(prev => prev.filter(l => !discardedIds.has(l.id)));
      setLeadsDistributedToMe(prev => prev.filter(l => !discardedIds.has(l.id)));
      setDistributedLeadsMap(prev => {
        const copy = { ...prev };
        for (const [key, value] of Object.entries(copy)) {
          if (value && discardedIds.has((value as any).id)) {
            delete copy[key];
          }
        }
        return copy;
      });

      alert(`Exclusão concluída! ${discardedLeads.length} lead(s) descartado(s) foram excluídos definitivamente com sucesso.`);
    } catch (error) {
      console.error("Erro ao excluir leads descartados em lote:", error);
      alert("Ocorreu um erro ao excluir os leads descartados.");
    } finally {
      setBulkDeletingDiscardedLoading(false);
    }
  };

  // Handle reassigning an individual distributed lead to a new consultant
  const handleReassignDistributedLead = async () => {
    if (!leadToReassign || !reassignTargetMemberId || !currentPartner) return;
    const targetMember = teamMembers.find(m => m.id === reassignTargetMemberId);
    if (!targetMember) return;

    setReassigningLoading(true);
    try {
      const docRef = doc(db, "leads_distribuidos", leadToReassign.id);
      const reassignNote = {
        id: `note-${Date.now()}`,
        text: `Lead redirecionado por ${currentPartner.nome || "Master"} de "${leadToReassign.teamMemberNome || "Consultor Anterior"}" para "${targetMember.nome}".${reassignReason ? ` Motivo: ${reassignReason}` : ""}`,
        date: new Date().toISOString(),
        author: currentPartner.nome || "Master"
      };

      const existingHist = Array.isArray(leadToReassign.historico) ? leadToReassign.historico : [];
      const updatedHist = [...existingHist, reassignNote];

      await updateDoc(docRef, {
        teamMemberId: targetMember.id,
        teamMemberNome: targetMember.nome,
        status: "pendente", // Reset status to pending so new consultant acts on it
        dataRedirecionamento: new Date().toISOString(),
        redirecionadoPor: currentPartner.nome || "Master",
        historico: updatedHist
      });

      // Notify new consultant
      try {
        await createNotification(
          targetMember.id,
          "parceiro",
          "Novo Lead Redirecionado pelo Master",
          `O lead "${leadToReassign.nomeEmpresa}" foi transferido para a sua carteira para prospecção ativa.`,
          "info",
          "/?portal=parceiro"
        );
      } catch (err) {
        console.log("Notificação silenciosa:", err);
      }

      // Update local state
      setAllParentDistributedLeads(prev => prev.map(l => {
        if (l.id === leadToReassign.id) {
          return {
            ...l,
            teamMemberId: targetMember.id,
            teamMemberNome: targetMember.nome,
            status: "pendente",
            dataRedirecionamento: new Date().toISOString(),
            historico: updatedHist
          };
        }
        return l;
      }));

      // Update distributedLeadsMap
      setDistributedLeadsMap(prev => {
        const copy = { ...prev };
        const key = Object.keys(copy).find(k => copy[k].id === leadToReassign.id || k === `${leadToReassign.nomeEmpresa}_${leadToReassign.telefone || ""}`);
        if (key) {
          copy[key] = {
            ...copy[key],
            teamMemberName: targetMember.nome,
            date: new Date().toLocaleDateString("pt-BR"),
            status: "pendente"
          };
        }
        return copy;
      });

      setLeadToReassign(null);
      setReassignTargetMemberId("");
      setReassignReason("");
    } catch (err) {
      console.error("Erro ao redirecionar lead:", err);
    } finally {
      setReassigningLoading(false);
    }
  };

  // Handle bulk reassigning ALL leads from one consultant (to a specific consultant OR equally among other consultants)
  const handleBulkReassignConsultantLeads = async () => {
    if (!bulkReassignConsultantSource || !currentPartner) return;
    
    const otherMembers = teamMembers.filter(m => m.id !== bulkReassignConsultantSource.id);
    if (otherMembers.length === 0) return;

    if (bulkReassignMode === "single" && !bulkReassignTargetId) return;

    const sourceLeads = allParentDistributedLeads.filter(
      l => l.teamMemberId === bulkReassignConsultantSource.id && l.status !== "descartado"
    );

    if (sourceLeads.length === 0) {
      setBulkReassignConsultantSource(null);
      setBulkReassignTargetId("");
      return;
    }

    setBulkReassigningLoading(true);
    try {
      let memberIndex = 0;
      const countPerMember: Record<string, number> = {};

      for (const lead of sourceLeads) {
        const targetMember = bulkReassignMode === "single"
          ? otherMembers.find(m => m.id === bulkReassignTargetId)!
          : otherMembers[memberIndex % otherMembers.length];
        
        memberIndex++;
        countPerMember[targetMember.id] = (countPerMember[targetMember.id] || 0) + 1;

        const docRef = doc(db, "leads_distribuidos", lead.id);
        const reassignNote = {
          id: `note-${Date.now()}-${lead.id}`,
          text: `Transferência em lote de carteira${bulkReassignMode === "equal" ? " (Divisão Igualitária)" : ""}: lead transferido de "${bulkReassignConsultantSource.nome}" para "${targetMember.nome}" pelo Master.`,
          date: new Date().toISOString(),
          author: currentPartner.nome || "Master"
        };
        const existingHist = Array.isArray(lead.historico) ? lead.historico : [];
        const updatedHist = [...existingHist, reassignNote];

        await updateDoc(docRef, {
          teamMemberId: targetMember.id,
          teamMemberNome: targetMember.nome,
          status: "pendente",
          dataRedirecionamento: new Date().toISOString(),
          redirecionadoPor: currentPartner.nome || "Master",
          historico: updatedHist
        });

        // Update local state item
        setAllParentDistributedLeads(prev => prev.map(l => {
          if (l.id === lead.id) {
            return {
              ...l,
              teamMemberId: targetMember.id,
              teamMemberNome: targetMember.nome,
              status: "pendente",
              dataRedirecionamento: new Date().toISOString(),
              historico: updatedHist
            };
          }
          return l;
        }));

        setDistributedLeadsMap(prev => {
          const copy = { ...prev };
          const key = Object.keys(copy).find(k => copy[k].id === lead.id || k === `${lead.nomeEmpresa}_${lead.telefone || ""}`);
          if (key) {
            copy[key] = {
              ...copy[key],
              teamMemberName: targetMember.nome,
              date: new Date().toLocaleDateString("pt-BR"),
              status: "pendente"
            };
          }
          return copy;
        });
      }

      // Notify target member(s)
      for (const targetMember of otherMembers) {
        const receivedCount = countPerMember[targetMember.id] || 0;
        if (receivedCount > 0) {
          try {
            await createNotification(
              targetMember.id,
              "parceiro",
              "Leads Transferidos pelo Master",
              `Você recebeu ${receivedCount} leads transferidos da carteira de ${bulkReassignConsultantSource.nome} para prospecção ativa.`,
              "info",
              "/?portal=parceiro"
            );
          } catch (err) {
            console.log("Notificação silenciosa:", err);
          }
        }
      }

      setBulkReassignConsultantSource(null);
      setBulkReassignTargetId("");
      setBulkReassignMode("single");
    } catch (err) {
      console.error("Erro ao transferir carteira de leads em lote:", err);
    } finally {
      setBulkReassigningLoading(false);
    }
  };

  // Add a team member
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPartner) return;
    if (!teamMemberName || !teamMemberEmail || !teamMemberPhone || !teamMemberPassword) {
      setTeamError("Preencha todos os campos obrigatórios (*).");
      return;
    }

    if (teamMemberCPF && !validateCPF(teamMemberCPF)) {
      setTeamError("O CPF informado para o consultor é inválido.");
      return;
    }

    if (!validatePhone(teamMemberPhone)) {
      setTeamError("O WhatsApp informado para o consultor é inválido. Digite um número de telefone real com DDD.");
      return;
    }

    setAddingMember(true);
    setTeamError(null);
    setTeamSuccess(null);

    try {
      const normalizedEmail = teamMemberEmail.trim().toLowerCase();
      // Check email uniqueness
      const q = query(
        collection(db, "parceiros"),
        where("email", "==", normalizedEmail)
      );
      const checkSnapshot = await getDocs(q);
      if (!checkSnapshot.empty) {
        setTeamError("Este e-mail já está sendo utilizado por outro parceiro.");
        setAddingMember(false);
        return;
      }

      const newMemberDoc = {
        nome: teamMemberName,
        email: normalizedEmail,
        whatsapp: teamMemberPhone,
        cidade: currentPartner.cidade || "",
        cpf: teamMemberCPF,
        chavePix: teamMemberPix,
        senha: teamMemberPassword,
        plano: teamMemberPlan === "EXECUTIVE" ? "Consultor Executivo" : "Consultor Starter",
        status: "ativo",
        interesse: "ser parceiro",
        isTeamMember: true,
        parentPartnerId: currentPartner.id,
        parentPartnerNome: currentPartner.nome,
        dataCriacao: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "parceiros"), newMemberDoc);
      
      const createdMember: Partner = {
        id: docRef.id,
        ...newMemberDoc
      };

      // Update local state
      setTeamMembers(prev => [createdMember, ...prev]);
      setTeamSuccess("Consultor da equipe cadastrado com sucesso!");
      
      // Clear form
      setTeamMemberName("");
      setTeamMemberEmail("");
      setTeamMemberPhone("");
      setTeamMemberCPF("");
      setTeamMemberPix("");
      setTeamMemberPassword("");
      setTeamMemberPlan("STARTER");

      // Trigger simulation webhook for notification
      triggerWebhookSimulation("team_member_registration", {
        managerId: currentPartner.id,
        managerName: currentPartner.nome,
        memberId: docRef.id,
        memberName: teamMemberName,
        memberEmail: normalizedEmail
      });

    } catch (err) {
      console.error("Error registering team member:", err);
      setTeamError("Erro ao cadastrar membro da equipe. Tente novamente.");
    } finally {
      setAddingMember(false);
    }
  };

  // Fetch leads when authenticated
  const fetchPartnerLeads = async (partnerId: string) => {
    setFetchLoading(true);
    try {
      const q = query(
        collection(db, "leads"),
        where("parceiroId", "==", partnerId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      
      // Sort manually by date desc
      list.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
      setLeads(list);
    } catch (err) {
      console.error("Error fetching partner leads:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  // Fetch active announcements for the partner portal
  const fetchActiveAnnouncements = async (partnerPlan?: string) => {
    try {
      const q = query(
        collection(db, "comunicados"),
        where("ativo", "==", true),
        orderBy("dataCriacao", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];

      // Filter based on plan / audience
      const filtered = list.filter(ann => {
        if (ann.publicoAlvo === "todos") return true;
        
        const plan = (partnerPlan || "").toUpperCase();
        const isFranq = plan.includes("FRANQUIA") || plan.includes("DIGITAL") || plan.includes("PLATINUM");
        const isExec = plan.includes("EXECUTIVE");
        
        if (ann.publicoAlvo === "franquia" && isFranq) return true;
        if (ann.publicoAlvo === "executive" && isExec) return true;
        if (ann.publicoAlvo === "agent" && !isFranq && !isExec) return true;
        
        return false;
      });

      setAnnouncements(filtered);

      // Check if there is any announcement that hasn't been closed in this session
      const unseen = filtered.find(ann => {
        return sessionStorage.getItem(`announcement_seen_${ann.id}`) !== "true";
      });

      if (unseen) {
        setCurrentAnnouncementShow(unseen);
      }
    } catch (err) {
      console.warn("Could not load announcements for partner:", err);
    }
  };

  const handleCloseAnnouncement = (annId: string) => {
    sessionStorage.setItem(`announcement_seen_${annId}`, "true");
    setCurrentAnnouncementShow(null);
  };

  const fetchPartnerRefills = async (partnerId: string) => {
    try {
      const q = query(
        collection(db, "recargas"),
        where("partnerId", "==", partnerId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      list.sort((a: any, b: any) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
      setMyRefills(list);
    } catch (err) {
      console.error("Erro ao buscar recargas do parceiro:", err);
    }
  };

  const handleNotifyCacaLeadsRefill = async () => {
    if (!currentPartner?.id) return;

    setRefillSubmitting(true);

    const packDetails = {
      Bronze: { buscas: 10, valor: 59.90 },
      Prata: { buscas: 30, valor: 129.90 },
      Ouro: { buscas: 60, valor: 239.90 }
    }[refillPackage];

    try {
      await addDoc(collection(db, "recargas"), {
        partnerId: currentPartner.id,
        partnerNome: currentPartner.nome || "Parceiro",
        partnerWhatsapp: currentPartner.whatsapp || "N/A",
        pacote: refillPackage,
        tipo: "caca_leads",
        buscas: packDetails.buscas,
        valor: packDetails.valor,
        status: "pendente",
        dataSolicitacao: new Date().toISOString(),
        dataAprovacao: null
      });

      setRefillNotifySuccess(true);
      fetchPartnerRefills(currentPartner.id);
    } catch (err) {
      console.error("Erro ao solicitar recarga do Caça-Leads:", err);
      alert("Erro ao enviar notificação de recarga.");
    } finally {
      setRefillSubmitting(false);
    }
  };

  // Callback to capture lead through Simulador inside Partner Portal
  const handlePartnerSimulatorLeadCaptured = async (lead: LeadData & { id: string; result: SimulationResult }) => {
    if (!currentPartner) return;
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
        parceiroId: currentPartner.id,
        parceiroNome: currentPartner.nome
      };

      await setDoc(doc(db, "leads", lead.id), leadDoc);

      // If registered from distributed lead, update distributed lead doc
      if (selectedLeadForRegistration?.id) {
        try {
          const distDocRef = doc(db, "leads_distribuidos", selectedLeadForRegistration.id);
          await updateDoc(distDocRef, { status: "convertido", leadId: lead.id });
          fetchLeadsDistributedToMe(currentPartner.id);
        } catch (e) {
          console.warn("Non-fatal: could not update distributed lead status:", e);
        }
      }

      await fetchPartnerLeads(currentPartner.id);
      createNotification(
        currentPartner.id,
        "parceiro",
        "Novo Lead Cadastrado",
        `O lead ${lead.razaoSocial || lead.nomeCompleto} foi cadastrado com sucesso via Simulador.`,
        "success"
      );
    } catch (error) {
      console.error("Erro ao salvar lead capturado no Simulador:", error);
      handleFirestoreError(error, OperationType.WRITE, `leads/${lead.id}`);
    }
  };

  // Fetch search history for Caça-Leads (limited to 5)
  const fetchHuntSearchHistory = async (partnerId: string) => {
    if (!partnerId) return;
    try {
      // 1. Instant load from local storage
      const cached = localStorage.getItem(`caca_leads_history_${partnerId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setCacaLeadsHistory(parsed.slice(0, 5));
          }
        } catch (e) {
          console.warn("Error parsing cached hunt history:", e);
        }
      }

      // 2. Fetch from Firestore for cross-device sync
      setHuntHistoryLoading(true);
      const q = query(
        collection(db, "historico_buscas_caca_leads"),
        where("partnerId", "==", partnerId),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      const list: CacaLeadsSearchHistoryItem[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as CacaLeadsSearchHistoryItem);
      });

      if (list.length > 0) {
        setCacaLeadsHistory(list.slice(0, 5));
        localStorage.setItem(`caca_leads_history_${partnerId}`, JSON.stringify(list.slice(0, 5)));
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de buscas do Caça-Leads:", err);
    } finally {
      setHuntHistoryLoading(false);
    }
  };

  // Restore a previous search from history without consuming new credits or API calls
  const handleRestoreHuntHistory = (item: CacaLeadsSearchHistoryItem) => {
    setHuntKeyword(item.keyword);
    setHuntCity(item.city);
    setHuntState(item.state || "");
    setHuntLimit(item.limit || 60);
    setHuntResults(item.results || []);
    setHuntNextPageToken(item.nextPageToken || null);
    setSelectedHuntPlaces([]);
    setHuntError(null);
    setShowHistoryDrawer(false);

    // Scroll to results if present
    setTimeout(() => {
      const el = document.getElementById("caca-leads-results-area");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  };

  // Delete a single search history item
  const handleDeleteHuntHistory = async (historyId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentPartner) return;

    setCacaLeadsHistory(prev => {
      const updated = prev.filter(h => h.id !== historyId);
      localStorage.setItem(`caca_leads_history_${currentPartner.id}`, JSON.stringify(updated));
      return updated;
    });

    try {
      const docRef = doc(db, "historico_buscas_caca_leads", historyId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Erro ao excluir busca do histórico:", err);
    }
  };

  // Clear all search history for this partner
  const handleClearAllHuntHistory = async () => {
    if (!currentPartner) return;
    setCacaLeadsHistory([]);
    localStorage.removeItem(`caca_leads_history_${currentPartner.id}`);

    try {
      const q = query(
        collection(db, "historico_buscas_caca_leads"),
        where("partnerId", "==", currentPartner.id)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (err) {
      console.error("Erro ao limpar histórico do Caça-Leads:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentPartner) {
      fetchPartnerLeads(currentPartner.id);
      fetchActiveAnnouncements(currentPartner.plano);
      fetchPartnerRefills(currentPartner.id);
      fetchHuntSearchHistory(currentPartner.id);
      if (isFranquiaDigital(currentPartner.plano)) {
        fetchTeamDetails(currentPartner.id);
        fetchDistributedLeads(currentPartner.id);
      }
      if (isSubMember) {
        fetchLeadsDistributedToMe(currentPartner.id);
      }
      if (isEligibleForAffiliates(currentPartner.plano)) {
        fetchReferredPartners(currentPartner.id);
      }
      // Initialize limit states
      setCacaLeadsCount(currentPartner.cacaLeadsCount || 0);
      setCacaLeadsLastDate(currentPartner.cacaLeadsLastDate || "");
      // Keep search boxes empty on load as requested by user
    }
  }, [isAuthenticated, currentPartner]);

  const handleHuntLeads = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!huntKeyword.trim() || !huntCity.trim()) {
      setHuntError("Por favor, preencha o ramo/segmento e a cidade para realizar a busca.");
      return;
    }

    // All searches are via refills (credits)
    const credits = currentPartner?.cacaLeadsCredits || 0;

    if (credits <= 0) {
      setHuntError("Você não possui saldo de buscas no Caça-Leads. Adquira um pacote de recargas (Bronze, Prata ou Ouro) para realizar pesquisas em tempo real.");
      return;
    }

    setHuntLoading(true);
    setHuntError(null);
    setHuntResults([]);
    setHuntNextPageToken(null);

    try {
      let finalResults: any[] = [];
      let nextPageTokenVal: string | null = null;

      try {
        const response = await fetch("/api/caca-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: huntKeyword.trim(),
            city: huntCity.trim(),
            state: huntState,
            limit: huntLimit
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao consultar a API de caça-leads.");
        }

        finalResults = data.results || [];
        nextPageTokenVal = data.nextPageToken || null;
      } catch (apiErr) {
        console.warn("Express API failed, running client-side Google Places search...", apiErr);
        const csData = await executeCacaLeadsClientSide(huntKeyword.trim(), huntCity.trim(), huntLimit);
        finalResults = csData.results || [];
        nextPageTokenVal = csData.nextPageToken || null;
      }

      // Filter out seen leads for this partner to prevent duplicates
      let seenKeys = new Set<string>();
      if (currentPartner) {
        try {
          const qSeen = query(
            collection(db, "leads_vistos_parceiro"),
            where("partnerId", "==", currentPartner.id)
          );
          const seenSnap = await getDocs(qSeen);
          seenSnap.docs.forEach(d => {
            const val = d.data().key;
            if (val) seenKeys.add(val);
          });
        } catch (seenErr) {
          console.error("Erro ao carregar leads já visualizados:", seenErr);
        }
      }

      const filteredResults = finalResults.filter((place: any) => {
        const key = `${place.nome}_${place.telefone || ""}`;
        return !seenKeys.has(key);
      });

      if (filteredResults.length === 0) {
        if (finalResults.length > 0) {
          setHuntError("A sua busca retornou apenas empresas que você já visualizou em consultas anteriores. Nenhuma nova empresa foi consumida do seu limite!");
        } else {
          setHuntError("Nenhum resultado novo encontrado para esta busca na região informada.");
        }
        setHuntResults([]);
      } else {
        // Save newly seen leads
        if (currentPartner) {
          try {
            const batchPromises = filteredResults.map((place: any) => {
              const key = `${place.nome}_${place.telefone || ""}`;
              return addDoc(collection(db, "leads_vistos_parceiro"), {
                partnerId: currentPartner.id,
                key,
                nome: place.nome,
                telefone: place.telefone || "",
                dataVisto: new Date().toISOString()
              });
            });
            await Promise.all(batchPromises);
          } catch (saveErr) {
            console.error("Erro ao salvar leads vistos:", saveErr);
          }
        }

        setHuntResults(filteredResults);
        setHuntNextPageToken(nextPageTokenVal);

        // Save search to history (keeping max 5 items to keep database light)
        if (currentPartner) {
          const newHistoryItem: CacaLeadsSearchHistoryItem = {
            id: `hunt-${Date.now()}`,
            partnerId: currentPartner.id,
            keyword: huntKeyword.trim(),
            city: huntCity.trim(),
            state: huntState || "",
            limit: huntLimit,
            totalResults: filteredResults.length,
            timestamp: new Date().toISOString(),
            results: filteredResults,
            nextPageToken: nextPageTokenVal || null
          };

          // Update local state and localStorage
          setCacaLeadsHistory(prev => {
            const filtered = prev.filter(
              h => !(h.keyword.toLowerCase() === newHistoryItem.keyword.toLowerCase() && 
                     h.city.toLowerCase() === newHistoryItem.city.toLowerCase())
            );
            const updated = [newHistoryItem, ...filtered].slice(0, 5);
            try {
              localStorage.setItem(`caca_leads_history_${currentPartner.id}`, JSON.stringify(updated));
            } catch (e) {
              console.warn("Storage quota exceeded or storage error:", e);
            }
            return updated;
          });

          // Save to Firestore and prune older searches beyond 5
          try {
            await addDoc(collection(db, "historico_buscas_caca_leads"), newHistoryItem);
            
            // Clean up older items beyond 5
            const qAll = query(
              collection(db, "historico_buscas_caca_leads"),
              where("partnerId", "==", currentPartner.id),
              orderBy("timestamp", "desc")
            );
            const snapAll = await getDocs(qAll);
            if (snapAll.docs.length > 5) {
              const toDelete = snapAll.docs.slice(5);
              for (const docToDelete of toDelete) {
                await deleteDoc(docToDelete.ref);
              }
            }
          } catch (histErr) {
            console.error("Erro ao persistir histórico de busca no Firestore:", histErr);
          }
        }

        // Deduct 1 search credit from partner balance
        const newCredits = Math.max(0, credits - 1);

        if (currentPartner) {
          try {
            const partnerDocRef = doc(db, "parceiros", currentPartner.id);
            await updateDoc(partnerDocRef, {
              cacaLeadsCredits: newCredits
            });

            const updatedPartner = {
              ...currentPartner,
              cacaLeadsCredits: newCredits
            };
            setCurrentPartner(updatedPartner);
            sessionStorage.setItem("partner_data", JSON.stringify(updatedPartner));
          } catch (dbErr) {
            console.error("Error updating credits in DB:", dbErr);
          }
        }
      }
    } catch (err: any) {
      console.error("Error hunting leads:", err);
      setHuntError(err.message || "Erro ao conectar ao serviço de busca de leads. Tente novamente.");
    } finally {
      setHuntLoading(false);
    }
  };

  // Handle loading next page from Google Places API
  const handleLoadNextPage = async () => {
    if (!huntNextPageToken || loadingNextPage) return;

    setLoadingNextPage(true);
    try {
      const response = await fetch("/api/caca-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: huntKeyword.trim(),
          city: huntCity.trim(),
          state: huntState,
          limit: 20,
          pageToken: huntNextPageToken
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar a próxima página de resultados.");
      }

      const newPlaces = data.results || [];
      const updatedToken = data.nextPageToken || null;

      let existingKeys = new Set(huntResults.map(p => `${p.nome}_${p.telefone || ""}`));
      const freshLeads = newPlaces.filter((p: any) => !existingKeys.has(`${p.nome}_${p.telefone || ""}`));

      setHuntResults(prev => [...prev, ...freshLeads]);
      setHuntNextPageToken(updatedToken);
    } catch (err: any) {
      console.error("Error loading next page:", err);
      alert(err.message || "Erro ao carregar próxima página de resultados.");
    } finally {
      setLoadingNextPage(false);
    }
  };

  // Handle CNPJ lookup / Receita Federal enrichment with 1-click auto-discovery
  const handleFetchCnpj = async (place: any, cnpjInput?: string) => {
    const placeId = place.id || place.distributedLeadId || `place-${Date.now()}`;

    // If we already have the CNPJ details cached for this place, open modal directly
    if (!cnpjInput && cnpjDetailsMap[placeId]) {
      setActiveCnpjModal({ place, details: cnpjDetailsMap[placeId] });
      return;
    }
    if (!cnpjInput && place.cnpjDetails) {
      setActiveCnpjModal({ place, details: place.cnpjDetails });
      return;
    }

    const cleanCnpj = cnpjInput ? cnpjInput.replace(/\D/g, "") : (place.cnpj ? place.cnpj.replace(/\D/g, "") : "");

    setCnpjQueryLoading(prev => ({ ...prev, [placeId]: true }));
    try {
      const response = await fetch("/api/consulta-cnpj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: cleanCnpj.length === 14 ? cleanCnpj : undefined,
          nomeEmpresa: place.nome || place.nomeEmpresa,
          cidade: place.cidade || huntCity,
          estado: place.estado || huntState,
          endereco: place.endereco,
          website: place.website
        })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Non-JSON response from /api/consulta-cnpj:", responseText);
        throw new Error("Não foi possível conectar ao serviço de consulta do CNPJ. Tente novamente em instantes.");
      }

      if (!response.ok || !data.success) {
        if (data.needManualInput) {
          setCnpjInputModal({
            place,
            inputCnpj: "",
            error: data.error || "Não encontramos o CNPJ automaticamente para este local. Informe o CNPJ manualmente para visualizar a Ficha Oficial."
          });
          return;
        }
        throw new Error(data.error || "Erro ao consultar dados da empresa na Receita Federal.");
      }

      // Success - Save details and open Ficha Modal automatically!
      setCnpjDetailsMap(prev => ({ ...prev, [placeId]: data }));
      setActiveCnpjModal({ place, details: data });
      setCnpjInputModal(null);

      // If this is a distributed lead, update the document in Firestore so consultant keeps CNPJ saved
      if (place.distributedLeadId) {
        try {
          const docRef = doc(db, "leads_distribuidos", place.distributedLeadId);
          await updateDoc(docRef, {
            cnpj: data.cnpj,
            cnpjDetails: data
          });
          setLeadsDistributedToMe(prev => prev.map(l => l.id === place.distributedLeadId ? { ...l, cnpj: data.cnpj, cnpjDetails: data } : l));
        } catch (dbErr) {
          console.warn("Erro ao atualizar CNPJ do lead distribuído:", dbErr);
        }
      }
    } catch (err: any) {
      console.error("Erro ao consultar CNPJ:", err);
      if (cnpjInputModal) {
        setCnpjInputModal(prev => prev ? { ...prev, error: err.message } : null);
      } else {
        alert(err.message || "Erro ao consultar dados do CNPJ.");
      }
    } finally {
      setCnpjQueryLoading(prev => ({ ...prev, [placeId]: false }));
    }
  };

  // Handle lead creation with partners data directly from simulator
  const handleCreateLeadWithSocios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPartner) return;
    
    setRegLeadError(null);
    setRegLeadSuccess(null);

    // Validate main lead details
    if (!leadNome.trim() || !leadWhatsapp.trim() || !leadEmail.trim() || !leadCnpj.trim() || !leadRazaoSocial.trim() || !leadRamo.trim()) {
      setRegLeadError("Por favor, preencha todos os campos obrigatórios da empresa e contato.");
      return;
    }

    if (!validateCNPJ(leadCnpj)) {
      setRegLeadError("O CNPJ informado é inválido. Por favor, verifique os números digitados.");
      return;
    }

    if (!validatePhone(leadWhatsapp)) {
      setRegLeadError("O WhatsApp de contato informado é inválido. Por favor, digite um número de telefone real com DDD.");
      return;
    }

    // Validate Socio 1
    if (!socio1Nome.trim() || !socio1Cpf.trim() || !socio1Birth.trim() || !socio1Mae.trim() || !socio1Telefone.trim() || !socio1Rg.trim() || !socio1Orgao.trim()) {
      setRegLeadError("Por favor, preencha todos os campos obrigatórios do Sócio Principal.");
      return;
    }

    if (!validateCPF(socio1Cpf)) {
      setRegLeadError("O CPF do Sócio Principal informado é inválido.");
      return;
    }

    if (!validatePhone(socio1Telefone)) {
      setRegLeadError("O Telefone do Sócio Principal informado é inválido. Digite um número de telefone real com DDD.");
      return;
    }

    // Validate Address
    if (!endCep.trim() || !endLogradouro.trim() || !endNumero.trim() || !endBairro.trim() || !endCidade.trim() || !endUf.trim()) {
      setRegLeadError("Por favor, preencha todos os campos obrigatórios do endereço.");
      return;
    }

    // Validate Socio 2 if enabled
    if (hasSocio2) {
      if (!socio2Nome.trim() || !socio2Cpf.trim() || !socio2Birth.trim() || !socio2Telefone.trim() || !socio2Participacao.trim()) {
        setRegLeadError("Por favor, preencha todos os campos do Segundo Sócio ou desative a opção.");
        return;
      }
      if (!validateCPF(socio2Cpf)) {
        setRegLeadError("O CPF do Segundo Sócio informado é inválido.");
        return;
      }
      if (!validatePhone(socio2Telefone)) {
        setRegLeadError("O Telefone do Segundo Sócio informado é inválido. Digite um número de telefone real com DDD.");
        return;
      }
    }

    setRegLeadLoading(true);

    try {
      const docId = "PRF-" + Math.floor(100000 + Math.random() * 900000);
      const valFaturamento = parseFloat(leadFaturamento) || 0;
      const valCapital = parseFloat(leadCapitalSocial) || 0;
      const valMediaReceita = parseFloat(leadMediaReceitaMensal) || 0;

      // Calculate estimate via PROSFEC IA with local fallback
      let calculatedLimit = 0;
      let creditLineCode = "PRONAMPE";
      let creditLineName = "PRONAMPE (Programa Nacional de Apoio às Microempresas)";
      let rate = 16.5;
      let carencia = 12;
      let prazo = 48;
      let justificativa = "Enquadramento automático na linha federal de fomento.";
      let fonte = "Heuristic Engine";

      try {
        const simResponse = await fetch("/api/credit/diagnostico-simulador", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cnpj: leadCnpj.replace(/\D/g, ""),
            razaoSocial: leadRazaoSocial || "Empresa Consultada",
            porte: leadPorte,
            uf: endCep ? endUf : "SP",
            ramo: leadRamo || "Geral / Comércio",
            menosDe12Meses: leadMenosDe12Meses,
            capitalSocial: valCapital,
            mediaReceitaMensal: valMediaReceita,
            faturamentoAnual: valFaturamento,
            seloEmpregaMulher: false
          })
        });
        if (simResponse.ok) {
          const simData = await simResponse.json();
          if (simData.success) {
            calculatedLimit = simData.recommendedLimit;
            creditLineCode = simData.creditLineCode;
            creditLineName = simData.creditLineName;
            rate = simData.rate;
            carencia = simData.carencia;
            prazo = simData.prazo;
            justificativa = simData.justificativa;
            fonte = simData.fonte || "PROSFEC IA";
          }
        }
      } catch (simErr) {
        console.warn("Fomento simulation failed during manual lead registration, falling back:", simErr);
      }

      if (calculatedLimit <= 0) {
        if (leadMenosDe12Meses) {
          const opt1 = valCapital * 0.5;
          const opt2 = (valMediaReceita * 12) * 0.5;
          calculatedLimit = Math.max(opt1, opt2);
        } else {
          calculatedLimit = valFaturamento * 0.3;
        }
        calculatedLimit = Math.min(calculatedLimit, 500000);
      }

      // Prep score eligibility
      let prepScore: "alto" | "medio" | "baixo" = "alto";
      const alerts: string[] = [];
      const recs: string[] = [];

      if (leadPorte === "MEI" && valFaturamento > 81000) {
        prepScore = "baixo";
        alerts.push(`Faturamento de ${formatCurrencyBRL(valFaturamento)} ultrapassa o limite legal anual de R$ 81.000,00 para MEI.`);
        recs.push("Será preciso solicitar o desenquadramento de MEI e migrar para ME (Microempresa) antes de protocolar o Pronampe.");
      } else if (leadPorte === "ME" && valFaturamento > 360000) {
        prepScore = "medio";
        alerts.push(`Faturamento de ${formatCurrencyBRL(valFaturamento)} excede o limite de R$ 360.000,00 para Microempresa.`);
        recs.push("Sua empresa se enquadra na faixa de EPP (Empresa de Pequeno Porte). Nós ajudamos você no reenquadramento e upgrade tributário.");
      } else if (leadPorte === "EPP" && valFaturamento > 4800000) {
        prepScore = "baixo";
        alerts.push(`Faturamento de ${formatCurrencyBRL(valFaturamento)} excede o teto legal de R$ 4,8 milhões para EPP.`);
        recs.push("O Pronampe é restrito a empresas com receita de até R$ 4,8M. Fale com nossa assessoria para outras linhas corporativas específicas.");
      }

      if (leadMenosDe12Meses) {
        if (prepScore === "alto") prepScore = "medio";
        alerts.push("Empresa aberta há menos de 12 meses possui regras de limite proporcional diferenciadas conforme regulamento do Pronampe.");
        recs.push("Apresentaremos balancete de abertura assinado pelo contador para comprovação de aporte de capital social.");
      }

      if (alerts.length === 0) {
        alerts.push("CNPJ regularizado e limpo! Excelente elegibilidade para liberação rápida de crédito.");
        recs.push("Para agilizar a liberação, faça o login com sua conta gov.br Ouro/Prata e configure o compartilhamento de dados no portal da Receita Federal.");
        recs.push("Fale com nossos consultores para identificar os bancos parceiros que possuem taxas promocionais ativas hoje.");
      }

      const sociosList = [
        {
          nome: socio1Nome,
          cpf: socio1Cpf,
          dataNascimento: socio1Birth,
          participacao: parseFloat(socio1Participacao) || 100,
          nomeMae: socio1Mae,
          telefone: socio1Telefone,
          rg: socio1Rg,
          orgaoEmissor: socio1Orgao,
          cargo: "Sócio Administrador"
        }
      ];

      if (hasSocio2 && socio2Nome && socio2Cpf) {
        sociosList.push({
          nome: socio2Nome,
          cpf: socio2Cpf,
          dataNascimento: socio2Birth,
          participacao: parseFloat(socio2Participacao) || 0,
          nomeMae: "",
          telefone: socio2Telefone,
          rg: "",
          orgaoEmissor: "",
          cargo: "Sócio"
        });
      }

      const endPrincipal = {
        cep: endCep,
        logradouro: endLogradouro,
        numero: endNumero,
        bairro: endBairro,
        cidade: endCidade,
        uf: endUf,
        complemento: endComplemento
      };

      const newLeadDoc = {
        nome: leadNome,
        whatsapp: leadWhatsapp,
        email: leadEmail,
        cnpj: leadCnpj,
        cidade: endCidade || "Não informado",
        interesse: "simulação",
        status: "novo",
        etapa: 3, // Directly starts at stage 3 because partners details are completed!
        dataCriacao: new Date().toISOString(),
        razaoSocial: leadRazaoSocial,
        porte: leadPorte,
        dataAbertura: "",
        ramo: leadRamo,
        menosDe12Meses: leadMenosDe12Meses,
        capitalSocial: valCapital,
        mediaReceitaMensal: valMediaReceita,
        faturamentoAnual: valFaturamento,
        cargo: "Sócio-Diretor",
        situacaoCadastral: "Ativa",
        possuiDeclaracaoFaturamento: true,
        autorizaCompartilhamentoEcac: true,
        possuiRestricaoSerasa: false,
        possuiDividasTributarias: false,
        bancoPrincipal: leadBancoPrincipal,
        objetivoRecurso: "Capital de Giro",
        tempoParaCaptacao: "Imediato",
        limiteEstimado: calculatedLimit,
        nivelPreparacao: prepScore,
        principaisAlertas: alerts,
        recomendações: recs,
        parceiroId: currentPartner.id,
        parceiroNome: currentPartner.nome,
        socios: sociosList,
        enderecoSocioPrincipal: endPrincipal,
        creditLineCode: creditLineCode,
        creditLineName: creditLineName,
        propostaNegociada: {
          valorDesejado: calculatedLimit,
          carenciaMeses: carencia,
          amortizacaoMeses: (prazo - carencia) > 0 ? (prazo - carencia) : 36,
          sistemaAmortizacao: "SAC",
          taxaAnual: rate,
          pagarJurosCarencia: false,
          creditLineCode: creditLineCode,
          creditLineName: creditLineName,
          justificativa: justificativa,
          fonte: fonte,
          dataSimulacao: new Date().toISOString()
        }
      };

      // Create document in Firestore
      await setDoc(doc(db, "leads", docId), newLeadDoc);

      // Trigger Webhook
      triggerWebhookSimulation("lead_simulation_completed", {
        ...newLeadDoc,
        id: docId,
        result: {
          limiteEstimado: calculatedLimit,
          nivelPreparacao: prepScore,
          principaisAlertas: alerts,
          recomendações: recs,
          creditLineCode: creditLineCode,
          creditLineName: creditLineName,
          rate: rate,
          carencia: carencia,
          prazo: prazo,
          justificativa: justificativa,
          fonte: fonte
        }
      });

      setRegLeadSuccess(`Sucesso! Lead ${leadRazaoSocial} registrado e qualificado no portal PROSFEC na Etapa 3. ID: ${docId}`);
      setRegisteredLeadId(docId);
      setShowLeadRegisterForm(false);
      
      // Reset form fields
      setLeadNome("");
      setLeadWhatsapp("");
      setLeadEmail("");
      setLeadCnpj("");
      setLeadRazaoSocial("");
      setLeadFaturamento("");
      setLeadRamo("");
      setLeadMenosDe12Meses(false);
      setLeadCapitalSocial("");
      setLeadMediaReceitaMensal("");
      setSocio1Nome("");
      setSocio1Cpf("");
      setSocio1Birth("");
      setSocio1Mae("");
      setSocio1Telefone("");
      setSocio1Rg("");
      setSocio1Orgao("");
      setSocio1Participacao("100");
      setHasSocio2(false);
      setSocio2Nome("");
      setSocio2Cpf("");
      setSocio2Birth("");
      setSocio2Telefone("");
      setSocio2Participacao("");
      setEndCep("");
      setEndLogradouro("");
      setEndNumero("");
      setEndBairro("");
      setEndCidade("");
      setEndUf("SP");
      setEndComplemento("");

      // Refresh partner leads
      await fetchPartnerLeads(currentPartner.id);
    } catch (err) {
      console.error("Error creating lead with partners:", err);
      setRegLeadError("Erro ao registrar a ficha de crédito. Por favor, tente novamente.");
    } finally {
      setRegLeadLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const q = query(
        collection(db, "parceiros"),
        where("email", "==", normalizedEmail)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setErrorMsg("Nenhum parceiro encontrado com este e-mail.");
        setLoading(false);
        return;
      }

      // Find partner matching password
      let matchedPartner: any = null;
      for (const d of snapshot.docs) {
        const data = d.data();
        if (data.senha === loginPassword) {
          matchedPartner = {
            id: d.id,
            ...data
          };
          break;
        }
      }

      if (!matchedPartner) {
        setErrorMsg("Senha incorreta. Por favor, tente novamente.");
        setLoading(false);
        return;
      }

      // Check consultant 3-day inactivity rule and general status
      const isSubordinate = !!matchedPartner.parentPartnerId || matchedPartner.isTeamMember === true || (matchedPartner.plano && (matchedPartner.plano.toUpperCase().includes("CONSULTOR") || matchedPartner.plano.toUpperCase().includes("EQUIPE")));
      
      const lastActiveStr = matchedPartner.dataUltimoAcesso || matchedPartner.dataCriacao;
      let isInactiveDueToInactivity = false;
      let diffDaysInactive = 0;

      if (isSubordinate && lastActiveStr) {
        const lastActiveTime = new Date(lastActiveStr).getTime();
        const now = new Date().getTime();
        const diffMs = Math.max(0, now - lastActiveTime);
        diffDaysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDaysInactive >= 3) {
          isInactiveDueToInactivity = true;
        }
      }

      if (matchedPartner.status === "inativo" || isInactiveDueToInactivity) {
        if (isSubordinate) {
          if (matchedPartner.status !== "inativo") {
            try {
              await updateDoc(doc(db, "parceiros", matchedPartner.id), {
                status: "inativo",
                inativoPorInatividade: true,
                motivoInativacao: `Inatividade de ${diffDaysInactive} dias sem acesso ao sistema`
              });
            } catch (upErr) {
              console.error("Error auto-updating inactive status on login:", upErr);
            }
          }
          const masterNameText = matchedPartner.parentPartnerNome ? `com a sua Franquia Master (${matchedPartner.parentPartnerNome})` : "com o seu Franqueado Master";
          setErrorMsg(`Sua conta de consultor está INATIVA por ter ultrapassado 3 dias sem acesso ao sistema. Entre em contato ${masterNameText} para reativar seu acesso.`);
        } else {
          setErrorMsg("Sua conta de parceiro está inativa. Entre em contato com o suporte da PROSFEC.");
        }
        setLoading(false);
        return;
      }

      // Record fresh last login / access timestamp in Firestore
      const nowIso = new Date().toISOString();
      try {
        await updateDoc(doc(db, "parceiros", matchedPartner.id), {
          dataUltimoAcesso: nowIso
        });
        matchedPartner.dataUltimoAcesso = nowIso;
      } catch (errUp) {
        console.warn("Could not update dataUltimoAcesso on login:", errUp);
      }

      // Save session
      sessionStorage.setItem("partner_authenticated", "true");
      sessionStorage.setItem("partner_data", JSON.stringify(matchedPartner));
      setCurrentPartner(matchedPartner);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg("Ocorreu um erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate fields
    if (!regName || !regEmail || !regPassword || !regConfirmPassword) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (!regAcceptedTerms) {
      setErrorMsg("Você deve ler e aceitar os Termos de Uso e Regulamentos.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = regEmail.trim().toLowerCase();
      
      // Check if email already registered
      const q = query(
        collection(db, "parceiros"),
        where("email", "==", normalizedEmail)
      );
      const checkSnapshot = await getDocs(q);
      if (!checkSnapshot.empty) {
        setErrorMsg("Este e-mail já está sendo utilizado por outro parceiro.");
        setLoading(false);
        return;
      }

      // Add to database with referral tracking if available
      const rawSavedRefId = localStorage.getItem("lca_referred_by") || "";
      const savedRefId = rawSavedRefId.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, "").trim();
      const savedRefNome = localStorage.getItem("lca_referred_by_nome") || "";

      const isAfiliado = regPlan === "AFILIADO";

      const newPartnerDoc = {
        nome: regName,
        email: normalizedEmail,
        whatsapp: regPhone || "",
        cidade: regCityUF || "",
        cpf: regCPF || "",
        dataNascimento: regBirthDate || "",
        chavePix: regPix || "",
        plano: regPlan,
        senha: regPassword, // Stored securely in Firestore
        aceitouTermos: regAcceptedTerms,
        status: isAfiliado ? "ativo" : "novo",
        interesse: "ser parceiro",
        isTeamMember: false,
        dataCriacao: new Date().toISOString(),
        parentPartnerId: savedRefId,
        parentPartnerNome: savedRefNome
      };

      const docRef = await addDoc(collection(db, "parceiros"), newPartnerDoc);
      const createdPartner: Partner = {
        id: docRef.id,
        ...newPartnerDoc
      };

      // Trigger Webhook/CRM Simulation
      triggerWebhookSimulation("partner_registration", {
        id: docRef.id,
        name: regName,
        email: normalizedEmail,
        phone: regPhone,
        plan: regPlan,
        city: regCityUF,
      });

      // Clear register form
      setRegName("");
      setRegCPF("");
      setRegBirthDate("");
      setRegCityUF("");
      setRegPix("");
      setRegEmail("");
      setRegPhone("");
      setRegPassword("");
      setRegConfirmPassword("");
      setRegAcceptedTerms(false);

      setRegisteredPartnerPlan(regPlan);
      if (isAfiliado) {
        setSuccessMsg("Cadastro realizado com sucesso! Como parceiro AFILIADO, o seu painel de repasses já está ativo e pronto para uso de forma totalmente gratuita. Clique no botão abaixo para fazer login e começar a indicar!");
      } else {
        setSuccessMsg(`Parabéns pela sua iniciativa! O seu cadastro foi realizado com sucesso. Para comemorar sua decisão, liberamos um período de teste gratuito de 3 dias para você explorar a plataforma, simular operações, cadastrar leads e testar todos os recursos de imediato! Clique no botão abaixo para fazer login e iniciar.`);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, "parceiros");
      } catch (fErr) {
        setErrorMsg("Erro ao salvar cadastro de parceiro no banco de dados. Por favor, tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("partner_authenticated");
    sessionStorage.removeItem("partner_data");
    setCurrentPartner(null);
    setIsAuthenticated(false);
  };

  const copyReferralLink = () => {
    if (!currentPartner) return;
    const domain = window.location.hostname.includes("prosfec.com.br") 
      ? window.location.origin 
      : "https://prosfec.com.br";
    const link = `${domain}?ref=${currentPartner.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenLeadWorkspace = (lead: Lead, tab: "details" | "socios" | "simulador" | "diagnostico" | "contrato" | "credenciais" | "acompanhamento" = "details") => {
    const stepStatus = calculateLeadStepStatus(lead);
    let targetTab = tab;
    if (!stepStatus.isTabUnlocked(tab)) {
      targetTab = "details";
    }

    setSelectedLeadForWorkspace(lead);
    setWorkspaceTab(targetTab as any);
    
    // Set simulator default values from the lead
    setAdvValor(lead.limiteEstimado || 150000);
    
    // Set socio editing states from the lead
    const mainSocio = lead.socios?.[0] || null;
    const socio2 = lead.socios?.[1] || null;
    const addr = lead.enderecoSocioPrincipal || null;
    
    setEditSocio1Nome(mainSocio?.nome || "");
    setEditSocio1Cpf(mainSocio?.cpf || "");
    setEditSocio1Birth(mainSocio?.dataNascimento || "");
    setEditSocio1Mae(mainSocio?.nomeMae || "");
    setEditSocio1Telefone(mainSocio?.telefone || "");
    setEditSocio1Rg(mainSocio?.rg || "");
    setEditSocio1Orgao(mainSocio?.orgaoEmissor || "");
    setEditSocio1Participacao(mainSocio?.participacao?.toString() || "100");
    
    if (socio2) {
      setEditHasSocio2(true);
      setEditSocio2Nome(socio2.nome || "");
      setEditSocio2Cpf(socio2.cpf || "");
      setEditSocio2Birth(socio2.dataNascimento || "");
      setEditSocio2Telefone(socio2.telefone || "");
      setEditSocio2Participacao(socio2.participacao?.toString() || "");
    } else {
      setEditHasSocio2(false);
      setEditSocio2Nome("");
      setEditSocio2Cpf("");
      setEditSocio2Birth("");
      setEditSocio2Telefone("");
      setEditSocio2Participacao("");
    }
    
    setEditEndCep(addr?.cep || "");
    setEditEndLogradouro(addr?.logradouro || "");
    setEditEndNumero(addr?.numero || "");
    setEditEndBairro(addr?.bairro || "");
    setEditEndCidade(addr?.cidade || "");
    setEditEndUf(addr?.uf || "SP");
    setEditEndComplemento(addr?.complemento || "");
    
    // Set editable company fields
    setEditRazaoSocial(lead.razaoSocial || "");
    setEditCnpj(lead.cnpj || "");
    setEditNome(lead.nome || "");
    setEditWhatsapp(lead.whatsapp || "");
    setEditEmail(lead.email || "");
    setEditPorte(lead.porte || "ME");
    setEditFaturamento(lead.faturamentoAnual?.toString() || "");
    setEditRamo(lead.ramo || "");
    setEditBancoPrincipal(lead.bancoPrincipal || "Banco do Brasil");
    setEditMenosDe12Meses(lead.menosDe12Meses || false);
    setEditCapitalSocial(lead.capitalSocial?.toString() || "");
    setEditMediaReceitaMensal(lead.mediaReceitaMensal?.toString() || "");
    
    // Clear status/messages
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
  };

  const handleSaveWorkspaceCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForWorkspace) return;
    
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setWorkspaceLoading(true);

    try {
      const leadId = selectedLeadForWorkspace.id;
      const valFaturamento = parseFloat(editFaturamento) || 0;
      const valCapital = parseFloat(editCapitalSocial) || 0;
      const valMediaReceita = parseFloat(editMediaReceitaMensal) || 0;

      // Recalculate estimated limit based on PRONAMPE 2026 rules (60% multiplier / 50% for <12 months)
      let calculatedLimit = 0;
      const effectiveAnnualRevenue = editMenosDe12Meses 
        ? valMediaReceita * 12 
        : valFaturamento;

      if (editMenosDe12Meses) {
        const opt1 = valCapital * 0.5;
        const opt2 = (valMediaReceita * 12) * 0.5;
        calculatedLimit = Math.max(opt1, opt2);
      } else {
        calculatedLimit = valFaturamento * 0.6;
      }
      calculatedLimit = Math.min(calculatedLimit, 500000);

      // Eligibility
      let prepScore: "alto" | "medio" | "baixo" = "alto";
      const alerts: string[] = [];
      const recs: string[] = [];

      if (editPorte === "MEI" && effectiveAnnualRevenue > 81000) {
        prepScore = "baixo";
        alerts.push(`Faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} ultrapassa o limite legal anual de R$ 81.000,00 para MEI.`);
        recs.push("Será preciso solicitar o desenquadramento de MEI e migrar para ME (Microempresa) antes de protocolar o Pronampe.");
      } else if (editPorte === "ME" && effectiveAnnualRevenue > 360000) {
        prepScore = "medio";
        alerts.push(`Faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} excede o limite de R$ 360.000,00 para Microempresa.`);
        recs.push("Sua empresa se enquadra na faixa de EPP (Empresa de Pequeno Porte). Nós ajudamos você no reenquadramento e upgrade tributário.");
      } else if (editPorte === "EPP" && effectiveAnnualRevenue > 4800000) {
        prepScore = "baixo";
        alerts.push(`Faturamento de ${formatCurrencyBRL(effectiveAnnualRevenue)} excede o teto legal de R$ 4,8 milhões para EPP.`);
        recs.push("O Pronampe é restrito a empresas com receita de até R$ 4,8M. Fale com nossa assessoria para outras linhas corporativas específicas.");
      }

      if (editMenosDe12Meses) {
        if (prepScore === "alto") prepScore = "medio";
        alerts.push("Empresa aberta há menos de 12 meses possui regras de limite proporcional diferenciadas conforme regulamento do Pronampe.");
        recs.push("Apresentaremos balancete de abertura assinado pelo contador para comprovação de aporte de capital social.");
      }

      if (alerts.length === 0) {
        alerts.push("CNPJ regularizado e limpo! Excelente elegibilidade para liberação rápida de crédito.");
        recs.push("Para agilizar a liberação, faça o login com sua conta gov.br Ouro/Prata e configure o compartilhamento de dados no portal da Receita Federal.");
        recs.push("Fale com nossos consultores para identificar os bancos parceiros que possuem taxas promocionais ativas hoje.");
      }

      const updatedFields = {
        razaoSocial: editRazaoSocial,
        cnpj: editCnpj,
        nome: editNome,
        whatsapp: editWhatsapp,
        email: editEmail,
        porte: editPorte,
        faturamentoAnual: valFaturamento,
        ramo: editRamo,
        bancoPrincipal: editBancoPrincipal,
        menosDe12Meses: editMenosDe12Meses,
        capitalSocial: valCapital,
        mediaReceitaMensal: valMediaReceita,
        limiteEstimado: calculatedLimit,
        nivelPreparacao: prepScore,
        principaisAlertas: alerts,
        recomendações: recs
      };

      await updateDoc(doc(db, "leads", leadId), updatedFields);

      setWorkspaceSuccess("Dados da empresa e de contato atualizados com sucesso!");
      
      // Update local state in leads array
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields } : l));
      setSelectedLeadForWorkspace(prev => prev ? { ...prev, ...updatedFields } : null);
    } catch (err) {
      console.error("Error saving company details:", err);
      setWorkspaceError("Erro ao salvar os dados da empresa. Tente novamente.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleSaveWorkspaceSocios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForWorkspace) return;

    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    // Basic validation
    if (!editSocio1Nome.trim() || !editSocio1Cpf.trim() || !editSocio1Birth.trim()) {
      setWorkspaceError("Por favor, preencha Nome Completo, CPF e Data de Nascimento do Sócio Principal.");
      return;
    }
    if (editHasSocio2) {
      if (!editSocio2Nome.trim() || !editSocio2Cpf.trim() || !editSocio2Birth.trim()) {
        setWorkspaceError("Por favor, preencha Nome Completo, CPF e Data de Nascimento do Segundo Sócio ou desative a opção.");
        return;
      }
    }

    setWorkspaceLoading(true);

    try {
      const leadId = selectedLeadForWorkspace.id;

      const sociosList = [
        {
          nome: editSocio1Nome,
          cpf: editSocio1Cpf,
          dataNascimento: editSocio1Birth,
          participacao: parseFloat(editSocio1Participacao) || 100,
          nomeMae: editSocio1Mae || "",
          telefone: editSocio1Telefone || selectedLeadForWorkspace.whatsapp || "",
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

      const updatedFields = {
        socios: sociosList,
        enderecoSocioPrincipal: endPrincipal,
        etapa: Math.max(selectedLeadForWorkspace.etapa || 1, 3) // ensure stage is at least 3: Ficha Cadastral Preenchida
      };

      await updateDoc(doc(db, "leads", leadId), updatedFields);

      setWorkspaceSuccess("Ficha cadastral dos sócios atualizada com sucesso!");
      
      // Update local state in leads array
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields } : l));
      setSelectedLeadForWorkspace(prev => prev ? { ...prev, ...updatedFields } : null);
    } catch (err) {
      console.error("Error saving socios info:", err);
      setWorkspaceError("Erro ao salvar a ficha dos sócios. Tente novamente.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleSaveProposalToLead = async () => {
    if (!selectedLeadForWorkspace) return;
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setWorkspaceLoading(true);

    try {
      const leadId = selectedLeadForWorkspace.id;
      
      const updatedFields = {
        limiteEstimado: advValor, // Save negotiated proposal amount as estimated limit
        prop_valor: advValor,
        prop_carencia: advCarencia,
        prop_prazo: advPrazoAmortizacao,
        prop_amortizacao: advAmortizacao,
        prop_taxa: advTaxaAnual,
        prop_pagarJurosCarencia: advPagarJurosCarencia,
        prop_incorporarJurosCarencia: advIncorporarJurosCarencia,
        etapa: Math.max(selectedLeadForWorkspace.etapa || 1, 5) // Automatically advances to Stage 5: Proposta Emitida / Em Negociação!
      };

      await updateDoc(doc(db, "leads", leadId), updatedFields);

      setWorkspaceSuccess("Proposta comercial vinculada ao lead com sucesso! Etapa atualizada para Proposta Emitida.");
      
      // Update local state
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields } : l));
      setSelectedLeadForWorkspace(prev => prev ? { ...prev, ...updatedFields } : null);
    } catch (err) {
      console.error("Error saving proposal to lead:", err);
      setWorkspaceError("Erro ao salvar proposta no lead. Tente novamente.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const copyLeadProposalToClipboard = () => {
    if (!selectedLeadForWorkspace || !currentPartner) return;
    const { totalJuros, totalPago, parcelaInicial, parcelaFinal, parcelaCarenciaExemplo } = calculateSchedule();
    
    const amortText = advAmortizacao === "SAC" 
      ? `Tabela SAC (Parcelas Decrescentes: de ${formatCurrencyBRL(parcelaInicial)} até ${formatCurrencyBRL(parcelaFinal)})`
      : `Tabela Price (Parcelas Constantes: ${formatCurrencyBRL(parcelaInicial)})`;
      
    const carenciaText = advCarencia > 0 
      ? `Carência de ${advCarencia} meses (com pagamento mensal de juros de ${formatCurrencyBRL(parcelaCarenciaExemplo)})`
      : "Sem carência (amortização imediata)";

    const text = `Olá, *${selectedLeadForWorkspace.nome}* (${selectedLeadForWorkspace.razaoSocial})!
Aqui estão as condições negociadas para o seu fomento comercial *PRONAMPE 2026* assessoradas por mim:

*Valor do Crédito:* ${formatCurrencyBRL(advValor)}
*Taxa de Juros:* ${advTaxaAnual.toFixed(1).replace(".", ",")}% a.a.
*Prazo Total:* ${advCarencia + advPrazoAmortizacao} meses (${advCarencia} meses de carência + ${advPrazoAmortizacao} meses de amortização)
*Fluxo de Carência:* ${carenciaText}
*Sistema de Amortização:* ${amortText}
*Total de Juros Estimados:* ${formatCurrencyBRL(totalJuros)}
*Custo Total da Operação:* ${formatCurrencyBRL(totalPago)}

Para darmos andamento à emissão de sua CCB e liberação dos recursos, favor confirmar se está tudo de acordo!

Atenciosamente,
*${currentPartner.nome}*
Consultor Oficial - PROSFEC`;

    navigator.clipboard.writeText(text);
    setCopiedProposalReport(true);
    setTimeout(() => setCopiedProposalReport(false), 3000);
  };

  // Schedule row interface
  interface ScheduleRow {
    mes: number;
    tipo: "Carência" | "Amortização";
    saldoInicial: number;
    amortizacao: number;
    juros: number;
    parcela: number;
    saldoFinal: number;
  }

  // Calculate advanced schedule dynamically
  const calculateSchedule = () => {
    const r_m = advTaxaAnual / 100 / 12;
    const C = advCarencia;
    const N = advPrazoAmortizacao;
    const rows: ScheduleRow[] = [];
    
    let currentBalance = advValor;
    let accumulatedUncapitalizedInterest = 0;
    
    // 1. Grace Period
    for (let t = 1; t <= C; t++) {
      const startBalance = currentBalance;
      const interest = startBalance * r_m;
      let amortization = 0;
      let payment = 0;
      
      if (advPagarJurosCarencia) {
        payment = interest;
        // currentBalance stays same
      } else {
        if (advIncorporarJurosCarencia) {
          currentBalance = startBalance + interest;
        } else {
          accumulatedUncapitalizedInterest += interest;
          // currentBalance stays same
        }
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
    
    // 2. Amortization Period
    const amortizationAmountPerMonthUncapitalized = accumulatedUncapitalizedInterest / N;
    
    if (advAmortizacao === "PRICE") {
      // Standard Price Formula PMT = P_0 * [i * (1+i)^N] / [(1+i)^N - 1]
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
      // SAC - Constant Amortization per month
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
    const carenciaRows = rows.filter(r => r.tipo === "Carência");
    const parcelaInicial = amortRows.length > 0 ? amortRows[0].parcela : 0;
    const parcelaFinal = amortRows.length > 0 ? amortRows[amortRows.length - 1].parcela : 0;
    const parcelaCarenciaExemplo = carenciaRows.length > 0 ? carenciaRows[0].juros : 0;
    
    const comissaoEstimada = advValor * getCommissionMultiplier(currentPartner?.plano);
    
    return {
      rows,
      totalJuros,
      totalPago,
      parcelaInicial,
      parcelaFinal,
      parcelaCarenciaExemplo,
      saldoDevedorPosCarencia: balanceAfterGrace,
      comissaoEstimada
    };
  };

  const copyProposalToClipboard = () => {
    if (!currentPartner) return;
    const { totalJuros, totalPago, parcelaInicial, parcelaFinal, parcelaCarenciaExemplo } = calculateSchedule();
    
    const jurosCarenciaDesc = advPagarJurosCarencia 
      ? "Sim (mensalmente na carência)" 
      : advIncorporarJurosCarencia 
        ? "Não (incorporar juros compostos ao saldo)" 
        : "Não (acumular simples para pagar nas parcelas)";

    const text = `📄 *PROPOSTA DE CRÉDITO PRONAMPE - PROSFEC*
----------------------------------------
*Parceiro PROSFEC:* ${currentPartner.nome}
*Valor Solicitado:* R$ ${advValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
*Taxa Legal de Juros:* ${advTaxaAnual.toFixed(2).replace(".", ",")}% a.a. (Selic + até 6%)
*Tabela de Amortização:* ${advAmortizacao}

*Prazos e Carência:*
- Carência: ${advCarencia} meses
- Amortização: ${advPrazoAmortizacao} meses
- Prazo Total da Operação: ${advCarencia + advPrazoAmortizacao} meses

*Pagamento na Carência:* ${jurosCarenciaDesc}

*Simulação das Parcelas:*
${advPagarJurosCarencia ? `- Parcela Mensal na Carência: R$ ${parcelaCarenciaExemplo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (somente juros)\n` : "- Parcela Mensal na Carência: R$ 0,00 (sem desembolso)\n"}- Parcela de Amortização Inicial: R$ ${parcelaInicial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Parcela de Amortização Final: R$ ${parcelaFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

*Custo Estimado:*
- Total de Juros do Financiamento: R$ ${totalJuros.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Custo Total da Operação: R$ ${totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

----------------------------------------
_A simulação acima é de caráter estritamente informativo e não constitui oferta de crédito vinculante. Sujeita a análise cadastral e aprovação por instituições financeiras parceiras._`;

    navigator.clipboard.writeText(text);
    setCopiedProposalReport(true);
    setTimeout(() => setCopiedProposalReport(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      {/* Dynamic Header */}
      <header className="bg-[#0A3D2E] text-slate-100 py-3.5 px-4 sm:px-6 border-b border-emerald-800/50 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-950/80 p-2.5 rounded-xl text-emerald-300 border border-emerald-700/40 shrink-0">
              <Handshake className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">PROSFEC</h1>
                <span className="bg-emerald-500/20 text-[#00A86B] text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                  Parceiros
                </span>
              </div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-emerald-400/90 mt-0.5">Portal de Afiliados e Consultores</p>
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 sm:hidden">
            {isAuthenticated && currentPartner && (
              <div className="relative">
                <button
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className="relative p-2.5 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-900/40 transition-all cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px]"
                  title="Notificações"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.lida).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse">
                      {notifications.filter(n => !n.lida).length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5 sm:gap-3 pt-2 sm:pt-0 border-t border-emerald-900/40 sm:border-t-0">
          {isAuthenticated && currentPartner && (
            <div className="flex items-center gap-3">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-emerald-300/80 block font-semibold uppercase tracking-wider">Parceiro Conectado</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-50 truncate max-w-[160px] sm:max-w-[200px] block" title={currentPartner.nome}>
                  {currentPartner.nome}
                </span>
              </div>
              
              {/* Notification Bell Dropdown (Desktop) */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className="relative p-2.5 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-900/40 transition-all cursor-pointer flex items-center justify-center min-h-[40px] min-w-[40px]"
                  title="Notificações"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.lida).length > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse">
                      {notifications.filter(n => !n.lida).length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotificationsDropdown && (
                    <>
                      {/* Invisible backdrop to close the dropdown when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowNotificationsDropdown(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 text-slate-800"
                      >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <Bell className="w-4 h-4 text-[#00A86B]" />
                            Notificações Internas
                          </h3>
                          {notifications.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAllNotificationsRead();
                              }}
                              className="text-[11px] font-bold text-[#00A86B] hover:text-[#0A3D2E] transition-colors cursor-pointer"
                              title="Limpar e excluir todas as notificações"
                            >
                              Limpar todas
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-xs font-semibold">Nenhuma notificação por enquanto.</p>
                            </div>
                          ) : (
                            notifications.map((notif) => {
                              // Type-specific styles
                              let iconBg = "bg-blue-50 text-blue-700";
                              let borderLeft = "border-l-4 border-l-blue-600";
                              if (notif.tipo === "success") {
                                iconBg = "bg-emerald-50 text-[#00A86B]";
                                borderLeft = "border-l-4 border-l-[#00A86B]";
                              } else if (notif.tipo === "warning") {
                                iconBg = "bg-amber-50 text-amber-700";
                                borderLeft = "border-l-4 border-l-amber-500";
                              } else if (notif.tipo === "error") {
                                iconBg = "bg-rose-50 text-rose-700";
                                borderLeft = "border-l-4 border-l-rose-600";
                              }

                              return (
                                <div
                                  key={notif.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNotificationRead(notif.id);
                                  }}
                                  className={`p-3.5 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${borderLeft} ${!notif.lida ? "bg-emerald-50/30" : "bg-white"}`}
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                                    <Bell className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                      <p className={`text-xs font-bold truncate ${!notif.lida ? "text-slate-950" : "text-slate-700"}`}>
                                        {notif.titulo}
                                      </p>
                                      {!notif.lida && (
                                        <span className="w-2 h-2 rounded-full bg-[#00A86B] shrink-0 mt-1 animate-pulse" />
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed mb-1">
                                      {notif.mensagem}
                                    </p>
                                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                      {new Date(notif.dataCriacao).toLocaleString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleLogout}
                className="bg-emerald-900/40 hover:bg-rose-900/30 border border-emerald-700/50 hover:border-rose-500/40 text-white hover:text-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                title="Sair do Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          )}
          <button
            onClick={onBackToHome}
            className="bg-white/10 hover:bg-white/15 text-white border border-white/15 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] shrink-0"
          >
            Voltar ao Site
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col">
        {!isAuthenticated ? (
          /* ========================================================================= */
          /*                       UNAUTHENTICATED: LOGIN / REGISTER                   */
          /* ========================================================================= */
          <div className="flex-1 flex items-center justify-center py-8">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden max-w-2xl w-full"
            >
              <div className="grid grid-cols-1 md:grid-cols-12">
                {/* Visual Banner Left (on desktop) */}
                <div className="hidden md:flex md:col-span-5 bg-[#0A3D2E] text-white p-8 flex-col justify-between relative overflow-hidden">
                  <div className="absolute right-[-50px] bottom-[-50px] w-48 h-48 rounded-full bg-emerald-600/15 pointer-events-none" />
                  
                  <div className="space-y-4">
                    <span className="bg-emerald-500/20 text-emerald-300 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full w-fit block">
                      ÁREA DO PARCEIRO
                    </span>
                    <h3 className="font-display font-extrabold text-2xl leading-tight">
                      Ganhe comissões indicando o Pronampe
                    </h3>
                    <p className="text-emerald-200 text-xs leading-relaxed">
                      Monetize sua rede de contatos e acompanhe leads qualificados em tempo real de forma profissional.
                    </p>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-emerald-800/40">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Comissão de até 3,0%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>CRM de Leads Exclusivo</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Suporte Operacional Direto</span>
                    </div>
                  </div>
                </div>

                {/* Main Action area - Right */}
                <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-center">
                  {registeredPartnerPlan && successMsg ? (
                    <motion.div
                      key="registration-checkout"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-5 py-4"
                    >
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-display font-extrabold text-lg text-slate-800">
                          Cadastro Efetuado!
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                          {successMsg}
                        </p>
                      </div>
                      
                      <div className="pt-2 space-y-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSuccessMsg(null);
                            setRegisteredPartnerPlan(null);
                            setIsRegistering(false);
                          }}
                          className="w-full bg-[#00A86B] hover:bg-[#0A3D2E] text-white font-extrabold py-3.5 px-6 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                        >
                          Acessar Meu Painel Agora {registeredPartnerPlan !== "AFILIADO" && "(Iniciar Teste de 3 Dias)"}
                        </button>

                        {registeredPartnerPlan !== "AFILIADO" && (
                          <a
                            href={getPaymentLinkForPlan(registeredPartnerPlan)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200/60"
                          >
                            <Coins className="w-4 h-4 text-emerald-600" />
                            Garantir Plano Definitivo na Hubla
                          </a>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSuccessMsg(null);
                          setRegisteredPartnerPlan(null);
                          setIsRegistering(false);
                        }}
                        className="text-xs font-bold text-[#0A3D2E] hover:underline block mx-auto cursor-pointer"
                      >
                        Ir para tela de Login →
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      {/* Title Toggle */}
                      <div className="flex justify-between border-b border-slate-100 pb-4 mb-5">
                        <button
                          onClick={() => { setIsRegistering(false); setErrorMsg(null); setSuccessMsg(null); }}
                          className={`text-sm font-extrabold pb-2 border-b-2 transition-all cursor-pointer ${
                            !isRegistering ? "border-[#00A86B] text-[#0A3D2E]" : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Entrar no Portal
                        </button>
                        <button
                          onClick={() => { setIsRegistering(true); setErrorMsg(null); setSuccessMsg(null); }}
                          className={`text-sm font-extrabold pb-2 border-b-2 transition-all cursor-pointer ${
                            isRegistering ? "border-[#00A86B] text-[#0A3D2E]" : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Cadastrar-se como Parceiro
                        </button>
                      </div>

                      {successMsg && (
                        <div className="bg-emerald-50 text-[#0A3D2E] text-xs font-semibold p-4 rounded-xl border border-emerald-100 flex items-start gap-2.5 mb-4">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{successMsg}</span>
                        </div>
                      )}

                      {errorMsg && (
                        <div className="bg-red-50 text-red-800 text-xs font-semibold p-4 rounded-xl border border-red-100 flex items-start gap-2.5 mb-4">
                          <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <AnimatePresence mode="wait">
                    {!isRegistering ? (
                      /* LOGIN VIEW */
                      <motion.form 
                        key="login"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        onSubmit={handleLogin} 
                        className="space-y-4 text-left"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">E-mail de Cadastro</label>
                          <div className="relative">
                            <span className="absolute left-3 top-3.5 text-slate-400"><Mail className="w-4 h-4" /></span>
                            <input
                              type="email"
                              required
                              placeholder="exemplo@email.com"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-sm outline-none text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 block">Senha</label>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-3.5 text-slate-400"><Lock className="w-4 h-4" /></span>
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="******"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-sm outline-none text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Autenticando...
                            </>
                          ) : "Acessar Painel"}
                        </button>
                      </motion.form>
                    ) : (
                      /* REGISTER VIEW */
                      <motion.form 
                        key="register"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        onSubmit={handleRegister} 
                        className="space-y-3 text-left max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">Nome Completo / Razão social *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400"><User className="w-4 h-4" /></span>
                            <input
                              type="text"
                              required
                              placeholder="Nome completo ou Razão Social"
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs outline-none text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">E-mail *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400"><Mail className="w-4 h-4" /></span>
                            <input
                              type="email"
                              required
                              placeholder="seu.email@exemplo.com"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs outline-none text-slate-800"
                            />
                          </div>
                        </div>

                        {/* PLAN SELECTOR */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">Selecione o seu Plano de Repasses *</label>
                          <select
                            value={regPlan}
                            onChange={(e) => setRegPlan(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl p-2 text-xs outline-none text-slate-800 font-semibold"
                          >
                            <option value="STARTER">STARTER (0,5% repasse - R$ 500,00 — Pagamento Único)</option>
                            <option value="Executive Partner PROSFEC">Executive Partner PROSFEC (1,5% repasse - R$ 800,00 — Pagamento Único)</option>
                            <option value="MASTER PARTNER">MASTER PARTNER (3,0% repasse - R$ 1.500,00 — Pagamento Único)</option>
                            {!localStorage.getItem("lca_referred_by") && (
                              <option value="AFILIADO">AFILIADO (Apenas Divulgação e Afiliados - R$ 0,00/mês)</option>
                            )}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">Criar Senha *</label>
                            <input
                              type="password"
                              required
                              placeholder="Mínimo 6 dígitos"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs outline-none text-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">Confirmar Senha *</label>
                            <input
                              type="password"
                              required
                              placeholder="Confirmar senha"
                              value={regConfirmPassword}
                              onChange={(e) => setRegConfirmPassword(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs outline-none text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Termos scroll area */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1.5 mt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Declaração e Termos de Parceria</p>
                          <div className="text-[9px] text-slate-400 bg-white/75 backdrop-blur-xl p-2.5 rounded-lg border border-slate-200 max-h-36 overflow-y-auto leading-relaxed space-y-2.5 scrollbar-thin">
                            <TermosDeUsoContent variant="light" />
                          </div>
                          <div className="flex items-start gap-2 pt-1">
                            <input
                              type="checkbox"
                              id="reg-accept"
                              checked={regAcceptedTerms}
                              onChange={(e) => setRegAcceptedTerms(e.target.checked)}
                              className="mt-0.5 rounded text-emerald-600 cursor-pointer w-3.5 h-3.5"
                              required
                            />
                            <label htmlFor="reg-accept" className="text-[10px] text-slate-500 leading-tight select-none cursor-pointer">
                              Li, compreendi e aceito integralmente os termos de conduta e comissionamento da PROSFEC. *
                            </label>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                        >
                          {loading ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Cadastrando parceiro...
                            </>
                          ) : "Cadastrar e Aceitar Termos"}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        ) : currentPartner && getSubscriptionStatus(currentPartner).status === "vencida" ? (
          /* ========================================================================= */
          /*                        BLOCKED / EXPIRED SUBSCRIPTION VIEW                */
          /* ========================================================================= */
          <div className="flex-1 flex items-center justify-center py-12 px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-rose-100 shadow-xl p-8 max-w-md w-full text-center space-y-6"
            >
              {(() => {
                const sub = getSubscriptionStatus(currentPartner);
                const isManualBlocked = sub.isManualBlocked || currentPartner.statusManual === "bloqueado" || currentPartner.status === "bloqueado";

                if (isManualBlocked) {
                  return (
                    <>
                      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 animate-pulse">
                        <Lock className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="font-display font-extrabold text-xl text-slate-800 leading-tight">
                          Acesso Suspenso / Bloqueado
                        </h2>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          Olá, <strong className="text-slate-700">{currentPartner.nome}</strong>. O seu acesso ao Portal de Parceiros foi temporariamente suspenso ou bloqueado pela administração da PROSFEC.
                        </p>
                      </div>

                      <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-xs text-rose-800 flex items-start gap-3 text-left">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Como reativar o acesso?</p>
                          <p className="mt-1 text-rose-700/90 leading-relaxed">
                            Para consultar o motivo do bloqueio ou solicitar a liberação do seu painel, entre em contato direto com a administração.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 space-y-3">
                        <a
                          href={`https://api.whatsapp.com/send?phone=5598987353253&text=${encodeURIComponent(
                            `Olá, sou o parceiro ${currentPartner.nome} (ID: ${currentPartner.id}) e meu acesso ao Portal de Parceiros está bloqueado. Gostaria de solicitar a análise e reativação da minha conta.`
                          )}`}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="w-full bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold py-3.5 px-6 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          Falar com o Suporte / Administração
                        </a>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 animate-pulse">
                      <Lock className="w-8 h-8" />
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="font-display font-extrabold text-xl text-slate-800 leading-tight">
                        {sub.isTrial ? "Período de Teste de 3 Dias Finalizado" : "Licença Anual Vencida"}
                      </h2>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Olá, <strong className="text-slate-700">{currentPartner.nome}</strong>. 
                        {sub.isTrial ? (
                          " Seu período de teste gratuito de 3 dias chegou ao fim. Para liberar o seu acesso por 1 ano completo e continuar indicando empresas, acompanhando seus ganhos e usando o Caça-Leads, efetue o pagamento do seu plano."
                        ) : (
                          " A sua licença anual do Portal de Parceiros expirou. Regularize o seu pagamento para garantir acesso completo e irrestrito por mais 1 ano."
                        )}
                      </p>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3 text-left">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Como funciona a liberação?</p>
                        <p className="mt-1 text-amber-700/90 leading-relaxed">
                          Você pode efetuar o pagamento diretamente via Hubla usando o botão abaixo. Assim que aprovado, seu painel será liberado de forma totalmente automática!
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      <a
                        href={getPaymentLinkForPlan(currentPartner.plano || "STARTER")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold py-3.5 px-6 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Coins className="w-4 h-4" />
                        Efetuar Pagamento na Hubla
                      </a>

                      <a
                        href={`https://api.whatsapp.com/send?phone=5598987353253&text=${encodeURIComponent(
                          `Olá, sou o parceiro ${currentPartner.nome} (ID: ${currentPartner.id}) e gostaria de regularizar minha assinatura no Portal de Parceiros da PROSFEC para reativar meu acesso!`
                        )}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        Regularizar via WhatsApp
                      </a>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        ) : (
          /* ========================================================================= */
          /*                        AUTHENTICATED: DASHBOARD VIEW                      */
          /* ========================================================================= */
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
            {/* Sidebar Left Column */}
            <div className="contents lg:flex lg:flex-col lg:w-80 shrink-0 lg:space-y-6 lg:sticky lg:top-6">
              {/* Profile Card & Commission Info */}
              <div className="order-1 lg:order-none bg-[#0A3D2E] text-white p-5 sm:p-6 rounded-2xl relative overflow-hidden shadow-sm flex flex-col justify-between border border-emerald-500/20 min-h-[220px]">
                <div className="absolute right-[-30px] top-[-30px] w-32 h-32 rounded-full bg-emerald-500/10 pointer-events-none" />
                <div className="space-y-4 relative z-10">
                  <div className="flex items-start justify-between">
                    <span className="bg-emerald-500/20 text-[#00A86B] font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-500/30">
                      Área do Parceiro
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-emerald-300">
                      <Handshake className="w-5 h-5 text-emerald-300" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg leading-tight text-white">{currentPartner?.nome}</h2>
                    <p className="text-xs text-emerald-200/90 mt-1 truncate">E-mail: {currentPartner?.email}</p>
                    <p className="text-[11px] text-emerald-300/80 font-mono mt-0.5">ID: {currentPartner?.id}</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-emerald-800/60 pt-4 grid grid-cols-2 gap-3 relative z-10">
                  <div className="bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-emerald-300/90 uppercase block font-bold tracking-wider">Sua Comissão</span>
                    {isFranquiaDigital(currentPartner?.plano) ? (
                      <div className="space-y-0.5 mt-1">
                        <span className="text-base font-extrabold text-emerald-100 font-mono block">3,0% Direto</span>
                        <span className="text-[9px] text-emerald-300 font-medium block leading-tight">
                          Equipe: 1,5% Exec / 2,5% Start
                        </span>
                      </div>
                    ) : (
                      <span className="text-base font-extrabold text-emerald-100 font-mono block mt-1">
                        {(getCommissionMultiplier(currentPartner?.plano) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-emerald-300/90 uppercase block font-bold tracking-wider">Chave Pix</span>
                    <span className="text-xs font-mono font-bold text-emerald-200 truncate block mt-1" title={currentPartner?.chavePix}>
                      {currentPartner?.chavePix || "Não informada"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vertical Navigation Tabs */}
              <div className="order-3 lg:order-none bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-2.5 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex flex-col gap-1 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 mb-0.5 block">Navegação do Portal</span>
                
                <button
                  onClick={() => handleTabClick("dashboard")}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left flex items-center justify-between group ${
                    activeTab === "dashboard"
                      ? "bg-emerald-50 text-[#0A3D2E] border-l-4 border-[#00A86B]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <LayoutDashboard className={`w-5 h-5 ${activeTab === "dashboard" ? "text-[#00A86B]" : "text-slate-400"}`} strokeWidth={2} />
                    Dashboard
                  </span>
                  {!isProfileComplete(currentPartner) ? (
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "dashboard" ? "translate-x-0.5 text-[#00A86B]" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
                  )}
                </button>

                <button
                  onClick={() => handleTabClick("leads")}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left flex items-center justify-between group ${
                    activeTab === "leads"
                      ? "bg-emerald-50 text-[#0A3D2E] border-l-4 border-[#00A86B]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <ClipboardList className={`w-5 h-5 ${activeTab === "leads" ? "text-[#00A86B]" : "text-slate-400"}`} strokeWidth={2} />
                    Meus Leads ({leads.length})
                  </span>
                  {!isProfileComplete(currentPartner) ? (
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "leads" ? "translate-x-0.5 text-[#00A86B]" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
                  )}
                </button>

                {!currentPartner?.plano?.toUpperCase().includes("AFILIADO") && (
                  <button
                    onClick={() => handleTabClick("caca-leads")}
                    className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left flex items-center justify-between group ${
                      activeTab === "caca-leads"
                        ? "bg-emerald-50 text-[#0A3D2E] border-l-4 border-[#00A86B]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Search className={`w-5 h-5 ${activeTab === "caca-leads" ? "text-[#00A86B] animate-pulse" : "text-emerald-600"}`} strokeWidth={2} />
                      <span className="flex items-center gap-1">
                        Caça Leads
                        <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black scale-90">NOVO</span>
                      </span>
                    </span>
                    {!isProfileComplete(currentPartner) ? (
                      <Lock className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "caca-leads" ? "translate-x-0.5 text-[#00A86B]" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
                    )}
                  </button>
                )}

                {isFranquiaDigital(currentPartner?.plano) && (
                  <button
                    onClick={() => handleTabClick("equipe")}
                    className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left flex items-center justify-between group ${
                      activeTab === "equipe"
                        ? "bg-emerald-50 text-[#0A3D2E] border-l-4 border-[#00A86B]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className={`w-5 h-5 ${activeTab === "equipe" ? "text-[#00A86B] animate-pulse" : "text-emerald-600"}`} strokeWidth={2} />
                      Minha Equipe ({teamMembers.length})
                    </span>
                    {!isProfileComplete(currentPartner) ? (
                      <Lock className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "equipe" ? "translate-x-0.5 text-[#00A86B]" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
                    )}
                  </button>
                )}

                <button
                  onClick={() => handleTabClick("servicos-contabilidade")}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left flex items-center justify-between group ${
                    activeTab === "servicos-contabilidade"
                      ? "bg-emerald-50 text-[#0A3D2E] border-l-4 border-[#00A86B]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Calculator className={`w-5 h-5 ${activeTab === "servicos-contabilidade" ? "text-[#00A86B] animate-pulse" : "text-emerald-600"}`} strokeWidth={2} />
                    <span className="flex items-center gap-1">
                      Serviços Contábeis
                      <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black scale-90">NOVO</span>
                    </span>
                  </span>
                  {!isProfileComplete(currentPartner) ? (
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "servicos-contabilidade" ? "translate-x-0.5 text-[#00A86B]" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
                  )}
                </button>

                <button
                  onClick={() => handleTabClick("perfil")}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left flex items-center justify-between group ${
                    activeTab === "perfil"
                      ? "bg-emerald-50 text-[#0A3D2E] border-l-4 border-[#00A86B]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className={`w-5 h-5 ${activeTab === "perfil" ? "text-[#00A86B]" : "text-slate-400"}`} strokeWidth={2} />
                    Meu Perfil
                    {!isProfileComplete(currentPartner) && (
                      <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ml-1 animate-pulse">Obrigatório</span>
                    )}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "perfil" ? "translate-x-0.5 text-[#00A86B]" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
                </button>

                <button
                  onClick={() => handleTabClick("terms")}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-left flex items-center justify-between group ${
                    activeTab === "terms"
                      ? "bg-emerald-50 text-[#0A3D2E] border-l-4 border-[#00A86B]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className={`w-5 h-5 ${activeTab === "terms" ? "text-[#00A86B]" : "text-slate-400"}`} strokeWidth={2} />
                    Contrato de Parceria
                  </span>
                  {!isProfileComplete(currentPartner) ? (
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "terms" ? "translate-x-0.5 text-[#00A86B]" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Content Right Column */}
            <div className="contents lg:flex lg:flex-col lg:flex-grow lg:w-full lg:space-y-6 lg:min-w-0">
              {/* Unique Indicator Link Card */}
              <div className="order-2 lg:order-none bg-[#0A3D2E] text-white p-5 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-emerald-950/70 p-2.5 rounded-xl text-emerald-300 border border-emerald-700/40 shrink-0">
                        <TrendingUp className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-white">Seu Link Exclusivo de Indicação</h3>
                        <p className="text-[11px] text-emerald-300/80 font-medium">Divulgação com rastreamento persistente</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-[#00A86B] font-mono font-bold px-2.5 py-1 rounded-md border border-emerald-500/30 uppercase tracking-wider">
                      Rastreamento Ativo
                    </span>
                  </div>
                  
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    Divulgue seu link para sua carteira de clientes, contatos de WhatsApp, contadores e redes sociais. Todo faturamento e simulação gerados por meio desse link serão vinculados automaticamente a você na nossa base de dados.
                  </p>

                  <div className="bg-emerald-950/60 p-3.5 sm:p-4 rounded-xl border border-emerald-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">URL do seu Link</span>
                      <span className="text-xs font-mono font-bold text-emerald-200 select-all break-all block mt-0.5" title={`${window.location.hostname.includes("prosfec.com.br") ? window.location.origin : "https://prosfec.com.br"}?ref=${currentPartner?.id}`}>
                        {window.location.hostname.includes("prosfec.com.br") ? window.location.origin : "https://prosfec.com.br"}?ref={currentPartner?.id}
                      </span>
                    </div>
                    <button
                      onClick={copyReferralLink}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0 min-h-[44px] ${
                        copiedLink 
                          ? "bg-emerald-400 text-slate-950 font-bold font-mono" 
                          : "bg-[#00A86B] hover:bg-emerald-400 text-slate-950 font-extrabold shadow-sm"
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-slate-950" />
                          <span>Link Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-950" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-emerald-800/60 flex flex-wrap gap-4 text-xs relative z-10 font-mono">
                  <div className="flex items-center gap-2 text-emerald-300 text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-[#00A86B] animate-pulse" />
                    <span>Afiliação Ativa &bull; ID: {currentPartner?.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-200/80 text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-[#00A86B]" />
                    <span>Rastreamento persistente via navegador</span>
                  </div>
                </div>
              </div>

              {/* TAB CONTENTS */}
              <div className="order-4 lg:order-none w-full space-y-6">
              <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dash-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* ALERTA DE PENDÊNCIAS EM LEADS */}
                  {leads.some(l => l.pendente || l.pendencias?.status === "pendente") && (
                    <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between text-left animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="bg-amber-100 text-amber-800 p-3 rounded-2xl shrink-0 mt-0.5">
                          <AlertTriangle className="w-6 h-6 text-amber-700" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Pendência Requer Atenção
                          </span>
                          <h3 className="font-bold text-slate-800 text-sm mt-1">
                            Você possui {leads.filter(l => l.pendente || l.pendencias?.status === "pendente").length} lead(s) com pendências de documentação pendentes de regularização!
                          </h3>
                          <p className="text-xs text-slate-600 mt-1">
                            Abra a aba de detalhes de cada lead marcado com a etiqueta vermelha <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded-sm">PENDÊNCIA</span> na tabela abaixo para ver como resolver.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("leads")}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                      >
                        Ver Meus Leads
                      </button>
                    </div>
                  )}

                  {/* ANNOUNCEMENTS & CAMPAIGNS HIGHLIGHT HEADER */}
                  {announcements.length > 0 && (
                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row gap-5 items-center justify-between text-left">
                      <div className="flex items-start gap-4">
                        <div className="bg-emerald-100 text-emerald-800 p-3 rounded-2xl shrink-0 mt-0.5">
                          <Megaphone className="w-6 h-6 text-emerald-700 animate-bounce" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-200/60 px-2.5 py-0.5 rounded-full border border-emerald-300/60">
                            Informativo & Campanha de Incentivo
                          </span>
                          <h3 className="font-bold text-slate-800 text-lg mt-1">{announcements[0].titulo}</h3>
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed max-w-2xl">{announcements[0].mensagem}</p>
                          
                          {/* Display other announcements if there are more than 1 */}
                          {announcements.length > 1 && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">Outros comunicados ativos:</span>
                              <div className="flex gap-1.5">
                                {announcements.slice(1).map((ann, idx) => (
                                  <button
                                    key={ann.id}
                                    onClick={() => setCurrentAnnouncementShow(ann)}
                                    className="px-2 py-0.5 bg-white border border-emerald-200 hover:border-emerald-400 rounded text-[9px] font-bold text-slate-700 transition-all cursor-pointer"
                                  >
                                    Ver {idx + 2}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right column - CTA or Image preview */}
                      <div className="shrink-0 flex flex-col items-center gap-3 w-full md:w-auto">
                        {announcements[0].imagemUrl && (
                          <div className="w-24 h-16 rounded-xl overflow-hidden border border-emerald-200 shadow-xs shrink-0 hidden md:block font-sans">
                            <img
                              src={announcements[0].imagemUrl}
                              alt="Campanha"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {announcements[0].linkUrl ? (
                          <a
                            href={announcements[0].linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full md:w-auto py-2.5 px-5 bg-[#064e3b] hover:bg-[#047857] text-white font-black text-xs rounded-xl shadow-xs text-center transition-all cursor-pointer whitespace-nowrap block"
                          >
                            {announcements[0].linkTexto || "Acessar Campanha"}
                          </a>
                        ) : (
                          <button
                            onClick={() => setCurrentAnnouncementShow(announcements[0])}
                            className="w-full md:w-auto py-2.5 px-5 bg-[#064e3b] hover:bg-[#047857] text-white font-black text-xs rounded-xl shadow-xs text-center transition-all cursor-pointer whitespace-nowrap"
                          >
                            Ver Detalhes
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status & Quick Metrics Cards */}
                  {(() => {
                    if (fetchLoading) {
                      return (
                        <div className="space-y-4">
                          {/* Skeletons 3 Cards Quick Metrics */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                            <div className="bg-slate-200/70 animate-pulse rounded-2xl h-24 w-full border border-slate-200" />
                            <div className="bg-slate-200/70 animate-pulse rounded-2xl h-24 w-full border border-slate-200" />
                            <div className="bg-slate-200/70 animate-pulse rounded-2xl h-24 w-full border border-slate-200" />
                          </div>
                          {/* Skeleton 2 Cards Saldos */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                            <div className="bg-slate-200/70 animate-pulse rounded-2xl h-28 w-full border border-slate-200" />
                            <div className="bg-slate-200/70 animate-pulse rounded-2xl h-28 w-full border border-slate-200" />
                          </div>
                          {/* Skeleton Saldo / Comissão Hero Card */}
                          <div className="bg-slate-200/70 animate-pulse rounded-2xl h-44 sm:h-36 w-full border border-slate-200" />
                        </div>
                      );
                    }

                    const directMultiplier = getDirectCommissionMultiplier(currentPartner?.plano);
                    
                    // Direct commission stats (Calculated both from servicoPago/comissaoPaga and comissaoMultinivel snapshot)
                    const directCommissionsPaid = leads
                      .filter(l => l.comissaoPaga === true || l.servicoPago === true || l.comissaoMultinivel?.statusGeral === "pago")
                      .reduce((acc, l) => {
                        if (l.comissaoMultinivel?.valorComissaoDireta) {
                          return acc + (l.comissaoMultinivel.valorComissaoDireta || 0);
                        }
                        return acc + ((l.valorAprovado || l.limiteEstimado || 0) * directMultiplier);
                      }, 0);
                      
                    const directCommissionsPending = leads
                      .filter(l => l.comissaoPaga !== true && l.servicoPago !== true && l.comissaoMultinivel?.statusGeral !== "pago" && (l.etapa === 7 || l.status === "concluido" || l.servicosRecomendados?.length > 0 || (l.subEtapasPasso6 && l.subEtapasPasso6.length > 0)))
                      .reduce((acc, l) => {
                        if (l.comissaoMultinivel?.valorComissaoDireta) {
                          return acc + (l.comissaoMultinivel.valorComissaoDireta || 0);
                        }
                        return acc + ((l.valorAprovado || l.limiteEstimado || 0) * directMultiplier);
                      }, 0);

                    // Team commission stats (Franquia Digital override on team leads based on team member plans)
                    const teamCommissionsPaid = teamLeads
                      .filter(l => l.comissaoPaga === true || l.servicoPago === true || l.comissaoMultinivel?.statusGeral === "pago")
                      .reduce((acc, l) => {
                        if (l.comissaoMultinivel?.valorComissaoEquipe) {
                          return acc + (l.comissaoMultinivel.valorComissaoEquipe || 0);
                        }
                        return acc + ((l.valorAprovado || l.limiteEstimado || 0) * getOverrideMultiplierForLead(l));
                      }, 0);
                      
                    const teamCommissionsPending = teamLeads
                      .filter(l => l.comissaoPaga !== true && l.servicoPago !== true && l.comissaoMultinivel?.statusGeral !== "pago" && (l.etapa === 7 || l.status === "concluido" || l.servicosRecomendados?.length > 0 || (l.subEtapasPasso6 && l.subEtapasPasso6.length > 0)))
                      .reduce((acc, l) => {
                        if (l.comissaoMultinivel?.valorComissaoEquipe) {
                          return acc + (l.comissaoMultinivel.valorComissaoEquipe || 0);
                        }
                        return acc + ((l.valorAprovado || l.limiteEstimado || 0) * getOverrideMultiplierForLead(l));
                      }, 0);

                    // Totalized stats
                    const totalPaidCommissions = directCommissionsPaid + (isFranquiaDigital(currentPartner?.plano) ? teamCommissionsPaid : 0);
                    const totalPendingCommissions = directCommissionsPending + (isFranquiaDigital(currentPartner?.plano) ? teamCommissionsPending : 0);
                    const totalApprovedCredit = leads
                      .filter(l => (l.etapa === 7 || l.status === "concluido" || l.resultadoAnaliseCredito === "aprovado") && l.status !== "recusado")
                      .reduce((acc, l) => acc + (l.valorAprovado || 0), 0);

                    return (
                      <div className="space-y-4">
                        {/* LINHA 1: Quick Metrics Grid (Desempenho: Total Indicados, Em Atendimento, Crédito Aprovado Real) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                          {/* Card 1: Total Indicados */}
                          <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex items-center gap-3.5 relative overflow-hidden group hover:border-emerald-500/40 transition-all min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A86B] border border-emerald-100 flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] text-slate-500 uppercase block font-bold tracking-wide truncate">Total Indicados</span>
                              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-0.5 block truncate">{leads.length}</span>
                              <span className="text-[10px] text-slate-400 font-medium block truncate">Empresas cadastradas</span>
                            </div>
                          </div>

                          {/* Card 2: Em Atendimento */}
                          <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex items-center gap-3.5 relative overflow-hidden group hover:border-amber-500/40 transition-all min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                              <RefreshCw className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] text-slate-500 uppercase block font-bold tracking-wide truncate">Em Atendimento</span>
                              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-0.5 block truncate">
                                {leads.filter(l => l.status === "em atendimento" || l.status === "novo").length}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block truncate">Esteira em andamento</span>
                            </div>
                          </div>

                          {/* Card 3: Crédito Aprovado Real */}
                          <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex items-center gap-3.5 relative overflow-hidden group hover:border-emerald-500/40 transition-all min-w-0 sm:col-span-2 lg:col-span-1">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A86B] border border-emerald-100 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] text-slate-500 uppercase block font-bold tracking-wide truncate">Crédito Aprovado Real</span>
                              <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#00A86B] block mt-0.5 truncate" title={formatCurrencyBRL(totalApprovedCredit)}>
                                {formatCurrencyBRL(totalApprovedCredit)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                                {leads.filter(l => l.etapa === 7 || l.status === "concluido").length} empresas aprovadas
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* LINHA 2: Dedicated Saldos Grid (Recargas e Saldos: Saldo Geral vs. Saldo Caça-Leads) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 text-left">
                          {/* Saldo Geral (Consultas e Serviços) */}
                          <div className="bg-white/75 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00A86B] border border-emerald-100 flex items-center justify-center shrink-0">
                                  <Wallet className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[11px] text-slate-500 uppercase block font-bold tracking-wide">
                                    Saldo Geral (Consultas e Serviços)
                                  </span>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Cobre Consultas de Crédito e Serviços Contábeis
                                  </p>
                                </div>
                              </div>
                              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider shrink-0">
                                Unificado
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between pt-1 border-t border-slate-50">
                              <div>
                                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 block truncate">
                                  {formatCurrencyBRL(
                                    currentPartner?.saldoGeral !== undefined
                                      ? Number(currentPartner.saldoGeral)
                                      : (currentPartner?.saldoConsultas !== undefined ? Number(currentPartner.saldoConsultas) : 0)
                                  )}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                                  Disponível para uso imediato
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowRechargeModal(true)}
                                className="px-3.5 py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px]"
                              >
                                <Coins className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Adicionar Saldo</span>
                              </button>
                            </div>
                          </div>

                          {/* Saldo Caça Leads (buscas) */}
                          <div className="bg-white/75 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
                                  <Search className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[11px] text-slate-500 uppercase block font-bold tracking-wide">
                                    Saldo Caça Leads (buscas)
                                  </span>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Buscas de empresas e sócios ativas em tempo real
                                  </p>
                                </div>
                              </div>
                              <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-100 uppercase tracking-wider shrink-0">
                                Por Pacotes
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between pt-1 border-t border-slate-50">
                              <div>
                                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 block truncate">
                                  {currentPartner?.cacaLeadsCredits || 0}{" "}
                                  <span className="text-xs text-slate-500 font-bold uppercase font-sans">buscas</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                                  Retorno de até 20 leads/busca
                                </span>
                              </div>
                              {isSubMember ? (
                                <div 
                                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 text-[11px] font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-not-allowed select-none"
                                  title="Seus créditos de busca são gerenciados e distribuídos pelo seu Líder/Master de equipe."
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Distribuído pelo Master</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRefillNotifySuccess(false);
                                    setRefillStep(1);
                                    setRefillCopiedPix(false);
                                    setShowRefillModal(true);
                                  }}
                                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px]"
                                >
                                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Adquirir Recarga</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* LINHA 3: Saldo e Comissões Hero Card (Suas Comissões & Repasses) */}
                        <div className="bg-gradient-to-br from-[#0A3D2E] via-[#064E3B] to-[#047857] text-white p-5 sm:p-6 rounded-2xl border border-emerald-400/30 shadow-md relative overflow-hidden">
                          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                            <div className="space-y-2 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-300 shrink-0">
                                  <Coins className="w-5 h-5 text-emerald-300" />
                                </div>
                                <div>
                                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-300 block">
                                    Suas Comissões & Repasses
                                  </span>
                                  <span className="text-xs text-emerald-100/90 font-medium">Saldo total liberado e pendente de liquidação</span>
                                </div>
                              </div>

                              <div className="pt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight" title={formatCurrencyBRL(totalPaidCommissions)}>
                                  {formatCurrencyBRL(totalPaidCommissions)}
                                </div>
                                <span className="text-xs font-bold font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                                  Pagas e Liberadas
                                </span>
                              </div>
                            </div>

                            {/* Secondary sub-metrics and CTA */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                              <div className="bg-emerald-950/70 border border-emerald-500/30 p-3 rounded-xl min-w-[170px]">
                                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                                  Comissões Pendentes
                                </span>
                                <span className="text-lg font-extrabold font-mono text-amber-300 block mt-0.5" title={formatCurrencyBRL(totalPendingCommissions)}>
                                  {formatCurrencyBRL(totalPendingCommissions)}
                                </span>
                                <span className="text-[10px] text-emerald-200/80 font-medium block">Aguardando liquidação</span>
                              </div>

                              <button
                                onClick={() => {
                                  setPayoutPixKey(currentPartner?.chavePix || "");
                                  setPayoutAmountCustom(saldoVendasDisponivel > 0 ? saldoVendasDisponivel.toFixed(2) : "0");
                                  setCommissionPayoutSuccess(null);
                                  setPayoutModalOrigin("vendas");
                                }}
                                className="bg-[#00A86B] hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 min-h-[44px]"
                                title="Solicitar saque das comissões de vendas/planos"
                              >
                                <Coins className="w-4 h-4 text-slate-950 shrink-0" />
                                <span>Solicitar Comissão</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* DESEMPENHO & CONTROLE FINANCEIRO DE SERVIÇOS (PASSO 6) - COMISSÃO TIERED */}
                  {(() => {
                    interface ServiceItem {
                      id: string;
                      titulo: string;
                      preco: number;
                      statusPagamento: "pendente" | "pago" | "cancelado";
                      formaPagamento?: string;
                      metodoPagamento?: string;
                      dataPagamento?: string;
                      dataLiberacaoSaque?: string;
                      isLiquidated: boolean;
                      comissao: number;
                      concluida?: boolean;
                    }

                    interface LeadGroupedServices {
                      leadId: string;
                      leadObj: Lead;
                      leadName: string;
                      leadCnpj?: string;
                      leadEtapa?: number;
                      leadStatus?: string;
                      services: ServiceItem[];
                      totalServicos: number;
                      totalComissao: number;
                      totalPago: number;
                      comissaoPaga: number;
                      comissaoLiberadaSaque: number;
                      comissaoAguardandoLiquidacao: number;
                      totalPendente: number;
                      comissaoPendente: number;
                      totalCancelado: number;
                      statusGeral: "pago" | "pendente" | "cancelado" | "parcial";
                      isTeamLead?: boolean;
                      consultantName?: string;
                      consultantPlan?: string;
                      appliedRate: number;
                      rateDisplay: string;
                    }

                    const partnerPlan = currentPartner?.plano || "";
                    const isMasterUser = isFranquiaDigital(partnerPlan);
                    const myDirectRate = getServiceCommissionRate(partnerPlan); // 0.10 Starter, 0.20 Executive, 0.30 Master

                    const groupedMap = new Map<string, LeadGroupedServices>();

                    // 1. Leads Próprios do Parceiro
                    leads.forEach((l) => {
                      let rawServices: any[] = [];

                      if (Array.isArray((l as any).subEtapasPasso6) && (l as any).subEtapasPasso6.length > 0) {
                        rawServices = (l as any).subEtapasPasso6;
                      } else if (Array.isArray((l as any).servicosRecomendados) && (l as any).servicosRecomendados.length > 0) {
                        rawServices = (l as any).servicosRecomendados;
                      } else if (Array.isArray((l as any).diagnosticoPROSFEC?.servicosRecomendados) && (l as any).diagnosticoPROSFEC.servicosRecomendados.length > 0) {
                        rawServices = (l as any).diagnosticoPROSFEC.servicosRecomendados;
                      }

                      if (rawServices.length === 0) return;

                      // Synchronize with active catalog prices and names dynamically
                      const syncedServices = sanitizeAndSyncServicosList(rawServices, catalogServices);

                      const parsedServices: ServiceItem[] = syncedServices.map((s: any, idx: number) => {
                        const precoNum = typeof s.preco === "number" 
                          ? s.preco 
                          : typeof s.valor === "number" 
                            ? s.valor 
                            : parseFloat(s.preco || s.valor || 0) || 0;

                        let st: "pendente" | "pago" | "cancelado" = "pendente";
                        if (s.statusPagamento === "cancelado" || s.cancelado === true || s.status === "cancelado") {
                          st = "cancelado";
                        } else if (s.statusPagamento === "pago" || s.pago === true || (s.concluida && s.statusPagamento !== "pendente")) {
                          st = "pago";
                        }

                        const isLiquidated = st === "pago" && (!s.dataLiberacaoSaque || new Date(s.dataLiberacaoSaque).getTime() <= Date.now());

                        return {
                          id: s.id || `srv_${l.id}_${idx}`,
                          titulo: s.titulo || s.nome || s.servico || `Serviço de Estruturação #${idx + 1}`,
                          preco: precoNum,
                          statusPagamento: st,
                          formaPagamento: s.formaPagamento,
                          metodoPagamento: s.metodoPagamento,
                          dataPagamento: s.dataPagamento,
                          dataLiberacaoSaque: s.dataLiberacaoSaque,
                          isLiquidated,
                          comissao: precoNum * myDirectRate,
                          concluida: s.concluida
                        };
                      });

                      const totalServicos = parsedServices.reduce((acc, s) => acc + s.preco, 0);
                      const totalComissao = parsedServices.reduce((acc, s) => acc + s.comissao, 0);

                      const totalPago = parsedServices
                        .filter(s => s.statusPagamento === "pago")
                        .reduce((acc, s) => acc + s.preco, 0);
                      const comissaoPaga = parsedServices
                        .filter(s => s.statusPagamento === "pago")
                        .reduce((acc, s) => acc + s.comissao, 0);

                      const comissaoLiberadaSaque = parsedServices
                        .filter(s => s.statusPagamento === "pago" && s.isLiquidated)
                        .reduce((acc, s) => acc + s.comissao, 0);

                      const comissaoAguardandoLiquidacao = parsedServices
                        .filter(s => s.statusPagamento === "pago" && !s.isLiquidated)
                        .reduce((acc, s) => acc + s.comissao, 0);

                      const totalPendente = parsedServices
                        .filter(s => s.statusPagamento === "pendente")
                        .reduce((acc, s) => acc + s.preco, 0);
                      const comissaoPendente = parsedServices
                        .filter(s => s.statusPagamento === "pendente")
                        .reduce((acc, s) => acc + s.comissao, 0);

                      const totalCancelado = parsedServices
                        .filter(s => s.statusPagamento === "cancelado")
                        .reduce((acc, s) => acc + s.preco, 0);

                      let statusGeral: "pago" | "pendente" | "cancelado" | "parcial" = "pendente";
                      if (parsedServices.every(s => s.statusPagamento === "pago")) {
                        statusGeral = "pago";
                      } else if (parsedServices.every(s => s.statusPagamento === "cancelado")) {
                        statusGeral = "cancelado";
                      } else if (parsedServices.some(s => s.statusPagamento === "pago") && parsedServices.some(s => s.statusPagamento === "pendente")) {
                        statusGeral = "parcial";
                      } else {
                        statusGeral = "pendente";
                      }

                      groupedMap.set(l.id, {
                        leadId: l.id,
                        leadObj: l,
                        leadName: l.razaoSocial || l.nomeEmpresa || l.nome || "Empresa sem nome",
                        leadCnpj: l.cnpj,
                        leadEtapa: l.etapa,
                        leadStatus: l.status,
                        services: parsedServices,
                        totalServicos,
                        totalComissao,
                        totalPago,
                        comissaoPaga,
                        comissaoLiberadaSaque,
                        comissaoAguardandoLiquidacao,
                        totalPendente,
                        comissaoPendente,
                        totalCancelado,
                        statusGeral,
                        isTeamLead: false,
                        appliedRate: myDirectRate,
                        rateDisplay: `${Math.round(myDirectRate * 100)}% direta`
                      });
                    });

                    // 2. Se for Master Partner, processar os Leads da Equipe (com override de 10% s/ Executive ou 20% s/ Starter)
                    if (isMasterUser && Array.isArray(teamLeads)) {
                      teamLeads.forEach((l) => {
                        if (groupedMap.has(l.id)) return;

                        let rawServices: any[] = [];
                        if (Array.isArray((l as any).subEtapasPasso6) && (l as any).subEtapasPasso6.length > 0) {
                          rawServices = (l as any).subEtapasPasso6;
                        } else if (Array.isArray((l as any).servicosRecomendados) && (l as any).servicosRecomendados.length > 0) {
                          rawServices = (l as any).servicosRecomendados;
                        } else if (Array.isArray((l as any).diagnosticoPROSFEC?.servicosRecomendados) && (l as any).diagnosticoPROSFEC.servicosRecomendados.length > 0) {
                          rawServices = (l as any).diagnosticoPROSFEC.servicosRecomendados;
                        }

                        if (rawServices.length === 0) return;

                        const member = teamMembers.find(m => m.id === l.parceiroId);
                        const consultantPlan = member?.plano || "Executive Partner PROSFEC";
                        const consultantName = member?.nome || "Consultor da Equipe";
                        const teamOverrideRate = getMasterTeamServiceOverrideRate(consultantPlan);

                        // Synchronize with active catalog prices and names dynamically
                        const syncedServices = sanitizeAndSyncServicosList(rawServices, catalogServices);

                        const parsedServices: ServiceItem[] = syncedServices.map((s: any, idx: number) => {
                          const precoNum = typeof s.preco === "number" 
                            ? s.preco 
                            : typeof s.valor === "number" 
                              ? s.valor 
                              : parseFloat(s.preco || s.valor || 0) || 0;

                          let st: "pendente" | "pago" | "cancelado" = "pendente";
                          if (s.statusPagamento === "cancelado" || s.cancelado === true || s.status === "cancelado") {
                            st = "cancelado";
                          } else if (s.statusPagamento === "pago" || s.pago === true || (s.concluida && s.statusPagamento !== "pendente")) {
                            st = "pago";
                          }

                          const isLiquidated = st === "pago" && (!s.dataLiberacaoSaque || new Date(s.dataLiberacaoSaque).getTime() <= Date.now());

                          return {
                            id: s.id || `srv_team_${l.id}_${idx}`,
                            titulo: s.titulo || s.nome || s.servico || `Serviço de Estruturação #${idx + 1}`,
                            preco: precoNum,
                            statusPagamento: st,
                            formaPagamento: s.formaPagamento,
                            metodoPagamento: s.metodoPagamento,
                            dataPagamento: s.dataPagamento,
                            dataLiberacaoSaque: s.dataLiberacaoSaque,
                            isLiquidated,
                            comissao: precoNum * teamOverrideRate,
                            concluida: s.concluida
                          };
                        });

                        const totalServicos = parsedServices.reduce((acc, s) => acc + s.preco, 0);
                        const totalComissao = parsedServices.reduce((acc, s) => acc + s.comissao, 0);

                        const totalPago = parsedServices
                          .filter(s => s.statusPagamento === "pago")
                          .reduce((acc, s) => acc + s.preco, 0);
                        const comissaoPaga = parsedServices
                          .filter(s => s.statusPagamento === "pago")
                          .reduce((acc, s) => acc + s.comissao, 0);

                        const comissaoLiberadaSaque = parsedServices
                          .filter(s => s.statusPagamento === "pago" && s.isLiquidated)
                          .reduce((acc, s) => acc + s.comissao, 0);

                        const comissaoAguardandoLiquidacao = parsedServices
                          .filter(s => s.statusPagamento === "pago" && !s.isLiquidated)
                          .reduce((acc, s) => acc + s.comissao, 0);

                        const totalPendente = parsedServices
                          .filter(s => s.statusPagamento === "pendente")
                          .reduce((acc, s) => acc + s.preco, 0);
                        const comissaoPendente = parsedServices
                          .filter(s => s.statusPagamento === "pendente")
                          .reduce((acc, s) => acc + s.comissao, 0);

                        const totalCancelado = parsedServices
                          .filter(s => s.statusPagamento === "cancelado")
                          .reduce((acc, s) => acc + s.preco, 0);

                        let statusGeral: "pago" | "pendente" | "cancelado" | "parcial" = "pendente";
                        if (parsedServices.every(s => s.statusPagamento === "pago")) {
                          statusGeral = "pago";
                        } else if (parsedServices.every(s => s.statusPagamento === "cancelado")) {
                          statusGeral = "cancelado";
                        } else if (parsedServices.some(s => s.statusPagamento === "pago") && parsedServices.some(s => s.statusPagamento === "pendente")) {
                          statusGeral = "parcial";
                        } else {
                          statusGeral = "pendente";
                        }

                        groupedMap.set(l.id, {
                          leadId: l.id,
                          leadObj: l,
                          leadName: l.razaoSocial || l.nomeEmpresa || l.nome || "Empresa sem nome",
                          leadCnpj: l.cnpj,
                          leadEtapa: l.etapa,
                          leadStatus: l.status,
                          services: parsedServices,
                          totalServicos,
                          totalComissao,
                          totalPago,
                          comissaoPaga,
                          comissaoLiberadaSaque,
                          comissaoAguardandoLiquidacao,
                          totalPendente,
                          comissaoPendente,
                          totalCancelado,
                          statusGeral,
                          isTeamLead: true,
                          consultantName,
                          consultantPlan,
                          appliedRate: teamOverrideRate,
                          rateDisplay: `${Math.round(teamOverrideRate * 100)}% equipe (${consultantPlan.toUpperCase().includes("STARTER") ? "Starter" : "Executive"})`
                        });
                      });
                    }

                    const allLeadGroups = Array.from(groupedMap.values());

                    // Totais Consolidados
                    const totalServicosPendentes = allLeadGroups.reduce((acc, lg) => acc + lg.totalPendente, 0);
                    const totalComissaoPendente = allLeadGroups.reduce((acc, lg) => acc + lg.comissaoPendente, 0);
                    const countPendentes = allLeadGroups.filter(lg => lg.totalPendente > 0).length;

                    const totalServicosPagos = allLeadGroups.reduce((acc, lg) => acc + lg.totalPago, 0);
                    const totalComissaoPaga = allLeadGroups.reduce((acc, lg) => acc + lg.comissaoPaga, 0);
                    const totalComissaoLiberadaSaque = allLeadGroups.reduce((acc, lg) => acc + lg.comissaoLiberadaSaque, 0);
                    const totalComissaoAguardandoCompensacao = allLeadGroups.reduce((acc, lg) => acc + lg.comissaoAguardandoLiquidacao, 0);
                    const countPagos = allLeadGroups.filter(lg => lg.totalPago > 0).length;

                    // Breakdown Master (Diretas vs Equipe)
                    const totalComissaoDiretaPaga = allLeadGroups
                      .filter(lg => !lg.isTeamLead)
                      .reduce((acc, lg) => acc + lg.comissaoPaga, 0);
                    const totalComissaoEquipePaga = allLeadGroups
                      .filter(lg => lg.isTeamLead)
                      .reduce((acc, lg) => acc + lg.comissaoPaga, 0);

                    // Deduções de Saques Solicitados (solicitacoes_comissao)
                    const totalSaquesPagos = solicitacoesComissao
                      .filter(s => getSolicitacaoOrigem(s) === "servicos" && s.status === "pago")
                      .reduce((acc, s) => acc + (s.valor || 0), 0);

                    const totalSaquesPendentes = solicitacoesComissao
                      .filter(s => getSolicitacaoOrigem(s) === "servicos" && s.status === "pendente")
                      .reduce((acc, s) => acc + (s.valor || 0), 0);

                    // Saldo Disponível Líquido para Novo Saque
                    const saldoDisponivelParaSaque = Math.max(0, totalComissaoLiberadaSaque - (totalSaquesPagos + totalSaquesPendentes));

                    const totalServicosCancelados = allLeadGroups.reduce((acc, lg) => acc + lg.totalCancelado, 0);
                    const countCancelados = allLeadGroups.filter(lg => lg.totalCancelado > 0 && lg.totalPago === 0 && lg.totalPendente === 0).length;

                    // Lista Filtrada
                    const filteredGroups = allLeadGroups.filter(lg => {
                      let matchesFilter = true;
                      if (dashboardServiceFilter === "pendente") {
                        matchesFilter = lg.totalPendente > 0;
                      } else if (dashboardServiceFilter === "pago") {
                        matchesFilter = lg.totalPago > 0;
                      } else if (dashboardServiceFilter === "cancelado") {
                        matchesFilter = lg.totalCancelado > 0 && lg.totalPago === 0 && lg.totalPendente === 0;
                      }

                      const matchesSearch = !dashboardServiceSearch || 
                        lg.leadName.toLowerCase().includes(dashboardServiceSearch.toLowerCase()) ||
                        (lg.leadCnpj && lg.leadCnpj.includes(dashboardServiceSearch)) ||
                        (lg.consultantName && lg.consultantName.toLowerCase().includes(dashboardServiceSearch.toLowerCase())) ||
                        lg.services.some(s => s.titulo.toLowerCase().includes(dashboardServiceSearch.toLowerCase()));

                      return matchesFilter && matchesSearch;
                    });

                    return (
                      <div className="bg-white/75 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-6 text-left">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 text-[#00A86B] rounded-xl border border-emerald-100 shrink-0">
                              <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                                  Desempenho & Controle Financeiro de Serviços (Passo 6)
                                </h3>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Acompanhamento consolidado dos serviços de estruturação técnica contratados e comissões por plano.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className="text-[11px] font-bold uppercase font-mono tracking-wider px-3 py-1.5 rounded-md bg-emerald-50 text-[#00A86B] border border-emerald-200">
                              Margem: {getPlanServiceLabel(partnerPlan)}
                            </span>
                          </div>
                        </div>

                        {/* 4 Financial Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Card 1: Pendentes */}
                          <div className="bg-amber-50/40 border border-amber-200/70 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-amber-400/80 transition-all">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-bold uppercase tracking-wider">
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2} />
                                <span>Serviços Pendentes</span>
                              </div>
                              <div>
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-200">
                                  {countPendentes} {countPendentes === 1 ? "lead pendente" : "leads pendentes"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-tight" title={formatCurrencyBRL(totalServicosPendentes)}>
                                {formatCurrencyBRL(totalServicosPendentes)}
                              </div>
                              <div className="mt-2 pt-2 border-t border-amber-200/50 flex items-center justify-between text-[11px]">
                                <span className="text-amber-800 font-semibold">Comissão prevista:</span>
                                <span className="font-mono font-bold text-amber-900" title={formatCurrencyBRL(totalComissaoPendente)}>
                                  {formatCurrencyBRL(totalComissaoPendente)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card 2: Pagos */}
                          <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-400/80 transition-all">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-4 h-4 text-[#00A86B] shrink-0" strokeWidth={2} />
                                <span>Serviços Pagos</span>
                              </div>
                              <div>
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                                  {countPagos} {countPagos === 1 ? "serviço quitado" : "serviços quitados"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-base sm:text-lg font-bold font-mono text-[#00A86B] tracking-tight" title={formatCurrencyBRL(totalServicosPagos)}>
                                {formatCurrencyBRL(totalServicosPagos)}
                              </div>
                              <div className="mt-2 pt-2 border-t border-emerald-200/50 flex flex-col gap-1 text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-800 font-semibold">Comissão Conquistada:</span>
                                  <span className="font-mono font-bold text-emerald-900" title={formatCurrencyBRL(totalComissaoPaga)}>
                                    {formatCurrencyBRL(totalComissaoPaga)}
                                  </span>
                                </div>
                                {isMasterUser && (totalComissaoDiretaPaga > 0 || totalComissaoEquipePaga > 0) && (
                                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-700 pt-1 border-t border-emerald-200/40">
                                    <span>Direta: {formatCurrencyBRL(totalComissaoDiretaPaga)}</span>
                                    <span>Equipe: {formatCurrencyBRL(totalComissaoEquipePaga)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card 3: Saques & Repasses */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-300 transition-all">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                                <DollarSign className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
                                <span>Repasses Pix Pagos</span>
                              </div>
                              <div>
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                                  {solicitacoesComissao.filter(s => s.status === "pago").length} repasse(s) pago(s)
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-base sm:text-lg font-bold font-mono text-slate-800 tracking-tight" title={formatCurrencyBRL(totalSaquesPagos)}>
                                {formatCurrencyBRL(totalSaquesPagos)}
                              </div>
                              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">Em processamento:</span>
                                <span className="font-mono font-bold text-amber-700" title={formatCurrencyBRL(totalSaquesPendentes)}>
                                  {formatCurrencyBRL(totalSaquesPendentes)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card 4: Saldo Disponível para Saque (Solid #0A3D2E, no gradient) */}
                          <div className="bg-[#0A3D2E] text-white rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden border border-emerald-500/20 shadow-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold uppercase tracking-wider">
                                <Coins className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2} />
                                <span>Saldo Disponível</span>
                              </div>
                              <div>
                                <button
                                  onClick={() => {
                                    setPayoutPixKey(currentPartner?.chavePix || "");
                                    setPayoutAmountCustom(saldoDisponivelParaSaque > 0 ? saldoDisponivelParaSaque.toFixed(2) : "0");
                                    setCommissionPayoutSuccess(null);
                                    setPayoutModalOrigin("servicos");
                                  }}
                                  disabled={saldoDisponivelParaSaque <= 0}
                                  className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-[#00A86B] hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 cursor-pointer transition-all shadow-xs"
                                  title="Solicitar saque de comissão via Pix"
                                >
                                  Solicitar Saque
                                </button>
                              </div>
                            </div>
                            <div>
                              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-300 tracking-tight" title={formatCurrencyBRL(saldoDisponivelParaSaque)}>
                                {formatCurrencyBRL(saldoDisponivelParaSaque)}
                              </div>
                              <div className="mt-2 pt-2 border-t border-emerald-800/60 flex flex-col gap-1 text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-200/80">Total Conquistado:</span>
                                  <span className="font-mono font-bold text-white" title={formatCurrencyBRL(totalComissaoPaga)}>
                                    {formatCurrencyBRL(totalComissaoPaga)}
                                  </span>
                                </div>
                                {totalComissaoAguardandoCompensacao > 0 && (
                                  <div className="flex items-center justify-between text-[10px] text-amber-300 font-mono pt-0.5">
                                    <span>Compensando:</span>
                                    <span className="font-bold">{formatCurrencyBRL(totalComissaoAguardandoCompensacao)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Banner Informativo de Liquidação Hubla no Painel do Parceiro */}
                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-950">
                          <div className="flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-emerald-900 block">Regra de Liquidação Financeira & Liberação de Saque:</span>
                              <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">
                                A liberação da comissão de serviços ocorre após a compensação bancária na Hubla: <strong>48h para PIX</strong> e <strong>15 dias corridos para Cartão de Crédito</strong>.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setPayoutPixKey(currentPartner?.chavePix || "");
                                setPayoutAmountCustom(saldoDisponivelParaSaque > 0 ? saldoDisponivelParaSaque.toFixed(2) : "0");
                                setCommissionPayoutSuccess(null);
                                setPayoutModalOrigin("servicos");
                              }}
                              className="px-3.5 py-2 bg-[#00A86B] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                            >
                              <Coins className="w-4 h-4 text-slate-950" />
                              <span>Solicitar Comissão</span>
                            </button>
                          </div>
                        </div>

                        {/* Grouped Table by Lead */}
                        <div className="space-y-3 pt-2">
                          {/* Filter Tabs and Search Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDashboardServiceFilter("todos")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  dashboardServiceFilter === "todos"
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                }`}
                              >
                                Todos ({allLeadGroups.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setDashboardServiceFilter("pendente")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  dashboardServiceFilter === "pendente"
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200"
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Com Pendentes ({countPendentes})
                              </button>
                              <button
                                type="button"
                                onClick={() => setDashboardServiceFilter("pago")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  dashboardServiceFilter === "pago"
                                    ? "bg-[#00A86B] text-slate-950 shadow-xs"
                                    : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Quitados ({countPagos})
                              </button>
                              <button
                                type="button"
                                onClick={() => setDashboardServiceFilter("cancelado")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  dashboardServiceFilter === "cancelado"
                                    ? "bg-slate-700 text-white shadow-xs"
                                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                }`}
                              >
                                Cancelados ({countCancelados})
                              </button>
                            </div>

                            <div className="relative w-full sm:w-64">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Buscar cliente, consultor ou serviço..."
                                value={dashboardServiceSearch}
                                onChange={(e) => setDashboardServiceSearch(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-medium placeholder:text-slate-400 outline-hidden focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] transition-all"
                              />
                            </div>
                          </div>

                          {/* Grouped Lead Cards or Empty State */}
                          {filteredGroups.length === 0 ? (
                            <div className="py-8 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                              <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-xs font-bold text-slate-600">
                                {allLeadGroups.length === 0
                                  ? "Nenhum serviço do Passo 6 gerado para seus leads ainda."
                                  : "Nenhum cliente encontrado com os filtros selecionados."}
                              </p>
                              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                {allLeadGroups.length === 0
                                  ? "Quando seus clientes avançarem para o Passo 6 (Estruturação Técnica) e tiverem serviços de melhoria de crédito recomendados ou contratados, você acompanhará o valor consolidado e sua comissão aqui em tempo real."
                                  : "Tente alterar o filtro de status ou o termo de busca para visualizar os outros registros."}
                              </p>
                            </div>
                          ) : (
                            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white/75 backdrop-blur-xl shadow-2xs">
                              <div className="overflow-x-auto">
                                <div className="min-w-[920px] divide-y divide-slate-100">
                                  {/* Table Header */}
                                  <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono items-center border-b border-slate-200/70">
                                    <div className="col-span-4">Cliente / Lead</div>
                                    <div className="col-span-2 text-center">Qtd. Serviços</div>
                                    <div className="col-span-2 text-right">Valor Total Serviços</div>
                                    <div className="col-span-2 text-right">Sua Comissão</div>
                                    <div className="col-span-2 text-center">Ações</div>
                                  </div>

                                  {filteredGroups.map((group) => {
                                    const isExpanded = expandedServiceLeadId === group.leadId;

                                    return (
                                      <div key={group.leadId} className="hover:bg-slate-50/50 transition-colors">
                                        {/* Main Consolidated Row per Lead */}
                                        <div className="px-5 py-3.5 grid grid-cols-12 gap-3 items-center">
                                          {/* Lead Info */}
                                          <div className="col-span-4 space-y-1.5 pr-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-xs text-slate-900 leading-snug">
                                                {group.leadName}
                                              </span>
                                              {group.isTeamLead && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap" title={`Lead da Equipe: ${group.consultantName}`}>
                                                  Equipe ({group.consultantName})
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap inline-flex items-center ${
                                                group.statusGeral === "pago"
                                                  ? "bg-emerald-50 text-[#00A86B] border border-emerald-200"
                                                  : group.statusGeral === "cancelado"
                                                    ? "bg-slate-50 text-slate-600 border border-slate-200"
                                                    : group.statusGeral === "parcial"
                                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                              }`}>
                                                {group.statusGeral === "pago" 
                                                  ? "✓ Quitado" 
                                                  : group.statusGeral === "cancelado" 
                                                    ? "Cancelado" 
                                                    : group.statusGeral === "parcial" 
                                                      ? "Parcialmente Pago" 
                                                      : "⏳ Aguardando Pagamento"}
                                              </span>

                                              {group.leadCnpj && (
                                                <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                  CNPJ: {group.leadCnpj}
                                                </span>
                                              )}

                                              <span className="font-mono font-bold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 whitespace-nowrap">
                                                Taxa: {group.rateDisplay}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Services count badge */}
                                          <div className="col-span-2 flex items-center justify-center">
                                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80 whitespace-nowrap inline-block text-center">
                                              {group.services.length} {group.services.length === 1 ? "serviço" : "serviços"}
                                            </span>
                                          </div>

                                          {/* Total Services Value */}
                                          <div className="col-span-2 text-right pr-1">
                                            <div className="font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                                              {formatCurrencyBRL(group.totalServicos)}
                                            </div>
                                            {group.totalPago > 0 && group.totalPendente > 0 ? (
                                              <span className="block text-[11px] font-mono text-[#00A86B] font-semibold whitespace-nowrap">
                                                {formatCurrencyBRL(group.totalPago)} pago
                                              </span>
                                            ) : (
                                              <span className="block text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                                {group.totalServicos === 0 ? "—" : "valor total"}
                                              </span>
                                            )}
                                          </div>

                                          {/* Total Commission */}
                                          <div className="col-span-2 text-right pr-2">
                                            <div className={`font-mono text-xs font-extrabold whitespace-nowrap ${
                                              group.totalPago > 0 ? "text-[#00A86B]" : "text-amber-800"
                                            }`}>
                                              {formatCurrencyBRL(group.totalComissao)}
                                            </div>
                                            <span className="block text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                              {group.comissaoPaga > 0 
                                                ? `${formatCurrencyBRL(group.comissaoPaga)} liberada` 
                                                : `${formatCurrencyBRL(group.comissaoPendente)} prevista`}
                                            </span>
                                          </div>

                                          {/* Action buttons */}
                                          <div className="col-span-2 flex items-center justify-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setExpandedServiceLeadId(isExpanded ? null : group.leadId)}
                                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 border h-9 whitespace-nowrap shrink-0 ${
                                                isExpanded
                                                  ? "bg-slate-800 text-white border-slate-800"
                                                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                                              }`}
                                              title="Ver detalhamento dos serviços deste cliente"
                                            >
                                              {isExpanded ? (
                                                <>
                                                  <span>Recolher</span>
                                                  <ChevronDown className="w-3.5 h-3.5" />
                                                </>
                                              ) : (
                                                <>
                                                  <span>Detalhes</span>
                                                  <ChevronRight className="w-3.5 h-3.5" />
                                                </>
                                              )}
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedLeadForWorkspace(group.leadObj);
                                                setWorkspaceTab("simulador");
                                              }}
                                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 border border-emerald-200 h-9 whitespace-nowrap shrink-0"
                                              title="Abrir Passo 6 na Ficha do Lead"
                                            >
                                              <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                              <span>Passo 6</span>
                                            </button>
                                          </div>
                                        </div>

                                        {/* Expanded Service Items (Nested breakdown with clean layout) */}
                                        {isExpanded && (
                                          <div className="bg-slate-50/80 p-4 border-t border-slate-100 space-y-2.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
                                              <span>Discriminação dos Serviços de Estruturação ({group.services.length})</span>
                                              <span>Margem Aplicada: {group.rateDisplay}</span>
                                            </div>

                                            <div className="space-y-2">
                                              {group.services.map((srv, sIdx) => (
                                                <div
                                                  key={srv.id || sIdx}
                                                  className="bg-white/75 backdrop-blur-xl p-3 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                                                >
                                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <Briefcase className="w-3.5 h-3.5 text-[#00A86B] shrink-0" />
                                                    <span className="font-bold text-slate-800">{srv.titulo}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase whitespace-nowrap ${
                                                      srv.statusPagamento === "pago"
                                                        ? "bg-emerald-50 text-[#00A86B] border border-emerald-200"
                                                        : srv.statusPagamento === "cancelado"
                                                          ? "bg-slate-50 text-slate-600 border border-slate-200"
                                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}>
                                                      {srv.statusPagamento === "pago" ? "Pago" : srv.statusPagamento === "cancelado" ? "Cancelado" : "Pendente"}
                                                    </span>
                                                    {srv.statusPagamento === "pago" && (
                                                      <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                                                        Forma: <strong>{srv.metodoPagamento || "PIX/Cartão"}</strong> • {srv.isLiquidated ? (
                                                          <span className="text-emerald-700 font-bold">Saque liberado</span>
                                                        ) : (
                                                          <span className="text-amber-700 font-bold">
                                                            Compensação até {new Date(srv.dataLiberacaoSaque!).toLocaleDateString("pt-BR")} ({srv.metodoPagamento === "PIX" ? "48h PIX" : "15 dias Cartão"})
                                                          </span>
                                                        )}
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                                                    <div>
                                                      <span className="text-slate-400 text-[11px] mr-1">Valor:</span>
                                                      <span className="font-bold text-slate-700 whitespace-nowrap">{formatCurrencyBRL(srv.preco)}</span>
                                                    </div>
                                                    <div className="pl-3 border-l border-slate-200">
                                                      <span className="text-slate-400 text-[11px] mr-1">Sua Margem:</span>
                                                      <span className={`font-extrabold whitespace-nowrap ${srv.statusPagamento === "pago" ? "text-[#00A86B]" : "text-amber-800"}`}>
                                                        {formatCurrencyBRL(srv.comissao)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* HISTÓRICO DE REPASSES E SAQUES PIX DO PARCEIRO */}
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4.5 h-4.5 text-[#00A86B]" />
                              <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
                                Histórico de Solicitações de Saque & Repasses PIX
                              </h4>
                            </div>
                            <span className="text-xs font-mono text-slate-500">
                              Total de solicitações: <strong>{solicitacoesComissao.length}</strong>
                            </span>
                          </div>

                          {solicitacoesComissao.length === 0 ? (
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-1">
                              <Coins className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                              <p className="text-xs font-bold text-slate-700">Nenhum saque solicitado até o momento.</p>
                              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                À medida que seus clientes quitarem os serviços e passarem pelo prazo de liquidação Hubla, você poderá solicitar o repasse via PIX diretamente para sua conta.
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Data</th>
                                    <th className="py-2.5 px-3">Valor</th>
                                    <th className="py-2.5 px-3">Chave PIX</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Liquidação / Comprovante</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {solicitacoesComissao.map((sol) => (
                                    <tr key={sol.id} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="py-2.5 px-3 font-mono text-slate-600 text-xs">
                                        {new Date(sol.dataSolicitacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900">
                                        {formatCurrencyBRL(sol.valor)}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600 truncate max-w-[140px]" title={sol.chavePix}>
                                        {sol.chavePix}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase font-mono ${
                                          sol.status === "pago"
                                            ? "bg-emerald-50 text-[#00A86B] border border-emerald-200"
                                            : sol.status === "recusado"
                                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                                              : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}>
                                          {sol.status === "pago" && <CheckCircle2 className="w-3 h-3 text-[#00A86B]" />}
                                          {sol.status === "recusado" && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                          {sol.status === "pendente" && <Clock className="w-3 h-3 text-amber-600" />}
                                          {sol.status === "pago" ? "Pago via PIX" : sol.status === "recusado" ? "Recusado" : "Aguardando PIX ADM"}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-xs text-slate-600">
                                        {sol.status === "pago" ? (
                                          <div className="space-y-0.5">
                                            <span className="font-semibold text-emerald-800 block text-xs">
                                              Pago em: {sol.dataPagamento ? new Date(sol.dataPagamento).toLocaleDateString("pt-BR") : "Confirmado"}
                                            </span>
                                            {sol.comprovantePixUrl && (
                                              <a
                                                href={sol.comprovantePixUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-[#00A86B] hover:underline font-bold"
                                              >
                                                Ver Comprovante
                                              </a>
                                            )}
                                          </div>
                                        ) : sol.status === "recusado" ? (
                                          <span className="text-rose-700 text-xs italic">
                                            {sol.motivoRecusa || "Estornado para o saldo"}
                                          </span>
                                        ) : (
                                          <span className="text-amber-700 text-xs">
                                            Em análise financeira
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
                      </div>
                    );
                  })()}

                  {/* Franquia Digital Franchise Summary Overview (Quinta linha: Desempenho Master Partner) */}
                  {isFranquiaDigital(currentPartner?.plano) && (
                    <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 rounded-3xl border border-emerald-500/20 text-white shadow-md space-y-4 text-left">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-emerald-400" />
                          <div>
                            <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-emerald-300">Desempenho Master Partner</h3>
                            <p className="text-[10px] text-emerald-200">Visão consolidada da sua equipe de consultores autônomos</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("equipe")}
                          className="px-3 py-1.5 bg-emerald-700/50 hover:bg-emerald-600/50 border border-emerald-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          Gerenciar Consultores
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {(() => {
                        const totalConcludedTeamOverride = teamLeads
                          .filter(l => l.status === "concluido")
                          .reduce((acc, l) => acc + ((l.valorAprovado || l.limiteEstimado || 0) * getOverrideMultiplierForLead(l)), 0);

                        const totalDirectConcludedComm = leads
                          .filter(l => l.status === "concluido")
                          .reduce((acc, l) => acc + ((l.valorAprovado || l.limiteEstimado || 0) * getDirectCommissionMultiplier(currentPartner?.plano)), 0);

                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
                              <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl">
                                <span className="text-[9px] uppercase font-bold text-emerald-300 block tracking-wider">Membros na Equipe</span>
                                <span className="text-xl font-black text-white block mt-0.5">{teamMembers.length}</span>
                              </div>
                              <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl">
                                <span className="text-[9px] uppercase font-bold text-emerald-300 block tracking-wider">Leads da Equipe</span>
                                <span className="text-xl font-black text-white block mt-0.5">{teamLeads.length}</span>
                              </div>
                              <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl">
                                <span className="text-[9px] uppercase font-bold text-emerald-300 block tracking-wider">Faturamento Equipe Concluído</span>
                                <span className="text-sm font-black text-white block mt-1">
                                  {formatCurrencyBRL(teamLeads.filter(l => l.status === "concluido").reduce((acc, l) => acc + (l.limiteEstimado || 0), 0))}
                                </span>
                              </div>
                              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                                <span className="text-[9px] uppercase font-bold text-amber-300 block tracking-wider font-mono">Override Equipe Dinâmico</span>
                                <span className="text-sm font-black text-amber-300 block mt-1">
                                  {formatCurrencyBRL(totalConcludedTeamOverride)}
                                </span>
                              </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs text-emerald-100 gap-2">
                              <div className="flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Seus Ganhos Diretos Concluídos ({(getDirectCommissionMultiplier(currentPartner?.plano) * 100).toFixed(1)}%): <strong>{formatCurrencyBRL(totalDirectConcludedComm)}</strong></span>
                              </div>
                              <div className="font-extrabold text-emerald-300 text-sm sm:text-right">
                                Total Geral Acumulado: {formatCurrencyBRL(totalDirectConcludedComm + totalConcludedTeamOverride)}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Calculator and CRM Highlights Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Embedded Commission Calculator (Solid #0A3D2E, rounded-2xl) */}
                    <div className="lg:col-span-5 bg-[#0A3D2E] text-white p-5 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-700/40 flex items-center justify-center text-emerald-300 shrink-0">
                          <Calculator className="w-4.5 h-4.5 text-emerald-300" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white uppercase tracking-wider">Simulador do Repassador</h4>
                          <p className="text-[11px] text-emerald-300/80">Simule ganhos com base no seu plano atual.</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-emerald-200">
                            <span>Créditos liberados p/ mês</span>
                            <span className="font-mono font-bold text-emerald-300">{calcLeadsCount} empresas</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={calcLeadsCount}
                            onChange={(e) => setCalcLeadsCount(parseInt(e.target.value))}
                            className="w-full accent-[#00A86B] cursor-pointer bg-emerald-900 rounded-lg h-2"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-emerald-200">
                            <span>Valor médio do contrato</span>
                            <span className="font-mono font-bold text-emerald-300">{formatCurrencyBRL(calcAvgValue)}</span>
                          </div>
                          <input
                            type="range"
                            min="50000"
                            max="500000"
                            step="25000"
                            value={calcAvgValue}
                            onChange={(e) => setCalcAvgValue(parseInt(e.target.value))}
                            className="w-full accent-[#00A86B] cursor-pointer bg-emerald-900 rounded-lg h-2"
                          />
                        </div>
                      </div>

                      <div className="bg-emerald-950/80 p-4 border border-emerald-800/80 rounded-xl mt-4">
                        <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
                          Sua Comissão Mensal Estimada
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-300 block mt-1">
                          {formatCurrencyBRL(calculatedCommission)}
                        </span>
                        <span className="text-[10px] text-emerald-400/90 leading-normal block mt-2">
                          *A simulação utiliza o percentual de repasse vinculado ao seu plano atual ({(getCommissionMultiplier(currentPartner?.plano) * 100).toFixed(1)}%).
                        </span>
                      </div>
                    </div>

                    {/* Quick CRM View */}
                    <div className="lg:col-span-7 bg-white/75 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#00A86B] border border-emerald-100 flex items-center justify-center shrink-0">
                              <ClipboardList className="w-4.5 h-4.5" />
                            </div>
                            <h4 className="font-bold text-sm text-slate-900">Últimas Indicações</h4>
                          </div>
                          <button 
                            onClick={() => setActiveTab("leads")}
                            className="text-xs text-[#00A86B] font-extrabold hover:underline cursor-pointer"
                          >
                            Ver Todos
                          </button>
                        </div>

                        {fetchLoading ? (
                          <div className="py-12 flex justify-center items-center">
                            <span className="w-6 h-6 border-2 border-[#0A3D2E] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : leads.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 font-medium space-y-1">
                            <p className="font-bold text-slate-600">Nenhum lead indicado ainda.</p>
                            <p>Divulgue seu link para começar a receber comissões!</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                            {leads.slice(0, 4).map(lead => (
                              <div key={lead.id} className="py-3 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block truncate max-w-xs">{lead.nome}</span>
                                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{lead.cnpj || "CPF/CNPJ sob consulta"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold font-mono text-[#0A3D2E] block">{lead.limiteEstimated ? formatCurrencyBRL(lead.limiteEstimated) : (lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Sob Consulta")}</span>
                                  <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                                    lead.status === "concluido" ? "bg-emerald-50 text-[#00A86B] border border-emerald-200" :
                                    lead.status === "em atendimento" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}>
                                    {lead.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-400">
                        *As informações acima são atualizadas de forma segura e síncrona diretamente da mesa de crédito da PROSFEC.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "leads" && (
                <motion.div
                  key="leads-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] p-5 sm:p-6 space-y-5 text-left"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900">Painel Geral de Indicações</h3>
                      <p className="text-xs text-slate-500">Acompanhe todos os leads originados pelo seu link de afiliado em tempo real.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* View Mode Selector */}
                      <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                        <button
                          onClick={() => setLeadsViewMode("lista")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            leadsViewMode === "lista"
                              ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>Tabela</span>
                        </button>
                        <button
                          onClick={() => setLeadsViewMode("kanban")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            leadsViewMode === "kanban"
                              ? "bg-[#0A3D2E] text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <Kanban className="w-3.5 h-3.5" />
                          <span>Funil Kanban</span>
                        </button>
                      </div>

                      <button 
                        onClick={() => currentPartner && fetchPartnerLeads(currentPartner.id)}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Atualizar</span>
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, CNPJ, razão..."
                        className="pl-9 pr-4 py-2 w-full text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] transition-all text-slate-800 font-medium placeholder:text-slate-400"
                      />
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="py-2 px-3 w-full text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] text-slate-800 font-bold"
                      >
                        <option value="todos">Todos os Status</option>
                        <option value="novo">Novo</option>
                        <option value="em atendimento">Em Atendimento</option>
                        <option value="concluido">Concluído</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                    </div>

                    {/* Etapas */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <select
                        value={etapaFilter}
                        onChange={(e) => setEtapaFilter(e.target.value)}
                        className="py-2 px-3 w-full text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] text-slate-800 font-bold"
                      >
                        <option value="todos">Etapa do Lead (Todas)</option>
                        <option value="1">1. Ficha Cadastral (CNPJ)</option>
                        <option value="2">2. Coleta de Dados Sócios</option>
                        <option value="3">3. Consulta Diagnóstica</option>
                        <option value="4">4. Contrato e Minuta</option>
                        <option value="5">5. Credenciais de Acesso (GOV/Serasa)</option>
                        <option value="6">6. Operacionalização e Estruturação</option>
                        <option value="7">7. Análise de Crédito</option>
                      </select>
                    </div>
                  </div>

                  {regLeadSuccess && (
                    <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-[#00A86B] shrink-0" />
                          <div>
                            <span className="text-[11px] font-bold text-emerald-900 uppercase block tracking-wider">Cadastro Concluído</span>
                            <span className="text-xs text-slate-700 font-semibold leading-relaxed">{regLeadSuccess}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setRegLeadSuccess(null);
                            setRegisteredLeadId(null);
                          }} 
                          className="text-slate-400 hover:text-slate-600 shrink-0 p-1.5 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {registeredLeadId && (
                        <div className="pt-3 border-t border-emerald-200/60 space-y-2">
                          <span className="text-[11px] font-bold text-[#0A3D2E] uppercase tracking-wider block">
                            🔗 Link de Acompanhamento do Cliente
                          </span>
                          <p className="text-xs text-slate-600 leading-normal">
                            Copie o link abaixo e envie para o seu cliente acompanhar o andamento da análise de fomento dele em tempo real:
                          </p>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.hostname.includes("prosfec.com.br") ? window.location.origin : "https://prosfec.com.br"}?leadTrack=${registeredLeadId}`}
                              className="bg-white border border-slate-300 text-xs font-mono px-3 py-2 rounded-xl text-slate-800 font-bold flex-1 select-all"
                            />
                            <button
                              onClick={() => {
                                const domain = window.location.hostname.includes("prosfec.com.br")
                                  ? window.location.origin
                                  : "https://prosfec.com.br";
                                navigator.clipboard.writeText(`${domain}?leadTrack=${registeredLeadId}`);
                                setCopiedTrackingLink(true);
                                setTimeout(() => setCopiedTrackingLink(false), 2000);
                              }}
                              className="px-4 py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs whitespace-nowrap min-h-[40px]"
                            >
                              {copiedTrackingLink ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-300" />
                                  <span>Link Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {fetchLoading ? (
                    <div className="py-24 flex justify-center items-center">
                      <span className="w-8 h-8 border-2 border-[#0A3D2E] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <div className="bg-emerald-50 text-[#00A86B] p-3.5 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto border border-emerald-100">
                        <Handshake className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                        Nenhum lead indicado foi registrado na plataforma com o seu identificador. Comece a divulgar o seu link exclusivo agora!
                      </p>
                    </div>
                  ) : leadsViewMode === "lista" ? (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left text-xs font-semibold uppercase tracking-wider">
                              <th className="py-3.5 px-4 font-semibold">Lead / Empresa</th>
                              <th className="py-3.5 px-4 font-semibold">Contato</th>
                              <th className="py-3.5 px-4 font-semibold">Simulado / Aprovado</th>
                              <th className="py-3.5 px-4 font-semibold">Comissão Parceiro</th>
                              <th className="py-3.5 px-4 font-semibold">Data</th>
                              <th className="py-3.5 px-4 font-semibold">Status / Etapa</th>
                              <th className="py-3.5 px-4 font-semibold text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {paginatedLeads.map(lead => (
                              <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4 font-medium text-slate-800">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900">{lead.razaoSocial || "Não informado"}</span>
                                    {(lead.pendente || lead.pendencias?.status === "pendente") && (
                                      <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-md uppercase">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                        Pendência
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{lead.cnpj || "-"}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-800">{lead.nome}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">{lead.whatsapp || lead.email}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5 flex-wrap">
                                    <span>Simulado</span>
                                    <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md font-mono border border-emerald-100">
                                      {lead.propostaNegociada?.creditLineCode || lead.creditLineCode || lead.result?.creditLineCode || "PRONAMPE"}
                                    </span>
                                  </div>
                                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                                    {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Sob Consulta"}
                                  </div>
                                  {(lead.etapa === 7 || lead.status === "concluido") && lead.valorAprovado !== undefined && lead.valorAprovado > 0 && (
                                    <div className="mt-1">
                                      <span className="text-[11px] text-slate-400 font-bold uppercase block">Crédito Aprovado</span>
                                      <span className="font-extrabold font-mono text-[#00A86B] bg-emerald-50 px-2 py-0.5 rounded-md text-xs inline-block mt-0.5 border border-emerald-100">
                                        {formatCurrencyBRL(lead.valorAprovado)}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-extrabold font-mono text-slate-900">
                                    {formatCurrencyBRL((lead.valorAprovado || lead.limiteEstimado || 0) * getDirectCommissionMultiplier(currentPartner?.plano))}
                                  </div>
                                  <div className="mt-1">
                                    {lead.comissaoPaga ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-emerald-50 text-[#00A86B] border border-emerald-200 px-2.5 py-0.5 rounded-md">
                                        ✓ Pago
                                      </span>
                                    ) : (lead.etapa === 7 || lead.status === "concluido") ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md">
                                        ⏱ Pendente
                                      </span>
                                    ) : lead.etapa === 8 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-md">
                                        ✕ Sem Repasse
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-md">
                                        Aguardando
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                                  {new Date(lead.dataCriacao).toLocaleDateString("pt-BR")}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-block text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-md font-mono ${
                                    lead.etapa === 7 ? "bg-emerald-50 text-[#00A86B] border border-emerald-200" :
                                    lead.etapa === 8 ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                    lead.status === "concluido" ? "bg-emerald-50 text-[#00A86B] border border-emerald-200" :
                                    lead.status === "em atendimento" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}>
                                    {lead.etapa === 7 ? "Crédito Aprovado" :
                                     lead.etapa === 8 ? "Crédito Recusado" :
                                     lead.status === "concluido" ? "Concluído" :
                                     lead.status === "em atendimento" ? "Em Atendimento" :
                                     lead.status === "novo" ? "Novo" :
                                     lead.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenLeadWorkspace(lead, "details")}
                                      className="px-3 py-1.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white rounded-xl transition-all font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap min-h-[36px]"
                                      title="Abrir Ficha de Crédito do Lead"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-emerald-300" />
                                      <span>Ficha Lead</span>
                                    </button>
                                    <button
                                      onClick={() => handleOpenLeadWorkspace(lead, "simulador")}
                                      disabled={lead.etapa === 7 || lead.etapa === 8}
                                      className={`p-2 border rounded-xl transition-all flex items-center justify-center shrink-0 min-h-[36px] min-w-[36px] ${
                                        lead.etapa === 7 || lead.etapa === 8
                                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 cursor-pointer"
                                      }`}
                                      title={
                                        lead.etapa === 7
                                          ? "Crédito aprovado - Simulação finalizada"
                                          : lead.etapa === 8
                                          ? "Crédito recusado - Simulação desativada"
                                          : `Negociar Proposta (${lead.propostaNegociada?.creditLineCode || lead.creditLineCode || lead.result?.creditLineCode || "Simulação"})`
                                      }
                                    >
                                      <Calculator className="w-4 h-4" />
                                    </button>
                                    {isFranquiaDigital(currentPartner?.plano) && (
                                      <button
                                        onClick={() => setAssigningLead(lead)}
                                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer min-h-[36px] min-w-[36px]"
                                        title="Direcionar para Consultor da Equipe"
                                      >
                                        <Send className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card-Based View */}
                      <div className="block md:hidden space-y-4">
                        {paginatedLeads.map(lead => {
                          const isConcluded = lead.etapa === 7 || lead.status === "concluido";
                          const isRefused = lead.etapa === 8;
                          const directCommissionValue = (lead.valorAprovado || lead.limiteEstimado || 0) * getDirectCommissionMultiplier(currentPartner?.plano);
                          
                          return (
                            <div key={lead.id} className="bg-white/75 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                              {/* Header: Date & Status Badge */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {new Date(lead.dataCriacao).toLocaleDateString("pt-BR")}
                                </span>
                                <span className={`text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-md font-mono ${
                                  lead.etapa === 7 ? "bg-emerald-50 text-[#00A86B] border border-emerald-200" :
                                  lead.etapa === 8 ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                  lead.status === "concluido" ? "bg-emerald-50 text-[#00A86B] border border-emerald-200" :
                                  lead.status === "em atendimento" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                  "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}>
                                  {lead.etapa === 7 ? "Crédito Aprovado" :
                                   lead.etapa === 8 ? "Crédito Recusado" :
                                   lead.status === "concluido" ? "Concluído" :
                                   lead.status === "em atendimento" ? "Em Atendimento" :
                                   lead.status === "novo" ? "Novo" :
                                   lead.status}
                                </span>
                              </div>

                              {/* Lead / Company info */}
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                    {lead.razaoSocial || "Não informado"}
                                  </h4>
                                </div>
                                {(lead.pendente || lead.pendencias?.status === "pendente") && (
                                  <div className="mt-1 flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>PENDÊNCIA DE DOCUMENTO ATIVA</span>
                                  </div>
                                )}
                                <div className="text-[11px] text-slate-500 font-mono">
                                  CNPJ: {lead.cnpj || "-"}
                                </div>
                              </div>

                              {/* Contact info card block */}
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-1 text-xs text-slate-700">
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  {lead.nome}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pl-5">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  {lead.whatsapp || lead.email}
                                </div>
                              </div>

                              {/* Values side-by-side */}
                              <div className="grid grid-cols-2 gap-2.5 text-xs">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase block">Simulado</span>
                                    <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-1.5 py-0.5 rounded-md font-mono border border-emerald-100">
                                      {lead.propostaNegociada?.creditLineCode || lead.creditLineCode || lead.result?.creditLineCode || "PRONAMPE"}
                                    </span>
                                  </div>
                                  <span className="font-bold font-mono text-slate-800 block mt-1">
                                    {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Sob Consulta"}
                                  </span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Valor Aprovado</span>
                                  <span className="font-extrabold font-mono text-[#00A86B] block mt-1">
                                    {(lead.etapa === 7 || lead.status === "concluido") && lead.valorAprovado && lead.valorAprovado > 0 ? formatCurrencyBRL(lead.valorAprovado) : "Sob Consulta"}
                                  </span>
                                </div>
                              </div>

                              {/* Commission Box */}
                              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-[11px] text-emerald-900 font-bold uppercase block">Comissão Estimada</span>
                                  <span className="font-extrabold font-mono text-[#00A86B] text-sm">
                                    {formatCurrencyBRL(directCommissionValue)}
                                  </span>
                                </div>
                                <div>
                                  {lead.comissaoPaga ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                                      ✓ Pago
                                    </span>
                                  ) : isConcluded ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-md">
                                      ⏱ Pendente
                                    </span>
                                  ) : isRefused ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-md">
                                      ✕ Sem Repasse
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-md">
                                      Aguardando
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 8-Step Timeline Compact Indicator */}
                              <LeadStepTimeline compact={true} currentEtapa={lead.etapa || 1} />

                              {/* Buttons action grid */}
                              {(() => {
                                const cardStepStatus = calculateLeadStepStatus(lead);
                                const canAccessSocios = cardStepStatus.isTabUnlocked("socios");
                                const canAccessSimulador = cardStepStatus.isTabUnlocked("simulador");

                                return (
                                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                    <button
                                      onClick={() => handleOpenLeadWorkspace(lead, "details")}
                                      className="py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white rounded-xl transition-all font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                                      title="Abrir Ficha Cadastral (Passo 1)"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-emerald-300" />
                                      <span>Ficha</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (!canAccessSocios) {
                                          alert(cardStepStatus.getLockedReason("socios"));
                                          return;
                                        }
                                        handleOpenLeadWorkspace(lead, "socios");
                                      }}
                                      className={`py-2.5 border rounded-xl transition-all font-extrabold text-xs flex items-center justify-center gap-1.5 min-h-[44px] ${
                                        !canAccessSocios
                                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                          : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 cursor-pointer"
                                      }`}
                                      title={canAccessSocios ? "Cadastrar/Editar Sócios (Passo 2)" : (cardStepStatus.getLockedReason("socios") || "Bloqueado")}
                                    >
                                      {!canAccessSocios ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Users className="w-3.5 h-3.5" />}
                                      <span>Sócios</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (!canAccessSimulador) {
                                          alert(cardStepStatus.getLockedReason("simulador"));
                                          return;
                                        }
                                        handleOpenLeadWorkspace(lead, "simulador");
                                      }}
                                      disabled={lead.etapa === 7 || lead.etapa === 8}
                                      className={`py-2.5 border rounded-xl transition-all font-extrabold text-xs flex items-center justify-center gap-1.5 min-h-[44px] ${
                                        !canAccessSimulador || lead.etapa === 7 || lead.etapa === 8
                                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 cursor-pointer"
                                      }`}
                                      title={canAccessSimulador ? "Simulador de Estruturação (Passo 6)" : (cardStepStatus.getLockedReason("simulador") || "Bloqueado")}
                                    >
                                      {!canAccessSimulador ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Calculator className="w-3.5 h-3.5 text-emerald-700" />}
                                      <span>Simulador</span>
                                    </button>

                                    {isFranquiaDigital(currentPartner?.plano) ? (
                                      <button
                                        onClick={() => setAssigningLead(lead)}
                                        className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl transition-all font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                                      >
                                        <Send className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span>Direcionar</span>
                                      </button>
                                    ) : (
                                      <div className="bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-[11px] text-slate-400 font-semibold select-none min-h-[44px]">
                                        PROSFEC Oficial
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination for Partner Leads */}
                      {filteredLeads.length > itemsPerPage && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl mt-4">
                          <div className="text-xs text-slate-500 font-medium">
                            Mostrando <span className="font-bold font-mono text-slate-700">{((leadsPage - 1) * itemsPerPage) + 1}</span> a{" "}
                            <span className="font-bold font-mono text-slate-700">{Math.min(leadsPage * itemsPerPage, filteredLeads.length)}</span> de{" "}
                            <span className="font-bold font-mono text-slate-700">{filteredLeads.length}</span> indicações
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
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                  ) : (
                    /* Render Kanban View */
                    <div className="space-y-4 pt-2">
                      <div className="overflow-x-auto pb-6 -mx-6 px-6">
                        <div className="flex gap-4 min-w-[1500px]">
                          {[
                            { id: 1, name: "1. Ficha Cadastral", color: "bg-slate-50 border-slate-200/80 text-slate-700", dot: "bg-slate-400" },
                            { id: 2, name: "2. Coleta Sócios", color: "bg-sky-50 border-sky-200/80 text-sky-700", dot: "bg-sky-400" },
                            { id: 3, name: "3. Consulta Diagnóstica", color: "bg-indigo-50 border-indigo-200/80 text-indigo-700", dot: "bg-indigo-400" },
                            { id: 4, name: "4. Contrato e Minuta", color: "bg-purple-50 border-purple-200/80 text-purple-700", dot: "bg-purple-400" },
                            { id: 5, name: "5. Credenciais de Acesso", color: "bg-amber-50 border-amber-200/80 text-amber-700", dot: "bg-amber-400" },
                            { id: 6, name: "6. Operacionalização", color: "bg-blue-50 border-blue-200/80 text-blue-700", dot: "bg-blue-400" },
                            { id: 7, name: "7. Análise de Crédito", color: "bg-emerald-50 border-emerald-200/80 text-emerald-700", dot: "bg-emerald-500" },
                          ].map(column => {
                            const columnLeads = filteredLeads.filter(l => {
                              let leadEtapa = l.etapa || 1;
                              if (l.status === "concluido" || l.status === "aprovado" || l.status === "recusado" || l.status === "arquivado" || l.resultadoAnaliseCredito === "recusado" || l.resultadoAnaliseCredito === "aprovado" || leadEtapa >= 7) {
                                leadEtapa = 7;
                              }
                              return leadEtapa === column.id;
                            });
                            
                            return (
                              <div key={column.id} className="w-72 shrink-0 flex flex-col bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3.5 space-y-3 h-[600px] max-h-[600px]">
                                {/* Column Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`w-2.5 h-2.5 rounded-full ${column.dot} shrink-0`} />
                                    <span className="text-xs font-black text-slate-700 truncate block">
                                      {column.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                                    {columnLeads.length}
                                  </span>
                                </div>

                                {/* Cards List */}
                                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                                  {columnLeads.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sem leads</span>
                                    </div>
                                  ) : (
                                    columnLeads.map(lead => {
                                      const isRefused = lead.etapa === 8 || lead.status === "recusado" || lead.resultadoAnaliseCredito === "recusado";
                                      const isApproved = (lead.valorAprovado && lead.valorAprovado > 0) || lead.status === "concluido" || lead.status === "aprovado" || lead.resultadoAnaliseCredito === "aprovado";
                                      const directCommissionValue = (lead.valorAprovado || lead.limiteEstimado || 0) * getDirectCommissionMultiplier(currentPartner?.plano);
                                      const hasActivePendency = lead.pendente || lead.pendencias?.status === "pendente";

                                      // Sub-etapas for Passo 6 Operacionalização
                                      const rawServs = (lead as any).servicosRecomendados || ((lead as any).diagnosticoPROSFEC && (lead as any).diagnosticoPROSFEC.servicosRecomendados) || [];
                                      const syncedServs = sanitizeAndSyncServicosList(rawServs, catalogServices);
                                      const subList = (lead as any).subEtapasPasso6 && (lead as any).subEtapasPasso6.length > 0
                                        ? sanitizeAndSyncServicosList((lead as any).subEtapasPasso6, catalogServices)
                                        : (syncedServs.length > 0
                                            ? syncedServs.map((s: any, idx: number) => ({
                                                id: s.id || `sub_serv_${idx}`,
                                                titulo: s.nome || s.servico || `Serviço ${idx + 1}`,
                                                concluida: s.status === "concluido" || s.concluida,
                                                preco: typeof s.valor === "number" ? s.valor : (parseFloat(s.valor) || 0)
                                              }))
                                            : [
                                                { id: "sub_1", titulo: "Análise de restrições em CPFs e CNPJ nos órgãos de proteção", concluida: false },
                                                { id: "sub_2", titulo: "Verificação de pendências e regularização de CND na Receita Federal", concluida: false },
                                                { id: "sub_3", titulo: "Atualização do faturamento e transmissão de dados no e-CAC", concluida: false },
                                                { id: "sub_4", titulo: "Ajuste e adequação do Score do SCR no Banco Central", concluida: false },
                                                { id: "sub_5", titulo: "Submissão da proposta reestruturada para aprovação bancária", concluida: false }
                                              ]);
                                      const completedSubCount = subList.filter((s: any) => s.concluida).length;
                                      const subPct = subList.length > 0 ? Math.round((completedSubCount / subList.length) * 100) : 0;

                                      return (
                                        <div 
                                          key={lead.id} 
                                          onClick={() => handleOpenLeadWorkspace(lead, "details")}
                                          className={`bg-white rounded-xl border p-3.5 text-xs text-left shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group/card flex flex-col justify-between min-h-[140px] ${
                                            hasActivePendency 
                                              ? "border-rose-200/80 hover:border-rose-400/80 bg-rose-50/10" 
                                              : isRefused
                                              ? "border-rose-300 hover:border-rose-400 bg-rose-50/20"
                                              : isApproved
                                              ? "border-emerald-300 hover:border-emerald-500 bg-emerald-50/10"
                                              : "border-slate-200/80 hover:border-emerald-500/30"
                                          }`}
                                        >
                                          {/* Pulse indicator for Pendency */}
                                          {hasActivePendency && (
                                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-500 rounded-bl animate-pulse" />
                                          )}

                                          {/* Lead Info */}
                                          <div className="space-y-1.5">
                                            <div className="flex items-start justify-between gap-1.5">
                                              <span className="font-extrabold text-slate-800 line-clamp-2 leading-snug group-hover/card:text-[#0A3D2E] transition-colors">
                                                {lead.razaoSocial || lead.nome || "Não informado"}
                                              </span>
                                            </div>

                                            <div className="text-[9px] font-mono text-slate-400 flex flex-col gap-0.5">
                                              <span>CNPJ: {lead.cnpj || "-"}</span>
                                              <span className="text-[8px]">{new Date(lead.dataCriacao).toLocaleDateString("pt-BR")}</span>
                                            </div>

                                            {/* Column 7 Status Badges: Aprovado vs Recusado vs Em Análise */}
                                            {column.id === 7 && (
                                              <div className="mt-1">
                                                {isRefused ? (
                                                  <div className="bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 uppercase">
                                                    <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                                    <span>Crédito Recusado</span>
                                                  </div>
                                                ) : isApproved ? (
                                                  <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 uppercase">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                    <span>Crédito Aprovado</span>
                                                  </div>
                                                ) : (
                                                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 uppercase">
                                                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                                    <span>Em Análise Bancária</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            {/* Pendency Alert Banner in Card */}
                                            {hasActivePendency && (
                                              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 mt-1 animate-pulse uppercase">
                                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                <span>Pendência Ativa</span>
                                              </div>
                                            )}

                                            {/* Assigned consultant name if franchise */}
                                            {isFranquiaDigital(currentPartner?.plano) && (
                                              <div className="text-[9px] bg-slate-50 border border-slate-100 p-1 rounded-md text-slate-500 font-medium truncate mt-1">
                                                Consultor: <strong className="text-slate-700">{lead.parceiroNome || "Mesa Oficial"}</strong>
                                              </div>
                                            )}
                                          </div>

                                          {/* Sub-etapas Progress for Operacionalização (Passo 6) */}
                                          {column.id === 6 && (
                                            <div className="mt-2 p-2 bg-blue-50/70 border border-blue-100 rounded-lg space-y-1 text-left">
                                              <div className="flex items-center justify-between text-[9px] font-extrabold text-blue-900">
                                                <span>Sub-etapas de Fomento:</span>
                                                <span className="font-mono text-blue-700">{subPct}% ({completedSubCount}/{subList.length})</span>
                                              </div>
                                              <div className="w-full bg-blue-200/80 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-[#00A86B] h-full transition-all duration-300" style={{ width: `${subPct}%` }} />
                                              </div>
                                            </div>
                                          )}

                                          {/* Value & Commission Info */}
                                          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                                            <div className="flex justify-between items-center text-[9px]">
                                              <span className="text-slate-400 font-semibold">Simulado:</span>
                                              <span className="font-extrabold text-slate-700">
                                                {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Sob Consulta"}
                                              </span>
                                            </div>

                                            {lead.valorAprovado !== undefined && lead.valorAprovado > 0 && (
                                              <div className="flex justify-between items-center text-[9px] bg-emerald-50 px-1 py-0.5 rounded">
                                                <span className="text-emerald-800 font-extrabold">Aprovado:</span>
                                                <span className="font-black text-emerald-700">
                                                  {formatCurrencyBRL(lead.valorAprovado)}
                                                </span>
                                              </div>
                                            )}

                                            <div className="flex justify-between items-center text-[9px] bg-slate-50/80 p-1 rounded">
                                              <span className="text-slate-500 font-bold">Sua Comissão:</span>
                                              <span className="font-black text-[#0A3D2E]">
                                                {formatCurrencyBRL(directCommissionValue)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Quick Actions Footer inside Card */}
                                          {(() => {
                                            const quickStepStatus = calculateLeadStepStatus(lead);
                                            const canSocios = quickStepStatus.isTabUnlocked("socios");
                                            const canSimulador = quickStepStatus.isTabUnlocked("simulador");

                                            return (
                                              <div className="mt-2.5 flex items-center gap-1 border-t border-slate-50 pt-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                  onClick={() => handleOpenLeadWorkspace(lead, "details")}
                                                  className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-150 rounded-md transition-all font-black text-[9px] flex items-center justify-center gap-0.5 cursor-pointer"
                                                  title="Abrir Ficha Cadastral (Passo 1)"
                                                >
                                                  <Eye className="w-2.5 h-2.5" />
                                                  Ficha
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (!canSocios) {
                                                      alert(quickStepStatus.getLockedReason("socios"));
                                                      return;
                                                    }
                                                    handleOpenLeadWorkspace(lead, "socios");
                                                  }}
                                                  className={`py-1 px-1.5 border rounded-md transition-all font-black text-[9px] flex items-center justify-center gap-0.5 ${
                                                    !canSocios
                                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200/30 cursor-pointer"
                                                  }`}
                                                  title={canSocios ? "Sócios (Passo 2)" : (quickStepStatus.getLockedReason("socios") || "Bloqueado")}
                                                >
                                                  {!canSocios ? <Lock className="w-2.5 h-2.5 text-slate-400" /> : <Users className="w-2.5 h-2.5" />}
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (!canSimulador) {
                                                      alert(quickStepStatus.getLockedReason("simulador"));
                                                      return;
                                                    }
                                                    handleOpenLeadWorkspace(lead, "simulador");
                                                  }}
                                                  disabled={lead.etapa === 7 || lead.etapa === 8}
                                                  className={`py-1 px-1.5 border rounded-md transition-all font-black text-[9px] flex items-center justify-center gap-0.5 ${
                                                    !canSimulador || lead.etapa === 7 || lead.etapa === 8
                                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/30 cursor-pointer"
                                                  }`}
                                                  title={canSimulador ? "Operacionalização (Passo 6)" : (quickStepStatus.getLockedReason("simulador") || "Bloqueado")}
                                                >
                                                  {!canSimulador ? <Lock className="w-2.5 h-2.5 text-slate-400" /> : <Calculator className="w-2.5 h-2.5" />}
                                                </button>
                                                {isFranquiaDigital(currentPartner?.plano) && (
                                                  <button
                                                    onClick={() => setAssigningLead(lead)}
                                                    className="py-1 px-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/30 rounded-md transition-all font-black text-[9px] flex items-center justify-center gap-0.5 cursor-pointer"
                                                    title="Direcionar Lead"
                                                  >
                                                    <Send className="w-2.5 h-2.5 text-blue-600" />
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "caca-leads" && (
                <motion.div
                  key="caca-leads-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] p-6 space-y-6 text-left"
                >
                  {currentPartner && getSubscriptionStatus(currentPartner).status === "vencida" ? (
                    /* Locked View */
                    <div className="py-12 px-4 text-center max-w-md mx-auto space-y-6">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 animate-pulse border border-amber-100">
                        <Lock className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="font-display font-extrabold text-xl text-slate-800 leading-tight">
                          Recurso de Prospecção Bloqueado
                        </h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Olá, <strong className="text-slate-700">{currentPartner?.nome}</strong>. Sua conta de Parceiro está com pagamento do plano pendente ou vencido. Ative seu plano para liberar o acesso ao Caça-Leads e demais recursos operacionais do sistema.
                        </p>
                      </div>

                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-[11px] text-slate-600 flex items-start gap-3 text-left">
                        <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-700">O que você ganha ao ativar?</p>
                          <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-600/90 leading-relaxed">
                            <li>Pesquisa e extração em tempo real de empresas</li>
                            <li>Acesso a telefones, e-mails e contatos diretos</li>
                            <li>Comissões de repasse completas em seu plano</li>
                            <li>Robô de prospecção via WhatsApp integrado</li>
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2 space-y-3">
                        <a
                          href={getPaymentLinkForPlan(currentPartner?.plano || "STARTER")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold py-3 px-6 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Coins className="w-4 h-4" />
                          Ativar Meu Plano na Hubla
                        </a>

                        <a
                          href={`https://api.whatsapp.com/send?phone=5598987353253&text=${encodeURIComponent(
                            `Olá! Sou o parceiro ${currentPartner?.nome} (ID: ${currentPartner?.id}) e gostaria de regularizar ou ativar meu plano para liberar a ferramenta Caça Leads.`
                          )}`}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50 font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Falar com Suporte PROSFEC
                        </a>
                      </div>
                    </div>
                  ) : isSubMember ? (
                    <div className="space-y-6">
                      {/* Sub-member Header banner */}
                      <div className="bg-gradient-to-br from-[#0A3D2E] to-[#124E3D] p-6 rounded-3xl border border-emerald-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
                          <Users className="w-96 h-96 text-emerald-400" />
                        </div>
                        <div className="space-y-2 relative z-10">
                          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            Portal do Consultor
                          </div>
                          <h2 className="font-display font-black text-xl md:text-2xl tracking-tight">
                            Banco de Leads Master Partner
                          </h2>
                          <p className="text-xs text-emerald-200/90 max-w-xl leading-relaxed">
                            Olá, <strong className="text-white">{currentPartner?.nome}</strong>. Esta é a sua fila de prospecção ativa. 
                            Aqui você encontra empresas qualificadas direcionadas pelo seu Franqueado. Faça contato via WhatsApp e inicie o atendimento.
                          </p>
                        </div>
                      </div>

                      {/* Success Registration Tracking Link */}
                      {registeredLeadId && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                          <span className="text-[11px] font-black text-[#0A3D2E] uppercase tracking-wider block">
                            🎉 Lead Cadastrado com Sucesso!
                          </span>
                          <p className="text-xs text-slate-600 font-medium">
                            O lead foi importado para o sistema. Copie o link abaixo e envie para o seu cliente acompanhar o andamento da análise em tempo real:
                          </p>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                            <input
                              type="text"
                              readOnly
                              value={`${getAppDomain()}?leadTrack=${registeredLeadId}`}
                              className="bg-white/75 backdrop-blur-xl border border-slate-200 text-xs font-mono px-3 py-2 rounded-xl text-slate-700 font-bold flex-1 select-all"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${getAppDomain()}?leadTrack=${registeredLeadId}`);
                                setCopiedTrackingLink(true);
                                setTimeout(() => setCopiedTrackingLink(false), 2000);
                              }}
                              className="px-4 py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                            >
                              {copiedTrackingLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedTrackingLink ? "Copiado!" : "Copiar Link"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Distributed Leads List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <span className="text-[11px] font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1.5">
                            🎯 Sua Fila de Prospecção ({leadsDistributedToMe.filter(l => l.status !== "descartado").length})
                          </span>
                          <button 
                            onClick={() => currentPartner && fetchLeadsDistributedToMe(currentPartner.id)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Sincronizar Lista
                          </button>
                        </div>

                        {/* Search and Filters Bar */}
                        {leadsDistributedToMe.filter(l => l.status !== "descartado").length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {/* Search Input */}
                              <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Buscar empresa, cidade ou CNPJ..."
                                  value={consultantSearchQuery}
                                  onChange={(e) => setConsultantSearchQuery(e.target.value)}
                                  className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {consultantSearchQuery && (
                                  <button
                                    onClick={() => setConsultantSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Category Filter */}
                              <div>
                                <select
                                  value={consultantCategoryFilter}
                                  onChange={(e) => setConsultantCategoryFilter(e.target.value)}
                                  className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                  <option value="">Todas as Categorias</option>
                                  {Array.from(new Set(leadsDistributedToMe.map(l => l.categoria).filter(Boolean))).map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* CNPJ Filter */}
                              <div>
                                <select
                                  value={consultantCnpjFilter}
                                  onChange={(e) => setConsultantCnpjFilter(e.target.value as any)}
                                  className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                  <option value="ALL">Status do CNPJ (Todos)</option>
                                  <option value="WITH_CNPJ">Com CNPJ Cadastrado</option>
                                  <option value="WITHOUT_CNPJ">Sem CNPJ (Apenas Nome)</option>
                                </select>
                              </div>
                            </div>

                            {(consultantSearchQuery || consultantCategoryFilter || consultantCnpjFilter !== "ALL") && (
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                                <span className="font-bold text-slate-600">
                                  Exibindo {
                                    leadsDistributedToMe.filter(l => {
                                      if (l.status === "descartado") return false;
                                      if (consultantSearchQuery.trim()) {
                                        const q = consultantSearchQuery.toLowerCase();
                                        const matchName = (l.nomeEmpresa || "").toLowerCase().includes(q);
                                        const matchCity = (l.cidade || "").toLowerCase().includes(q);
                                        const matchPhone = (l.telefone || "").includes(q);
                                        const matchCnpj = (l.cnpj || l.cnpjDetails?.cnpj || "").includes(q);
                                        if (!matchName && !matchCity && !matchPhone && !matchCnpj) return false;
                                      }
                                      if (consultantCategoryFilter && l.categoria !== consultantCategoryFilter) return false;
                                      const lCnpj = l.cnpj || l.cnpjDetails?.cnpj || "";
                                      if (consultantCnpjFilter === "WITH_CNPJ" && !lCnpj) return false;
                                      if (consultantCnpjFilter === "WITHOUT_CNPJ" && lCnpj) return false;
                                      return true;
                                    }).length
                                  } de {leadsDistributedToMe.filter(l => l.status !== "descartado").length} leads
                                </span>
                                <button
                                  onClick={() => {
                                    setConsultantSearchQuery("");
                                    setConsultantCategoryFilter("");
                                    setConsultantCnpjFilter("ALL");
                                  }}
                                  className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3" /> Limpar Filtros
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {distributedLeadsLoading ? (
                          <div className="py-12 flex justify-center items-center">
                            <span className="w-8 h-8 border-2 border-[#0A3D2E] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : leadsDistributedToMe.filter(l => l.status !== "descartado").length === 0 ? (
                          <div className="py-16 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-50/50">
                            <div className="bg-indigo-50 text-indigo-700 p-3.5 rounded-full">
                              <Users className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-black text-slate-700">Nenhum lead distribuído no momento</p>
                              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                                Seu Master Partner ainda não direcionou nenhum lead de busca ativa para você.
                                Assim que novos leads forem atribuídos à sua conta pelo Master Partner, eles aparecerão aqui instantaneamente.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {leadsDistributedToMe
                              .filter(l => {
                                if (l.status === "descartado") return false;
                                if (consultantSearchQuery.trim()) {
                                  const q = consultantSearchQuery.toLowerCase();
                                  const matchName = (l.nomeEmpresa || "").toLowerCase().includes(q);
                                  const matchCity = (l.cidade || "").toLowerCase().includes(q);
                                  const matchPhone = (l.telefone || "").includes(q);
                                  const matchCnpj = (l.cnpj || l.cnpjDetails?.cnpj || "").includes(q);
                                  if (!matchName && !matchCity && !matchPhone && !matchCnpj) return false;
                                }
                                if (consultantCategoryFilter && l.categoria !== consultantCategoryFilter) return false;
                                const lCnpj = l.cnpj || l.cnpjDetails?.cnpj || "";
                                if (consultantCnpjFilter === "WITH_CNPJ" && !lCnpj) return false;
                                if (consultantCnpjFilter === "WITHOUT_CNPJ" && lCnpj) return false;
                                return true;
                              })
                              .map((lead) => {
                              const hasPhone = !!lead.telefone;
                              const isConverted = lead.status === "convertido";
                              const leadCnpj = lead.cnpj || lead.cnpjDetails?.cnpj || "";
                              const isFetchingCnpj = cnpjQueryLoading[lead.id];

                              const lineName = lead.creditLineCode || lead.propostaNegociada?.creditLineCode || lead.result?.creditLineCode || "Pronampe";
                              const messageText = `Olá! Sou consultor credenciado PROSFEC fomento. Identifiquei que a ${lead.nomeEmpresa} possui excelente pontuação cadastral e pode ter direito de pleitear a linha de crédito ${lineName} com juros reduzidos para capital de giro este ano. Gostaria de realizar uma rápida simulação sem custo de forma 100% online? Acesse nosso portal oficial ou fale comigo para simular: ${getAppDomain()}?ref=${currentPartner?.id || ""}`;
                              const waUrl = hasPhone 
                                ? `https://api.whatsapp.com/send?phone=${lead.telefone.replace(/\D/g, "")}&text=${encodeURIComponent(messageText)}`
                                : "#";

                              const leadPlaceObj = {
                                id: lead.id,
                                distributedLeadId: lead.id,
                                nome: lead.nomeEmpresa,
                                nomeEmpresa: lead.nomeEmpresa,
                                telefone: lead.telefone,
                                endereco: lead.endereco,
                                cidade: lead.cidade,
                                estado: lead.estado,
                                website: lead.website,
                                categoria: lead.categoria,
                                cnpj: leadCnpj,
                                cnpjDetails: lead.cnpjDetails
                              };

                              return (
                                <div
                                  key={lead.id}
                                  className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-md space-y-3 relative overflow-hidden group ${
                                    isConverted ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200/80 hover:border-indigo-500/30"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider block self-start mb-1 truncate max-w-max">
                                        {lead.categoria || "Atendimento Direcionado"}
                                      </span>
                                      <h4 className="font-extrabold text-sm text-slate-800 line-clamp-1 group-hover:text-[#0A3D2E] transition-colors">
                                        {lead.nomeEmpresa}
                                      </h4>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">Recebido em {new Date(lead.dataDistribuicao).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                    
                                    {isConverted ? (
                                      <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        Convertido
                                      </span>
                                    ) : (
                                      <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0">
                                        Pendente
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                                    {lead.endereco && (
                                      <p className="flex items-start gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{lead.endereco}</span>
                                      </p>
                                    )}
                                    {hasPhone ? (
                                      <p className="flex items-center gap-1 text-slate-700 font-bold">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{lead.telefone}</span>
                                      </p>
                                    ) : (
                                      <p className="flex items-center gap-1 text-rose-500/80 font-semibold">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>Telefone indisponível</span>
                                      </p>
                                    )}
                                  </div>

                                  {/* CNPJ Section for Consultant */}
                                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5">
                                    {leadCnpj ? (
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div>
                                          <span className="text-[9px] font-black text-slate-400 uppercase block">CNPJ Cadastrado:</span>
                                          <span className="text-xs font-mono font-black text-emerald-700">{leadCnpj}</span>
                                          {lead.cnpjDetails?.razaoSocial && (
                                            <span className="text-[10px] font-semibold text-slate-600 block line-clamp-1">{lead.cnpjDetails.razaoSocial}</span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => handleFetchCnpj(leadPlaceObj, leadCnpj)}
                                          className="px-2.5 py-1.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                                        >
                                          <FileText className="w-3 h-3" />
                                          Ficha CNPJ
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold text-slate-500">
                                          CNPJ não informado
                                        </span>
                                        <button
                                          disabled={isFetchingCnpj}
                                          onClick={() => handleFetchCnpj(leadPlaceObj)}
                                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                                        >
                                          {isFetchingCnpj ? (
                                            <>
                                              <RefreshCw className="w-3 h-3 animate-spin" />
                                              Buscando...
                                            </>
                                          ) : (
                                            <>
                                              <Search className="w-3 h-3" />
                                              Buscar CNPJ Receita
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Interaction Notes & History Drawer */}
                                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <button
                                        onClick={() => setExpandedNotesLeadId(expandedNotesLeadId === lead.id ? null : lead.id)}
                                        className="text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                                        Anotações & Histórico ({Array.isArray(lead.historico) ? lead.historico.length : 0})
                                      </button>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase">Acompanhamento</span>
                                    </div>

                                    {expandedNotesLeadId === lead.id && (
                                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                        {Array.isArray(lead.historico) && lead.historico.length > 0 ? (
                                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                            {lead.historico.map((note: any, idx: number) => (
                                              <div key={note.id || idx} className="bg-white/75 backdrop-blur-xl border border-slate-200/60 p-2 rounded-lg text-[10px] space-y-0.5">
                                                <div className="flex items-center justify-between text-slate-400 font-bold">
                                                  <span>{note.author || "Consultor"}</span>
                                                  <span>{new Date(note.date).toLocaleString("pt-BR")}</span>
                                                </div>
                                                <p className="text-slate-700 font-medium whitespace-pre-wrap">{note.text}</p>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-[10px] text-slate-400 italic">Nenhuma anotação registrada ainda.</p>
                                        )}

                                        <div className="flex items-center gap-1.5 pt-1">
                                          <input
                                            type="text"
                                            placeholder="Escreva uma nota..."
                                            value={activeNoteInput[lead.id] || ""}
                                            onChange={(e) => setActiveNoteInput(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") handleAddLeadNote(lead.id);
                                            }}
                                            className="flex-1 bg-white/75 backdrop-blur-xl border border-slate-200 text-[10px] px-2.5 py-1.5 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          />
                                          <button
                                            disabled={!activeNoteInput[lead.id]?.trim() || addingNoteForLeadId === lead.id}
                                            onClick={() => handleAddLeadNote(lead.id)}
                                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                          >
                                            {addingNoteForLeadId === lead.id ? (
                                              <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <Plus className="w-3 h-3" />
                                            )}
                                            Salvar
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
                                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                      {!isConverted && (
                                        <button
                                          onClick={() => handleDiscardDistributedLead(lead.id)}
                                          className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          Descartar
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          setSelectedLeadForRegistration({
                                            id: lead.id,
                                            nomeEmpresa: lead.nomeEmpresa,
                                            telefone: lead.telefone,
                                            categoria: lead.categoria,
                                            endereco: lead.endereco,
                                            website: lead.website,
                                            cnpj: leadCnpj,
                                            razaoSocial: lead.cnpjDetails?.razaoSocial || lead.nomeEmpresa,
                                            porte: lead.cnpjDetails?.porte || "ME"
                                          });
                                        }}
                                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-all font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                        Cadastrar Lead
                                      </button>
                                    </div>

                                    {hasPhone && (
                                      <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full sm:w-auto px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg transition-all font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                                      >
                                        <Send className="w-3 h-3 text-white fill-current" />
                                        Iniciar Prospecção
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div>
                          <h2 className="font-display font-black text-xl text-slate-800 flex items-center gap-2">
                            <Search className="w-6 h-6 text-emerald-600" />
                            Painel Ativo: Caça Leads
                          </h2>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                            Utilize nossa tecnologia para buscar empresas em qualquer segmento comercial e cidade em tempo real. Identifique oportunidades qualificadas e faça prospecção ativa via WhatsApp.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
                          {isFranquiaDigital(currentPartner?.plano) && teamMembers.length > 0 && (
                            <div className="flex items-center gap-2">
                              <select
                                onChange={(e) => {
                                  const memberId = e.target.value;
                                  if (memberId) {
                                    const member = teamMembers.find(m => m.id === memberId);
                                    if (member) setSelectedConsultantForInspection(member);
                                    e.target.value = "";
                                  }
                                }}
                                defaultValue=""
                                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold text-xs p-2.5 rounded-2xl outline-none cursor-pointer transition-all flex items-center gap-1.5"
                                title="Acompanhe o desempenho de prospecção e redirecione leads dos seus consultores"
                              >
                                <option value="" disabled>📊 Consultar Desempenho / Carteira...</option>
                                {teamMembers.map(m => {
                                  const count = allParentDistributedLeads.filter(l => l.teamMemberId === m.id && l.status !== "descartado").length;
                                  return (
                                    <option key={m.id} value={m.id}>
                                      {m.nome} ({count} leads ativos)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                          <div className="bg-emerald-50 border border-emerald-100/50 p-2.5 rounded-2xl flex items-center gap-2 text-[11px] text-emerald-800 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>Tecnologia de Varredura de Leads Ativa</span>
                          </div>
                        </div>
                      </div>

                      {/* Credits Indicator */}
                      <div className="bg-[#0A3D2E]/5 border border-emerald-800/10 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            Saldo de Buscas do Caça-Leads (Por Recargas)
                          </h3>
                          <p className="text-xs text-emerald-700 leading-relaxed">
                            Não há limite diário fixo. Todas as consultas são realizadas através das suas recargas e cada busca retorna até <strong>60 empresas/leads em tempo real</strong>.
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-emerald-800/10">
                          <div className="text-left md:text-right">
                            <span className="font-mono text-2xl font-black text-emerald-900 flex items-baseline gap-1">
                              {currentPartner?.cacaLeadsCredits || 0}
                              <span className="text-xs text-emerald-600 font-extrabold uppercase tracking-wider">buscas</span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 block">Saldo disponível</span>
                          </div>
                          {isSubMember ? (
                            <div
                              className="px-3.5 py-2 bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-not-allowed select-none"
                              title="Suas cotas de busca são fornecidas e administradas diretamente pelo seu Master de Franquia."
                            >
                              <Lock className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Gerenciado pelo Master</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setRefillNotifySuccess(false);
                                setRefillStep(1);
                                setRefillCopiedPix(false);
                                setShowRefillModal(true);
                              }}
                              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <Coins className="w-4 h-4 text-amber-300" />
                              Adquirir Recarga
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Previous Refill Requests History List */}
                      {myRefills.length > 0 && (
                        <div className="bg-slate-50/40 border border-slate-200/50 p-4 rounded-2xl space-y-3">
                          <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Histórico de Pedidos de Recarga
                          </h4>
                          <div className="divide-y divide-slate-100">
                            {myRefills.map((refill) => {
                              const dateStr = refill.dataSolicitacao 
                                ? new Date(refill.dataSolicitacao).toLocaleDateString("pt-BR")
                                : "-";
                              return (
                                <div key={refill.id} className="py-2 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                      Pacote {refill.pacote} ({refill.buscas} buscas)
                                      <span className="font-mono text-[10px] text-slate-400">• R$ {refill.valor?.toFixed(2).replace(".", ",")}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">Solicitado em {dateStr}</div>
                                  </div>
                                  <div>
                                    {refill.status === "pendente" && (
                                      <span className="inline-flex items-center text-[10px] bg-amber-50 border border-amber-100 font-extrabold text-amber-700 px-2 py-0.5 rounded-full uppercase">
                                        Pendente
                                      </span>
                                    )}
                                    {refill.status === "aprovada" && (
                                      <span className="inline-flex items-center text-[10px] bg-emerald-50 border border-emerald-100 font-extrabold text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                                        Aprovada
                                      </span>
                                    )}
                                    {refill.status === "cancelada" && (
                                      <span className="inline-flex items-center text-[10px] bg-slate-100 border border-slate-200 font-extrabold text-slate-600 px-2 py-0.5 rounded-full uppercase">
                                        Cancelada
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                  {/* Filter / Hunt Inputs Form */}
                  <form onSubmit={handleHuntLeads} className="bg-slate-50/70 border border-slate-200/50 p-4 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Segment / Category Select or custom */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Ramo / Segmento Comercial</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="Ex: Contabilidade, Restaurantes, Doutor, etc."
                            value={huntKeyword}
                            onChange={(e) => setHuntKeyword(e.target.value)}
                            className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl p-3 text-xs outline-none text-slate-800 font-bold focus:border-[#0A3D2E] focus:ring-1 focus:ring-[#0A3D2E]"
                          />
                        </div>
                      </div>

                      {/* State Select */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Estado (UF)</label>
                        <select
                          value={huntState}
                          onChange={(e) => {
                            const selectedState = e.target.value;
                            setHuntState(selectedState);
                            setHuntCitySelect("");
                            setHuntCity("");
                            setIsCustomCity(false);
                          }}
                          className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl p-3 text-xs outline-none text-slate-800 font-bold focus:border-[#0A3D2E] focus:ring-1 focus:ring-[#0A3D2E]"
                        >
                          <option value="">Selecione...</option>
                          {BRAZIL_STATES.map((state) => (
                            <option key={state.uf} value={state.uf}>
                              {state.name} ({state.uf})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* City Select/Input */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Cidade (Filtro)</label>
                        {isCustomCity ? (
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              required
                              placeholder="Digite a cidade..."
                              value={huntCity}
                              onChange={(e) => setHuntCity(e.target.value)}
                              className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl p-3 pr-10 text-xs outline-none text-slate-800 font-bold focus:border-[#0A3D2E] focus:ring-1 focus:ring-[#0A3D2E]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomCity(false);
                                setHuntCity("");
                                setHuntCitySelect("");
                              }}
                              className="absolute right-2.5 text-[10px] text-emerald-600 font-extrabold hover:underline"
                              title="Voltar para a seleção de cidades"
                            >
                              Lista
                            </button>
                          </div>
                        ) : (
                          <select
                            disabled={!huntState}
                            value={huntCitySelect}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "custom") {
                                setIsCustomCity(true);
                                setHuntCitySelect("custom");
                                setHuntCity("");
                              } else {
                                setHuntCitySelect(val);
                                setHuntCity(val);
                              }
                            }}
                            className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl p-3 text-xs outline-none text-slate-800 font-bold focus:border-[#0A3D2E] focus:ring-1 focus:ring-[#0A3D2E] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {!huntState ? "Selecione o Estado" : "Selecione a Cidade"}
                            </option>
                            {huntState && CITIES_BY_STATE[huntState]?.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                            {huntState && (
                              <option value="custom">✍️ Digitar manualmente...</option>
                            )}
                          </select>
                        )}
                      </div>

                      {/* Limit results */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Resultados</label>
                        <select
                          value={huntLimit}
                          onChange={(e) => setHuntLimit(Number(e.target.value))}
                          className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl p-3 text-xs outline-none text-slate-800 font-bold focus:border-[#0A3D2E] focus:ring-1 focus:ring-[#0A3D2E]"
                        >
                          <option value={20}>20 resultados (1 Requisição)</option>
                          <option value={10}>10 resultados (Rápido)</option>
                        </select>
                      </div>

                      {/* Search CTA */}
                      <div className="md:col-span-2 flex items-end">
                        <button
                          type="submit"
                          disabled={huntLoading}
                          className="w-full bg-[#0A3D2E] hover:bg-[#00A86B] text-white py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {huntLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Buscando estabelecimentos...
                            </>
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5" />
                              Caçar Leads
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Notice on direct API */}
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-emerald-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Radar de Leads & Empresas:</strong> Acesso direto e em tempo real a estabelecimentos e contatos com suporte a consulta de CNPJ da Receita Federal.
                      </span>
                    </div>
                  </form>

                  {/* Caça-Leads Search History Section (Up to 5 searches) */}
                  {cacaLeadsHistory.length > 0 && (
                    <div className="bg-white/75 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-50 text-[#0A3D2E] rounded-lg">
                            <History className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-800">
                              Histórico de Consultas Salvas
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold ml-2">
                              ({cacaLeadsHistory.length} de 5 buscas recentes)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-emerald-700 font-bold hidden sm:inline-block">
                            💡 Clique em uma busca para restaurar os leads na tela sem gastar saldo
                          </span>
                          <button
                            type="button"
                            onClick={handleClearAllHuntHistory}
                            className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                            title="Limpar todas as buscas salvas"
                          >
                            Limpar Histórico
                          </button>
                        </div>
                      </div>

                      {/* History Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                        {cacaLeadsHistory.map((item) => {
                          const dateObj = item.timestamp ? new Date(item.timestamp) : null;
                          const formattedDate = dateObj
                            ? dateObj.toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "-";

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleRestoreHuntHistory(item)}
                              className="group relative bg-slate-50/80 hover:bg-emerald-50/80 border border-slate-200/70 hover:border-emerald-300 rounded-xl p-3 text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between gap-2.5"
                              title={`Restaurar "${item.keyword}" em ${item.city}`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="text-xs font-black text-slate-800 group-hover:text-emerald-950 capitalize truncate block">
                                    {item.keyword}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteHuntHistory(item.id, e)}
                                    className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                    title="Excluir do histórico"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{item.city} {item.state ? `(${item.state})` : ""}</span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="bg-emerald-100 text-[#0A3D2E] font-black px-2 py-0.5 rounded-md">
                                    {item.totalResults || item.results?.length || 0} leads
                                  </span>
                                  <span className="text-slate-400 font-medium flex items-center gap-1 text-[9px]">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formattedDate}
                                  </span>
                                </div>

                                <div className="text-[10px] font-extrabold text-emerald-700 group-hover:text-[#0A3D2E] flex items-center gap-1">
                                  <RotateCcw className="w-3 h-3 text-emerald-600" />
                                  Restaurar Busca
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Error view */}
                  {huntError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{huntError}</span>
                    </div>
                  )}

                  {/* Loading block */}
                  {huntLoading && (
                    <div className="py-16 text-center space-y-4">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-700">Rastreando empresas qualificadas na base de dados...</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
                          Buscando estabelecimentos ativos da categoria <strong className="text-slate-600">"{huntKeyword}"</strong> em <strong className="text-slate-600">"{huntCity}"</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Results List */}
                  {!huntLoading && huntResults.length > 0 && (
                    <div id="caca-leads-results-area" className="space-y-4 scroll-mt-6">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-black text-[#0A3D2E] uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Encontramos {huntResults.length} empresas qualificadas
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          Dica: Consulte o CNPJ ou direcione em lote para consultores da sua equipe
                        </span>
                      </div>

                      {/* Batch Actions Bar for Master / Franqueado */}
                      {isFranquiaDigital(currentPartner?.plano) && teamMembers.length > 0 && (
                        <div className="bg-indigo-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedHuntPlaces.length === huntResults.length) {
                                  setSelectedHuntPlaces([]);
                                } else {
                                  setSelectedHuntPlaces(huntResults.map(p => p.id));
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              {selectedHuntPlaces.length === huntResults.length ? "Desmarcar Todos" : "Selecionar Todos"}
                            </button>
                            <span className="text-xs font-extrabold text-indigo-200">
                              {selectedHuntPlaces.length} de {huntResults.length} selecionados
                            </span>
                          </div>

                          {selectedHuntPlaces.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Direct to a specific consultant */}
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={batchConsultantId}
                                  onChange={(e) => setBatchConsultantId(e.target.value)}
                                  className="bg-indigo-950 border border-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                >
                                  <option value="">Selecione o Consultor...</option>
                                  {teamMembers.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.nome}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={!batchConsultantId || batchDistributing || distributeEquallyLoading}
                                  onClick={handleBatchDistributeLeads}
                                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  {batchDistributing ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      Direcionando...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3.5 h-3.5" />
                                      Enviar ({selectedHuntPlaces.length})
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* OR Distribute EQUALLY among all consultants */}
                              {teamMembers.length > 1 && (
                                <button
                                  type="button"
                                  disabled={batchDistributing || distributeEquallyLoading}
                                  onClick={handleDistributeLeadsEqually}
                                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-700 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                                  title={`Dividir estes ${selectedHuntPlaces.length} leads em partes iguais entre os ${teamMembers.length} consultores da equipe`}
                                >
                                  {distributeEquallyLoading ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      Dividindo...
                                    </>
                                  ) : (
                                    <>
                                      <Users className="w-3.5 h-3.5" />
                                      Dividir por Igual ({Math.round(selectedHuntPlaces.length / teamMembers.length)}/consultor)
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {huntResults.map((place) => {
                          const placeId = place.id;
                          const hasPhone = !!place.telefone;
                          const cnpjData = cnpjDetailsMap[placeId];
                          const isCnpjQuerying = cnpjQueryLoading[placeId];
                          const isSelected = selectedHuntPlaces.includes(placeId);

                          // Standardized introductory message for WhatsApp pitch
                          const messageText = `Olá! Sou consultor credenciado PROSFEC fomento. Identifiquei que a ${place.nome} possui excelente pontuação empresarial cadastral e pode ter direito de pleitear a linha de crédito Pronampe com juros reduzidos para capital de giro este ano. Gostaria de realizar uma rápida simulação sem custo de forma 100% online? Acesse nosso portal oficial ou fale comigo para simular: ${getAppDomain()}?ref=${currentPartner?.id || ""}`;
                          const waUrl = hasPhone 
                            ? `https://api.whatsapp.com/send?phone=${place.telefone.replace(/\D/g, "")}&text=${encodeURIComponent(messageText)}`
                            : "#";

                          return (
                            <div
                              key={placeId}
                              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xs space-y-3 relative overflow-hidden group ${
                                isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10" : "border-slate-200/80 hover:border-emerald-500/30"
                              }`}
                            >
                              {/* Batch Selection Checkbox header for Master */}
                              {isFranquiaDigital(currentPartner?.plano) && teamMembers.length > 0 && (
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-xl mb-1">
                                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedHuntPlaces(prev => [...prev, placeId]);
                                        } else {
                                          setSelectedHuntPlaces(prev => prev.filter(id => id !== placeId));
                                        }
                                      }}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                    />
                                    <span>Selecionar para Direcionar em Lote</span>
                                  </label>
                                </div>
                              )}
                              {isFranquiaDigital(currentPartner?.plano) && distributedLeadsMap[`${place.nome}_${place.telefone || ""}`] && (
                                <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-[10px] font-extrabold text-indigo-700 flex items-center gap-1.5 mb-1">
                                  <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>Direcionado para {distributedLeadsMap[`${place.nome}_${place.telefone || ""}`].teamMemberName} em {distributedLeadsMap[`${place.nome}_${place.telefone || ""}`].date}</span>
                                </div>
                              )}

                              {/* Rating badge if exists */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-[9px] bg-slate-100 text-slate-600 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider block self-start mb-1 truncate">
                                    {place.categoria || huntKeyword}
                                  </span>
                                  <h4 className="font-extrabold text-sm text-slate-800 line-clamp-1 group-hover:text-[#0A3D2E] transition-colors">
                                    {place.nome}
                                  </h4>
                                </div>
                                {place.nota !== null && (
                                  <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-700 shrink-0">
                                    ★ {place.nota.toFixed(1)}
                                    <span className="text-[8px] text-amber-500 font-medium">({place.avaliacoes})</span>
                                  </div>
                                )}
                              </div>

                              {/* CNPJ Badge if enriched */}
                              {cnpjData ? (
                                <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl space-y-1 text-[10px]">
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-emerald-900 flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      CNPJ: {cnpjData.cnpj}
                                    </span>
                                    <span className="bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded text-[8px]">
                                      {cnpjData.situacaoCadastral}
                                    </span>
                                  </div>
                                  <p className="text-emerald-800 font-semibold truncate">
                                    <strong>Razão Social:</strong> {cnpjData.razaoSocial}
                                  </p>
                                  <div className="flex items-center gap-3 text-emerald-700 font-medium text-[9px]">
                                    <span>Porte: <strong>{cnpjData.porte}</strong></span>
                                    <span>Abertura: <strong>{cnpjData.dataAbertura || "N/I"}</strong></span>
                                  </div>
                                </div>
                              ) : null}

                              {/* Details info */}
                              <div className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                                {place.endereco && (
                                  <p className="flex items-start gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{place.endereco}</span>
                                  </p>
                                )}
                                {hasPhone ? (
                                  <p className="flex items-center gap-1 text-slate-700 font-bold">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{place.telefone}</span>
                                  </p>
                                ) : (
                                  <p className="flex items-center gap-1 text-rose-500/80 font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>Telefone indisponível</span>
                                  </p>
                                )}
                                {place.website && (
                                  <p className="flex items-center gap-1 text-slate-500 truncate">
                                    <Link className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <a
                                      href={place.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="hover:underline text-blue-600 font-semibold"
                                    >
                                      {place.website.replace(/https?:\/\/(www\.)?/, "")}
                                    </a>
                                  </p>
                                )}
                              </div>

                              {/* Actions Bar */}
                              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* CNPJ Lookup Button */}
                                  <button
                                    onClick={() => handleFetchCnpj(place)}
                                    disabled={isCnpjQuerying}
                                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    {isCnpjQuerying ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                                        Buscando CNPJ...
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="w-3 h-3 text-blue-600" />
                                        {cnpjData ? "Ver Ficha CNPJ" : "Consultar CNPJ"}
                                      </>
                                    )}
                                  </button>

                                  {/* Cadastrar Lead PROSFEC Direct Button */}
                                  <button
                                    onClick={() => {
                                      setSelectedLeadForRegistration({
                                        nomeEmpresa: place.nome,
                                        telefone: place.telefone,
                                        categoria: place.categoria,
                                        endereco: place.endereco,
                                        website: place.website,
                                        cnpj: cnpjData?.cnpj || "",
                                        razaoSocial: cnpjData?.razaoSocial || place.nome,
                                        porte: cnpjData?.porte || "ME"
                                      });
                                    }}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0A3D2E] border border-emerald-200 rounded-lg transition-all font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3 text-emerald-600" />
                                    Cadastrar Lead
                                  </button>

                                  {/* Copy business details */}
                                  <button
                                    onClick={() => {
                                      const textToCopy = `Empresa: ${place.nome}\nCategoria: ${place.categoria || ""}\nTelefone: ${place.telefone || "N/A"}\nCNPJ: ${cnpjData?.cnpj || "N/A"}\nEndereço: ${place.endereco || "N/A"}\nWebsite: ${place.website || "N/A"}`;
                                      navigator.clipboard.writeText(textToCopy);
                                      setCopiedHuntContactId(place.id);
                                      setTimeout(() => setCopiedHuntContactId(null), 2000);
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-all font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    {copiedHuntContactId === place.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        Copiado
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        Copiar
                                      </>
                                    )}
                                  </button>

                                  {/* Direct to Consultant dropdown */}
                                  {isFranquiaDigital(currentPartner?.plano) && teamMembers.length > 0 && (
                                    <div className="relative inline-block text-left">
                                      <button
                                        onClick={() => setAssigningHuntLeadId(assigningHuntLeadId === place.id ? null : place.id)}
                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Users className="w-3 h-3" />
                                        {distributedLeadsMap[`${place.nome}_${place.telefone || ""}`] ? "Re-direcionar" : "Direcionar"}
                                      </button>
                                      
                                      {assigningHuntLeadId === place.id && (
                                        <div className="absolute left-0 bottom-full mb-1 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg p-2 z-40 min-w-[180px] text-left">
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5 px-1.5 pt-1">Escolha o Consultor:</p>
                                          <div className="space-y-1 max-h-[140px] overflow-y-auto">
                                            {teamMembers.map(member => (
                                              <button
                                                key={member.id}
                                                onClick={() => {
                                                  handleDistributeLead(place, member);
                                                  setAssigningHuntLeadId(null);
                                                }}
                                                className="w-full text-left p-1.5 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-700 flex flex-col transition-colors cursor-pointer"
                                              >
                                                <span>{member.nome}</span>
                                                <span className="text-[8px] text-slate-400 font-medium">Consultor</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Active WhatsApp outbound call link */}
                                {hasPhone ? (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full px-3 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl transition-all font-extrabold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <Send className="w-3.5 h-3.5 text-white fill-current" />
                                    Iniciar Prospecção no WhatsApp
                                  </a>
                                ) : (
                                  <span className="w-full block text-center text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 py-1.5 rounded-xl select-none">
                                    Telefone indisponível no cadastro
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Load More Next Page Button */}
                      {huntNextPageToken && (
                        <div className="pt-4 text-center">
                          <button
                            onClick={handleLoadNextPage}
                            disabled={loadingNextPage}
                            className="bg-[#0A3D2E] hover:bg-[#00A86B] text-white px-6 py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-md disabled:opacity-50"
                          >
                            {loadingNextPage ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Carregando Próxima Página...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                Carregar Mais 20 Resultados (Próxima Página)
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Info Tips footer */}
                      <div className="bg-emerald-50/60 border border-emerald-100/60 p-4 rounded-2xl space-y-2 text-[11px] text-emerald-800 font-medium">
                        <span className="font-extrabold block">💡 Como funciona o fluxo de captação ativa?</span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600 leading-normal">
                          <li>Clique em <strong className="text-[#0A3D2E]">Consultar CNPJ</strong> para enriquecer a busca com o cartão completo da Receita Federal e quadro societário.</li>
                          <li>Utilize <strong className="text-[#0A3D2E]">Cadastrar Lead</strong> para criar um cadastro diretamente no seu CRM de atendimento.</li>
                          <li>Ou clique em <strong className="text-[#0A3D2E]">Iniciar Prospecção</strong> para abrir o WhatsApp e enviar a proposta de fomento de capital de giro!</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Empty state when no searches have run */}
                  {!huntLoading && huntResults.length === 0 && !huntError && (
                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-full w-14 h-14 flex items-center justify-center">
                        <Search className="w-7 h-7 text-[#0A3D2E] animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-700">O seu funil ativo está aguardando você</p>
                        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                          Escolha um segmento de mercado (ex: Restaurantes, Dentistas, Padarias, Transportadoras) e uma cidade, e clique em "Caçar Leads" para iniciar a prospecção ativa de Pronampe.
                        </p>
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "terms" && (
                <motion.div
                  key="terms-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] p-6 space-y-4 text-left max-w-4xl mx-auto"
                >
                  <h3 className="font-display font-extrabold text-base text-slate-800">Contrato de Credenciamento e Parceria Comercial</h3>
                  <p className="text-xs text-slate-500">Abaixo constam as regras normativas aceitas em ambiente seguro no momento da criação do cadastro.</p>
                  
                  <div className="border border-slate-200/60 rounded-2xl p-5 bg-slate-50 text-xs text-slate-600 space-y-4 leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                    <TermosDeUsoContent variant="light" />
                  </div>
                  
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Contrato aceito eletronicamente via endereço IP seguro em: {currentPartner?.dataCriacao ? new Date(currentPartner.dataCriacao).toLocaleDateString("pt-BR") : "Ficha de Cadastro"}.</span>
                  </div>
                </motion.div>
              )}

              {activeTab === "servicos-contabilidade" && (
                <motion.div
                  key="servicos-contabilidade-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 text-left max-w-6xl mx-auto"
                >
                  <PartnerServicosContabilidadeTab
                    currentPartner={currentPartner}
                    onNavigateToLeads={() => handleTabClick("leads")}
                    onNavigateToRecarga={() => setShowRechargeModal(true)}
                  />
                </motion.div>
              )}

              {activeTab === "perfil" && (
                <motion.div
                  key="perfil-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] p-6 md:p-8 space-y-6 text-left max-w-4xl mx-auto"
                >
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-display font-black text-xl text-slate-800 flex items-center gap-2">
                      <User className="w-6 h-6 text-[#00A86B]" />
                      Meu Perfil
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Mantenha suas informações cadastrais, de contato e Pix atualizadas para o recebimento de comissões.
                    </p>
                  </div>

                  {!isProfileComplete(currentPartner) && (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-amber-900 shadow-xs">
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-extrabold text-amber-950 text-sm">Preenchimento Obrigatório do Perfil</p>
                        <p className="text-amber-800 font-medium leading-relaxed">
                          Para liberar o acesso a todas as funções do sistema (Caça-Leads, cadastro de indicações, simulador e consultas), é obrigatório preencher e salvar os dados cadastrais marcados com asterisco (*) abaixo: <strong>Nome Completo / Razão Social</strong>, <strong>CPF / CNPJ</strong>, <strong>WhatsApp</strong>, <strong>Cidade - UF</strong> e <strong>Chave Pix</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {profileSuccessMsg && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* Seção 1: Dados Pessoais / Principais */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                        1. Dados do Parceiro / Empresa
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Nome Completo / Razão Social *</label>
                          <input
                            type="text"
                            required
                            value={profileNome}
                            onChange={(e) => setProfileNome(e.target.value)}
                            placeholder="Seu nome completo ou Razão Social"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800 font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">E-mail de Acesso e Contato *</label>
                          <input
                            type="email"
                            required
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            placeholder="seu.email@exemplo.com"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Plano Atual</label>
                          <input
                            type="text"
                            disabled
                            value={currentPartner?.plano || "STARTER"}
                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-extrabold cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">CPF / CNPJ *</label>
                          <input
                            type="text"
                            required
                            value={profileCPF}
                            onChange={(e) => setProfileCPF(e.target.value)}
                            placeholder="000.000.000-00"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800 font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Data de Nascimento</label>
                          <input
                            type="date"
                            value={profileBirth}
                            onChange={(e) => setProfileBirth(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">WhatsApp (Com DDD) *</label>
                          <input
                            type="text"
                            required
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800 font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Cidade - UF *</label>
                          <input
                            type="text"
                            required
                            value={profileCity}
                            onChange={(e) => setProfileCity(e.target.value)}
                            placeholder="Ex: São Paulo - SP"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800 font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seção 2: Dados Bancários para Recebimento de Comissões */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                        2. Dados Financeiros (Comissões)
                      </h4>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">Chave Pix para Recebimento de Comissões *</label>
                        <input
                          type="text"
                          required
                          value={profilePix}
                          onChange={(e) => setProfilePix(e.target.value)}
                          placeholder="Chave Pix (E-mail, CPF/CNPJ, Telefone ou Aleatória)"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800 font-semibold"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Os repasses de comissão das operações concluídas e recorrentes serão efetuados diretamente para esta chave.
                        </p>
                      </div>
                    </div>

                    {/* Seção 3: Alterar Senha */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                        3. Alterar Senha de Acesso (Opcional)
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Nova Senha</label>
                          <input
                            type="password"
                            value={profileNewPassword}
                            onChange={(e) => setProfileNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Confirmar Nova Senha</label>
                          <input
                            type="password"
                            value={profileConfirmPassword}
                            onChange={(e) => setProfileConfirmPassword(e.target.value)}
                            placeholder="Repita a nova senha"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl text-xs outline-none text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold px-6 py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {savingProfile ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar Alterações do Perfil"
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === "equipe" && isFranquiaDigital(currentPartner?.plano) && (
                <motion.div
                  key="team-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 text-left"
                >
                  {/* Recharts Analytics Chart */}
                  <TeamPerformanceChart
                    teamMembers={teamMembers}
                    teamLeads={teamLeads}
                    distributedLeadsMap={distributedLeadsMap}
                  />

                  {/* Standalone User Registration Link Box */}
                  <div className="bg-gradient-to-r from-[#0A3D2E] to-emerald-900 text-white p-5 rounded-3xl border border-emerald-500/30 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">Link Direto de Convite de Consultor</span>
                          <h4 className="text-sm font-extrabold text-white">Cadastre novos consultores para a sua equipe</h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentPartner) return;
                          const domain = window.location.hostname.includes("prosfec.com.br")
                            ? window.location.origin
                            : "https://prosfec.com.br";
                          const link = `${domain}?cadastro=true&ref=${currentPartner.id}`;
                          navigator.clipboard.writeText(link);
                          setCopiedUserRegistrationLink(true);
                          setTimeout(() => setCopiedUserRegistrationLink(false), 2000);
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm ${
                          copiedUserRegistrationLink 
                            ? "bg-emerald-400 text-slate-950 font-black animate-pulse" 
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                        {copiedUserRegistrationLink ? "Link Copiado!" : "Copiar Link de Convite"}
                      </button>
                    </div>
                    <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
                      Envie este link direto para novos consultores e vendedores. Eles preencherão os próprios dados de acesso e a conta será automaticamente vinculada à sua carteira Master.
                    </p>
                  </div>

                  {/* Team Members List (Collapsible + Search) */}
                  {(() => {
                    const filteredTeamMembers = teamMembers.filter(member => {
                      if (!teamMemberSearchTerm.trim()) return true;
                      const term = teamMemberSearchTerm.toLowerCase().trim();
                      const name = (member.nome || "").toLowerCase();
                      const email = (member.email || "").toLowerCase();
                      const phone = (member.whatsapp || "").replace(/\D/g, "");
                      const id = (member.id || "").toLowerCase();
                      const plano = (member.plano || "").toLowerCase();
                      return name.includes(term) || email.includes(term) || phone.includes(term) || id.includes(term) || plano.includes(term);
                    });

                    const activeCount = teamMembers.filter(m => {
                      const inact = getInactivityDetails(m);
                      return m.status !== "inativo" && !inact.isInactiveByTime;
                    }).length;
                    const inactiveCount = teamMembers.length - activeCount;

                    return (
                      <div className="bg-white/75 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-4">
                        {/* Header with quick stats and toggle button */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0A3D2E] border border-emerald-100 flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-display font-extrabold text-base text-slate-800">Consultores do meu Time</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 font-mono">
                                  {teamMembers.length} {teamMembers.length === 1 ? "consultor" : "consultores"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span>{activeCount} ativos</span>
                                {inactiveCount > 0 && <span className="text-rose-600 font-bold">• {inactiveCount} inativos</span>}
                                <span>• Gestão comercial e overrides</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => currentPartner && fetchTeamDetails(currentPartner.id)}
                              className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                              title="Atualizar lista de consultores"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Atualizar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsTeamMembersExpanded(!isTeamMembersExpanded)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 ${
                                isTeamMembersExpanded
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80"
                                  : "bg-[#0A3D2E] hover:bg-[#00A86B] text-white"
                              }`}
                            >
                              <span>{isTeamMembersExpanded ? "Recolher Consultores" : `Visualizar Consultores (${teamMembers.length})`}</span>
                              {isTeamMembersExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-emerald-300 shrink-0" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        <AnimatePresence>
                          {isTeamMembersExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-4 pt-1"
                            >
                              {/* Search bar inside expanded view */}
                              {teamMembers.length > 0 && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                  <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      value={teamMemberSearchTerm}
                                      onChange={(e) => setTeamMemberSearchTerm(e.target.value)}
                                      placeholder="Buscar consultor por nome, e-mail, telefone, ID ou plano..."
                                      className="w-full pl-9 pr-8 py-2 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                                    />
                                    {teamMemberSearchTerm && (
                                      <button
                                        type="button"
                                        onClick={() => setTeamMemberSearchTerm("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-500 shrink-0 px-1">
                                    Mostrando {filteredTeamMembers.length} de {teamMembers.length} {teamMembers.length === 1 ? "consultor" : "consultores"}
                                  </div>
                                </div>
                              )}

                              {teamMembers.length === 0 ? (
                                <div className="py-12 text-center space-y-2">
                                  <div className="bg-slate-50 text-slate-400 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                                    <Users className="w-6 h-6" />
                                  </div>
                                  <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                                    Nenhum consultor cadastrado ainda. Use o link de convite acima para convidar seu primeiro vendedor!
                                  </p>
                                </div>
                              ) : filteredTeamMembers.length === 0 ? (
                                <div className="py-10 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                                  <Search className="w-6 h-6 text-slate-400 mx-auto" />
                                  <p className="text-xs text-slate-600 font-bold">
                                    Nenhum consultor encontrado para "{teamMemberSearchTerm}"
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setTeamMemberSearchTerm("")}
                                    className="text-xs text-emerald-700 font-extrabold hover:underline cursor-pointer"
                                  >
                                    Limpar busca
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                                  {filteredTeamMembers.map(member => {
                                    const memberLeads = teamLeads.filter(l => l.parceiroId === member.id);
                                    const concludedLeads = memberLeads.filter(l => l.status === "concluido");
                                    const totalConcludedValue = concludedLeads.reduce((acc, l) => acc + (l.valorAprovado || l.limiteEstimado || 0), 0);
                                    
                                    const isExecutive = member.plano?.toUpperCase().includes("EXEC");
                                    const overrideMultiplier = isExecutive ? 0.015 : 0.025;
                                    const overrideEarned = totalConcludedValue * overrideMultiplier;

                                    const distLeadsForMember = allParentDistributedLeads.filter(
                                      l => l.teamMemberId === member.id
                                    );

                                    const inactivity = getInactivityDetails(member);
                                    const isInactive = member.status === "inativo" || inactivity.isInactiveByTime;

                                    return (
                                      <div
                                        key={member.id}
                                        className={`bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group ${
                                          isInactive 
                                            ? "border-rose-300/80 hover:border-rose-400 bg-rose-50/10" 
                                            : "border-slate-200/90 hover:border-emerald-500/40"
                                        }`}
                                      >
                                        <div className="space-y-3">
                                          {/* Header */}
                                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center font-extrabold text-xs shadow-2xs shrink-0 ${
                                                isInactive
                                                  ? "bg-gradient-to-br from-rose-700 to-rose-500"
                                                  : "bg-gradient-to-br from-[#0A3D2E] to-[#00A86B]"
                                              }`}>
                                                {member.nome ? member.nome.charAt(0).toUpperCase() : "C"}
                                              </div>
                                              <div className="min-w-0">
                                                <h4 className="font-extrabold text-xs text-slate-800 leading-snug group-hover:text-[#0A3D2E] transition-colors truncate">
                                                  {member.nome}
                                                </h4>
                                                <span className="text-[9px] text-slate-400 font-mono block truncate">ID: {member.id}</span>
                                              </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                                                isExecutive ? "bg-amber-100 text-amber-800 border border-amber-200/60" : "bg-blue-100 text-blue-800 border border-blue-200/60"
                                              }`}>
                                                {isExecutive ? "Executive" : "Starter"}
                                              </span>
                                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                                                isInactive 
                                                  ? "bg-rose-100 text-rose-800 border border-rose-200/70" 
                                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200/70"
                                              }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}></span>
                                                {isInactive ? "Inativo (3+ dias)" : "Ativo"}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Contact & Config */}
                                          <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100/80">
                                              <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">Contato</span>
                                              <div className="text-right min-w-0 pl-2">
                                                <span className="block text-[10px] font-medium truncate max-w-[150px] text-slate-700">{member.email}</span>
                                                <a
                                                  href={`https://wa.me/55${member.whatsapp.replace(/\D/g, "")}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-[9px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 mt-0.5"
                                                >
                                                  <Phone className="w-2.5 h-2.5 shrink-0" />
                                                  <span className="truncate">{member.whatsapp}</span>
                                                </a>
                                              </div>
                                            </div>

                                            {/* Inactivity & Last Access */}
                                            <div className="flex items-center justify-between text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100/80">
                                              <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                Último Acesso
                                              </span>
                                              <div className="text-right min-w-0 pl-2">
                                                <span className={`block text-[10px] font-extrabold truncate ${
                                                  isInactive ? "text-rose-700" : "text-slate-800"
                                                }`} title={inactivity.formattedLastAccess}>
                                                  {inactivity.timeSinceLabel}
                                                </span>
                                                <span className="text-[8.5px] text-slate-400 block truncate">
                                                  {inactivity.formattedLastAccess}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-xl border border-slate-100/80">
                                              <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">Comissão</span>
                                              <select
                                                value={isExecutive ? "EXECUTIVE" : "STARTER"}
                                                onChange={(e) => handleUpdateTeamMemberPlan(member.id, e.target.value === "EXECUTIVE" ? "Consultor Executive" : "Consultor Starter")}
                                                className="bg-white/75 backdrop-blur-xl border border-slate-200 rounded-lg text-[9px] p-1 font-extrabold outline-none text-slate-700 cursor-pointer max-w-[150px] truncate shadow-2xs hover:border-emerald-500 transition-all"
                                              >
                                                <option value="STARTER">Starter (0.5% | 2.5%)</option>
                                                <option value="EXECUTIVE">Executive (1.5% | 1.5%)</option>
                                              </select>
                                            </div>
                                          </div>

                                          {/* Inactive Warning & Reactivate Button */}
                                          {isInactive && (
                                            <div className="bg-rose-50 border border-rose-200/90 rounded-xl p-2.5 space-y-1.5 text-left">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-rose-800 flex items-center gap-1">
                                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                  Acesso Inativado (Inatividade)
                                                </span>
                                                <span className="text-[8.5px] font-mono font-bold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded">
                                                  {inactivity.diffDays >= 3 ? `${inactivity.diffDays}d ausente` : "Inativo"}
                                                </span>
                                              </div>
                                              <p className="text-[9.5px] text-rose-700 leading-tight">
                                                {member.motivoInativacao || "Consultor ultrapassou 3 dias sem uso e seu acesso foi pausado."}
                                              </p>
                                              <button
                                                type="button"
                                                onClick={() => handleReactivateTeamMember(member.id)}
                                                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                                              >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                                                Reativar Consultor (Zerar 3 Dias)
                                              </button>
                                            </div>
                                          )}

                                          {/* Performance Metrics Grid */}
                                          <div className="grid grid-cols-3 gap-1.5 text-center pt-2 border-t border-slate-100">
                                            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 overflow-hidden">
                                              <span className="text-[7.5px] text-slate-400 font-extrabold uppercase block truncate">Leads CRM</span>
                                              <span className="font-extrabold text-slate-800 text-xs block truncate">{memberLeads.length}</span>
                                            </div>
                                            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 overflow-hidden">
                                              <span className="text-[7.5px] text-slate-400 font-extrabold uppercase block truncate">Concluído</span>
                                              <span className="font-bold text-slate-800 text-[9.5px] block truncate tracking-tight" title={formatCurrencyBRL(totalConcludedValue)}>
                                                {formatCurrencyBRL(totalConcludedValue)}
                                              </span>
                                            </div>
                                            <div className="bg-amber-50/80 p-1.5 rounded-xl border border-amber-100 overflow-hidden">
                                              <span className="text-[7.5px] text-amber-700 font-extrabold uppercase block truncate">Override</span>
                                              <span className="font-black text-amber-700 text-[9.5px] block truncate tracking-tight" title={formatCurrencyBRL(overrideEarned)}>
                                                {formatCurrencyBRL(overrideEarned)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                          <button
                                            onClick={() => setSelectedConsultantForInspection(member)}
                                            className="w-full bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-between cursor-pointer"
                                          >
                                            <div className="flex items-center gap-1.5 truncate">
                                              <Search className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                              <span className="truncate">Caça-Leads</span>
                                            </div>
                                            <span className="bg-emerald-900/80 text-emerald-200 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ml-1">
                                              {distLeadsForMember.length} leads
                                            </span>
                                          </button>

                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(`${getAppDomain()}?ref=${member.id}`);
                                                setCopiedTeamMemberLinkId(member.id);
                                                setTimeout(() => setCopiedTeamMemberLinkId(null), 2000);
                                              }}
                                              className={`flex-1 py-1.5 px-2 rounded-xl text-[9.5px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                                                copiedTeamMemberLinkId === member.id
                                                  ? "bg-emerald-600 text-white animate-pulse"
                                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60"
                                              }`}
                                            >
                                              <Copy className="w-3 h-3 shrink-0" />
                                              <span className="truncate">{copiedTeamMemberLinkId === member.id ? "Copiado!" : "Copiar Ref"}</span>
                                            </button>

                                            <a
                                              href={`https://wa.me/55${member.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${member.nome}, sou a Franquia Master PROSFEC. Gostaria de acompanhar como estão suas abordagens aos leads que direcionamos no Caça-Leads.`)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all shrink-0"
                                              title="Enviar WhatsApp ao Consultor"
                                            >
                                              <Phone className="w-3 h-3 shrink-0 text-emerald-600" />
                                              <span>Falar</span>
                                            </a>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                  {/* Team Leads Pipeline View (Collapsible + Consultant Search & Status Filter) */}
                  {(() => {
                    const totalTeamVolume = teamLeads.reduce((acc, l) => acc + (l.limiteEstimado || l.valorAprovado || 0), 0);
                    
                    const filteredTeamLeads = teamLeads.filter(lead => {
                      // Status filter
                      if (teamPipelineStatusFilter !== "todos" && lead.status !== teamPipelineStatusFilter) {
                        return false;
                      }
                      // Search term (consultant name, lead name, company, email, city)
                      if (!teamPipelineSearchTerm.trim()) return true;
                      const term = teamPipelineSearchTerm.toLowerCase().trim();
                      const finder = teamMembers.find(t => t.id === lead.parceiroId);
                      const consultantName = (finder?.nome || lead.parceiroNome || "").toLowerCase();
                      const leadName = (lead.nome || "").toLowerCase();
                      const email = (lead.email || "").toLowerCase();
                      const city = (lead.cidade || "").toLowerCase();
                      const id = (lead.id || "").toLowerCase();
                      return consultantName.includes(term) || leadName.includes(term) || email.includes(term) || city.includes(term) || id.includes(term);
                    });

                    return (
                      <div className="bg-white/75 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-4">
                        {/* Header with summary and toggle */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0A3D2E] border border-emerald-100 flex items-center justify-center shrink-0">
                              <ClipboardList className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-display font-extrabold text-base text-slate-800">Pipeline de Vendas da Equipe</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 font-mono">
                                  {teamLeads.length} {teamLeads.length === 1 ? "lead" : "leads"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>Volume total: <strong className="text-emerald-800 font-mono">{formatCurrencyBRL(totalTeamVolume)}</strong></span>
                                <span>• Simulações e indicações do time</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => setIsTeamPipelineExpanded(!isTeamPipelineExpanded)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 ${
                                isTeamPipelineExpanded
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80"
                                  : "bg-[#0A3D2E] hover:bg-[#00A86B] text-white"
                              }`}
                            >
                              <span>{isTeamPipelineExpanded ? "Recolher Pipeline" : `Visualizar Pipeline (${teamLeads.length})`}</span>
                              {isTeamPipelineExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-emerald-300 shrink-0" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        <AnimatePresence>
                          {isTeamPipelineExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-4 pt-1"
                            >
                              {/* Filter Bar (Search by consultant/lead + status filter) */}
                              {teamLeads.length > 0 && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                  <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      value={teamPipelineSearchTerm}
                                      onChange={(e) => setTeamPipelineSearchTerm(e.target.value)}
                                      placeholder="Buscar por nome do consultor, cliente, empresa ou cidade..."
                                      className="w-full pl-9 pr-8 py-2 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                                    />
                                    {teamPipelineSearchTerm && (
                                      <button
                                        type="button"
                                        onClick={() => setTeamPipelineSearchTerm("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Status Selector */}
                                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    <div className="flex items-center gap-1.5 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 shrink-0">
                                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                                      <select
                                        value={teamPipelineStatusFilter}
                                        onChange={(e) => setTeamPipelineStatusFilter(e.target.value)}
                                        className="bg-transparent font-extrabold text-slate-700 outline-none cursor-pointer text-xs"
                                      >
                                        <option value="todos">Todos os Status</option>
                                        <option value="novo">Novo</option>
                                        <option value="em atendimento">Em Atendimento</option>
                                        <option value="concluido">Concluído</option>
                                        <option value="cancelado">Cancelado</option>
                                      </select>
                                    </div>

                                    {(teamPipelineSearchTerm || teamPipelineStatusFilter !== "todos") && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTeamPipelineSearchTerm("");
                                          setTeamPipelineStatusFilter("todos");
                                        }}
                                        className="px-2.5 py-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer shrink-0"
                                      >
                                        Limpar Filtros
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {teamLeads.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                  Nenhum lead gerado pela sua equipe ainda.
                                </div>
                              ) : filteredTeamLeads.length === 0 ? (
                                <div className="py-10 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                                  <Search className="w-6 h-6 text-slate-400 mx-auto" />
                                  <p className="text-xs text-slate-600 font-bold">
                                    Nenhum lead encontrado com os filtros aplicados.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTeamPipelineSearchTerm("");
                                      setTeamPipelineStatusFilter("todos");
                                    }}
                                    className="text-xs text-emerald-700 font-extrabold hover:underline cursor-pointer"
                                  >
                                    Limpar filtros
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-[11px] font-bold text-slate-500 px-1">
                                    Mostrando {filteredTeamLeads.length} de {teamLeads.length} {teamLeads.length === 1 ? "lead" : "leads"}
                                  </div>

                                  {/* Desktop Table View */}
                                  <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                          <th className="py-2.5 px-3 font-bold rounded-l-xl">Data</th>
                                          <th className="py-2.5 px-3 font-bold">Cliente / Empresa</th>
                                          <th className="py-2.5 px-3 font-bold">Consultor Responsável</th>
                                          <th className="py-2.5 px-3 font-bold">Cidade</th>
                                          <th className="py-2.5 px-3 font-bold text-right">Crédito Estimado</th>
                                          <th className="py-2.5 px-3 font-bold text-center rounded-r-xl">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {filteredTeamLeads.map(lead => {
                                          const finder = teamMembers.find(t => t.id === lead.parceiroId);
                                          return (
                                            <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                                              <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                                                {lead.dataCriacao ? new Date(lead.dataCriacao).toLocaleDateString("pt-BR") : "-"}
                                              </td>
                                              <td className="py-3 px-3 font-semibold text-slate-800">
                                                {lead.nome}
                                                <span className="block text-[10px] text-slate-400 font-normal">{lead.email || lead.whatsapp}</span>
                                              </td>
                                              <td className="py-3 px-3">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0A3D2E] text-[10px] font-black flex items-center justify-center shrink-0">
                                                    {(finder?.nome || lead.parceiroNome || "C").charAt(0).toUpperCase()}
                                                  </span>
                                                  <span className="font-bold text-slate-700 truncate max-w-[180px]">
                                                    {finder?.nome || lead.parceiroNome || "Membro da Equipe"}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="py-3 px-3 text-slate-500">{lead.cidade || "-"}</td>
                                              <td className="py-3 px-3 text-right font-bold text-emerald-800 font-mono">
                                                {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Em análise"}
                                              </td>
                                              <td className="py-3 px-3 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                  lead.status === "concluido" ? "bg-emerald-100 text-emerald-800 border border-emerald-200/60" :
                                                  lead.status === "novo" ? "bg-blue-100 text-blue-800 border border-blue-200/60" :
                                                  lead.status === "cancelado" ? "bg-rose-100 text-rose-800 border border-rose-200/60" :
                                                  lead.status === "em atendimento" ? "bg-amber-100 text-amber-800 border border-amber-200/60" :
                                                  "bg-slate-100 text-slate-700 border border-slate-200/60"
                                                }`}>
                                                  {lead.status}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Mobile Pipeline Cards */}
                                  <div className="block md:hidden space-y-3">
                                    {filteredTeamLeads.map(lead => {
                                      const finder = teamMembers.find(t => t.id === lead.parceiroId);
                                      return (
                                        <div key={lead.id} className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 text-xs">
                                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              {lead.dataCriacao ? new Date(lead.dataCriacao).toLocaleDateString("pt-BR") : "-"}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                              lead.status === "concluido" ? "bg-emerald-100 text-emerald-800 border border-emerald-200/60" :
                                              lead.status === "novo" ? "bg-blue-100 text-blue-800 border border-blue-200/60" :
                                              lead.status === "cancelado" ? "bg-rose-100 text-rose-800 border border-rose-200/60" :
                                              lead.status === "em atendimento" ? "bg-amber-100 text-amber-800 border border-amber-200/60" :
                                              "bg-slate-100 text-slate-700 border border-slate-200/60"
                                            }`}>
                                              {lead.status}
                                            </span>
                                          </div>

                                          <div className="space-y-1">
                                            <h4 className="font-extrabold text-slate-800 text-sm">{lead.nome}</h4>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                              Cidade: {lead.cidade || "-"} {lead.email && `• ${lead.email}`}
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white/75 backdrop-blur-xl p-2.5 rounded-xl border border-slate-200/50">
                                              <span className="text-[9px] text-slate-400 font-bold uppercase block">Consultor</span>
                                              <span className="font-semibold text-slate-700 block mt-0.5 truncate">
                                                {finder?.nome || lead.parceiroNome || "Membro da Equipe"}
                                              </span>
                                            </div>
                                            <div className="bg-white/75 backdrop-blur-xl p-2.5 rounded-xl border border-slate-200/50">
                                              <span className="text-[9px] text-slate-400 font-bold uppercase block">Crédito Estimado</span>
                                              <span className="font-extrabold text-emerald-700 block mt-0.5 font-mono">
                                                {lead.limiteEstimado ? formatCurrencyBRL(lead.limiteEstimado) : "Em análise"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {false && (
                <motion.div
                  key="afiliados-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 text-left"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-slate-800">Seus Parceiros Indicados (Afiliação Recorrente 30%)</h3>
                      <p className="text-xs text-slate-500">Recrute outros parceiros com o seu link e ganhe 30% das mensalidades de forma recorrente enquanto estiverem ativos.</p>
                    </div>
                    <button
                      onClick={copyReferralLink}
                      className="px-4 py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedLink ? "Link Copiado!" : "Copiar Link de Recrutamento"}
                    </button>
                  </div>

                  {/* CONFIGURAÇÃO DE CÓDIGOS DE AFILIADO HUBLA (OPÇÃO B) */}
                  <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] p-6 space-y-5">
                    <div>
                      <h4 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                        <Link className="w-4 h-4 text-emerald-700" />
                        Configurar Seus Links de Checkout Hubla (Opção Direct Link)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Cada afiliado possui links/IDs de checkout exclusivos gerados diretamente na Hubla para os planos da PROSFEC. Cole abaixo o seu código de afiliado (ex: <code>sSn9gIMlvXPt1ESeJJ4A</code>) ou o link de checkout completo correspondente a cada plano (ex: <code>https://pay.hub.la/sSn9gIMlvXPt1ESeJJ4A</code>). O sistema extrairá o ID automaticamente e gerará os links corretos de redirecionamento, mantendo o controle total das suas comissões de 30% recorrentes.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider flex items-center justify-between">
                          <span>Plano Starter</span>
                          <span className="text-[9px] text-slate-400 font-normal normal-case">Padrão: sSn9gIMlvXPt1ESeJJ4A</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Código ou link Hubla"
                          value={hublaCodeStarter}
                          onChange={(e) => setHublaCodeStarter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none text-slate-800 font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider flex items-center justify-between">
                          <span>Plano Executive</span>
                          <span className="text-[9px] text-slate-400 font-normal normal-case">Padrão: UQLcJNaQrlNRsBl1bc2Y</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Código ou link Hubla"
                          value={hublaCodeExecutive}
                          onChange={(e) => setHublaCodeExecutive(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none text-slate-800 font-medium"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider flex items-center justify-between">
                          <span>Plano Master</span>
                          <span className="text-[9px] text-slate-400 font-normal normal-case">Padrão: UZOZ2DtEyahRALjFN3ra</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Código ou link Hubla"
                          value={hublaCodeMaster}
                          onChange={(e) => setHublaCodeMaster(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs outline-none text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      {saveLinksSuccess ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-4 h-4" /> Configurações salvas com sucesso!
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Se deixados em branco, o sistema usará automaticamente os links de checkout padrão da PROSFEC.
                        </span>
                      )}

                      <button
                        onClick={handleSaveAffiliateLinks}
                        disabled={savingLinks}
                        className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                      >
                        {savingLinks ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Salvar Checkouts Hubla
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  {(() => {
                    const totalAffiliates = referredPartners.length;
                    const affiliateStats = referredPartners.reduce((acc, sub) => {
                      const details = getAffiliateCommissionDetails(sub);
                      if (details.isActive && details.commissionValue > 0) {
                        acc.activeCount += 1;
                        acc.totalRecurring += details.commissionValue;
                      }
                      acc.potentialRecurring += details.potentialCommission;
                      return acc;
                    }, { activeCount: 0, totalRecurring: 0, potentialRecurring: 0 });

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white/75 backdrop-blur-xl border border-slate-200/80 p-5 rounded-2xl shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total de Indicados</span>
                            <span className="text-2xl font-black text-slate-800 block mt-1">{totalAffiliates}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Parceiros que utilizaram seu link</span>
                          </div>
                          <div className="bg-white/75 backdrop-blur-xl border border-slate-200/80 p-5 rounded-2xl shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Assinantes Ativos</span>
                            <span className="text-2xl font-black text-emerald-800 block mt-1">
                              {affiliateStats.activeCount} <span className="text-xs text-slate-400 font-medium">de {totalAffiliates}</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 block mt-1">Gerando repasse recorrente ativo</span>
                          </div>
                          <div className="bg-[#0A3D2E] text-white p-5 rounded-2xl shadow-md border border-[#00A86B]/20">
                            <span className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider block">Sua Recorrência Mensal (MRR)</span>
                            <span className="text-2xl font-black text-[#00A86B] block mt-1">
                              {formatCurrencyBRL(affiliateStats.totalRecurring)}
                            </span>
                            <span className="text-[10px] text-emerald-200 block mt-1">30% sobre todas as mensalidades pagas</span>
                          </div>
                        </div>

                        {/* Informative box */}
                        <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl text-xs text-amber-800 leading-relaxed flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold text-amber-900">Como funciona a comissão de 30%?</p>
                            <p className="mt-1 text-amber-800">
                              Sempre que um parceiro indicado por você realizar a adesão (R$ 500 no Starter, R$ 800 no Executive ou R$ 1.500 no Master Partner), você tem direito a 30% de comissão direta (R$ 150, R$ 240 ou R$ 450). Os valores ativos de comissão são computados em tempo real assim que o administrador confirma o pagamento de cada indicado no painel!
                            </p>
                          </div>
                        </div>

                        {/* Affiliates List */}
                        <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <span className="font-display font-extrabold text-sm text-slate-800">Parceiros Cadastrados ({referredPartners.length})</span>
                            <button 
                              onClick={() => currentPartner && fetchReferredPartners(currentPartner.id)}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Atualizar
                            </button>
                          </div>

                          {referredPartnersLoading ? (
                            <div className="p-12 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                              <span>Carregando indicados...</span>
                            </div>
                          ) : referredPartners.length === 0 ? (
                            <div className="p-12 text-center space-y-4 max-w-md mx-auto">
                              <p className="text-slate-400 font-bold text-sm">Nenhum parceiro indicado ainda.</p>
                              <p className="text-xs text-slate-500">
                                Divulgue o seu link de recrutamento com contatos do setor corporativo, assessores e corretores. Quando eles se cadastrarem e ativarem a assinatura deles, sua recorrência começará a subir na hora!
                              </p>
                              <button
                                onClick={copyReferralLink}
                                className="inline-flex items-center gap-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar Link de Recrutamento
                              </button>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[9px]">
                                    <th className="py-3 px-4">Cadastro</th>
                                    <th className="py-3 px-4">Parceiro</th>
                                    <th className="py-3 px-4">Plano</th>
                                    <th className="py-3 px-4">Assinatura</th>
                                    <th className="py-3 px-4">Sua Comissão</th>
                                    <th className="py-3 px-4 text-right">Contato</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                  {referredPartners.map((sub) => {
                                    const details = getAffiliateCommissionDetails(sub);
                                    return (
                                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3.5 px-4 font-mono text-slate-500">
                                          {sub.dataCriacao ? new Date(sub.dataCriacao).toLocaleDateString("pt-BR") : "-"}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-slate-800">
                                          {sub.nome}
                                        </td>
                                        <td className="py-3.5 px-4">
                                          <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded border border-slate-200">
                                            {sub.plano || "STARTER"}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                          {details.isExempt ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded uppercase">
                                              Isento (Consultor)
                                            </span>
                                          ) : details.isTrial ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded uppercase animate-pulse">
                                              Período de Teste ({details.status.daysLeft}d)
                                            </span>
                                          ) : details.isActive ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200/50 px-2 py-0.5 rounded uppercase">
                                              ✓ Pago/Ativo ({details.status.daysLeft}d restantes)
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded uppercase">
                                              ✕ Expirado
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold">
                                          {details.commissionValue > 0 ? (
                                            <span className="text-emerald-700 font-black">
                                              {formatCurrencyBRL(details.commissionValue)}/mês
                                            </span>
                                          ) : details.isTrial ? (
                                            <span className="text-amber-600 font-semibold text-[10px]">
                                              R$ 0,00 (Aguardando Pagamento)
                                            </span>
                                          ) : (
                                            <span className="text-slate-400">
                                              R$ 0,00 (Inativo ou Starter)
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                          {sub.whatsapp && (
                                            <a
                                              href={`https://api.whatsapp.com/send?phone=${sub.whatsapp.replace(/\D/g, "")}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-extrabold bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg border border-emerald-100 transition-all text-[10px]"
                                            >
                                              <Phone className="w-3 h-3" />
                                              WhatsApp
                                            </a>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}

              {activeTab === "simulador" && (
                <div className="p-12 text-center text-slate-400 font-bold">
                  O simulador de proposta agora está integrado diretamente na aba de cada Lead em "Meus leads indicados".
                </div>
              )}
              {false && (
                <motion.div
                  key="simulador-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 text-left"
                >
                  {/* Header row */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-display font-extrabold text-base text-slate-800">Simulador de Propostas Avançado</h3>
                      <p className="text-xs text-slate-500">Configure simulações completas de fomento Pronampe para propor aos seus clientes.</p>
                    </div>
                    <button
                      onClick={copyProposalToClipboard}
                      className="px-4 py-2 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedProposalReport ? "Copiado!" : "Copiar Proposta p/ WhatsApp"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Controls Column */}
                    <div className="lg:col-span-5 bg-white/75 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-5">
                      <h4 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                        Parâmetros do Financiamento
                      </h4>

                      {/* Loan value */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-bold text-slate-600">Valor do Crédito</label>
                          <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                            {formatCurrencyBRL(advValor)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10000"
                          max="1500000"
                          step="10000"
                          value={advValor}
                          onChange={(e) => setAdvValor(parseInt(e.target.value))}
                          className="w-full accent-[#00A86B] bg-slate-100 rounded-lg h-1.5 cursor-pointer"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">Ou digite o valor:</span>
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-bold">R$</span>
                            <input
                              type="number"
                              value={advValor}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setAdvValor(isNaN(val) ? 0 : val);
                              }}
                              className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Rate Annual */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-bold text-slate-600">Taxa de Juros Anual</label>
                          <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                            {advTaxaAnual.toFixed(1).replace(".", ",")}% a.a.
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="25"
                          step="0.5"
                          value={advTaxaAnual}
                          onChange={(e) => setAdvTaxaAnual(parseFloat(e.target.value))}
                          className="w-full accent-[#00A86B] bg-slate-100 rounded-lg h-1.5 cursor-pointer"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAdvTaxaAnual(15.0)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold cursor-pointer"
                          >
                            Selic + 4,5% (15,0%)
                          </button>
                          <button
                            onClick={() => setAdvTaxaAnual(16.5)}
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 py-0.5 rounded text-[10px] text-emerald-800 font-bold cursor-pointer"
                          >
                            Pronampe Máx (16,5%)
                          </button>
                        </div>
                      </div>

                      {/* Grace period and amortization terms */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-slate-600 block">Carência</label>
                          <select
                            value={advCarencia}
                            onChange={(e) => setAdvCarencia(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl p-2 outline-none text-slate-800 font-semibold"
                          >
                            <option value="0">Sem carência</option>
                            <option value="6">6 meses</option>
                            <option value="12">12 meses</option>
                            <option value="18">18 meses</option>
                            <option value="24">24 meses (Máx legal)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-slate-600 block">Amortização</label>
                          <select
                            value={advPrazoAmortizacao}
                            onChange={(e) => setAdvPrazoAmortizacao(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-[#00A86B] rounded-xl p-2 outline-none text-slate-800 font-semibold"
                          >
                            <option value="12">12 parcelas (1 ano)</option>
                            <option value="24">24 parcelas (2 anos)</option>
                            <option value="36">36 parcelas (3 anos)</option>
                            <option value="48">48 parcelas (4 anos)</option>
                            <option value="60">60 parcelas (5 anos)</option>
                            <option value="72">72 parcelas (6 anos)</option>
                            <option value="84">84 parcelas (7 anos)</option>
                            <option value="96">96 parcelas (8 anos)</option>
                          </select>
                        </div>
                      </div>

                      {/* Amortization System */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 block">Sistema de Amortização</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setAdvAmortizacao("SAC")}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              advAmortizacao === "SAC"
                                ? "bg-[#0A3D2E] text-white border-transparent"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            Tabela SAC
                            <span className="block text-[9px] font-normal opacity-85 mt-0.5">Parcelas decrescentes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdvAmortizacao("PRICE")}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                              advAmortizacao === "PRICE"
                                ? "bg-[#0A3D2E] text-white border-transparent"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            Tabela Price
                            <span className="block text-[9px] font-normal opacity-85 mt-0.5">Parcelas constantes</span>
                          </button>
                        </div>
                      </div>

                      {/* Grace period Interest logic controls */}
                      {advCarencia > 0 && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-4">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                            Regras de Juros na Carência
                          </span>
                          
                          {/* Pay interest monthly during grace */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <label className="text-xs font-extrabold text-slate-700 block">Pagar juros na carência?</label>
                              <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">
                                Cliente paga apenas a parcela de juros mensalmente durante os {advCarencia} meses.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAdvPagarJurosCarencia(!advPagarJurosCarencia)}
                              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                                advPagarJurosCarencia ? "bg-[#00A86B]" : "bg-slate-300"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                advPagarJurosCarencia ? "translate-x-5" : ""
                              }`} />
                            </button>
                          </div>

                          {/* Capitalize interest */}
                          {!advPagarJurosCarencia && (
                            <div className="flex items-start justify-between gap-3 pt-3 border-t border-slate-200/60">
                              <div>
                                <label className="text-xs font-extrabold text-slate-700 block">Incorporar juros na carência?</label>
                                <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">
                                  Se "Sim", juros compostos somam-se ao saldo devedor principal. Se "Não", acumulam-se de forma simples sem juros sobre juros.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAdvIncorporarJurosCarencia(!advIncorporarJurosCarencia)}
                                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                                  advIncorporarJurosCarencia ? "bg-[#00A86B]" : "bg-slate-300"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                  advIncorporarJurosCarencia ? "translate-x-5" : ""
                                }`} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stats & Dashboard Column */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Commission Highlight Card */}
                      <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
                        <div className="absolute right-[-20px] top-[-20px] w-24 h-24 rounded-full bg-emerald-500/10" />
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                              Sua Comissão de Parceiro ({getPlanDisplayName(currentPartner?.plano)})
                            </span>
                            <h4 className="text-2xl md:text-3xl font-display font-black text-emerald-100 mt-1">
                              {formatCurrencyBRL(calculateSchedule().comissaoEstimada)}
                            </h4>
                            <p className="text-[10px] text-emerald-200 leading-normal mt-1">
                              *Estimativa calculada sobre o valor financiado de {formatCurrencyBRL(advValor)} com taxa de repasse de {(getCommissionMultiplier(currentPartner?.plano) * 100).toFixed(1)}%.
                            </p>
                          </div>
                          <div className="bg-emerald-800/40 p-2 rounded-xl text-emerald-300">
                            <Coins className="w-6 h-6" />
                          </div>
                        </div>
                      </div>

                      {/* Stat Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Prazo Total</span>
                          <strong className="text-sm text-slate-800 font-extrabold">{advCarencia + advPrazoAmortizacao} meses</strong>
                          <span className="text-[8px] text-slate-400 block mt-0.5">{advCarencia} car. + {advPrazoAmortizacao} amort.</span>
                        </div>

                        <div className="bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Total de Juros</span>
                          <strong className="text-sm text-emerald-800 font-extrabold">{formatCurrencyBRL(calculateSchedule().totalJuros)}</strong>
                          <span className="text-[8px] text-slate-400 block mt-0.5 font-mono">Custo do capital</span>
                        </div>

                        <div className="bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Parcela Inicial</span>
                          <strong className="text-sm text-[#0A3D2E] font-extrabold">{formatCurrencyBRL(calculateSchedule().parcelaInicial)}</strong>
                          <span className="text-[8px] text-slate-400 block mt-0.5 font-mono">Mes 1 de amortiz.</span>
                        </div>

                        <div className="bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Parcela Final</span>
                          <strong className="text-sm text-slate-700 font-extrabold">{formatCurrencyBRL(calculateSchedule().parcelaFinal)}</strong>
                          <span className="text-[8px] text-slate-400 block mt-0.5 font-mono font-mono">Ultimo mes</span>
                        </div>
                      </div>

                      {/* Summary Analysis card */}
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-xs text-blue-900 space-y-2 font-medium">
                        <div className="flex items-center gap-1.5 font-extrabold text-blue-950">
                          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Análise Estratégica da Proposta</span>
                        </div>
                        <p className="leading-relaxed">
                          A simulação de <strong>Tabela {advAmortizacao}</strong> com <strong>{advCarencia} meses de carência</strong> e <strong>{advPrazoAmortizacao} meses de amortização</strong> resulta em um Custo Total de <strong>{formatCurrencyBRL(calculateSchedule().totalPago)}</strong>.
                        </p>
                        <p className="leading-relaxed text-[11px] text-blue-800 font-bold">
                          {advAmortizacao === "SAC" 
                            ? "💡 Recomendação SAC: As parcelas iniciam mais altas mas decrescem a cada mês, gerando uma economia significativa nos juros totais pagos se comparado à Tabela Price. Ideal para empresas saudáveis com fluxo de caixa estável."
                            : "💡 Recomendação Price: As parcelas permanecem perfeitamente idênticas do início ao fim da amortização. Ideal para empresas que buscam planejamento orçamentário previsível e parcelas iniciais menores que as do SAC."
                          }
                        </p>
                      </div>

                      {/* Detailed schedule list */}
                      <div className="bg-white/75 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h5 className="font-display font-extrabold text-sm text-slate-800">Tabela de Amortização Projetada</h5>
                          <span className="text-[10px] text-slate-400 font-bold">Total: {calculateSchedule().rows.length} meses</span>
                        </div>

                        <div className="overflow-y-auto max-h-72 border border-slate-100 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-500 uppercase font-black sticky top-0">
                              <tr>
                                <th className="py-2.5 px-3">Mês</th>
                                <th className="py-2.5 px-3 text-center">Tipo</th>
                                <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                                <th className="py-2.5 px-3 text-right">Amortização</th>
                                <th className="py-2.5 px-3 text-right">Juros</th>
                                <th className="py-2.5 px-3 text-right text-emerald-800">Parcela</th>
                                <th className="py-2.5 px-3 text-right">Saldo Final</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              {calculateSchedule().rows.map((row) => (
                                <tr key={row.mes} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2 px-3 font-semibold text-slate-500">Mês {row.mes}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      row.tipo === "Carência" 
                                        ? "bg-amber-100 text-amber-800" 
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {row.tipo}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-500">{formatCurrencyBRL(row.saldoInicial)}</td>
                                  <td className="py-2 px-3 text-right font-medium text-slate-600">
                                    {row.amortizacao > 0 ? formatCurrencyBRL(row.amortizacao) : "-"}
                                  </td>
                                  <td className="py-2 px-3 text-right font-medium text-slate-600">{formatCurrencyBRL(row.juros)}</td>
                                  <td className="py-2 px-3 text-right font-extrabold text-[#0A3D2E]">{formatCurrencyBRL(row.parcela)}</td>
                                  <td className="py-2 px-3 text-right text-slate-500">{formatCurrencyBRL(row.saldoFinal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Form Card for Lead and Socios Registration */}
                      <div className="bg-white/75 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-[10px] bg-[#0A3D2E] text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                              Novo Lead com Sócios
                            </span>
                            <h4 className="font-display font-extrabold text-lg text-[#0A3D2E] mt-2 flex items-center gap-2">
                              📋 Cadastrar Lead & Ficha dos Sócios
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              Insira os dados cadastrais da empresa e dos sócios para registrar diretamente a ficha de crédito na mesa de análise.
                            </p>
                          </div>
                        </div>

                        {regLeadError && (
                          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            <span>{regLeadError}</span>
                          </div>
                        )}

                        {regLeadSuccess && (
                          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>{regLeadSuccess}</span>
                          </div>
                        )}

                        <form onSubmit={handleCreateLeadWithSocios} className="space-y-6">
                          {/* Seção 1: Dados do Cliente e Empresa */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                              <Briefcase className="w-4 h-4 text-slate-400" />
                              1. Dados Cadastrais da Empresa e Contato
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Razão Social *</label>
                                <input
                                  type="text"
                                  placeholder="Razão Social Ltda"
                                  value={leadRazaoSocial}
                                  onChange={(e) => setLeadRazaoSocial(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">CNPJ *</label>
                                <input
                                  type="text"
                                  placeholder="00.000.000/0001-00"
                                  value={leadCnpj}
                                  onChange={(e) => setLeadCnpj(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Nome do Solicitante / Cliente *</label>
                                <input
                                  type="text"
                                  placeholder="Nome Completo"
                                  value={leadNome}
                                  onChange={(e) => setLeadNome(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">WhatsApp de Contato *</label>
                                <input
                                  type="tel"
                                  placeholder="(11) 99999-9999"
                                  value={leadWhatsapp}
                                  onChange={(e) => setLeadWhatsapp(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">E-mail *</label>
                                <input
                                  type="email"
                                  placeholder="cliente@email.com"
                                  value={leadEmail}
                                  onChange={(e) => setLeadEmail(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Ramo de Atividade *</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Comércio, Tecnologia, Serviços"
                                  value={leadRamo}
                                  onChange={(e) => setLeadRamo(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Porte da Empresa *</label>
                                <select
                                  value={leadPorte}
                                  onChange={(e) => setLeadPorte(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                >
                                  <option value="MEI">MEI (Microempreendedor Individual)</option>
                                  <option value="ME">ME (Microempresa)</option>
                                  <option value="EPP">EPP (Empresa de Pequeno Porte)</option>
                                  <option value="Médio">Médio / Grande Porte</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Banco de Preferência *</label>
                                <select
                                  value={leadBancoPrincipal}
                                  onChange={(e) => setLeadBancoPrincipal(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                >
                                  <option value="Banco do Brasil">Banco do Brasil</option>
                                  <option value="Caixa Econômica">Caixa Econômica</option>
                                  <option value="Itaú">Itaú</option>
                                  <option value="Bradesco">Bradesco</option>
                                  <option value="Santander">Santander</option>
                                  <option value="Sicoob">Sicoob</option>
                                  <option value="Sicredi">Sicredi</option>
                                </select>
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={leadMenosDe12Meses}
                                  onChange={(e) => setLeadMenosDe12Meses(e.target.checked)}
                                  className="w-4 h-4 accent-[#00A86B] rounded"
                                />
                                <span className="text-xs font-bold text-slate-700">Empresa aberta há menos de 12 meses?</span>
                              </label>

                              {leadMenosDe12Meses ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">Capital Social Declarado (R$) *</label>
                                    <input
                                      type="number"
                                      placeholder="Ex: 50000"
                                      value={leadCapitalSocial}
                                      onChange={(e) => setLeadCapitalSocial(e.target.value)}
                                      className="w-full text-xs px-3.5 py-2.5 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                      required={leadMenosDe12Meses}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">Faturamento Médio Mensal (R$) *</label>
                                    <input
                                      type="number"
                                      placeholder="Ex: 15000"
                                      value={leadMediaReceitaMensal}
                                      onChange={(e) => setLeadMediaReceitaMensal(e.target.value)}
                                      className="w-full text-xs px-3.5 py-2.5 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                      required={leadMenosDe12Meses}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1 pt-1">
                                  <label className="text-[11px] font-bold text-slate-500 block">Faturamento Bruto de 2025 (R$) *</label>
                                  <input
                                    type="number"
                                    placeholder="Ex: 180000"
                                    value={leadFaturamento}
                                    onChange={(e) => setLeadFaturamento(e.target.value)}
                                    className="w-full text-xs px-3.5 py-2.5 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                    required={!leadMenosDe12Meses}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Seção 2: Dados do Sócio Administrador Principal */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                              <User className="w-4 h-4 text-slate-400" />
                              2. Qualificação Completa do Sócio Principal (Administrador)
                            </h5>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Nome Completo do Sócio *</label>
                                <input
                                  type="text"
                                  placeholder="Nome Completo do Sócio"
                                  value={socio1Nome}
                                  onChange={(e) => setSocio1Nome(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">CPF do Sócio *</label>
                                <input
                                  type="text"
                                  placeholder="000.000.000-00"
                                  value={socio1Cpf}
                                  onChange={(e) => setSocio1Cpf(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Data de Nascimento *</label>
                                <input
                                  type="date"
                                  value={socio1Birth}
                                  onChange={(e) => setSocio1Birth(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                            </div>
                          </div>

                          {/* Seção 3: Endereço do Sócio Principal */}
                          <div className="space-y-4">
                            <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              3. Endereço Residencial do Sócio Principal
                            </h5>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                              <div className="sm:col-span-4 space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">CEP *</label>
                                <input
                                  type="text"
                                  placeholder="00000-00"
                                  value={endCep}
                                  onChange={(e) => setEndCep(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="sm:col-span-8 space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Logradouro *</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Av. Paulista"
                                  value={endLogradouro}
                                  onChange={(e) => setEndLogradouro(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="sm:col-span-3 space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Número *</label>
                                <input
                                  type="text"
                                  placeholder="Ex: 1000"
                                  value={endNumero}
                                  onChange={(e) => setEndNumero(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="sm:col-span-4 space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Bairro *</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Bela Vista"
                                  value={endBairro}
                                  onChange={(e) => setEndBairro(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="sm:col-span-5 space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Complemento</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Apto 51"
                                  value={endComplemento}
                                  onChange={(e) => setEndComplemento(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                />
                              </div>
                              <div className="sm:col-span-8 space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Cidade *</label>
                                <input
                                  type="text"
                                  placeholder="Ex: São Paulo"
                                  value={endCidade}
                                  onChange={(e) => setEndCidade(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                  required
                                />
                              </div>
                              <div className="sm:col-span-4 space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">Estado (UF) *</label>
                                <select
                                  value={endUf}
                                  onChange={(e) => setEndUf(e.target.value)}
                                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                >
                                  <option value="AC">Acre</option>
                                  <option value="AL">Alagoas</option>
                                  <option value="AP">Amapá</option>
                                  <option value="AM">Amazonas</option>
                                  <option value="BA">Bahia</option>
                                  <option value="CE">Ceará</option>
                                  <option value="DF">Distrito Federal</option>
                                  <option value="ES">Espírito Santo</option>
                                  <option value="GO">Goiás</option>
                                  <option value="MA">Maranhão</option>
                                  <option value="MT">Mato Grosso</option>
                                  <option value="MS">Mato Grosso do Sul</option>
                                  <option value="MG">Minas Gerais</option>
                                  <option value="PA">Pará</option>
                                  <option value="PB">Paraíba</option>
                                  <option value="PR">Paraná</option>
                                  <option value="PE">Pernambuco</option>
                                  <option value="PI">Piauí</option>
                                  <option value="RJ">Rio de Janeiro</option>
                                  <option value="RN">Rio Grande do Norte</option>
                                  <option value="RS">Rio Grande do Sul</option>
                                  <option value="RO">Rondônia</option>
                                  <option value="RR">Roraima</option>
                                  <option value="SC">Santa Catarina</option>
                                  <option value="SP">São Paulo</option>
                                  <option value="SE">Sergipe</option>
                                  <option value="TO">Tocantins</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Seção 4: Segundo Sócio (Opcional) */}
                          <div className="space-y-4 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer border-b border-slate-100 pb-2">
                              <input
                                type="checkbox"
                                checked={hasSocio2}
                                onChange={(e) => setHasSocio2(e.target.checked)}
                                className="w-4 h-4 accent-[#00A86B] rounded"
                              />
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-slate-400" />
                                4. Empresa possui Segundo Sócio? (Opcional)
                              </span>
                            </label>

                            {hasSocio2 && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-500 block">Nome Completo do Sócio *</label>
                                  <input
                                    type="text"
                                    placeholder="Nome do Segundo Sócio"
                                    value={socio2Nome}
                                    onChange={(e) => setSocio2Nome(e.target.value)}
                                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                    required={hasSocio2}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-500 block">CPF do Sócio *</label>
                                  <input
                                    type="text"
                                    placeholder="000.000.000-00"
                                    value={socio2Cpf}
                                    onChange={(e) => setSocio2Cpf(e.target.value)}
                                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                    required={hasSocio2}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-500 block">Data de Nascimento *</label>
                                  <input
                                    type="date"
                                    value={socio2Birth}
                                    onChange={(e) => setSocio2Birth(e.target.value)}
                                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white/75 backdrop-blur-xl focus:outline-hidden focus:border-[#0A3D2E]"
                                    required={hasSocio2}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                              type="submit"
                              disabled={regLeadLoading}
                              className="w-full sm:w-auto px-6 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                              {regLeadLoading ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Registrando...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 stroke-[3]" />
                                  Registrar Ficha de Crédito Completa
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Lead Workspace Modal Overlay */}
      {selectedLeadForWorkspace && currentPartner && (
        <LeadWorkspaceModal
          lead={selectedLeadForWorkspace}
          currentPartner={currentPartner}
          initialTab={workspaceTab}
          onClose={() => setSelectedLeadForWorkspace(null)}
          onRefreshLeads={async () => {
            await fetchPartnerLeads(currentPartner.id);
            // Re-fetch or update the active selected lead so the modal UI updates in real time
            try {
              const { getDoc, doc } = await import("firebase/firestore");
              const docSnap = await getDoc(doc(db, "leads", selectedLeadForWorkspace.id));
              if (docSnap.exists()) {
                setSelectedLeadForWorkspace({ id: docSnap.id, ...docSnap.data() } as Lead);
              }
            } catch (err) {
              console.error("Error refreshing workspace lead state:", err);
            }
          }}
        />
      )}

      {/* Reassign Lead Modal Overlay */}
      {assigningLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 space-y-4 text-left"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display font-extrabold text-lg text-slate-800">Direcionar Lead para Consultor</h3>
                <p className="text-xs text-slate-500">Distribua este lead para um membro de sua equipe.</p>
              </div>
              <button
                onClick={() => setAssigningLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 block">Lead Selecionado</span>
              <span className="text-xs font-bold text-slate-700 block">{assigningLead.razaoSocial || assigningLead.nome}</span>
              {assigningLead.cnpj && <span className="text-[10px] font-mono text-slate-400 block">CNPJ: {assigningLead.cnpj}</span>}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black text-slate-400 block">Selecione o Consultor</span>
              {teamMembers.length === 0 ? (
                <p className="text-xs text-amber-600 font-semibold py-2">Você não possui consultores cadastrados ainda na sua equipe.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {teamMembers.map(member => {
                    const isExecutive = member.plano?.toUpperCase().includes("EXEC");
                    return (
                      <button
                        key={member.id}
                        onClick={() => handleAssignLead(assigningLead.id, member)}
                        className="w-full p-3 rounded-2xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 block">{member.nome}</span>
                          <span className="text-[10px] text-slate-400 block">{member.email}</span>
                        </div>
                        <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                          isExecutive ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {isExecutive ? "Executive" : "Starter"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAssigningLead(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ANNOUNCEMENT POPUP OVERLAY */}
      {currentAnnouncementShow && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col text-left"
          >
            {/* Header / Banner Image */}
            {currentAnnouncementShow.imagemUrl ? (
              <div className="h-48 w-full overflow-hidden bg-slate-100 relative">
                <img
                  src={currentAnnouncementShow.imagemUrl}
                  alt={currentAnnouncementShow.titulo}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80";
                  }}
                />
                <button
                  onClick={() => handleCloseAnnouncement(currentAnnouncementShow.id)}
                  className="absolute top-4 right-4 p-1.5 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full transition-all cursor-pointer shadow-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-start relative">
                <div className="flex items-center gap-2.5">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Megaphone className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 block">
                      Informativo Oficial
                    </span>
                    <h3 className="font-display font-extrabold text-lg leading-tight mt-0.5">
                      PROSFEC Notícias
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => handleCloseAnnouncement(currentAnnouncementShow.id)}
                  className="p-1 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content area */}
            <div className="p-6 space-y-4">
              {currentAnnouncementShow.imagemUrl && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    Campanha Especial
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(currentAnnouncementShow.dataCriacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}

              <h4 className="font-display font-black text-xl text-slate-800 leading-tight">
                {currentAnnouncementShow.titulo}
              </h4>

              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-1 font-sans">
                {currentAnnouncementShow.mensagem}
              </div>

              {/* Action and Close buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {currentAnnouncementShow.linkUrl ? (
                  <a
                    href={currentAnnouncementShow.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl text-center shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {currentAnnouncementShow.linkTexto || "Acessar Link Oficial"}
                  </a>
                ) : null}
                <button
                  onClick={() => handleCloseAnnouncement(currentAnnouncementShow.id)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl text-center transition-all cursor-pointer"
                >
                  Entendi, Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* CNPJ INPUT PROMPT MODAL */}
      {cnpjInputModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 text-left"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  Enriquecimento Receita Federal
                </span>
                <h3 className="font-display font-black text-lg text-slate-800 leading-tight">
                  Consultar Cartão CNPJ
                </h3>
              </div>
              <button
                onClick={() => setCnpjInputModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Empresa Selecionada</span>
              <p className="text-xs font-extrabold text-slate-800">{cnpjInputModal.place.nome}</p>
              {cnpjInputModal.place.endereco && (
                <p className="text-[10px] text-slate-500 font-medium">{cnpjInputModal.place.endereco}</p>
              )}
            </div>

            {cnpjInputModal.error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{cnpjInputModal.error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 block">Número do CNPJ da Empresa (14 dígitos)</label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpjInputModal.inputCnpj}
                onChange={(e) => setCnpjInputModal({ ...cnpjInputModal, inputCnpj: e.target.value })}
                className="w-full bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-[#0A3D2E]"
              />
              <span className="text-[10px] text-slate-400 block">Digitação rápida ou cole o CNPJ para buscar os sócios e regime tributário.</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCnpjInputModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleFetchCnpj(cnpjInputModal.place, cnpjInputModal.inputCnpj)}
                className="flex-1 py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar Ficha CNPJ
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ACTIVE CNPJ DETAILS CARD MODAL */}
      {activeCnpjModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-100 my-8 text-left"
          >
            {/* Header */}
            <div className="bg-[#0A3D2E] p-6 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Ficha Oficial Receita Federal
                </span>
                <h3 className="font-display font-black text-xl leading-tight mt-0.5">
                  {activeCnpjModal.details.razaoSocial || activeCnpjModal.place.nome}
                </h3>
                <p className="text-xs text-emerald-200/80 font-mono mt-1">CNPJ: {activeCnpjModal.details.cnpj}</p>
              </div>
              <button
                onClick={() => setActiveCnpjModal(null)}
                className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Top status bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Situação Cadastral</span>
                  <span className="text-xs font-black text-emerald-700 block mt-0.5">{activeCnpjModal.details.situacaoCadastral || "ATIVA"}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Porte Empresarial</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5">{activeCnpjModal.details.porte || "ME / EPP"}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Data de Abertura</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5">{activeCnpjModal.details.dataAbertura || "N/I"}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Capital Social</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5">
                    {activeCnpjModal.details.capitalSocial ? `R$ ${Number(activeCnpjModal.details.capitalSocial).toLocaleString("pt-BR")}` : "N/I"}
                  </span>
                </div>
              </div>

              {/* General info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Nome Fantasia</span>
                  <span className="font-extrabold text-slate-800">{activeCnpjModal.details.nomeFantasia || activeCnpjModal.place.nome}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Atividade Principal (CNAE)</span>
                  <span className="font-extrabold text-slate-800">{activeCnpjModal.details.cnaePrincipalDescricao || activeCnpjModal.details.cnaePrincipal || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Endereço Fiscal</span>
                  <span className="font-medium text-slate-700">
                    {activeCnpjModal.details.logradouro ? `${activeCnpjModal.details.logradouro}, ${activeCnpjModal.details.numero} - ${activeCnpjModal.details.bairro}, ${activeCnpjModal.details.municipio}/${activeCnpjModal.details.uf}` : activeCnpjModal.place.endereco}
                  </span>
                </div>
              </div>

              {/* Quadro de Sócios (QSA) */}
              {activeCnpjModal.details.qsa && activeCnpjModal.details.qsa.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-500 block tracking-wider">
                    👥 Quadro de Sócios e Administradores ({activeCnpjModal.details.qsa.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeCnpjModal.details.qsa.map((socio: any, idx: number) => (
                      <div key={idx} className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-0.5 text-xs">
                        <span className="font-black text-slate-800 block">{socio.nome_socio || socio.nome}</span>
                        <span className="text-[10px] font-bold text-emerald-800 block">{socio.qualificacao_socio || socio.qualificacao || "Sócio / Administrador"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => setActiveCnpjModal(null)}
                className="py-2.5 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const place = activeCnpjModal.place;
                  const details = activeCnpjModal.details;
                  setActiveCnpjModal(null);
                  setSelectedLeadForRegistration({
                    nomeEmpresa: place.nome,
                    telefone: place.telefone,
                    categoria: place.categoria,
                    endereco: place.endereco,
                    website: place.website,
                    cnpj: details.cnpj,
                    razaoSocial: details.razaoSocial || place.nome,
                    porte: details.porte || "ME"
                  });
                }}
                className="py-2.5 px-5 bg-[#0A3D2E] hover:bg-[#00A86B] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Importar e Cadastrar Lead
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* DIRECT LEAD REGISTER MODAL FORM (SIMULADOR COMPLETO DA HOME) */}
      {selectedLeadForRegistration && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-slate-100 my-8 text-left relative"
          >
            <div className="p-5 md:p-6 bg-[#0A3D2E] text-white flex justify-between items-center border-b border-emerald-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                    Simulador & Cadastro Oficial de Lead
                  </span>
                  <h3 className="font-display font-black text-lg md:text-xl text-white">
                    {selectedLeadForRegistration.nomeEmpresa || selectedLeadForRegistration.razaoSocial || "Novo Lead"}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadForRegistration(null)}
                className="p-2 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 max-h-[82vh] overflow-y-auto">
              <Simulador
                onLeadCaptured={handlePartnerSimulatorLeadCaptured}
                referredByPartnerId={currentPartner?.id}
                initialData={selectedLeadForRegistration}
                isModalMode={true}
                onCancel={() => setSelectedLeadForRegistration(null)}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* CONSULTANT CAÇA-LEADS INSPECTION MODAL */}
      {selectedConsultantForInspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white/75 backdrop-blur-xl rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col text-left">
            {/* Modal Header */}
            <div className="bg-[#0A3D2E] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-300">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                    Acompanhamento de Prospecção Ativa
                  </span>
                  <h3 className="font-display font-extrabold text-lg text-white">
                    Caça-Leads: {selectedConsultantForInspection.nome}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedConsultantForInspection(null)}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
              {(() => {
                const consultantLeads = allParentDistributedLeads.filter(
                  l => l.teamMemberId === selectedConsultantForInspection.id
                );
                const totalCount = consultantLeads.length;
                const pendentes = consultantLeads.filter(l => !l.status || l.status === "pendente" || l.status === "em_andamento").length;
                const convertidos = consultantLeads.filter(l => l.status === "convertido" || l.status === "lead_cadastrado").length;
                const descartados = consultantLeads.filter(l => l.status === "descartado").length;

                const filtered = consultantLeads.filter(l => {
                  const matchesSearch = 
                    (l.nomeEmpresa && l.nomeEmpresa.toLowerCase().includes(inspectionSearchTerm.toLowerCase())) ||
                    (l.cnpj && l.cnpj.includes(inspectionSearchTerm)) ||
                    (l.cidade && l.cidade.toLowerCase().includes(inspectionSearchTerm.toLowerCase()));
                  const matchesStatus = inspectionStatusFilter === "todos" || l.status === inspectionStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                return (
                  <>
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Total Direcionados</span>
                        <span className="text-xl font-black text-slate-800 mt-1 block">{totalCount}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs text-center">
                        <span className="text-[10px] text-amber-700 font-extrabold uppercase block">Em Abordagem</span>
                        <span className="text-xl font-black text-amber-600 mt-1 block">{pendentes}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs text-center">
                        <span className="text-[10px] text-emerald-700 font-extrabold uppercase block">Convertidos</span>
                        <span className="text-xl font-black text-emerald-600 mt-1 block">{convertidos}</span>
                      </div>
                      <div className="bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Descartados</span>
                          <span className="text-xl font-black text-slate-500 mt-1 block">{descartados}</span>
                        </div>
                        {descartados > 0 && (
                          <button
                            type="button"
                            onClick={() => handleBulkDeleteDiscardedLeadsForConsultant(selectedConsultantForInspection.id, selectedConsultantForInspection.nome)}
                            disabled={bulkDeletingDiscardedLoading}
                            className="mt-1 text-[10px] text-red-600 hover:text-red-700 font-extrabold flex items-center justify-center gap-1 mx-auto hover:underline cursor-pointer"
                            title="Excluir todos os descartados definitivamente"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Limpar descartados
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filters & Bulk Transfer / Delete Discarded Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={inspectionSearchTerm}
                          onChange={(e) => setInspectionSearchTerm(e.target.value)}
                          placeholder="Buscar empresa, CNPJ ou cidade..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Status:</span>
                          <select
                            value={inspectionStatusFilter}
                            onChange={(e) => setInspectionStatusFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl text-xs p-2 font-bold text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="todos">Todos os Status ({totalCount})</option>
                            <option value="pendente">Pendente / Em Abordagem ({pendentes})</option>
                            <option value="convertido">Convertido em Lead ({convertidos})</option>
                            <option value="descartado">Descartado ({descartados})</option>
                          </select>
                        </div>
                        {descartados > 0 && (
                          <button
                            type="button"
                            onClick={() => handleBulkDeleteDiscardedLeadsForConsultant(selectedConsultantForInspection.id, selectedConsultantForInspection.nome)}
                            disabled={bulkDeletingDiscardedLoading}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                            title="Excluir definitivamente todos os leads descartados por este consultor para liberar o saldo"
                          >
                            {bulkDeletingDiscardedLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Excluir Descartados ({descartados})
                          </button>
                        )}
                        {teamMembers.length > 1 && totalCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setBulkReassignConsultantSource(selectedConsultantForInspection);
                              setBulkReassignTargetId("");
                            }}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                            title="Transferir todos os leads ativos deste consultor para outro da equipe"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Transferir Toda a Carteira
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Distributed Leads List */}
                    {filtered.length === 0 ? (
                      <div className="py-12 bg-white/75 backdrop-blur-xl rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto">
                          {totalCount === 0
                            ? `Nenhum lead do "Caça-Leads" foi direcionado para ${selectedConsultantForInspection.nome} ainda.`
                            : "Nenhum lead encontrado com os filtros selecionados."}
                        </p>
                        {totalCount === 0 && (
                          <button
                            onClick={() => {
                              setSelectedConsultantForInspection(null);
                              const el = document.getElementById("caca-leads-section");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="px-4 py-2 bg-[#00A86B] hover:bg-[#008f5a] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            Direcionar Leads no Caça-Leads Agora
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map(lead => {
                          const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
                          const hasCnpj = !!lead.cnpj;

                          return (
                            <div key={lead.id} className="bg-white/75 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-emerald-300 transition-all flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                  <div>
                                    <h5 className="font-extrabold text-sm text-slate-800 leading-tight">
                                      {lead.nomeEmpresa}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                      {lead.categoria || "Empresa"} • {lead.cidade}{lead.estado ? ` - ${lead.estado}` : ""}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 ${
                                    lead.status === "convertido" || lead.status === "lead_cadastrado"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : lead.status === "descartado"
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-amber-100 text-amber-800"
                                  }`}>
                                    {lead.status === "convertido" ? "Convertido" : lead.status === "descartado" ? "Descartado" : "Pendente"}
                                  </span>
                                </div>

                                <div className="py-2.5 space-y-1.5 text-xs">
                                  {lead.telefone && (
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span className="font-medium">{lead.telefone}</span>
                                    </div>
                                  )}

                                  {hasCnpj && (
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span className="font-mono text-[11px] font-bold text-slate-700">CNPJ: {lead.cnpj}</span>
                                    </div>
                                  )}

                                  {lead.dataDistribuicao && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>Direcionado em {new Date(lead.dataDistribuicao).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                  )}

                                  {lead.dataRedirecionamento && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-medium">
                                      <ArrowRightLeft className="w-3 h-3 text-indigo-500 shrink-0" />
                                      <span>Redirecionado em {new Date(lead.dataRedirecionamento).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                  )}

                                  {lead.historico && lead.historico.length > 0 && (
                                    <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                      <span className="text-[9px] font-extrabold text-slate-500 uppercase block">Última Anotação:</span>
                                      <p className="text-[11px] text-slate-700 italic">
                                        "{lead.historico[lead.historico.length - 1].text}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  {cleanPhone ? (
                                    <a
                                      href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá, sou da equipe da PROSFEC. Entro em contato em relação ao atendimento para a empresa ${lead.nomeEmpresa}.`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-xl flex items-center gap-1 transition-all"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600" />
                                      WhatsApp
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Sem WhatsApp</span>
                                  )}

                                  {/* REDIRECT TO ANOTHER CONSULTANT BUTTON */}
                                  {teamMembers.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLeadToReassign(lead);
                                        setReassignTargetMemberId("");
                                        setReassignReason("");
                                      }}
                                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-indigo-200"
                                      title="Redirecionar este lead para outro consultor da base"
                                    >
                                      <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
                                      Redirecionar
                                    </button>
                                  )}
                                </div>

                                <button
                                  onClick={() => {
                                    if (lead.status === "descartado") {
                                      handleDeleteDistributedLeadPermanent(lead.id);
                                    } else {
                                      handleDiscardDistributedLead(lead.id);
                                    }
                                  }}
                                  className={`px-2 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                                    lead.status === "descartado"
                                      ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                      : "bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500"
                                  }`}
                                  title={lead.status === "descartado" ? "Excluir permanentemente do banco" : "Remover / Descartar Lead"}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {lead.status === "descartado" ? "Excluir Definitivo" : "Descartar"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Transparência total no acompanhamento da sua equipe Master.</span>
              <button
                onClick={() => setSelectedConsultantForInspection(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL LEAD REDIRECTION MODAL */}
      {leadToReassign && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <ArrowRightLeft className="w-5 h-5" />
                <h4 className="font-display font-extrabold text-base text-slate-800">
                  Redirecionar Lead
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setLeadToReassign(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-100/80 p-3.5 rounded-2xl space-y-1.5 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Lead em Transferência</span>
              <div className="font-extrabold text-sm text-slate-800">{leadToReassign.nomeEmpresa}</div>
              <div className="text-slate-500 flex items-center gap-2">
                <span>{leadToReassign.categoria || "Empresa"}</span>
                {leadToReassign.cidade && <span>• {leadToReassign.cidade}</span>}
              </div>
              <div className="text-[11px] text-slate-600 pt-1">
                Consultor Atual: <strong>{leadToReassign.teamMemberNome || "Consultor"}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide block">
                  Selecione o Novo Consultor de Destino *
                </label>
                <select
                  value={reassignTargetMemberId}
                  onChange={(e) => setReassignTargetMemberId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl transition-all cursor-pointer"
                >
                  <option value="">Selecione um consultor da sua equipe...</option>
                  {teamMembers
                    .filter(m => m.id !== leadToReassign.teamMemberId)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide block">
                  Motivo do Redirecionamento (Opcional)
                </label>
                <input
                  type="text"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Ex: Consultor inativo, ausência, readequação de carteira..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl transition-all"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              💡 Ao redirecionar, o status do lead voltará para <strong>Pendente</strong> na carteira do novo consultor e ele receberá uma notificação para dar continuidade imediata.
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLeadToReassign(null)}
                disabled={reassigningLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!reassignTargetMemberId || reassigningLoading}
                onClick={handleReassignDistributedLead}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {reassigningLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Confirmar Redirecionamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK PORTFOLIO TRANSFER MODAL */}
      {bulkReassignConsultantSource && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <ArrowRightLeft className="w-5 h-5" />
                <h4 className="font-display font-extrabold text-base text-slate-800">
                  Transferência em Lote de Carteira
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setBulkReassignConsultantSource(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl space-y-1.5 text-xs text-amber-900">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Atenção Master</span>
              <p className="font-medium leading-relaxed">
                Você está prestes a transferir <strong>todos os leads ativos do Caça-Leads</strong> de{" "}
                <strong>{bulkReassignConsultantSource.nome}</strong>.
              </p>
              <div className="text-[11px] text-amber-800 font-bold mt-1">
                Total a redistribuir: {allParentDistributedLeads.filter(l => l.teamMemberId === bulkReassignConsultantSource.id && l.status !== "descartado").length} leads
              </div>
            </div>

            {/* Selection between single consultant or equal split */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide block">
                Forma de Redistribuição
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBulkReassignMode("single")}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    bulkReassignMode === "single"
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-1 ring-indigo-500"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-extrabold flex items-center gap-1">
                    👤 1 Consultor
                  </span>
                  <span className="text-[10px] opacity-75">Tudo para um membro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkReassignMode("equal")}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    bulkReassignMode === "equal"
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-1 ring-indigo-500"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-extrabold flex items-center gap-1">
                    ⚖️ Dividir por Igual
                  </span>
                  <span className="text-[10px] opacity-75">Partes iguais na equipe</span>
                </button>
              </div>

              {bulkReassignMode === "single" ? (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide block">
                    Escolha o Consultor que Receberá a Carteira *
                  </label>
                  <select
                    value={bulkReassignTargetId}
                    onChange={(e) => setBulkReassignTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white/75 backdrop-blur-xl transition-all cursor-pointer"
                  >
                    <option value="">Selecione o novo consultor...</option>
                    {teamMembers
                      .filter(m => m.id !== bulkReassignConsultantSource.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nome} ({m.email})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl text-[11px] text-indigo-900 space-y-1">
                  <span className="font-bold block">
                    Divisão Automática entre os {teamMembers.filter(m => m.id !== bulkReassignConsultantSource.id).length} outros consultores:
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Cada consultor receberá aproximadamente{" "}
                    <strong>
                      {Math.ceil(
                        allParentDistributedLeads.filter(l => l.teamMemberId === bulkReassignConsultantSource.id && l.status !== "descartado").length /
                        Math.max(1, teamMembers.filter(m => m.id !== bulkReassignConsultantSource.id).length)
                      )} leads
                    </strong>{" "}
                    de forma balanceada.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkReassignConsultantSource(null)}
                disabled={bulkReassigningLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={(bulkReassignMode === "single" && !bulkReassignTargetId) || bulkReassigningLoading}
                onClick={handleBulkReassignConsultantLeads}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {bulkReassigningLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Redistribuindo Carteira...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {bulkReassignMode === "equal" ? "Confirmar Divisão Igualitária" : "Transferir Carteira Completa"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SOLICITAR COMISSÃO (SINCRONIZADO COM AS REGRAS DE SAQUE HUBLA) */}
      {showCommissionPayoutModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200/70">
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-base text-slate-800">
                    {payoutModalOrigin === "vendas" ? "Saque de Comissões de Vendas" : "Saque de Comissões de Serviços (Passo 6)"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {payoutModalOrigin === "vendas"
                      ? "Comissões de planos e vendas liberadas (Lastlink / Hubla)"
                      : "Comissão sobre serviços quitados do Passo 6"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCommissionPayoutModal(false);
                  setCommissionPayoutSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informative Hubla clearance notice */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono block">
                Regras de Liquidação da Plataforma de Pagamento (Hubla)
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-emerald-50 border border-emerald-200/70 p-2.5 rounded-xl">
                  <span className="font-extrabold text-emerald-900 block">Pagamentos PIX</span>
                  <span className="text-emerald-700 text-[10px]">Liberado em 48 horas úteis</span>
                </div>
                <div className="bg-blue-50 border border-blue-200/70 p-2.5 rounded-xl">
                  <span className="font-extrabold text-blue-900 block">Cartão de Crédito</span>
                  <span className="text-blue-700 text-[10px]">Liberado em 15 dias corridos</span>
                </div>
              </div>
            </div>

            {commissionPayoutSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{commissionPayoutSuccess}</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Nossa equipe financeira processará o repasse via PIX diretamente na chave informada. O valor já foi debitado do seu saldo disponível.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommissionPayoutModal(false);
                      setCommissionPayoutSuccess(null);
                    }}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Concluir e Fechar
                  </button>
                </div>
              </div>
            ) : (() => {
              // Calculate dynamically for modal based on partner level and team hierarchy
              let totalLiberada = 0;
              let totalPaga = 0;
              let totalCompensando = 0;
              const leadNomesLiberados: string[] = [];

              const partnerPlan = currentPartner?.plano || "";
              const isMasterUser = isFranquiaDigital(partnerPlan);
              const myDirectRate = getServiceCommissionRate(partnerPlan);

              leads.forEach((l) => {
                let rawServices: any[] = [];
                if (Array.isArray((l as any).subEtapasPasso6) && (l as any).subEtapasPasso6.length > 0) {
                  rawServices = (l as any).subEtapasPasso6;
                } else if (Array.isArray((l as any).servicosRecomendados) && (l as any).servicosRecomendados.length > 0) {
                  rawServices = (l as any).servicosRecomendados;
                } else if (Array.isArray((l as any).diagnosticoPROSFEC?.servicosRecomendados) && (l as any).diagnosticoPROSFEC.servicosRecomendados.length > 0) {
                  rawServices = (l as any).diagnosticoPROSFEC.servicosRecomendados;
                }

                const syncedServices = sanitizeAndSyncServicosList(rawServices, catalogServices);

                syncedServices.forEach((s: any) => {
                  const precoNum = typeof s.preco === "number" ? s.preco : typeof s.valor === "number" ? s.valor : parseFloat(s.preco || s.valor || 0) || 0;
                  const st = s.statusPagamento || (s.pago ? "pago" : s.status === "concluido" ? "pago" : "pendente");
                  if (st === "pago") {
                    const comissao = precoNum * myDirectRate;
                    totalPaga += comissao;
                    const metodo = s.formaPagamento || s.metodoPagamento || "PIX";
                    const isPix = metodo.toUpperCase().includes("PIX");
                    const daysToClear = isPix ? 2 : 15;
                    const dataPagamento = s.dataPagamento || l.dataCriacao || new Date().toISOString();
                    const paymentDate = new Date(dataPagamento);
                    const releaseDate = new Date(paymentDate.getTime() + daysToClear * 24 * 60 * 60 * 1000);
                    const isLiquidated = new Date() >= releaseDate;
                    if (isLiquidated) {
                      totalLiberada += comissao;
                      if (!leadNomesLiberados.includes(l.nomeEmpresa || l.nome || "Empresa")) {
                        leadNomesLiberados.push(l.nomeEmpresa || l.nome || "Empresa");
                      }
                    } else {
                      totalCompensando += comissao;
                    }
                  }
                });
              });

              // Master Partner: include team leads overrides
              if (isMasterUser && Array.isArray(teamLeads)) {
                teamLeads.forEach((l) => {
                  let rawServices: any[] = [];
                  if (Array.isArray((l as any).subEtapasPasso6) && (l as any).subEtapasPasso6.length > 0) {
                    rawServices = (l as any).subEtapasPasso6;
                  } else if (Array.isArray((l as any).servicosRecomendados) && (l as any).servicosRecomendados.length > 0) {
                    rawServices = (l as any).servicosRecomendados;
                  } else if (Array.isArray((l as any).diagnosticoPROSFEC?.servicosRecomendados) && (l as any).diagnosticoPROSFEC.servicosRecomendados.length > 0) {
                    rawServices = (l as any).diagnosticoPROSFEC.servicosRecomendados;
                  }

                  const member = teamMembers.find(m => m.id === l.parceiroId);
                  const consultantPlan = member?.plano || "Executive Partner PROSFEC";
                  const teamOverrideRate = getMasterTeamServiceOverrideRate(consultantPlan);

                  const syncedServices = sanitizeAndSyncServicosList(rawServices, catalogServices);

                  syncedServices.forEach((s: any) => {
                    const precoNum = typeof s.preco === "number" ? s.preco : typeof s.valor === "number" ? s.valor : parseFloat(s.preco || s.valor || 0) || 0;
                    const st = s.statusPagamento || (s.pago ? "pago" : s.status === "concluido" ? "pago" : "pendente");
                    if (st === "pago") {
                      const comissao = precoNum * teamOverrideRate;
                      totalPaga += comissao;
                      const metodo = s.formaPagamento || s.metodoPagamento || "PIX";
                      const isPix = metodo.toUpperCase().includes("PIX");
                      const daysToClear = isPix ? 2 : 15;
                      const dataPagamento = s.dataPagamento || l.dataCriacao || new Date().toISOString();
                      const paymentDate = new Date(dataPagamento);
                      const releaseDate = new Date(paymentDate.getTime() + daysToClear * 24 * 60 * 60 * 1000);
                      const isLiquidated = new Date() >= releaseDate;
                      if (isLiquidated) {
                        totalLiberada += comissao;
                        if (!leadNomesLiberados.includes(`[Equipe] ${l.nomeEmpresa || l.nome || "Empresa"}`)) {
                          leadNomesLiberados.push(`[Equipe] ${l.nomeEmpresa || l.nome || "Empresa"}`);
                        }
                      } else {
                        totalCompensando += comissao;
                      }
                    }
                  });
                });
              }

              const isVendas = payoutModalOrigin === "vendas";
              const origemAtual: "vendas" | "servicos" = isVendas ? "vendas" : "servicos";

              const totalSaquesJaRealizados = somaSaques(origemAtual, "pago");
              const totalSaquesEmAndamento = somaSaques(origemAtual, "pendente");

              const baseLiberada = isVendas ? salesCommissionStats.totalPaid : totalLiberada;
              const saldoLiquidoDisponivel = Math.max(0, baseLiberada - (totalSaquesJaRealizados + totalSaquesEmAndamento));
              const valorDigitado = parseFloat(payoutAmountCustom.replace(",", ".")) || 0;
              const isValorValido = valorDigitado > 0 && valorDigitado <= saldoLiquidoDisponivel;

              return (
                <div className="space-y-4">
                  {/* Saldo box */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wide block">
                        {isVendas ? "Saldo de Comissões de Vendas" : "Saldo de Comissões de Serviços (Passo 6)"}
                      </span>
                      <span className="text-xl font-black text-emerald-900 font-display">
                        {formatCurrencyBRL(saldoLiquidoDisponivel)}
                      </span>
                    </div>
                    <div className="text-right text-[10px] font-mono text-emerald-700 space-y-0.5">
                      <div>Total liberado: {formatCurrencyBRL(baseLiberada)}</div>
                      <div>Em análise/pagos: {formatCurrencyBRL(totalSaquesJaRealizados + totalSaquesEmAndamento)}</div>
                    </div>
                  </div>

                  {/* Valor input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                        Valor a Sacar (R$)
                      </label>
                      {saldoLiquidoDisponivel > 0 && (
                        <button
                          type="button"
                          onClick={() => setPayoutAmountCustom(saldoLiquidoDisponivel.toFixed(2))}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                        >
                          Sacar valor total ({formatCurrencyBRL(saldoLiquidoDisponivel)})
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max={saldoLiquidoDisponivel}
                        placeholder="0,00"
                        value={payoutAmountCustom}
                        onChange={(e) => setPayoutAmountCustom(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 font-mono font-bold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                      />
                    </div>
                    {valorDigitado > saldoLiquidoDisponivel && (
                      <span className="text-[10px] text-rose-600 font-semibold block">
                        O valor não pode ser superior ao saldo disponível de {formatCurrencyBRL(saldoLiquidoDisponivel)}.
                      </span>
                    )}
                  </div>

                  {/* PIX Key input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block">
                      Sua Chave PIX para Recebimento
                    </label>
                    <input
                      type="text"
                      placeholder="CPF, CNPJ, E-mail, Celular ou Chave Aleatória"
                      value={payoutPixKey}
                      onChange={(e) => setPayoutPixKey(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Parceiro: {currentPartner?.nome || "Parceiro"} • {currentPartner?.email}
                    </span>
                  </div>

                  <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCommissionPayoutModal(false)}
                      disabled={commissionPayoutSubmitting}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={commissionPayoutSubmitting || !payoutPixKey.trim() || !isValorValido}
                      onClick={async () => {
                        setCommissionPayoutSubmitting(true);
                        try {
                          await addDoc(collection(db, "solicitacoes_comissao"), {
                            partnerId: currentPartner?.id || "",
                            partnerNome: currentPartner?.nome || "Parceiro",
                            partnerEmail: currentPartner?.email || "",
                            partnerWhatsapp: currentPartner?.whatsapp || "",
                            partnerPlano: currentPartner?.plano || "Executive Partner PROSFEC",
                            chavePix: payoutPixKey.trim(),
                            valor: valorDigitado,
                            status: "pendente",
                            origem: origemAtual,
                            origemLabel: isVendas ? "Comissões de Vendas (Planos)" : "Comissões de Serviços (Passo 6)",
                            dataSolicitacao: new Date().toISOString(),
                            detalhes: isVendas
                              ? {
                                  saldoDisponivelMomento: saldoLiquidoDisponivel,
                                  comissaoTotalLiberada: salesCommissionStats.totalPaid,
                                  comissaoPendente: salesCommissionStats.totalPending,
                                  leadsEnvolvidos: salesCommissionStats.leadsPagos
                                }
                              : {
                                  saldoDisponivelMomento: saldoLiquidoDisponivel,
                                  comissaoTotalLiberada: totalLiberada,
                                  comissaoTotalPaga: totalPaga,
                                  comissaoAguardandoCompensacao: totalCompensando,
                                  leadsEnvolvidos: leadNomesLiberados
                                }
                          });

                          setCommissionPayoutSuccess(`Solicitação de saque de ${formatCurrencyBRL(valorDigitado)} (${isVendas ? "Comissões de Vendas" : "Serviços Passo 6"}) enviada com sucesso! O repasse será feito via Pix.`);
                        } catch (err) {
                          console.error("Erro ao solicitar comissao:", err);
                          alert("Ocorreu um erro ao registrar sua solicitação no Firestore. Tente novamente.");
                        } finally {
                          setCommissionPayoutSubmitting(false);
                        }
                      }}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      {commissionPayoutSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando solicitação...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span>Confirmar Solicitação de Saque</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de Recarga de Saldo Geral (Passo 1: Valor -> Passo 2: Pix & Confirmação) */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-br from-slate-50 to-emerald-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0A3D2E] text-white flex items-center justify-center shadow-md shrink-0">
                  <Coins className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    {rechargeNotifySuccess
                      ? "Notificação Registrada"
                      : rechargeStep === 1
                      ? "Adicionar Saldo Geral"
                      : "Pagamento via Pix"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {rechargeNotifySuccess
                      ? "Comprovante enviado para liberação"
                      : rechargeStep === 1
                      ? "Válido para Consultas de Crédito e Serviços Contábeis"
                      : "Transfira o valor exato para ativar seu saldo"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRechargeModal(false);
                  setRechargeNotifySuccess(false);
                  setRechargeStep(1);
                  setRechargeCopiedPix(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {rechargeNotifySuccess ? (
                /* Success View */
                <div className="text-center space-y-4 py-2">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl font-extrabold shadow-inner">
                    ✓
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-black text-slate-900 text-base">
                      Notificação de Depósito Enviada!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      Sua solicitação de recarga de{" "}
                      <strong className="font-mono font-bold text-slate-900">
                        {formatCurrencyBRL(rechargeAmount)}
                      </strong>{" "}
                      foi registrada com sucesso. Nosso financeiro analisará o Pix recebido na chave{" "}
                      <strong className="text-emerald-800 font-mono font-bold">
                        prosfec.tesouraria@gmail.com
                      </strong>{" "}
                      e liberará seu Saldo Geral em instantes!
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl text-[11px] text-emerald-900 leading-relaxed flex items-center gap-2 text-left">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      O saldo é unificado e pode ser utilizado em Consultas SPC/Serasa e em Serviços Contábeis.
                    </span>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRechargeModal(false);
                        setRechargeNotifySuccess(false);
                        setRechargeStep(1);
                        setRechargeAmount(140);
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#00A86B] hover:bg-[#008F5A] active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Concluir e Fechar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRechargeNotifySuccess(false);
                        setRechargeStep(1);
                        setRechargeAmount(140);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Fazer Outra Notificação
                    </button>
                  </div>
                </div>
              ) : rechargeStep === 1 ? (
                /* Step 1: Escolha do Valor */
                <div className="space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="text-[#00A86B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      Passo 1 de 2: Definir Valor
                    </span>
                    <span>Mínimo: R$ 140,00</span>
                  </div>

                  {/* Preset Values Helper */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block">
                      Valores Rápidos de Recarga
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[140, 200, 300, 500].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRechargeAmount(val)}
                          className={`py-2.5 px-1 text-center font-extrabold text-xs rounded-xl border transition-all cursor-pointer ${
                            rechargeAmount === val
                              ? "bg-[#0A3D2E] text-white border-[#0A3D2E] shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          R$ {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Value Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block">
                      Valor Personalizado da Recarga (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-extrabold text-sm">
                        R$
                      </span>
                      <input
                        type="number"
                        min="140"
                        step="1"
                        value={rechargeAmount || ""}
                        onChange={(e) => setRechargeAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                        placeholder="140,00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-3.5 py-3 text-sm text-slate-900 font-mono font-extrabold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                      />
                    </div>

                    {/* Dynamic validation message */}
                    {(!rechargeAmount || rechargeAmount < 140) ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-xl mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>O valor mínimo para recarga é de R$ 140,00.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-xl mt-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span>Valor válido para recarga de saldo.</span>
                      </div>
                    )}
                  </div>

                  {/* Information block */}
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Como funciona a liberação?
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Após definir o valor, você visualizará a chave Pix para realizar a transferência. O saldo será creditado automaticamente assim que a equipe financeira confirmar o recebimento.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowRechargeModal(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!rechargeAmount || rechargeAmount < 140}
                      onClick={() => setRechargeStep(2)}
                      className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#008F5A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Continuar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Chave Pix & Confirmação */
                <div className="space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="text-[#00A86B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      Passo 2 de 2: Pagamento Pix & Confirmação
                    </span>
                    <button
                      type="button"
                      onClick={() => setRechargeStep(1)}
                      className="text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Alterar valor</span>
                    </button>
                  </div>

                  {/* Highlighted Value Card */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                        Valor a Transferir
                      </span>
                      <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#0A3D2E] block mt-0.5">
                        {formatCurrencyBRL(rechargeAmount)}
                      </span>
                    </div>
                    <div className="bg-white/80 border border-emerald-100 px-3 py-1.5 rounded-xl text-center shrink-0">
                      <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">
                        Tipo
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-800 font-mono">
                        Pix Direto
                      </span>
                    </div>
                  </div>

                  {/* Pix Key Card */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block">
                      Chave Pix da Tesouraria (E-mail)
                    </label>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-2.5">
                      <span className="font-mono text-xs sm:text-sm text-slate-800 font-bold select-all truncate">
                        prosfec.tesouraria@gmail.com
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("prosfec.tesouraria@gmail.com");
                          setRechargeCopiedPix(true);
                          setTimeout(() => setRechargeCopiedPix(false), 3000);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${
                          rechargeCopiedPix
                            ? "bg-emerald-600 text-white"
                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                        title="Copiar chave Pix"
                      >
                        {rechargeCopiedPix ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copiar Chave</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Instruction text */}
                  <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl text-xs text-blue-950 leading-relaxed space-y-1">
                    <p className="font-medium">
                      Faça o Pix de <strong className="font-bold font-mono">{formatCurrencyBRL(rechargeAmount)}</strong> para a chave acima e confirme abaixo.
                    </p>
                    <p className="text-[11px] text-blue-800/80">
                      Seu saldo será liberado após a confirmação do pagamento pela equipe Prosfec.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setRechargeStep(1)}
                      disabled={notifyingRecharge}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="button"
                      disabled={notifyingRecharge || !rechargeAmount || rechargeAmount < 140}
                      onClick={() => handleNotifyCreditRecharge(rechargeAmount)}
                      className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#008F5A] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      {notifyingRecharge ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Confirmando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmar Pagamento Realizado</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Recarga do Caça-Leads (Passo 1: Pacote -> Passo 2: Pix & Confirmação) */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-br from-slate-50 to-emerald-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0A3D2E] text-white flex items-center justify-center shadow-md shrink-0">
                  <Coins className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    {refillNotifySuccess
                      ? "Notificação Registrada"
                      : refillStep === 1
                      ? "Adicionar Recarga Caça-Leads"
                      : "Pagamento via Pix"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {refillNotifySuccess
                      ? "Comprovante enviado para liberação"
                      : refillStep === 1
                      ? "Escolha o pacote de buscas em tempo real"
                      : "Transfira o valor exato para ativar suas buscas"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRefillModal(false);
                  setRefillNotifySuccess(false);
                  setRefillStep(1);
                  setRefillCopiedPix(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {refillNotifySuccess ? (
                /* Success View */
                <div className="text-center space-y-4 py-2">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl font-extrabold shadow-inner">
                    ✓
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-black text-slate-900 text-base">
                      Notificação de Recarga Enviada!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      Sua solicitação de recarga do{" "}
                      <strong className="text-slate-900 font-bold">
                        Pacote {refillPackage} ({
                          refillPackage === "Bronze" ? "10 buscas" : refillPackage === "Prata" ? "30 buscas" : "60 buscas"
                        })
                      </strong>{" "}
                      no valor de{" "}
                      <strong className="font-mono font-bold text-slate-900">
                        {formatCurrencyBRL(
                          refillPackage === "Bronze" ? 59.90 : refillPackage === "Prata" ? 129.90 : 239.90
                        )}
                      </strong>{" "}
                      foi registrada com sucesso. Nosso financeiro analisará o Pix recebido na chave{" "}
                      <strong className="text-emerald-800 font-mono font-bold">
                        prosfec.tesouraria@gmail.com
                      </strong>{" "}
                      e liberará seu saldo de buscas em instantes!
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl text-[11px] text-emerald-900 leading-relaxed flex items-center gap-2 text-left">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Você pode acompanhar o status desta solicitação a qualquer momento no histórico da aba Caça-Leads.
                    </span>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRefillModal(false);
                        setRefillNotifySuccess(false);
                        setRefillStep(1);
                        setRefillCopiedPix(false);
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#00A86B] hover:bg-[#008F5A] active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Concluir e Fechar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRefillNotifySuccess(false);
                        setRefillStep(1);
                        setRefillCopiedPix(false);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Fazer Outra Recarga
                    </button>
                  </div>
                </div>
              ) : refillStep === 1 ? (
                /* Step 1: Escolha do Pacote */
                <div className="space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="text-[#00A86B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      Passo 1 de 2: Escolher Pacote
                    </span>
                    <span className="text-slate-400">Créditos sem data de expiração</span>
                  </div>

                  {/* Packages Grid */}
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block">
                      Selecione o Pacote de Buscas
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        {
                          id: "Bronze" as const,
                          name: "Pacote Bronze",
                          buscas: 10,
                          leadsAprox: "Até 200 empresas/sócios",
                          valor: 59.90,
                          unitPrice: "R$ 5,99 / busca",
                          badge: null,
                        },
                        {
                          id: "Prata" as const,
                          name: "Pacote Prata",
                          buscas: 30,
                          leadsAprox: "Até 600 empresas/sócios",
                          valor: 129.90,
                          unitPrice: "R$ 4,33 / busca",
                          badge: "Mais Escolhido • Economia de 28%",
                        },
                        {
                          id: "Ouro" as const,
                          name: "Pacote Ouro",
                          buscas: 60,
                          leadsAprox: "Até 1.200 empresas/sócios",
                          valor: 239.90,
                          unitPrice: "R$ 3,99 / busca",
                          badge: "Super Econômico • Economia de 33%",
                        }
                      ].map((pkg) => {
                        const isSelected = refillPackage === pkg.id;
                        return (
                          <div
                            key={pkg.id}
                            onClick={() => setRefillPackage(pkg.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600 shadow-sm"
                                : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "border-emerald-600 bg-emerald-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-sm text-slate-900">{pkg.name}</span>
                                    {pkg.badge && (
                                      <span className="text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                                        {pkg.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                                    <span className="font-bold text-slate-700">{pkg.buscas} buscas em tempo real</span>
                                    <span>•</span>
                                    <span>{pkg.leadsAprox}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono font-black text-sm sm:text-base text-emerald-900">
                                  {formatCurrencyBRL(pkg.valor)}
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  {pkg.unitPrice}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Information block */}
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Como funciona o Caça-Leads?
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cada busca varre em tempo real a base nacional de empresas e retorna até 20 estabelecimentos com telefones, e-mails, endereço e quadro societário (QSA). Os créditos de busca não expiram.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowRefillModal(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefillStep(2)}
                      className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#008F5A] text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Continuar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Chave Pix & Confirmação */
                <div className="space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="text-[#00A86B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      Passo 2 de 2: Pagamento Pix & Confirmação
                    </span>
                    <button
                      type="button"
                      onClick={() => setRefillStep(1)}
                      className="text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Alterar pacote</span>
                    </button>
                  </div>

                  {/* Highlighted Package & Value Card */}
                  {(() => {
                    const currentPack = {
                      Bronze: { buscas: 10, valor: 59.90, leads: 200 },
                      Prata: { buscas: 30, valor: 129.90, leads: 600 },
                      Ouro: { buscas: 60, valor: 239.90, leads: 1200 }
                    }[refillPackage];

                    return (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                            Pacote {refillPackage} • {currentPack.buscas} Buscas ({currentPack.leads} Leads)
                          </span>
                          <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#0A3D2E] block mt-0.5">
                            {formatCurrencyBRL(currentPack.valor)}
                          </span>
                        </div>
                        <div className="bg-white/80 border border-emerald-100 px-3 py-1.5 rounded-xl text-center shrink-0">
                          <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">
                            Tipo
                          </span>
                          <span className="text-xs font-black text-slate-900 block">
                            Caça-Leads
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pix Key Card */}
                  <div className="bg-slate-50 border border-slate-200/90 p-4 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        Chave Pix da Tesouraria (E-mail)
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Banco do Brasil</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-bold text-xs text-slate-800 select-all truncate">
                        prosfec.tesouraria@gmail.com
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("prosfec.tesouraria@gmail.com");
                          setRefillCopiedPix(true);
                          setTimeout(() => setRefillCopiedPix(false), 2500);
                        }}
                        className={`px-3.5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                          refillCopiedPix
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        {refillCopiedPix ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Instructions Box */}
                  <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl text-[11px] text-blue-900 leading-relaxed space-y-1">
                    <div className="font-extrabold flex items-center gap-1 text-blue-950">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Instruções para liberação imediata:</span>
                    </div>
                    <p className="pl-4.5 text-blue-800/90">
                      Faça o Pix de <strong className="font-bold font-mono">
                        {formatCurrencyBRL(
                          refillPackage === "Bronze" ? 59.90 : refillPackage === "Prata" ? 129.90 : 239.90
                        )}
                      </strong> para a chave acima e clique em confirmar abaixo. As buscas serão liberadas automaticamente assim que o financeiro registrar a transferência.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setRefillStep(1)}
                      disabled={refillSubmitting}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="button"
                      disabled={refillSubmitting}
                      onClick={handleNotifyCacaLeadsRefill}
                      className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#008F5A] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      {refillSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Confirmando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmar Pagamento Realizado</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
