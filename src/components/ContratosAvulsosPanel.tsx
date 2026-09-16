// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Painel de Contratos Avulsos e Termos Aditivos do lead (Passo 4 do Workspace).
 * Gera documentos na coleção "contratos", congelando nome, valor, descrição e
 * cláusulas de cada serviço na versão vigente do catálogo.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { FileText, Plus, Send, Ban, ShieldCheck, Loader2, Copy, Check } from "lucide-react";
import {
  CLAUSULA_GENERICA_AVULSO,
  buildServiceTemplateId,
  normalizeServiceClauses,
} from "../utils/serviceUtils";

const brl = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_assinatura: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700",
  aguardando_assinatura: "bg-amber-100 text-amber-800",
  assinado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-700",
};

interface Props {
  lead: any;
  catalogServices: any[];
}

export default function ContratosAvulsosPanel({ lead, catalogServices }: Props) {
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [valores, setValores] = useState<Record<string, number>>({});
  const [linkCopiado, setLinkCopiado] = useState(false);

  const contratoLink =
    typeof window !== "undefined" ? `${window.location.origin}/contrato/${lead.id}` : `/contrato/${lead.id}`;

  const catalogo = useMemo(
    () => (Array.isArray(catalogServices) ? catalogServices.filter((s) => s && s.id) : []),
    [catalogServices]
  );

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const snap = await getDocs(query(collection(db, "contratos"), where("leadId", "==", lead.id)));
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      rows.sort((a, b) => String(a.dataCriacao || "").localeCompare(String(b.dataCriacao || "")));
      setContratos(rows);
    } catch (err: any) {
      setErro(`Não foi possível carregar os contratos${err?.code ? ` (${err.code})` : ""}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const contratoAvulsoAssinado = contratos.find((c) => c.tipo === "avulso" && c.status === "assinado");
  const isAditivo = Boolean(contratoAvulsoAssinado);

  const valorDe = (serv: any) => {
    if (typeof valores[serv.id] === "number") return valores[serv.id];
    const noLead = (lead.servicosRecomendados || []).find(
      (s: any) => String(s?.id) === String(serv.id) || String(s?.nome || "") === String(serv.nome || "")
    );
    if (noLead && typeof noLead.valor === "number") return noLead.valor;
    return Number(serv.valor || 0);
  };

  const escolhidos = catalogo.filter((s) => selecionados[s.id]);
  const total = escolhidos.reduce((acc, s) => acc + Number(valorDe(s) || 0), 0);

  const handleGerar = async () => {
    if (escolhidos.length === 0) {
      alert("Selecione ao menos um serviço para gerar o documento.");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const nowIso = new Date().toISOString();
      const socio = Array.isArray(lead.socios) && lead.socios.length > 0 ? lead.socios[0] : null;
      const payload: any = {
        leadId: lead.id,
        tipo: isAditivo ? "aditivo" : "avulso",
        status: "rascunho",
        servicos: escolhidos.map((s) => ({
          id: String(s.id),
          nome: String(s.nome || ""),
          valor: Number(valorDe(s) || 0),
          descricao: String(s.descricao || ""),
          clausulas: normalizeServiceClauses(s.clausulas) || CLAUSULA_GENERICA_AVULSO,
          templateId: String(s.templateId || buildServiceTemplateId(s.nome, s.id)),
          templateVersao: Number(s.templateVersao || 1),
        })),
        valorTotal: Number(total || 0),
        cliente: {
          razaoSocial: lead.nomeEmpresa || lead.razaoSocial || "",
          cnpj: lead.cnpj || "",
          endereco: [lead.endereco, lead.cidade, lead.uf || lead.estado].filter(Boolean).join(", "),
          representante: socio?.nome || lead.nomeContato || lead.nome || "",
          representanteCpf: socio?.cpf || lead.cpf || "",
        },
        dataCriacao: nowIso,
      };
      if (isAditivo) {
        payload.contratoOrigemId = contratoAvulsoAssinado.id;
        payload.contratoOrigemData = contratoAvulsoAssinado.assinaturaData || null;
      }
      await addDoc(collection(db, "contratos"), payload);
      setSelecionados({});
      setValores({});
      await carregar();
    } catch (err: any) {
      setErro(`Não foi possível gerar o documento${err?.code ? ` (${err.code})` : ""}.`);
    } finally {
      setCriando(false);
    }
  };

  const mudarStatus = async (contratoId: string, status: string) => {
    try {
      await updateDoc(doc(db, "contratos", contratoId), {
        status,
        ...(status === "aguardando_assinatura" ? { dataEnvio: new Date().toISOString() } : {}),
      });
      await carregar();
    } catch (err: any) {
      setErro(`Não foi possível atualizar o status${err?.code ? ` (${err.code})` : ""}.`);
    }
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(contratoLink);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      /* silencioso */
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            Contratos Avulsos e Termos Aditivos
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Independente do contrato de assessoria mensal. As cláusulas de cada serviço são congeladas na
            geração do documento.
          </p>
        </div>
        <button
          type="button"
          onClick={copiarLink}
          className="px-3 py-2 bg-white border border-slate-200 hover:border-[#0A3D2E] text-slate-700 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
        >
          {linkCopiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {linkCopiado ? "Link copiado!" : "Copiar link de assinatura"}
        </button>
      </div>

      {erro && <p className="text-[11px] font-bold text-red-600">{erro}</p>}

      {/* Seleção de serviços */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {isAditivo ? "Serviços do termo aditivo" : "Serviços do contrato avulso"}
        </p>
        {catalogo.length === 0 ? (
          <p className="text-[11px] text-slate-500">Nenhum serviço disponível no catálogo.</p>
        ) : (
          <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
            {catalogo.map((serv) => (
              <label
                key={serv.id}
                className="flex items-center gap-3 p-3 hover:bg-slate-50/60 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!selecionados[serv.id]}
                  onChange={(e) =>
                    setSelecionados((prev) => ({ ...prev, [serv.id]: e.target.checked }))
                  }
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-slate-800 truncate">{serv.nome}</span>
                  <span className="block text-[10px] text-slate-400">
                    {String(serv.templateId || buildServiceTemplateId(serv.nome, serv.id))}_V
                    {Number(serv.templateVersao || 1)}
                    {normalizeServiceClauses(serv.clausulas) ? "" : " — usará cláusula genérica"}
                  </span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorDe(serv)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [serv.id]: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <p className="text-xs font-bold text-slate-700">
            Total selecionado: <span className="text-slate-900">{brl(total)}</span>
          </p>
          <button
            type="button"
            onClick={handleGerar}
            disabled={criando || escolhidos.length === 0}
            className="px-4 py-2.5 bg-[#0A3D2E] hover:bg-[#00A86B] disabled:opacity-60 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isAditivo ? "Gerar Termo Aditivo" : "Gerar Contrato Avulso"}
          </button>
        </div>
      </div>

      {/* Documentos gerados */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Documentos gerados</p>
        {loading ? (
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
          </p>
        ) : contratos.length === 0 ? (
          <p className="text-[11px] text-slate-500">Nenhum contrato avulso gerado para este lead.</p>
        ) : (
          <div className="space-y-2">
            {contratos.map((c) => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      {c.tipo === "aditivo" ? "Termo Aditivo" : "Contrato Avulso"} — {brl(c.valorTotal)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(c.servicos || []).map((s: any) => s.nome).join(" · ") || "Sem serviços"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      STATUS_CLASS[c.status] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {STATUS_LABEL[c.status] || c.status}
                  </span>
                </div>

                {c.status === "assinado" ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-[11px] text-emerald-900 space-y-0.5">
                    <p className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Assinado por {c.assinaturaNome}
                    </p>
                    <p>
                      {c.assinaturaData ? new Date(c.assinaturaData).toLocaleString("pt-BR") : ""} — IP{" "}
                      {c.assinaturaIp || "não registrado"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {c.status === "rascunho" && (
                      <button
                        type="button"
                        onClick={() => mudarStatus(c.id, "aguardando_assinatura")}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold rounded-lg cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar para assinatura
                      </button>
                    )}
                    {c.status !== "cancelado" && (
                      <button
                        type="button"
                        onClick={() => mudarStatus(c.id, "cancelado")}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-red-400 text-slate-700 text-[11px] font-extrabold rounded-lg cursor-pointer flex items-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
