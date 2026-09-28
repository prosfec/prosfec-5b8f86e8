import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ParceirosLanding = lazy(() => import("@/components/ParceirosLanding"));

const TITLE = "Programa de Parceiros PROSFEC | Ganhe até 3% por Operação Liberada";
const DESCRIPTION =
  "Seja um parceiro PROSFEC e monetize seu relacionamento com empresas: crédito PJ (PRONAMPE), reabilitação de rating e energia solar por assinatura, com Mesa Operacional, CRM e ferramenta Caça-Leads.";
const URL = "https://prosfec.com.br/parceiros";

export const Route = createFileRoute("/parceiros")({
  component: ParceirosPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B0F14" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
});

function ParceirosPage() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#0B0F14]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#0B0F14]" />}>
        <ParceirosLanding />
      </Suspense>
    </ClientOnly>
  );
}
