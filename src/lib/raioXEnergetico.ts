// Raio-X Energético: classificação de potencial de consumo a partir dos dados
// públicos do Google Places (categoria, avaliações e horário de funcionamento).
// Regras de negócio registradas em mem://features/raio-x-energetico.md.

export type FaixaEnergetica = "critico" | "alto" | "medio" | "leve";

import { classificarPorte } from "./porteEmpresa";

export interface PlaceEnergiaInput {
  nome?: string;
  priceLevel?: string;
  categoria?: string;
  primaryType?: string;
  types?: string[];
  avaliacoes?: number;
  horasSemanais?: number | null;
  diasSemana?: number | null;
  aberto24h?: boolean;
}

export interface RaioXEnergetico {
  faixa: FaixaEnergetica;
  rotulo: string;
  segmento: string;
  classificacao: string;
  porte: string;
  equipamentos: string;
  regime: string;
  cargasContinuas: string;
  kwhMin: number;
  kwhMax: number;
}

export const FAIXAS: Record<FaixaEnergetica, { rotulo: string; classificacao: string; kwhMin: number; kwhMax: number }> = {
  critico: { rotulo: "Crítico", classificacao: "Consumo extremo e contínuo", kwhMin: 5000, kwhMax: 15000 },
  alto: { rotulo: "Alto", classificacao: "Alto consumo contínuo", kwhMin: 2500, kwhMax: 5000 },
  medio: { rotulo: "Médio", classificacao: "Consumo moderado", kwhMin: 800, kwhMax: 2500 },
  leve: { rotulo: "Leve", classificacao: "Baixo consumo", kwhMin: 300, kwhMax: 800 },
};

interface Regra {
  faixa: FaixaEnergetica;
  segmento: string;
  equipamentos: string;
  refrigeracao24h: boolean;
  termos: string[];
}

