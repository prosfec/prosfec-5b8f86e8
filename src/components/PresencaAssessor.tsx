import { useEffect, useRef, useState } from "react";
import { doc, getDoc, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  deveContar, diaPresenca, horaPresenca, dentroHorarioComercial, statusPresenca, formatarDuracao,
  segundosValidos, somarComTeto, deveLiderar, type LiderAba,
  PRESENCA_HEARTBEAT_MS, PRESENCA_INATIVIDADE_MS, PRESENCA_INICIO_HORA, PRESENCA_FIM_HORA,
} from "../lib/presenca";

function lerJSON<T>(k: string): T | null {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}

/** Indicador + registro automático no portal do assessor. */
export function PresencaAssessorIndicador({ partnerId }: { partnerId: string }) {
  const [segHoje, setSegHoje] = useState(0);
  const [estado, setEstado] = useState<"ativo" | "ausente" | "fora">("ativo");
  const ultimaInteracao = useRef(Date.now());
  const pendente = useRef(0);
  const dia = useRef(diaPresenca());

  useEffect(() => {
    if (!partnerId) return;
    const partnerRef = doc(db, "parceiros", partnerId);
    const abaId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const kLider = `prosfec_presenca_lider_${partnerId}`;
    const kInter = `prosfec_presenca_interacao_${partnerId}`;
    let lider = false;
    let ultimaGravInter = 0;
    let enviando = false;

    getDoc(partnerRef)
      .then(s => setSegHoje(segundosValidos(s.data()?.presencaDias?.[dia.current])))
      .catch(() => {});

    // Interação em qualquer aba conta para a aba líder (compartilhada via localStorage).
    const marcar = () => {
      const t = Date.now();
      ultimaInteracao.current = t;
      if (t - ultimaGravInter > 1000) {
        ultimaGravInter = t;
        try { localStorage.setItem(kInter, String(t)); } catch { /* ignore */ }
      }
    };
    const evs = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];
    evs.forEach(e => window.addEventListener(e, marcar, { passive: true }));
    const interacaoGlobal = () => Math.max(ultimaInteracao.current, Number(localStorage.getItem(kInter) || 0));

    // Grava em transação: primeiro acesso e teto físico garantidos no próprio registro.
    const flush = async (ativo: boolean) => {
      if (enviando) return;
      const seg = pendente.current;
      if (!lider && seg === 0) return; // abas seguidoras não escrevem nada
      pendente.current = 0;
      enviando = true;
      const agora = new Date();
      const agoraIso = agora.toISOString();
      const diaK = dia.current;
      try {
        const total = await runTransaction(db, async tx => {
          const snap = await tx.get(partnerRef);
          const reg = snap.data()?.presencaDias?.[diaK] || {};
          const upd: Record<string, unknown> = { presencaUltimoSinal: agoraIso, presencaAtivo: ativo };
          let atual = segundosValidos(reg);
          if (seg > 0) {
            const k = `presencaDias.${diaK}`;
            let primeiro = reg.primeiroAcesso as string | undefined;
            if (!primeiro) {
              const ini = new Date(agora.getTime() - seg * 1000);
              primeiro = ini.toISOString();
              upd[`${k}.primeiroAcesso`] = primeiro;
              upd[`${k}.primeiroAcessoHora`] = horaPresenca(ini);
            }
            atual = somarComTeto(atual, seg, primeiro, agoraIso);
            upd[`${k}.dia`] = diaK;
            upd[`${k}.segundosAtivos`] = atual;
            upd[`${k}.ultimoRegistro`] = agoraIso;
            upd[`${k}.ultimoRegistroHora`] = horaPresenca(agora);
          }
          tx.update(partnerRef, upd);
          return atual;
        });
        if (diaK === dia.current) setSegHoje(total + pendente.current);
      } catch {
        pendente.current += seg;
      } finally {
        enviando = false;
      }
    };

    const tick = setInterval(() => {
      const agora = new Date();
      const hoje = diaPresenca(agora);
      if (hoje !== dia.current) { flush(false); dia.current = hoje; setSegHoje(0); }
      const visivel = document.visibilityState === "visible";
      const eraLider = lider;
      lider = deveLiderar(lerJSON<LiderAba>(kLider), abaId, visivel, agora.getTime());
      if (lider) {
        try { localStorage.setItem(kLider, JSON.stringify({ id: abaId, ts: agora.getTime(), visivel })); } catch { /* ignore */ }
      } else if (eraLider) {
        flush(false);
      }
      const ativoGlobal = agora.getTime() - interacaoGlobal() < PRESENCA_INATIVIDADE_MS;
      if (lider && deveContar(agora, interacaoGlobal(), visivel)) {
        pendente.current += 1;
        setSegHoje(s => s + 1);
        setEstado("ativo");
      } else if (!dentroHorarioComercial(agora)) {
        setEstado("fora");
      } else {
        setEstado(ativoGlobal && (visivel || !lider) ? "ativo" : "ausente");
      }
    }, 1000);

    const beat = setInterval(() => {
      if (!lider) return;
      const ativo = document.visibilityState === "visible"
        && Date.now() - interacaoGlobal() < PRESENCA_INATIVIDADE_MS
        && dentroHorarioComercial();
      flush(ativo);
    }, PRESENCA_HEARTBEAT_MS);

    const aoOcultar = () => { if (document.visibilityState === "hidden") flush(false); };
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", aoOcultar);

    return () => {
      clearInterval(tick); clearInterval(beat);
      evs.forEach(e => window.removeEventListener(e, marcar));
      document.removeEventListener("visibilitychange", aoOcultar);
      window.removeEventListener("pagehide", aoOcultar);
      flush(false);
      try { if (lerJSON<LiderAba>(kLider)?.id === abaId) localStorage.removeItem(kLider); } catch { /* ignore */ }
    };
  }, [partnerId]);

  const cfg = estado === "ativo"
    ? { dot: "bg-emerald-500", txt: `Em Operação • ${formatarDuracao(segHoje)} hoje` }
    : estado === "ausente"
      ? { dot: "bg-amber-400", txt: `Ausente • ${formatarDuracao(segHoje)} hoje` }
      : { dot: "bg-slate-400", txt: `Fora do horário (Seg a Sex, ${String(PRESENCA_INICIO_HORA).padStart(2, "0")}h às ${PRESENCA_FIM_HORA}h) • ${formatarDuracao(segHoje)} hoje` };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold text-slate-800">
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.txt}
    </div>
  );
}

