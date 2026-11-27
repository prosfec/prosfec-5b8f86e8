/**
 * Catálogo das usinas GD parceiras e motor de elegibilidade da Mesa de Operações.
 * Valores definidos pela diretoria PROSFEC Energy (nov/2026).
 */

export const DISTRIBUIDORAS = [
  { id: "celesc", nome: "Celesc", uf: "SC" },
  { id: "cemig", nome: "CEMIG", uf: "MG" },
  { id: "copel", nome: "COPEL", uf: "PR" },
  { id: "cpfl-paulista", nome: "CPFL Paulista", uf: "SP" },
  { id: "cpfl-piratininga", nome: "CPFL Piratininga", uf: "SP" },
  { id: "cpfl-santa-cruz", nome: "CPFL Santa Cruz", uf: "SP" },
  { id: "edp-es", nome: "EDP ES", uf: "ES" },
  { id: "edp-sp", nome: "EDP SP", uf: "SP" },
  { id: "enel-ce", nome: "Enel CE", uf: "CE" },
  { id: "enel-rj", nome: "Enel RJ", uf: "RJ" },
  { id: "energisa-ms", nome: "Energisa MS", uf: "MS" },
  { id: "energisa-mt", nome: "Energisa MT", uf: "MT" },
  { id: "energisa-pb", nome: "Energisa PB", uf: "PB" },
  { id: "energisa-ss", nome: "Energisa Sul-Sudeste", uf: "SP/PR/MG" },
  { id: "energisa-to", nome: "Energisa TO", uf: "TO" },
  { id: "equatorial-al", nome: "Equatorial AL", uf: "AL" },
  { id: "equatorial-go", nome: "Equatorial GO", uf: "GO" },
  { id: "equatorial-ma", nome: "Equatorial MA", uf: "MA" },
  { id: "equatorial-pa", nome: "Equatorial PA", uf: "PA" },
  { id: "equatorial-pi", nome: "Equatorial PI", uf: "PI" },
  { id: "neoenergia-brasilia", nome: "Neoenergia Brasília", uf: "DF" },
  { id: "neoenergia-coelba", nome: "Neoenergia Coelba", uf: "BA" },
  { id: "neoenergia-cosern", nome: "Neoenergia Cosern", uf: "RN" },
  { id: "neoenergia-elektro", nome: "Neoenergia Elektro", uf: "SP" },
  { id: "neoenergia-pe", nome: "Neoenergia PE (Celpe)", uf: "PE" },
  { id: "rge", nome: "RGE", uf: "RS" },
] as const;
export type DistribuidoraId = (typeof DISTRIBUIDORAS)[number]["id"];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const ALIASES: [DistribuidoraId, string[]][] = [
  ["celesc", ["celesc"]], ["cemig", ["cemig"]], ["copel", ["copel"]],
  ["cpfl-piratininga", ["piratininga"]], ["cpfl-santa-cruz", ["santa cruz"]], ["cpfl-paulista", ["cpfl paulista", "cpfl"]],
  ["edp-es", ["edp es", "edp espirito"]], ["edp-sp", ["edp sp", "edp sao paulo", "edp"]],
  ["enel-ce", ["enel ce", "enel ceara", "coelce"]], ["enel-rj", ["enel rj", "enel rio", "ampla"]],
  ["energisa-ms", ["energisa ms", "energisa mato grosso do sul"]], ["energisa-mt", ["energisa mt", "energisa mato grosso"]],
  ["energisa-pb", ["energisa pb", "energisa paraiba"]], ["energisa-to", ["energisa to", "energisa tocantins"]],
  ["energisa-ss", ["energisa s s", "energisa ss", "energisa sul", "sul sudeste"]],
  ["equatorial-al", ["equatorial al", "equatorial alagoas"]], ["equatorial-go", ["equatorial go", "equatorial goias"]],
  ["equatorial-ma", ["equatorial ma", "equatorial maranhao", "cemar"]], ["equatorial-pa", ["equatorial pa", "equatorial para", "celpa"]],
  ["equatorial-pi", ["equatorial pi", "equatorial piaui"]],
  ["neoenergia-brasilia", ["brasilia", "neoenergia df"]], ["neoenergia-coelba", ["coelba"]], ["neoenergia-cosern", ["cosern"]],
  ["neoenergia-elektro", ["elektro"]], ["neoenergia-pe", ["celpe", "neoenergia pe", "neoenergia pernambuco"]], ["rge", ["rge"]],
];