// Ordem importa: a primeira regra que casar define o segmento.
const REGRAS: Regra[] = [
  { faixa: "critico", segmento: "Indústria / Frigorífico / Laticínio", refrigeracao24h: true, equipamentos: "Câmaras frigoríficas e túneis de congelamento, compressores de amônia, motores industriais, caldeiras e linhas de processamento", termos: ["frigor", "laticín", "laticin", "abatedouro", "matadouro", "factory", "manufactur", "industr", "fábrica", "fabrica", "beneficiadora", "fundição", "fundicao", "metalúrg", "metalurg", "têxtil", "textil", "plástico", "plastico", "gelo"] },
  { faixa: "critico", segmento: "Distribuidora / Centro de Distribuição", refrigeracao24h: true, equipamentos: "Câmaras frias de estocagem, empilhadeiras elétricas, iluminação de galpão e climatização", termos: ["distribuidora", "warehouse", "distribution", "centro de distribui", "logística", "logistica"] },
  { faixa: "critico", segmento: "Supermercado / Atacado", refrigeracao24h: true, equipamentos: "Câmaras frias, ilhas e balcões refrigerados, climatização e iluminação de grande área", termos: ["supermarket", "hypermarket", "wholesale", "supermercado", "hipermercado", "atacad"] },
  { faixa: "critico", segmento: "Açougue / Casa de Carnes", refrigeracao24h: true, equipamentos: "Câmaras frigoríficas, serras e moedores elétricos, balcões refrigerados", termos: ["butcher", "meat", "açougue", "acougue", "casa de carnes"] },
  { faixa: "critico", segmento: "Hotelaria / Hospedagem", refrigeracao24h: true, equipamentos: "Ar-condicionado em quartos, aquecimento de água, lavanderia, cozinha industrial", termos: ["hotel", "motel", "resort", "lodging", "pousada", "hostel"] },
  { faixa: "critico", segmento: "Hospital / Lavanderia Industrial", refrigeracao24h: true, equipamentos: "Equipamentos médicos ou motores industriais, climatização central, compressores", termos: ["hospital", "laundry", "lavanderia"] },
  { faixa: "alto", segmento: "Padaria / Panificação", refrigeracao24h: true, equipamentos: "Fornos elétricos, câmaras frias, balcões refrigerados, climatização e fatiadores", termos: ["bakery", "padaria", "panific", "confeitaria"] },
  { faixa: "alto", segmento: "Restaurante / Alimentação", refrigeracao24h: true, equipamentos: "Freezers, câmaras frias, coifas, fornos e climatização do salão", termos: ["restaurant", "steak", "barbecue", "buffet", "pizza", "churrasc", "restaurante", "food"] },
  { faixa: "alto", segmento: "Academia / Fitness", refrigeracao24h: false, equipamentos: "Climatização central, esteiras e aparelhos elétricos, aquecimento de água", termos: ["gym", "fitness", "academia", "crossfit"] },
  { faixa: "alto", segmento: "Farmácia / Saúde", refrigeracao24h: true, equipamentos: "Refrigeração de medicamentos, climatização, equipamentos de exames", termos: ["pharmacy", "drugstore", "farmácia", "farmacia", "drogaria", "clinic", "clínica", "clinica", "laborat", "medical", "diagnostic"] },
  { faixa: "medio", segmento: "Bar / Lanchonete", refrigeracao24h: true, equipamentos: "Freezers e cervejeiras, chapas, climatização", termos: ["bar", "pub", "lanchonete", "snack", "cafe", "café", "ice_cream", "sorvet", "açaí", "acai"] },
  { faixa: "medio", segmento: "Oficina / Serviços Automotivos", refrigeracao24h: false, equipamentos: "Compressores de ar, elevadores automotivos, ferramentas elétricas", termos: ["car_repair", "car_wash", "auto", "oficina", "mecânica", "mecanica", "lava"] },
  { faixa: "medio", segmento: "Pet Shop / Veterinária", refrigeracao24h: false, equipamentos: "Secadores e sopradores de alta potência, climatização, refrigeração de vacinas", termos: ["pet", "veterin"] },
  { faixa: "medio", segmento: "Educação / Cursos", refrigeracao24h: false, equipamentos: "Climatização de salas, computadores e iluminação", termos: ["school", "university", "escola", "colégio", "colegio", "curso", "faculdade"] },
  { faixa: "medio", segmento: "Varejo / Loja", refrigeracao24h: false, equipamentos: "Ar-condicionado, iluminação de vitrines e sistemas de caixa", termos: ["store", "shop", "loja", "clothing", "magazine", "shopping", "market", "mercad"] },
  { faixa: "leve", segmento: "Beleza / Estética", refrigeracao24h: false, equipamentos: "Secadores, chapinhas, climatização pontual", termos: ["beauty", "hair", "barber", "salão", "salao", "barbearia", "estética", "estetica", "nail", "spa"] },
  { faixa: "leve", segmento: "Escritório / Serviços", refrigeracao24h: false, equipamentos: "Computadores, iluminação e ar-condicionado pontual", termos: ["office", "account", "lawyer", "insurance", "real_estate", "escritório", "escritorio", "contab", "advoc", "imobili", "consult", "dentist", "doctor"] },
];

const REGRA_PADRAO: Regra = { faixa: "leve", segmento: "Comércio / Serviços em geral", refrigeracao24h: false, equipamentos: "Iluminação, computadores e climatização pontual", termos: [] };

const ORDEM: FaixaEnergetica[] = ["leve", "medio", "alto", "critico"];
const subir = (f: FaixaEnergetica): FaixaEnergetica => ORDEM[Math.min(ORDEM.length - 1, ORDEM.indexOf(f) + 1)];

const encontrarRegra = (p: PlaceEnergiaInput): Regra => {
  const texto = [p.nome, p.primaryType, ...(p.types || []), p.categoria].filter(Boolean).join(" ").toLowerCase();
  if (!texto) return REGRA_PADRAO;
  return REGRAS.find((r) => r.termos.some((t) => (t.length <= 3 ? new RegExp(`\\b${t}\\b`).test(texto) : texto.includes(t)))) || REGRA_PADRAO;
};

