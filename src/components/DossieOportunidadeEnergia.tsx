import { useEffect, useState } from "react";
import RaioXEnergeticoCard from "./RaioXEnergeticoCard";
import { calcularRaioXEnergetico } from "../lib/raioXEnergetico";
import { classificarPorte, NIVEIS } from "../lib/porteEmpresa";

/**
 * Snapshot da inteligência do Painel de Oportunidades gravado no lead solar
 * (campo `intelOportunidade`). Leads manuais/históricos não têm o campo e nada é exibido.
 */
export function montarIntelOportunidade(place: any) {
  const num = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    nome: place?.nome || "",
    categoria: place?.categoria || "",
    primaryType: place?.primaryType || "",
    types: Array.isArray(place?.types) ? place.types.slice(0, 20) : [],
    priceLevel: place?.priceLevel || "",
    avaliacoes: Number(place?.avaliacoes) || 0,
    nota: num(place?.nota),
    horasSemanais: num(place?.horasSemanais),
    diasSemana: num(place?.diasSemana),
    aberto24h: !!place?.aberto24h,
    lat: num(place?.lat),
    lng: num(place?.lng),
    estacionamento: !!place?.estacionamento,
    resumo: place?.resumo || "",
    fotoRef: place?.fotoRef || "",
    capturadoEm: new Date().toISOString(),
  };
}

export function resumoIntelOportunidade(intel: any) {
  if (!intel) return null;
  const r = calcularRaioXEnergetico(intel);
  return { faixa: r.faixa, kwhMin: r.kwhMin, kwhMax: r.kwhMax, porte: NIVEIS[classificarPorte(intel)].badge };
}

function FotoFachadaLead({ fotoRef, nome }: { fotoRef: string; nome: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let ativo = true;
    fetch(`/api/proxy/place-photo?name=${encodeURIComponent(fotoRef)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (ativo && d?.photoUri) setUrl(d.photoUri); else if (ativo) setFalhou(true); })
      .catch(() => { if (ativo) setFalhou(true); });
    return () => { ativo = false; };
  }, [fotoRef]);
  if (falhou) return null;
  return (
    <div className="relative h-[120px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      {url ? <img src={url} alt={`Fachada — ${nome}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full animate-pulse bg-slate-200" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      <span className="absolute bottom-1.5 left-2 text-[9px] font-black uppercase tracking-wider text-white">📸 Fachada · Google</span>
    </div>
  );
}

export default function DossieOportunidadeEnergia({ lead }: { lead: any }) {
  const intel = lead?.intelOportunidade;
  if (!intel) return null;
  const nome = lead.nomeEmpresa || intel.nome || "";
  const temCoord = typeof intel.lat === "number" && typeof intel.lng === "number";
  return (
    <div className="space-y-3">
      {intel.fotoRef && <FotoFachadaLead fotoRef={intel.fotoRef} nome={nome} />}
      {temCoord && (
        <div className="dossie-card space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">🛰️ Análise aérea do telhado</p>
          <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-100">
            <iframe
              title={`Satélite — ${nome}`}
              src={`https://maps.google.com/maps?q=${intel.lat},${intel.lng}&t=k&z=19&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
            <span className="text-slate-500">🔍 Foco no telhado</span>
            <a href={`https://earth.google.com/web/@${intel.lat},${intel.lng},60a,120d,35y,0h,0t,0r`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">↗ Ver no Google Earth 3D</a>
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-extrabold">
        <span className="px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700">{NIVEIS[classificarPorte(intel)].badge}</span>
        {intel.nota !== null && intel.nota !== undefined && (
          <span className="px-2 py-0.5 rounded-full border border-amber-100 bg-amber-50 text-amber-700">★ {Number(intel.nota).toFixed(1)} ({intel.avaliacoes})</span>
        )}
        {intel.estacionamento && (
          <span className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">🚗 Estacionamento próprio · Potencial Carport</span>
        )}
      </div>
      {intel.resumo && (
        <p className="bg-slate-50/80 border-l-2 border-emerald-500 rounded-r-lg px-2.5 py-1.5 text-xs text-slate-600 italic">{intel.resumo}</p>
      )}
      <div className="dossie-card">
        <RaioXEnergeticoCard place={intel} uf={lead.estado || intel.estado} />
      </div>
    </div>
  );
}
