// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vitrine comercial (Venda Consultiva): exibida após a simulação do lead.
 * Nenhum botão leva a checkout — todos abrem o WhatsApp do parceiro vinculado.
 *
 * Oferta inteligente: exibe SEMPRE apenas 2 cards — o Modelo Avulso + UM card
 * de Assessoria escolhido dinamicamente pelo porte da empresa:
 *   MEI           → Assessoria Essential (R$ 497,00/mês)
 *   ME            → Assessoria Growth (R$ 797,00/mês)
 *   EPP/superior  → Assessoria Corporate (R$ 1.497,00/mês)
 */

import React, { useEffect, useState } from "react";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import { DEFAULT_MENSALIDADES, normalizeMensalidades } from "../utils/serviceUtils";

const formatBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function buildPlanosProsfec(mensalidades = DEFAULT_MENSALIDADES) {
  const m = normalizeMensalidades(mensalidades);
  return [
  {
    id: "avulso",
    nome: "Modelo Avulso",
    valorLabel: "Investimento sob consulta",
    valorMensal: 0,
    descricao: "Para quem precisa apenas do diagnóstico e da recomendação técnica.",
    itens: ["Diagnóstico de crédito", "Recomendação de soluções"],
    destaque: false,
    dark: false,
  },
  {
    id: "essential",
    nome: "Assessoria Essential",
    valorLabel: `${formatBRL(m.essential)}/mês`,
    valorMensal: m.essential,
    descricao: "Estruturação completa da empresa para o mercado de crédito.",
    itens: [
      "Diagnóstico Estratégico",
      "Estruturação Completa",
      "Gateway de pagamento com Sistema de Gestão Financeira integrado",
      "Monitoramento por 12 meses",
    ],
    destaque: false,
    dark: false,
  },
  {
    id: "growth",
    nome: "Assessoria Growth",
    valorLabel: `${formatBRL(m.growth)}/mês`,
    valorMensal: m.growth,
    descricao: "Tudo do Essential com presença digital e eficiência fiscal.",
    itens: [
      "Tudo do Essential",
      "Auditoria Fiscal",
      "Site institucional",
      "Automação de WhatsApp",
    ],
    destaque: true,
    dark: false,
  },
  {
    id: "corporate",
    nome: "Assessoria Corporate",
    valorLabel: `${formatBRL(m.corporate)}/mês`,
    valorMensal: m.corporate,
    descricao: "Estrutura corporativa completa e projetos internacionais.",
    itens: [
      "Tudo do Growth",
      "Auditoria Financeira",
      "Projeto Bancos Suíços",
    ],
    destaque: false,
    dark: true,
  },
  ];
}

/** Catálogo padrão (valores default) — mantido para compatibilidade. */
export const PLANOS_PROSFEC = buildPlanosProsfec();

/** Resolve o plano de assessoria recomendado conforme o porte da empresa. */
export function planoParaPorte(porte?: string, planos = PLANOS_PROSFEC): (typeof PLANOS_PROSFEC)[number] {
  const p = String(porte || "").toUpperCase().trim();
  if (p === "MEI") return planos.find((x) => x.id === "essential")!;
  if (p === "ME") return planos.find((x) => x.id === "growth")!;
  // EPP, EMP, EGP, LTDA, S/A, superiores ou indefinido → Corporate
  return planos.find((x) => x.id === "corporate")!;
}

const MENSAGEM_ESPECIALISTA =
  "Olá, acabei de fazer a simulação na PROSFEC e gostaria de agendar uma reunião para definirmos o formato de assessoria para minha empresa.";

interface PlanSelectionViewProps {
  partnerWhatsapp?: string;
  partnerNome?: string;
  /** Porte da empresa do lead (MEI, ME, EPP...) — define a assessoria exibida. */
  porte?: string;
}

export default function PlanSelectionView({ partnerWhatsapp, partnerNome, porte }: PlanSelectionViewProps) {
  const handleFalarComEspecialista = () => {
    const targetPhone = partnerWhatsapp
      ? String(partnerWhatsapp).replace(/\D/g, "")
      : "5598987353253";
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(MENSAGEM_ESPECIALISTA)}`;
    try {
      const opened = window.open(url, "_blank");
      if (!opened) window.location.href = url;
    } catch {
      window.location.href = url;
    }
  };

  const [mensalidades, setMensalidades] = useState(DEFAULT_MENSALIDADES);

  useEffect(() => {
    let active = true;
    fetch("/api/config/mensalidades")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d) setMensalidades(normalizeMensalidades(d));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const planos = React.useMemo(() => buildPlanosProsfec(mensalidades), [mensalidades]);
  const planoAvulso = planos.find((x) => x.id === "avulso")!;
  const planoRecomendado = planoParaPorte(porte, planos);
  const planosVisiveis = [planoAvulso, planoRecomendado];

  return (
    <section className="mt-8 pt-8 border-t border-slate-200">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
          Próximo passo
        </span>
        <h3 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900">
          Escolha o formato de assessoria da sua empresa
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Nossa equipe define com você o modelo ideal em uma reunião de diagnóstico.
          {partnerNome ? ` Seu consultor responsável é ${partnerNome}.` : ""}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 text-left">
        {planosVisiveis.map((plano) => {
          const base = plano.dark
            ? "bg-slate-900 border-slate-800 text-white"
            : "bg-white border-slate-200 text-slate-900";
          const ring = plano.destaque ? "border-[#00A86B] ring-2 ring-emerald-100" : "";

          return (
            <div
              key={plano.id}
              className={`relative flex flex-col rounded-xl border shadow-sm p-6 sm:p-8 transition-all hover:shadow-md ${base} ${ring}`}
            >
              {plano.destaque && (
                <span className="absolute -top-2.5 left-6 text-[10px] font-bold uppercase tracking-wider bg-[#00A86B] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Recomendado para o seu porte
                </span>
              )}

              <p className={`text-xs font-semibold uppercase tracking-wider ${plano.dark ? "text-slate-300" : "text-slate-500"}`}>
                {plano.nome}
              </p>
              <p className={`mt-2 text-2xl font-extrabold font-display ${plano.dark ? "text-white" : "text-slate-900"}`}>
                {plano.valorLabel}
              </p>
              <p className={`mt-2 text-sm leading-relaxed ${plano.dark ? "text-slate-400" : "text-slate-500"}`}>
                {plano.descricao}
              </p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {plano.itens.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plano.dark ? "text-emerald-400" : "text-emerald-600"}`} />
                    <span className={`text-sm font-medium ${plano.dark ? "text-slate-200" : "text-slate-700"}`}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleFalarComEspecialista}
                className={`mt-6 w-full px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all hover:shadow-md cursor-pointer ${
                  plano.dark
                    ? "bg-white text-slate-900 hover:bg-slate-100"
                    : plano.destaque
                    ? "bg-[#00A86B] text-white hover:bg-[#0A3D2E]"
                    : "bg-[#0A3D2E] text-white hover:bg-[#00A86B]"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Falar com Especialista
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
