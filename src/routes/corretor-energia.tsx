import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const UserRegistrationForm = lazy(() => import("@/components/UserRegistrationForm"));

const TITLE = "Seja Corretor de Energia Solar | Credenciamento PROSFEC Energy";
const DESCRIPTION =
  "Cadastre-se gratuitamente como corretor de energia solar por assinatura da PROSFEC Energy. Sem mensalidade e com suporte operacional direto.";
const URL = "https://prosfec.com.br/corretor-energia";

export const Route = createFileRoute("/corretor-energia")({
  component: CorretorEnergiaPage,
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

function CorretorEnergiaPage() {
  const fallback = <div className="min-h-screen bg-slate-900" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <UserRegistrationForm
          modoEnergia
          onBackToHome={() => { window.location.href = "/energiasolar"; }}
          onGoToLogin={() => { window.location.href = "/?portal-parceiro=true"; }}
        />
      </Suspense>
    </ClientOnly>
  );
}
