// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Página pública de Proposta e Checkout do cliente final (acesso por link).
 */

import React, { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Loader2,
  CheckCircle2,
  FileText,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  Clock,
  Calculator,
  Lock,
  ListChecks,
  Circle,
  FolderCheck,
} from "lucide-react";
import { calculateAmortizationSchedule } from "@/utils/amortizationSchedule";

export const Route = createFileRoute("/proposta/$leadId")({
  head: () => ({
    meta: [
      { title: "Sua Proposta PROSFEC | Estruturação da Operação" },
      {
        name: "description",
        content:
          "Acesse sua proposta PROSFEC: simulação de linha governamental, pagamento dos serviços e envio da documentação.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sua Proposta PROSFEC" },
      {
        property: "og:description",
        content: "Simulação, pagamento e envio de documentação em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropostaPublicaPage,
});

const formatBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PropostaPublicaPage() {
  const { leadId } = Route.useParams();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [proposta, setProposta] = useState<any>(null);


  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/proposta/${leadId}`);
        const json = await r.json().catch(() => ({}));
        if (!ativo) return;
        if (!r.ok) {
          setErro(json?.error || "Proposta não encontrada.");
        } else {
          setProposta(json.proposta);
        }
      } catch {
        if (ativo) setErro("Não foi possível carregar a proposta.");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [leadId]);

  const simulacao = proposta?.simulacao || null;

  const schedule = useMemo(() => {
    if (!simulacao || !simulacao.valorDesejado) return null;
    return calculateAmortizationSchedule({
      valor: simulacao.valorDesejado,
      taxaAnual: simulacao.taxaAnual,
      carenciaMeses: simulacao.carenciaMeses,
      amortizacaoMeses: simulacao.amortizacaoMeses,
      sistema: simulacao.sistemaAmortizacao,
      pagarJurosCarencia: simulacao.pagarJurosCarencia,
    });
  }, [simulacao]);


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-bold">Carregando sua proposta...</span>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-base font-black text-slate-900 uppercase tracking-wider">
            Proposta indisponível
          </h1>
          <p className="text-sm text-slate-500">{erro}</p>
          <p className="text-xs text-slate-400">
            Fale com o consultor responsável para receber um novo link.
          </p>
        </div>
      </div>
    );
  }

  const servicos: any[] = Array.isArray(proposta?.servicos) ? proposta.servicos : [];
  const temServicos = servicos.length > 0;
  const acompanhamento: any = proposta?.acompanhamento || null;
  const subEtapas: any[] = Array.isArray(acompanhamento?.subEtapas)
    ? acompanhamento.subEtapas
    : [];
  const etapasLabels: string[] = Array.isArray(acompanhamento?.etapasLabels)
    ? acompanhamento.etapasLabels
    : [];
  const etapaAtual: number = Number(acompanhamento?.etapaAtual || 1) || 1;
  const laudos: any[] = Array.isArray(proposta?.laudos) ? proposta.laudos : [];
  const laudosAntes = laudos.filter((l: any) => l.relatorioPdfUrl);
  const laudosDepois = laudos.filter((l: any) => l.relatorioDepoisPdfUrl);
  const contratoAssinado = proposta?.contratoAssinado === true;
  const contratoAssinadoData = proposta?.contratoAssinadoData || null;
  const creditoRecusado = proposta?.creditoRecusado === true;
  const valorAprovado = Number(proposta?.valorAprovado || 0) || 0;
  const aptoMesaCredito = proposta?.aptoMesaCredito === true;
  const docsCampos: any[] = Array.isArray(proposta?.documentosCampos)
    ? proposta.documentosCampos
    : [];
  const docsCliente: Record<string, string> =
    proposta?.documentosCliente && typeof proposta.documentosCliente === "object"
      ? proposta.documentosCliente
      : {};
  const dossie: any[] = Array.isArray(proposta?.dossieDocumental)
    ? proposta.dossieDocumental
    : [];
  const dossieGrupos: Array<{ grupo: string; itens: any[] }> = [];
  for (const item of dossie) {
    const nomeGrupo = String(item?.grupo || "Documentos");
    let bloco = dossieGrupos.find((g) => g.grupo === nomeGrupo);
    if (!bloco) {
      bloco = { grupo: nomeGrupo, itens: [] };
      dossieGrupos.push(bloco);
    }
    bloco.itens.push(item);
  }
  const docsRecebidos =
    dossie.length > 0
      ? Number(proposta?.dossieRecebidos || 0)
      : docsCampos.filter((d: any) => !!docsCliente[d?.key]).length;
  const docsTotal =
    dossie.length > 0
      ? Number(proposta?.dossieTotalObrigatorios || 0)
      : docsCampos.length;
  const progressoDocs =
    dossie.length > 0
      ? Number(proposta?.dossieProgresso || 0)
      : docsCampos.length > 0
        ? Math.round((docsRecebidos / docsCampos.length) * 100)
        : 0;

  const dataHoraBR = (iso: any) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      return "";
    }
  };

  const LaudoCard = ({ laudo, tipo }: { laudo: any; tipo: "antes" | "depois" }) => {
    const url = tipo === "antes" ? laudo.relatorioPdfUrl : laudo.relatorioDepoisPdfUrl;
    const nome = tipo === "antes" ? laudo.relatorioPdfNome : laudo.relatorioDepoisPdfNome;
    return (
      <div className="p-4 border border-slate-200 rounded-2xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-extrabold text-slate-800 truncate">
            {laudo.documentoNome || "Relatório de auditoria"}
          </h3>
          <span className="block text-[11px] text-slate-500 font-mono">
            {laudo.documentoMascarado || "—"}
            {laudo.dataConsulta
              ? ` • ${new Date(laudo.dataConsulta).toLocaleDateString("pt-BR")}`
              : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-[11px] font-black uppercase tracking-wider transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            Visualizar
          </a>
          <a
            href={url}
            download={nome || undefined}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all"
          >
            Baixar PDF
          </a>
        </div>
      </div>
    );
  };


  const ReadField = ({ label, value }: { label: string; value: string }) => (
    <div className="space-y-1">
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 font-mono flex items-center justify-between gap-2">
        <span className="truncate">{value}</span>
        <Lock className="w-3 h-3 text-slate-400 shrink-0" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-[#0A3D2E] text-white">
        <div className="max-w-4xl mx-auto px-5 py-6 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <span className="block font-black tracking-[0.2em] text-sm uppercase">PROSFEC</span>
            <span className="block text-[11px] text-emerald-200/90 truncate">
              {aptoMesaCredito
                ? "Ficha Documental & Preparação para Mesa de Crédito"
                : "Estruturação da Operação & Melhoria de Perfil de Crédito"}
              {proposta?.nomeEmpresa ? ` • ${proposta.nomeEmpresa}` : ""}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-8 space-y-6">
        {/* Cabeçalho no padrão do Passo 6 */}
        <div className="bg-[#0A3D2E] text-white p-5 sm:p-6 rounded-2xl border border-emerald-800 shadow-sm grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-center gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                Acompanhamento da Operação
              </span>
              {proposta?.linhaCredito?.badge ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  {proposta.linhaCredito.badge}
                </span>
              ) : null}
            </div>
            <h1 className="font-display font-extrabold text-lg sm:text-xl text-white">
              {aptoMesaCredito
                ? "Ficha Documental & Preparação para Mesa de Crédito"
                : "Estruturação da Operação & Melhoria de Perfil de Crédito"}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {proposta?.nomeEmpresa || "Sua empresa"}
              {proposta?.cnpj ? ` • ${proposta.cnpj}` : ""}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-left md:text-right shrink-0">
            <span className="text-[9px] uppercase font-black tracking-wider text-emerald-300 block">
              {aptoMesaCredito
                ? "Progresso do Recolhimento Documental"
                : "Progresso da Estruturação"}
            </span>
            <span className="text-base font-black text-white font-mono">
              {aptoMesaCredito
                ? `${docsRecebidos}/${docsTotal} recebidos (${progressoDocs}%)`
                : `${acompanhamento?.progresso?.concluidas || 0}/${acompanhamento?.progresso?.total || 0} concluídas (${acompanhamento?.progresso?.percentual || 0}%)`}
            </span>
          </div>
        </div>

        {/* Selo — Apto para Mesa de Crédito */}
        {proposta?.aptoMesaCredito === true && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A3D2E] via-[#0d5240] to-[#00A86B] p-5 sm:p-6 text-white shadow-lg">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-emerald-200" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <span className="text-[10px] bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest text-emerald-100 inline-block">
                  Parabéns
                </span>
                <h2 className="font-display font-extrabold text-base sm:text-lg leading-tight">
                  Sua empresa está apta para a análise de crédito bancária
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                  A estrutura da sua empresa está em conformidade e pronta para iniciar na mesa de
                  crédito assim que as documentações forem recolhidas.
                </p>
                {proposta?.aptoMesaCreditoData && (
                  <span className="text-[10px] text-emerald-200/70 font-bold uppercase tracking-wider block pt-1">
                    Confirmado em {new Date(proposta.aptoMesaCreditoData).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Linha do tempo da operação (visão geral) */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <ListChecks className="w-4 h-4" />
            </span>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
              Linha do Tempo da Operação
            </h2>
          </div>

          <div className="p-5 sm:p-6">
            {etapasLabels.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                A esteira da sua operação será exibida aqui.
              </div>
            ) : (
              <ol className="space-y-1.5">
                {etapasLabels.map((label: string, i: number) => {
                  const num = i + 1;
                  const concluida = num < etapaAtual;
                  const atual = num === etapaAtual;
                  return (
                    <li key={label} className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                          concluida
                            ? "bg-emerald-600 text-white"
                            : atual
                              ? "bg-amber-400 text-slate-900"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}
                      >
                        {num}
                      </span>
                      <span
                        className={`text-[11px] ${
                          atual
                            ? "font-black text-slate-900"
                            : concluida
                              ? "text-slate-500"
                              : "text-slate-400"
                        }`}
                      >
                        {label}
                        {atual ? " • em andamento" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* Bloco 1 — Diagnóstico técnico & escopo de serviços com preços */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              1
            </span>
            <div className="min-w-0">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Diagnóstico 360 & Plano de Ação
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Laudos oficiais da auditoria e serviços indicados pela mesa técnica.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Laudos e consultas efetuadas
              </span>
              {laudosAntes.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Os laudos da auditoria serão disponibilizados aqui assim que forem emitidos.
                </div>
              ) : (
                laudosAntes.map((l: any) => (
                  <LaudoCard key={`antes-${l.id}`} laudo={l} tipo="antes" />
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {aptoMesaCredito
                  ? "Plano de ação indicado"
                  : "Serviços recomendados e investimento"}
              </span>

              {aptoMesaCredito ? (
                <div className="flex items-start gap-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-900">
                      Sem necessidade de serviços de estruturação
                    </h3>
                    <p className="text-xs text-emerald-800/80 mt-1">
                      O diagnóstico confirmou que sua empresa já está em conformidade. O próximo
                      passo é apenas o recolhimento e a validação da documentação (Etapa 4).
                    </p>
                  </div>
                </div>
              ) : !temServicos ? (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Proposta em preparação</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Nossa equipe está finalizando seu plano de ação. Assim que estiver pronto, os
                      serviços e valores aparecerão aqui neste mesmo link.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {servicos.map((s: any, idx: number) => (
                    <div
                      key={`pay-${s.id || idx}`}
                      className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h3 className="text-xs font-extrabold text-slate-800">{s.nome}</h3>
                        {s.descricao ? (
                          <p className="text-[11px] text-slate-500 mt-0.5">{s.descricao}</p>
                        ) : null}
                        <span className="text-[11px] text-emerald-700 font-black font-mono">
                          {formatBRL(s.valor)}
                        </span>
                      </div>

                      {s.pago ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-xl shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          Pago
                        </span>
                      ) : !contratoAssinado ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-3 py-2 rounded-xl shrink-0 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                          Pagamento liberado após a assinatura
                        </span>
                      ) : s.linkPagamento ? (
                        <a
                          href={s.linkPagamento}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0"
                        >
                          <CreditCard className="w-4 h-4" />
                          Realizar Pagamento
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic shrink-0">
                          Pagamento combinado com a equipe
                        </span>
                      )}
                    </div>
                  ))}

                  {!contratoAssinado && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Os pagamentos são liberados após a assinatura eletrônica do contrato (Etapa 2).
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Total
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {formatBRL(proposta?.total || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Bloco 2 — Assinatura eletrônica do contrato */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              2
            </span>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Assinatura do Contrato
            </h2>
          </div>

          <div className="p-5 sm:p-6">
            {contratoAssinado ? (
              <div className="flex items-start gap-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-emerald-900">
                    Contrato assinado digitalmente
                  </h3>
                  <p className="text-xs text-emerald-800/80 mt-1">
                    {contratoAssinadoData
                      ? `Confirmado em ${dataHoraBR(contratoAssinadoData)}.`
                      : "Assinatura confirmada."}{" "}
                    Os pagamentos dos serviços já estão liberados na Etapa 1.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-amber-900">Assinatura pendente</h3>
                  <p className="text-xs text-amber-800/80 mt-1">
                    Assine o contrato eletronicamente para liberar os pagamentos e iniciar a
                    execução dos serviços.
                  </p>
                </div>
                <a
                  href={`/contrato/${leadId}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0A3D2E] hover:bg-[#00A86B] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0"
                >
                  <FileText className="w-4 h-4" />
                  Assinar Contrato Online
                </a>
              </div>
            )}
          </div>
        </section>


        {/* Bloco 4 — Execução dos serviços & documentação */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              4
            </span>
            <div className="min-w-0">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-emerald-600" />
                {aptoMesaCredito
                  ? "Evolução do Recolhimento Documental"
                  : "Execução dos Serviços & Documentação"}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {aptoMesaCredito
                  ? "Acompanhe a entrega e a validação dos documentos da sua empresa."
                  : "Andamento das ações técnicas executadas pela equipe PROSFEC."}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {aptoMesaCredito ? (
              <>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-[#00A86B] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, progressoDocs)}%` }}
                  />
                </div>

                <div className="space-y-2.5">
                  {docsCampos.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      A lista de documentos será publicada aqui pela equipe.
                    </div>
                  ) : (
                    docsCampos.map((d: any) => {
                      const enviado = !!docsCliente[d.key];
                      return (
                        <div
                          key={`doc-${d.key}`}
                          className={`flex flex-wrap items-center gap-3 p-3.5 rounded-2xl border ${
                            enviado
                              ? "bg-emerald-50/40 border-emerald-200/80"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          {enviado ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className="flex-1 min-w-[180px] text-xs font-semibold text-slate-800">
                            {d.label}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shrink-0 ${
                              enviado
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {enviado ? "Recebido" : "Pendente"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-[#00A86B] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, acompanhamento?.progresso?.percentual || 0)}%` }}
                  />
                </div>

                {subEtapas.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    As ações de estruturação estão sendo definidas pela equipe.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {subEtapas.map((sub: any, idx: number) => (
                      <div
                        key={`sub-${idx}`}
                        className={`flex flex-wrap items-center gap-3 p-3.5 rounded-2xl border ${
                          sub.concluida
                            ? "bg-emerald-50/40 border-emerald-200/80"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        {sub.concluida ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div className="flex-1 min-w-[180px]">
                          <span
                            className={`block text-xs font-semibold ${
                              sub.concluida ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          >
                            {sub.titulo}
                          </span>
                          {sub.descricao ? (
                            <span className="block text-[11px] text-slate-500 mt-0.5 whitespace-pre-line">
                              {sub.descricao}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {sub.valor > 0 && (
                            <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {formatBRL(sub.valor)}
                            </span>
                          )}
                          {sub.porDemanda ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-800 border-indigo-200">
                              Contratado por demanda
                            </span>
                          ) : sub.semCustoInicial ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg border bg-blue-50 text-blue-800 border-blue-200">
                              Sem custo inicial
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${
                                sub.pago
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {sub.pago ? "Pago" : "Aguardando pagamento"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FolderCheck className="w-4 h-4 text-[#00A86B]" />
                Documentação
              </span>
              <span className="text-[11px] font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl border border-slate-200">
                {acompanhamento?.documentacao?.fase || "Aguardando documentos"}
              </span>
              <span className="text-[11px] font-extrabold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                {acompanhamento?.documentacao?.aprovados || 0} aprovado(s)
              </span>
              {(acompanhamento?.documentacao?.rejeitados || 0) > 0 && (
                <span className="text-[11px] font-extrabold bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200">
                  {acompanhamento.documentacao.rejeitados} aguardando reenvio
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Bloco 5 — Simulação de elegibilidade */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              5
            </span>
            <div className="min-w-0">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Simulação de Elegibilidade
                {simulacao?.creditLineCode ? ` (${simulacao.creditLineCode})` : ""}
              </h2>
              {simulacao?.creditLineName ? (
                <p className="text-[11px] text-[#00A86B] font-bold mt-0.5">
                  {simulacao.creditLineName}
                </p>
              ) : null}
            </div>
          </div>

          {!simulacao || !schedule ? (
            <div className="p-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black text-slate-800">Simulação em preparação</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Nossa equipe está finalizando a configuração da sua operação de crédito. Assim
                  que estiver pronta, os valores aparecerão aqui neste mesmo link.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong className="font-black uppercase tracking-wider">Aviso importante:</strong>{" "}
                  esta simulação representa uma análise técnica de elegibilidade e capacidade
                  estimada, não constituindo aprovação prévia de crédito. Os valores exatos de
                  crédito liberado, taxas e prazos dependem da deliberação final da instituição
                  financeira concedente.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <ReadField label="Valor desejado" value={formatBRL(simulacao.valorDesejado)} />
                <ReadField label="Taxa de juros anual" value={`${simulacao.taxaAnual}% a.a.`} />
                <ReadField
                  label="Sistema de amortização"
                  value={simulacao.sistemaAmortizacao === "PRICE" ? "PRICE (Constante)" : "SAC (Decrescente)"}
                />
                <ReadField label="Carência" value={`${simulacao.carenciaMeses} meses`} />
                <ReadField label="Amortização" value={`${simulacao.amortizacaoMeses} meses`} />
                <ReadField
                  label="Prazo total"
                  value={`${(simulacao.carenciaMeses || 0) + (simulacao.amortizacaoMeses || 0)} meses`}
                />
              </div>

              <div className="bg-[#0A3D2E] text-white p-6 rounded-2xl grid grid-cols-2 gap-4 shadow-md">
                <div>
                  <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider">
                    Parcela Inicial
                  </span>
                  <div className="text-xl font-black font-mono">
                    {formatBRL(schedule.parcelaInicial)}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider">
                    Parcela Final
                  </span>
                  <div className="text-xl font-black font-mono">
                    {formatBRL(schedule.parcelaFinal)}
                  </div>
                </div>
                <div className="col-span-2 border-t border-emerald-800/80 pt-3 flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div>
                    <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider block">
                      Total de Juros Estimados
                    </span>
                    <div className="text-sm font-bold font-mono text-emerald-300">
                      {formatBRL(schedule.totalJuros)}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[9px] text-emerald-200 uppercase font-black tracking-wider block">
                      Custo Total (Amortização + Juros)
                    </span>
                    <div className="text-xl font-black font-mono text-white">
                      {formatBRL(schedule.totalPago)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 max-h-72 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase text-slate-500">
                      <th className="p-2 text-left">Mês</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-right">Amortização</th>
                      <th className="p-2 text-right">Juros</th>
                      <th className="p-2 text-right">Parcela</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.rows.map((row: any) => (
                      <tr key={row.mes} className="border-b border-slate-100/50">
                        <td className="p-2 font-mono">Mês {row.mes}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              row.tipo === "Carência"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {row.tipo}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {row.amortizacao > 0 ? formatBRL(row.amortizacao) : "-"}
                        </td>
                        <td className="p-2 text-right font-mono">{formatBRL(row.juros)}</td>
                        <td className="p-2 text-right font-black font-mono text-[#0A3D2E]">
                          {formatBRL(row.parcela)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Bloco 6 — Resultado da estruturação */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              6
            </span>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-emerald-600" />
              {aptoMesaCredito ? "Validação Documental" : "Resultado da Estruturação"}
            </h2>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {aptoMesaCredito ? (
              <div className="flex items-start gap-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 leading-relaxed">
                  A documentação da sua empresa foi validada e aceita pela Mesa de Operações
                  PROSFEC e segue para a análise de crédito bancária.
                </p>
              </div>
            ) : laudosDepois.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                O comparativo do resultado será publicado após a aplicação dos serviços.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Antes da estruturação
                  </span>
                  {laudosAntes.length === 0 ? (
                    <div className="text-center py-5 text-[11px] text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Sem laudo inicial disponível.
                    </div>
                  ) : (
                    laudosAntes.map((l: any) => (
                      <LaudoCard key={`cmp-antes-${l.id}`} laudo={l} tipo="antes" />
                    ))
                  )}
                </div>
                <div className="space-y-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Depois da estruturação
                  </span>
                  {laudosDepois.map((l: any) => (
                    <LaudoCard key={`cmp-depois-${l.id}`} laudo={l} tipo="depois" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bloco 7 — Desfecho da mesa de crédito */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              7
            </span>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Desfecho da Mesa de Crédito
            </h2>
          </div>

          <div className="p-5 sm:p-6">
            {creditoRecusado ? (
              <div className="flex items-start gap-3 bg-rose-50/70 border border-rose-200 rounded-2xl p-4">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black text-rose-900">Operação não aprovada</h3>
                  <p className="text-xs text-rose-800/80 mt-1">
                    A instituição financeira não aprovou a operação neste momento. Fale com o
                    consultor responsável para conhecer as alternativas e os próximos passos.
                  </p>
                </div>
              </div>
            ) : valorAprovado > 0 ? (
              <div className="bg-[#0A3D2E] text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-300 block">
                    Crédito aprovado
                  </span>
                  <span className="text-2xl font-black font-mono">{formatBRL(valorAprovado)}</span>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-300 shrink-0" />
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600">
                  Operação em análise junto às instituições financeiras. O resultado será publicado
                  aqui neste mesmo link.
                </p>
              </div>
            )}
          </div>
        </section>


        <footer className="text-center text-[11px] text-slate-400 pb-6 flex items-center justify-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          PROSFEC — Estruturação e Adequação de Crédito
        </footer>
      </main>
    </div>
  );
}

export default PropostaPublicaPage;
