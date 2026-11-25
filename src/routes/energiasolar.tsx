import { createFileRoute } from "@tanstack/react-router";
import EnergiaSolarLanding from "@/components/EnergiaSolarLanding";

const TITLE = "PROSFEC Energy | Inteligência Energética e Geração Compartilhada";
const DESCRIPTION =
  "Conheça geração compartilhada, fontes renováveis, mercado livre e alocação de usinas. Orientação independente de fornecedores e análise comercial do seu perfil com a PROSFEC Energy.";
const URL = "https://prosfec.com.br/energiasolar";

export const Route = createFileRoute("/energiasolar")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => typeof search["ref"] === "string" ? { ref: search["ref"] } : {},
  component: EnergiaSolarPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#05070A" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "PROSFEC Energy", url: URL, description: DESCRIPTION, parentOrganization: { "@type": "Organization", name: "PROSFEC", url: "https://prosfec.com.br/" } }) }],
  }),
});

function EnergiaSolarPage() {
  const { ref } = Route.useSearch();
  return <EnergiaSolarLanding refId={ref || ""} />;
}
