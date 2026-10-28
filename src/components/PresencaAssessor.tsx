import { useEffect, useRef, useState } from "react";
import { doc, setDoc, updateDoc, increment, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import {
  deveContar, diaPresenca, horaPresenca, dentroHorarioComercial, statusPresenca, formatarDuracao,
  PRESENCA_HEARTBEAT_MS, PRESENCA_INATIVIDADE_MS, PRESENCA_INICIO_HORA, PRESENCA_FIM_HORA,
} from "../lib/presenca";

/** Indicador + registro automático no portal do assessor. */
export function PresencaAssessorIndicador({ partnerId }: { partnerId: string }) {
  const [segHoje, setSegHoje] = useState(0);
  const [estado, setEstado] = useState<"ativo" | "ausente" | "fora">("ativo");
  const ultimaInteracao = useRef(Date.now());
  const pendente = useRef(0);
  const dia = useRef(diaPresenca());

  useEffect(() => {
    if (!partnerId) return;
    getDoc(doc(db, "parceiros", partnerId, "presenca_diaria", dia.current))
      .then(s => setSegHoje(Number(s.data()?.segundosAtivos || 0)))
      .catch(() => {});

    const marcar = () => { ultimaInteracao.current = Date.now(); };
    const evs = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];
    evs.forEach(e => window.addEventListener(e, marcar, { passive: true }));

    const flush = async (ativo: boolean) => {
      const seg = pendente.current;
      pendente.current = 0;
      const agora = new Date();
      const ref = doc(db, "parceiros", partnerId, "presenca_diaria", dia.current);
      try {
        if (seg > 0) {
          const snap = await getDoc(ref);
          const base: any = { segundosAtivos: increment(seg), ultimoRegistro: agora.toISOString(), ultimoRegistroHora: horaPresenca(agora), dia: dia.current };
          if (!snap.exists() || !snap.data()?.primeiroAcesso) {
            base.primeiroAcesso = agora.toISOString();
            base.primeiroAcessoHora = horaPresenca(new Date(agora.getTime() - seg * 1000));
          }
          await setDoc(ref, base, { merge: true });
        }
        await updateDoc(doc(db, "parceiros", partnerId), {
          presencaUltimoSinal: agora.toISOString(),
          presencaAtivo: ativo,
        });
      } catch {
        pendente.current += seg;
      }
    };

    const tick = setInterval(() => {
      const agora = new Date();
      const hoje = diaPresenca(agora);
      if (hoje !== dia.current) { flush(false); dia.current = hoje; setSegHoje(0); }
      const visivel = document.visibilityState === "visible";
      if (deveContar(agora, ultimaInteracao.current, visivel)) {
        pendente.current += 1;
        setSegHoje(s => s + 1);
        setEstado("ativo");
      } else if (!dentroHorarioComercial(agora)) {
        setEstado("fora");
      } else {
        setEstado("ausente");
      }
    }, 1000);

    const beat = setInterval(() => {
      const ativo = document.visibilityState === "visible"
        && Date.now() - ultimaInteracao.current < PRESENCA_INATIVIDADE_MS
        && dentroHorarioComercial();
      flush(ativo);
    }, PRESENCA_HEARTBEAT_MS);
    flush(dentroHorarioComercial());

    const aoOcultar = () => { if (document.visibilityState === "hidden") flush(false); };
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", aoOcultar);

    return () => {
      clearInterval(tick); clearInterval(beat);
      evs.forEach(e => window.removeEventListener(e, marcar));
      document.removeEventListener("visibilitychange", aoOcultar);
      window.removeEventListener("pagehide", aoOcultar);
      flush(false);
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
    offline: { dot: "bg-slate-400", txt: partner?.presencaUltimoSinal ? `Offline • último sinal ${new Date(partner.presencaUltimoSinal).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Offline" },
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
    getDocs(query(collection(db, "parceiros", partner.id, "presenca_diaria"), orderBy("dia", "desc"), limit(31)))
      .then(s => setDias(s.docs.map(d => ({ id: d.id, ...d.data() }))))
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
  const soma = (f: (d: any) => boolean) => dias.filter(f).reduce((a, d) => a + Number(d.segundosAtivos || 0), 0);
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
