import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, QrCode, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

export default function LinkIndicacaoEnergia({ partnerId }: { partnerId: string }) {
  const [copiado, setCopiado] = useState(false);
  const [qr, setQr] = useState(false);
  const [erro, setErro] = useState("");
  const url = `https://prosfec.com.br/energiasolar?ref=${encodeURIComponent(partnerId)}`;
  async function copiar() {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setErro(""); setTimeout(() => setCopiado(false), 2500); }
    catch { setErro("Não foi possível copiar automaticamente. Selecione o link abaixo."); }
  }
  return <section className="simulacao-editor bg-simulation-surface text-simulation-ink">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h4 className="text-sm font-bold">Seu Link Exclusivo do Portal de Energia Solar</h4><p className="mt-1 text-xs text-simulation-muted">Indicações vinculadas ao seu atendimento.</p></div>
      <div className="flex gap-2">
        <Button className="simulacao-primary" size="sm" onClick={copiar}>{copiado ? <Check /> : <Copy />}{copiado ? "Copiado" : "Copiar link"}</Button>
        <Button className="simulacao-button" variant="outline" size="icon" title="Mostrar QR Code" aria-label="Mostrar QR Code" aria-expanded={qr} onClick={() => setQr(v => !v)}><QrCode /></Button>
        <Button className="simulacao-button" variant="outline" size="icon" title="Abrir seu portal" aria-label="Abrir seu portal" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /></a></Button>
      </div>
    </div>
    <input readOnly aria-label="Link de indicação de energia" value={url} onFocus={e => e.currentTarget.select()} className="mt-3 w-full rounded border border-simulation-border bg-simulation-ground p-2 text-xs text-simulation-ink" />
    {erro && <p role="alert" className="simulacao-error">{erro}</p>}
    {qr && <div className="mt-4 flex justify-center"><QRCodeSVG value={url} size={180} marginSize={3} title="Link do assessor PROSFEC Energy" /></div>}
  </section>;
}