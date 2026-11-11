import { diaPresenca, segundosValidos } from "./presenca";

export type StatusFunil = "novo" | "atendimento" | "concluido" | "arquivado";

export function inicioSemanaChave(agora: Date = new Date()): string {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(agora);
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd) + 1;
  return diaPresenca(new Date(agora.getTime() - (dow - 1) * 86400000));
}

export function horasPresenca(partner: any, agora: Date = new Date()) {
  const hoje = diaPresenca(agora);
  const semana = inicioSemanaChave(agora);
  const mes = hoje.slice(0, 7);
  let segHoje = 0, segSemana = 0, segMes = 0;
  for (const [dia, reg] of Object.entries(partner?.presencaDias || {})) {
    const s = segundosValidos(reg);
    if (dia === hoje) segHoje += s;
    if (dia >= semana && dia <= hoje) segSemana += s;
    if (dia.startsWith(mes)) segMes += s;
  }
  return { segHoje, segSemana, segMes };
}

export function statusFunil(lead: any): StatusFunil {
  const s = String(lead?.status || "novo");
  if (s === "cancelado") return "arquivado";
  return (["novo", "atendimento", "concluido", "arquivado"].includes(s) ? s : "novo") as StatusFunil;
}

/** Métricas de produção de um conjunto de leads solares. */
export function resumoLeads(leads: any[]) {
  const funil: Record<StatusFunil, number> = { novo: 0, atendimento: 0, concluido: 0, arquivado: 0 };
  let painel = 0, painelAtendimento = 0, painelConcluido = 0, kwhConcluido = 0;
  for (const l of leads || []) {
    const st = statusFunil(l);
    funil[st]++;
    if (st === "concluido") kwhConcluido += Number(l.consumoKwhMes) || 0;
    if (l?.origem === "painel_oportunidades") {
      painel++;
      if (st === "atendimento") painelAtendimento++;
      if (st === "concluido") painelConcluido++;
    }
  }
  const total = (leads || []).length;
  return {
    total, funil, painel, painelAtendimento, painelConcluido, manual: total - painel, kwhConcluido,
    conversao: total ? Math.round((funil.concluido / total) * 100) : 0,
    kwhMedio: funil.concluido ? Math.round(kwhConcluido / funil.concluido) : 0,
  };
}

export type CriterioRanking = "vendas" | "horas" | "painel";

export function rankingEquipe(partners: any[], leads: any[], criterio: CriterioRanking = "vendas", agora: Date = new Date()) {
  const porParceiro = new Map<string, any[]>();
  for (const l of leads || []) {
    if (!l?.parceiroId) continue;
    (porParceiro.get(l.parceiroId) || porParceiro.set(l.parceiroId, []).get(l.parceiroId)!).push(l);
  }
  const linhas = (partners || [])
    .filter(p => String(p.plano || "").toUpperCase().includes("ASSESSOR DE ENERGIA") || porParceiro.has(p.id))
    .map(p => ({ partner: p, ...resumoLeads(porParceiro.get(p.id) || []), ...horasPresenca(p, agora) }));
  const chave = (r: (typeof linhas)[number]) =>
    criterio === "horas" ? [r.segMes, r.funil.concluido] : criterio === "painel" ? [r.painel, r.funil.concluido] : [r.funil.concluido, r.kwhConcluido];
  return linhas.sort((a, b) => {
    const [a1, a2] = chave(a), [b1, b2] = chave(b);
    return b1 - a1 || b2 - a2 || String(a.partner.nome || "").localeCompare(String(b.partner.nome || ""));
  });
}
