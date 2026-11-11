import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export type FatiaPizza = { nome: string; valor: number; cor: string };

/** Pizza em rosca com legenda, legível no tema claro e escuro. */
export function PizzaDesempenho({ titulo, fatias }: { titulo: string; fatias: FatiaPizza[] }) {
  const total = fatias.reduce((a, f) => a + f.valor, 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</p>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fatias.filter(f => f.valor > 0)} dataKey="valor" nameKey="nome" innerRadius={38} outerRadius={60} paddingAngle={2} stroke="none">
                  {fatias.filter(f => f.valor > 0).map(f => <Cell key={f.nome} fill={f.cor} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: "1px solid #cbd5e1" }} formatter={(v: any, n: any) => [`${v} (${Math.round((Number(v) / total) * 100)}%)`, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-full border-[14px] border-slate-100 dark:border-slate-800" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg font-black tabular-nums text-slate-900 dark:text-slate-50">{total}</span>
            <span className="text-[9px] font-semibold uppercase text-slate-400">leads</span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {fatias.map(f => (
            <li key={f.nome} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.cor }} />
                <span className="truncate">{f.nome}</span>
              </span>
              <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {f.valor}<span className="ml-1 font-sans font-medium text-slate-400">{total ? Math.round((f.valor / total) * 100) : 0}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const CORES_FUNIL = { novo: "#94a3b8", atendimento: "#3b82f6", concluido: "#10b981", arquivado: "#f43f5e" };
export const CORES_ORIGEM = { painel: "#f59e0b", manual: "#0ea5e9" };

export function fatiasFunil(f: { novo: number; atendimento: number; concluido: number; arquivado: number }): FatiaPizza[] {
  return [
    { nome: "Novos", valor: f.novo, cor: CORES_FUNIL.novo },
    { nome: "Em Atendimento", valor: f.atendimento, cor: CORES_FUNIL.atendimento },
    { nome: "Concluídos", valor: f.concluido, cor: CORES_FUNIL.concluido },
    { nome: "Cancelados", valor: f.arquivado, cor: CORES_FUNIL.arquivado },
  ];
}

export function fatiasOrigem(painel: number, manual: number): FatiaPizza[] {
  return [
    { nome: "Painel de Oportunidades", valor: painel, cor: CORES_ORIGEM.painel },
    { nome: "Cadastro Manual", valor: manual, cor: CORES_ORIGEM.manual },
  ];
}
