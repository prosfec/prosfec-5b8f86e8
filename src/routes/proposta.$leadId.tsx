// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Página pública de Proposta e Checkout do cliente final (acesso por link).
 */

import React, { useEffect, useState } from "react";
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
} from "lucide-react";

export const Route = createFileRoute("/proposta/$leadId")({
  head: () => ({
    meta: [
      { title: "Sua Proposta PROSFEC | Plano de Ação e Pagamento" },
      {
        name: "description",
        content:
          "Acesse seu plano de ação PROSFEC, realize o pagamento e envie a documentação necessária com segurança.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sua Proposta PROSFEC" },
      {
        property: "og:description",
        content: "Plano de ação, pagamento e envio de documentação em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropostaPublicaPage,
});

const formatBRL = (n: number) =>
  `R$ ${Number(n || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d)(?=,))/g, ".")}`;

function PropostaPublicaPage() {
  const { leadId } = Route.useParams();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [proposta, setProposta] = useState<any>(null);

  const [links, setLinks] = useState<Record<string, string>>({});
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

  const handleEnviarDocumentos = async () => {
    setFormErro(null);
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(links)) {
      const val = String(v || "").trim();
      if (val) payload[k] = val;
    }
    if (!Object.keys(payload).length) {
      setFormErro("Cole ao menos um link de documento antes de enviar.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch(`/api/public/proposta/${leadId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentos: payload }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFormErro(json?.error || "Não foi possível enviar os links.");
      } else {
        setEnviado(true);
        setLinks({ ...(json.documentosCliente || payload) });
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-[#0A3D2E] text-white">
        <div className="max-w-3xl mx-auto px-5 py-6 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <span className="block font-black tracking-[0.2em] text-sm uppercase">PROSFEC</span>
            <span className="block text-[11px] text-emerald-200/90 truncate">
              Proposta e plano de ação {proposta?.nomeEmpresa ? `• ${proposta.nomeEmpresa}` : ""}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        {/* Bloco 1 — Plano de ação */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              1
            </span>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
              Seu plano de ação
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
                  key={s.id || idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-800">{s.nome}</h3>
                    {s.descricao ? (
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.descricao}</p>
                    ) : null}
                  </div>
                  <span className="text-sm font-black text-emerald-700 font-mono shrink-0">
                    {formatBRL(s.valor)}
                  </span>
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

        {/* Bloco 2 — Pagamento */}
        {temServicos && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
                Pagamento
              </h2>
            </div>

            <div className="p-5 sm:p-6 space-y-3">
              {servicos.map((s: any, idx: number) => (
                <div
                  key={`pay-${s.id || idx}`}
                  className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-800">{s.nome}</h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatBRL(s.valor)}
                    </span>
                  </div>

                  {s.linkPagamento ? (
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
            </div>
          </section>
        )}

        {/* Bloco 3 — Documentação */}
        {temServicos && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                3
              </span>
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
                Envio da documentação
              </h2>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Envie seus documentos por link de nuvem (Google Drive, OneDrive ou Dropbox). Cole o
                endereço de cada documento no campo correspondente e confirme o envio.
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
                      onChange={(e) =>
                        setLinks((prev) => ({ ...prev, [c.key]: e.target.value }))
                      }
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              ))}

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
                    Documentação enviada com sucesso. Você pode voltar a este link depois para
                    completar o que faltar.
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleEnviarDocumentos}
                disabled={enviando}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {enviando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {enviando ? "Enviando..." : "Enviar Documentação"}
              </button>
            </div>
          </section>
        )}

        <footer className="text-center text-[11px] text-slate-400 pb-6 flex items-center justify-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          PROSFEC — Estruturação e Adequação de Crédito
        </footer>
      </main>
    </div>
  );
}

export default PropostaPublicaPage;