/** Identifica a distribuidora a partir de um texto livre (ID, nome ou apelido). */
export function identificarDistribuidora(texto: unknown): DistribuidoraId | null {
  if (typeof texto !== "string" || !texto.trim()) return null;
  const direto = DISTRIBUIDORAS.find(d => d.id === texto.trim());
  if (direto) return direto.id;
  const t = ` ${norm(texto)} `;
  for (const [id, termos] of ALIASES) if (termos.some(a => t.includes(` ${a} `))) return id;
  return null;
}
export const nomeDistribuidora = (id: DistribuidoraId) => DISTRIBUIDORAS.find(d => d.id === id)?.nome ?? id;

type Disponibilidade = "Alta" | "Média" | "Baixa";
interface Desconto { pct: number; detalhe: string; maximo?: number }
interface Usina {
  nome: string; consumoMinimo: number; faturaMinima?: number;
  placa: { aceita: false } | { aceita: true; excedenteMinimo: number };
  fatura: string; regras: string;
  disponibilidade?: Partial<Record<DistribuidoraId, Disponibilidade>>;
  desconto: (d: DistribuidoraId, consumo: number) => Desconto | null;
}

const faixa = <T,>(consumo: number, limites: number[], valores: T[]): T => {
  const i = limites.findIndex(l => consumo < l);
  return (i === -1 ? valores[valores.length - 1] : valores[i]) as T;
};

// Tabela da Usina 28 (a 121 parte dela, com ajustes próprios).
const PADRAO_28: Partial<Record<DistribuidoraId, [number, number, number]>> = {
  "neoenergia-pe": [30, 30, 30], "enel-ce": [25, 25, 25], "equatorial-go": [20, 24, 30], cemig: [18, 21, 28],
  "cpfl-paulista": [14, 16, 22], "enel-rj": [13, 15, 16], "energisa-mt": [12, 18, 25], "equatorial-pa": [12, 14, 16],
};
const SERENA_28: Partial<Record<DistribuidoraId, [number, number, number, number]>> = {
  "neoenergia-pe": [30, 30, 30, 30], "equatorial-go": [24, 25, 27, 30], cemig: [21, 23, 25, 28],
  "energisa-mt": [18, 20, 23, 25], "cpfl-paulista": [16, 18, 20, 22], "enel-rj": [16, 16, 16, 16],
};
const desconto28 = (d: DistribuidoraId, consumo: number): Desconto | null => {
  const p = PADRAO_28[d];
  if (!p) return null;
  const s = SERENA_28[d];
  if (s && consumo >= 1000) {
    const pct = faixa(consumo, [2000, 5000, 10000], s);
    return { pct, detalhe: "Desconto Especial Serena pela faixa de consumo", maximo: Math.max(pct, p[2]) };
  }
  return { pct: p[0], detalhe: "Desconto padrão sem fidelidade", maximo: p[2] };
};
// Usina 121: tabela própria (Equatorial GO tem desconto padrão de 32% com ou sem fidelidade).
const PADRAO_121: Partial<Record<DistribuidoraId, [number, number, number]>> = { ...PADRAO_28, "equatorial-go": [32, 32, 32] };
const SERENA_121: Partial<Record<DistribuidoraId, [number, number, number, number]>> = { ...SERENA_28 };
delete SERENA_121["equatorial-go"];
const desconto121 = (d: DistribuidoraId, consumo: number): Desconto | null => {
  const p = PADRAO_121[d];
  if (!p) return null;
  const s = SERENA_121[d];
  if (s && consumo >= 1000) {
    const pct = faixa(consumo, [2000, 5000, 10000], s);
    if (pct >= p[0]) return { pct, detalhe: "Desconto Especial Serena pela faixa de consumo", maximo: Math.max(pct, p[2]) };
  }
  return p[0] === p[2] ? { pct: p[0], detalhe: "Desconto padrão com ou sem fidelidade" } : { pct: p[0], detalhe: "Desconto padrão sem fidelidade", maximo: p[2] };
};
const REGRAS_28 = "Fatura única, sem portabilidade de titularidade. Exige obrigatoriamente login e senha da distribuidora, mantidos atualizados, para a usina pagar as tarifas mínimas. Desconto fixo (não muda com bandeira tarifária) sobre a tarifa COM impostos. Consulta Serasa/SPC e análise jurídica de CPF e CNPJ; pequenas dívidas podem ser aceitas se não forem críticas. Fidelidade de 1 ou 5 anos aumenta o desconto padrão. Comissão pela média dos últimos 12 meses.";

