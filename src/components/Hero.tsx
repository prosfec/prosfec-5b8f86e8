// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Check, ArrowRight, ShieldCheck, TrendingUp, Sparkles, AlertCircle } from "lucide-react";

interface HeroProps {
  onSimulateClick: () => void;
}

export default function Hero({ onSimulateClick }: HeroProps) {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden bg-gradient-to-b from-green-50/60 via-white to-white">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-3xl -z-10 opacity-70" />
      <div className="absolute bottom-10 left-0 w-[300px] h-[300px] bg-green-50 rounded-full blur-2xl -z-10 opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Main Hero Copy - 7 cols on lg */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
              Assessoria Especializada • Crédito Governamental & Fomento Empresarial
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[54px] text-brand-primary leading-tight text-balance"
            >
              Descubra quais linhas de crédito governamental sua empresa pode obter.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl"
            >
              A PROSFEC analisa o perfil da sua empresa em segundos para identificar o enquadramento ideal entre <strong>Pronampe</strong>, <strong>FAMP (Sebrae)</strong>, <strong>Proger</strong>, <strong>FINEP</strong>, <strong>FNE/FCO/FNO</strong>, <strong>Cartão BNDES</strong> e <strong>Capital de Giro</strong>, corrigindo pendências que reduzem sua nota bancária e aplicando melhorias sem custo prévio.
            </motion.p>

            {/* Badges of Government Credit Lines */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-wrap items-center gap-2 pt-1"
            >
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">Linhas Analisadas:</span>
              {["Pronampe", "FAMP (Sebrae)", "Proger", "FINEP", "FNE / FCO / FNO", "Cartão BNDES", "Capital de Giro PJ"].map((line, idx) => (
                <span key={idx} className="bg-emerald-50 text-emerald-900 border border-emerald-200/60 text-[11px] font-bold px-2.5 py-1 rounded-md shadow-2xs">
                  {line}
                </span>
              ))}
            </motion.div>

            {/* Required Bullets with custom look */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 pt-2"
            >
              {[
                { label: "Simulação gratuita", desc: "Sem taxas iniciais" },
                { label: "Resultado estimado", desc: "Calculado na hora" },
                { label: "Atendimento consultivo", desc: "Especialistas do início ao fim" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                  <div className="bg-brand-accent/20 text-brand-primary p-1 rounded-full shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Call to action button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4"
            >
              <button
                onClick={onSimulateClick}
                className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold text-base px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Simular agora
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-500">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Ambiente seguro sob as diretrizes do Banco Central</span>
              </div>
            </motion.div>
          </div>

          {/* Interactive visual widget - 5 cols on lg */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative mx-auto max-w-sm lg:max-w-none bg-white p-6 rounded-2xl border border-gray-100 shadow-xl"
            >
              {/* Graphic Header card */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Exemplo de Enquadramento
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">
                  Faturamento Ativo
                </span>
              </div>

              {/* Slider simulation */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
                    <span>Faturamento Bruto Anual</span>
                    <span className="text-brand-primary font-bold">R$ 600.000,00</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 bg-brand-primary w-[60%]" />
                  </div>
                </div>

                <div className="bg-brand-primary text-white p-5 rounded-xl space-y-1 relative overflow-hidden">
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                    <TrendingUp className="w-32 h-32" />
                  </div>
                  <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider block">
                    Limite Estimado Potencial
                  </span>
                  <p className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white">
                    R$ 300.000,00
                  </p>
                  <span className="text-[10px] text-emerald-200 block">
                    *Equivalente a 50% de faturamento anual declarado
                  </span>
                </div>

                {/* Checklist widget */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                    Nível de Preparação da sua Empresa
                  </span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Enquadramento tributário (Simples, Presumido)</span>
                      </div>
                      <span className="font-semibold text-emerald-700">OK</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-amber-900">Autorização Receita Federal (e-CAC)</span>
                      </div>
                      <span className="font-semibold text-amber-700">Pendente</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
