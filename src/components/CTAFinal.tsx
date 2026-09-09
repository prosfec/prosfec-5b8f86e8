// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ArrowRight, MessageCircle } from "lucide-react";

interface CTAFinalProps {
  onSimulateClick: () => void;
  whatsappUrl: string;
}

export default function CTAFinal({ onSimulateClick, whatsappUrl }: CTAFinalProps) {
  return (
    <section className="py-16 md:py-24 bg-brand-bg-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-gray-100 rounded-3xl shadow-xl p-8 md:p-12 text-center space-y-5"
        >
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary leading-tight">
            Descubra o próximo passo financeiro da sua empresa.
          </h2>
          <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            Não espere sua empresa precisar de crédito para começar a se preparar. Entenda sua
            situação atual, identifique oportunidades e construa uma estratégia financeira mais
            sólida.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSimulateClick}
              className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold px-8 py-4 rounded-xl text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              Quero analisar minha empresa
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-200 hover:border-brand-primary text-brand-primary font-bold px-8 py-4 rounded-xl text-sm transition-all inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2} />
              Falar com a PROSFEC
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
