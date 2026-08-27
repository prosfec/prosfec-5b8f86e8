import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const AdminDashboard = lazy(() => import("../components/AdminDashboard"));

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
  head: () => ({
    meta: [
      { title: "Painel Administrativo | PROSFEC" },
      {
        name: "description",
        content:
          "Acesso restrito ao painel administrativo PROSFEC para gestão de leads, parceiros e indicadores.",
      },
      { property: "og:title", content: "Painel Administrativo | PROSFEC" },
      {
        property: "og:description",
        content: "Área restrita da equipe PROSFEC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminRoute() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
        <AdminDashboard
          onExit={() => {
            window.location.href = "/";
          }}
        />
      </Suspense>
    </ClientOnly>
  );
}
