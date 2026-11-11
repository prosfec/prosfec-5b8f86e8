import { useMemo, useState } from "react";
import { BarChart3, ChevronDown, Clock, Target, TrendingUp } from "lucide-react";
import { formatarDuracao, statusPresenca } from "../lib/presenca";
import { horasPresenca, resumoLeads } from "../lib/desempenhoEnergia";
import { PizzaDesempenho, fatiasFunil, fatiasOrigem } from "./DesempenhoEnergiaGraficos";

/** Desempenho individual do assessor (sem ranking nem dados de colegas). */
export function DesempenhoAssessorEnergia({ partner, leads }: { partner: any; leads: any[] }) {
  const [aberto, setAberto] = useState(true);
  const r = useMemo(() => resumoLeads(leads), [leads]);
  const h = useMemo(() => horasPresenca(partner), [partner]);
  const online = statusPresenca(partner?.presencaUltimoSinal, partner?.presencaAtivo) === "online";

  const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900";
  const rotulo = "text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";
  const valor = "font-mono text-2xl font-black tabular-nums leading-tight text-slate-900 dark:text-slate-50";
  const sub = "text-[11px] text-slate-500 dark:text-slate-400";

  return (
    <section className="space-y-3">
      <button type="button" onClick={() => setAberto(a => !a)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
        <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Meu Desempenho Operacional
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {aberto ? "Ocultar" : "Ver gráficos"} <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
        </span>
      </button>

      {aberto && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className={card}>
              <div className="flex items-center justify-between">
                <p className={rotulo}>Tempo em Operação</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30"><Clock className="h-4 w-4" /></span>
              </div>
              <p className={`${valor} mt-2`}>{formatarDuracao(h.segHoje)}</p>
              <p className={sub}>hoje · <span className={online ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>{online ? "● em operação agora" : "○ pausado"}</span></p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                <div><p className="text-slate-400">Semana</p><p className="font-mono font-bold text-slate-800 dark:text-slate-100">{formatarDuracao(h.segSemana)}</p></div>
                <div><p className="text-slate-400">Mês</p><p className="font-mono font-bold text-slate-800 dark:text-slate-100">{formatarDuracao(h.segMes)}</p></div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between">
                <p className={rotulo}>Convertidos do Painel</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30"><Target className="h-4 w-4" /></span>
              </div>
              <p className={`${valor} mt-2`}>{r.painel}</p>
              <p className={sub}>empresas migradas do Painel de Oportunidades</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                <div><p className="text-slate-400">Em atendimento</p><p className="font-mono font-bold text-blue-600 dark:text-blue-300">{r.painelAtendimento}</p></div>
                <div><p className="text-slate-400">Fechados</p><p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.painelConcluido}</p></div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between">
                <p className={rotulo}>Produção & Eficiência</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"><TrendingUp className="h-4 w-4" /></span>
              </div>
              <p className={`${valor} mt-2`}>{r.conversao}%</p>
              <p className={sub}>taxa de conversão pessoal</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                <div><p className="text-slate-400">Contratos</p><p className="font-mono font-bold text-slate-800 dark:text-slate-100">{r.funil.concluido} de {r.total}</p></div>
                <div><p className="text-slate-400">Média por contrato</p><p className="font-mono font-bold text-slate-800 dark:text-slate-100">{r.kwhMedio.toLocaleString("pt-BR")} kWh</p></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PizzaDesempenho titulo="Meu funil de vendas" fatias={fatiasFunil(r.funil)} />
            <PizzaDesempenho titulo="Origem dos meus leads" fatias={fatiasOrigem(r.painel, r.manual)} />
          </div>
        </>
      )}
    </section>
  );
}
