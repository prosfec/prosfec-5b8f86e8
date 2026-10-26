import { useEffect, useState } from "react";
import heroImg from "@/assets/usina-solar-hero.jpg";
import EnergiaContratacaoModal from "./EnergiaContratacaoModal";

const NAV = [
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Segurança", href: "#seguranca" },
  { label: "Dúvidas", href: "#faq" },
];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy-lime focus-visible:ring-offset-2 focus-visible:ring-offset-energy-deep";

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true">
      <path d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrimaryButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-energy-lime px-6 text-[15px] font-bold text-energy-deeper transition-colors hover:bg-[#B5F04F] ${FOCUS} ${className}`}
    >
      {children}
      <Arrow />
    </button>
  );
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`text-[12px] font-bold uppercase tracking-[0.16em] ${dark ? "text-energy-lime" : "text-energy-deep"}`}>
      {children}
    </p>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-energy-deep text-energy-lime">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d={path} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Logo({ light = true }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-energy-lime text-energy-deeper">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`block font-[Manrope,sans-serif] text-[15px] font-extrabold tracking-tight ${light ? "text-white" : "text-energy-ink"}`}>
          PROSFEC <span className="font-semibold text-energy-lime">Energy</span>
        </span>
        <span className={`mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? "text-white/50" : "text-energy-ink/50"}`}>
          Inteligência energética
        </span>
      </span>
    </span>
  );
}

const BENEFICIOS = [
  {
    t: "Economia na conta de energia",
    d: "Desconto estimado de 15% a 25% sobre a energia compensada, conforme distribuidora e condições do programa.",
    i: "M4 17l5-5 4 4 7-8M15 8h5v5",
  },
  {
    t: "Sem instalação no imóvel",
    d: "Nenhuma placa, obra ou equipamento. A energia é gerada em usinas solares participantes.",
    i: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6",
  },
  {
    t: "Contratação digital",
    d: "Você conhece a proposta e inicia a adesão pela plataforma oficial do parceiro, sem sair de casa.",
    i: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2",
  },
];

const USINA_VANTAGENS = [
  {
    s: "Sem entrada e sem adesão",
    t: "Zero desembolso inicial",
    d: "Você não paga nada de entrada para iniciar o projeto, a fabricação e a instalação da usina.",
    i: "M12 3v18M17 7.5c-.8-1.2-2.6-2-5-2-3 0-4.5 1.4-4.5 3.2 0 4.3 9.5 2.2 9.5 6.6 0 1.9-1.8 3.2-5 3.2-2.4 0-4.3-.8-5-2.2",
  },
  {
    s: "Sem financiamento bancário",
    t: "Não compromete seu crédito",
    d: "Esqueça aprovação em banco, juros abusivos ou travar o limite do seu cartão de crédito.",
    i: "M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18M12 3l9 5H3l9-5Z",
  },
  {
    s: "Direto no boleto mensal",
    t: "Pagamento simples e previsível",
    d: "A mensalidade vem direto no boleto, substituindo o custo pesado da conta de luz tradicional.",
    i: "M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3Zm3 5h4m-4 4h4",
  },
  {
    s: "Manutenção e seguro inclusos",
    t: "Garantia e tranquilidade total",
    d: "Placas de alta eficiência com seguro completo, monitoramento e manutenção durante todo o contrato.",
    i: "M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3Zm-3 9 2 2 4-4",
  },
];

const ETAPAS = [
  {
    n: "01",
    t: "Conheça a solução",
    d: "Entenda o modelo de energia solar por assinatura e veja se faz sentido para o seu perfil.",
  },
  {
    n: "02",
    t: "Faça a simulação oficial",
    d: "Escolha sua distribuidora e simule na plataforma do parceiro operacional, com a sua fatura em mãos.",
  },
  {
    n: "03",
    t: "Consulte as condições e contrate",
    d: "Após a simulação, siga com a adesão conforme elegibilidade e disponibilidade apresentadas.",
  },
];

