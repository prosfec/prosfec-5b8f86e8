// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Check } from "lucide-react";

const BENEFICIOS = [
  "Mais clareza sobre a situação financeira",
  "Identificação de oportunidades de crédito",
  "Melhor preparação para solicitações bancárias",
  "Estratégias para melhorar o perfil creditício",
  "Planejamento de capital",
  "Acompanhamento financeiro",
  "Decisões baseadas em dados",
  "Preparação para crescimento e expansão",
];

export default function Beneficios() {
  return (
    <section id="beneficios" className="py-16 md:py-24 bg-brand-bg-light scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-brand-primary/5 text-brand-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Benefícios da assessoria
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary leading-tight">
              Mais do que buscar crédito. Preparar sua empresa para crescer.
            </h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              O trabalho da PROSFEC é consultivo: entender a realidade da empresa, corrigir o que
              atrapalha e construir uma estratégia financeira sustentável.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFICIOS.map((item, idx) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-xs"
              >
                <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-full shrink-0">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-semibold text-gray-700 leading-snug">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
