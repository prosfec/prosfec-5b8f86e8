/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Check, ShieldX, HelpCircle, ArrowRight, ShieldCheck } from "lucide-react";

interface ConsultoriaProps {
  onSimulateClick: () => void;
}

export default function Consultoria({ onSimulateClick }: ConsultoriaProps) {
  const bulletPoints = [
    "Diagnóstico e mapeamento da linha ideal com menor taxa (Pronampe, FAMP, Proger, Finep)",
    "Melhoria do perfil de crédito e elevação do rating bancário do CNPJ e sócios",
    "Saneamento prévio de restrições cadastrais e certidões (CND, Cadin, Serasa)",
    "Estratégias de reestruturação e renegociação de dívidas bancárias onerosas",
    "Orientação prática para compartilhamento de faturamento no e-CAC da Receita",
    "Elaboração de dossiê consultivo e encaminhamento estratégico a gerentes parceiros"
  ];

  return (
    <section id="consultoria" className="py-16 md:py-24 bg-brand-bg-light scroll-mt-12 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid: Info Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Core concept explanation - 6 cols */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1 bg-brand-primary/15 text-brand-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
              Análise Especializada
            </div>
            
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-primary leading-tight">
              O problema não é só pedir crédito. <span className="text-emerald-700">É escolher a linha certa e pedir do jeito certo.</span>
            </h2>
            
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Muitos micro e pequenos empresários têm direito a excelentes limites no Pronampe, FAMP Sebrae, Proger ou FINEP, mas o pedido acaba negado por falta de alinhamento com a linha correta ou por pequenos detalhes cadastrais. 
            </p>

            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Falhas de enquadramento societário, falta de liberação correta de faturamento no e-CAC da Receita, CNDs vencidas ou até o envio da proposta para o banco inadequado para o seu setor são os principais culpados pelo travamento.
            </p>

            {/* Simulated versus box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-sm mb-1">
                  <ShieldX className="w-4.5 h-4.5 shrink-0" />
                  <span>Sem Assessoria</span>
                </div>
                <p className="text-xs text-rose-700 leading-normal">
                  Proposta jogada no banco comum, sem conferência, que entra na fila genérica e costuma ser reprovada sem justificativa clara.
                </p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-sm mb-1">
                  <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
                  <span>Com PROSFEC</span>
                </div>
                <p className="text-xs text-emerald-700 leading-normal">
                  Perfil montado de forma estratégica, pendências identificadas previamente e encaminhamento direto para gerentes de convênio.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Bullets list with custom style - 6 cols */}
          <div className="lg:col-span-6 bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-xl space-y-6">
            <h3 className="font-display font-bold text-xl text-brand-primary border-b border-gray-50 pb-3">
              Como atuamos na preparação do seu pedido:
            </h3>

            <div className="space-y-4">
              {bulletPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="bg-brand-accent/20 text-brand-primary p-1 rounded-full shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 leading-snug">
                    {point}
                  </span>
                </div>
              ))}
            </div>

            {/* Highlight Call to simulation action */}
            <div className="pt-4">
              <button
                onClick={onSimulateClick}
                className="w-full bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold py-4 px-6 rounded-xl text-center shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                Simular com orientação consultiva
                <ArrowRight className="w-5 h-5 shrink-0" />
              </button>
              
              <span className="text-[10px] text-gray-400 text-center block mt-3">
                Não cobramos tarifas prévias. O diagnóstico de viabilidade é 100% gratuito.
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
