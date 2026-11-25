import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const UserRegistrationForm = lazy(() => import("@/components/UserRegistrationForm"));

const TITLE = "Credenciamento de Representante Comercial | PROSFEC Energy";
const DESCRIPTION =
  "Cadastre-se como Representante Comercial da PROSFEC Energy: parceria comercial autônoma em soluções de energia solar, sem taxa de adesão ou mensalidade.";
const URL = "https://prosfec.com.br/representantecomercial";

export const Route = createFileRoute("/representantecomercial")({
  component: RepresentanteComercialPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
});

function RepresentanteComercialPage() {
  const fallback = <div className="min-h-screen bg-slate-900" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <UserRegistrationForm
          modoEnergia
          modoRepresentante
          onBackToHome={() => { window.location.href = "/energiasolar"; }}
          onGoToLogin={() => { window.location.href = "/?portal-parceiro=true"; }}
        />
      </Suspense>
    </ClientOnly>
  );
}
