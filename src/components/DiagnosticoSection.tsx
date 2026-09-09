// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";

interface DiagnosticoSectionProps {
  onSimulateClick: () => void;
}

const ITENS = [
  "Potencial de crédito",
  "Perfil financeiro",
  "Rating e Score",
  "Restrições e pendências",
  "Capacidade de pagamento",
  "Oportunidades de financiamento",
  "Pontos que precisam ser corrigidos",
  "Próximos passos recomendados",
];

export default function DiagnosticoSection({ onSimulateClick }: DiagnosticoSectionProps) {
  return (
    <section id="diagnostico" className="py-16 md:py-24 bg-white scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="bg-brand-primary text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl"
        >
          <div className="absolute right-[-100px] top-[-80px] w-96 h-96 rounded-full bg-emerald-500/10 pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative">
            <div className="lg:col-span-6 space-y-5">
              <span className="bg-emerald-500/15 text-emerald-300 font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-full w-fit inline-block">
                Diagnóstico PROSFEC
              </span>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl leading-tight">
                Antes de buscar crédito, entenda a posição da sua empresa.
              </h2>
              <p className="text-gray-200 text-sm md:text-base leading-relaxed">
                O Diagnóstico PROSFEC transforma informações financeiras e creditícias em uma visão
                estratégica sobre a situação atual da empresa e os próximos passos.
              </p>
              <button
                type="button"
                onClick={onSimulateClick}
                className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold px-7 py-3.5 rounded-xl text-sm transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                Solicitar Diagnóstico
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ITENS.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3.5"
                >
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-xs md:text-sm font-semibold text-gray-100 leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
