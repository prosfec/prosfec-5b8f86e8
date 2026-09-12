import { createFileRoute } from "@tanstack/react-router";
import { RelatorioPdfViewerModal } from "@/components/RelatorioPdfViewerModal";

export const Route = createFileRoute("/pdf-test")({ component: Page });

function Page() {
  return (
    <RelatorioPdfViewerModal
      isOpen
      onClose={() => {}}
      consulta={{ relatorioPdfUrl: "/__pdf-test.pdf", documento: "12.345.678/0001-90", documentoNome: "Teste LTDA" }}
    />
  );
}
