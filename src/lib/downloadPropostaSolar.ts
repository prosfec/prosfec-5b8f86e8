import type { OfertaEnergia } from "./validacaoFichaSolar";
import { urlPdfSegura } from "./validacaoFichaSolar";

export async function arquivoPropostaSolar(oferta: OfertaEnergia): Promise<Blob> {
  try {
    if (!urlPdfSegura(oferta.pdfUrl)) throw new Error("Link inválido.");
    const response = await fetch(oferta.pdfUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("PDF indisponível.");
    const blob = await response.blob();
    if ((await blob.slice(0, 5).text()) !== "%PDF-") throw new Error("Arquivo inválido.");
    return blob;
  } catch {
    const snapshot = oferta.propostaProsfec;
    if (!snapshot) throw new Error("Não foi possível baixar o PDF anexado. Tente novamente ou consulte a Mesa.");
    const { gerarPropostaProsfecPdf } = await import("./propostaProsfecPdf");
    const bytes = await gerarPropostaProsfecPdf({ ...snapshot, emissao: new Date(snapshot.emissao) });
    return new Blob([bytes as BlobPart], { type: "application/pdf" });
  }
}

export async function baixarPropostaSolar(oferta: OfertaEnergia) {
  let blob: Blob;
  try {
    blob = await arquivoPropostaSolar(oferta);
  } catch (err) {
    // Sem snapshot (anexo da Mesa ou oferta antiga): abre o link direto, que não depende de CORS.
    if (!urlPdfSegura(oferta.pdfUrl)) throw err;
    const link = document.createElement("a");
    link.href = oferta.pdfUrl; link.target = "_blank"; link.rel = "noopener noreferrer";
    document.body.appendChild(link); link.click(); link.remove();
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (typeof oferta.pdfNome === "string" ? oferta.pdfNome.replace(/[\\/\x00-\x1f]/g, "_") : "") || `Proposta_PROSFEC_${oferta.id}.pdf`;
  document.body.appendChild(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}