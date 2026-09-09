// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Layers, ShieldCheck, TrendingUp, LineChart } from "lucide-react";

const PILARES = [
  {
    icon: Layers,
    title: "Estruturação de Crédito",
    desc: "Análise do perfil da empresa, capacidade de crédito, linhas disponíveis e estruturação do pedido para aumentar a qualidade da solicitação.",
    items: [
      "Diagnóstico de crédito",
      "Identificação de linhas",
      "Estruturação de propostas",
      "Preparação para solicitação de crédito",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Reabilitação Financeira e Creditícia",
    desc: "Atuação estratégica para empresas que possuem restrições, dificuldades de acesso ao crédito ou precisam melhorar sua posição financeira e creditícia.",
    items: [
      "Análise de restrições",
      "Rating e Score comercial/bancário",
      "Estratégia de regularização",
      "Renegociação estratégica",
      "Recuperação de tarifa bancária",
      "Adequação do perfil creditício",
    ],
  },
  {
    icon: TrendingUp,
    title: "Fomento e Capital para Empresas",
    desc: "Identificação de oportunidades de capital para capital de giro, expansão, investimentos e crescimento empresarial.",
    items: [
      "Capital de giro",
      "Expansão e investimentos",
      "Linhas governamentais e bancárias",
      "BNDES, Pronampe e outras alternativas",
    ],
  },
  {
    icon: LineChart,
    title: "Gestão Financeira Estratégica",
    desc: "Acompanhamento contínuo da saúde financeira da empresa para melhorar decisões, organização e preparação para novos ciclos de crescimento.",
    items: [
      "Acompanhamento financeiro e fluxo de caixa",
      "Indicadores e alertas financeiros",
      "Planejamento e novas captações",
      "Estratégia de crescimento",
    ],
  },
];

export default function Pilares() {
  return (
    <section id="solucoes" className="py-16 md:py-24 bg-white scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mb-12 space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 bg-brand-primary/5 text-brand-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Nossas soluções
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary leading-tight">
            Como podemos ajudar sua empresa?
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            Cada empresa está em um momento diferente. Por isso, a estratégia financeira e creditícia
            precisa partir da realidade do negócio.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PILARES.map((pilar, idx) => {
            const Icon = pilar.icon;
            return (
              <motion.article
                key={pilar.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: idx * 0.07 }}
                className="bg-white border border-gray-100 rounded-2xl p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <h3 className="font-display font-bold text-xl text-brand-primary leading-snug">
                  {pilar.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{pilar.desc}</p>
                <ul className="flex flex-wrap gap-2 pt-1">
                  {pilar.items.map((item) => (
                    <li
                      key={item}
                      className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-md px-2.5 py-1"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