/** Bolinha de status para o card do parceiro no ADM. */
export function PresencaStatusBadge({ partner }: { partner: any }) {
  const st = statusPresenca(partner?.presencaUltimoSinal, partner?.presencaAtivo);
  const map = {
    online: { dot: "bg-emerald-500", txt: "Online agora" },
    ausente: { dot: "bg-amber-400", txt: "Ausente" },
    offline: { dot: "bg-slate-400", txt: "Offline" },
  }[st];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
      <span className={`h-2 w-2 rounded-full ${map.dot}`} /> {map.txt}
    </span>
  );
}

/** Bloco completo de presença dentro de "Abrir Operação". */
export function AdminPresencaAssessor({ partner }: { partner: any }) {
  const [dias, setDias] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!partner?.id) return;
    setCarregando(true);
    getDoc(doc(db, "parceiros", partner.id))
      .then(s => {
        const mapa = s.data()?.presencaDias || {};
        const lista = Object.entries(mapa)
          .map(([k, v]: [string, any]) => ({ id: k, dia: k, ...v }))
          .sort((a, b) => (a.dia < b.dia ? 1 : -1))
          .slice(0, 31);
        setDias(lista);
      })
      .catch(() => setDias([]))
      .finally(() => setCarregando(false));
  }, [partner?.id]);

  const hoje = diaPresenca();
  const agora = new Date();
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(agora);
  const dow = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(wd) + 1;
  const inicioSemana = new Date(agora.getTime() - (dow - 1) * 86400000);
  const chaveSemana = diaPresenca(inicioSemana);
  const mes = hoje.slice(0, 7);
  const soma = (f: (d: any) => boolean) => dias.filter(f).reduce((a, d) => a + segundosValidos(d), 0);
  const segHoje = soma(d => d.dia === hoje);
  const segSemana = soma(d => d.dia >= chaveSemana);
  const segMes = soma(d => String(d.dia).startsWith(mes));
  const registroHoje = dias.find(d => d.dia === hoje);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">⏱️ Controle de Horas (Seg a Sex, 08h às 18h)</h4>
        <PresencaStatusBadge partner={partner} />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {[
          ["Primeiro acesso hoje", registroHoje?.primeiroAcessoHora || "—"],
          ["Último registro", registroHoje?.ultimoRegistroHora || "—"],
          ["Tempo ativo hoje", formatarDuracao(segHoje)],
          ["Semana", formatarDuracao(segSemana)],
          ["Mês", formatarDuracao(segMes)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[10px] font-bold uppercase text-slate-500">{l}</p>
            <p className="text-sm font-extrabold text-slate-900">{v}</p>
          </div>
        ))}
      </div>
      <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr><th className="p-2 text-left">Data</th><th className="p-2">Primeiro acesso</th><th className="p-2">Último registro</th><th className="p-2">Tempo efetivo</th></tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={4} className="p-3 text-center text-slate-500">Carregando…</td></tr>}
            {!carregando && dias.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-slate-500">Sem atividade registrada ainda.</td></tr>}
            {dias.map(d => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="p-2 font-semibold">{String(d.dia).split("-").reverse().join("/")}</td>
                <td className="p-2 text-center">{d.primeiroAcessoHora || "—"}</td>
                <td className="p-2 text-center">{d.ultimoRegistroHora || "—"}</td>
                <td className="p-2 text-center font-bold">{formatarDuracao(d.segundosAtivos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
