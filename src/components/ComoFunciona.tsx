// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ClipboardList, AlertCircle, PhoneCall, CheckCircle } from "lucide-react";

export default function ComoFunciona() {
  const steps = [
    {
      num: "01",
      title: "Simulação consultiva",
      desc: "Você responde 5 etapas rápidas sobre seu faturamento, metas e saúde fiscal.",
      color: "border-emerald-500 text-emerald-600 bg-emerald-50",
      icon: ClipboardList
    },
    {
      num: "02",
      title: "Diagnóstico de pendências",
      desc: "Analisamos o que precisa ajustar com antecedência (CND, e-CAC, gov.br) antes de ir ao banco.",
      color: "border-amber-500 text-amber-600 bg-amber-50",
      icon: AlertCircle
    },
    {
      num: "03",
      title: "Atendimento do consultor",
      desc: "Nossos especialistas analisam seu caso individualmente e te direcionam para o melhor banco parceiro.",
      color: "border-blue-500 text-blue-600 bg-blue-50",
      icon: PhoneCall
    },
    {
      num: "04",
      title: "Solicitação preparada",
      desc: "Seu dossiê é gerado e você acompanha as etapas de contratação em nossa área conectada até o crédito cair.",
      color: "border-brand-accent text-brand-primary bg-emerald-100",
      icon: CheckCircle
    }
  ];

  return (
    <section id="como-funciona" className="py-16 md:py-24 bg-white scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 bg-brand-primary/5 text-brand-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Processo de Análise Inteligente
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary">
            Da simulação à liberação, com você do começo ao fim
          </h2>
          <p className="text-gray-600 text-base max-w-2xl mx-auto">
            Não somos um banco nem correspondente bancário automático. Somos uma assessoria de engenharia financeira especializada em qualificar e estruturar o perfil da sua empresa perante as linhas de crédito governamental (Pronampe, FAMP, Proger, FINEP, BNDES), maximizando suas chances de aprovação.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          
          {/* Horizontal connecting line (hidden on mobile, visible on large screens) */}
          <div className="hidden lg:block absolute top-[44px] left-[15%] right-[15%] h-0.5 bg-gray-100 -z-10" />

          {steps.map((step, index) => {
            const IconComp = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 group relative bg-white p-5 rounded-2xl md:border-0 border border-gray-50 md:shadow-none shadow-xs"
              >
                {/* Badge Number with icon */}
                <div className="flex items-center justify-between w-full">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-display font-extrabold text-lg shadow-sm ${step.color} shrink-0`}>
                    {step.num}
                  </div>
                  <div className="text-gray-300 group-hover:text-brand-primary transition-colors">
                    <IconComp className="w-6 h-6 md:opacity-70" />
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-lg text-brand-primary group-hover:text-brand-accent transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Banner callout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-16 bg-brand-primary text-white p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
            <svg width="400" height="400" viewBox="0 0 100 100" fill="currentColor">
               <circle cx="50" cy="50" r="40" />
            </svg>
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h4 className="font-display font-bold text-lg md:text-xl text-teal-300">
               Quer saber se tem direito e qual o seu limite potencial?
            </h4>
            <p className="text-xs md:text-sm text-gray-300 max-w-xl">
               Nossa simulação é baseada no faturamento real e nas regras vigentes em 2026. Processamos seu diagnóstico em tempo recorde.
            </p>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("simulador");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold px-6 py-3.5 rounded-xl text-sm transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-md hover:shadow-lg"
          >
            Iniciar Simulação de Viabilidade
          </button>
        </motion.div>

      </div>
    </section>
  );
}
