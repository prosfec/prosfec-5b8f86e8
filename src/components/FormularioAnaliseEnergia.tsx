import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { INTERESSES_ENERGIA, UFS, portalEnergiaSchema } from "@/lib/portalEnergia";

export type AssessorPublico = { id: string; nome: string; telefone: string };
export default function FormularioAnaliseEnergia({ referencia, onAssessor }: { referencia: string; onAssessor: (assessor: AssessorPublico | null) => void }) {
  const [challenge, setChallenge] = useState("");
  const requestId = useRef("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [preparando, setPreparando] = useState(true);
  const [protocolo, setProtocolo] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setPreparando(true); setChallenge(""); setErro(""); onAssessor(null);
    if (!requestId.current) requestId.current = crypto.randomUUID();
    fetch(`/api/public/lead-energia${referencia ? `?ref=${encodeURIComponent(referencia)}` : ""}`, { signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Atendimento indisponível."); return result; })
      .then(result => { setChallenge(result.challenge); onAssessor(result.assessor || null); })
      .catch(error => { if (!controller.signal.aborted) setErro(error.message || "Não foi possível preparar o atendimento."); else setErro("A conexão demorou. Tente novamente."); })
      .finally(() => { clearTimeout(timer); setPreparando(false); });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [referencia, tentativa, onAssessor]);
  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando || !challenge) return;
    const form = new FormData(event.currentTarget);
    const parsed = portalEnergiaSchema.safeParse({ ...Object.fromEntries(form), consentimento: form.get("consentimento") === "on", ref: referencia, requestId: requestId.current, challenge });
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message || "Confira os campos."); return; }
    setEnviando(true); setErro("");
    try {
      const response = await fetch("/api/public/lead-energia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Não foi possível registrar sua análise.");
      setProtocolo(result.protocolo);
    } catch (error) { setErro(error instanceof Error && error.name !== "TimeoutError" ? error.message : "A conexão demorou. Tente novamente; sua solicitação não será duplicada."); }
    finally { setEnviando(false); }
  }
  if (protocolo) return <div className="energy-confirmation" role="status"><CheckCircle2 size={42} /><h3>Sua análise foi solicitada.</h3><p>Recebemos suas informações para avaliar as possibilidades de energia para o seu perfil.</p><p className="energy-protocol">Protocolo: {protocolo}</p></div>;
  return <form onSubmit={enviar} className="energy-analysis-form">
    <div className="energy-form-grid">
      <label className="energy-form-full">Nome completo<input name="nome" autoComplete="name" required minLength={5} maxLength={120} placeholder="Seu nome e sobrenome" /></label>
      <label>Tipo de consumidor<select name="tipo" required defaultValue="PF"><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label>
      <label>WhatsApp com DDD<input name="telefone" type="tel" autoComplete="tel-national" required maxLength={18} placeholder="(98) 99999-9999" /></label>
      <label className="energy-form-full">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="voce@exemplo.com.br" /></label>
      <label>Estado<select name="estado" autoComplete="address-level1" defaultValue="" required><option value="" disabled>Selecione a UF</option>{UFS.map(uf => <option key={uf}>{uf}</option>)}</select></label>
      <label>Cidade<input name="cidade" autoComplete="address-level2" required minLength={2} maxLength={100} placeholder="Sua cidade" /></label>
      <label className="energy-form-full">Concessionária / Distribuidora<input name="concessionaria" required minLength={2} maxLength={100} placeholder="Distribuidora indicada na sua fatura" /></label>
      <label>Consumo médio mensal (kWh)<input name="consumoKwhMes" type="number" min="0.01" max="100000000" step="0.01" required placeholder="Ex.: 500" /></label>
      <label>Valor médio da conta (R$)<input name="mediaContaReais" type="number" min="0.01" max="100000000" step="0.01" required placeholder="Ex.: 600" /></label>
      <label className="energy-form-full">Modalidade de interesse<select name="interesse" defaultValue={INTERESSES_ENERGIA[4]} required>{INTERESSES_ENERGIA.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="energy-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="energy-consent"><input name="consentimento" type="checkbox" required /><span>Autorizo a PROSFEC Energy e o assessor vinculado, quando houver, a tratar estes dados para análise comercial e contato, conforme a LGPD.</span></label>
    {erro && <div className="energy-form-error" role="alert"><p>{erro}</p>{!challenge && !preparando && <Button type="button" variant="ghost" onClick={() => setTentativa(v => v + 1)}><RefreshCw />Tentar novamente</Button>}</div>}
    <Button type="submit" disabled={enviando || preparando || !challenge} className="energy-cta w-full h-12">{enviando || preparando ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}{enviando ? "Enviando solicitação…" : preparando ? "Preparando atendimento…" : "Solicitar análise comercial"}</Button>
    <p className="energy-form-disclaimer"><ShieldCheck size={15} />A solicitação não representa contratação nem garantia de economia.</p>
  </form>;
}