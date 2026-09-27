import { createFileRoute } from "@tanstack/react-router";
import EnergiaSolarLanding from "@/components/EnergiaSolarLanding";

const TITLE = "Energia Solar por Assinatura | Economize de 17% a 27% na Conta de Luz";
const DESCRIPTION =
  "Energia solar por assinatura sem obras, sem placas e sem investimento. Reduza de 17% a 27% o valor da sua conta de luz com geração compartilhada regulamentada pela Lei 14.300 e pela ANEEL.";
const URL = "https://prosfec.com.br/energiasolar";

export const Route = createFileRoute("/energiasolar")({
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
  }),
});

function EnergiaSolarPage() {
  return <EnergiaSolarLanding />;
}