const USINA_26: Partial<Record<DistribuidoraId, [number, number, number]>> = {
  cemig: [27, 28, 29], "cpfl-paulista": [15, 16, 18], "cpfl-piratininga": [15, 16, 18], "edp-sp": [13, 14, 15],
  "neoenergia-elektro": [13, 14, 15], "edp-es": [13, 14, 15], copel: [12, 15, 16], "neoenergia-brasilia": [10, 10, 10],
};
const USINA_114: Partial<Record<DistribuidoraId, number>> = {
  cemig: 25, "enel-ce": 20, "neoenergia-coelba": 20,
  ...Object.fromEntries((["equatorial-al", "equatorial-go", "equatorial-ma", "energisa-mt", "equatorial-pa", "energisa-pb", "copel", "neoenergia-pe", "equatorial-pi", "neoenergia-cosern", "rge", "celesc", "cpfl-paulista", "cpfl-santa-cruz", "neoenergia-elektro", "energisa-ss"] as const).map(d => [d, 15])),
};
const USINA_120: Partial<Record<DistribuidoraId, [number, Disponibilidade]>> = {
  "enel-ce": [20, "Alta"], "equatorial-go": [25, "Alta"], "neoenergia-elektro": [15, "Alta"], "neoenergia-cosern": [20, "Alta"],
  "energisa-ms": [25, "Alta"], "cpfl-paulista": [15, "Alta"], rge: [15, "Alta"], "cpfl-santa-cruz": [15, "Alta"],
  "neoenergia-coelba": [18, "Alta"], "energisa-mt": [24, "Alta"], "equatorial-pi": [20, "Alta"], cemig: [25, "Alta"],
  celesc: [15, "Média"], "equatorial-al": [15, "Média"], "enel-rj": [15, "Média"], copel: [15, "Média"], "energisa-pb": [15, "Média"],
  "equatorial-ma": [15, "Baixa"], "equatorial-pa": [15, "Baixa"], "energisa-ss": [15, "Baixa"],
};
// Usina 102: [desconto padrão sugerido, máximo da tabela, detalhe] por faixa (<1.000 / 1.000–5.000 / >5.000 kWh).
type L102 = [number, number, string];
const G102A: L102[] = [[16, 18, "16% sem fidelidade, duas faturas, aviso prévio 180 dias"], [12, 22, "12% duas faturas sem fidelidade (até 22% em fatura única com 1 ano)"], [20, 30, "20% duas faturas sem fidelidade (até 30% conforme contrato)"]];
const USINA_102: Partial<Record<DistribuidoraId, L102[]>> = {
  "energisa-ms": G102A, "energisa-mt": G102A,
  "neoenergia-pe": [[16, 18, "16% sem fidelidade, duas faturas, aviso prévio 180 dias"], [22, 22, "22% em duas faturas com 2 anos de fidelidade (confirmar demais modalidades)"], [20, 30, "20% duas faturas sem fidelidade (até 30% conforme contrato)"]],
  "energisa-to": [[16, 18, "16% sem fidelidade, duas faturas, aviso prévio 180 dias"], [17, 20, "17% duas faturas (até 20% em fatura única com 1 ano)"], [18, 25, "18% duas faturas sem fidelidade (até 25% em fatura única com 1 ano)"]],
  "enel-ce": [[11, 12, "11% sem fidelidade, duas faturas, aviso prévio 180 dias"], [10, 18, "10% duas faturas sem fidelidade (até 18% com 2 anos)"], [18, 22, "18% duas faturas sem fidelidade (até 22% com 2 anos)"]],
};

