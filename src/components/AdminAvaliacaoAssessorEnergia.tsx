import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db, auth } from "../firebase";
import {
  DIAS_CAPACITACAO_ENERGIA,
  ETAPA_ENERGIA_TONE,
  MSG_APROVACAO_ENERGIA,
  MSG_RECUSA_ENERGIA,
  diasDesdeCapacitacao,
  etapaAssessorEnergia,
} from "./AssessorEnergiaContratos";

type Decisao = "aprovado" | "recusado";

/** Bloco de avaliação do Assessor de Energia dentro de "Abrir Operação" (somente ADM). */
export function AdminAvaliacaoAssessorEnergia({
  partner,
  leadsEnergia,
  onUpdated,
}: {
  partner: any;
  leadsEnergia: any[];
  onUpdated: (updates: Record<string, any>) => void;
}) {
  const [decisao, setDecisao] = React.useState<Decisao | null>(null);
  const [mensagem, setMensagem] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const et = etapaAssessorEnergia(partner);
  const cap = partner.termoCapacitacaoEnergiaAceitoEm;
  const dias = cap ? Math.min(DIAS_CAPACITACAO_ENERGIA, diasDesdeCapacitacao(cap)) : 0;
  const meus = leadsEnergia.filter((l) => l.parceiroId === partner.id);
  const fechados = meus.filter((l) => l.status === "concluido");
  const kwh = fechados.reduce((s, l) => s + (Number(l.consumoKwhMes) || 0), 0);
  const fmt = (v?: string) => (v ? new Date(v).toLocaleString("pt-BR") : "-");

  const abrir = (d: Decisao) => {
    setDecisao(d);
    setMensagem(d === "aprovado" ? MSG_APROVACAO_ENERGIA : MSG_RECUSA_ENERGIA);
  };

  const confirmar = async () => {
    if (!decisao || salvando) return;
    const texto = mensagem.trim();
    if (texto.length < 10) {
      toast.error("Escreva a mensagem informativa para o assessor.");
      return;
    }
    if (partner.contratoPrestacaoEnergiaAceitoEm) {
      toast.error("O contrato definitivo já foi assinado; a decisão não pode ser alterada.");
      return;
    }
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const registro = { status: decisao, data: agora, por: auth.currentUser?.email || "admin", mensagem: texto };
      const historico = Array.isArray(partner.avaliacaoEnergiaHistorico) ? partner.avaliacaoEnergiaHistorico : [];
      const updates = {
        avaliacaoEnergiaStatus: decisao,
        avaliacaoEnergiaData: agora,
        avaliacaoEnergiaPor: registro.por,
        avaliacaoEnergiaMensagem: texto,
        contratoPrestacaoLiberadoPorAdm: decisao === "aprovado",
        avaliacaoEnergiaHistorico: [...historico, registro].slice(-20),
      };
      await updateDoc(doc(db, "parceiros", partner.id), updates);
      onUpdated(updates);
      toast.success(decisao === "aprovado" ? "Assessor aprovado. Contrato liberado no portal dele." : "Recusa registrada e informada ao assessor.");
      setDecisao(null);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar a avaliação. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const assinado = et.etapa === "ativo";
  const jaDecidido = partner.avaliacaoEnergiaStatus === "aprovado" || partner.avaliacaoEnergiaStatus === "recusado";

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">⚡ Avaliação contratual do Assessor de Energia</h4>
      <div className="border border-slate-150 p-4 rounded-xl bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md border ${ETAPA_ENERGIA_TONE[et.etapa]}`}>{et.label}</span>
          {cap && <span className="text-[11px] text-slate-500">Termo inicial aceito em {fmt(cap)}</span>}
        </div>

        {cap && (
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
              <span>Período inicial</span>
              <span>{dias} de {DIAS_CAPACITACAO_ENERGIA} dias</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#00A86B]" style={{ width: `${(dias / DIAS_CAPACITACAO_ENERGIA) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Leads", meus.length], ["Contratos fechados", fechados.length], ["kWh negociado", kwh.toLocaleString("pt-BR")]].map(([k, v]) => (
            <div key={k as string} className="rounded-lg bg-slate-50 border border-slate-100 py-2">
              <p className="text-base font-black text-slate-900">{v as any}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">{k as string}</p>
            </div>
          ))}
        </div>

        {jaDecidido && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-600 space-y-1">
            <p>
              Decisão: <strong>{partner.avaliacaoEnergiaStatus === "aprovado" ? "APROVADO" : "RECUSADO"}</strong> por {partner.avaliacaoEnergiaPor || "-"} em {fmt(partner.avaliacaoEnergiaData)}
            </p>
            {partner.avaliacaoEnergiaMensagem && <p className="whitespace-pre-line text-slate-500">Mensagem: {partner.avaliacaoEnergiaMensagem}</p>}
          </div>
        )}

        {assinado ? (
          <p className="text-[11px] font-semibold text-emerald-700">Contrato definitivo assinado em {fmt(partner.contratoPrestacaoEnergiaAceitoEm)}.</p>
        ) : !cap ? (
          <p className="text-[11px] text-slate-500">O assessor ainda não aceitou o Termo de Capacitação. A avaliação fica disponível depois do aceite.</p>
        ) : decisao ? (
          <div className={`rounded-xl border p-3 space-y-2 ${decisao === "aprovado" ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
            <p className="text-xs font-extrabold text-slate-800">
              {decisao === "aprovado" ? "Aprovar e liberar o Contrato de Prestação de Serviços" : "Recusar a continuidade da parceria"}
            </p>
            <label className="text-[11px] font-bold text-slate-600 block">Mensagem que o assessor verá no portal</label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={5}
              maxLength={2000}
              className="w-full text-xs rounded-lg border border-slate-200 bg-white p-2 text-slate-800"
            />
            {et.etapa === "capacitacao" && decisao === "aprovado" && (
              <p className="text-[11px] font-semibold text-amber-800">Atenção: o período de {DIAS_CAPACITACAO_ENERGIA} dias ainda não terminou. A aprovação será antecipada.</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDecisao(null)} disabled={salvando} className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={salvando}
                className={`flex-1 py-2 rounded-lg text-xs font-black text-white cursor-pointer disabled:opacity-60 ${decisao === "aprovado" ? "bg-[#00A86B] hover:bg-[#008f5a]" : "bg-rose-600 hover:bg-rose-700"}`}
              >
                {salvando ? "Salvando..." : decisao === "aprovado" ? "Confirmar aprovação" : "Confirmar recusa"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={() => abrir("aprovado")} className="flex-1 py-2.5 rounded-xl bg-[#00A86B] hover:bg-[#008f5a] text-white text-xs font-black cursor-pointer">
              ✅ {partner.avaliacaoEnergiaStatus === "aprovado" ? "Reenviar aprovação" : "Aprovar e liberar contrato"}
            </button>
            <button type="button" onClick={() => abrir("recusado")} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer">
              ❌ {partner.avaliacaoEnergiaStatus === "recusado" ? "Atualizar recusa" : "Recusar continuidade"}
            </button>
          </div>
        )}
        {!assinado && jaDecidido && !decisao && (
          <p className="text-[10px] text-slate-400">Você pode alterar a decisão enquanto o assessor não assinar o contrato definitivo.</p>
        )}
      </div>
    </div>
  );
}
