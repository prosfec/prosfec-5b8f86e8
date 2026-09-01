// @ts-nocheck
import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  query, 
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import { ServicoContabilidade } from "../types";
import { 
  Calculator, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Info, 
  Save, 
  Layers, 
  DollarSign, 
  Check, 
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldCheck,
  FileCheck,
  Building2,
  FileText,
  ClipboardList
} from "lucide-react";
import { formatCurrencyBRL } from "../utils";
import AdminPedidosContabilidadeTab from "./AdminPedidosContabilidadeTab";

interface AdminServicosContabilidadeTabProps {
  userRole?: string;
}

export default function AdminServicosContabilidadeTab({ userRole }: AdminServicosContabilidadeTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pedidos" | "precos">("pedidos");
  const [pedidosPendentesCount, setPedidosPendentesCount] = useState<number>(0);
  const [totalPedidosCount, setTotalPedidosCount] = useState<number>(0);

  const [servicos, setServicos] = useState<ServicoContabilidade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  
  // Controle de edição de preços e status local por ID
  const [editValues, setEditValues] = useState<Record<string, { preco: number | string; ativo: boolean }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [saveAllLoading, setSaveAllLoading] = useState<boolean>(false);
  const [globalSuccessMsg, setGlobalSuccessMsg] = useState<string | null>(null);
  const [globalErrorMsg, setGlobalErrorMsg] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Contagem de pedidos pendentes para o badge (consulta estática, sem listener)
  const fetchPedidosPendentesCount = async () => {
    try {
      const pedidosRef = collection(db, "pedidos_servicos_contabilidade");
      const qPending = query(pedidosRef, where("status", "in", ["solicitado", "em_andamento"]));
      const snap = await getDocs(qPending);
      setPedidosPendentesCount(snap.size);
    } catch (e) {
      console.warn("Erro ao contar pedidos pendentes:", e);
    }
  };

  useEffect(() => {
    fetchPedidosPendentesCount();
  }, []);

  const fetchServicos = async () => {
    try {
      setLoading(true);
      setError(null);
      const servicosRef = collection(db, "servicos_contabilidade");
      const q = query(servicosRef);
      const snapshot = await getDocs(q);
      
      const items: ServicoContabilidade[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as any) });
      });

      // Ordenar por categoriaOrdem e ordem
      items.sort((a, b) => {
        const catA = a.categoriaOrdem ?? 99;
        const catB = b.categoriaOrdem ?? 99;
        if (catA !== catB) return catA - catB;
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      });

      setServicos(items);

      // Inicializa estado de edição local
      const initialEdits: Record<string, { preco: number | string; ativo: boolean }> = {};
      items.forEach(s => {
        initialEdits[s.id] = {
          preco: s.preco ?? 0,
          ativo: s.ativo !== false,
        };
      });
      setEditValues(initialEdits);
    } catch (err: any) {
      console.error("Erro ao carregar serviços de contabilidade:", err);
      setError("Não foi possível carregar a lista de serviços de contabilidade do Firestore.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicos();
  }, []);

  const handlePriceChange = (id: string, value: string) => {
    const numeric = value === "" ? "" : parseFloat(value);
    setEditValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        preco: numeric === "" ? "" : isNaN(numeric as number) ? 0 : (numeric as number),
      }
    }));
  };

  const handleToggleAtivo = async (id: string, currentAtivo: boolean) => {
    const newAtivo = !currentAtivo;
    setEditValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ativo: newAtivo,
      }
    }));

    // Auto-save do toggle no Firestore
    try {
      setSavingId(id);
      const docRef = doc(db, "servicos_contabilidade", id);
      await updateDoc(docRef, {
        ativo: newAtivo,
        updatedAt: new Date().toISOString(),
      });

      setServicos(prev => prev.map(s => s.id === id ? { ...s, ativo: newAtivo } : s));
      setSavedSuccessId(id);
      setTimeout(() => setSavedSuccessId(null), 2500);
    } catch (err: any) {
      console.error("Erro ao alternar status ativo:", err);
      setGlobalErrorMsg(`Falha ao alterar status do serviço ID: ${id}`);
      setTimeout(() => setGlobalErrorMsg(null), 4000);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveItem = async (servico: ServicoContabilidade) => {
    const edit = editValues[servico.id];
    if (!edit) return;

    const precoFinal = typeof edit.preco === "number" ? edit.preco : (parseFloat(edit.preco as string) || 0);

    try {
      setSavingId(servico.id);
      setGlobalErrorMsg(null);

      const docRef = doc(db, "servicos_contabilidade", servico.id);
      await updateDoc(docRef, {
        preco: precoFinal,
        ativo: edit.ativo,
        updatedAt: new Date().toISOString(),
      });

      // Atualiza o estado principal
      setServicos(prev => prev.map(s => s.id === servico.id ? { 
        ...s, 
        preco: precoFinal, 
        ativo: edit.ativo 
      } : s));

      setSavedSuccessId(servico.id);
      setTimeout(() => setSavedSuccessId(null), 2500);
    } catch (err: any) {
      console.error("Erro ao salvar serviço no Firestore:", err);
      setGlobalErrorMsg(`Erro ao salvar "${servico.nome}". Verifique as permissões de administrador.`);
      setTimeout(() => setGlobalErrorMsg(null), 4000);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaveAllLoading(true);
      setGlobalErrorMsg(null);
      setGlobalSuccessMsg(null);

      const now = new Date().toISOString();
      const promises = servicos.map(async (s) => {
        const edit = editValues[s.id];
        if (!edit) return;
        const precoFinal = typeof edit.preco === "number" ? edit.preco : (parseFloat(edit.preco as string) || 0);
        
        // Verifica se houve mudança antes de disparar escrita
        if (s.preco !== precoFinal || s.ativo !== edit.ativo) {
          const docRef = doc(db, "servicos_contabilidade", s.id);
          return updateDoc(docRef, {
            preco: precoFinal,
            ativo: edit.ativo,
            updatedAt: now,
          });
        }
      });

      await Promise.all(promises);
      
      // Atualiza estado local
      setServicos(prev => prev.map(s => {
        const edit = editValues[s.id];
        if (!edit) return s;
        const precoFinal = typeof edit.preco === "number" ? edit.preco : (parseFloat(edit.preco as string) || 0);
        return {
          ...s,
          preco: precoFinal,
          ativo: edit.ativo,
        };
      }));

      setGlobalSuccessMsg("Todos os preços e status dos serviços foram salvos no Firestore com sucesso!");
      setTimeout(() => setGlobalSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Erro ao salvar todos os serviços:", err);
      setGlobalErrorMsg("Falha ao salvar as alterações em lote. Tente salvar individualmente.");
      setTimeout(() => setGlobalErrorMsg(null), 5000);
    } finally {
      setSaveAllLoading(false);
    }
  };

  const toggleCategoryCollapse = (categoria: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  // Filtragem dos serviços
  const filteredServicos = servicos.filter((s) => {
    const matchesSearch = 
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.categoria.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategoria = selectedCategoria === "todas" || s.categoria === selectedCategoria;

    const isAtivo = editValues[s.id]?.ativo ?? s.ativo ?? true;
    const matchesStatus = 
      statusFilter === "todos" ? true :
      statusFilter === "ativos" ? isAtivo : !isAtivo;

    return matchesSearch && matchesCategoria && matchesStatus;
  });

  // Agrupamento por Categoria
  const categoriasMap = filteredServicos.reduce<Record<string, ServicoContabilidade[]>>((acc, s) => {
    if (!acc[s.categoria]) {
      acc[s.categoria] = [];
    }
    acc[s.categoria].push(s);
    return acc;
  }, {});

  const allCategories = Array.from(new Set(servicos.map(s => s.categoria)));
  const totalServicosAtivos = servicos.filter(s => (editValues[s.id]?.ativo ?? s.ativo) !== false).length;
  const totalServicosPrecoConfigurado = servicos.filter(s => ((editValues[s.id]?.preco ?? s.preco) as number) > 0).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-left animate-fade-in font-sans">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/75 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-[#00A86B] rounded-xl border border-emerald-200/50">
              <Calculator className="w-5 h-5 text-[#00A86B]" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 font-display tracking-tight flex items-center gap-2">
                Gestão de Serviços Contábeis & Fiscais
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Central unificada para execução das solicitações de clientes e controle da tabela de preços dos 33 serviços contábeis.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("pedidos")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === "pedidos"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Fila de Execução & Pedidos</span>
            {pedidosPendentesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                {pedidosPendentesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("precos")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === "precos"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Catálogo & Tabela de Preços</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 font-mono">
              33
            </span>
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL ENTRE AS SUB-ABAS */}
      {activeSubTab === "pedidos" ? (
        <AdminPedidosContabilidadeTab userRole={userRole} />
      ) : (
        <div className="space-y-6">
          {/* Top Actions Bar for Preços */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Tabela Oficial de Preços dos 33 Serviços
              </h3>
              <p className="text-xs text-slate-500">
                Os valores e status de ativação configurados abaixo são refletidos instantaneamente no Portal do Parceiro.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={fetchServicos}
                disabled={loading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="Recarregar dados do Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saveAllLoading || loading || userRole === "contador"}
                className="px-4 py-2 bg-[#00A86B] hover:bg-[#008f5b] active:bg-[#0A3D2E] text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saveAllLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gravando no Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Todas as Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>

      {/* Feedback Messages */}
      {globalSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-3 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{globalSuccessMsg}</span>
        </div>
      )}

      {globalErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-3 animate-fade-in shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{globalErrorMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total no Catálogo</span>
          <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono block mt-0.5">{servicos.length} Serviços</span>
          <span className="text-[10px] text-slate-500 font-medium">13 Categorias oficiais</span>
        </div>

        <div className="bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Serviços Ativos</span>
          <span className="text-lg sm:text-xl font-extrabold text-emerald-700 font-mono block mt-0.5">{totalServicosAtivos} de {servicos.length}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Exibidos aos Parceiros</span>
        </div>

        <div className="bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preços Definidos</span>
          <span className="text-lg sm:text-xl font-extrabold text-[#00A86B] font-mono block mt-0.5">{totalServicosPrecoConfigurado} / {servicos.length}</span>
          <span className="text-[10px] text-slate-500 font-medium">Valores &gt; R$ 0,00</span>
        </div>

        <div className="bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regra de Precificação</span>
          <span className="text-xs font-bold text-[#0A3D2E] block mt-1">Preço Único Oficial</span>
          <span className="text-[10px] text-slate-500">Editável pelo Admin</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white/75 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por serviço, descrição ou categoria..."
            className="pl-9 pr-4 py-2 w-full text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#00A86B] focus:bg-white/75 backdrop-blur-xl transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Categoria Select */}
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#00A86B] text-slate-700 font-bold cursor-pointer"
          >
            <option value="todas">Todas as Categorias ({allCategories.length})</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setStatusFilter("todos")}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "todos" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ativos")}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "ativos" ? "bg-white text-emerald-700 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Ativos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inativos")}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "inativos" ? "bg-white text-rose-700 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Inativos
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/80 space-y-3">
          <RefreshCw className="w-8 h-8 text-[#00A86B] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Carregando catálogo de serviços contábeis do Firestore...</p>
        </div>
      ) : Object.keys(categoriasMap).length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
          <Calculator className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Nenhum serviço encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não foram localizados serviços para o termo "{searchTerm}" ou filtros selecionados.
          </p>
        </div>
      ) : (
        /* Categorias Agrupadas */
        <div className="space-y-6">
          {(Object.entries(categoriasMap) as [string, ServicoContabilidade[]][]).map(([categoria, items]) => {
            const isCollapsed = collapsedCategories[categoria] ?? false;

            return (
              <div 
                key={categoria}
                className="bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-[0_12px_32px_-12px_rgba(2,36,26,0.18)] overflow-hidden transition-all"
              >
                {/* Cabeçalho da Categoria */}
                <div 
                  onClick={() => toggleCategoryCollapse(categoria)}
                  className="bg-slate-50/80 hover:bg-slate-100/80 px-4 sm:px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-6 bg-[#00A86B] rounded-full shrink-0" />
                    <div>
                      <h3 className="text-sm font-extrabold text-[#0A3D2E] font-display uppercase tracking-wider flex items-center gap-2">
                        <span>{categoria}</span>
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60 lowercase">
                          {items.length} {items.length === 1 ? "serviço" : "serviços"}
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600">
                    <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                      {isCollapsed ? "Expandir" : "Recolher"}
                    </span>
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>

                {/* Lista de Serviços dentro da Categoria */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {items.map((servico) => {
                      const editState = editValues[servico.id] || { preco: servico.preco ?? 0, ativo: servico.ativo ?? true };
                      const isSaving = savingId === servico.id;
                      const isSaved = savedSuccessId === servico.id;
                      const hasUnsavedChanges = 
                        (typeof editState.preco === "number" ? editState.preco : parseFloat(editState.preco as string) || 0) !== (servico.preco ?? 0);

                      return (
                        <div 
                          key={servico.id}
                          className={`p-4 sm:p-5 transition-all hover:bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                            !editState.ativo ? "opacity-60 bg-slate-50/80" : ""
                          }`}
                        >
                          {/* Coluna Esquerda: Nome, Descrição, Prazo e Dica */}
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 font-display">
                                {servico.nome}
                              </span>

                              {/* Badge de Prazo */}
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-500" strokeWidth={1.75} />
                                {servico.prazo}
                              </span>

                              {/* Badge Ativo / Inativo */}
                              {editState.ativo ? (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  Inativo
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              {servico.descricao}
                            </p>

                            {/* Bloco de Dica Estratégica */}
                            {servico.dica && (
                              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-emerald-950 leading-relaxed mt-1.5">
                                <Info className="w-3.5 h-3.5 text-[#00A86B] shrink-0 mt-0.5" strokeWidth={1.75} />
                                <div>
                                  <strong className="font-bold text-[#0A3D2E]">Dica: </strong>
                                  <span>{servico.dica}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Coluna Direita: Preço Editável, Toggle Ativo e Ação Salvar */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                            {/* Input de Preço */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Preço (R$)
                              </label>
                              <div className="relative rounded-xl shadow-2xs w-36 sm:w-40">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                  <span className="text-slate-400 text-xs font-bold font-mono">R$</span>
                                </div>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editState.preco}
                                  onChange={(e) => handlePriceChange(servico.id, e.target.value)}
                                  placeholder="0.00"
                                  className="block w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs md:text-sm font-mono font-extrabold text-slate-900 bg-white focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all shadow-inner"
                                />
                              </div>
                            </div>

                            {/* Switch de Ativação */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Status
                              </label>
                              <button
                                type="button"
                                onClick={() => handleToggleAtivo(servico.id, editState.ativo)}
                                className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  editState.ativo 
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100" 
                                    : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                                }`}
                                title={editState.ativo ? "Clique para desativar este serviço" : "Clique para ativar este serviço"}
                              >
                                <span className={`w-2 h-2 rounded-full ${editState.ativo ? "bg-[#00A86B]" : "bg-slate-400"}`} />
                                <span>{editState.ativo ? "Ativo" : "Inativo"}</span>
                              </button>
                            </div>

                            {/* Botão de Salvar Individual */}
                            <div className="space-y-1 self-end">
                              <button
                                type="button"
                                onClick={() => handleSaveItem(servico)}
                                disabled={isSaving || userRole === "contador"}
                                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                  isSaved
                                    ? "bg-emerald-600 text-white"
                                    : hasUnsavedChanges
                                    ? "bg-[#00A86B] hover:bg-[#008f5b] text-white animate-pulse"
                                    : "bg-slate-800 hover:bg-slate-900 text-white"
                                } disabled:opacity-50`}
                                title="Salvar alteração deste serviço no Firestore"
                              >
                                {isSaving ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>...</span>
                                  </>
                                ) : isSaved ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Salvo!</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Salvar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
