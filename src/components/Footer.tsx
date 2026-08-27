// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Landmark, ArrowRight, ShieldCheck, Mail, Phone, X, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TermosDeUsoContent } from "./TermosDeUsoContent";

interface FooterProps {
  onSimulateClick: () => void;
  referredByPartnerWhatsapp?: string | null;
  referredByPartnerNome?: string | null;
}

export default function Footer({ onSimulateClick, referredByPartnerWhatsapp, referredByPartnerNome }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <footer className="bg-brand-primary text-gray-300 pt-16 pb-24 md:pb-12 border-t border-emerald-950 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Core footer layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-white/5">
          
          {/* Column 1 - Brand Info - 5 cols */}
          <div className="col-span-1 md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-white p-2 rounded-lg text-brand-primary">
                <Landmark className="w-5 h-5 text-brand-accent" strokeWidth={2} />
              </div>
              <span className="font-display font-extrabold text-lg text-white block">
                PROSFEC — Assessoria em Crédito Governamental
              </span>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              Especialistas em inteligência e preparação de crédito corporativo focado em micro e pequenas empresas (MEI, ME e EPP). Atendimento consultivo transparente focado no crescimento do seu negócio.
            </p>

            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-white/5 p-2.5 rounded-lg w-fit border border-white/5">
              <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>Diagnóstico de Viabilidade 100% Gratuito</span>
            </div>
          </div>

          {/* Column 2 - Links - 3 cols */}
          <div className="col-span-1 md:col-span-3 space-y-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">
              Navegação Interna
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#novidades"
                  onClick={(e) => handleLinkClick(e, "novidades")}
                  className="hover:text-white transition-colors"
                >
                  Crédito Governamental 2026
                </a>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  onClick={(e) => handleLinkClick(e, "como-funciona")}
                  className="hover:text-white transition-colors"
                >
                  Etapas da liberação
                </a>
              </li>
              <li>
                <a
                  href="#elegibilidade"
                  onClick={(e) => handleLinkClick(e, "elegibilidade")}
                  className="hover:text-white transition-colors"
                >
                  Critérios de elegibilidade
                </a>
              </li>
              <li>
                <a
                  href="#parceiros"
                  onClick={(e) => handleLinkClick(e, "parceiros")}
                  className="hover:text-white transition-colors"
                >
                  Programa de recomendador
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  onClick={(e) => handleLinkClick(e, "faq")}
                  className="hover:text-white transition-colors"
                >
                  Perguntas e Respostas
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 - Contact & Offices - 4 cols */}
          <div className="col-span-1 md:col-span-4 space-y-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">
              Contato e Escritório
            </h4>
            
            <ul className="space-y-3 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2} />
                {referredByPartnerWhatsapp ? (
                  <a
                    href={`https://api.whatsapp.com/send?phone=${referredByPartnerWhatsapp.replace(/\D/g, "")}&text=Ol%C3%A1%20${encodeURIComponent(referredByPartnerNome || "")}!%20Gostaria%20de%20falar%20com%20voc%C3%AA%20sobre%20o%20Pronampe%202026.`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-block"
                  >
                    {referredByPartnerWhatsapp} ({referredByPartnerNome || "Parceiro"})
                  </a>
                ) : (
                  <a
                    href="https://api.whatsapp.com/send?phone=5598987353253&text=Ol%C3%A1%20PROSFEC!%20Gostaria%20de%20falar%20com%20um%20consultor%20especialista%20do%20Pronampe%202026."
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-block"
                  >
                    (98) 98735-3253 (WhatsApp)
                  </a>
                )}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2} />
                <span>contato@prosfec.com.br</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Legal Text as strict requirement */}
        <div className="py-8 text-left space-y-4">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            <strong>AVISO LEGAL IMPORTANTE:</strong> As condições de enquadramento, taxas de juros, carência e liberação final do limite de crédito do Pronampe podem sofrer alterações drásticas conforme as regulamentações governamentais decorrentes do ano vigente de 2026, a disponibilidade de recursos de repasse junto aos respectivos fundos garantidores, alterações nas taxas de política monetária do Banco Central, a política interna particular de cadastro de cada agente financeiro e a análise prévia do departamento de risco de crédito da instituição bancária parceira.
          </p>
          
          <p className="text-[10px] text-gray-500 leading-relaxed">
            A <strong>PROSFEC</strong> é uma sociedade de assessoria mercadológica corporativa de capitais, consultoria em negócios e inteligência de fomento privado. Nós <strong>NÃO</strong> somos um banco comercial, banco cooperativo, cooperativa de crédito, nem administramos fundos estatais. A PROSFEC atua estritamente como consultoria de fomento orientador, auxiliando pequenas empresas na elaboração cadastral, diagnóstico técnico no portal e-CAC da Receita Federal e na estruturação documental do dossiê corporativo. Nós não garantimos a aprovação ou liberação do recurso bancário.
          </p>
        </div>

        {/* Final subfooter */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© {currentYear} PROSFEC - Estruturação de Crédito Corporativo. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a
              id="footer-terms-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsTermsOpen(true);
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Termos de Uso
            </a>
            <span>·</span>
            <a
              id="footer-privacy-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsPrivacyOpen(true);
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Política de Privacidade
            </a>
            <span>·</span>
            <a
              id="footer-admin-link"
              href="/admin"
              className="hover:text-white transition-colors cursor-pointer opacity-70"
            >
              Área Administrativa
            </a>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {isTermsOpen && (
          <div id="terms-modal-container" className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              id="terms-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTermsOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Card */}
            <motion.div
              id="terms-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl relative z-10 flex flex-col max-h-[85vh] border border-gray-100 text-left"
            >
              {/* Header */}
              <div id="terms-modal-header" className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                    <FileText className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-none">Termos de Uso</h3>
                    <p className="text-xs text-gray-500 mt-1">PROSFEC - Pronampe</p>
                  </div>
                </div>
                <button
                  id="terms-modal-close-header-btn"
                  onClick={() => setIsTermsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              {/* Content (Scrollable) */}
              <div id="terms-modal-content" className="px-8 py-6 overflow-y-auto max-h-[60vh] text-sm leading-relaxed space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
                <TermosDeUsoContent variant="light" />
              </div>

              {/* Footer */}
              <div id="terms-modal-footer" className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-2xl">
                <button
                  id="terms-modal-accept-btn"
                  onClick={() => setIsTermsOpen(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  Entendi e Aceito
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isPrivacyOpen && (
          <div id="privacy-modal-container" className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              id="privacy-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrivacyOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Card */}
            <motion.div
              id="privacy-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl relative z-10 flex flex-col max-h-[85vh] border border-gray-100 text-left"
            >
              {/* Header */}
              <div id="privacy-modal-header" className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                    <ShieldCheck className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-none">Política de Privacidade</h3>
                    <p className="text-xs text-gray-500 mt-1">PROSFEC - Pronampe</p>
                  </div>
                </div>
                <button
                  id="privacy-modal-close-header-btn"
                  onClick={() => setIsPrivacyOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              {/* Content (Scrollable) */}
              <div id="privacy-modal-content" className="px-8 py-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
                
                {/* Section 1 */}
                <div id="privacy-section-1">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">1.</span> Quem somos
                  </h4>
                  <p>
                    A PROSFEC é uma plataforma de consultoria especializada em crédito empresarial. Não somos uma instituição financeira e não concedemos crédito.
                  </p>
                </div>

                {/* Section 2 */}
                <div id="privacy-section-2">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">2.</span> Dados que coletamos
                  </h4>
                  <p className="mb-2">
                    Coletamos as informações que você nos fornece para realizar a simulação consultiva, incluindo:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>Dados da empresa (CNPJ, razão social, porte, faturamento)</li>
                    <li>Dados de contato (nome, e-mail, telefone/WhatsApp)</li>
                    <li>Informações sobre situação fiscal e bancária declaradas por você</li>
                  </ul>
                </div>

                {/* Section 3 */}
                <div id="privacy-section-3">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">3.</span> Como usamos seus dados
                  </h4>
                  <p className="mb-2">
                    Seus dados são usados exclusivamente para:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>Realizar a simulação consultiva do limite potencial de crédito</li>
                    <li>Permitir o atendimento por um consultor especializado</li>
                    <li>Acompanhar o andamento do seu pedido na área do cliente</li>
                    <li>Cumprir obrigações legais e regulatórias</li>
                  </ul>
                </div>

                {/* Section 4 */}
                <div id="privacy-section-4">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">4.</span> Compartilhamento
                  </h4>
                  <p>
                    Compartilhamos dados apenas com o consultor responsável pelo seu atendimento e com instituições financeiras parceiras quando você autorizar o encaminhamento do seu pedido.
                  </p>
                </div>

                {/* Section 5 */}
                <div id="privacy-section-5">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">5.</span> Seus direitos (LGPD)
                  </h4>
                  <p className="mb-2">
                    Você pode, a qualquer momento:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 mb-2">
                    <li>Solicitar correção, exclusão ou exportação dos seus dados</li>
                    <li>Revogar o consentimento dado para o tratamento</li>
                  </ul>
                  <p>
                    Para exercer seus direitos, entre em contato pelo canal de atendimento informado.
                  </p>
                </div>

                {/* Section 6 */}
                <div id="privacy-section-6">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">6.</span> Segurança
                  </h4>
                  <p>
                    Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito, controle de acesso por perfil e auditoria de operações.
                  </p>
                </div>

                {/* Section 7 */}
                <div id="privacy-section-7">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">7.</span> Contato
                  </h4>
                  <p>
                    Dúvidas sobre privacidade ou solicitações relacionadas aos seus dados podem ser enviadas pelo canal de atendimento informado na plataforma.
                  </p>
                </div>

              </div>

              {/* Footer */}
              <div id="privacy-modal-footer" className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-2xl">
                <button
                  id="privacy-modal-accept-btn"
                  onClick={() => setIsPrivacyOpen(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  Entendi e Aceito
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
