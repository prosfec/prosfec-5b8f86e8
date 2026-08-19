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
      q: "Quais linhas de crédito governamental a PROSFEC analisa?",
      a: "Analisamos o perfil da sua empresa para identificar o enquadramento em programas de fomento como Pronampe, FAMP (Sebrae), Proger, FINEP, FNE/FCO/FNO, Cartão BNDES e Capital de Giro Bancário Conveniado, direcionando seu projeto para a opção com melhor taxa e facilidade de aprovação."
    },
    {
      q: "Como funciona a garantia do FAMP (Sebrae) e FGO?",
      a: "As linhas de crédito governamentais e de fomento utilizam fundos garantidores federais (como o FGO no Pronampe ou o FAMP no Sebrae) para avalizar até 80% do valor contratado, dispensando a necessidade de bens imóveis ou veículos como garantia real."
    },
    {
      q: "Quanto a minha empresa pode obter de limite de crédito?",
      a: "Os limites variam conforme a linha ideal para o perfil da sua empresa: no Pronampe, o teto regulamentar é de R$ 500 mil (até 50% do faturamento anual). No Proger e FAMP (Sebrae), os limites variam de R$ 300 mil a R$ 1 milhão. Em linhas corporativas como FINEP, BNDES e FNE/FCO/FNO, os limites podem alcançar de R$ 1 milhão a mais de R$ 5 milhões, dimensionados à capacidade de pagamento e faturamento da empresa."
    },
    {
      q: "Posso solicitar crédito se tiver pequenas pendências no CNPJ?",
      a: "Muitos travamentos bancários acontecem por detalhes simples, como falta de compartilhamento no e-CAC ou CNDs vencidas. A PROSFEC faz um diagnóstico prévio completo e orienta o saneamento das pendências antes de enviar a proposta ao banco."
    },
    {
      q: "A análise de viabilidade com a PROSFEC tem algum custo?",
      a: "Não. A simulação e a análise de viabilidade prestadas pela assessoria da PROSFEC são 100% gratuitas e sem qualquer cobrança de taxa inicial."
    }
  ];

  return (
    <section id="faq" className="py-16 md:py-24 bg-brand-bg-light scroll-mt-12 text-left">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-brand-primary/5 text-brand-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            FAQ • Dúvidas Frequentes
          </div>
          <h2 className="font-display font-extrabold text-3xl text-brand-primary">
            Perguntas Frequentes sobre Crédito Governamental
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
            Tire suas dúvidas sobre as regras de fomento público, fundos garantidores (FGO/FAMP) e prazos de liberação para 2026.
          </p>
        </div>

        {/* Accordions Container */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors gap-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-display font-bold text-sm md:text-base text-brand-primary">
                      {faq.q}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-brand-accent shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>

                {/* Body dropdown with smooth transition */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "max-h-[500px] border-t border-gray-50 p-6 bg-gray-50/30"
                      : "max-h-0 overflow-hidden"
                  }`}
                >
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium">
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
