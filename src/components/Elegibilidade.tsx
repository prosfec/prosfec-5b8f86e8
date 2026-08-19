// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import {
  ShieldAlert,
  Coins,
  Activity,
  KeyRound,
  FileCheck,
  CheckCircle2
} from "lucide-react";

export default function Elegibilidade() {
  const requirements = [
    {
      title: "MEI, ME ou EPP",
      desc: "Microempreendedores Individuais, Microempresas e Empresas de Pequeno Porte registradas e ativas.",
      icon: ShieldAlert,
      tag: "Portabilidade"
    },
    {
      title: "Faturamento compatível",
      desc: "Análise de limites dimensionados ao faturamento da empresa — cobrindo desde MEI e Microempresas (ME/EPP) até Médio Porte.",
      icon: Coins,
      tag: "Porte & Limites"
    },
    {
      title: "Atividade regular",
      desc: "Inscrição ativa sem impedimentos graves ou suspensões regulatórias com a Receita Federal brasileira.",
      icon: Activity,
      tag: "CNPJ Ativo"
    },
    {
      title: "Compartilhamento e-CAC",
      desc: "Obrigatoriedade de disponibilizar o faturamento anual via login gov.br na aba de compartilhamento de dados.",
      icon: KeyRound,
      tag: "Obrigatório"
    },
    {
      title: "Regularidade fiscal",
      desc: "Certidão Conjunta de Débitos Relativos a Tributos Federais e à Dívida Ativa da União (ou liminar equivalente).",
      icon: FileCheck,
      tag: "Certidões"
    },
    {
      title: "Uso Estratégico",
      desc: "Destinação dos recursos em caixa exclusiva para capital de giro corporativo, expansões ou investir em maquinário.",
      icon: CheckCircle2,
      tag: "Giro / Caixa"
    }
  ];

  return (
    <section id="elegibilidade" className="py-16 md:py-24 bg-white scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-16 space-y-4 text-center"
        >
          <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-brand-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Requisitos & Pilar Cadastral
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-primary">
            Quem pode solicitar Crédito Governamental em 2026?
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            As linhas de fomento público atendem desde MEI até Micro (ME) e Pequenas Empresas (EPP). Certifique-se de que sua empresa cumpre os pilares regulamentares exigidos pelos bancos parceiros:
          </p>
        </motion.div>

        {/* 3x2 Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {requirements.map((req, index) => {
            const IconComponent = req.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-brand-bg-light/50 p-6 rounded-2xl border border-gray-100/80 hover:border-brand-primary/20 hover:bg-white hover:shadow-md transition-all duration-300 relative group"
              >
                {/* Secondary Small Tag */}
                <span className="absolute top-4 right-4 text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  {req.tag}
                </span>

                <div className="p-2.5 rounded-xl bg-brand-primary text-white w-fit mb-5 group-hover:scale-105 transition-transform">
                  <IconComponent className="w-5 h-5 text-brand-accent" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-bold text-lg text-brand-primary">
                    {req.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {req.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Direct Callout info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 p-6 bg-brand-primary text-white rounded-2xl inline-flex flex-col sm:flex-row items-center gap-4 text-left max-w-4xl border border-brand-accent/20"
        >
          <div className="bg-white/10 p-2.5 rounded-full text-brand-accent shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-300">Assessoria PROSFEC em Engenharia de Crédito:</p>
            <p className="text-xs text-gray-200 mt-1 leading-relaxed">
              Não se preocupe com pendências fiscais, contábeis ou de regularidade operacional. Nossa assessoria especializada realiza um diagnóstico aprofundado de sua estrutura empresarial e cuida diretamente do saneamento de eventuais restrições, coordenando os ajustes necessários junto a você ou ao seu contador para deixar sua empresa perfeitamente qualificada para a aprovação do crédito.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
