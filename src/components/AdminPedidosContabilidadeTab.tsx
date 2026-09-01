// @ts-nocheck
import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { PedidoServicoContabilidade } from "../types";
import { 
  ClipboardList, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Calendar,
  User, 
  Building2, 
  Filter, 
  Eye, 
  ArrowUpRight, 
  FileText, 
  MessageSquare, 
  Link as LinkIcon, 
  Send, 
  Check, 
  X, 
  Phone, 
  Mail, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  PlayCircle,
  Save
} from "lucide-react";
import { formatCurrencyBRL } from "../utils";

interface AdminPedidosContabilidadeTabProps {
  userRole?: string;
}

export default function AdminPedidosContabilidadeTab({ userRole }: AdminPedidosContabilidadeTabProps) {
  const [pedidos, setPedidos] = useState<PedidoServicoContabilidade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "solicitado" | "em_andamento" | "concluido" | "cancelado">("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");

  // Modal de Execução / Detalhes do Pedido
  const [selectedPedido, setSelectedPedido] = useState<PedidoServicoContabilidade | null>(null);
  const [editStatus, setEditStatus] = useState<"solicitado" | "em_andamento" | "concluido" | "cancelado">("solicitado");
  const [parecerTexto, setParecerTexto] = useState<string>("");
  const [linkDoc, setLinkDoc] = useState<string>("");
  const [responsavel, setResponsavel] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);
  const [updateErrorMsg, setUpdateErrorMsg] = useState<string | null>(null);

  // Carga sob demanda (sem listener em tempo real) para reduzir leituras no Firestore
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchPedidos = async () => {
    setLoading(true);
    setError(null);
    const pedidosRef = collection(db, "pedidos_servicos_contabilidade");

    const mapSnapshot = (snapshot: any) => {
      const list: PedidoServicoContabilidade[] = [];
      snapshot.forEach((docSnap: any) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PedidoServicoContabilidade);
      });
      list.sort((a, b) => new Date(b.dataSolicitacao || 0).getTime() - new Date(a.dataSolicitacao || 0).getTime());
      return list;
    };

    try {
      const snapshot = await getDocs(query(pedidosRef, orderBy("dataSolicitacao", "desc")));
      setPedidos(mapSnapshot(snapshot));
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.warn("Fallback sem orderBy para pedidos_servicos_contabilidade:", err);
      try {
        const snapshot = await getDocs(pedidosRef);
        setPedidos(mapSnapshot(snapshot));
        setLastUpdatedAt(new Date());
      } catch (err2) {
        console.error("Erro ao carregar pedidos de contabilidade:", err2);
        setError("Não foi possível carregar os pedidos de serviços contábeis.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleOpenPedido = (pedido: PedidoServicoContabilidade) => {
    setSelectedPedido(pedido);
    setEditStatus(pedido.status || "solicitado");
    setParecerTexto(pedido.parecerContador || "");
    setLinkDoc(pedido.linkDocumento || "");
    setResponsavel(pedido.responsavelNome || (userRole === "contador" ? "Equipe Contábil" : "Administração"));
    setUpdateSuccessMsg(null);
    setUpdateErrorMsg(null);
  };

  const handleCloseModal = () => {
    setSelectedPedido(null);
    setUpdateSuccessMsg(null);
    setUpdateErrorMsg(null);
  };

  const handleSalvarExecucao = async () => {
    if (!selectedPedido || !selectedPedido.id) return;

    setIsUpdating(true);
    setUpdateSuccessMsg(null);
    setUpdateErrorMsg(null);

    try {
      const pedidoDocRef = doc(db, "pedidos_servicos_contabilidade", selectedPedido.id);
      
      const statusAnterior = selectedPedido.status;
      const novoStatus = editStatus;
      const agora = new Date().toISOString();

      const logItem = {
        data: agora,
        autor: responsavel.trim() || (userRole === "contador" ? "Equipe Contábil" : "Administrador"),
        acao: `Status alterado de "${statusAnterior}" para "${novoStatus}"`,
        mensagem: parecerTexto.trim() || undefined
      };

      const historicoLogs = Array.isArray(selectedPedido.historicoLogs) 
        ? [...selectedPedido.historicoLogs, logItem] 
        : [logItem];

      const updatePayload: any = {
        status: novoStatus,
        parecerContador: parecerTexto.trim(),
        linkDocumento: linkDoc.trim(),
        responsavelNome: responsavel.trim(),
        dataAtualizacao: agora,
        historicoLogs: historicoLogs
      };

      if (novoStatus === "concluido" && !selectedPedido.dataConcluido) {
        updatePayload.dataConclusao = agora;
      }

      await updateDoc(pedidoDocRef, updatePayload);

      // Notificação ao parceiro se houve mudança de status ou parecer
      if (selectedPedido.parceiroId) {
        try {
          let msgNotif = `O pedido do serviço "${selectedPedido.nomeServico}" teve seu status atualizado para: ${novoStatus.toUpperCase()}.`;
          if (novoStatus === "concluido") {
            msgNotif = `O serviço contábil "${selectedPedido.nomeServico}" foi CONCLUÍDO pela equipe! Verifique o parecer e os documentos no portal.`;
          } else if (novoStatus === "em_andamento") {
            msgNotif = `O serviço contábil "${selectedPedido.nomeServico}" agora está EM EXECUÇÃO pela nossa equipe contábil.`;
          }

          await addDoc(collection(db, "notificacoes"), {
            recipientId: selectedPedido.parceiroId,
            recipientType: "parceiro",
            titulo: novoStatus === "concluido" ? "✅ Serviço Contábil Concluído" : "📋 Atualização de Serviço Contábil",
            mensagem: msgNotif,
            tipo: novoStatus === "concluido" ? "success" : "info",
            lida: false,
            createdAt: agora,
            link: "/partner",
            pedidoId: selectedPedido.id
          });
        } catch (notifErr) {
          console.warn("Erro ao enviar notificação de atualização:", notifErr);
        }
      }

      setUpdateSuccessMsg("Solicitação atualizada com sucesso no sistema!");

      // Sem listener em tempo real: recarrega a lista após a escrita
      fetchPedidos();
      
      
      // Atualiza o objeto no modal localmente
      setSelectedPedido({
        ...selectedPedido,
        ...updatePayload
      });

      setTimeout(() => {
        setUpdateSuccessMsg(null);
      }, 4000);

    } catch (err: any) {
      console.error("Erro ao atualizar execução do pedido:", err);
      setUpdateErrorMsg(err.message || "Erro ao salvar alterações da solicitação.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtros aplicados
  const filteredPedidos = pedidos.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      (p.id || "").toLowerCase().includes(term) ||
      (p.nomeServico || "").toLowerCase().includes(term) ||
      (p.parceiroNome || "").toLowerCase().includes(term) ||
      (p.parceiroEmail || "").toLowerCase().includes(term) ||
      (p.clienteNome || "").toLowerCase().includes(term) ||
      (p.observacoes || "").toLowerCase().includes(term) ||
      (p.categoria || "").toLowerCase().includes(term);

    const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
    const matchesCategoria = categoriaFilter === "todas" || p.categoria === categoriaFilter;

    return matchesSearch && matchesStatus && matchesCategoria;
  });

  // Métricas
  const totalSolicitados = pedidos.filter(p => p.status === "solicitado").length;
  const totalEmAndamento = pedidos.filter(p => p.status === "em_andamento").length;
  const totalConcluidos = pedidos.filter(p => p.status === "concluido").length;
  const totalCancelados = pedidos.filter(p => p.status === "cancelado").length;
  const totalValor = pedidos.reduce((acc, p) => acc + (Number(p.precoNoMomento) || 0), 0);

  const categoriasDisponiveis = Array.from(new Set(pedidos.map(p => p.categoria).filter(Boolean)));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "solicitado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Pendente / Novo</span>
          </span>
        );
      case "em_andamento":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Em Execução</span>
          </span>
        );
      case "concluido":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Concluído & Entregue</span>
          </span>
        );
      case "cancelado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-200">
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelado / Estornado</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div 
          onClick={() => setStatusFilter("solicitado")}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === "solicitado" ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
              Pendentes / Novos
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block mt-1">
            {totalSolicitados}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Aguardando início</span>
        </div>

        <div 
          onClick={() => setStatusFilter("em_andamento")}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === "em_andamento" ? "border-blue-400 ring-2 ring-blue-400/20 bg-blue-50/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
              Em Execução
            </span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block mt-1">
            {totalEmAndamento}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Sendo confeccionados</span>
        </div>

        <div 
          onClick={() => setStatusFilter("concluido")}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === "concluido" ? "border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
              Concluídos
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block mt-1">
            {totalConcluidos}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Entregues com sucesso</span>
        </div>

        <div 
          onClick={() => setStatusFilter("todos")}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === "todos" ? "border-[#00A86B] ring-2 ring-[#00A86B]/20 bg-emerald-50/10" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Total de Solicitações
            </span>
            <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono block mt-1">
            {pedidos.length}
          </span>
          <span className="text-[11px] text-emerald-700 font-bold font-mono">
            Volume: {formatCurrencyBRL(totalValor)}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, parceiro, serviço, ID do pedido ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white/75 backdrop-blur-xl focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Categoria */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white/75 backdrop-blur-xl focus:border-[#00A86B]"
            >
              <option value="todas">Todas as Categorias</option>
              {categoriasDisponiveis.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 border-t border-slate-100 pt-3">
          {[
            { id: "todos", label: "Todos os Pedidos", count: pedidos.length },
            { id: "solicitado", label: "🟡 Pendentes", count: totalSolicitados },
            { id: "em_andamento", label: "🔵 Em Execução", count: totalEmAndamento },
            { id: "concluido", label: "🟢 Concluídos", count: totalConcluidos },
            { id: "cancelado", label: "🔴 Cancelados", count: totalCancelados },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 font-bold ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? "bg-white/20 text-white" : "bg-white text-slate-700"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {lastUpdatedAt && (
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap hidden sm:inline">
                Atualizado às {lastUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              type="button"
              onClick={fetchPedidos}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Recarregar pedidos do Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar dados</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#00A86B] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Carregando solicitações de serviços contábeis...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-rose-700">{error}</p>
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" strokeWidth={1.5} />
            <h3 className="text-sm font-black text-slate-700">Nenhuma solicitação contábil encontrada</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || statusFilter !== "todos" || categoriaFilter !== "todas"
                ? "Nenhum pedido atende aos filtros de busca selecionados."
                : "Quando os parceiros contratarem serviços contábeis ou societários pelo portal, os pedidos aparecerão aqui em tempo real para execução da equipe."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Data & ID</th>
                  <th className="py-3.5 px-4">Serviço Contratado</th>
                  <th className="py-3.5 px-4">Parceiro Solicitante</th>
                  <th className="py-3.5 px-4">Cliente / Empresa</th>
                  <th className="py-3.5 px-4">Valor Pago</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPedidos.map((pedido) => {
                  const isNew = pedido.status === "solicitado";
                  return (
                    <tr 
                      key={pedido.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isNew ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Data & ID */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(pedido.dataSolicitacao)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[120px]" title={pedido.id}>
                            #{pedido.id?.slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      {/* Serviço & Categoria */}
                      <td className="py-3.5 px-4 align-top max-w-[260px]">
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 block leading-snug">
                            {pedido.nomeServico}
                          </span>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {pedido.categoria || "Contabilidade"}
                          </span>
                        </div>
                      </td>

                      {/* Parceiro */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            {pedido.parceiroNome || "Parceiro"}
                          </span>
                          {pedido.parceiroEmail && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {pedido.parceiroEmail}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cliente / Observações */}
                      <td className="py-3.5 px-4 align-top max-w-[220px]">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">{pedido.clienteNome || "Não informado"}</span>
                          </span>
                          {pedido.observacoes && (
                            <p className="text-[11px] text-slate-500 italic line-clamp-2 leading-tight">
                              "{pedido.observacoes}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {formatCurrencyBRL(pedido.precoNoMomento || 0)}
                        </span>
                        <span className="block text-[10px] font-semibold text-emerald-700">
                          Saldo Geral (Débito)
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        {getStatusBadge(pedido.status)}
                      </td>

                      {/* Botão de Ação / Execução */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenPedido(pedido)}
                          className="px-3 py-1.5 bg-[#00A86B] hover:bg-[#008f5b] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ml-auto shadow-2xs cursor-pointer active:scale-95"
                          title="Abrir detalhes e executar este serviço"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Executar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL / WORKSPACE DE EXECUÇÃO DO SERVIÇO */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-white/75 backdrop-blur-xl w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Central de Execução Contábil
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    Pedido #{selectedPedido.id?.slice(0, 10)}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                  {selectedPedido.nomeServico}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-2">
                  <span>Categoria: <strong>{selectedPedido.categoria || "Contabilidade"}</strong></span>
                  <span>&bull;</span>
                  <span>Solicitado em: <strong>{formatDate(selectedPedido.dataSolicitacao)}</strong></span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Feedback messages */}
              {updateSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{updateSuccessMsg}</span>
                </div>
              )}

              {updateErrorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{updateErrorMsg}</span>
                </div>
              )}

              {/* Informações da Solicitação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Card Parceiro */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Parceiro Solicitante
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-600" />
                      {selectedPedido.parceiroNome || "Parceiro"}
                    </p>
                    {selectedPedido.parceiroEmail && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {selectedPedido.parceiroEmail}
                      </p>
                    )}
                    {selectedPedido.parceiroTelefone && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedPedido.parceiroTelefone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Cliente / Empresa */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Cliente / Razão Social Indicada
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      {selectedPedido.clienteNome || "Não especificado"}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      Valor Contratado: <strong className="text-slate-900">{formatCurrencyBRL(selectedPedido.precoNoMomento || 0)}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Observações e Instruções fornecidas pelo parceiro */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  Observações e Necessidades do Cliente (Preenchidas no Pedido):
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedPedido.observacoes || "Nenhuma observação adicional foi fornecida no momento da solicitação."}
                </p>
              </div>

              {/* PAINEL DE CONTROLE DA EXECUÇÃO */}
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500/30 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00A86B]" />
                    Gestão & Execução do Serviço
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Status Atual:</span>
                    {getStatusBadge(selectedPedido.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Seletor de Novo Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Alterar Status do Pedido:
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B]"
                    >
                      <option value="solicitado">🟡 Solicitado / Pendente</option>
                      <option value="em_andamento">🔵 Em Andamento / Em Execução</option>
                      <option value="concluido">🟢 Concluído & Entregue</option>
                      <option value="cancelado">🔴 Cancelado / Estornado</option>
                    </select>
                  </div>

                  {/* Nome do Responsável */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Responsável pela Execução / Contador:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Contabilidade Grupo LCA / João Silva"
                      value={responsavel}
                      onChange={(e) => setResponsavel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-[#00A86B]"
                    />
                  </div>
                </div>

                {/* Link do Documento ou Certidão */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                      Link do Documento / Certidão Gerada (Google Drive, PDF, etc.):
                    </span>
                    {linkDoc && linkDoc.startsWith("http") && (
                      <a 
                        href={linkDoc} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[11px] text-[#00A86B] hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Testar Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/... ou link público de download"
                    value={linkDoc}
                    onChange={(e) => setLinkDoc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-[#00A86B]"
                  />
                  <p className="text-[10px] text-slate-400">
                    O parceiro terá acesso direto a este link para baixar a certidão, alteração contratual ou protocolo.
                  </p>
                </div>

                {/* Parecer do Contador / Relatório da Execução */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    Parecer Técnico do Contador / Mensagem de Conclusão para o Parceiro:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Certidão Negativa de Débitos Federais emitida com sucesso e válida até 20/12. Protocolo da Receita Federal nº 987654321 anexado..."
                    value={parecerTexto}
                    onChange={(e) => setParecerTexto(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-[#00A86B] resize-none"
                  />
                </div>

                {/* Botões de Ação Rápida */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditStatus("em_andamento");
                      if (!parecerTexto) {
                        setParecerTexto("Solicitação recebida e processo em andamento pela equipe contábil.");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Marcar 'Em Andamento'</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditStatus("concluido");
                      if (!parecerTexto) {
                        setParecerTexto("Serviço contábil concluído e documentos devidamente emitidos.");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marcar 'Concluído'</span>
                  </button>
                </div>
              </div>

              {/* Histórico de Alterações / Logs */}
              {Array.isArray(selectedPedido.historicoLogs) && selectedPedido.historicoLogs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Histórico de Atualizações do Pedido
                  </span>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 max-h-40 overflow-y-auto">
                    {selectedPedido.historicoLogs.map((log, lidx) => (
                      <div key={lidx} className="text-xs border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{formatDate(log.data)}</span>
                          <strong className="text-slate-600">{log.autor}</strong>
                        </div>
                        <p className="font-bold text-slate-800 text-[11px]">{log.acao}</p>
                        {log.mensagem && <p className="text-slate-600 text-[11px] italic">"{log.mensagem}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleSalvarExecucao}
                disabled={isUpdating}
                className="px-5 py-2.5 bg-[#00A86B] hover:bg-[#008f5b] active:bg-[#0A3D2E] text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações e Notificar Parceiro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
