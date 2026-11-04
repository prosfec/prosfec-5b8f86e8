import { useMemo, useState } from "react";
import { Zap, ChevronDown } from "lucide-react";
import { calcularRaioXEnergetico, type PlaceEnergiaInput, type FaixaEnergetica } from "../lib/raioXEnergetico";

const COR: Record<FaixaEnergetica, string> = {
  critico: "bg-rose-50 text-rose-700 border-rose-200",
  alto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medio: "bg-amber-50 text-amber-700 border-amber-200",
  leve: "bg-slate-100 text-slate-600 border-slate-200",
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function RaioXEnergeticoCard({ place, inicialAberto = false }: { place: PlaceEnergiaInput; inicialAberto?: boolean }) {
  const [aberto, setAberto] = useState(inicialAberto);
  const r = useMemo(() => calcularRaioXEnergetico(place), [place]);

  const Item = ({ n, titulo, linhas }: { n: number; titulo: string; linhas: string[] }) => (
    <div>
      <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{n}. {titulo}</p>
      {linhas.map((l) => <p key={l} className="text-[10.5px] text-slate-700 leading-snug">• {l}</p>)}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold flex items-center gap-1 ${COR[r.faixa]}`}>
          <Zap className="w-3 h-3" /> Potencial {r.rotulo} — {r.segmento}
        </span>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="text-[10px] font-extrabold text-[#0A3D2E] hover:underline flex items-center gap-0.5"
        >
          {aberto ? "Ocultar" : "Ver"} Raio-X Energético
          <ChevronDown className={`w-3 h-3 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>
      </div>

      {aberto && (
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3 space-y-2.5">
          <Item n={1} titulo="Segmento & potencial de consumo" linhas={[`Categoria: ${r.segmento}`, `Classificação: ${r.classificacao}`]} />
          <Item n={2} titulo="Porte & estrutura física" linhas={[r.porte]} />
          <Item n={3} titulo="Equipamentos elétricos relevantes" linhas={[r.equipamentos]} />
          <Item n={4} titulo="Funcionamento prolongado" linhas={[r.regime, r.cargasContinuas]} />

          <div className="border-t border-emerald-200/70 pt-2">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Estimativa de consumo técnico</p>
            <p className="text-sm font-extrabold text-[#0A3D2E]">{fmt(r.kwhMin)} a {fmt(r.kwhMax)} kWh/mês</p>
            <p className="text-[9.5px] text-slate-500">Baseado no segmento, porte e horário de funcionamento.</p>
          </div>

          <div className="border-t border-emerald-200/70 pt-2 space-y-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Potencial de economia com nossas soluções</p>
            <div>
              <p className="text-[10.5px] font-extrabold text-slate-800">🌱 Geração de Energia (Assinatura / GD)</p>
              <p className="text-[10.5px] text-slate-700">• Economia de 15% a 25% na tarifa, sem investimento</p>
              <p className="text-[10.5px] text-slate-700">• Sem obras e sem placas no telhado</p>
            </div>
            <div>
              <p className="text-[10.5px] font-extrabold text-slate-800">☀️ AlugSol (Locação de Usina Solar)</p>
              <p className="text-[10.5px] text-slate-700">• Durante a locação: 10% a 30% de economia mensal</p>
              <p className="text-[10.5px] text-slate-700">• Após o término do contrato: até 95% de economia</p>
              <p className="text-[10.5px] text-slate-700">• Valorização do imóvel em até 15%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
