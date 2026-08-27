import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const App = lazy(() => import("../App"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      {
        title: "PROSFEC - Estruturação de Crédito Corporativo | Pronampe 2026",
      },
      {
        name: "description",
        content:
          "PROSFEC - Simulador de Crédito Pronampe 2026. Diagnóstico em tempo real e liberação de crédito corporativo para MEI, ME e EPP.",
      },
      {
        property: "og:title",
        content: "PROSFEC - Pronampe 2026 & Estruturação de Crédito",
      },
      {
        property: "og:description",
        content:
          "Simule o limite de crédito Pronampe da sua empresa em segundos e receba suporte consultivo para fomento.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://prosfec.lovable.app/" },
      { property: "og:image", content: "https://prosfec.lovable.app/og-prosfec.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://prosfec.lovable.app/og-prosfec.jpg" },
      { name: "theme-color", content: "#0A3D2E" },
    ],
    links: [{ rel: "canonical", href: "https://prosfec.lovable.app/" }],
  }),
});

function Index() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}
