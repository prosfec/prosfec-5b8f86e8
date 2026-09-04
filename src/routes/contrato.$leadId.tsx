// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Página pública de assinatura de contrato (Avulso ou Assessoria 12 meses).
 */

import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import SignaturePad from "../components/SignaturePad";
import AssessoriaContractText from "../components/AssessoriaContractText";
import AvulsoContractText from "../components/AvulsoContractText";
import { Loader2, CheckCircle2, FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/contrato/$leadId")({
  head: () => ({
    meta: [
      { title: "Assinatura de Contrato | PROSFEC" },
      { name: "description", content: "Assine digitalmente o contrato de prestação de serviços PROSFEC de forma segura." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Assinatura de Contrato | PROSFEC" },
      { property: "og:description", content: "Assine digitalmente o contrato de prestação de serviços PROSFEC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContratoPublicoPage,
});

const formatCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const formatBRL = (n: number) =>
  `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;

const maskCpf = (v?: string) => {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length !== 11) return v || "—";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};


function ContratoPublicoPage() {
  const { leadId } = Route.useParams();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [contrato, setContrato] = useState<any>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [registro, setRegistro] = useState<any>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/contrato/${leadId}`);
        const json = await r.json().catch(() => ({}));
        if (!ativo) return;
        if (!r.ok) {
          setErro(json?.error || "Contrato não encontrado.");
        } else {
          setContrato(json.contrato);
          setConcluido(!!json.contrato?.contratoAssinado);
          setNome(json.contrato?.nomeContato || "");
        }
      } catch {
        if (ativo) setErro("Não foi possível carregar o contrato.");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [leadId]);

  const handleAssinar = async () => {
    setFormErro(null);
    if (nome.trim().length < 5) return setFormErro("Informe o nome completo do responsável.");
    if (cpf.replace(/\D/g, "").length !== 11) return setFormErro("Informe um CPF válido.");
    if (!assinatura) return setFormErro("Desenhe sua assinatura no quadro abaixo.");

    setEnviando(true);
    try {
      let ip = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        ip = ipJson?.ip || "";
      } catch {
        ip = "";
      }

      const r = await fetch(`/api/public/contrato/${leadId}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpf.replace(/\D/g, ""),
          assinatura,
          ip,
          dispositivo: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFormErro(json?.error || "Não foi possível registrar a assinatura.");
      } else {
        setRegistro(json?.registro || null);
        setConcluido(true);
      }
    } catch {
      setFormErro("Erro de conexão ao registrar a assinatura.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#0A3D2E]" />
      </main>
    );
  }

  if (erro) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-md text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h1 className="text-lg font-extrabold text-slate-900">Contrato indisponível</h1>
          <p className="text-sm text-slate-500">{erro}</p>
        </div>
      </main>
    );
  }

  const isAvulso = String(contrato?.modeloContratacao || "").toLowerCase() === "avulso";

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">PROSFEC</span>
          <h1 className="text-2xl font-extrabold text-slate-900">Contrato de Prestação de Serviços</h1>
          <p className="text-sm text-slate-500">
            {contrato?.nomeEmpresa} {contrato?.cnpj ? `— CNPJ ${contrato.cnpj}` : ""}
          </p>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modelo</p>
              <p className="text-sm font-medium text-slate-900">{isAvulso ? "Avulso" : "Assessoria Mensal"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plano</p>
              <p className="text-sm font-medium text-slate-900">{contrato?.planoEscolhido || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Investimento</p>
              <p className="text-sm font-medium text-slate-900">
                {isAvulso ? "Sob consulta" : `${formatBRL(contrato?.valorMensalidade)}/mês`}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <FileText className="w-4 h-4" /> Termos
            </p>
            {isAvulso ? (
              <AvulsoContractText
                razaoSocial={contrato?.nomeEmpresa}
                cnpj={contrato?.cnpj}
                endereco={contrato?.endereco}
                representante={nome}
                representanteCpf={cpf}
              />
            ) : (
              <AssessoriaContractText
                leadId={leadId}
                razaoSocial={contrato?.nomeEmpresa}
                cnpj={contrato?.cnpj}
                endereco={contrato?.endereco}
                planoEscolhido={contrato?.planoEscolhido}
                valorMensalidade={contrato?.valorMensalidade}
                representante={nome}
                representanteCpf={cpf}
                assinado={concluido}
                assinaturaData={registro?.data || contrato?.contratoAssinadoData}
                assinaturaIp={registro?.ip}
              />
            )}
          </div>
        </section>

        {concluido ? (
          <section className="bg-white rounded-xl shadow-sm border border-emerald-200 p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-extrabold text-slate-900">Contrato assinado com sucesso</h2>
            <p className="text-sm text-slate-500">Aguarde o contato da nossa equipe.</p>
            {registro && (
              <div className="mt-4 text-left bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signatário</p>
                  <p className="text-sm font-medium text-slate-900">{registro.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">CPF</p>
                  <p className="text-sm font-medium text-slate-900 font-mono">{maskCpf(registro.cpf)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Data / Hora</p>
                  <p className="text-sm font-medium text-slate-900">
                    {registro.data ? new Date(registro.data).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">IP capturado</p>
                  <p className="text-sm font-medium text-slate-900 font-mono">{registro.ip || "não capturado"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dispositivo</p>
                  <p className="text-xs text-slate-600 break-all">{registro.dispositivo || "—"}</p>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nome completo do responsável
                </label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none"
                  placeholder="Nome como consta no documento"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  CPF
                </label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className="w-full bg-slate-50/50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none font-mono"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Assinatura</p>
              <SignaturePad onSave={(data: string) => setAssinatura(data)} onClear={() => setAssinatura("")} />
            </div>

            {formErro && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {formErro}
              </p>
            )}

            <button
              type="button"
              onClick={handleAssinar}
              disabled={enviando}
              className="w-full px-4 py-3 rounded-lg bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-60 text-white text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {enviando ? "Registrando assinatura..." : "Assinar contrato"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
