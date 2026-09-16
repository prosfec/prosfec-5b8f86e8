// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Página pública de assinatura de contrato (Avulso ou Assessoria 12 meses).
 */

import React, { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import SignaturePad from "../components/SignaturePad";
import AssessoriaContractText from "../components/AssessoriaContractText";
import AvulsoContractText from "../components/AvulsoContractText";
import AvulsoServicoContractText from "../components/AvulsoServicoContractText";
import AditivoContractText from "../components/AditivoContractText";
import { Loader2, CheckCircle2, FileText, AlertTriangle, ShieldCheck } from "lucide-react";

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
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [docSelecionadoId, setDocSelecionadoId] = useState<string>("principal");

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [registro, setRegistro] = useState<any>(null);
  const [lidos, setLidos] = useState<string[]>([]);

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
          const lista = Array.isArray(json.documentos) ? json.documentos : [];
          setContrato(json.contrato);
          setDocumentos(lista);
          const pendente = lista.find((d: any) => !d.assinado);
          setDocSelecionadoId(String((pendente || lista[0])?.id || "principal"));
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

  const docAtual = useMemo(
    () => documentos.find((d) => String(d.id) === String(docSelecionadoId)) || documentos[0] || null,
    [documentos, docSelecionadoId]
  );

  const pendentes = useMemo(() => documentos.filter((d) => !d.assinado), [documentos]);
  const todosLidos = useMemo(
    () => pendentes.length > 0 && pendentes.every((d) => lidos.includes(String(d.id))),
    [pendentes, lidos]
  );
  const docAtualLido = !!docAtual && lidos.includes(String(docAtual.id));

  // Quando não há mais documentos pendentes, a tela mostra o recibo.
  useEffect(() => {
    if (documentos.length > 0 && pendentes.length === 0) setConcluido(true);
  }, [documentos.length, pendentes.length]);

  const marcarLeitura = (id: string, marcado: boolean) => {
    setLidos((prev) => (marcado ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };


  const handleAssinar = async () => {
    setFormErro(null);
    if (nome.trim().length < 5) return setFormErro("Informe o nome completo do responsável.");
    if (cpf.replace(/\D/g, "").length !== 11) return setFormErro("Informe um CPF válido.");
    if (!todosLidos)
      return setFormErro("Abra e confirme a leitura de todos os documentos para assinar.");
    if (!assinatura) return setFormErro("Desenhe sua assinatura no quadro abaixo.");

    const idsPendentes = pendentes.map((d) => String(d.id));

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
          contratoIds: idsPendentes.length > 0 ? idsPendentes : ["principal"],
          dispositivo: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFormErro(json?.error || "Não foi possível registrar a assinatura.");
      } else {
        const reg = json?.registro || null;
        setRegistro(reg);
        setConcluido(true);
        setDocumentos((prev) =>
          prev.map((d) =>
            idsPendentes.includes(String(d.id))
              ? {
                  ...d,
                  assinado: true,
                  status: "assinado",
                  assinaturaNome: reg?.nome,
                  assinaturaData: reg?.data,
                  assinaturaIp: reg?.ip,
                }
              : d
          )
        );
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
  const tipoDoc = String(docAtual?.tipo || (isAvulso ? "principal_avulso" : "assessoria"));
  const isPrincipal = tipoDoc === "principal_avulso" || tipoDoc === "assessoria";
  const recibo =
    registro ||
    (docAtual?.assinado
      ? {
          nome: docAtual.assinaturaNome,
          cpf: docAtual.assinaturaCpf,
          data: docAtual.assinaturaData,
          ip: docAtual.assinaturaIp,
          dispositivo: docAtual.assinaturaDispositivo,
        }
      : null);

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

        {documentos.length > 1 && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Documentos para assinatura
            </p>
            <p className="text-xs text-slate-500">
              Abra cada documento, confirme a leitura e assine uma única vez no final da página.
            </p>
            <div className="space-y-2">
              {documentos.map((d) => {
                const ativo = String(d.id) === String(docAtual?.id);
                const lido = lidos.includes(String(d.id));
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDocSelecionadoId(String(d.id))}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      ativo ? "border-[#0A3D2E] bg-emerald-50/50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900 truncate">{d.titulo}</span>
                      {Number(d.valorTotal || 0) > 0 && (
                        <span className="block text-xs text-slate-500">{formatBRL(d.valorTotal)}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {!d.assinado && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                            lido ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {lido ? "Lido" : "Não lido"}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                          d.assinado ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {d.assinado ? "Assinado" : "Pendente"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}


        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          {isPrincipal ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documento</p>
                <p className="text-sm font-medium text-slate-900">
                  {tipoDoc === "aditivo" ? "Termo Aditivo" : "Contrato Avulso"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Serviços</p>
                <p className="text-sm font-medium text-slate-900">{(docAtual?.servicos || []).length}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</p>
                <p className="text-sm font-medium text-slate-900">{formatBRL(docAtual?.valorTotal)}</p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <FileText className="w-4 h-4" /> Termos
            </p>
            {tipoDoc === "avulso" ? (
              <AvulsoServicoContractText
                razaoSocial={contrato?.nomeEmpresa}
                cnpj={contrato?.cnpj}
                endereco={contrato?.endereco}
                representante={nome}
                representanteCpf={cpf}
                servicos={docAtual?.servicos}
                valorTotal={docAtual?.valorTotal}
                numeroContrato={docAtual?.id}
                dataGeracao={docAtual?.dataCriacao}
              />
            ) : tipoDoc === "aditivo" ? (
              <AditivoContractText
                razaoSocial={contrato?.nomeEmpresa}
                cnpj={contrato?.cnpj}
                endereco={contrato?.endereco}
                representante={nome}
                representanteCpf={cpf}
                servicos={docAtual?.servicos}
                valorTotal={docAtual?.valorTotal}
                numeroContrato={docAtual?.id}
                contratoOrigemId={docAtual?.contratoOrigemId}
                dataGeracao={docAtual?.dataCriacao}
              />
            ) : isAvulso ? (
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

          {docAtual && !docAtual.assinado && (
            <label className="flex items-start gap-3 border-t border-slate-100 pt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={docAtualLido}
                onChange={(e) => marcarLeitura(String(docAtual.id), e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#0A3D2E] cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-700">
                Li e concordo com este documento
              </span>
            </label>
          )}
        </section>



        {concluido && pendentes.length === 0 ? (
          <section className="bg-white rounded-xl shadow-sm border border-emerald-200 p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-extrabold text-slate-900">
              {documentos.length > 1 ? "Documentos assinados com sucesso" : "Contrato assinado com sucesso"}
            </h2>
            <p className="text-sm text-slate-500">Aguarde o contato da nossa equipe.</p>
            {documentos.length > 1 && (
              <ul className="text-sm text-slate-600 space-y-1">
                {documentos.map((d) => (
                  <li key={d.id}>• {d.titulo}</li>
                ))}
              </ul>
            )}

            {recibo && (
              <div className="mt-4 text-left bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signatário</p>
                  <p className="text-sm font-medium text-slate-900">{recibo.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">CPF</p>
                  <p className="text-sm font-medium text-slate-900 font-mono">{maskCpf(recibo.cpf)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Data / Hora</p>
                  <p className="text-sm font-medium text-slate-900">
                    {recibo.data ? new Date(recibo.data).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">IP capturado</p>
                  <p className="text-sm font-medium text-slate-900 font-mono">{recibo.ip || "não capturado"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dispositivo</p>
                  <p className="text-xs text-slate-600 break-all">{recibo.dispositivo || "—"}</p>
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

            {!todosLidos && (
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Abra e confirme a leitura de todos os documentos para assinar.
              </p>
            )}

            {formErro && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {formErro}
              </p>
            )}

            <button
              type="button"
              onClick={handleAssinar}
              disabled={enviando || !todosLidos}
              className="w-full px-4 py-3 rounded-lg bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {enviando
                ? "Registrando assinatura..."
                : pendentes.length > 1
                  ? `Assinar todos os documentos (${pendentes.length})`
                  : "Assinar contrato"}
            </button>

          </section>
        )}
      </div>
    </main>
  );
}
