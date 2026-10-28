import { useEffect, useState } from "react";

const LINKS = {
  sunneMais: "https://sunnemais.sunne.com.br/",
  jurosBaixos:
    "https://jurosbaixos.com.br/emprestimo-negativado?utm_source=credfacil&utm_medium=affiliates&utm_campaign=credfacil-emprestimo-cf-2864",
  bndes: "https://portal.bndes.gov.br/prc/#/login-govbr",
  playStore: "https://play.google.com/store/apps/details?id=br.com.aptare.sunne",
  appStore: "https://apps.apple.com/br/app/sunne-pay/id6762489123",
  suporte: "https://wa.me/?text=" + encodeURIComponent("Olá! Sou cliente PROSFEC Energy e tenho uma dúvida sobre o Clube de Benefícios."),
};

const SESSAO = "prosfec_clube_acesso";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy-lime focus-visible:ring-offset-2 focus-visible:ring-offset-energy-deep";

function maskTel(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Externo({ href, children, variante = "claro" }: { href: string; children: React.ReactNode; variante?: "claro" | "lima" }) {
  const base = variante === "lima"
    ? "bg-energy-lime text-energy-deeper hover:brightness-105"
    : "border border-energy-deep/20 bg-white text-energy-deep hover:bg-energy-paper";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition ${base} ${FOCUS}`}>
      {children} <span aria-hidden>↗</span>
    </a>
  );
}

function Catraca({ onOk }: { onOk: () => void }) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (nome.trim().split(/\s+/).length < 2) return setErro("Digite seu nome completo.");
    if (tel.replace(/\D/g, "").length < 10) return setErro("Digite seu telefone com DDD.");
    setCarregando(true);
    try {
      const r = await fetch("/api/clube-beneficios/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone: tel }),
      });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) {
        sessionStorage.setItem(SESSAO, "1");
        onOk();
      } else {
        setErro(j?.erro || "Não localizamos uma adesão concluída com esses dados. Confira o nome e o telefone usados no cadastro ou fale com nosso suporte.");
      }
    } catch {
      setErro("Não foi possível verificar agora. Tente novamente em instantes.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-energy-deeper px-4 py-12">
      <div className="w-full max-w-md">
        <p className="text-center text-[12px] font-bold uppercase tracking-[0.18em] text-energy-lime">✦ Área exclusiva do cliente solar</p>
        <h1 className="mt-3 text-center text-3xl font-extrabold text-white md:text-4xl">Clube de Benefícios PROSFEC Energy</h1>
        <p className="mt-3 text-center text-sm text-white/70">Acesso exclusivo para clientes com adesão concluída de Energia Solar.</p>
        <form onSubmit={enviar} className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
          <label className="block">
            <span className="text-sm font-semibold text-energy-ink">Nome completo</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name"
              className="mt-1 w-full rounded-lg border border-energy-line bg-white px-3 py-2.5 text-energy-ink outline-none focus:border-energy-deep" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-energy-ink">Telefone (com DDD)</span>
            <input value={tel} onChange={(e) => setTel(maskTel(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000"
              className="mt-1 w-full rounded-lg border border-energy-line bg-white px-3 py-2.5 text-energy-ink outline-none focus:border-energy-deep" />
          </label>
          {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <button type="submit" disabled={carregando}
            className="w-full rounded-lg bg-energy-deep py-3 font-bold text-white transition hover:bg-energy-deeper disabled:opacity-60">
            {carregando ? "Verificando..." : "Acessar o Clube"}
          </button>
          <p className="text-center text-xs text-energy-ink/60">Seus dados são usados apenas para confirmar seu acesso.</p>
        </form>
        <p className="mt-6 text-center text-sm text-white/70">
          Precisa de ajuda? <a href={LINKS.suporte} target="_blank" rel="noopener noreferrer" className="font-semibold text-energy-lime underline">Fale com o suporte</a>
        </p>
      </div>
    </main>
  );
}

function ModalJurosBaixos({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-0 md:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Simulação de crédito Juros Baixos">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white md:h-[88vh] md:max-w-5xl md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-energy-line px-4 py-3">
          <p className="text-sm font-bold text-energy-deep">Simulação de crédito — Juros Baixos</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} aria-label="Fechar" className="rounded-md px-3 py-1.5 text-lg font-bold text-energy-ink hover:bg-energy-paper">✕</button>
          </div>
        </div>
        <iframe src={LINKS.jurosBaixos} title="Juros Baixos" className="w-full flex-1 border-0" />
      </div>
    </div>
  );
}

function Card({ tag, titulo, texto, children }: { tag: string; titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col rounded-2xl border border-energy-line bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-energy-deep/70">{tag}</p>
      <h3 className="mt-2 text-xl font-extrabold text-energy-ink">{titulo}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-energy-ink/75">{texto}</p>
      <div className="mt-5 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

function Vitrine({ onSair }: { onSair: () => void }) {
  const [modal, setModal] = useState(false);
  return (
    <div className="min-h-screen bg-energy-paper">
      <header className="bg-energy-deeper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <p className="font-extrabold text-white">PROSFEC <span className="text-energy-lime">Energy</span></p>
          <button onClick={onSair} className="rounded-md px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10">Encerrar sessão</button>
        </div>
      </header>

      <section className="bg-energy-deeper pb-14 pt-8">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-energy-lime">✦ Área exclusiva do cliente solar</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold text-white md:text-5xl">Bem-vindo ao Clube de Benefícios</h1>
          <p className="mt-4 max-w-2xl text-white/75">Além da economia na conta de energia, você tem acesso a um ecossistema de vantagens selecionadas para você e sua empresa.</p>
        </div>
      </section>

      <main className="mx-auto -mt-8 max-w-6xl px-4 pb-16">
        <div className="grid gap-5 md:grid-cols-2">
          <Card tag="Compras, lazer e serviços" titulo="Clube Sunne Mais" texto="Parcerias com redes, farmácias, mercados e serviços do dia a dia.">
            <Externo href={LINKS.sunneMais} variante="lima">Acessar Clube Sunne Mais</Externo>
          </Card>
          <Card tag="Conta digital" titulo="Sunne Pay" texto="Conta digital, pagamentos e gestão financeira prática no celular.">
            <Externo href={LINKS.playStore}>Baixar na Google Play</Externo>
            <Externo href={LINKS.appStore}>Baixar na App Store</Externo>
          </Card>
          <Card tag="Crédito PF e MEI" titulo="Juros Baixos" texto="Compare e simule opções de crédito pessoal e para MEI. A análise e as condições são definidas pelas instituições parceiras.">
            <button onClick={() => setModal(true)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-energy-deep px-5 text-sm font-bold text-white hover:bg-energy-deeper ${FOCUS}`}>
              ⚡ Simular crédito sem sair da página
            </button>
          </Card>
          <Card tag="Crédito empresarial (MPMEs)" titulo="BNDES Empresas" texto="Acesso ao canal oficial de financiamento para micro, pequenas e médias empresas.">
            <Externo href={LINKS.bndes}>Acessar Portal BNDES</Externo>
          </Card>
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-energy-line bg-white p-6">
            <h2 className="text-lg font-extrabold text-energy-ink">Uso consciente</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-energy-ink/75">
              <li>Planeje as parcelas dentro do seu orçamento mensal.</li>
              <li>Compare taxas e o custo efetivo total antes de contratar.</li>
              <li>Use a economia de energia como reforço do seu planejamento.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
            <h2 className="text-lg font-extrabold text-amber-900">⚠️ Alerta de segurança</h2>
            <p className="mt-3 text-sm text-amber-900/85">A PROSFEC e seus parceiros <strong>nunca</strong> pedem depósitos ou taxas antecipadas para liberar benefícios ou crédito.</p>
          </div>
        </section>

        <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-energy-deep p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-white">Pós-venda PROSFEC</h2>
            <p className="text-sm text-white/75">Dúvidas sobre sua fatura de energia ou sobre os benefícios? Fale com a gente.</p>
          </div>
          <Externo href={LINKS.suporte} variante="lima">Falar no WhatsApp</Externo>
        </section>
      </main>

      <footer className="border-t border-energy-line bg-white py-6 text-center text-xs text-energy-ink/60">
        PROSFEC Energy · Os benefícios são oferecidos por empresas parceiras, sujeitos às regras e análises de cada uma. Seus dados são tratados conforme a LGPD.
      </footer>
      {modal && <ModalJurosBaixos onClose={() => setModal(false)} />}
    </div>
  );
}

export default function ClubeBeneficios() {
  const [liberado, setLiberado] = useState(false);
  useEffect(() => { setLiberado(sessionStorage.getItem(SESSAO) === "1"); }, []);
  if (!liberado) return <Catraca onOk={() => setLiberado(true)} />;
  return <Vitrine onSair={() => { sessionStorage.removeItem(SESSAO); setLiberado(false); }} />;
}
