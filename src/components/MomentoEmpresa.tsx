// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ArrowRight, Search, AlertTriangle, Rocket, PieChart } from "lucide-react";

interface MomentoEmpresaProps {
  onSimulateClick: () => void;
  whatsappUrl: string;
}

export default function MomentoEmpresa({ onSimulateClick, whatsappUrl }: MomentoEmpresaProps) {
  const opcoes = [
    {
      icon: Search,
      title: "Preciso de crédito",
      desc: "Quero encontrar oportunidades de crédito e entender quanto minha empresa pode buscar.",
      cta: "Analisar minha empresa",
      action: "simulador",
    },
    {
      icon: AlertTriangle,
      title: "Estou com dificuldade para conseguir crédito",
      desc: "Tenho restrições, baixo score/rating, recusas ou outros obstáculos.",
      cta: "Analisar minha situação",
      action: "simulador",
    },
    {
      icon: Rocket,
      title: "Quero capital para crescer",
      desc: "Preciso de recursos para capital de giro, expansão ou investimento.",
      cta: "Ver caminhos de capital",
      action: "simulador",
    },
    {
      icon: PieChart,
      title: "Quero organizar e acompanhar minhas finanças",
      desc: "Preciso de gestão financeira e acompanhamento estratégico.",
      cta: "Falar com a PROSFEC",
      action: "whatsapp",
    },
  ];

  return (
    <section id="momento" className="home-section py-12 md:py-16 bg-white/[0.02] scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-8 space-y-4">
          <h2 className="home-heading font-display font-bold text-3xl md:text-4xl leading-tight">
            Qual é o momento da sua empresa?
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Conte o que sua empresa precisa hoje. A PROSFEC identifica o caminho mais adequado para
            sua situação.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {opcoes.map((op, idx) => {
            const Icon = op.icon;
            const content = (
              <>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <h3 className="font-display font-bold text-base text-white leading-snug">
                  {op.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed flex-1">{op.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 group-hover:gap-2.5 transition-all">
                  {op.cta}
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </span>
              </>
            );

            const cardClass =
              "home-card group bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-3 text-left w-full cursor-pointer";

            return (
              <motion.div
                key={op.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
              >
                {op.action === "whatsapp" ? (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={cardClass}>
                    {content}
                  </a>
                ) : (
                  <button type="button" onClick={onSimulateClick} className={cardClass}>
                    {content}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
