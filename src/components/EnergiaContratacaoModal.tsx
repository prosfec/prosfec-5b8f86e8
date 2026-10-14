import { useEffect, useMemo, useState } from "react";
import videoAsset from "@/assets/apresentacao-energia.mp4.asset.json";

export type Concessionaria = {
  nome: string;
  uf: string;
  desconto: number;
  url: string;
};

export const CONCESSIONARIAS: Concessionaria[] = [
  {
    nome: "CELESC-Dis",
    uf: "SC",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=f237b260-71e0-4e5f-b5c1-928f21d5bfbd",
  },
  {
    nome: "CEMIG-D",
    uf: "MG",
    desconto: 25,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=63bc8fd9-ca85-4419-8a50-30bf38ae06f8",
  },
  {
    nome: "COPEL-Dis",
    uf: "PR",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=6e9d4181-0968-4010-8425-1f52240002a0",
  },
  {
    nome: "CPFL Paulista",
    uf: "SP",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=c96afbef-b2df-4a70-b054-1aa23ff230d2",
  },
  {
    nome: "CPFL Piratininga",
    uf: "SP",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=cad84f20-ba1a-4482-8d7a-4a51de1ec5d5",
  },
  {
    nome: "CPFL Santa Cruz",
    uf: "SP",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=7c3a85c9-b6af-4a9c-8b01-edd1c345a044",
  },
  {
    nome: "EDP",
    uf: "ES",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=7815c360-2572-426d-bbb3-1950e96b078a",
  },
  {
    nome: "EDP",
    uf: "SP",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=ef0dc107-c17d-4788-b59e-cbef37f6e9e7",
  },
  {
    nome: "Enel",
    uf: "CE",
    desconto: 20,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=682d7835-53da-4b71-855e-79300c0eff0a",
  },
  {
    nome: "Enel",
    uf: "RJ",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=b7a9bd38-ecc7-4def-8c74-d818a4018858",
  },
  {
    nome: "Energisa",
    uf: "MS",
    desconto: 25,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=8b79fcec-8194-4817-9ae2-82b8e4ba032a",
  },
  {
    nome: "Energisa",
    uf: "MT",
    desconto: 24,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=68d647af-012c-45e5-9408-fbb2c828e592",
  },
  {
    nome: "Energisa",
    uf: "PB",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=10465fbc-5c80-4dc2-8cd5-3569e1470c45",
  },
  {
    nome: "Energisa Sul/Sudeste",
    uf: "—",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=c47f918f-5714-48ad-90f0-dcd9c663b660",
  },
  {
    nome: "Equatorial",
    uf: "AL",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=d8101455-97bf-4104-abdb-dd9468836d36",
  },
  {
    nome: "Equatorial",
    uf: "GO",
    desconto: 25,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=e993cc43-2b60-4416-852e-5d481ce88c6e",
  },
  {
    nome: "Equatorial",
    uf: "MA",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=006cd016-2379-4a20-a999-687f4eb20ec8",
  },
  {
    nome: "Equatorial",
    uf: "PA",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=2113871d-fb8f-4ce9-965c-205f38cab79d",
  },
  {
    nome: "Equatorial",
    uf: "PI",
    desconto: 20,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=93727bda-2ce1-4d97-b16e-c2bc0b3a5fa9",
  },
  {
    nome: "Neoenergia Coelba",
    uf: "BA",
    desconto: 18,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=058cfccd-a81a-4486-b8d1-dcf4802b9217",
  },
  {
    nome: "Neoenergia Cosern",
    uf: "RN",
    desconto: 20,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=7ee5e1c7-a6e4-4472-9ac6-4afdcaf18fe9",
  },
  {
    nome: "Neoenergia Elektro",
    uf: "SP",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=0372e19c-dee5-40c5-a08a-2038f66943a5",
  },
  {
    nome: "Neoenergia Pernambuco",
    uf: "PE",
    desconto: 20,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=2dbff2cc-cc0e-4fc5-bc02-8ef3afff4ec7",
  },
  {
    nome: "RGE",
    uf: "RS",
    desconto: 15,
    url: "https://assessordeenergia.sunne.com.br/self-service?link=4f32f257-59c1-420a-8ded-1e03e69311c5",
  },
];

