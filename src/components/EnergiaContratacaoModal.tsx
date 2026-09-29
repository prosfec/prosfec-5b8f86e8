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
    uf: "PR",
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
    uf: "SC",
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<Concessionaria | null>(null);
  const [dicasAbertas, setDicasAbertas] = useState(false);


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
      setDicasAbertas(false);
    }
  }, [open]);


  const filtradas = useMemo(() => {
    const q = normalize(busca);
    if (!q) return CONCESSIONARIAS;
    return CONCESSIONARIAS.filter(
      (c) => normalize(`${c.nome} ${c.uf}`).includes(q) || normalize(c.uf) === q,
    );
  }, [busca]);

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
      <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-[22px] border border-white/10 bg-[#080B10] shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
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

            {/* Busca */}
            <div className="mt-6">
              <label
                htmlFor="busca-concessionaria"
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45"
              >
                Escolha a distribuidora da sua conta de luz
              </label>
              <input
                id="busca-concessionaria"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou estado (ex.: CEMIG, MG, SP...)"
                className="mt-2.5 w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-[14px] text-white placeholder:text-white/30 outline-none transition focus:border-[#10B981]/50"
              />
            </div>

            {/* Lista */}
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {filtradas.map((c) => (
                <button
                  key={c.url}
                  type="button"
                  onClick={() => setSelecionada(c)}
                  className="group flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#10B981]/40 hover:bg-[#10B981]/[0.07]"
                >
                  <span>
                    <span className="block text-[14px] font-bold text-white">
                      {c.nome}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-white/45">
                      {c.uf === "—" ? "Região Sul / Sudeste" : `Estado: ${c.uf}`}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1.5 text-[12px] font-extrabold text-[#10B981]">
                    {c.desconto}% OFF
                  </span>
                </button>
              ))}
              {filtradas.length === 0 && (
                <p className="col-span-full rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-4 py-5 text-center text-[13px] text-white/50">
                  Nenhuma distribuidora encontrada com esse termo.
                </p>
              )}
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
