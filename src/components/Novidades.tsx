// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import {
  TrendingUp,
  Percent,
  Calendar,
  Clock,
  RefreshCw,
  TrendingDown,
  Building2,
  FileCheck2
} from "lucide-react";

export default function Novidades() {
  const cards = [
    {
      title: "Pronampe: Até R$ 500 mil",
      desc: "Capital de giro com teto regulamentar de R$ 500 mil por CNPJ (limitado a 50% da receita bruta anual declarada).",
      icon: TrendingUp,
      color: "bg-emerald-50 text-brand-primary border-emerald-100"
    },
    {
      title: "Proger & FAMP (Sebrae)",
      desc: "Linhas para giro e expansão com limites entre R$ 300 mil e R$ 1 milhão, contando com até 80% de garantia do Sebrae.",
      icon: Percent,
      color: "bg-teal-50 text-teal-800 border-teal-100"
    },
    {
      title: "FINEP, BNDES & FNE/FCO",
      desc: "Linhas de fomento estruturadas para inovação e projetos com tetos de R$ 1M a R$ 5M+ segundo a receita.",
      icon: Calendar,
      color: "bg-blue-50 text-blue-800 border-blue-100"
    },
    {
      title: "Prazos de até 96 meses",
      desc: "Parcelas estendidas e carência negociada (até 24 meses) para manter o fluxo de caixa saudável.",
      icon: Clock,
      color: "bg-amber-50 text-amber-800 border-amber-100"
    },
    {
      title: "Garantia por Fundo (FGO/FAMP)",
      desc: "Dispensam bens imóveis ou veículos de lastro real, utilizando os fundos avalizadores governamentais.",
      icon: RefreshCw,
      color: "bg-purple-50 text-purple-800 border-purple-100"
    },
    {
      title: "Saneamento Cadastral Prévio",
      desc: "Análise consultiva especializada para corrigir pendências e regularizar certidões antes da submissão ao banco.",
      icon: Building2,
      color: "bg-indigo-50 text-indigo-800 border-indigo-100"
    }
  ];

  return (
    <section id="novidades" className="py-16 md:py-24 bg-brand-bg-light scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 bg-green-100 text-brand-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Linhas & Diretrizes 2026
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary">
            Assessoria Completa em Crédito Governamental & Fomento
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            A PROSFEC assessora sua empresa na qualificação e estruturação para as principais linhas federais de fomento (Pronampe, FAMP Sebrae, Proger, Finep, BNDES e Capital de Giro). Conheça as diretrizes vigentes para planejar a tomada de crédito ideal.
          </p>
        </motion.div>

        {/* 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all group hover:-translate-y-1 block duration-300 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${card.color} shrink-0 group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-lg text-brand-primary leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Warning / Detail */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 p-4 bg-white/50 rounded-xl border border-dashed border-gray-200 inline-flex items-center gap-2 text-xs text-gray-500 max-w-3xl text-left block mx-auto"
        >
          <FileCheck2 className="w-5 h-5 text-gray-400 shrink-0" />
          <span>
            <strong>Atenção:</strong> Apesar das regras gerais, cada agente financeiro (banco) possui autonomia para determinar a taxa e o enquadramento final de crédito com base na saúde fiscal do CNPJ.
          </span>
        </motion.div>

      </div>
    </section>
  );
}
