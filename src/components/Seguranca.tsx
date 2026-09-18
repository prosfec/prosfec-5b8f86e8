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
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "lgpd-compliance",
      title: "Conformidade com a LGPD",
      desc: "Respeitamos integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709). Seus dados são confidenciais e utilizados exclusivamente para calcular sua estimativa de limite.",
      icon: ShieldCheck,
      iconColor: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    },
    {
      id: "bank-servers",
      title: "Hospedagem em Nuvem Segura",
      desc: "Nossa infraestrutura é monitorada 24/7 em servidores de alta segurança, com proteção ativa contra ameaças digitais e backup contínuo.",
      icon: Database,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "consultative-only",
      title: "Sem Dados Sensíveis de Acesso",
      desc: "A PROSFEC realiza uma simulação puramente consultiva. Nunca solicitamos senhas bancárias, chaves de acesso ou tokens de movimentação financeira.",
      icon: ShieldAlert,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <section id="seguranca-e-confiabilidade" className="home-section py-12 md:py-16 bg-[#0B0F14] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div className="space-y-2 text-left max-w-2xl">
            <div className="home-kicker inline-flex items-center gap-1.5 text-xs font-bold uppercase">
              <Lock className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              Proteção Garantida
            </div>
            <h2 className="home-heading font-display font-bold text-3xl md:text-4xl">
              Segurança e Confiabilidade de Dados
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              Priorizamos a privacidade e a proteção de suas informações corporativas do início ao fim da simulação do Pronampe.
            </p>
          </div>

          {/* Mini-Stat Box */}
          <div className="flex items-center gap-3 bg-white/[0.02] px-5 py-3.5 rounded-2xl border border-white/10 shrink-0 self-start md:self-auto">
            <div className="bg-brand-primary text-brand-accent p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="text-left">
              <p className="text-xs text-zinc-500 font-medium">Ambiente em conformidade</p>
              <p className="text-sm font-bold text-white">Regulação Banco Central</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {safetyFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="home-card bg-white/[0.02] p-6 rounded-2xl border border-white/10 text-left flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className={`p-2.5 rounded-xl border inline-block ${feat.iconColor}`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-base text-white leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
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
