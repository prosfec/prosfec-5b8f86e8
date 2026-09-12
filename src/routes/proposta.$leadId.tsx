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
  Send,
  Link2,
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

  const [links, setLinks] = useState<Record<string, string>>({});
  const [cadastro, setCadastro] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

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
          setLinks({ ...(json.proposta?.documentosCliente || {}) });
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

  const handleSalvar = async () => {
    setFormErro(null);
    const docsPayload: Record<string, string> = {};
    for (const [k, v] of Object.entries(links)) {
      const val = String(v || "").trim();
      if (val) docsPayload[k] = val;
    }
    const cadPayload: Record<string, string> = {};
    for (const [k, v] of Object.entries(cadastro)) {
      const val = String(v || "").trim();
      if (val) cadPayload[k] = val;
    }
    if (!Object.keys(docsPayload).length && !Object.keys(cadPayload).length) {
      setFormErro("Preencha ao menos um dado ou cole um link de documento antes de enviar.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch(`/api/public/proposta/${leadId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentos: docsPayload, cadastro: cadPayload }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFormErro(json?.error || "Não foi possível salvar as informações.");
      } else {
        setEnviado(true);
        setLinks({ ...(json.documentosCliente || docsPayload) });
        const salvos = json.cadastroSalvo || {};
        if (Object.keys(salvos).length) {
          setProposta((prev: any) =>
            prev
              ? {
                  ...prev,
                  cadastroCampos: (prev.cadastroCampos || []).filter((c: any) => !salvos[c.key]),
                }
              : prev,
          );
        }
      }
    } catch {
      setFormErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

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
  const campos: any[] = Array.isArray(proposta?.documentosCampos) ? proposta.documentosCampos : [];
  const camposCadastro: any[] = Array.isArray(proposta?.cadastroCampos)
    ? proposta.cadastroCampos
    : [];
  const acompanhamento: any = proposta?.acompanhamento || null;
  const subEtapas: any[] = Array.isArray(acompanhamento?.subEtapas)
    ? acompanhamento.subEtapas
    : [];
  const etapasLabels: string[] = Array.isArray(acompanhamento?.etapasLabels)
    ? acompanhamento.etapasLabels
    : [];
  const etapaAtual: number = Number(acompanhamento?.etapaAtual || 1) || 1;

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
              Estruturação da Operação & Melhoria de Perfil de Crédito
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
              Estruturação da Operação & Melhoria de Perfil de Crédito
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {proposta?.nomeEmpresa || "Sua empresa"}
              {proposta?.cnpj ? ` • ${proposta.cnpj}` : ""}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 text-left md:text-right shrink-0">
            <span className="text-[9px] uppercase font-black tracking-wider text-emerald-300 block">
              Progresso da Estruturação
            </span>
            <span className="text-base font-black text-white font-mono">
              {acompanhamento?.progresso?.concluidas || 0}/{acompanhamento?.progresso?.total || 0}{" "}
              concluídas ({acompanhamento?.progresso?.percentual || 0}%)
            </span>
          </div>
        </div>

        {/* Bloco 1 — Acompanhamento (somente leitura) */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              1
            </span>
            <div className="min-w-0">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-emerald-600" />
                Acompanhamento da Operação
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Andamento das ações técnicas executadas pela equipe PROSFEC.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
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
                    <span
                      className={`flex-1 min-w-[180px] text-xs font-semibold ${
                        sub.concluida ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {sub.titulo}
                    </span>
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

            {/* Situação da documentação */}
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

            {/* Linha do tempo das etapas */}
            {etapasLabels.length > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Linha do tempo da operação
                </span>
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
              </div>
            )}
          </div>
        </section>

        {/* Bloco 2 — Simulação (somente leitura) */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              2
            </span>
            <div className="min-w-0">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Simulação & Proposta de Linha Governamental
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
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Condições técnicas definidas pela equipe PROSFEC — apenas leitura.
              </p>

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

        {/* Bloco 3 — Serviços e pagamento */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              3
            </span>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
              Serviços e pagamento
            </h2>
          </div>

          {!temServicos ? (
            <div className="p-6 flex items-start gap-3">
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
            <div className="p-5 sm:p-6 space-y-3">
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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Total
                </span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {formatBRL(proposta?.total || 0)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Bloco 3 — Cadastro e documentação */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              3
            </span>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
              Completar Cadastro e Documentação
            </h2>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {camposCadastro.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Precisamos completar alguns dados do seu cadastro:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {camposCadastro.map((c: any) => (
                    <div key={c.key}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {c.label}
                      </label>
                      <input
                        type="text"
                        value={cadastro[c.key] || ""}
                        onChange={(e) =>
                          setCadastro((prev) => ({ ...prev, [c.key]: e.target.value }))
                        }
                        placeholder={c.placeholder || ""}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Envie seus documentos por link de nuvem (Google Drive, OneDrive ou Dropbox). Cole o
                endereço de cada documento no campo correspondente.
              </p>

              {campos.map((c: any) => (
                <div key={c.key}>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {c.label}
                  </label>
                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      inputMode="url"
                      value={links[c.key] || ""}
                      onChange={(e) => setLinks((prev) => ({ ...prev, [c.key]: e.target.value }))}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            {formErro && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formErro}</span>
              </div>
            )}

            {enviado && (
              <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Informações enviadas com sucesso. Você pode voltar a este link depois para
                  completar o que faltar.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSalvar}
              disabled={enviando}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {enviando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {enviando ? "Salvando..." : "Salvar Dados e Documentos"}
            </button>
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
