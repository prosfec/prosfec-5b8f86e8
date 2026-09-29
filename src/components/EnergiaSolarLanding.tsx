import { useEffect, useState } from "react";
import heroImg from "@/assets/energia-solar-hero.jpg";
import EnergiaContratacaoModal from "./EnergiaContratacaoModal";

const CTA_TEXT = "Simule e contrate aqui";

function CtaButton({
  children,
  className = "",
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#10B981] px-7 py-4 text-[15px] font-extrabold tracking-tight text-[#05070A] shadow-[0_10px_40px_-10px_rgba(16,185,129,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#16C784] ${className}`}
    >
      <span className="relative z-10">{children ?? CTA_TEXT}</span>
      <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
        →
      </span>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-[1200ms] group-hover:translate-x-full" />
    </button>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#10B981] backdrop-blur-xl">
      {children}
    </span>
  );
}

function Glass({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-white/[0.08] bg-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#10B981]/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${className}`}
    >
      {children}
    </div>
  );
}

const NAV = [
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Vantagens", href: "#pilares" },
  { label: "Quem Pode Aderir", href: "#para-quem" },
  { label: "Segurança Jurídica", href: "#seguranca" },
];

export default function EnergiaSolarLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070A] font-[Inter,system-ui,sans-serif] text-white antialiased">
      {/* Fundos decorativos */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-[#10B981]/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[#FACC15]/[0.07] blur-[120px]" />
      </div>

      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[#05070A]/80 backdrop-blur-[16px]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#hero" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#16C784] text-lg text-[#05070A]">
              ⚡
            </span>
            <span className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-white">
              Energia Inteligente
            </span>
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-[13px] font-semibold text-white/60 transition-colors hover:text-[#10B981]"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href={CTA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-[#10B981] px-5 py-2.5 text-[13px] font-extrabold text-[#05070A] transition-all hover:bg-[#16C784] sm:inline-flex"
          >
            Simule e Contrate Agora
          </a>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section id="hero" className="relative flex min-h-[100svh] items-center pt-28 pb-20">
          <div className="absolute inset-0 -z-10">
            <img
              src={heroImg}
              alt="Cidade iluminada conectada a uma grande fazenda solar"
              width={1920}
              height={1088}
              className="h-full w-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#05070A] via-[#05070A]/85 to-[#05070A]/40" />
          </div>

          <div className="mx-auto w-full max-w-7xl px-5">
            <div className="max-w-4xl">
              <SectionTag>● Regulamentado pela Lei 14.300 / ANEEL</SectionTag>
              <h1 className="mt-6 font-[Manrope,sans-serif] text-[clamp(34px,7vw,86px)] font-extrabold leading-[0.95] tracking-[-0.03em]">
                A Revolução da Energia Inteligente.
                <span className="mt-3 block bg-gradient-to-r from-[#10B981] to-[#16C784] bg-clip-text text-transparent">
                  Economize de 17% a 27% na sua conta de luz todo mês.
                </span>
              </h1>
              <p className="mt-7 max-w-[62ch] text-[17px] leading-relaxed text-white/65">
                Sem gastar um único centavo com placas, obras ou equipamentos. A mesma
                energia que você já usa, entregue pelos mesmos postes, só que muito mais
                barata.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {[
                  "Zero Custo de Instalação",
                  "Sem Obras no Imóvel",
                  "100% Digital em 3 Minutos",
                ].map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-semibold text-white/75 backdrop-blur-xl"
                  >
                    ✓ {p}
                  </span>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <CtaButton>Simule e Contrate Aqui</CtaButton>
                <a
                  href="#como-funciona"
                  className="rounded-full border border-white/12 bg-white/[0.04] px-7 py-4 text-[15px] font-bold text-white/85 backdrop-blur-xl transition-all hover:border-[#10B981]/30 hover:text-white"
                >
                  Entenda Como Funciona ↓
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMA */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
            <div>
              <SectionTag>O Problema</SectionTag>
              <h2 className="mt-5 font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
                Você “aluga” energia e paga cada vez mais caro sem ter escolha.
              </h2>
              <p className="mt-6 max-w-[62ch] text-[16px] leading-relaxed text-white/60">
                Historicamente, você sofre com reajustes anuais acima da inflação,
                bandeiras tarifárias amarela e vermelha que punem o seu consumo e impostos
                invisíveis. No modelo tradicional da distribuidora, a conta de luz é um
                ralo de dinheiro imprevisível no qual você não tem nenhum poder de
                negociação.
              </p>
              <Glass className="mt-8 border-l-2 border-l-[#FACC15]/60 p-5">
                <p className="text-[15px] font-semibold italic text-[#FDE047]">
                  “A tarifa da distribuidora só sobe. O seu controle sobre ela sempre foi
                  zero — até hoje.”
                </p>
              </Glass>
            </div>
            <Glass className="p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                    Custo da energia ao longo dos anos
                  </p>
                  <p className="mt-1.5 text-[13px] text-white/45">
                    Tarifa média residencial em R$ por kWh
                  </p>
                </div>
                <span className="rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1.5 text-[11px] font-extrabold text-[#FDE047]">
                  ▲ +69% em 5 anos
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold">
                <span className="flex items-center gap-2 text-white/55">
                  <span className="h-2 w-2 rounded-full bg-[#FACC15]" />
                  Tarifa tradicional da distribuidora
                </span>
                <span className="flex items-center gap-2 text-white/55">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  Com assinatura solar (−17% a −27%)
                </span>
              </div>

              <svg
                viewBox="0 0 480 232"
                className="mt-5 w-full"
                role="img"
                aria-label="Gráfico comparativo da tarifa de energia da distribuidora contra o valor pago com assinatura solar entre 2021 e 2026"
              >
                <defs>
                  <linearGradient id="gradTarifa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FACC15" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="gradSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[
                  { y: 205, l: "0,40" },
                  { y: 161.5, l: "0,60" },
                  { y: 118, l: "0,80" },
                  { y: 74.6, l: "1,00" },
                  { y: 31.1, l: "1,20" },
                ].map((g) => (
                  <g key={g.l}>
                    <line
                      x1="46"
                      x2="472"
                      y1={g.y}
                      y2={g.y}
                      stroke="#ffffff"
                      strokeOpacity="0.07"
                      strokeWidth="1"
                    />
                    <text
                      x="38"
                      y={g.y + 3.5}
                      textAnchor="end"
                      fill="#ffffff"
                      fillOpacity="0.32"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {g.l}
                    </text>
                  </g>
                ))}

                <path
                  d="M46,144.1 L130,120.1 L214,102.7 L298,83.1 L382,61.4 L466,41.8 L466,205 L46,205 Z"
                  fill="url(#gradTarifa)"
                />
                <path
                  d="M46,176.7 L130,157.1 L214,144.1 L298,128.8 L382,111.4 L466,96.2 L466,205 L46,205 Z"
                  fill="url(#gradSolar)"
                />

                <polyline
                  points="46,144.1 130,120.1 214,102.7 298,83.1 382,61.4 466,41.8"
                  fill="none"
                  stroke="#FACC15"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="46,176.7 130,157.1 214,144.1 298,128.8 382,111.4 466,96.2"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {[
                  [46, 144.1],
                  [130, 120.1],
                  [214, 102.7],
                  [298, 83.1],
                  [382, 61.4],
                  [466, 41.8],
                ].map(([x, y]) => (
                  <circle
                    key={`t${x}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#05070A"
                    stroke="#FACC15"
                    strokeWidth="2.5"
                  />
                ))}
                {[
                  [46, 176.7],
                  [130, 157.1],
                  [214, 144.1],
                  [298, 128.8],
                  [382, 111.4],
                  [466, 96.2],
                ].map(([x, y]) => (
                  <circle
                    key={`s${x}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#05070A"
                    stroke="#10B981"
                    strokeWidth="2.5"
                  />
                ))}

                <text
                  x="46"
                  y="132"
                  fill="#FDE047"
                  fontSize="11"
                  fontWeight="800"
                >
                  R$ 0,68
                </text>
                <text
                  x="466"
                  y="30"
                  textAnchor="end"
                  fill="#FDE047"
                  fontSize="12"
                  fontWeight="800"
                >
                  R$ 1,15
                </text>
                <text
                  x="466"
                  y="114"
                  textAnchor="end"
                  fill="#10B981"
                  fontSize="12"
                  fontWeight="800"
                >
                  R$ 0,90
                </text>

                {["2021", "2022", "2023", "2024", "2025", "2026"].map((ano, i) => (
                  <text
                    key={ano}
                    x={46 + i * 84}
                    y="226"
                    textAnchor={i === 0 ? "start" : i === 5 ? "end" : "middle"}
                    fill="#ffffff"
                    fillOpacity="0.35"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {ano}
                  </text>
                ))}
              </svg>

              <p className="mt-5 text-[13px] leading-relaxed text-white/45">
                Reajustes, bandeiras tarifárias e tributos em cascata seguem pressionando
                a sua fatura ano após ano. Com a assinatura, a linha verde mostra o quanto
                você deixa de pagar todos os meses.
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-white/30">
                Fonte: histórico de tarifas homologadas pela ANEEL e projeções de mercado.
                Valores médios ilustrativos, variáveis por distribuidora.
              </p>
            </Glass>
          </div>
        </section>

        {/* SOLUÇÃO */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-7xl px-5">
            <div className="max-w-3xl">
              <SectionTag>A Solução</SectionTag>
              <h2 className="mt-5 font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
                E se você pudesse ter energia solar sem colocar a mão no bolso?
              </h2>
              <p className="mt-6 text-[16px] leading-relaxed text-white/60">
                Comprar um sistema solar próprio custa de R$ 30.000 a R$ 150.000, exige
                furar telhado, lidar com risco de infiltração, manutenções e anos para ter
                retorno. Com a <strong className="text-white">Energia Solar por Assinatura</strong>,
                a lógica inverteu: geramos energia limpa em usinas de alta tecnologia e
                injetamos créditos diretamente no seu relógio. Você consome o crédito solar
                e paga até 27% mais barato.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <Glass className="border-l-2 border-l-red-500/40 p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-400/80">
                  ✕ Sistema próprio antigo
                </p>
                <ul className="mt-5 space-y-3 text-[15px] text-white/60">
                  {[
                    "Financiamento bancário pesado e anos de retorno",
                    "Obras barulhentas e furos no telhado",
                    "Risco de infiltração e dano ao imóvel",
                    "Manutenção cara por sua conta",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-red-400/70">✕</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Glass>
              <Glass className="border-l-2 border-l-[#10B981]/60 p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#10B981]">
                  ✓ Assinatura inteligente
                </p>
                <ul className="mt-5 space-y-3 text-[15px] text-white/75">
                  {[
                    "Zero investimento e zero taxa de adesão",
                    "Ativação 100% digital pelo celular",
                    "Sem obra e sem placa no seu telhado",
                    "Desconto de 17% a 27% creditado na fatura",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-[#10B981]">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Glass>
            </div>

            <p className="mt-10 text-center text-[17px] font-bold text-[#10B981]">
              Economia sem obra. Sem investimento. Sem dor de cabeça.
            </p>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-7xl px-5">
            <div className="max-w-3xl">
              <SectionTag>Como Funciona</SectionTag>
              <h2 className="mt-5 font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
                Geração Compartilhada: 100% automática e invisível na sua rotina.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "01",
                  t: "Nossas Usinas Geram",
                  d: "Parques solares de alta potência geram eletricidade limpa em larga escala.",
                },
                {
                  n: "02",
                  t: "A Distribuidora Transporta",
                  d: "A energia é injetada na rede local e chega ao seu imóvel pelos mesmos fios que você já tem hoje.",
                },
                {
                  n: "03",
                  t: "O Crédito é Injetado",
                  d: "A energia gerada é convertida em créditos oficiais abatidos diretamente do seu consumo.",
                },
                {
                  n: "04",
                  t: "Sua Economia Real",
                  d: "Você recebe a fatura com o desconto garantido de 17% a 27%. O dinheiro fica no seu caixa.",
                },
              ].map((s) => (
                <Glass key={s.n} className="p-6">
                  <span className="font-[Manrope,sans-serif] text-[34px] font-extrabold leading-none text-[#10B981]/30">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-[17px] font-bold">{s.t}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-white/55">{s.d}</p>
                </Glass>
              ))}
            </div>
            <p className="mt-10 text-center text-[17px] font-bold text-white/85">
              Nada muda na sua tomada. Só o valor que sai da sua conta bancária.
            </p>
          </div>
        </section>

        {/* PILARES */}
        <section id="pilares" className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-7xl px-5">
            <div className="max-w-3xl">
              <SectionTag>Os 4 Pilares do Benefício</SectionTag>
              <h2 className="mt-5 font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
                Por que líderes de mercado estão migrando agora?
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  i: "💰",
                  t: "Zero Investimento",
                  d: "Você não compra peças, não gasta reserva financeira e não paga taxa de matrícula.",
                },
                {
                  i: "🏗️",
                  t: "Zero Obras & Sem Furos",
                  d: "Ideal para imóveis próprios ou alugados. Sem permissão de proprietário nem engenheiro.",
                },
                {
                  i: "📉",
                  t: "Economia de 17% a 27%",
                  d: "Redução previsível mês após mês, aliviando o custo de empresas e o orçamento de famílias.",
                },
                {
                  i: "🌱",
                  t: "100% Sustentável",
                  d: "Sua operação movida a energia renovável, valorizando a sua marca no mercado.",
                },
              ].map((p) => (
                <Glass key={p.t} className="p-6">
                  <span className="text-[26px]">{p.i}</span>
                  <h3 className="mt-4 text-[17px] font-bold">{p.t}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-white/55">{p.d}</p>
                </Glass>
              ))}
            </div>
          </div>
        </section>

        {/* SEGURANÇA */}
        <section id="seguranca" className="border-t border-white/[0.06] py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
            <div>
              <SectionTag>Segurança Jurídica</SectionTag>
              <h2 className="mt-5 font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
                Regulamentado por Lei Federal, transparente e 100% seguro.
              </h2>
              <p className="mt-6 max-w-[62ch] text-[16px] leading-relaxed text-white/60">
                A Geração Compartilhada é amparada pela{" "}
                <strong className="text-white">Lei Federal nº 14.300/2022</strong> (Marco
                Legal da GD) e fiscalizada pela{" "}
                <strong className="text-white">ANEEL</strong> (Resolução Normativa nº
                1.000/2021). Você continua conectado à distribuidora oficial da sua cidade:
                não existe nenhum risco de corte ou falta de energia, pois a estabilidade da
                rede continua sendo garantida pela concessionária pública.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { t: "Lei 14.300/2022", d: "Marco Legal da Geração Distribuída" },
                { t: "ANEEL RN 1.000/2021", d: "Fiscalização e regulação oficial" },
                { t: "Mesma Distribuidora", d: "Nenhum risco de falta de energia" },
                { t: "Contrato Digital", d: "Transparente, sem letras miúdas" },
              ].map((s) => (
                <Glass key={s.t} className="p-5">
                  <p className="text-[14px] font-extrabold text-[#FDE047]">{s.t}</p>
                  <p className="mt-1.5 text-[13px] text-white/50">{s.d}</p>
                </Glass>
              ))}
            </div>
          </div>
        </section>

        {/* O QUE MUDA */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-7xl px-5">
            <h2 className="max-w-3xl font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
              A energia é a mesma. O valor que você paga, não.
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <Glass className="p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Modelo tradicional
                </p>
                <ul className="mt-5 space-y-3 text-[15px] text-white/55">
                  {[
                    "Tarifa cheia da concessionária",
                    "Bandeiras tarifárias arbitrárias",
                    "Reajustes surpresa acima da inflação",
                    "Zero desconto e zero previsibilidade",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-white/25">—</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Glass>
              <Glass className="border-[#10B981]/25 bg-[#10B981]/[0.06] p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#10B981]">
                  Energia solar por assinatura
                </p>
                <ul className="mt-5 space-y-3 text-[15px] text-white/80">
                  {[
                    "Desconto garantido de 17% a 27%",
                    "Proteção contra bandeiras tarifárias",
                    "Créditos solares injetados todo mês",
                    "Previsibilidade total de custos",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="text-[#10B981]">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Glass>
            </div>
            <p className="mt-10 text-center text-[17px] font-bold text-[#10B981]">
              O único impacto na sua rotina será o dinheiro sobrando no seu caixa.
            </p>
          </div>
        </section>

        {/* PARA QUEM */}
        <section id="para-quem" className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-7xl px-5">
            <div className="max-w-3xl">
              <SectionTag>Quem Pode Aderir</SectionTag>
              <h2 className="mt-5 font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
                Inteligência financeira para todos os perfis.
              </h2>
              <p className="mt-6 text-[16px] leading-relaxed text-white/60">
                Se você paga{" "}
                <strong className="text-[#FDE047]">a partir de R$ 100,00 por mês</strong> de
                energia (média), você já pode ativar o benefício agora.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <Glass className="p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#10B981]">
                  Empresas (B2B)
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-white/65">
                  Comércios, indústrias, clínicas, academias, supermercados, padarias,
                  escritórios e agronegócio.
                </p>
              </Glass>
              <Glass className="p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FDE047]">
                  Famílias (B2C)
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-white/65">
                  Casas, apartamentos, condomínios e residências de alto padrão com consumo
                  moderado ou alto.
                </p>
              </Glass>
            </div>
          </div>
        </section>

        {/* ZERO FIDELIDADE */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <SectionTag>Zero Fidelidade Abusiva</SectionTag>
            <h2 className="mt-5 font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
              O poder de decisão continua 100% nas suas mãos.
            </h2>
            <p className="mx-auto mt-6 max-w-[62ch] text-[16px] leading-relaxed text-white/60">
              Nós não prendemos ninguém com multas contratuais absurdas. Nossa retenção
              acontece por um motivo simples: a economia no final do mês é real. Você adere
              sem burocracia e tem total liberdade sobre o seu consumo. Se quiser cancelar,
              basta solicitar.
            </p>
            <p className="mt-8 text-[17px] font-bold text-[#10B981]">
              Você fica porque o dinheiro está sobrando no seu bolso, não porque um contrato
              te obriga.
            </p>
          </div>
        </section>

        {/* PASSO A PASSO */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-7xl px-5">
            <h2 className="max-w-3xl font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
              3 passos para ativar a sua economia hoje.
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                {
                  n: "1",
                  t: "Envie sua Conta",
                  d: "Basta anexar uma foto ou PDF da sua última conta de luz.",
                },
                {
                  n: "2",
                  t: "Veja a Proposta na Tela",
                  d: "O sistema calcula na hora a sua economia exata em reais.",
                },
                {
                  n: "3",
                  t: "Ative com Assinatura Digital",
                  d: "Sem cartório e sem filas. O desconto entra em vigor nas faturas seguintes.",
                },
              ].map((s) => (
                <Glass key={s.n} className="p-7">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981] text-[16px] font-extrabold text-[#05070A]">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-[18px] font-bold">{s.t}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-white/55">{s.d}</p>
                </Glass>
              ))}
            </div>
            <p className="mt-10 text-center text-[15px] font-semibold text-white/55">
              100% digital. Sem burocracia. Sem visita técnica no seu imóvel.
            </p>
          </div>
        </section>

        {/* AVERSÃO À PERDA */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <h2 className="font-[Manrope,sans-serif] text-[clamp(28px,5vw,52px)] font-bold leading-[1.02] tracking-[-0.02em]">
              Quanto dinheiro você já deixou na mesa este ano pagando a tarifa cheia?
            </h2>
            <p className="mx-auto mt-6 max-w-[62ch] text-[16px] leading-relaxed text-white/60">
              Cada mês que você passa adiando a migração é um mês jogando de 17% a 27% do
              valor da sua conta no lixo. Esse é um dinheiro que poderia estar virando lucro
              no caixa da sua empresa ou conforto para a sua família.
            </p>
            <p className="mt-8 text-[17px] font-bold text-[#FDE047]">
              Continuar no modelo tradicional é uma escolha que custa caro todos os meses.
            </p>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-5xl px-5">
            <Glass className="relative overflow-hidden p-8 text-center sm:p-14">
              <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#10B981]/25 blur-[100px]" />
              <div className="relative">
                <h2 className="font-[Manrope,sans-serif] text-[clamp(28px,5vw,54px)] font-extrabold leading-[1.02] tracking-[-0.02em]">
                  Descubra agora quanto você vai{" "}
                  <span className="bg-gradient-to-r from-[#10B981] to-[#16C784] bg-clip-text text-transparent">
                    economizar
                  </span>
                  .
                </h2>
                <p className="mx-auto mt-6 max-w-[58ch] text-[16px] leading-relaxed text-white/65">
                  Leva menos de 2 minutos para simular. É 100% gratuito e não exige cartão
                  de crédito.
                </p>
                <div className="mt-9 flex justify-center">
                  <CtaButton className="px-9 py-5 text-[16px]">
                    Simule e Contrate Aqui
                  </CtaButton>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                  {[
                    "🔒 Seus dados protegidos pela LGPD",
                    "⚡ Sem custo de adesão",
                    "📜 Lei 14.300/2022",
                  ].map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-semibold text-white/65"
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <p className="mx-auto mt-10 max-w-[60ch] text-[14px] italic leading-relaxed text-white/40">
                  “A inteligência não está em gastar menos energia, mas em pagar menos pela
                  energia que você já consome.”
                </p>
              </div>
            </Glass>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] py-14">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#16C784] text-lg text-[#05070A]">
                ⚡
              </span>
              <span className="text-[13px] font-extrabold uppercase tracking-[0.16em]">
                Energia Inteligente
              </span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
              Geração Compartilhada • Energia Solar por Assinatura
            </p>
          </div>
          <p className="mt-8 max-w-[90ch] text-[12px] leading-relaxed text-white/35">
            Modelo de Geração Compartilhada regulamentado pela Lei Federal nº 14.300/2022 e
            Resolução Normativa ANEEL nº 1.000/2021. A economia é estimada e depende de
            fatores como distribuidora, tributação local e perfil de consumo. Não há
            garantia de fornecimento de energia pela geradora. Você permanece conectado à
            distribuidora local.
          </p>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-white/25">
            © {new Date().getFullYear()} Energia Inteligente • Todos os direitos reservados
          </p>
        </div>
      </footer>

      {/* CTA FLUTUANTE */}
      <div className="fixed bottom-5 right-5 z-50 sm:bottom-7 sm:right-7">
        <button
          type="button"
          onClick={abrirModal}
          className="flex items-center gap-2 rounded-full bg-[#10B981] px-6 py-4 text-[14px] font-extrabold text-[#05070A] shadow-[0_10px_45px_-8px_rgba(16,185,129,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#16C784]"
        >
          ⚡ Simule e contrate aqui
        </button>
      </div>

      <EnergiaContratacaoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
