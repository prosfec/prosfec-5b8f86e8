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
    <section id="beneficios" className="home-section py-12 md:py-16 bg-[#0B0F14] scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="home-kicker inline-flex items-center gap-1.5 text-xs font-bold uppercase">
              Benefícios da assessoria
            </div>
            <h2 className="home-heading font-display font-bold text-3xl md:text-4xl leading-tight">
              Mais do que buscar crédito. Preparar sua empresa para crescer.
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
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
                className="home-card flex items-start gap-3 bg-white/[0.02] border border-white/10 rounded-2xl p-4"
              >
                <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-full shrink-0">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-semibold text-zinc-300 leading-snug">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
