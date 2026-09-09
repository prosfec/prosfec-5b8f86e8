// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Banknote, ShieldCheck, BarChart3 } from "lucide-react";

const CATEGORIAS = [
  {
    icon: Banknote,
    title: "Crédito e Fomento",
    items: [
      "Diagnóstico de Crédito",
      "Estruturação de Crédito",
      "Capital de Giro",
      "Linhas de Crédito Governamentais",
      "BNDES",
      "Pronampe",
      "Outras oportunidades de financiamento",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Reabilitação Creditícia",
    items: [
      "Melhoria e Adequação de Rating/Score Comercial/Bancário",
      "Renegociação Estratégica de Dívidas",
      "Atualização Administrativa Bacen",
      "Análise de restrições",
      "Recuperação de Tarifa Bancária",
    ],
  },
  {
    icon: BarChart3,
    title: "Gestão Financeira",
    items: [
      "Gestão financeira estratégica",
      "Acompanhamento de indicadores",
      "Fluxo de caixa",
      "Planejamento financeiro",
      "Estratégia para novos capitais",
      "Preparação para expansão",
    ],
  },
];

export default function SolucoesEspecificas() {
  return (
    <section id="solucoes-especificas" className="py-16 md:py-24 bg-white scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12 space-y-4">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary leading-tight">
            Soluções específicas dentro de uma mesma estrutura
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            Todos os serviços fazem parte de um único método de trabalho da PROSFEC, aplicado conforme
            a necessidade e o momento da empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORIAS.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-white border border-gray-100 rounded-2xl p-7 shadow-xs"
              >
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-50">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-display font-bold text-lg text-brand-primary leading-snug">
                    {cat.title}
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
