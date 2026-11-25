import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Loader2, ShieldCheck, RefreshCw, Paperclip, X } from "lucide-react";
import { Button } from "./ui/button";
import { INTERESSES_ENERGIA, UFS, portalEnergiaSchema } from "@/lib/portalEnergia";

const TIPOS_FATURA: Record<string, true> = { "application/pdf": true, "image/jpeg": true, "image/png": true, "image/webp": true };
const EXT_FATURA: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export type AssessorPublico = { id: string; nome: string; telefone: string };
export default function FormularioAnaliseEnergia({ referencia, onAssessor }: { referencia: string; onAssessor: (assessor: AssessorPublico | null) => void }) {
  const [challenge, setChallenge] = useState("");
  const requestId = useRef("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [preparando, setPreparando] = useState(true);
  const [protocolo, setProtocolo] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [fatura, setFatura] = useState<File | null>(null);
  const faturaInput = useRef<HTMLInputElement>(null);
  function escolherFatura(file?: File) {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const tipo = TIPOS_FATURA[file.type] ? file.type : EXT_FATURA[ext] || "";
    if (!tipo) { setErro("Anexe a conta em PDF ou foto (JPG, PNG ou WEBP). Fotos HEIC do iPhone precisam ser convertidas para JPG."); if (faturaInput.current) faturaInput.current.value = ""; return; }
    if (file.size > 15 * 1024 * 1024) { setErro("A conta anexada excede 15 MB."); if (faturaInput.current) faturaInput.current.value = ""; return; }
    setErro(""); setFatura(file);
  }
  function removerFatura() { setFatura(null); if (faturaInput.current) faturaInput.current.value = ""; }
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
    form.delete("fatura");
    const parsed = portalEnergiaSchema.safeParse({ ...Object.fromEntries(form), consentimento: form.get("consentimento") === "on", ref: referencia, requestId: requestId.current, challenge });
    if (!parsed.success) { setErro(parsed.error.issues[0]?.message || "Confira os campos."); return; }
    setEnviando(true); setErro("");
    try {
      let anexo: { nome: string; tipo: string; base64: string } | undefined;
      if (fatura) {
        const ext = (fatura.name.split(".").pop() || "").toLowerCase();
        const tipo = TIPOS_FATURA[fatura.type] ? fatura.type : EXT_FATURA[ext] || "";
        const buf = new Uint8Array(await fatura.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        anexo = { nome: fatura.name.slice(0, 100), tipo, base64: btoa(bin) };
      }
      const response = await fetch("/api/public/lead-energia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(anexo ? { ...parsed.data, fatura: anexo } : parsed.data), signal: AbortSignal.timeout(fatura ? 90000 : 25000) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Não foi possível registrar sua análise.");
      setProtocolo(result.protocolo);
    } catch (error) { setErro(error instanceof Error && error.name !== "TimeoutError" ? error.message : "A conexão demorou. Tente novamente; sua solicitação não será duplicada."); }
    finally { setEnviando(false); }
  }
  if (protocolo) return <div className="energy-confirmation" role="status"><CheckCircle2 size={42} /><h3>Sua análise foi solicitada.</h3><p>Recebemos suas informações para avaliar as possibilidades de energia para o seu perfil.</p><p className="energy-protocol">Protocolo: {protocolo}</p></div>;
  return <form onSubmit={enviar} className="energy-analysis-form">
    <div className="energy-form-grid">
      <p className="energy-form-full energy-form-group"><span>01</span>Identificação e contato</p>
      <label className="energy-form-full">Nome completo<input name="nome" autoComplete="name" required minLength={5} maxLength={120} placeholder="Seu nome e sobrenome" /></label>
      <label>Tipo de consumidor<select name="tipo" required defaultValue="PF"><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label>
      <label>WhatsApp com DDD<input name="telefone" type="tel" autoComplete="tel-national" required maxLength={18} placeholder="(98) 99999-9999" /></label>
      <label className="energy-form-full">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="voce@exemplo.com.br" /></label>
      <p className="energy-form-full energy-form-group"><span>02</span>Localização e distribuidora</p>
      <label>Estado<select name="estado" autoComplete="off" defaultValue="" required><option value="">Selecione o estado</option>{UFS.map(uf => <option key={uf}>{uf}</option>)}</select></label>
      <label>Cidade<input name="cidade" autoComplete="address-level2" required minLength={2} maxLength={100} placeholder="Sua cidade" /></label>
      <label className="energy-form-full">Concessionária / Distribuidora<input name="concessionaria" required minLength={2} maxLength={100} placeholder="Distribuidora indicada na sua fatura" /></label>
      <p className="energy-form-full energy-form-group"><span>03</span>Consumo e fatura</p>
      <label>Consumo médio mensal (kWh)<input name="consumoKwhMes" type="number" min="0.01" max="100000000" step="0.01" required placeholder="Ex.: 500" /></label>
      <label>Valor médio da conta (R$)<input name="mediaContaReais" type="number" min="0.01" max="100000000" step="0.01" required placeholder="Ex.: 600" /></label>
      <div className="energy-form-full energy-fatura">
        <span className="energy-fatura-titulo"><Paperclip size={16} />Conta de luz <em>(opcional — recomendado)</em></span>
        <p className="energy-fatura-ajuda">Anexe sua conta de luz (PDF ou foto) para receber seu estudo comparativo com prioridade. Se não tiver em mãos agora, envie assim mesmo: nossa equipe solicita pelo WhatsApp.</p>
        <input ref={faturaInput} id="fatura-energia" name="fatura" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={e => escolherFatura(e.target.files?.[0])} />
        {fatura ? <div className="energy-fatura-arquivo"><span>{fatura.name} · {(fatura.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={removerFatura} aria-label="Remover conta anexada"><X size={16} /></button></div>
          : <label htmlFor="fatura-energia" className="energy-fatura-botao">Selecionar PDF ou foto (até 15 MB)</label>}
      </div>
      <label className="energy-form-full">Modalidade de interesse<select name="interesse" defaultValue={INTERESSES_ENERGIA[4]} required>{INTERESSES_ENERGIA.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="energy-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="energy-consent"><input name="consentimento" type="checkbox" required /><span>Autorizo a PROSFEC Energy e o assessor vinculado, quando houver, a tratar estes dados para análise comercial e contato, conforme a LGPD.</span></label>
    {erro && <div className="energy-form-error" role="alert"><p>{erro}</p>{!challenge && !preparando && <Button type="button" variant="ghost" onClick={() => setTentativa(v => v + 1)}><RefreshCw />Tentar novamente</Button>}</div>}
    <Button type="submit" disabled={enviando || preparando || !challenge} className="energy-cta w-full h-12">{enviando || preparando ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}{enviando ? "Enviando solicitação…" : preparando ? "Preparando atendimento…" : "Solicitar análise comercial"}</Button>
    <p className="energy-form-disclaimer"><ShieldCheck size={15} />A solicitação não representa contratação nem garantia de economia.</p>
  </form>;
}