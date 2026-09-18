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

const TIMELINE_STEPS = [
  "Diagnóstico de crédito",
  "Identificação de linhas",
  "Estruturação de propostas",
  "Preparação para solicitação",
];

function CreditTimeline() {
  return (
    <motion.div
      initial="rest"
      whileInView="active"
      viewport={{ once: true, margin: "-80px" }}
      className="hidden lg:block mt-auto pt-8 pb-2"
    >
      <div className="relative">
        {/* trilha e progresso */}
        <div className="absolute left-0 right-0 top-2 h-px bg-white/5" />
        <motion.div
          className="absolute left-0 top-2 h-px bg-emerald-500"
          variants={{ rest: { width: "0%" }, active: { width: "100%" } }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        <div className="relative flex justify-between">
          {TIMELINE_STEPS.map((step, i) => (
            <div
              key={step}
              className="flex flex-col items-center text-center w-[120px] xl:w-[140px]"
            >
              <motion.div
                className="w-4 h-4 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center"
                variants={{ rest: {}, active: {} }}
              >
                <motion.span
                  className="block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  variants={{ rest: { opacity: 0, scale: 0.4 }, active: { opacity: 1, scale: 1 } }}
                  transition={{ duration: 0.35, delay: 0.15 + i * 0.3 }}
                />
              </motion.div>
              <motion.span
                className="mt-3 text-[10px] uppercase font-bold tracking-wider leading-tight"
                variants={{
                  rest: { color: "rgb(113 113 122)", opacity: 0.6 },
                  active: { color: "rgb(255 255 255)", opacity: 1 },
                }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.3 }}
              >
                {step}
              </motion.span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Pilares() {
  return (
    <section id="solucoes" className="home-section py-12 md:py-16 bg-[#0B0F14] scroll-mt-16 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mb-8 space-y-4"
        >
          <div className="home-kicker inline-flex items-center gap-1.5 text-xs font-bold uppercase">
            Nossas soluções
          </div>
          <h2 className="home-heading font-display font-bold text-3xl md:text-4xl leading-tight">
            Como podemos ajudar sua empresa?
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Cada empresa está em um momento diferente. Por isso, a estratégia financeira e creditícia
            precisa partir da realidade do negócio.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {PILARES.map((pilar, idx) => {
            const Icon = pilar.icon;
            return (
              <motion.article
                key={pilar.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: idx * 0.07 }}
                className={`home-card bg-white/[0.02] border border-white/10 rounded-2xl p-7 flex flex-col gap-4 ${idx === 0 || idx === 3 ? "md:col-span-4" : "md:col-span-2"}`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <h3 className="font-display font-bold text-xl text-white leading-snug">
                  {pilar.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{pilar.desc}</p>
                <ul
                  className={`flex flex-wrap gap-2 pt-1 ${idx === 0 ? "lg:hidden" : ""}`}
                >
                  {pilar.items.map((item) => (
                    <li
                      key={item}
                      className="text-[11px] font-semibold text-zinc-400 bg-white/5 border border-white/10 rounded-md px-2.5 py-1"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                {idx === 0 && <CreditTimeline />}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
