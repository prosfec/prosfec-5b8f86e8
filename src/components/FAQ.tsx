// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

export default function FAQ() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "O que é a PROSFEC?",
      a: "A PROSFEC é uma empresa de inteligência financeira e creditícia para negócios. Atuamos na análise da estrutura financeira da empresa, na estruturação e reabilitação de crédito, na identificação de oportunidades de capital e no acompanhamento financeiro estratégico."
    },
    {
      q: "A PROSFEC é um banco?",
      a: "Não. A PROSFEC não é banco, financeira nem instituição autorizada a conceder crédito. Somos uma assessoria consultiva que analisa, estrutura e orienta a empresa no relacionamento com instituições financeiras e programas de fomento."
    },
    {
      q: "A PROSFEC garante aprovação de crédito?",
      a: "Não. Nenhuma aprovação é garantida, pois a decisão é exclusiva da instituição financeira. O nosso trabalho é melhorar a qualidade e a consistência da apresentação da empresa, corrigir pontos que atrapalham a análise e indicar os caminhos mais adequados ao perfil."
    },
    {
      q: "Que tipos de crédito podem ser analisados?",
      a: "Analisamos linhas governamentais e de fomento, como Pronampe, Proger, FINEP, BNDES e FNE/FCO/FNO, além de linhas bancárias tradicionais, capital de giro, investimento e expansão, conforme o perfil e a capacidade de pagamento da empresa."
    },
    {
      q: "O que é o Diagnóstico PROSFEC?",
      a: "É a análise que transforma informações financeiras e creditícias em uma visão estratégica: potencial de crédito, perfil financeiro, rating e score, restrições e pendências, capacidade de pagamento, oportunidades e os próximos passos recomendados."
    },
    {
      q: "Minha empresa está negativada. A PROSFEC pode ajudar?",
      a: "Sim. Empresas com restrições, recusas anteriores ou score/rating baixo são atendidas pela frente de reabilitação financeira e creditícia, que mapeia as pendências e define uma estratégia de regularização e adequação do perfil."
    },
    {
      q: "A PROSFEC trabalha com Pronampe?",
      a: "Sim. O Pronampe é uma das linhas analisadas, mas não é o único caminho. A recomendação depende do momento da empresa, do faturamento, da regularidade e do objetivo do recurso."
    },
    {
      q: "A PROSFEC oferece acompanhamento financeiro?",
      a: "Sim. Além do trabalho pontual de crédito, oferecemos gestão financeira estratégica com acompanhamento de indicadores, fluxo de caixa, planejamento e preparação para novos ciclos de captação."
    },
    {
      q: "Como funciona a contratação?",
      a: "Começa pela análise inicial da empresa. A partir do diagnóstico, apresentamos o escopo adequado ao caso e as condições do serviço, com contrato formal e escopo definido antes de qualquer execução."
    }
  ];

  return (
    <section id="faq" className="home-section py-12 md:py-16 bg-[#0B0F14] scroll-mt-12 text-left">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-4">
          <div className="home-kicker inline-flex items-center gap-1.5 text-xs font-bold uppercase">
            FAQ • Dúvidas Frequentes
          </div>
          <h2 className="home-heading font-display font-bold text-3xl md:text-4xl">
            Perguntas frequentes sobre a PROSFEC
          </h2>
          <p className="text-zinc-400 text-sm md:text-base">
            Entenda como atuamos, o que o diagnóstico revela e como funciona a contratação.
          </p>
        </div>

        {/* Accordions Container */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={idx}
                className="border-b border-white/10"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors gap-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-display font-bold text-sm md:text-base text-white">
                      {faq.q}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-brand-accent shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-500 shrink-0" />
                  )}
                </button>

                {/* Body dropdown with smooth transition */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "max-h-[500px] pb-6 px-6"
                      : "max-h-0 overflow-hidden"
                  }`}
                >
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-medium">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
