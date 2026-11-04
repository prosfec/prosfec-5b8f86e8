// Classificação determinística (sem IA) do nível/porte da empresa a partir dos
// dados nativos do Google Places: primaryType, types, nome, avaliações e priceLevel.

export type NivelEmpresa = "prestador" | "pequeno" | "medio" | "grande";
export type FiltroNivel = "todos" | NivelEmpresa;

export interface PlacePorteInput {
  nome?: string;
  categoria?: string;
  primaryType?: string;
  types?: string[];
  avaliacoes?: number;
  priceLevel?: string;
}

export const NIVEIS: Record<NivelEmpresa, { rotulo: string; badge: string; opcao: string }> = {
  prestador: { rotulo: "Prestador / Autônomo", badge: "💼 Prestador / Autônomo", opcao: "💼 Prestadores de Serviço" },
  pequeno: { rotulo: "Pequeno Porte", badge: "🏪 Pequeno Porte (Comércio Local)", opcao: "🏪 Pequeno Porte" },
  medio: { rotulo: "Médio Porte", badge: "🏢 Médio Porte", opcao: "🏢 Médio Porte" },
  grande: { rotulo: "Grande Porte", badge: "🏭 Grande Porte / Redes", opcao: "🏭 Grande Porte" },
};

const GRANDE = ["supermarket", "hypermarket", "wholesale", "hospital", "factory", "manufactur", "industr", "shopping_mall", "department_store", "warehouse", "distribution", "atacad", "atacarejo", "hipermercado", "distribuidora", "indústria", "industria", "s/a", " s.a", "ltda matriz", "centro de distribui", "frigorífico", "frigorifico"];
const MEDIO = ["car_dealer", "hotel", "resort", "university", "secondary_school", "school", "gym", "fitness_center", "concession", "colégio", "colegio", "faculdade", "concessionária", "concessionaria", "academia"];
const PRESTADOR = ["lawyer", "accounting", "insurance_agency", "real_estate_agency", "consultant", "dentist", "doctor", "physiotherapist", "psychologist", "travel_agency", "electrician", "plumber", "painter", "locksmith", "moving_company", "roofing_contractor", "general_contractor", "corporate_office", "finance", "advoca", "contab", "consult", "escritório", "escritorio", "despachante", "imobiliária", "imobiliaria", "corretor", "seguros", "assessoria", "serviços", "servicos", "informática", "informatica"];

const contem = (texto: string, termos: string[]) => termos.some((t) => texto.includes(t));

export function classificarPorte(p: PlacePorteInput): NivelEmpresa {
  const tipos = [p.primaryType || "", ...(p.types || [])].join(" ").toLowerCase();
  const nome = ` ${(p.nome || "").toLowerCase()} ${(p.categoria || "").toLowerCase()}`;
  const texto = `${tipos} ${nome}`;
  const av = Number(p.avaliacoes) || 0;
  const caro = p.priceLevel === "PRICE_LEVEL_EXPENSIVE" || p.priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE";

  if (contem(texto, GRANDE) || av > 250) return "grande";
  if (contem(texto, MEDIO) || av > 80 || caro) return "medio";
  if (contem(texto, PRESTADOR) && av <= 35) return "prestador";
  return "pequeno";
}

/** Qualificador adicionado à busca para o Google priorizar o perfil escolhido. */
export function calibrarBusca(keyword: string, nivel: FiltroNivel): string {
  const k = keyword.trim();
  if (nivel === "prestador") return `${k} escritório consultório serviços`;
  if (nivel === "pequeno") return `${k} comércio local`;
  if (nivel === "grande") return `${k} distribuidora atacadista indústria`;
  return k;
}

export function filtrarPorNivel<T extends PlacePorteInput>(lista: T[], nivel: FiltroNivel): T[] {
  if (nivel === "todos") return lista;
  return lista.filter((p) => classificarPorte(p) === nivel);
}