const REGIAO_POR_UF: Record<string, string> = {
  PR: "Sul",
  SC: "Sul",
  RS: "Sul",
  SP: "Sudeste",
  RJ: "Sudeste",
  MG: "Sudeste",
  ES: "Sudeste",
  BA: "Nordeste",
  PE: "Nordeste",
  CE: "Nordeste",
  RN: "Nordeste",
  PB: "Nordeste",
  AL: "Nordeste",
  PI: "Nordeste",
  MA: "Nordeste",
  GO: "Centro-Oeste",
  MT: "Centro-Oeste",
  MS: "Centro-Oeste",
  PA: "Norte",
};

const REGIOES = ["Todas", "Sul", "Sudeste", "Centro-Oeste", "Nordeste", "Norte"];

function regiaoDe(c: Concessionaria) {
  if (c.uf === "—") return "Sul/Sudeste";
  return REGIAO_POR_UF[c.uf] ?? "";
}

const DESCONTO_MAXIMO = Math.max(...CONCESSIONARIAS.map((c) => c.desconto));

const COR_REGIAO: Record<string, string> = {
  Sul: "#3B82F6",
  Sudeste: "#10B981",
  Nordeste: "#F97316",
  "Centro-Oeste": "#8B5CF6",
  Norte: "#06B6D4",
  "Sul/Sudeste": "#10B981",
};

