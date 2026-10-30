import { createFileRoute } from "@tanstack/react-router";
import ClubeBeneficios from "@/components/ClubeBeneficios";
import clubeSocial from "@/assets/clube-social.jpg.asset.json";

const TITLE = "Clube de Benefícios | PROSFEC Energy";
const DESCRIPTION = "Área exclusiva para clientes de Energia Solar PROSFEC: Sunne Mais, Sunne Pay, simulação de crédito e diagnóstico financeiro PJ.";
const IMG = `https://prosfec.com.br${clubeSocial.url}`;

export const Route = createFileRoute("/clubedebeneficios")({
  component: ClubeBeneficios,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://prosfec.com.br/clubedebeneficios" },
      { property: "og:image", content: IMG },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: IMG },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://prosfec.com.br/clubedebeneficios" }],
  }),
});
