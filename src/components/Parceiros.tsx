// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrencyBRL, triggerWebhookSimulation, saveLocalLead } from "../utils";
import { HelpingHand, Coins, Laptop, UserCheck, CheckCircle2, ArrowRight, Check, X, Sparkles } from "lucide-react";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { TermosDeUsoContent } from "./TermosDeUsoContent";

interface ParceirosProps {
  onSelectPlan?: (planName: string) => void;
}

export default function Parceiros({ onSelectPlan }: ParceirosProps) {
  const [partnerRegistered, setPartnerRegistered] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerCPF, setPartnerCPF] = useState("");
  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [partnerCityUF, setPartnerCityUF] = useState("");
  const [partnerPix, setPartnerPix] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");
  const [partnerConfirmPassword, setPartnerConfirmPassword] = useState("");
  const [partnerAcceptedTerms, setPartnerAcceptedTerms] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPartnerRegistered(false);
    setPartnerName("");
    setPartnerEmail("");
    setPartnerPhone("");
    setPartnerCPF("");
    setPartnerBirthDate("");
    setPartnerCityUF("");
    setPartnerPix("");
    setPartnerPassword("");
    setPartnerConfirmPassword("");
    setPartnerAcceptedTerms(false);
    setSelectedPlan(null);
    setIsSubmitting(false);
    setSubmitError(null);
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerEmail || !partnerName) return;
    if (!partnerAcceptedTerms) {
      alert("Você precisa aceitar os Termos de Uso do sistema.");
      return;
    }

    if (!partnerPassword) {
      setSubmitError("Por favor, crie uma senha para acessar sua área de parceiro.");
      return;
    }

    if (partnerPassword !== partnerConfirmPassword) {
      setSubmitError("As senhas informadas não coincidem.");
      return;
    }

    if (partnerPassword.length < 6) {
      setSubmitError("Sua senha deve conter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const text = `Olá PROSFEC! Tenho interesse no Programa de Parceiros:
- *Nome:* ${partnerName}
- *CPF:* ${partnerCPF || "Não informado"}
- *Data de Nascimento:* ${partnerBirthDate || "Não informada"}
- *Cidade/UF:* ${partnerCityUF || "Não informada"}
- *Chave Pix:* ${partnerPix || "Não informada"}
- *E-mail:* ${partnerEmail}
- *Telefone:* ${partnerPhone || "Não informado"}
- *Plano:* ${selectedPlan || "Não especificado"}
- *Termos aceitos:* Sim`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=5598987353253&text=${encodeURIComponent(text)}`;

    try {
      // Check if email already registered
      const qCheck = query(
        collection(db, "parceiros"),
        where("email", "==", partnerEmail.trim().toLowerCase())
      );
      const checkSnapshot = await getDocs(qCheck);
      if (!checkSnapshot.empty) {
        setSubmitError("Este e-mail já está sendo utilizado por outro parceiro.");
        setIsSubmitting(false);
        return;
      }

      const partnerDoc = {
        nome: partnerName,
        whatsapp: partnerPhone,
        email: partnerEmail.trim().toLowerCase(),
        cnpj: "", // Not available for personal partner signups
        cidade: partnerCityUF,
        interesse: "ser parceiro",
        status: "novo",
        dataCriacao: new Date().toISOString(),
        cpf: partnerCPF,
        dataNascimento: partnerBirthDate,
        chavePix: partnerPix,
        plano: selectedPlan || "Não especificado",
        aceitouTermos: partnerAcceptedTerms,
        senha: partnerPassword, // Choice of password
      };

      await addDoc(collection(db, "parceiros"), partnerDoc);
      console.log("Partner registered in Firestore successfully!");

      triggerWebhookSimulation("partner_application", {
        name: partnerName,
        email: partnerEmail,
        phone: partnerPhone,
        selectedPlan: selectedPlan || "Não especificado"
      });

      // Open WhatsApp directly with fallbacks for iframe compatibility
      const opened = window.open(whatsappUrl, "_blank");
      if (!opened) {
        window.location.href = whatsappUrl;
      }

      setPartnerRegistered(true);
    } catch (err: any) {
      console.error("Error saving partner application or processing submit:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, "parceiros");
      } catch (fErr) {
        setSubmitError("Erro ao salvar cadastro de parceiro no banco de dados. Por favor, tente novamente.");
      }
      window.location.href = whatsappUrl;
      setPartnerRegistered(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="parceiros" className="py-16 md:py-24 bg-white scroll-mt-12 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid Wrapper */}
        <div className="bg-brand-primary text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl border border-white/5 max-w-4xl mx-auto">
          
          <div className="absolute right-[-80px] bottom-[-80px] w-96 h-96 rounded-full bg-emerald-600/10 pointer-events-none" />

          {/* Core Info Panel */}
          <div className="space-y-6 flex flex-col justify-center">
            <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full w-fit">
              Ganhe Indicando Clientes
            </span>

            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white leading-tight">
              É contador, consultor ou correspondente bancário?
            </h2>

            <p className="text-gray-200 text-sm md:text-base leading-relaxed max-w-3xl">
              Indique clientes empresariais para nosso atendimento consultivo estratégico e garanta comissões atrativas sobre o montante aprovado. Acompanhe o progresso de cada proposta e os ganhos no nosso portal de parceiro. Sem taxas para fazer parte da rede.
            </p>

            {/* Program features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
                <Laptop className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-white">Painel Exclusivo</h4>
                  <p className="text-[10px] text-gray-300">Acompanhe leads captados e status em tempo real.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
                <Coins className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-white">Comissionamento</h4>
                  <p className="text-[10px] text-gray-300">Remuneração agressiva sobre contratos liberados.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10">
                <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-white">Suporte Técnico</h4>
                  <p className="text-[10px] text-gray-300">Orientação completa de nossa mesa regulatória.</p>
                </div>
              </div>
            </div>

            {/* CTA action buttons */}
            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={() => setIsPlansModalOpen(true)}
                className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold text-sm px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 inline-flex items-center gap-2 cursor-pointer"
              >
                Quero ser parceiro
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Partner Plans & Registration Modals */}
      <AnimatePresence>
        {isPlansModalOpen && (
          <div className="fixed inset-0 bg-brand-primary/80 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-100 rounded-3xl p-6 md:p-8 max-w-6xl w-full relative border border-gray-200/50 shadow-2xl flex flex-col font-sans"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsPlansModalOpen(false)}
                className="absolute right-4 top-4 hover:bg-gray-200 p-2 text-gray-500 rounded-full cursor-pointer transition-all z-20"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Modal Header */}
              <div className="text-center space-y-2 mb-8 mt-2">
                <span className="text-[#1A7F5A] font-extrabold text-xs uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                  PROGRAMA DE PARCEIROS
                </span>
                <h3 className="font-display font-extrabold text-2xl md:text-3xl text-[#0A5438]">
                  Escolha seu nível de atuação
                </h3>
                <p className="text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed">
                  Todos os planos incluem treinamento, sistema, suporte comercial e acesso ao ecossistema PROSFEC. Escolha apenas o nível de atuação que melhor se encaixa no seu momento.
                </p>
              </div>

              {/* 3-Column Plan Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-stretch pt-2">
                
                {/* CARD 1 - STARTER */}
                <div id="plan-starter-card" className="bg-white rounded-2xl p-6 border border-gray-200/65 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
                  <div>
                    {/* Tag superior */}
                    <span className="text-[10px] tracking-wider font-extrabold text-[#6B7280] uppercase block mb-2">
                      PLANO ACESSÍVEL
                    </span>
                    {/* Título */}
                    <h4 className="text-2xl font-extrabold text-[#0A5438] tracking-tight font-display">
                      STARTER
                    </h4>
                    {/* Subtítulo */}
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      Starter &gt; Ideal para iniciar sua atuação
                    </p>

                    {/* Box de preço com borda */}
                    <div className="border border-emerald-800/10 bg-emerald-50/20 rounded-xl p-4 text-center my-4">
                      <span className="text-3xl md:text-3xl font-extrabold text-[#1A7F5A] block">
                        R$ 500,00<span className="text-sm font-semibold text-slate-500">/ano</span>
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                        <span className="inline-block bg-emerald-100 text-[#0A5438] font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          PAGAMENTO ANUAL
                        </span>
                        <span className="inline-block bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                          Até 12x no Pix Parcelado
                        </span>
                      </div>
                    </div>

                    {/* Linha verde */}
                    <p className="text-sm font-bold text-[#1A7F5A] border-b border-emerald-150 pb-3 mb-3">
                      Comissão de 0,5% sobre o valor liberado
                    </p>

                    {/* Texto */}
                    <p className="text-sm font-semibold text-[#0A5438]">
                      Assinatura Anual com Acesso Completo
                    </p>
                    {/* Texto pequeno itálico */}
                    <p className="text-xs italic text-gray-400 mt-1 block">
                      Exemplo: R$ 1.000,00 de comissão em um contrato de R$ 200 mil
                    </p>

                    {/* Seção inclusos */}
                    <div className="mt-6 space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        TUDO QUE O STARTER OFERECE:
                      </p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2.5 text-xs text-slate-800 leading-snug font-bold bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 shadow-sm">
                          <span className="text-emerald-700 bg-emerald-100/80 rounded-full shrink-0 w-5 h-5 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-emerald-800" />
                          </span>
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold mb-0.5">Ferramenta Exclusiva</span>
                            <span>Ferramenta Caça-Leads: Liberada por pacotes de recarga (Bronze, Prata e Ouro — Até 20 resultados por busca totalmente higienizados e dados oficias cadastrais)</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Cadastro & Qualificação de Leads:</strong> Ficha cadastral com CNPJ, Faturamento e Sócios</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Simulações PRONAMPE:</strong> Limites estimados e diagnósticos automáticos</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Consultas de Crédito:</strong> Desconto especial em Rating e Diagnóstico</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Link de Afiliado Exclusivo:</strong> Ganhe comissão de 30% indicando novos parceiros</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span>Grupo de WhatsApp + gestor comercial + CRM de controle</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectPlan) {
                        setIsPlansModalOpen(false);
                        onSelectPlan("STARTER");
                      } else {
                        setSelectedPlan("STARTER");
                        setIsPlansModalOpen(false);
                        setIsModalOpen(true);
                      }
                    }}
                    className="w-full mt-8 bg-[#0A5438] hover:opacity-95 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                  >
                    Selecionar STARTER →
                  </button>
                </div>

                {/* CARD 2 - EXECUTIVE (MAIS VENDIDO) */}
                <div id="plan-executive-card" className="bg-white rounded-2xl p-6 border-2 border-[#0A5438] shadow-md flex flex-col justify-between h-full transition-all relative lg:scale-[1.03] z-10">
                  <div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="bg-[#1A7F5A] text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                        MAIS VENDIDO
                      </span>
                      <span className="bg-emerald-100 text-[#0A5438] font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                        VIVER DE PRONAMPE
                      </span>
                    </div>

                    {/* Título */}
                    <h4 className="text-2xl font-extrabold text-[#0A5438] tracking-tight font-display">
                      Executive Partner PROSFEC
                    </h4>
                    {/* Subtítulo */}
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      Executive &gt; Para atuar profissionalmente
                    </p>

                    {/* Box de preço com borda */}
                    <div className="border border-[#0A5438]/25 bg-emerald-500/5 rounded-xl p-4 text-center my-4">
                      <span className="text-3xl md:text-3xl font-extrabold text-[#1A7F5A] block">
                        R$ 800,00<span className="text-sm font-semibold text-slate-500">/ano</span>
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                        <span className="inline-block bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                          PAGAMENTO ANUAL
                        </span>
                        <span className="inline-block bg-[#0A5438] text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                          Até 12x no Pix Parcelado
                        </span>
                      </div>
                    </div>

                    {/* Linha verde */}
                    <p className="text-sm font-bold text-[#1A7F5A] border-b border-emerald-150 pb-3 mb-3">
                      Comissão de 1,5% (R$ 3.000,00 em R$ 200 mil)
                    </p>

                    {/* Texto */}
                    <p className="text-sm font-semibold text-[#0A5438]">
                      Simulador Comercial Exclusivo
                    </p>
                    {/* Texto pequeno itálico */}
                    <p className="text-xs italic text-gray-400 mt-1 block">
                      1 única operação recupera seu investimento no plano
                    </p>

                    {/* Seção inclusos */}
                    <div className="mt-6 space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        TUDO QUE O EXECUTIVE OFERECE:
                      </p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2.5 text-xs text-slate-800 leading-snug font-bold bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-sm">
                          <span className="text-emerald-700 bg-emerald-100 rounded-full shrink-0 w-5 h-5 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-emerald-800" />
                          </span>
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold mb-0.5">Ferramenta Exclusiva</span>
                            <span>Ferramenta Caça-Leads: Liberada por pacotes de recarga (Bronze, Prata e Ouro — Até 20 resultados por busca totalmente higienizados e dados oficias cadastrais)</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-[#1A7F5A] bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Triplo de Comissão (1,5%):</strong> Ganhe 3x mais do que no plano Starter por operação</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-[#1A7F5A] bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Simulador Comercial Avançado:</strong> Tabela SAC/Price, carência, juros e envio de proposta em PDF/WhatsApp</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-[#1A7F5A] bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Painel de Performance Individual:</strong> Gráficos e relatórios de pipeline em tempo real</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-[#1A7F5A] bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Prioridade na Mesa Operacional:</strong> Analistas de crédito dedicados para acelerar aprovações</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-[#1A7F5A] bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Treinamento 2x por semana:</strong> Mentoria e técnicas de vendas de crédito corporativo</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-[#1A7F5A] bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Link de Afiliado Exclusivo:</strong> Ganhe 30% de comissão por Executive indicado</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectPlan) {
                        setIsPlansModalOpen(false);
                        onSelectPlan("Executive Partner PROSFEC");
                      } else {
                        setSelectedPlan("Executive Partner PROSFEC");
                        setIsPlansModalOpen(false);
                        setIsModalOpen(true);
                      }
                    }}
                    className="w-full mt-8 bg-[#0A5438] hover:bg-[#0A5438]/95 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] ring-2 ring-[#0A5438]/20"
                  >
                    Selecionar Executive Partner PROSFEC →
                  </button>
                </div>

                {/* CARD 3 - MASTER PARTNER */}
                <div id="plan-master-card" className="bg-white rounded-2xl p-6 border border-gray-200/65 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md">
                  <div>
                    {/* Tag superior */}
                    <span className="bg-amber-100 text-amber-800 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full w-fit block mb-3">
                      ESCALAR E FORMAR TIME
                    </span>

                    {/* Título */}
                    <h4 className="text-2xl font-extrabold text-brand-primary tracking-tight font-display">
                      MASTER PARTNER
                    </h4>
                    {/* Subtítulo */}
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      Master &gt; Para construir sua própria equipe
                    </p>

                    {/* Box de preço */}
                    <div className="border border-emerald-800/10 bg-emerald-50/20 rounded-xl p-4 text-center my-4">
                      <span className="text-3xl md:text-3xl font-extrabold text-[#1A7F5A] block">
                        R$ 1.500,00<span className="text-sm font-semibold text-slate-500">/ano</span>
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                        <span className="inline-block bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                          PAGAMENTO ANUAL
                        </span>
                        <span className="inline-block bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                          Até 12x no Pix Parcelado
                        </span>
                      </div>
                    </div>

                    {/* Linha verde */}
                    <p className="text-sm font-bold text-[#1A7F5A] border-b border-emerald-150 pb-3 mb-3">
                      Até 3,0% de comissão (2,5% dir. + 0,5% eq.)
                    </p>

                    {/* Texto */}
                    <p className="text-sm font-semibold text-gray-700">
                      R$ 6.000,00 por contrato de R$ 200 mil + Override
                    </p>
                    {/* Texto pequeno itálico */}
                    <p className="text-xs italic text-gray-400 mt-1 block">
                      Monte sua franquia digital de crédito sem limites
                    </p>

                    {/* Seção inclusos */}
                    <div className="mt-6 space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        TUDO QUE O MASTER OFERECE:
                      </p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2.5 text-xs text-slate-800 leading-snug font-bold bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
                          <span className="text-amber-700 bg-amber-100 rounded-full shrink-0 w-5 h-5 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-amber-800" />
                          </span>
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider text-amber-800 font-extrabold mb-0.5">Ferramenta Exclusiva</span>
                            <span>Ferramenta Caça-Leads: Liberada por pacotes de recarga (Bronze, Prata e Ouro — Até 20 resultados por busca totalmente higienizados e dados oficias cadastrais)</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Gestão de Equipe (Franquia Digital):</strong> Cadastre consultores e vendedores vinculados à sua rede</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Distribuição de Leads em Lote:</strong> Transfira e atribua empresas captadas diretamente para seu time</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Ganha Override de Comissão:</strong> Receba participação sobre a produção de todos os seus consultores</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Consultores Sem Custo Adicional:</strong> Sua equipe usa o ecossistema sem taxa extra</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Suporte & Mentoria da Mesa VIP:</strong> Treinamento de equipe e suporte em operações estruturadas</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-xs text-gray-700 leading-snug">
                          <span className="text-emerald-600 bg-emerald-50 rounded-full p-0.5 shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <span><strong>Link de Afiliado Exclusivo:</strong> Ganhe 30% de comissão por Master indicado</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectPlan) {
                        setIsPlansModalOpen(false);
                        onSelectPlan("MASTER PARTNER");
                      } else {
                        setSelectedPlan("MASTER PARTNER");
                        setIsPlansModalOpen(false);
                        setIsModalOpen(true);
                      }
                    }}
                    className="w-full mt-8 bg-[#E67E22] hover:bg-[#E67E22]/95 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                  >
                    Selecionar MASTER PARTNER →
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-brand-primary/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-white rounded-3xl p-6 md:p-8 w-full max-h-[90vh] overflow-y-auto relative border border-gray-100 shadow-2xl scrollbar-thin transition-all duration-300 ${
                partnerRegistered ? "max-w-lg" : "max-w-2xl"
              }`}
            >
              <button
                onClick={handleCloseModal}
                className="absolute right-4 top-4 hover:bg-gray-100 p-2 text-gray-400 rounded-full cursor-pointer transition-all"
              >
                ✕
              </button>

              {!partnerRegistered ? (
                <form onSubmit={handlePartnerSubmit} className="space-y-5 text-left">
                  <div className="text-center space-y-2">
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] tracking-wider uppercase font-extrabold px-3 py-1 rounded-full inline-block">
                      Plano selecionado: {selectedPlan || "Nenhum"}
                    </span>
                    <h3 className="font-display font-extrabold text-xl md:text-2xl text-brand-primary">
                      Seja um Parceiro PROSFEC
                    </h3>
                    <p className="text-xs text-gray-500">
                      Preencha a ficha de cadastro completa abaixo para receber seu login do sistema de parceiros e os termos de uso.
                    </p>
                  </div>

                  {/* Ficha de Cadastro Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Nome Completo / Razão Social */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Nome Completo / Razão social *
                      </label>
                      <input
                        type="text"
                        required
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder="Nome completo ou Razão Social"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary rounded-xl p-3 text-sm outline-none text-gray-800"
                      />
                    </div>

                    {/* E-mail */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        E-mail de Contato *
                      </label>
                      <input
                        type="email"
                        required
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary rounded-xl p-3 text-sm outline-none text-gray-800"
                      />
                    </div>

                    {/* Criar Senha */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Criar Senha de Acesso *
                      </label>
                      <input
                        type="password"
                        required
                        value={partnerPassword}
                        onChange={(e) => setPartnerPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary rounded-xl p-3 text-sm outline-none text-gray-800"
                      />
                    </div>

                    {/* Confirmar Senha */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Confirmar Senha *
                      </label>
                      <input
                        type="password"
                        required
                        value={partnerConfirmPassword}
                        onChange={(e) => setPartnerConfirmPassword(e.target.value)}
                        placeholder="Repita a senha criada"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-brand-primary rounded-xl p-3 text-sm outline-none text-gray-800"
                      />
                    </div>
                  </div>

                  {/* Termos de Uso Box */}
                  <div className="bg-gray-50 p-4 border border-gray-100 rounded-xl space-y-2 mt-2">
                    <h4 className="text-xs font-bold text-gray-700 uppercase">Termos de Uso do Sistema</h4>
                    <div className="text-[10px] text-gray-500 leading-relaxed max-h-48 overflow-y-auto border border-gray-200/50 p-3 rounded-lg bg-white space-y-2.5 scrollbar-thin">
                      <TermosDeUsoContent variant="light" />
                    </div>

                    <div className="flex items-start gap-2.5 pt-2">
                      <input
                        type="checkbox"
                        id="accept-terms-checkbox"
                        checked={partnerAcceptedTerms}
                        onChange={(e) => setPartnerAcceptedTerms(e.target.checked)}
                        className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                        required
                      />
                      <label htmlFor="accept-terms-checkbox" className="text-xs font-medium text-gray-600 select-none cursor-pointer">
                        Li, compreendi e aceito os Termos de Uso e regras de comissionamento da PROSFEC. *
                      </label>
                    </div>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-100 text-center mt-3">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#0A5438] hover:opacity-95 text-white font-bold p-3.5 rounded-xl text-sm transition-all shadow-md cursor-pointer mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Confirmar e Enviar Ficha de Cadastro"
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-6">
                  <div className="bg-emerald-100 text-[#0A5438] p-3.5 rounded-full w-14 h-14 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-display font-extrabold text-xl md:text-2xl text-[#0A5438] leading-tight">
                      Parabéns! Sua ficha de cadastro foi recebida pela PROSFEC.
                    </h4>
                    
                    <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                      Nossa equipe vai entrar em contato pelo WhatsApp ou e-mail informados em até 24h úteis para te apresentar nossa estrutura completa: sistema de parceiros, treinamentos, suporte comercial e as instituições financeiras homologadas.
                    </p>
                    
                    <p className="text-sm font-semibold text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 max-w-md mx-auto">
                      Fique atento às mensagens. Você acaba de dar o primeiro passo para monetizar sua carteira de clientes.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 max-w-sm mx-auto space-y-3">
                    <button
                      onClick={handleCloseModal}
                      className="w-full bg-[#0A5438] hover:opacity-95 text-white font-bold p-4 rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                    >
                      Acessar Portal do Parceiro
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={handleCloseModal}
                      className="text-xs text-gray-400 hover:text-gray-600 font-medium cursor-pointer transition-all underline block mx-auto"
                    >
                      Voltar para o site
                    </button>
                  </div>

                  {/* Subtle Footer */}
                  <div className="border-t border-gray-100 pt-5 mt-2">
                    <p className="text-[11px] text-gray-400 font-medium">
                      Você tem 3 dias de acesso liberado para teste de nossos sistemas.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
