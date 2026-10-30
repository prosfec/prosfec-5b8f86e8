import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const App = lazy(() => import("../App"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      {
        title: "PROSFEC | Inteligência Financeira e Creditícia para Empresas",
      },
      {
        name: "description",
        content:
          "Diagnóstico financeiro e creditício, estruturação de crédito, reabilitação de rating/score e gestão financeira estratégica para empresas.",
      },
      {
        property: "og:title",
        content: "PROSFEC | Inteligência Financeira e Creditícia para Empresas",
      },
      {
        property: "og:description",
        content:
          "Entenda a posição financeira da sua empresa, identifique oportunidades de crédito e estruture o próximo passo com a PROSFEC.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://prosfec.com.br/" },
      { property: "og:image", content: "https://prosfec.com.br/og-prosfec.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://prosfec.com.br/og-prosfec.jpg" },
      { name: "theme-color", content: "#0A3D2E" },
    ],
    links: [{ rel: "canonical", href: "https://prosfec.com.br/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PROSFEC",
          alternateName: ["Prosfec", "PROSFEC Energy"],
          url: "https://prosfec.com.br/",
        }),
      },
    ],
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
