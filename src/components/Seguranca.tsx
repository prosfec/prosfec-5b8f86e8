// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Lock, ShieldCheck, Database, FileCheck, Landmark, ShieldAlert } from "lucide-react";

export default function Seguranca() {
  const safetyFeatures = [
    {
      id: "ssl-encryption",
      title: "Criptografia de Ponta a Ponta",
      desc: "Todas as informações enviadas são protegidas por protocolos SSL/TLS de 256 bits, o mesmo padrão de segurança utilizado pelas principais instituições financeiras.",
      icon: Lock,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      id: "lgpd-compliance",
      title: "Conformidade com a LGPD",
      desc: "Respeitamos integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709). Seus dados são confidenciais e utilizados exclusivamente para calcular sua estimativa de limite.",
      icon: ShieldCheck,
      iconColor: "text-teal-600 bg-teal-50 border-teal-100",
    },
    {
      id: "bank-servers",
      title: "Hospedagem em Nuvem Segura",
      desc: "Nossa infraestrutura é monitorada 24/7 em servidores de alta segurança, com proteção ativa contra ameaças digitais e backup contínuo.",
      icon: Database,
      iconColor: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      id: "consultative-only",
      title: "Sem Dados Sensíveis de Acesso",
      desc: "A PROSFEC realiza uma simulação puramente consultiva. Nunca solicitamos senhas bancárias, chaves de acesso ou tokens de movimentação financeira.",
      icon: ShieldAlert,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  return (
    <section id="seguranca-e-confiabilidade" className="py-12 md:py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="space-y-2 text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-brand-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-[#00A86B]" />
              Proteção Garantida
            </div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-brand-primary">
              Segurança e Confiabilidade de Dados
            </h2>
            <p className="text-gray-500 text-sm md:text-base leading-relaxed">
              Priorizamos a privacidade e a proteção de suas informações corporativas do início ao fim da simulação do Pronampe.
            </p>
          </div>

          {/* Mini-Stat Box */}
          <div className="flex items-center gap-3 bg-[#F5F7F6] px-5 py-3.5 rounded-2xl border border-gray-200/60 shrink-0 self-start md:self-auto">
            <div className="bg-brand-primary text-brand-accent p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 font-medium">Ambiente em conformidade</p>
              <p className="text-sm font-bold text-brand-primary">Regulação Banco Central</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {safetyFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-300 text-left flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className={`p-2.5 rounded-xl border inline-block ${feat.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-brand-primary leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
