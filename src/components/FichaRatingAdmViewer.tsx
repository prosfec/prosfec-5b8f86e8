// @ts-nocheck
import React, { useState } from "react";
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Lock,
  Phone,
  Save,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { motion } from "motion/react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConclusaoRatingPosServico, FichaRatingCredito, Lead } from "../types";
import { sanitizeFirestoreData } from "../utils";

interface FichaRatingAdmViewerProps {
  lead: Lead;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

const MELHORIAS_DISPONIVEIS = [
  "Adequação e Saneamento Cadastral",
  "Regularização e Desvinculação BACEN (SCR)",
  "Otimização de Índices de Liquidez no Balanço/DRE",
  "Elevação de Score de Crédito e Rating Bancário",
  "Reestruturação de Endividamento de Curto Prazo",
  "Emissão de Parecer Técnico de Capacidade Financeira",
];

const NOTAS_RATING_PRESETS = [
  "AAA (Excelente)",
  "AA (Muito Bom)",
  "A1 (Ótimo)",
  "A2 (Bom)",
  "BBB (Moderado)",
  "BB (Regular)",
  "B (Em Adequação)",
];

export default function FichaRatingAdmViewer({
  lead,
  onLeadUpdated,
}: FichaRatingAdmViewerProps) {
  const ratingData: FichaRatingCredito | undefined = lead.fichaRatingCredito;
  const pastaDocumentosUrl = ratingData?.pastaDocumentosUrl || lead.linkDocumentos || "";
  const isUnlocked = Boolean(
    lead.pagamentoConfirmado ||
      lead.pagamentoServicosConfirmado ||
      lead.liberarFichaRating ||
      lead.servicosRecomendados?.some((s: any) => s.pago || s.statusPagamento === "pago") ||
      lead.subEtapasPasso6?.some((s: any) => s.pago || s.statusPagamento === "pago") ||
      (lead.etapa && lead.etapa >= 6),
  );

  const [status, setStatus] = useState(ratingData?.status || "pendente");
  const [observacoes, setObservacoes] = useState(ratingData?.observacoesAdm || "");
  const [isManuallyUnlocked, setIsManuallyUnlocked] = useState(
    Boolean(lead.liberarFichaRating || lead.pagamentoConfirmado),
  );
  const [notaRating, setNotaRating] = useState(
    ratingData?.conclusaoRating?.notaFinalRating || "AA (Muito Bom)",
  );
  const [classificacaoRisco, setClassificacaoRisco] = useState<any>(
    ratingData?.conclusaoRating?.classificacaoRisco || "Risco Mínimo (AAA/AA)",
  );
  const [capacidadeTomada, setCapacidadeTomada] = useState(
    ratingData?.conclusaoRating?.capacidadeTomadaSugerida ||
      (lead.limiteEstimado
        ? `R$ ${lead.limiteEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "R$ 250.000,00"),
  );
  const [melhoriasSelecionadas, setMelhoriasSelecionadas] = useState<string[]>(
    ratingData?.conclusaoRating?.melhoriasAplicadas || [
      "Adequação e Saneamento Cadastral",
      "Regularização e Desvinculação BACEN (SCR)",
      "Elevação de Score de Crédito e Rating Bancário",
    ],
  );
  const [parecerTecnico, setParecerTecnico] = useState(
    ratingData?.conclusaoRating?.parecerFinalTecnico ||
      "Após aplicação dos serviços de adequação de perfil de crédito e saneamento de apontamentos cadastrais, a empresa apresenta capacidade financeira robusta para captação de recursos junto aos agentes financeiros com taxa otimizada.",
  );
  const [analistaResponsavel, setAnalistaResponsavel] = useState(
    ratingData?.conclusaoRating?.analistaResponsavel || "Mesa de Operações e Rating PROSFEC",
  );
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const subEtapas: any[] = Array.isArray(lead.subEtapasPasso6) ? lead.subEtapasPasso6 : [];
  const subEtapasConcluidas = subEtapas.filter((item) => item?.concluida).length;
  const progressoPasso6 = subEtapas.length
    ? Math.round((subEtapasConcluidas / subEtapas.length) * 100)
    : 0;

  const getCurrentFase = (): FichaRatingCredito["faseRating"] => {
    if (
      ratingData?.conclusaoRating?.notaFinalRating ||
      status === "aprovado" ||
      ratingData?.faseRating === "concluido"
    ) {
      return "concluido";
    }
    if (
      status === "em_analise" ||
      subEtapasConcluidas > 0 ||
      (lead.etapa && lead.etapa >= 6)
    ) {
      return "em_aplicacao";
    }
    if (pastaDocumentosUrl) return "documentos_recebidos";
    return "aguardando_documentos";
  };

  const currentFase = getCurrentFase();

  const showFeedback = (message: string) => {
    setSaveFeedback(message);
    window.setTimeout(() => setSaveFeedback(null), 4000);
  };

  const handleToggleUnlock = async () => {
    const newState = !isManuallyUnlocked;
    setIsManuallyUnlocked(newState);
    setSaving(true);
    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, {
        liberarFichaRating: newState,
        pagamentoConfirmado: newState,
      });
      onLeadUpdated?.({
        ...lead,
        liberarFichaRating: newState,
        pagamentoConfirmado: newState,
      });
      showFeedback(newState ? "Ficha de Rating liberada com sucesso!" : "Ficha de Rating bloqueada.");
    } catch (err) {
      console.error("Erro ao atualizar status de liberação:", err);
      showFeedback("Erro ao atualizar no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMelhoria = (melhoria: string) => {
    setMelhoriasSelecionadas((atuais) =>
      atuais.includes(melhoria)
        ? atuais.filter((item) => item !== melhoria)
        : [...atuais, melhoria],
    );
  };

  const handleSaveAdmReview = async () => {
    setSaving(true);
    setSaveFeedback(null);
    const now = new Date().toISOString();
    const updatedRating: FichaRatingCredito = {
      ...(ratingData || {}),
      sociosCPF: ratingData?.sociosCPF || [],
      dadosCNPJ: ratingData?.dadosCNPJ || {},
      status: currentFase === "concluido" ? "aprovado" : (status as FichaRatingCredito["status"]),
      faseRating: currentFase,
      dataAtualizacao: now,
      observacoesAdm: observacoes,
    };

    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, { fichaRatingCredito: sanitizeFirestoreData(updatedRating) });
      onLeadUpdated?.({ ...lead, fichaRatingCredito: updatedRating });
      showFeedback("Dossiê de Rating salvo e atualizado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar avaliação de rating:", err);
      showFeedback(`Erro ao salvar no Firestore: ${err?.message || "falha desconhecida"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConcluirRating = async () => {
    setSaving(true);
    setSaveFeedback(null);
    const now = new Date().toISOString();
    const conclusaoObj: ConclusaoRatingPosServico = {
      notaFinalRating: notaRating,
      classificacaoRisco,
      capacidadeTomadaSugerida: capacidadeTomada,
      melhoriasAplicadas: melhoriasSelecionadas,
      parecerFinalTecnico: parecerTecnico,
      dataConclusao: now,
      analistaResponsavel,
    };
    const updatedRating: FichaRatingCredito = {
      ...(ratingData || {}),
      sociosCPF: ratingData?.sociosCPF || [],
      dadosCNPJ: ratingData?.dadosCNPJ || {},
      status: "aprovado",
      faseRating: "concluido",
      dataAtualizacao: now,
      observacoesAdm: observacoes,
      progressoPercentual: 100,
      conclusaoRating: conclusaoObj,
    };

    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, { fichaRatingCredito: sanitizeFirestoreData(updatedRating) });
      onLeadUpdated?.({ ...lead, fichaRatingCredito: updatedRating });
      setStatus("aprovado");
      showFeedback("Parecer Técnico e Nota de Rating emitidos com sucesso!");
    } catch (err: any) {
      console.error("Erro ao emitir parecer de rating:", err);
      showFeedback(`Erro ao salvar no Firestore: ${err?.message || "falha desconhecida"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWhatsAppPendencias = () => {
    const clientPhone = (lead.whatsapp || "").replace(/\D/g, "");
    if (!clientPhone) {
      window.alert("Este lead não possui número de WhatsApp cadastrado.");
      return;
    }

    const companyName = lead.razaoSocial || lead.nome || "Cliente";
    let message = `Olá, *${companyName}*! Aqui é da Mesa de Operações e Crédito da *PROSFEC*.\n\n`;
    message += "Estamos revisando a pasta de documentos da empresa para a estruturação do Dossiê de Rating Comercial.\n\n";
    if (pastaDocumentosUrl) {
      message += "Por favor, confirme se o link da pasta está atualizado e com permissão de acesso para nossa equipe.\n";
    } else {
      message += "Ainda precisamos do link da pasta de documentos (Google Drive, OneDrive ou Dropbox) com acesso liberado para nossa equipe.\n";
    }
    if (observacoes.trim()) {
      message += `\n*Orientação da análise:* ${observacoes.trim()}\n`;
    }
    message += "\nQualquer dúvida, estamos à disposição para auxiliar.";

    window.open(
      `https://api.whatsapp.com/send?phone=${clientPhone}&text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-6 text-left">
      <section
        className={`rounded-xl border p-5 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center gap-4 shadow-sm ${
          pastaDocumentosUrl
            ? "bg-emerald-50 border-emerald-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              pastaDocumentosUrl ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-600 block">
              Pasta de Documentos do Cliente
            </span>
            {pastaDocumentosUrl ? (
              <p className="text-xs font-bold text-emerald-900 truncate" title={pastaDocumentosUrl}>
                {pastaDocumentosUrl}
              </p>
            ) : (
              <p className="text-xs font-bold text-amber-900">
                Nenhum link de pasta informado pelo parceiro até o momento.
              </p>
            )}
          </div>
        </div>
        {pastaDocumentosUrl && (
          <a
            href={pastaDocumentosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir pasta
          </a>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-600">
            Passo 6 — Estruturação da Operação
          </span>
          <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            {subEtapasConcluidas}/{subEtapas.length} concluídas ({progressoPasso6}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.max(3, progressoPasso6)}%` }}
          />
        </div>
        {subEtapas.length === 0 ? (
          <p className="text-[11px] text-slate-500">Nenhum serviço de estruturação configurado para este lead.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subEtapas.map((item, index) => (
              <li key={item?.id || index} className="text-[11px] flex items-center gap-1.5 text-slate-700">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    item?.concluida ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className={item?.concluida ? "line-through text-slate-500" : ""}>
                  {item?.titulo || `Serviço ${index + 1}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <header className="bg-[#0A3D2E] text-white p-5 sm:p-6 rounded-xl shadow-sm border border-emerald-900/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono inline-flex items-center gap-1 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Mesa de Operações & Rating
            </span>
            <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
              Dossiê & Ficha de Rating de Crédito
            </h3>
            <p className="text-xs font-medium text-emerald-300 mt-1">{lead.razaoSocial || lead.nome}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleUnlock}
              disabled={saving}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-97 disabled:opacity-50 ${
                isUnlocked
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
              }`}
            >
              {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isUnlocked ? "Ficha Liberada" : "Liberar Ficha"}</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateWhatsAppPendencias}
              className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-97"
              title="Solicitar acesso ou correções na pasta via WhatsApp"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span>Cobrar Pendências WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      {saveFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 text-xs font-bold rounded-2xl flex items-center gap-2 ${
            saveFeedback.toLowerCase().includes("erro")
              ? "bg-rose-50 border border-rose-200 text-rose-900"
              : "bg-emerald-50 border border-emerald-200 text-emerald-900"
          }`}
        >
          {saveFeedback.toLowerCase().includes("erro") ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{saveFeedback}</span>
        </motion.div>
      )}

      <section className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider font-mono block">
              Parecer Técnico & Nota de Rating Pós-Aplicação de Serviços
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Preencha o veredito final da consultoria após a implementação das melhorias cadastrais e contábeis.
            </p>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase self-start sm:self-auto">
            {currentFase === "concluido" ? "Rating concluído" : "Em aplicação / análise"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Nota de Rating Atribuída</label>
            <select
              value={notaRating}
              onChange={(event) => setNotaRating(event.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-hidden transition-all"
            >
              {NOTAS_RATING_PRESETS.map((nota) => (
                <option key={nota} value={nota}>{nota}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Classificação de Risco</label>
            <select
              value={classificacaoRisco}
              onChange={(event) => setClassificacaoRisco(event.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-hidden transition-all"
            >
              <option value="Risco Mínimo (AAA/AA)">Risco Mínimo (AAA/AA)</option>
              <option value="Risco Baixo (A1/A2)">Risco Baixo (A1/A2)</option>
              <option value="Risco Moderado (B1/B2)">Risco Moderado (B1/B2)</option>
              <option value="Capacidade Expandida">Capacidade Expandida</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Capacidade de Tomada Sugerida (R$)</label>
            <input
              type="text"
              value={capacidadeTomada}
              onChange={(event) => setCapacidadeTomada(event.target.value)}
              placeholder="Ex: R$ 350.000,00"
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-hidden transition-all"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Melhorias e Intervenções Aplicadas no Perfil da Empresa
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {MELHORIAS_DISPONIVEIS.map((melhoria) => {
              const isChecked = melhoriasSelecionadas.includes(melhoria);
              return (
                <button
                  key={melhoria}
                  type="button"
                  onClick={() => handleToggleMelhoria(melhoria)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isChecked
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                    isChecked ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white"
                  }`}>
                    {isChecked && <Check className="w-3 h-3" />}
                  </span>
                  <span>{melhoria}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase">
            Síntese e Parecer Técnico Oficial do Analista
          </label>
          <textarea
            rows={4}
            value={parecerTecnico}
            onChange={(event) => setParecerTecnico(event.target.value)}
            placeholder="Descreva o parecer de crédito, a avaliação contábil e a recomendação de linhas bancárias..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl p-3 text-xs font-medium text-slate-800 outline-none leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Analista Técnico Responsável</label>
            <input
              type="text"
              value={analistaResponsavel}
              onChange={(event) => setAnalistaResponsavel(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            />
          </div>
          <div className="flex items-end justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSaveAdmReview}
              disabled={saving}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Salvar Rascunho
            </button>
            <button
              type="button"
              onClick={handleConcluirRating}
              disabled={saving}
              className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Concluir Rating & Emitir Parecer</span>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono block">
          Status Administrativo Geral do Lead
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status do Dossiê de Rating</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as FichaRatingCredito["status"])}
              className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="pendente">Pendente de envio da pasta</option>
              <option value="em_analise">Em Análise Técnica / Estruturação</option>
              <option value="ajuste_solicitado">Ajuste Solicitado</option>
              <option value="aprovado">Aprovado / Dossiê Concluído</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Observações e Orientações Técnicas
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Ex: Pasta recebida. Validando informações com a contabilidade..."
              className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveAdmReview}
            disabled={saving}
            className="px-5 py-2.5 bg-[#0A3D2E] hover:bg-[#072a20] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Informações do Rating</span>
          </button>
        </div>
      </section>
    </div>
  );
}
