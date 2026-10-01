import { useState } from "react";
import { KeyRound, RefreshCw, Copy, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { auth } from "../firebase";
import { buildWhatsAppUrl } from "../utils";

type Props = {
  partner: { id: string; nome?: string; email?: string; whatsapp?: string };
  onClose: () => void;
};

const gerarSenha = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  const meio = Array.from(arr, (n) => chars[n % chars.length]).join("");
  return `Prosfec@${meio}`;
};

export default function PartnerPasswordResetModal({ partner, onClose }: Props) {
  const [senha, setSenha] = useState(gerarSenha);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const mensagem = `Olá ${partner.nome || ""}, sua senha temporária de acesso ao Portal PROSFEC foi redefinida para: ${senha}\n\nAcesse https://prosfec.com.br/parceiros e altere-a após o primeiro login.`;

  const confirmar = async () => {
    if (senha.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    setSalvando(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const r = await fetch("/api/admin/reset-partner-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ partnerId: partner.id, novaSenha: senha }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data?.error === "SERVICE_ACCOUNT_MISSING") {
          toast.error("A chave de serviço do Firebase ainda não foi configurada no servidor.");
        } else {
          toast.error(data?.error || "Não foi possível redefinir a senha.");
        }
        return;
      }
      setConcluido(true);
      toast.success("Senha temporária definida com sucesso.");
    } catch {
      toast.error("Falha de conexão ao redefinir a senha.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <KeyRound className="h-4 w-4 text-[#0A3D2E]" /> Senha temporária
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <div className="font-bold text-slate-800">{partner.nome}</div>
          <div>{partner.email}</div>
          <div className="font-mono">{partner.whatsapp}</div>
        </div>

        <label className="mb-1 block text-xs font-bold text-slate-700">Nova senha</label>
        <div className="mb-4 flex gap-2">
          <input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={concluido}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
          />
          {!concluido && (
            <button type="button" onClick={() => setSenha(gerarSenha())} className="rounded-lg border border-slate-200 px-2 hover:bg-slate-50" title="Gerar outra">
              <RefreshCw className="h-4 w-4 text-slate-600" />
            </button>
          )}
        </div>

        {!concluido ? (
          <button
            type="button"
            onClick={confirmar}
            disabled={salvando}
            className="w-full rounded-lg bg-[#0A3D2E] py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {salvando ? "Atualizando..." : "Confirmar e atualizar senha"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(mensagem); toast.success("Mensagem copiada."); }}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-sm font-bold text-slate-700"
            >
              <Copy className="h-4 w-4" /> Copiar
            </button>
            <a
              href={buildWhatsAppUrl(partner.whatsapp, mensagem)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