export function calcularRaioXEnergetico(p: PlaceEnergiaInput): RaioXEnergetico {
  const regra = encontrarRegra(p);
  const avaliacoes = Number(p.avaliacoes) || 0;
  const horas = typeof p.horasSemanais === "number" ? p.horasSemanais : null;

  const nivel = classificarPorte(p);
  const industrial = regra.segmento.startsWith("Indústria") || regra.segmento.startsWith("Distribuidora");
  const turno24 = !!p.aberto24h || (horas !== null && horas >= 84);

  // Porte: classificação unificada (nome + categoria + avaliações). Empresas B2B
  // têm poucas avaliações, então o Grande Porte não é rebaixado por isso.
  const porte = nivel === "grande"
    ? (industrial ? "🏭 Grande Porte / Indústria — estrutura pesada com alta demanda contínua" : "🏭 Grande Porte — operação de grande escala e alta demanda")
    : nivel === "medio" ? "🏢 Médio Porte — estabelecimento consolidado, movimento alto"
    : nivel === "prestador" ? "💼 Prestador de serviço — estrutura enxuta"
    : avaliacoes >= 20 ? "🏪 Pequeno Porte — movimento regular" : "🏪 Pequeno Porte ou pouca presença digital";

  let fator = avaliacoes >= 500 ? 0.85 : avaliacoes >= 100 ? 0.6 : avaliacoes >= 20 ? 0.35 : 0.15;
  if (nivel === "grande") fator = Math.max(fator, 0.5);
  if (turno24) fator += 0.15;
  else if (horas !== null && horas >= 60) fator += 0.08;
  fator = Math.min(1, fator);

  // Grande porte promove uma faixa; operação intensa (500+ avaliações e 24h) também.
  let faixa = regra.faixa;
  if (faixa !== "critico" && (nivel === "grande" || (avaliacoes >= 500 && turno24))) faixa = subir(faixa);

  const base = FAIXAS[faixa];
  // Escala de mercado para Grande Porte (consumo típico em média/alta tensão).
  const escala = nivel === "grande" && faixa === "critico"
    ? (industrial ? { min: 25000, max: 70000 } : { min: 12000, max: 40000 })
    : nivel === "medio" && industrial ? { min: 10000, max: 25000 }
    : { min: base.kwhMin, max: base.kwhMax };
  const span = escala.max - escala.min;
  const centro = escala.min + span * fator;
  const meia = span * 0.2;
  const arred = (n: number) => Math.round(n / 50) * 50;
  const kwhMin = arred(Math.max(escala.min, centro - meia));
  const kwhMax = arred(Math.min(escala.max, centro + meia));

  const regime = p.aberto24h ? "Funcionamento 24 horas"
    : horas !== null ? `${p.diasSemana ? `${p.diasSemana} dia${p.diasSemana > 1 ? "s" : ""} por semana` : "Horário regular"} (${Math.round(horas)}h semanais)${horas >= 60 ? " — funcionamento prolongado" : ""}`
    : "Horário não informado no Google";

  const cargasContinuas = regra.refrigeracao24h ? "Refrigeração ligada 24h, sem interrupção"
    : p.aberto24h ? "Climatização e iluminação contínuas" : "Cargas concentradas no horário comercial";

  return {
    faixa,
    rotulo: base.rotulo,
    segmento: regra.segmento,
    classificacao: escala.min >= 10000 ? "Consumo industrial — demanda em média/alta tensão" : base.classificacao,
    porte,
    equipamentos: regra.equipamentos,
    regime,
    cargasContinuas,
    kwhMin,
    kwhMax,
  };
}

// Converte regularOpeningHours.periods do Google Places em horas/dias semanais.
export function resumirHorario(periods: any[] | undefined): { horasSemanais: number | null; diasSemana: number | null; aberto24h: boolean } {
  if (!Array.isArray(periods) || periods.length === 0) return { horasSemanais: null, diasSemana: null, aberto24h: false };
  if (periods.length === 1 && periods[0]?.open && !periods[0]?.close) return { horasSemanais: 168, diasSemana: 7, aberto24h: true };
  let minutos = 0;
  const dias = new Set<number>();
  for (const p of periods) {
    const o = p?.open, c = p?.close;
    if (!o || !c || typeof o.day !== "number" || typeof c.day !== "number") continue;
    dias.add(o.day);
    const ini = o.day * 1440 + (o.hour || 0) * 60 + (o.minute || 0);
    let fim = c.day * 1440 + (c.hour || 0) * 60 + (c.minute || 0);
    if (fim <= ini) fim += 7 * 1440;
    minutos += fim - ini;
  }
  const horas = minutos / 60;
  return { horasSemanais: horas || null, diasSemana: dias.size || null, aberto24h: horas >= 167 };
}
