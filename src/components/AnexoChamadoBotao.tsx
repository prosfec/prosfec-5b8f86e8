import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";

// Botão minimalista de download direto para anexos enviados pela Mesa no histórico.
export function AnexoChamadoBotao({ url, nome, tipo }: { url: string; nome?: string; tipo?: string }) {
  const [baixando, setBaixando] = useState(false);
  const rotulo = tipo === "imagem" ? "Baixar Imagem" : "Baixar PDF";

  const baixar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBaixando(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(String(resp.status));
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = nome || (tipo === "imagem" ? "anexo.jpg" : "anexo.pdf");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30_000);
    } catch {
      // Fallback caso o navegador bloqueie o download direto
      window.open(url, "_blank", "noopener");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={baixar}
      disabled={baixando}
      className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-extrabold cursor-pointer disabled:opacity-60"
    >
      {baixando ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      {rotulo}
    </button>
  );
}
