import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { formatarDuracao, statusPresenca } from "../lib/presenca";
import { rankingEquipe, resumoLeads, type CriterioRanking } from "../lib/desempenhoEnergia";
import { PizzaDesempenho, fatiasFunil, fatiasOrigem } from "./DesempenhoEnergiaGraficos";

const PODIO = [
  { medalha: "🥇", rotulo: "1º lugar", tom: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10" },
  { medalha: "🥈", rotulo: "2º lugar", tom: "border-slate-300 bg-slate-50 dark:border-slate-500/40 dark:bg-slate-500/10" },
  { medalha: "🥉", rotulo: "3º lugar", tom: "border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10" },
];

/** Visão executiva do ADM: funil consolidado, pódio e ranking da equipe solar. */
export function RankingEquipeEnergia({ partners, leads }: { partners: any[]; leads: any[] }) {
  const [criterio, setCriterio] = useState<CriterioRanking>("vendas");
  const geral = useMemo(() => resumoLeads(leads), [leads]);
  const linhas = useMemo(() => rankingEquipe(partners, leads, criterio), [partners, leads, criterio]);
  const horasEquipe = linhas.reduce((a, l) => a + l.segMes, 0);
  const podio = linhas.filter(l => (criterio === "horas" ? l.segMes : criterio === "painel" ? l.painel : l.funil.concluido) > 0).slice(0, 3);

  const card = "rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900";
  const metrica = (l: (typeof linhas)[number]) =>
    criterio === "horas" ? `${formatarDuracao(l.segMes)} no mês` : criterio === "painel" ? `${l.painel} do Painel` : `${l.funil.concluido} fechados · ${l.kwhConcluido.toLocaleString("pt-BR")} kWh`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Leads da empresa", String(geral.total)],
          ["Contratos fechados", `${geral.funil.concluido} · ${geral.conversao}%`],
          ["Do Painel de Oportunidades", String(geral.painel)],
          ["Horas da equipe no mês", formatarDuracao(horasEquipe)],
        ].map(([l, v]) => (
          <div key={l} className={card}>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{l}</p>
            <p className="mt-0.5 text-base font-black tabular-nums text-slate-900 dark:text-slate-50">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PizzaDesempenho titulo="Funil consolidado da empresa" fatias={fatiasFunil(geral.funil)} />
        <PizzaDesempenho titulo="Origem global dos leads" fatias={fatiasOrigem(geral.painel, geral.manual)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
          <Trophy className="h-4 w-4 text-amber-500" /> Ranking da equipe
        </h4>
        <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
          {([["vendas", "Mais vendas"], ["painel", "Mais do Painel"], ["horas", "Mais horas"]] as [CriterioRanking, string][]).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setCriterio(k)} className={`rounded-lg px-3 py-1 text-[11px] font-extrabold cursor-pointer ${criterio === k ? "border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"}`}>{l}</button>
          ))}
        </div>
      </div>

      {podio.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {podio.map((l, i) => (
            <div key={l.partner.id} className={`rounded-2xl border p-4 text-center ${PODIO[i].tom}`}>
              <p className="text-3xl leading-none">{PODIO[i].medalha}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{PODIO[i].rotulo}</p>
              <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-slate-50">{l.partner.nome || "Assessor"}</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">{metrica(l)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              {["Pos.", "Assessor", "Status", "Horas no mês", "Do Painel", "Em atend.", "Concluídos", "kWh fechado", "Conversão"].map((c, i) => (
                <th key={c} className={`p-2 font-bold ${i < 2 ? "text-left" : "text-center"}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900">
            {linhas.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-slate-400">Nenhum assessor de energia encontrado.</td></tr>
            )}
            {linhas.map((l, i) => {
              const online = statusPresenca(l.partner.presencaUltimoSinal, l.partner.presencaAtivo) === "online";
              const zap = String(l.partner.whatsapp || "").replace(/\D/g, "");
              return (
                <tr key={l.partner.id} className="border-t border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  <td className="p-2 font-black tabular-nums">{i < 3 ? PODIO[i].medalha : `${i + 1}º`}</td>
                  <td className="p-2">
                    <p className="font-bold text-slate-900 dark:text-slate-50">{l.partner.nome || "—"}</p>
                    {zap && <a href={`https://wa.me/55${zap}`} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 hover:underline dark:text-emerald-400">WhatsApp</a>}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${online ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                      {online ? "● Online" : "○ Offline"}
                    </span>
                  </td>
                  <td className="p-2 text-center font-mono tabular-nums">{formatarDuracao(l.segMes)}</td>
                  <td className="p-2 text-center font-mono tabular-nums text-amber-600 dark:text-amber-300">{l.painel}</td>
                  <td className="p-2 text-center font-mono tabular-nums text-blue-600 dark:text-blue-300">{l.funil.atendimento}</td>
                  <td className="p-2 text-center font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">{l.funil.concluido}</td>
                  <td className="p-2 text-center font-mono tabular-nums">{l.kwhConcluido.toLocaleString("pt-BR")}</td>
                  <td className="p-2 text-center font-mono tabular-nums">{l.conversao}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
