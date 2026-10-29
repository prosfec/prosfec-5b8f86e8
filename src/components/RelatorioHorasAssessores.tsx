import { useMemo, useState } from "react";
import { diaPresenca, formatarDuracao } from "../lib/presenca";
import { PresencaStatusBadge } from "./PresencaAssessor";
import { etapaAssessorEnergia, ETAPA_ENERGIA_TONE } from "./AssessorEnergiaContratos";

type Periodo = "hoje" | "semana" | "mes";

function inicioSemanaChave() {
  const agora = new Date();
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(agora);
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd) + 1;
  return diaPresenca(new Date(agora.getTime() - (dow - 1) * 86400000));
}

function noPeriodo(iso: string | undefined, p: Periodo, hoje: string, semana: string) {
  if (!iso) return false;
  const d = diaPresenca(new Date(iso));
  if (p === "hoje") return d === hoje;
  if (p === "semana") return d >= semana;
  return d.startsWith(hoje.slice(0, 7));
}

/** Relatório geral de horas e desempenho dos Assessores de Energia (aba Parceiros). */
export function RelatorioHorasAssessores({ partners, leadsEnergia, onClose }: { partners: any[]; leadsEnergia: any[]; onClose: () => void }) {
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const hoje = diaPresenca();
  const semana = inicioSemanaChave();

  const linhas = useMemo(() => {
    return partners
      .filter(p => (p.plano || "").toUpperCase().includes("ASSESSOR DE ENERGIA"))
      .map(p => {
        const dias = Object.entries(p.presencaDias || {}).map(([k, v]: [string, any]) => ({ dia: k, ...v }));
        const soma = (f: (d: any) => boolean) => dias.filter(f).reduce((a, d) => a + Number(d.segundosAtivos || 0), 0);
        const segHoje = soma(d => d.dia === hoje);
        const segSemana = soma(d => d.dia >= semana);
        const segMes = soma(d => String(d.dia).startsWith(hoje.slice(0, 7)));
        const leads = leadsEnergia.filter(l => l.parceiroId === p.id && noPeriodo(l.dataCriacao || l.criadoEm, periodo, hoje, semana));
        const todos = leadsEnergia.filter(l => l.parceiroId === p.id);
        const concl = todos.filter(l => l.status === "concluido" && noPeriodo(l.dataConclusao || l.dataAtualizacao || l.dataCriacao, periodo, hoje, semana)).length;
        const atend = todos.filter(l => l.status === "atendimento" || l.status === "em atendimento").length;
        const segPeriodo = periodo === "hoje" ? segHoje : periodo === "semana" ? segSemana : segMes;
        return {
          p, segHoje, segSemana, segMes, segPeriodo,
          primeiro: p.presencaDias?.[hoje]?.primeiroAcessoHora || "—",
          leads: leads.length, atend, concl,
          conv: leads.length ? Math.round((concl / leads.length) * 100) : 0,
        };
      })
      .filter(r => {
        const q = busca.trim().toLowerCase();
        if (!q) return true;
        return (r.p.nome || "").toLowerCase().includes(q) || String(r.p.whatsapp || "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§");
      })
      .sort((a, b) => b.segPeriodo - a.segPeriodo);
  }, [partners, leadsEnergia, busca, periodo, hoje, semana]);

  const totalSeg = linhas.reduce((a, r) => a + r.segPeriodo, 0);
  const online = linhas.filter(r => r.p.presencaAtivo && r.p.presencaUltimoSinal && Date.now() - new Date(r.p.presencaUltimoSinal).getTime() < 270000).length;
  const totalConcl = linhas.reduce((a, r) => a + r.concl, 0);
  const totalLeads = linhas.reduce((a, r) => a + r.leads, 0);
  const rotulo = periodo === "hoje" ? "hoje" : periodo === "semana" ? "na semana" : "no mês";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h3 className="text-base font-black text-slate-900">⏱️ Horas & Desempenho — Assessores de Energia</h3>
            <p className="text-[11px] text-slate-500">Horas contadas de segunda a sexta, 08h às 18h (Brasília), com pausa após 5 min sem atividade.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-lg font-bold text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Fechar">✕</button>
        </div>

        <div className="space-y-3 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              ["Assessores", `${online} online / ${linhas.length}`],
              [`Horas da equipe ${rotulo}`, formatarDuracao(totalSeg)],
              [`Leads cadastrados ${rotulo}`, String(totalLeads)],
              [`Contratos concluídos ${rotulo}`, String(totalConcl)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-500">{l}</p>
                <p className="text-lg font-extrabold text-slate-900">{v}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone…" className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500" />
            {([["hoje", "Hoje"], ["semana", "Esta semana"], ["mes", "Mês atual"]] as [Periodo, string][]).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPeriodo(k)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold cursor-pointer ${periodo === k ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{l}</button>
            ))}
          </div>

          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Assessor</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">1º acesso hoje</th>
                  <th className="p-2">Hoje</th>
                  <th className="p-2">Semana</th>
                  <th className="p-2">Mês</th>
                  <th className="p-2">Leads ({rotulo})</th>
                  <th className="p-2">Em atendimento</th>
                  <th className="p-2">Concluídos ({rotulo})</th>
                  <th className="p-2">Conversão</th>
                  <th className="p-2">Etapa</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && <tr><td colSpan={11} className="p-4 text-center text-slate-500">Nenhum assessor encontrado.</td></tr>}
                {linhas.map(r => {
                  const et = etapaAssessorEnergia(r.p);
                  return (
                    <tr key={r.p.id} className="border-t border-slate-100">
                      <td className="p-2 text-left">
                        <p className="font-bold text-slate-900">{r.p.nome}</p>
                        <p className="font-mono text-[10px] text-slate-500">{r.p.whatsapp}</p>
                      </td>
                      <td className="p-2 text-center"><PresencaStatusBadge partner={r.p} /></td>
                      <td className="p-2 text-center">{r.primeiro}</td>
                      <td className="p-2 text-center font-bold">{formatarDuracao(r.segHoje)}</td>
                      <td className="p-2 text-center font-bold">{formatarDuracao(r.segSemana)}</td>
                      <td className="p-2 text-center font-bold">{formatarDuracao(r.segMes)}</td>
                      <td className="p-2 text-center">{r.leads}</td>
                      <td className="p-2 text-center">{r.atend}</td>
                      <td className="p-2 text-center font-bold text-emerald-700">{r.concl}</td>
                      <td className="p-2 text-center">{r.conv}%</td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${ETAPA_ENERGIA_TONE[et.etapa]}`}>{et.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
