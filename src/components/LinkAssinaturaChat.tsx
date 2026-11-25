import { toast } from "sonner";
import { Copy, FileSignature, Send } from "lucide-react";
import { buildWhatsAppUrl } from "../utils";
import { mensagemLinkAssinatura, normalizarLinkAssinatura } from "../lib/linkAssinatura";

type Props = { link: string; rotulo?: string; clienteNome?: string; clienteTelefone?: string; assessorNome?: string; assessor?: boolean };

export function LinkAssinaturaChat({ link, rotulo, clienteNome = "", clienteTelefone = "", assessorNome = "", assessor }: Props) {
  const url = normalizarLinkAssinatura(link);
  if (!url) return <p className="text-[11px] text-red-600">Link de assinatura inválido. Consulte a Mesa.</p>;
  const wa = clienteTelefone ? buildWhatsAppUrl(clienteTelefone, mensagemLinkAssinatura(clienteNome, assessorNome, url)) : "#";
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado!"); }
    catch { toast.error("Não foi possível copiar o link."); }
  };
  return (
    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50" translate="no">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide"><FileSignature className="h-3.5 w-3.5" /> Link de assinatura de contrato</p>
      {rotulo && <p className="mt-0.5 text-[12px] font-semibold">{rotulo}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {assessor && (clienteTelefone ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-emerald-700">
            <Send className="h-3.5 w-3.5" /> Enviar no WhatsApp do cliente
          </a>
        ) : <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Cadastre o telefone do cliente para enviar pelo WhatsApp.</span>)}
        <button type="button" onClick={copiar} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900 cursor-pointer">
          <Copy className="h-3 w-3" /> Copiar link
        </button>
      </div>
    </div>
  );
}