export const USINAS: Usina[] = [
  {
    nome: "Usina 25", consumoMinimo: 800, placa: { aceita: true, excedenteMinimo: 2000 }, fatura: "Fatura única com portabilidade",
    regras: "Fatura única, com portabilidade de titularidade feita diretamente junto à distribuidora; o cliente não pode ter faturas em atraso. Após a portabilidade, paga à distribuidora apenas os dias proporcionais e passa ao novo modelo. Desconto fixo de 20% (não muda com bandeira tarifária) sobre a tarifa SEM impostos. Consulta Serasa. Comissão pela média dos últimos 12 meses.",
    desconto: d => (["copel", "energisa-ss", "cpfl-paulista"] as DistribuidoraId[]).includes(d) ? { pct: 20, detalhe: "Desconto fixo para todas as distribuidoras atendidas" } : null,
  },
  {
    nome: "Usina 26", consumoMinimo: 260, faturaMinima: 300, placa: { aceita: true, excedenteMinimo: 1000 }, fatura: "Duas faturas (GD padrão)",
    regras: "Modelo GD padrão com duas faturas: taxas mínimas pagas à distribuidora e energia com desconto paga à usina. Consumo mínimo de 260 kWh na fatura atual e fatura mínima de R$ 300,00; histórico avaliado sem rigidez absoluta. Onboarding com duas ligações (usina e BM Energia). Desconto fixo (não muda com bandeira tarifária) sobre a tarifa COM impostos. Consulta Serasa. Comissão pela média dos últimos 12 meses.",
    desconto: (d, c) => { const t = USINA_26[d]; return t ? { pct: faixa(c, [1000, 3001], t), detalhe: "Desconto pela faixa de consumo (260–999 / 1.000–3.000 / acima de 3.000 kWh)" } : null; },
  },
  { nome: "Usina 28", consumoMinimo: 200, placa: { aceita: false }, fatura: "Fatura única sem portabilidade", regras: REGRAS_28, desconto: desconto28 },
  {
    nome: "Usina 102", consumoMinimo: 150, placa: { aceita: true, excedenteMinimo: 200 }, fatura: "Flexível (única ou duas faturas)",
    regras: "Modelo flexível: fatura única ou duas faturas, com ou sem fidelidade; o desconto varia conforme consumo, faturamento e contrato. Aviso prévio de 120 ou 180 dias conforme a modalidade. Desconto fixo (não muda com bandeira tarifária) sobre a tarifa SEM impostos. Consulta SPC/Serasa. Comissão pela média dos últimos 12 meses.",
    desconto: (d, c) => { const t = USINA_102[d]; if (!t) return null; const [pct, maximo, detalhe] = faixa(c, [1000, 5001], t); return { pct, maximo, detalhe }; },
  },
  {
    nome: "Usina 114", consumoMinimo: 350, placa: { aceita: false }, fatura: "Duas faturas",
    regras: "Duas faturas: taxas mínimas (distribuição e iluminação pública) pagas à distribuidora e energia injetada com desconto paga à usina. Sem fidelidade. Desconto fixo (não muda com bandeira tarifária) sobre a tarifa SEM impostos. Possui análise de crédito Serasa. Comissão pela média dos últimos 12 meses.",
    desconto: d => { const pct = USINA_114[d]; return pct ? { pct, detalhe: "Desconto fixo sem fidelidade" } : null; },
  },
  {
    nome: "Usina 120", consumoMinimo: 100, placa: { aceita: false }, fatura: "Duas faturas",
    regras: "Duas faturas: taxas mínimas (distribuição e iluminação pública) pagas à distribuidora e energia injetada com desconto paga à usina. Sem fidelidade. Desconto fixo (não muda com bandeira tarifária) sobre a tarifa SEM impostos. Possui análise de crédito Serasa. Comissão pela média dos últimos 12 meses.",
    disponibilidade: Object.fromEntries(Object.entries(USINA_120).map(([d, v]) => [d, v[1]])),
    desconto: d => { const t = USINA_120[d]; return t ? { pct: t[0], detalhe: `Desconto máximo sem fidelidade · disponibilidade ${t[1].toLowerCase()}` } : null; },
  },
  { nome: "Usina 121", consumoMinimo: 200, placa: { aceita: false }, fatura: "Fatura única sem portabilidade", regras: REGRAS_28, desconto: desconto121 },
];

