// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Search, ClipboardList, Compass, Rocket, LineChart } from "lucide-react";

export default function ComoFunciona() {
  const steps = [
    {
      num: "01",
      title: "Análise",
      desc: "Entendemos a situação financeira e creditícia da empresa.",
      icon: Search,
    },
    {
      num: "02",
      title: "Diagnóstico",
      desc: "Identificamos oportunidades, obstáculos e pontos de atenção.",
      icon: ClipboardList,
    },
    {
      num: "03",
      title: "Estratégia",
      desc: "Definimos o caminho mais adequado para o objetivo da empresa.",
      icon: Compass,
    },
    {
      num: "04",
      title: "Execução",
      desc: "Acompanhamos os próximos passos e a evolução da estratégia.",
      icon: Rocket,
    },
    {
      num: "05",
      title: "Acompanhamento",
      desc: "Quando necessário, continuamos acompanhando a empresa para preparar novos ciclos de crédito e crescimento.",
      icon: LineChart,
    },
  ];

  return (
    <section id="como-funciona" className="py-16 md:py-24 bg-brand-bg-light scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-brand-primary/5 text-brand-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Jornada consultiva
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary leading-tight">
            Como a PROSFEC atua
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            Um método estruturado, do entendimento da realidade da empresa até o acompanhamento
            contínuo da estratégia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 relative">
          <div className="hidden lg:block absolute top-[38px] left-[10%] right-[10%] h-0.5 bg-gray-200 -z-10" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-500 text-emerald-700 bg-emerald-50 flex items-center justify-center font-display font-extrabold text-base shrink-0">
                    {step.num}
                  </div>
                  <Icon className="w-5 h-5 text-gray-300" strokeWidth={2} />
                </div>
                <h3 className="font-display font-bold text-lg text-brand-primary">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
