import { CONCESSIONARIAS, type Concessionaria } from "../components/EnergiaContratacaoModal";

/** Concessionárias Sunne atendidas em uma UF (vazio quando não há cobertura). */
export function concessionariasDaUF(uf?: string | null): Concessionaria[] {
  const u = String(uf || "").trim().toUpperCase();
  if (!u) return [];
  return CONCESSIONARIAS.filter((c) => c.uf === u);
}

/** Resumo para exibição: nome único ou "Concessionárias UF", com o maior desconto. */
export function resumoConcessionariaUF(uf?: string | null) {
  const lista = concessionariasDaUF(uf);
  if (lista.length === 0) return null;
  const desconto = Math.max(...lista.map((c) => c.desconto));
  const nome = lista.length === 1 ? lista[0].nome : `Concessionárias ${lista[0].uf}`;
  return { nome, desconto, lista, unica: lista.length === 1 };
}