const FAQ = [
  {
    q: "O que é energia solar por assinatura?",
    a: "É um modelo de geração compartilhada: usinas solares geram energia que é convertida em créditos e aplicada na sua unidade consumidora pela distribuidora local, reduzindo o valor pago pela energia consumida.",
  },
  {
    q: "Preciso instalar placas solares?",
    a: "Não. Você não instala equipamentos nem faz obras. A energia é gerada em usinas participantes e chega pela mesma rede que você já utiliza.",
  },
  {
    q: "Como funciona a economia?",
    a: "Os créditos de energia são oferecidos com desconto estimado de 15% a 25% em relação à tarifa da distribuidora. O percentual efetivo depende da distribuidora, do seu consumo e das condições contratadas.",
  },
  {
    q: "Continuarei recebendo a conta da distribuidora?",
    a: "Sim. Você continua conectado à distribuidora local, que segue responsável pela rede, pela entrega da energia e pela emissão da fatura.",
  },
  {
    q: "Quais cobranças podem permanecer na fatura?",
    a: "A distribuidora pode continuar cobrando componentes tarifários, custo de disponibilidade, tributos, taxa de iluminação pública e outros valores aplicáveis. A solução não representa isenção total da conta.",
  },
  {
    q: "Quem pode contratar?",
    a: "Residências e empresas atendidas pelas distribuidoras participantes, com consumo médio a partir de R$ 100 por mês, sujeitas à análise de elegibilidade do parceiro.",
  },
  {
    q: "Como faço a simulação?",
    a: "Clique em “Simular minha economia”, selecione sua distribuidora e você será levado à plataforma oficial do parceiro, onde a simulação é feita com base na sua fatura.",
  },
  {
    q: "Quais são as condições de cancelamento?",
    a: "As condições de permanência e cancelamento constam no contrato apresentado pelo parceiro antes da adesão. Recomendamos a leitura completa antes de aceitar.",
  },
];