function iniciais(nome: string) {
  const partes = nome.replace(/[-/]/g, " ").split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


export default function EnergiaContratacaoModal({
  open,
  onClose,
  ocultarVideo = false,
}: {
  open: boolean;
  onClose: () => void;
  ocultarVideo?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [regiao, setRegiao] = useState("Todas");
  const [selecionada, setSelecionada] = useState<Concessionaria | null>(null);
  const [dicasAbertas, setDicasAbertas] = useState(false);
  const [ordem, setOrdem] = useState<"desconto" | "az">("desconto");



  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setSelecionada(null);
      setBusca("");
      setRegiao("Todas");
      setDicasAbertas(false);
      setOrdem("desconto");
    }
  }, [open]);


  const filtradas = useMemo(() => {
    const q = normalize(busca);
    const lista = CONCESSIONARIAS.filter((c) => {
      const r = regiaoDe(c);
      const okRegiao =
        regiao === "Todas" ||
        r === regiao ||
        (r === "Sul/Sudeste" && (regiao === "Sul" || regiao === "Sudeste"));
      if (!okRegiao) return false;
      if (!q) return true;
      return (
        normalize(`${c.nome} ${c.uf} ${r} ${iniciais(c.nome)}`).includes(q) || normalize(c.uf) === q
      );
    });
    return [...lista].sort((a, b) =>
      ordem === "desconto"
        ? b.desconto - a.desconto || a.nome.localeCompare(b.nome)
        : a.nome.localeCompare(b.nome) || a.uf.localeCompare(b.uf),
    );
  }, [busca, regiao, ordem]);


  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Simulação e contratação de energia por assinatura"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-[22px] border border-white/10 bg-[#070D0B] shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0B0F14] px-5 py-4">
          <div className="flex items-center gap-3">
            {selecionada && (
              <button
                type="button"
                onClick={() => setSelecionada(null)}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] font-bold text-white/70 transition hover:text-white"
              >
                ← Trocar
              </button>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#10B981]">
                PROSFEC &amp; SUNNE ·{" "}
                {selecionada ? "Simulação e Contratação" : "Passo 1 de 2"}
              </p>

              <p className="text-[15px] font-extrabold text-white">
                {selecionada
                  ? `${selecionada.nome}${selecionada.uf !== "—" ? ` (${selecionada.uf})` : ""} · ${selecionada.desconto}% de desconto`
                  : "Selecione a sua distribuidora de energia"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[18px] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            ×
          </button>
        </div>

        {selecionada ? (
          <div className="bg-[#05070A]">
            {/* Dicas de leitura da fatura */}
            <div className="border-b border-white/[0.07] bg-[#0B0F14]">
              <button
                type="button"
                onClick={() => setDicasAbertas((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left"
              >
                <span className="text-[12px] font-semibold text-white/60">
                  💡 Dúvidas com esses campos? Veja onde achar na sua conta
                </span>
                <span className="shrink-0 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1 text-[11px] font-extrabold text-[#10B981]">
                  {dicasAbertas ? "Ocultar dicas" : "Ver dicas"}
                </span>
              </button>
              {dicasAbertas && (
                <div className="grid gap-3 px-5 pb-4 sm:grid-cols-3">
                  {[
                    {
                      t: "Média de Consumo (kWh)",
                      d: 'Olhe no quadro "Histórico de Consumo" da fatura (tabela ou gráfico dos últimos 12 meses). Use o valor em kWh do último mês ou a média indicada ali.',
                    },
                    {
                      t: "Tipo de Ligação",
                      d: 'Fica em "Dados Técnicos" ou "Classificação", perto do número da instalação. Monofásica: casas e apartamentos compactos. Bifásica: imóveis com chuveiro 220V e ar-condicionado. Trifásica: quase todas as empresas, comércios e galpões.',
                    },
                    {
                      t: "Taxa de Iluminação Pública (R$)",
                      d: 'Na lista de valores cobrados, procure a sigla "CIP" ou "COSIP". Digite só o valor em reais dessa linha (ex.: 25,00). Se não existir na sua conta, coloque 0.',
                    },
                  ].map((i) => (
                    <div
                      key={i.t}
                      className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-4 py-3"
                    >
                      <p className="text-[12px] font-extrabold text-[#10B981]">{i.t}</p>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/55">
                        {i.d}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <iframe
              src={selecionada.url}
              title={`Contratação ${selecionada.nome}`}
              className="h-[72vh] w-full border-0 bg-white"
              allow="clipboard-write; camera"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-3">
              <p className="text-[12px] text-white/45">
                Tenha sua fatura recente em mãos para preencher e fazer a simulação.
              </p>
              <a
                href={selecionada.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-bold text-[#10B981] hover:underline"
              >
                Abrir em nova aba ↗
              </a>
            </div>
          </div>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {!ocultarVideo && (
              <>
                {/* Vídeo */}
                <div className="overflow-hidden rounded-[16px] border border-white/10 bg-black">
                  <video
                    src={videoAsset.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-auto w-full"
                  />
                </div>

                {/* Aviso da fatura */}
                <div className="mt-5 flex items-start gap-3 rounded-[14px] border border-[#FACC15]/25 bg-[#FACC15]/[0.08] px-4 py-3.5">
                  <span className="text-[18px]">📄</span>
                  <p className="text-[14px] font-semibold leading-relaxed text-[#FDE047]">
                    Tenha sua fatura recente em mãos para preencher e fazer a simulação.
                  </p>
                </div>
              </>
            )}


            {/* Cabeçalho da rede + filtros */}
            <div className={ocultarVideo ? "" : "mt-6"}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#10B981]/80">
                    PROSFEC Energy · Rede de distribuição
                  </p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
                      Concessionárias
                    </h3>
                    <span className="rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-2 py-0.5 font-mono text-[10.5px] text-[#34D399]">
                      {CONCESSIONARIAS.length} ativas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                  {(["desconto", "az"] as const).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOrdem(o)}
                      aria-pressed={ordem === o}
                      className={`rounded-full px-3 py-1 font-mono text-[11px] transition ${
                        ordem === o ? "bg-[#10B981] font-bold text-[#04110C]" : "text-white/50 hover:text-white"
                      }`}
                    >
                      {o === "desconto" ? "Maior desconto" : "A–Z"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mt-4">
                <svg width="14" height="14" viewBox="0 0 16 16" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                  <path d="M11.5 11.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
                </svg>
                <input
                  id="busca-concessionaria"
                  aria-label="Buscar distribuidora"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, sigla ou estado (ex.: CEMIG, MG, Sul)"
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0D1915] pl-10 pr-4 text-[13.5px] text-white placeholder:text-white/30 outline-none transition focus:border-[#10B981]/50 focus:ring-2 focus:ring-[#10B981]/15"
                />
              </div>

              <div className="-mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {REGIOES.map((r) => {
                  const ativo = r === regiao;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegiao(r)}
                      aria-pressed={ativo}
                      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-mono text-[11.5px] transition ${
                        ativo
                          ? "border-[#10B981] bg-[#10B981] font-bold text-[#04110C]"
                          : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {r !== "Todas" && (
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: COR_REGIAO[r] }} />
                      )}
                      {r}
                    </button>
                  );
                })}
                <span className="ml-1 shrink-0 border-l border-white/10 pl-3 font-mono text-[10.5px] text-white/35">
                  {filtradas.length} resultados
                </span>
              </div>
            </div>

            {/* Lista */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#10B981]/15 bg-[#0A1210]">
              <div className="hidden grid-cols-[1.7fr_1fr_1fr_0.9fr] gap-4 border-b border-white/[0.06] bg-[#0D1915] px-4 py-2.5 md:grid">
                {["DISTRIBUIDORA", "REGIÃO", "DESCONTO", ""].map((h, i) => (
                  <span key={i} className={`font-mono text-[10px] tracking-[0.14em] text-white/40 ${i === 3 ? "text-right" : ""}`}>
                    {h || "AÇÃO"}
                  </span>
                ))}
              </div>
              <div className="divide-y divide-white/[0.05]">
                {filtradas.map((c) => {
                  const r = regiaoDe(c);
                  const pct = Math.round((c.desconto / DESCONTO_MAXIMO) * 100);
                  return (
                    <button
                      key={c.url}
                      type="button"
                      onClick={() => setSelecionada(c)}
                      aria-label={`Simular com ${c.nome} ${c.uf !== "—" ? c.uf : ""} — ${c.desconto}% de desconto`}
                      className="group flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-[#10B981]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#10B981]/45 md:grid md:h-[68px] md:grid-cols-[1.7fr_1fr_1fr_0.9fr] md:items-center md:gap-4 md:py-0"
                    >
                      <span className="flex w-full items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#10B981]/20 bg-[#0D1915] font-mono text-[11px] font-bold text-[#34D399] transition group-hover:border-[#10B981]/50">
                          {iniciais(c.nome)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-white">
                            {c.nome}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-white/40">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
                            Disponível · 100% digital
                          </span>
                        </span>
                        <span className="font-mono text-[16px] font-bold text-[#34D399] md:hidden">
                          {c.desconto}%
                        </span>
                      </span>

                      <span className="flex pl-12 md:pl-0">
                        <span className="inline-flex h-6 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 font-mono text-[11px] text-white/60">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COR_REGIAO[r] ?? "#10B981" }} />
                          {c.uf === "—" ? "Sul / Sudeste" : `${c.uf} · ${r}`}
                        </span>
                      </span>

                      <span className="hidden flex-col gap-1.5 md:flex">
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-mono text-[17px] font-bold tracking-tight text-white">{c.desconto}%</span>
                          <span className="font-mono text-[10px] text-white/35">de redução</span>
                        </span>
                        <span className="block h-1 w-24 overflow-hidden rounded-full bg-white/[0.07]">
                          <span className="block h-full rounded-full bg-gradient-to-r from-[#0A3D2E] to-[#10B981]" style={{ width: `${pct}%` }} />
                        </span>
                      </span>

                      <span className="flex w-full justify-end">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-9 w-full max-w-[196px] items-center justify-center gap-2 rounded-xl border border-[#0A3D2E] bg-gradient-to-b from-[#14C98A] to-[#089B62] px-4 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#04110C] shadow-[0_10px_22px_-14px_rgba(16,185,129,0.95)] transition-all duration-200 ease-out group-hover:border-[#34D399]/60 group-hover:from-[#22D39A] group-hover:to-[#0AA96B] group-hover:shadow-[0_16px_30px_-14px_rgba(16,185,129,0.95)] group-focus-visible:border-[#34D399]/60 group-focus-visible:from-[#22D39A] group-focus-visible:to-[#0AA96B] group-active:translate-y-[1px] motion-reduce:transition-none"
                        >
                          <span className="truncate">{ocultarVideo ? "Gerar proposta" : "Simular e contratar"}</span>
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 16 16"
                            fill="none"
                            className="shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                          >
                            {ocultarVideo ? (
                              <path d="M9.2 1.6 3.6 9.1h3.2l-.9 5.3 5.6-7.6H8.3l.9-5.2Z" fill="currentColor" />
                            ) : (
                              <>
                                <path d="M2.6 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path
                                  d="M9 4.6 12.6 8 9 11.4"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </>
                            )}
                          </svg>
                        </span>
                      </span>
                    </button>
                  );
                })}
                {filtradas.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="font-mono text-[12px] text-white/45">Nenhuma distribuidora encontrada para "{busca}"</p>
                    <button
                      type="button"
                      onClick={() => { setBusca(""); setRegiao("Todas"); }}
                      className="mt-2 font-mono text-[11px] text-[#34D399] underline underline-offset-4"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-5 text-[11px] leading-relaxed text-white/30">
              Percentuais de desconto conforme disponibilidade de cada distribuidora. A
              simulação é gratuita e não gera compromisso.
            </p>

          </div>
        )}
      </div>
    </div>
  );
}
