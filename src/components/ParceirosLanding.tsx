// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatCurrencyBRL } from "../utils";
import PartnerPortal from "./PartnerPortal";
import {
  Landmark,
  ArrowRight,
  Users,
  Check,
  Sparkles,
  ShieldCheck,
  Coins,
  Laptop,
  Sun,
  LineChart,
  Banknote,
  Target,
  Handshake,
  ChevronDown,
  Zap,
  BadgeCheck,
} from "lucide-react";

const PRODUTOS = [
  {
    icon: Banknote,
    tag: "Produto 1",
    title: "Crédito Empresarial & PRONAMPE",
    desc: "Captação de crédito com custo baixo para capital de giro, expansão ou troca de dívidas caras. É o produto de maior ticket da esteira.",
    ganho: "Comissões de R$ 1.000 a R$ 6.000+ por operação liberada.",
  },
  {
    icon: LineChart,
    tag: "Produto 2",
    title: "Estruturação Financeira & Rating",
    desc: "Diagnóstico profundo, regularização de apontamentos e adequação contábil para destravar empresas que já tiveram crédito negado.",
    ganho: "Remuneração sobre laudos técnicos e honorários de assessoria.",
  },
  {
    icon: Sun,
    tag: "Produto 3",
    title: "Energia Solar por Assinatura",
    desc: "Sem obra, sem placas e sem investimento. A empresa passa a economizar de 17% a 27% na conta de luz com adesão 100% digital.",
    ganho: "Comissões com repasses rápidos a cada cliente ativado.",
  },
];

const PASSOS = [
  {
    n: "01",
    title: "Você identifica a oportunidade",
    desc: "Use a ferramenta Caça-Leads ou a sua própria rede de contatos para cadastrar a empresa direto no seu painel.",
  },
  {
    n: "02",
    title: "Nossa Mesa assume a operação",
    desc: "Analistas e especialistas da PROSFEC montam o dossiê, tratam balanços e protocolam a proposta nos bancos.",
  },
  {
    n: "03",
    title: "Contrato assinado, comissão na conta",
    desc: "Você acompanha cada etapa em tempo real pelo painel e solicita o seu saque via PIX com total transparência.",
  },
];

const FAQS = [
  {
    q: "Preciso ter CNPJ ou posso começar como pessoa física?",
    a: "Pode começar como pessoa física. Basta CPF e chave PIX no cadastro. Se preferir emitir nota pelo seu CNPJ, também é possível.",
  },
  {
    q: "Preciso de certificação bancária (CPA-10, ANEPS) para atuar?",
    a: "Não. Você atua como indicador consultivo: identifica a empresa e conduz o relacionamento. Toda a parte técnica e regulatória fica com a Mesa Operacional PROSFEC.",
  },
  {
    q: "Como funciona o teste grátis de 3 dias?",
    a: "Você cria seu acesso, entra no painel, conhece as ferramentas e só segue no plano se fizer sentido para o seu momento. Sem burocracia para cancelar.",
  },
  {
    q: "Como e quando as comissões são pagas?",
    a: "Tudo fica registrado no seu painel. Você solicita o saque e recebe via PIX, com relatório detalhado de cada operação e do que já foi liquidado.",
  },
  {
    q: "Preciso entender de crédito bancário para vender?",
    a: "Não. Você recebe treinamento, materiais e o acompanhamento de um gestor comercial. Nossa esteira foi desenhada para quem já conversa com empresários no dia a dia.",
  },
  {
    q: "Posso montar minha própria equipe de consultores?",
    a: "Sim. No plano Master Partner você cadastra consultores vinculados, acompanha a produção de cada um e ainda recebe override sobre o que a sua equipe fecha.",
  },
];