export default function EnergiaSolarLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const abrirModal = () => {
    setMenuOpen(false);
    setModalOpen(true);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-energy-paper font-[Manrope,Inter,system-ui,sans-serif] text-energy-ink antialiased">
      {/* Cabeçalho */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
          scrolled || menuOpen ? "border-b border-white/10 bg-energy-deeper/95 backdrop-blur" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:h-[72px]">
          <a href="#topo" className={`rounded-md ${FOCUS}`} aria-label="PROSFEC Energy — início">
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={`rounded text-[14px] font-semibold text-white/75 transition-colors hover:text-white ${FOCUS}`}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={abrirModal} className="min-h-10 whitespace-nowrap px-5 text-[14px] max-md:hidden!">
              Simular minha economia
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className={`flex h-11 w-11 items-center justify-center rounded-lg text-white lg:hidden ${FOCUS}`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="menu-mobile" className="border-t border-white/10 px-5 pb-5 lg:hidden" aria-label="Menu móvel">
            <ul className="flex flex-col py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-12 items-center rounded-md text-[16px] font-semibold text-white/85 ${FOCUS}`}
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
            <PrimaryButton onClick={abrirModal} className="w-full md:hidden">
              Simular minha economia
            </PrimaryButton>
          </nav>
        )}
      </header>

      <main>
        {/* Primeira dobra */}
        <section id="topo" className="relative isolate flex min-h-[640px] items-end overflow-hidden bg-energy-deeper pb-16 pt-32 sm:min-h-[92svh] sm:items-center sm:pb-24">
          <img
            src={heroImg}
            alt="Usina solar em escala industrial com extensas fileiras de módulos fotovoltaicos ao pôr do sol"
            width={1920}
            height={1088}
            fetchPriority="high"
            className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-energy-deeper via-energy-deeper/80 to-energy-deeper/30 sm:bg-gradient-to-r sm:from-energy-deeper sm:via-energy-deeper/85 sm:to-energy-deeper/20" />

          <div className="mx-auto w-full max-w-7xl px-5">
            <div className="max-w-2xl">
              <Eyebrow dark>Energia solar por assinatura</Eyebrow>
              <h1 className="mt-5 text-[clamp(36px,6.2vw,72px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-white">
                Energia inteligente.
                <span className="block text-energy-lime">Mais economia para você.</span>
              </h1>
              <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-white/80 sm:text-[18px]">
                Descubra uma nova forma de economizar na conta de energia com a energia solar por assinatura, sem
                instalar placas solares no seu imóvel.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton onClick={abrirModal} className="min-h-[52px] px-7">
                  Simular minha economia
                </PrimaryButton>
                <a
                  href="#como-funciona"
                  className={`inline-flex min-h-[52px] items-center justify-center rounded-lg border border-white/25 px-7 text-[15px] font-bold text-white transition-colors hover:bg-white/10 ${FOCUS}`}
                >
                  Entenda como funciona
                </a>
              </div>
              <dl className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6">
                {[
                  { k: "15% a 25%", v: "economia estimada*" },
                  { k: "Zero", v: "obras no imóvel" },
                  { k: "100%", v: "adesão digital" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="sr-only">{s.v}</dt>
                    <dd className="text-[clamp(18px,3vw,26px)] font-extrabold tracking-tight text-white">{s.k}</dd>
                    <dd className="mt-1 text-[12px] leading-snug text-white/60 sm:text-[13px]">{s.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[12px] text-white/50">
                *Estimativa sujeita à elegibilidade, à distribuidora e às condições comerciais vigentes.
              </p>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section id="beneficios" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5">
            <div className="max-w-2xl">
              <Eyebrow>Benefícios</Eyebrow>
              <h2 className="mt-4 text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.025em]">
                Economia prática, sem investimento em equipamentos.
              </h2>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-energy-line bg-energy-line md:grid-cols-3">
              {BENEFICIOS.map((b) => (
                <article key={b.t} className="bg-white p-7 sm:p-8">
                  <Icon path={b.i} />
                  <h3 className="mt-6 text-[19px] font-bold tracking-tight">{b.t}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-energy-ink/70">{b.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-20 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
              <div className="max-w-md">
                <Eyebrow>Como funciona</Eyebrow>
                <h2 className="mt-4 text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.025em]">
                  Três etapas até a sua economia.
                </h2>
                <p className="mt-5 text-[16px] leading-relaxed text-energy-ink/70">
                  A energia é gerada em usinas solares, entregue pela mesma rede da sua distribuidora e convertida em
                  créditos na sua fatura. Nada muda na sua tomada.
                </p>
                <PrimaryButton onClick={abrirModal} className="mt-8 w-full bg-energy-deep text-white hover:bg-energy-deeper sm:w-auto">
                  Simular minha economia
                </PrimaryButton>
              </div>
              <ol className="relative grid gap-4">
                {ETAPAS.map((e) => (
                  <li key={e.n} className="flex gap-5 rounded-2xl border border-energy-line bg-energy-paper p-6 sm:p-7">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-energy-deep/20 bg-white text-[14px] font-extrabold text-energy-deep">
                      {e.n}
                    </span>
                    <div>
                      <h3 className="text-[18px] font-bold tracking-tight">{e.t}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-energy-ink/70">{e.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Visual de economia */}
        <section className="bg-energy-deep py-20 text-white sm:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow dark>Entenda a economia</Eyebrow>
              <h2 className="mt-4 text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.025em]">
                A energia é a mesma. O valor que você paga, não.
              </h2>
              <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-white/75">
                A tarifa tradicional sofre reajustes anuais e bandeiras tarifárias. Com a assinatura, os créditos solares
                são oferecidos com desconto sobre a tarifa da distribuidora.
              </p>
              <ul className="mt-8 grid gap-3 text-[15px] sm:grid-cols-2">
                {["Mesma rede elétrica", "Sem obra ou equipamento", "Créditos aplicados na fatura", "Contrato digital"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-white/85">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-energy-lime" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <figure className="rounded-2xl border border-white/10 bg-energy-deeper p-6 sm:p-8">
              <figcaption className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/50">
                Exemplo ilustrativo
              </figcaption>
              <p className="mt-2 text-[15px] text-white/70">Parcela de energia de R$ 1.000 por mês</p>
              <div className="mt-8 space-y-6">
                <div>
                  <div className="flex items-baseline justify-between text-[14px]">
                    <span className="text-white/70">Tarifa tradicional</span>
                    <span className="font-bold tabular-nums">R$ 1.000</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-white/25" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-[14px]">
                    <span className="text-white/70">Com assinatura (−15% a −25%)</span>
                    <span className="font-bold tabular-nums text-energy-lime">R$ 750 a R$ 850</span>
                  </div>
                  <div className="relative mt-2 h-3 rounded-full bg-white/10">
                    <div className="absolute inset-y-0 left-0 w-[75%] rounded-full bg-energy-lime" />
                    <div className="absolute inset-y-0 left-[75%] w-[10%] rounded-r-full bg-energy-lime/40" />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-baseline gap-3 border-t border-white/10 pt-6">
                <span className="text-[clamp(26px,4vw,34px)] font-extrabold tabular-nums tracking-tight">R$ 150 a R$ 250</span>
                <span className="text-[14px] text-white/60">por mês</span>
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-white/50">
                Exemplo simplificado, não constitui proposta. A economia efetiva depende da elegibilidade, da
                distribuidora, dos créditos aplicados e dos componentes da fatura que permanecem devidos.
              </p>
            </figure>
          </div>
        </section>

        {/* Usina própria no telhado */}
        <section id="usina-propria" className="scroll-mt-20 border-b border-energy-line bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5">
            <div className="max-w-3xl">
              <Eyebrow>Usina própria no seu telhado</Eyebrow>
              <h2 className="mt-4 text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.025em]">
                Tenha seu próprio gerador solar sem entrada e sem financiamento bancário.
              </h2>
              <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-energy-ink/70">
                Gere sua própria energia com placas solares no seu imóvel residencial ou comercial sem se endividar com
                bancos. Pague parcelas simples direto no boleto mensal e, ao término do período, toda a usina é
                transferida em definitivo para a sua propriedade.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-energy-line bg-energy-line sm:grid-cols-2 lg:grid-cols-4">
              {USINA_VANTAGENS.map((v) => (
                <article key={v.t} className="bg-white p-7">
                  <Icon path={v.i} />
                  <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.12em] text-energy-deep">{v.s}</p>
                  <h3 className="mt-1.5 text-[18px] font-bold tracking-tight">{v.t}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-energy-ink/70">{v.d}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex gap-5 rounded-2xl border-l-4 border-energy-lime bg-energy-paper p-6 sm:p-8">
              <Icon path="M15 7a3 3 0 1 1-2.8 4.1L4 19.3V21h3v-2h2v-2h2l1.6-1.6A3 3 0 0 1 15 7Z" />
              <div>
                <p className="text-[18px] font-bold tracking-tight">Ao final do contrato, o gerador solar é 100% seu.</p>
                <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-energy-ink/70">
                  Diferente do aluguel convencional, todo o equipamento e a infraestrutura instalados são transferidos
                  para o seu nome, tornando-se patrimônio definitivo do seu imóvel.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-start gap-4">
              <PrimaryButton onClick={abrirModal} className="min-h-[52px] px-7">
                Simular minha economia
              </PrimaryButton>
              <p className="max-w-[60ch] text-[14px] leading-relaxed text-energy-ink/60">
                Selecione sua distribuidora para iniciar a análise. Em seguida, nossos consultores entram em contato para
                apresentar a viabilidade técnica e a proposta para o seu telhado.
              </p>
            </div>
          </div>
        </section>

        {/* Segurança e credibilidade */}
        <section id="seguranca" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <Eyebrow>Segurança e transparência</Eyebrow>
                <h2 className="mt-4 text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.025em]">
                  Um modelo regulamentado, com papéis claros.
                </h2>
                <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-energy-ink/70">
                  A geração compartilhada é amparada pela Lei Federal nº 14.300/2022 e regulada pela ANEEL. Você continua
                  conectado à distribuidora da sua cidade, que mantém a estabilidade do fornecimento.
                </p>
                <dl className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div className="border-l-2 border-energy-deep pl-4">
                    <dt className="text-[15px] font-bold">PROSFEC Energy</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-energy-ink/70">
                      Apresenta a solução, orienta e encaminha você para a simulação oficial.
                    </dd>
                  </div>
                  <div className="border-l-2 border-energy-lime pl-4">
                    <dt className="text-[15px] font-bold">Sunne — parceira operacional</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-energy-ink/70">
                      Realiza a simulação, a análise de elegibilidade e a contratação.
                    </dd>
                  </div>
                </dl>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {[
                  { t: "Lei 14.300/2022", d: "Marco legal da geração distribuída." },
                  { t: "ANEEL", d: "Regulação e fiscalização do setor elétrico." },
                  { t: "Mesma distribuidora", d: "A rede e a entrega da energia não mudam." },
                  { t: "LGPD", d: "Seus dados tratados conforme a legislação." },
                ].map((s) => (
                  <li key={s.t} className="rounded-2xl border border-energy-line bg-white p-6">
                    <p className="text-[16px] font-bold text-energy-deep">{s.t}</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-energy-ink/70">{s.d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div>
              <Eyebrow>Perguntas frequentes</Eyebrow>
              <h2 className="mt-4 text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.025em]">
                Tire suas dúvidas.
              </h2>
            </div>
            <div className="divide-y divide-energy-line border-y border-energy-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group">
                  <summary
                    className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-bold sm:text-[17px] [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy-deep`}
                  >
                    {f.q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-energy-line text-energy-deep transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="max-w-[68ch] pb-6 pr-12 text-[15px] leading-relaxed text-energy-ink/70">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5">
            <div className="rounded-3xl bg-energy-deep px-6 py-14 text-center text-white sm:px-12 sm:py-20">
              <h2 className="mx-auto max-w-2xl text-[clamp(28px,4.5vw,48px)] font-extrabold leading-[1.08] tracking-[-0.03em]">
                Pronto para pagar menos pela energia que você já usa?
              </h2>
              <p className="mx-auto mt-5 max-w-[50ch] text-[16px] leading-relaxed text-white/75">
                Tenha sua fatura recente em mãos, escolha sua distribuidora e faça a simulação na plataforma oficial.
              </p>
              <PrimaryButton onClick={abrirModal} className="mt-9 min-h-[52px] w-full px-8 sm:w-auto">
                Quero conhecer minha economia
              </PrimaryButton>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-energy-deeper py-14 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div>
              <Logo />
              <p className="mt-5 max-w-[52ch] text-[14px] leading-relaxed text-white/60">
                Energia solar por assinatura da PROSFEC Energy em parceria operacional com a Sunne, no modelo de geração
                compartilhada regulamentado pela Lei Federal nº 14.300/2022 e pela ANEEL.
              </p>
            </div>
            <nav aria-label="Rodapé">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/45">Navegação</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className={`inline-flex min-h-10 items-center rounded text-[14px] text-white/75 hover:text-white ${FOCUS}`}>
                      {n.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/" className={`inline-flex min-h-10 items-center rounded text-[14px] text-white/75 hover:text-white ${FOCUS}`}>
                    PROSFEC
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 text-[12px] leading-relaxed text-white/45">
            A economia é estimada e depende de fatores como distribuidora, tributação local e perfil de consumo. A
            distribuidora pode continuar cobrando componentes tarifários, tributos e iluminação pública. Você permanece
            conectado à distribuidora local.
          </p>
          <p className="mt-4 text-[12px] text-white/35">
            © {new Date().getFullYear()} PROSFEC Energy · Todos os direitos reservados
          </p>
        </div>
      </footer>

      <EnergiaContratacaoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
