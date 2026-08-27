import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const TrackingPortal = lazy(() => import("../components/TrackingPortal"));

export const Route = createFileRoute("/portal-cliente")({
  component: PortalClienteRoute,
  head: () => ({
    meta: [
      { title: "Área do Cliente | PROSFEC" },
      {
        name: "description",
        content:
          "Acompanhe em tempo real o andamento da sua solicitação de crédito corporativo na PROSFEC.",
      },
      { property: "og:title", content: "Área do Cliente | PROSFEC" },
      {
        property: "og:description",
        content: "Acompanhe o andamento da sua solicitação PROSFEC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function PortalClienteRoute() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
        <TrackingPortal
          onBackToHome={() => {
            window.location.href = "/";
          }}
        />
      </Suspense>
    </ClientOnly>
  );
}
