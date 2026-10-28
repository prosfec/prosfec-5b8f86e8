import { createFileRoute } from "@tanstack/react-router";
import ClubeBeneficios from "@/components/ClubeBeneficios";

const TITLE = "Clube de Benefícios | PROSFEC Energy";
const DESCRIPTION = "Área exclusiva para clientes de Energia Solar PROSFEC: Sunne Mais, Sunne Pay, simulação de crédito e acesso ao BNDES Empresas.";

export const Route = createFileRoute("/clubedebeneficios")({
  component: ClubeBeneficios,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://prosfec.com.br/clubedebeneficios" }],
  }),
});