export default function ParceirosLanding() {
  const [showPortal, setShowPortal] = useState(false);
  const [initialPlan, setInitialPlan] = useState("Executive Partner PROSFEC");
  const [initialRegister, setInitialRegister] = useState(false);
  const [assinaturaParceiro, setAssinaturaParceiro] = useState(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [refNome, setRefNome] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch("/api/config/mensalidades")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ativo && d?.assinaturaParceiro) setAssinaturaParceiro(d.assinaturaParceiro);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  // Captura o código de indicação para vincular o novo parceiro ao Master que divulgou o link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawRefId = params.get("ref") || params.get("master") || params.get("indicador") || params.get("parceiro");
    const refId = rawRefId ? rawRefId.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060]/g, "").trim() : null;
    if (!refId) return;
    localStorage.setItem("lca_referred_by", refId);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "parceiros", refId));
        if (snap.exists()) {
          const data = snap.data() || {};
          if (data.nome) {
            localStorage.setItem("lca_referred_by_nome", String(data.nome));
            setRefNome(String(data.nome));
          }
          if (data.whatsapp) localStorage.setItem("lca_referred_by_whatsapp", String(data.whatsapp));
        }
      } catch (err) {
        console.error("Falha ao carregar o parceiro indicador:", err);
      }
    })();

    if (params.get("portal-parceiro") === "true" || params.has("area-parceiro")) {
      setShowPortal(true);
    }
  }, []);

  const precoMensal = (valor?: number) =>
    typeof valor === "number" ? (
      <>
        {formatCurrencyBRL(valor)}
        <span className="text-sm font-semibold text-zinc-400">/mês</span>
      </>
    ) : (
      <span className="inline-block h-7 w-32 bg-white/10 rounded animate-pulse align-middle" />
    );

  const irParaPlanos = () => {
    const el = document.getElementById("planos");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  const assinarPlano = (plano: string) => {
    setInitialPlan(plano);
    setInitialRegister(true);
    setShowPortal(true);
  };

  const planos = useMemo(
    () => [
      {
        id: "STARTER",
        tag: "PLANO ACESSÍVEL",
        nome: "STARTER",
        sub: "Para iniciar, validar e fazer as primeiras operações",
        preco: assinaturaParceiro?.starter,
        comissao: "Comissão de 0,5% sobre o valor liberado",
        exemplo: "R$ 1.000,00 de comissão em um contrato de R$ 200 mil",
        destaque: false,
        itens: [
          "Ferramenta Caça-Leads liberada por pacotes de recarga, com dados cadastrais oficiais higienizados",
          "Cadastro e qualificação de leads com CNPJ, faturamento e quadro de sócios",
          "Simulações PRONAMPE com limites estimados e diagnóstico automático",
          "Consultas de crédito com desconto especial em Rating e Diagnóstico",
          "Grupo de WhatsApp, gestor comercial e CRM de controle",
        ],
      },
      {
        id: "Executive Partner PROSFEC",
        tag: "MAIS VENDIDO",
        nome: "EXECUTIVE PARTNER",
        sub: "Para atuar profissionalmente e viver de PRONAMPE",
        preco: assinaturaParceiro?.executive,
        comissao: "Comissão de 1,5% (R$ 3.000,00 em R$ 200 mil)",
        exemplo: "Uma única operação já recupera o investimento no plano",
        destaque: true,
        itens: [
          "Triplo de comissão: ganhe 3x mais por operação do que no Starter",
          "Simulador Comercial Avançado com SAC/Price, carência e proposta em PDF/WhatsApp",
          "Ferramenta Caça-Leads com dados oficiais de empresas da sua região",
          "Painel de performance individual com pipeline em tempo real",
          "Prioridade na Mesa Operacional e treinamento 2x por semana",
        ],
      },
      {
        id: "MASTER PARTNER",
        tag: "ESCALAR E FORMAR TIME",
        nome: "MASTER PARTNER",
        sub: "Para construir a sua própria equipe de consultores",
        preco: assinaturaParceiro?.master,
        comissao: "Até 3,0% de comissão (2,5% direto + 0,5% de equipe)",
        exemplo: "R$ 6.000,00 por contrato de R$ 200 mil, mais o override da equipe",
        destaque: false,
        itens: [
          "Tudo do Executive, sem limite de consultores vinculados",
          "Painel de gestão da equipe com produção e desempenho de cada consultor",
          "Override de 0,5% sobre tudo que a sua equipe fechar",
          "Link próprio de recrutamento para cadastrar novos consultores",
          "Apoio direto da diretoria comercial para montar a sua franquia digital",
        ],
      },
    ],
    [assinaturaParceiro],
  );

  if (showPortal) {
    return (
      <PartnerPortal
        initialPlan={initialPlan}
        initialIsRegistering={initialRegister}
        onBackToHome={() => {
          setShowPortal(false);
          setInitialRegister(false);
        }}
      />
    );
  }

  return (
    <div className="home-premium font-sans antialiased bg-[#0B0F14] text-zinc-300 min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-zinc-950/85 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 group shrink-0">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-lg md:text-xl text-white block">PROSFEC</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-bold">Partner Network</span>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/" className="hidden md:inline text-xs font-medium text-zinc-400 hover:text-white transition-colors">
              Ir para o site institucional
            </a>
            <button
              onClick={() => {
                setInitialRegister(false);
                setShowPortal(true);
              }}
              className="border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-zinc-100 font-bold text-xs px-3.5 sm:px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              <span className="hidden sm:inline">Já sou Parceiro (</span>Entrar<span className="hidden sm:inline">)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-24 w-[24rem] h-[24rem] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {refNome && (
              <div className="mb-6 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold px-3.5 py-2 rounded-full">
                <Handshake className="w-4 h-4" strokeWidth={2} />
                Você foi convidado por {refNome}
              </div>
            )}

            <span className="inline-block bg-emerald-500/15 text-emerald-300 font-extrabold text-[10px] sm:text-xs uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full">
              Programa Oficial de Parceiros PROSFEC 2026
            </span>

            <h1 className="mt-5 font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white leading-[1.12] max-w-4xl">
              Monetize seu relacionamento com empresas oferecendo a mais completa esteira financeira e de crédito do país.
            </h1>

            <p className="mt-5 text-sm md:text-lg text-zinc-300 leading-relaxed max-w-3xl">
              Acesse nossa tecnologia, a inteligência da nossa Mesa Operacional e produtos de alta demanda — Crédito PJ
              (PRONAMPE), Reabilitação de Rating e Energia Solar por Assinatura — recebendo comissões de até{" "}
              <strong className="text-emerald-400 font-extrabold">3% sobre cada operação liberada</strong>.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: ShieldCheck, t: "R$ 0 de taxa de franquia", d: "Assinatura acessível com teste grátis de 3 dias." },
                { icon: Target, t: "Mesa Operacional própria", d: "Nossa equipe faz a análise e a burocracia por você." },
                { icon: Laptop, t: "CRM e Caça-Leads exclusivo", d: "Encontre CNPJs ativos na sua cidade em segundos." },
                { icon: Coins, t: "Pagamentos via PIX", d: "Repasses com relatório e transparência total." },
              ].map((item) => (
                <div key={item.t} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors">
                  <item.icon className="w-5 h-5 text-emerald-400 mb-2.5" strokeWidth={2} />
                  <h3 className="text-sm font-bold text-white leading-snug">{item.t}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                onClick={irParaPlanos}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-sm px-7 py-4 rounded-xl transition-all active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Quero ser um Parceiro PROSFEC
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Teste grátis de 3 dias em qualquer plano. Cancele quando quiser.
              </p>
            </div>
          </div>
        </section>

        {/* PRODUTOS */}
        <section className="py-14 md:py-20 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.18em]">A Esteira PROSFEC</span>
            <h2 className="mt-3 font-display font-extrabold text-2xl md:text-4xl text-white leading-tight max-w-3xl">
              Os 3 produtos que você passa a vender já no primeiro dia
            </h2>
            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-3xl leading-relaxed">
              Você não depende de um único serviço. Se a empresa não estiver pronta para o crédito hoje, ainda existem
              duas outras portas de receita para você abrir no mesmo atendimento.
            </p>

            <div className="mt-9 grid grid-cols-1 md:grid-cols-3 gap-5">
              {PRODUTOS.map((p) => (
                <div
                  key={p.title}
                  className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      <p.icon className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">{p.tag}</span>
                  </div>
                  <h3 className="mt-4 font-display font-extrabold text-lg text-white leading-snug">{p.title}</h3>
                  <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed flex-1">{p.desc}</p>
                  <div className="mt-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5">
                    <span className="block text-[10px] uppercase tracking-widest text-emerald-400 font-extrabold mb-1">
                      Seu ganho
                    </span>
                    <span className="text-xs font-bold text-emerald-100 leading-relaxed">{p.ganho}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="py-14 md:py-20 bg-[#080B0F] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.18em]">Modelo de Atuação</span>
            <h2 className="mt-3 font-display font-extrabold text-2xl md:text-4xl text-white leading-tight max-w-3xl">
              Você prospecta. Nós operamos.
            </h2>
            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-3xl leading-relaxed">
              Você nunca precisa dominar balanço, garantia bancária ou protocolo de proposta. Seu papel é o relacionamento
              com o empresário; o peso técnico é nosso.
            </p>

            <div className="mt-9 grid grid-cols-1 md:grid-cols-3 gap-5">
              {PASSOS.map((s) => (
                <div key={s.n} className="relative bg-white/5 border border-white/10 rounded-3xl p-6">
                  <span className="font-display font-extrabold text-4xl text-emerald-500/25 leading-none">{s.n}</span>
                  <h3 className="mt-3 font-bold text-base text-white leading-snug">{s.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SIMULAÇÃO DE GANHOS */}
        <section className="py-14 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.18em]">Potencial de Receita</span>
            <h2 className="mt-3 font-display font-extrabold text-2xl md:text-4xl text-white leading-tight max-w-3xl">
              Quanto um parceiro ativo consegue faturar por mês
            </h2>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
                <span className="inline-block bg-white/10 text-zinc-200 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                  Cenário Moderado
                </span>
                <p className="mt-4 text-sm text-zinc-400">2 operações fechadas no mês, no plano Executive:</p>
                <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <span>2 contratos de R$ 150.000 (1,5%)</span>
                    <strong className="text-white font-extrabold">R$ 4.500</strong>
                  </li>
                  <li className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <span>3 clientes de energia por assinatura</span>
                    <strong className="text-white font-extrabold">R$ 900</strong>
                  </li>
                </ul>
                <div className="mt-5 flex items-end justify-between">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Total no mês</span>
                  <span className="font-display font-extrabold text-3xl text-emerald-400">R$ 5.400</span>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-emerald-500/10 pointer-events-none" />
                <span className="inline-block bg-emerald-500 text-zinc-950 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                  Cenário Profissional
                </span>
                <p className="mt-4 text-sm text-emerald-100/80">4 a 5 operações no mês, no plano Executive:</p>
                <ul className="mt-4 space-y-3 text-sm text-emerald-50">
                  <li className="flex items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                    <span>R$ 1.000.000 em volume liberado (1,5%)</span>
                    <strong className="font-extrabold">R$ 15.000</strong>
                  </li>
                  <li className="flex items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                    <span>Carteira solar em formação</span>
                    <strong className="font-extrabold">+ recorrência</strong>
                  </li>
                </ul>
                <div className="mt-5 flex items-end justify-between relative">
                  <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold">Total no mês</span>
                  <span className="font-display font-extrabold text-3xl text-white">R$ 15.000+</span>
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm text-zinc-400 flex items-start gap-2 max-w-3xl">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2} />
              Uma única operação simples já paga mais de um ano inteiro de assinatura da plataforma. Valores ilustrativos,
              baseados nos percentuais reais de cada plano.
            </p>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="py-14 md:py-20 bg-[#080B0F] border-y border-white/5 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.18em]">Planos Oficiais</span>
              <h2 className="mt-3 font-display font-extrabold text-2xl md:text-4xl text-white leading-tight">
                Escolha o seu nível de atuação
              </h2>
              <p className="mt-3 text-sm md:text-base text-zinc-400 leading-relaxed">
                Todos os planos incluem treinamento, sistema, suporte comercial e acesso ao ecossistema PROSFEC. Você muda
                de nível quando quiser.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className={`rounded-3xl p-6 md:p-7 flex flex-col justify-between h-full transition-all ${
                    plano.destaque
                      ? "bg-white/[0.07] border-2 border-emerald-500/50 lg:scale-[1.03] z-10 shadow-2xl shadow-emerald-500/10"
                      : "bg-white/5 border border-white/10 hover:border-emerald-500/30"
                  }`}
                >
                  <div>
                    <span
                      className={`inline-block text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        plano.destaque ? "bg-emerald-500 text-zinc-950" : "bg-white/10 text-zinc-300"
                      }`}
                    >
                      {plano.tag}
                    </span>

                    <h3 className="mt-3 font-display font-extrabold text-2xl text-white tracking-tight">{plano.nome}</h3>
                    <p className="text-xs text-zinc-400 mt-1 font-medium">{plano.sub}</p>

                    <div className="border border-white/10 bg-white/5 rounded-2xl p-4 text-center my-5">
                      <span className="text-3xl font-extrabold text-emerald-400 block">{precoMensal(plano.preco)}</span>
                      <span className="inline-block mt-2 bg-emerald-500/15 text-emerald-300 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Assinatura mensal
                      </span>
                    </div>

                    <p className="text-sm font-bold text-emerald-400 border-b border-white/10 pb-3 mb-3">{plano.comissao}</p>
                    <p className="text-xs italic text-zinc-500">{plano.exemplo}</p>

                    <ul className="mt-6 space-y-3">
                      {plano.itens.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                          <span className="text-emerald-400 bg-emerald-500/10 rounded-full shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                            {i === 0 ? <Sparkles className="w-3.5 h-3.5" strokeWidth={2} /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => assinarPlano(plano.id)}
                    className={`w-full mt-8 font-extrabold text-xs py-4 px-4 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      plano.destaque
                        ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    }`}
                  >
                    Iniciar Teste Grátis de 3 Dias
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              Cadastro em poucos minutos. Acesso ao painel liberado na hora.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14 md:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.18em]">Dúvidas Frequentes</span>
            <h2 className="mt-3 font-display font-extrabold text-2xl md:text-4xl text-white leading-tight">
              Tudo que um novo parceiro precisa saber
            </h2>

            <div className="mt-8 space-y-3">
              {FAQS.map((f, i) => (
                <div key={f.q} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-bold text-white leading-snug">{f.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-emerald-400 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                      strokeWidth={2.5}
                    />
                  </button>
                  {openFaq === i && (
                    <p className="px-5 pb-5 -mt-1 text-sm text-zinc-400 leading-relaxed">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="home-dark-panel bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden text-center">
              <div className="absolute right-[-80px] bottom-[-80px] w-96 h-96 rounded-full bg-emerald-600/10 pointer-events-none" />
              <h2 className="font-display font-extrabold text-2xl md:text-4xl text-white leading-tight max-w-3xl mx-auto relative">
                Você já conversa com empresários todos os dias. Falta apenas a estrutura para transformar isso em receita.
              </h2>
              <p className="mt-4 text-sm md:text-base text-zinc-300 max-w-2xl mx-auto relative leading-relaxed">
                Crie seu acesso agora, teste a plataforma por 3 dias e comece a apresentar soluções de crédito, rating e
                energia com o respaldo técnico da PROSFEC.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 relative">
                <button
                  onClick={irParaPlanos}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-sm px-7 py-4 rounded-xl transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Começar agora
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => {
                    setInitialRegister(false);
                    setShowPortal(true);
                  }}
                  className="border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-6 py-4 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                  Já sou parceiro
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} PROSFEC · Inteligência Financeira e Creditícia</span>
          <a href="/" className="hover:text-zinc-300 transition-colors">
            Voltar ao site institucional
          </a>
        </div>
      </footer>
    </div>
  );
}