export interface PerfilLeadUsina { distribuidora: DistribuidoraId | null; consumoKwh: number; possuiPlaca: boolean; valorFatura?: number }
export interface UsinaCompativel {
  nome: string; desconto: number; descontoMaximo: number; detalhe: string; fatura: string;
  disponibilidade: Disponibilidade | null; sobAnalise: boolean; regras: string;
}
export interface UsinaRecusada { nome: string; motivo: string }

const PESO_DISP: Record<Disponibilidade, number> = { Alta: 3, Média: 2, Baixa: 1 };

/** Filtra, calcula e ordena as usinas para o perfil do lead. A primeira compatível é a recomendada. */
export function recomendarUsinas(perfil: PerfilLeadUsina): { compativeis: UsinaCompativel[]; recusadas: UsinaRecusada[] } {
  const compativeis: UsinaCompativel[] = [];
  const recusadas: UsinaRecusada[] = [];
  const consumo = Number.isFinite(perfil.consumoKwh) ? perfil.consumoKwh : 0;
  for (const u of USINAS) {
    if (!perfil.distribuidora) { recusadas.push({ nome: u.nome, motivo: "Distribuidora não informada" }); continue; }
    const desc = u.desconto(perfil.distribuidora, consumo);
    if (!desc) { recusadas.push({ nome: u.nome, motivo: `Não atende ${nomeDistribuidora(perfil.distribuidora)}` }); continue; }
    if (perfil.possuiPlaca && !u.placa.aceita) { recusadas.push({ nome: u.nome, motivo: "Não atende clientes com placa solar" }); continue; }
    const minimo = perfil.possuiPlaca && u.placa.aceita ? u.placa.excedenteMinimo : u.consumoMinimo;
    const minimoEfetivo = Math.max(minimo, u.consumoMinimo);
    if (consumo < minimoEfetivo) { recusadas.push({ nome: u.nome, motivo: perfil.possuiPlaca && u.placa.aceita ? `Com placa solar exige excedente acima de ${minimo.toLocaleString("pt-BR")} kWh` : `Consumo mínimo de ${minimo.toLocaleString("pt-BR")} kWh` }); continue; }
    if (u.faturaMinima && perfil.valorFatura && perfil.valorFatura > 0 && perfil.valorFatura < u.faturaMinima) { recusadas.push({ nome: u.nome, motivo: `Fatura mínima de R$ ${u.faturaMinima.toFixed(2).replace(".", ",")}` }); continue; }
    compativeis.push({
      nome: u.nome, desconto: desc.pct, descontoMaximo: Math.max(desc.pct, desc.maximo ?? desc.pct), detalhe: desc.detalhe, fatura: u.fatura,
      disponibilidade: u.disponibilidade?.[perfil.distribuidora] ?? null, sobAnalise: perfil.possuiPlaca, regras: u.regras,
    });
  }
  compativeis.sort((a, b) => b.desconto - a.desconto || (b.disponibilidade ? PESO_DISP[b.disponibilidade] : 2) - (a.disponibilidade ? PESO_DISP[a.disponibilidade] : 2) || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
  return { compativeis, recusadas };
}

/** Texto padrão do campo "Roteiro e regras operacionais" ao aplicar uma usina. */
export function regrasOfertaUsina(u: UsinaCompativel): string {
  const extra = u.descontoMaximo > u.desconto ? ` Pode chegar a ${u.descontoMaximo}% conforme fidelidade/contrato.` : "";
  return `${u.nome} · ${u.desconto}% de desconto (${u.detalhe}).${extra}${u.sobAnalise ? " Cliente com placa solar: sujeito à análise da usina." : ""}\n\n${u.regras}`;
}
