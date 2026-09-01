// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  getDocs, 
  query, 
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { ServicoContabilidade, Partner, PedidoServicoContabilidade } from "../types";
import { 
  Calculator, 
  Search, 
  Clock, 
  Lightbulb, 
  ShoppingCart, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Wallet, 
  X, 
  Layers, 
  Info,
  Sparkles,
  ArrowRight,
  ClipboardList,
  Calendar,
  Building2,
  FileText,
  ExternalLink,
  MessageSquare,
  Eye
} from "lucide-react";
import { formatCurrencyBRL } from "../utils";

interface PartnerServicosContabilidadeTabProps {
  currentPartner: Partner | null;
  onNavigateToLeads?: () => void;
  onNavigateToRecarga?: () => void;
}

export default function PartnerServicosContabilidadeTab({
  currentPartner,
  onNavigateToLeads,
  onNavigateToRecarga
}: PartnerServicosContabilidadeTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"catalogo" | "meus_pedidos">("catalogo");
  const [servicos, setServicos] = useState<ServicoContabilidade[]>([]);
  const [myPedidos, setMyPedidos] = useState<PedidoServicoContabilidade[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState<boolean>(false);
  const [selectedPedidoDetails, setSelectedPedidoDetails] = useState<PedidoServicoContabilidade | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("todos");
  
  // Modal de Solicitação
  const [selectedServicoForRequest, setSelectedServicoForRequest] = useState<ServicoContabilidade | null>(null);
  const [requestConfirmed, setRequestConfirmed] = useState<boolean>(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [clienteNome, setClienteNome] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState<boolean>(false);
  const [requestSuccessData, setRequestSuccessData] = useState<{
    pedidoId: string;
    precoDebitado: number;
    newBalance: number;
    nomeServico: string;
  } | null>(null);

  // Pedidos deste parceiro: consulta estática (sem listener em tempo real)
  const [pedidosUpdatedAt, setPedidosUpdatedAt] = useState<Date | null>(null);

  const fetchMyPedidos = async () => {
    if (!currentPartner?.id) return;
    setLoadingPedidos(true);
    try {
      const pedidosRef = collection(db, "pedidos_servicos_contabilidade");
      const q = query(pedidosRef, where("parceiroId", "==", currentPartner.id));
      const snap = await getDocs(q);
      const list: PedidoServicoContabilidade[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PedidoServicoContabilidade);
      });
      list.sort((a, b) => new Date(b.dataSolicitacao || 0).getTime() - new Date(a.dataSolicitacao || 0).getTime());
      setMyPedidos(list);
      setPedidosUpdatedAt(new Date());
    } catch (err) {
      console.warn("Erro ao carregar pedidos do parceiro:", err);
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    fetchMyPedidos();
  }, [currentPartner?.id]);

  // Busca apenas serviços ativos do Firestore (com cache de sessão de 15 minutos)
  const fetchServicosAtivos = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = sessionStorage.getItem("cached_servicos_contabilidade_ativos");
        const cachedTime = sessionStorage.getItem("cached_servicos_contabilidade_ativos_time");
        if (cached && cachedTime && Date.now() - parseInt(cachedTime, 10) < 1000 * 60 * 15) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setServicos(parsed);
              setLoading(false);
              return;
            }
          } catch {}
        }
      }

      setLoading(true);
      setError(null);
      const servicosRef = collection(db, "servicos_contabilidade");
      // Consulta serviços ativos
      const q = query(servicosRef, where("ativo", "==", true));
      const snapshot = await getDocs(q);

      const items: ServicoContabilidade[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data.ativo !== false) {
          items.push({ id: d.id, ...data });
        }
      });

      // Ordenar por categoriaOrdem e ordem
      items.sort((a, b) => {
        const catA = a.categoriaOrdem ?? 99;
        const catB = b.categoriaOrdem ?? 99;
        if (catA !== catB) return catA - catB;
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      });

      setServicos(items);
      try {
        sessionStorage.setItem("cached_servicos_contabilidade_ativos", JSON.stringify(items));
        sessionStorage.setItem("cached_servicos_contabilidade_ativos_time", String(Date.now()));
      } catch {}
    } catch (err: any) {
      console.error("Erro ao carregar serviços de contabilidade no Portal do Parceiro:", err);
      setError("Não foi possível carregar os serviços de contabilidade. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicosAtivos();
  }, []);

  // Extrair categorias únicas ordenadas
  const categoriasList = useMemo(() => {
    const catsMap = new Map<string, number>();
    servicos.forEach((s) => {
      if (!catsMap.has(s.categoria)) {
        catsMap.set(s.categoria, s.categoriaOrdem ?? 99);
      }
    });

    const uniqueCats = Array.from(catsMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([cat]) => cat);

    return uniqueCats;
  }, [servicos]);

  // Filtragem dos serviços por categoria e termo de busca
  const filteredServicos = useMemo(() => {
    return servicos.filter((s) => {
      const matchesCategoria = selectedCategoria === "todos" || s.categoria === selectedCategoria;
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = 
        !search || 
        s.nome.toLowerCase().includes(search) || 
        s.descricao.toLowerCase().includes(search) || 
        s.categoria.toLowerCase().includes(search) ||
        (s.dica && s.dica.toLowerCase().includes(search));

      return matchesCategoria && matchesSearch;
    });
  }, [servicos, selectedCategoria, searchTerm]);

  // Agrupamento por Categoria para renderizar seções
  const groupedByCategoria = useMemo(() => {
    const map = new Map<string, ServicoContabilidade[]>();

    // Inicializar categorias na ordem correta
    categoriasList.forEach((cat) => {
      map.set(cat, []);
    });

    // Distribuir serviços filtrados
    filteredServicos.forEach((s) => {
      if (!map.has(s.categoria)) {
        map.set(s.categoria, []);
      }
      map.get(s.categoria)!.push(s);
    });

    // Retorna apenas categorias que têm serviços após a filtragem
    const result: { categoria: string; servicos: ServicoContabilidade[] }[] = [];
    map.forEach((servicosList, categoria) => {
      if (servicosList.length > 0) {
        result.push({ categoria, servicos: servicosList });
      }
    });

    return result;
  }, [filteredServicos, categoriasList]);

  // Contagem de serviços por categoria
  const getCategoryCount = (catName: string) => {
    if (catName === "todos") return servicos.length;
    return servicos.filter((s) => s.categoria === catName).length;
  };

  const handleOpenRequestModal = (servico: ServicoContabilidade) => {
    setSelectedServicoForRequest(servico);
    setRequestConfirmed(false);
    setRequestError(null);
    setIsInsufficientBalance(false);
    setRequestSuccessData(null);
    setClienteNome("");
    setObservacoes("");
  };

  const handleCloseRequestModal = () => {
    setSelectedServicoForRequest(null);
    setRequestConfirmed(false);
    setIsSubmittingRequest(false);
    setRequestError(null);
    setIsInsufficientBalance(false);
    setRequestSuccessData(null);
    setClienteNome("");
    setObservacoes("");
  };

  const handleConfirmRequest = async () => {
    if (!selectedServicoForRequest || !currentPartner?.id) {
      setRequestError("Não foi possível identificar o parceiro ou serviço selecionado.");
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError(null);
    setIsInsufficientBalance(false);

    try {
      let response: Response;
      try {
        response = await fetch("/api/contabilidade/solicitar-servico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parceiroId: currentPartner.id,
            servicoId: selectedServicoForRequest.id,
            clienteNome: clienteNome.trim(),
            observacoes: observacoes.trim(),
          }),
        });
      } catch (networkErr) {
        response = await fetch("/.netlify/functions/solicitar-servico-contabilidade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parceiroId: currentPartner.id,
            servicoId: selectedServicoForRequest.id,
            clienteNome: clienteNome.trim(),
            observacoes: observacoes.trim(),
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setIsInsufficientBalance(!!data.isInsufficientBalance);
        throw new Error(data.error || "Erro ao solicitar o serviço contábil.");
      }

      setRequestSuccessData({
        pedidoId: data.pedidoId,
        precoDebitado: data.precoDebitado,
        newBalance: data.newBalance,
        nomeServico: data.nomeServico,
      });

      // Atualiza o saldo local no objeto do parceiro se aplicável
      if (currentPartner && data.newBalance !== undefined) {
        (currentPartner as any).saldoGeral = data.newBalance;
      }

      setRequestConfirmed(true);
    } catch (err: any) {
      console.error("Erro ao solicitar serviço de contabilidade:", err);
      setRequestError(err.message || "Falha ao processar solicitação.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* Header Banner da Aba */}
      <div className="bg-gradient-to-br from-[#0A3D2E] via-[#064E3B] to-[#047857] text-white p-5 sm:p-6 rounded-3xl border border-emerald-500/20 shadow-xs relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-400/10 pointer-events-none blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              <Calculator className="w-3.5 h-3.5 text-emerald-300" />
              <span>Portfólio de Soluções Contábeis & Fiscais</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
              Serviços de Contabilidade
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              Consulte nosso catálogo completo de soluções contábeis, regularizações cadastrais, certidões e alterações contratuais para impulsionar a aprovação de crédito de seus clientes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchServicosAtivos}
              disabled={loading}
              className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              title="Atualizar lista de serviços"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${loading ? "animate-spin" : ""}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Catálogo vs Minhas Solicitações */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("catalogo")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "catalogo"
              ? "bg-[#00A86B] text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Catálogo de Soluções (33)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("meus_pedidos")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "meus_pedidos"
              ? "bg-[#00A86B] text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Minhas Solicitações Contábeis</span>
          {myPedidos.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeSubTab === "meus_pedidos" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
            }`}>
              {myPedidos.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === "meus_pedidos" ? (
        /* ABA DE MINHAS SOLICITAÇÕES */
        <div className="space-y-4">
          <div className="bg-white/75 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#00A86B]" />
                Acompanhamento de Serviços Contábeis Solicitados
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Consulte o status da execução, relatórios, pareceres técnicos e baixe os documentos gerados pela equipe contábil.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pedidosUpdatedAt && (
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap hidden sm:inline">
                  Atualizado às {pedidosUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                type="button"
                onClick={fetchMyPedidos}
                disabled={loadingPedidos}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="Recarregar meus pedidos"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingPedidos ? "animate-spin" : ""}`} />
                <span>Atualizar dados</span>
              </button>
            </div>
          </div>

          {loadingPedidos ? (
            <div className="bg-white/75 backdrop-blur-xl p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#00A86B] animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Buscando suas solicitações contábeis...</p>
            </div>
          ) : myPedidos.length === 0 ? (
            <div className="bg-white/75 backdrop-blur-xl p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-black text-slate-700">Você ainda não solicitou nenhum serviço avulso</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore o catálogo de serviços contábeis e contrate alterações contratuais, certidões ou regularizações debitando diretamente do seu saldo.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab("catalogo")}
                className="mt-2 px-4 py-2 bg-[#00A86B] text-white rounded-xl text-xs font-black hover:bg-[#008f5b] transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Ver Catálogo de Serviços</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPedidos.map((ped) => {
                const isConcluido = ped.status === "concluido";
                const isEmAndamento = ped.status === "em_andamento";
                const isSolicitado = ped.status === "solicitado";

                return (
                  <div
                    key={ped.id}
                    className="bg-white/75 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/90 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Status & Data */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <span className="text-[11px] font-mono text-slate-400">
                          #{ped.id?.slice(0, 8)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isConcluido ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Concluído & Entregue
                            </span>
                          ) : isEmAndamento ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              <Clock className="w-3 h-3 text-blue-600 animate-spin" />
                              Em Execução
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Solicitado / Na Fila
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nome do Serviço & Categoria */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {ped.categoria || "Contabilidade"}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 mt-0.5">
                          {ped.nomeServico}
                        </h4>
                      </div>

                      {/* Cliente e Valor */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Cliente / Empresa:</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {ped.clienteNome || "Não informado"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Valor Pago:</span>
                          <span className="font-mono font-black text-[#00A86B] block">
                            {formatCurrencyBRL(ped.precoNoMomento || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Parecer do Contador e Documento Concluído */}
                      {ped.parecerContador && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl space-y-1 text-xs text-emerald-950">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            Parecer da Equipe Contábil:
                          </span>
                          <p className="font-medium text-[11px] leading-relaxed">
                            {ped.parecerContador}
                          </p>
                        </div>
                      )}

                      {/* Link de Download do Documento */}
                      {ped.linkDocumento && (
                        <div className="pt-1">
                          <a
                            href={ped.linkDocumento}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Baixar Documento / Certidão Emitida</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ped.dataSolicitacao).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {ped.responsavelNome && (
                        <span className="font-medium text-slate-500">
                          Resp: {ped.responsavelNome}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ABA DO CATÁLOGO */
        <div className="space-y-6">
      {/* Barra de Filtro de Categorias (Pills Horizontais Roláveis) e Busca */}
      <div className="bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-4">
        {/* Barra de Busca Rápida */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar serviço por nome, descrição, categoria ou palavra-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white/75 backdrop-blur-xl focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 shrink-0 px-1">
            <span>
              {loading ? "Carregando..." : `${filteredServicos.length} ${filteredServicos.length === 1 ? "serviço disponível" : "serviços disponíveis"}`}
            </span>
          </div>
        </div>

        {/* Barra de Pills Horizontais Roláveis (13 Categorias + Todos = 14 Pills) */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Filtrar por Categoria
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-200">
            {/* Pill 'Todos' */}
            <button
              type="button"
              onClick={() => setSelectedCategoria("todos")}
              className={`px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedCategoria === "todos"
                  ? "bg-[#00A86B] text-white shadow-xs font-extrabold border border-[#00A86B]"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold"
              }`}
            >
              <span>Todos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                selectedCategoria === "todos" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {servicos.length}
              </span>
            </button>

            {/* Pills de cada Categoria */}
            {categoriasList.map((cat) => {
              const isSelected = selectedCategoria === cat;
              const count = getCategoryCount(cat);

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoria(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-[#00A86B] text-white shadow-xs font-extrabold border border-[#00A86B]"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Estado de Erro */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-rose-900">Erro ao carregar serviços</h4>
            <p className="text-xs text-rose-700">{error}</p>
            <button
              onClick={fetchServicosAtivos}
              className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Estado de Carregamento (Skeletons) */}
      {loading && !error && (
        <div className="space-y-8">
          {[1, 2].map((section) => (
            <div key={section} className="space-y-4">
              {/* Header Skeleton */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-48 bg-slate-200/80 rounded-lg animate-pulse" />
                <div className="h-5 w-10 bg-slate-200/80 rounded-full animate-pulse" />
              </div>
              {/* Grid 2 colunas de Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {[1, 2].map((card) => (
                  <div 
                    key={card} 
                    className="bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-5 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-4 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-5 bg-slate-200 rounded w-2/3" />
                      <div className="h-5 bg-slate-200 rounded-full w-20" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-slate-100 rounded w-full" />
                      <div className="h-3.5 bg-slate-100 rounded w-4/5" />
                    </div>
                    <div className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
                    <div className="h-16 bg-blue-50/50 rounded-xl border border-blue-100" />
                    <div className="h-10 bg-slate-200 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado Vazio (Nenhum serviço encontrado) */}
      {!loading && !error && groupedByCategoria.length === 0 && (
        <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 bg-emerald-50 text-[#00A86B] border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Calculator className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display font-extrabold text-base text-slate-800">
              Nenhum serviço encontrado
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {searchTerm 
                ? `Não encontramos nenhum serviço ativo correspondente à busca "${searchTerm}".`
                : selectedCategoria !== "todos"
                ? `Não há serviços ativos no momento para a categoria "${selectedCategoria}".`
                : "Nenhum serviço contábil ativo cadastrado no catálogo."}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategoria("todos");
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpar Filtros e Ver Todos
            </button>
          </div>
        </div>
      )}

      {/* Grid de Seções de Categorias e Cards de Serviços */}
      {!loading && !error && groupedByCategoria.length > 0 && (
        <div className="space-y-8">
          {groupedByCategoria.map(({ categoria, servicos: categoryServicos }) => (
            <div key={categoria} className="space-y-4">
              {/* Cabeçalho da Seção com Nome da Categoria e Badge de Contagem */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-5 bg-[#00A86B] rounded-full" />
                  <h3 className="font-display font-black text-base sm:text-lg text-slate-900 tracking-tight">
                    {categoria}
                  </h3>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                    {categoryServicos.length} {categoryServicos.length === 1 ? "serviço" : "serviços"}
                  </span>
                </div>
              </div>

              {/* Grid Responsivo: 1 coluna em mobile, 2 colunas em desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {categoryServicos.map((servico) => {
                  const precoFormatado = servico.preco && servico.preco > 0 
                    ? formatCurrencyBRL(servico.preco) 
                    : "Sob Consulta";

                  return (
                    <div
                      key={servico.id}
                      className="bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/90 p-5 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      {/* Top: Nome e Badge da Categoria */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-950 transition-colors leading-snug">
                            {servico.nome}
                          </h4>
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                            {servico.categoria}
                          </span>
                        </div>

                        {/* Descrição Curta */}
                        <p className="text-xs text-slate-600 leading-relaxed font-normal">
                          {servico.descricao}
                        </p>
                      </div>

                      {/* Linha com Preço e Prazo */}
                      <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50/80 rounded-xl border border-slate-100 items-center">
                        {/* Preço */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 tracking-wider">
                            <Wallet className="w-3 h-3 text-[#00A86B]" />
                            Investimento
                          </span>
                          <span className="font-mono font-extrabold text-sm sm:text-base text-[#00A86B] block">
                            {precoFormatado}
                          </span>
                        </div>

                        {/* Prazo (Cor semântica pendente #D97706) */}
                        <div className="space-y-0.5 text-right sm:text-left">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-end sm:justify-start gap-1 tracking-wider">
                            <Clock className="w-3 h-3 text-[#D97706]" />
                            Prazo Médio
                          </span>
                          <span className="font-mono font-bold text-xs sm:text-sm text-[#D97706] block">
                            {servico.prazo || "Sob Consulta"}
                          </span>
                        </div>
                      </div>

                      {/* Box Dica do Contador */}
                      {servico.dica && (
                        <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 sm:p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
                            <Lightbulb className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Dica do Contador</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-normal">
                            {servico.dica}
                          </p>
                        </div>
                      )}

                      {/* Botão Solicitar Full-Width no Rodapé */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(servico)}
                          className="w-full py-2.5 sm:py-3 px-4 bg-[#00A86B] hover:bg-[#008f5b] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShoppingCart className="w-4 h-4 text-white" />
                          <span>Solicitar Serviço</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE SOLICITAÇÃO */}
      {selectedServicoForRequest && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            {!requestConfirmed ? (
              <>
                {/* Header do Modal */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 text-emerald-800">
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/70">
                      <ShoppingCart className="w-5 h-5 text-[#00A86B]" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-slate-900">
                        Confirmar e Contratar Serviço
                      </h4>
                      <p className="text-[11px] text-slate-400">Débito direto do Saldo Geral da sua conta</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseRequestModal}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Resumo do Serviço */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {selectedServicoForRequest.categoria}
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 mt-0.5">
                      {selectedServicoForRequest.nome}
                    </h5>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedServicoForRequest.descricao}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Investimento</span>
                      <span className="font-mono font-extrabold text-sm text-[#00A86B]">
                        {selectedServicoForRequest.preco && selectedServicoForRequest.preco > 0 
                          ? formatCurrencyBRL(selectedServicoForRequest.preco) 
                          : "Sob Consulta"}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Prazo Estimado</span>
                      <span className="font-mono font-bold text-xs text-[#D97706]">
                        {selectedServicoForRequest.prazo || "Sob Consulta"}
                      </span>
                    </div>
                  </div>

                  {selectedServicoForRequest.dica && (
                    <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-[11px] text-slate-700 leading-relaxed">
                      <strong className="text-blue-700 block mb-0.5 font-bold uppercase text-[9px] tracking-wider">
                        💡 Recomendação:
                      </strong>
                      {selectedServicoForRequest.dica}
                    </div>
                  )}
                </div>

                {/* Status do Saldo Geral do Parceiro */}
                {(() => {
                  const saldoAtual = Number(currentPartner?.saldoGeral || 0);
                  const preco = Number(selectedServicoForRequest.preco || 0);
                  const temSaldoSuficiente = saldoAtual >= preco;
                  const saldoRestante = Number((saldoAtual - preco).toFixed(2));

                  return (
                    <div className={`p-3.5 rounded-2xl border ${temSaldoSuficiente ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" : "bg-amber-50/70 border-amber-200 text-amber-950"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className={`w-4 h-4 ${temSaldoSuficiente ? "text-emerald-700" : "text-amber-700"}`} />
                          <span className="text-xs font-bold">Seu Saldo Geral Atual:</span>
                        </div>
                        <span className="font-mono font-extrabold text-sm">
                          {formatCurrencyBRL(saldoAtual)}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">Saldo após contratação:</span>
                        <span className={`font-mono font-bold ${temSaldoSuficiente ? "text-emerald-800" : "text-rose-600"}`}>
                          {temSaldoSuficiente ? formatCurrencyBRL(saldoRestante) : "Saldo insuficiente"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Formulário Complementar Opcional */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome do Cliente / Razão Social <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Auto Posto Estrela Ltda"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      disabled={isSubmittingRequest}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white/75 backdrop-blur-xl focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Observações ou Instruções para a Contabilidade <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Solicitação urgente para emissão de certidão de débitos estaduais..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      disabled={isSubmittingRequest}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white/75 backdrop-blur-xl focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Exibição de Erro / Saldo Insuficiente */}
                {requestError && (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">{requestError}</p>
                    </div>
                    {isInsufficientBalance && onNavigateToRecarga && (
                      <div className="pt-2 border-t border-rose-200/70 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseRequestModal();
                            onNavigateToRecarga();
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Fazer Recarga via Pix</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseRequestModal}
                    disabled={isSubmittingRequest}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRequest}
                    disabled={isSubmittingRequest}
                    className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#008f5b] active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingRequest ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Debitando e Criando Pedido...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {selectedServicoForRequest.preco && selectedServicoForRequest.preco > 0
                            ? `Confirmar e Debitar ${formatCurrencyBRL(selectedServicoForRequest.preco)}`
                            : "Confirmar Solicitação"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Sucesso da Solicitação */
              <div className="py-4 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-[#00A86B] border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-display font-black text-lg text-slate-900">
                    Solicitação e Débito Confirmados!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    Seu pedido para <strong>{requestSuccessData?.nomeServico || selectedServicoForRequest.nome}</strong> foi criado e registrado com sucesso. Nossa equipe contábil iniciará o processamento.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-[11px] text-slate-600 text-left space-y-2">
                  {requestSuccessData?.pedidoId && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                      <span className="font-semibold text-slate-600">Protocolo do Pedido:</span>
                      <span className="font-mono font-bold text-xs text-slate-800 bg-white/75 backdrop-blur-xl px-2 py-0.5 rounded-lg border border-slate-200">
                        #{requestSuccessData.pedidoId.slice(0, 10)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Parceiro:</span>
                    <span className="font-bold text-slate-800">{currentPartner?.nome || "Parceiro"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Serviço:</span>
                    <span className="font-bold text-slate-800">{selectedServicoForRequest.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Valor Debitado:</span>
                    <span className="font-bold font-mono text-[#00A86B]">
                      {requestSuccessData?.precoDebitado !== undefined 
                        ? formatCurrencyBRL(requestSuccessData.precoDebitado)
                        : formatCurrencyBRL(selectedServicoForRequest.preco || 0)}
                    </span>
                  </div>
                  {requestSuccessData?.newBalance !== undefined && (
                    <div className="flex justify-between pt-1 border-t border-slate-200/60">
                      <span className="font-semibold text-slate-600">Novo Saldo Geral:</span>
                      <span className="font-bold font-mono text-emerald-700">
                        {formatCurrencyBRL(requestSuccessData.newBalance)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={handleCloseRequestModal}
                    className="px-6 py-2.5 bg-[#00A86B] hover:bg-[#008f5b] text-white font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Concluir e Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
