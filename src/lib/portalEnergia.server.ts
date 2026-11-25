import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { portalEnergiaSchema, referenciaEnergiaSchema, assessorEnergiaDisponivel, montarLeadPortalEnergia } from "./portalEnergia";
import type { MiniExpressApp } from "./mini-express";

type Store = {
  read: (path: string) => Promise<Record<string, unknown> | null>;
  create: (path: string, data: unknown) => Promise<void>;
  secret: () => string;
  upload?: (path: string, bytes: Uint8Array, contentType: string) => Promise<string>;
};
const FATURA_TIPOS: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const FATURA_MAX = 15 * 1024 * 1024;
function assinaturaValida(bytes: Uint8Array, tipo: string) {
  const h = Array.from(bytes.slice(0, 12));
  if (tipo === "application/pdf") return h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46;
  if (tipo === "image/jpeg") return h[0] === 0xff && h[1] === 0xd8;
  if (tipo === "image/png") return h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
  if (tipo === "image/webp") return h[0] === 0x52 && h[1] === 0x49 && h[8] === 0x57 && h[9] === 0x45;
  return false;
}
export function registrarPortalEnergia(app: MiniExpressApp, store: Store) {
  const tentativas = new Map<string, { inicio: number; total: number }>();
  const assinar = (texto: string) => {
    const secret = store.secret();
    if (!secret) throw new Error("Atendimento indisponível.");
    return createHmac("sha256", secret).update(`portal-energia:${texto}`).digest("hex");
  };
  app.get("/api/public/lead-energia", async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const timestamp = Date.now();
      const nonce = crypto.randomUUID();
      const payload = `${timestamp}.${nonce}`;
      const challenge = `${payload}.${assinar(payload)}`;
      let assessor = null;
      if (req.query?.ref) {
        const ref = referenciaEnergiaSchema.safeParse(req.query.ref);
        if (!ref.success) return res.status(400).json({ error: "Link de indicação inválido." });
        const partner = await store.read(`parceiros/${ref.data}`);
        if (!assessorEnergiaDisponivel(partner)) return res.status(404).json({ error: "Este link de assessor não está disponível. Solicite um link atualizado." });
        // Only the public-facing name/contact requested for the referral page.
        assessor = { id: ref.data, nome: String(partner?.["nome"] || "").slice(0, 120), telefone: String(partner?.["whatsapp"] || "").replace(/\D/g, "").slice(0, 13) };
      }
      return res.json({ challenge, assessor });
    } catch {
      return res.status(503).json({ error: "Não foi possível preparar o atendimento. Tente novamente." });
    }
  });
  app.post("/api/public/lead-energia", async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const origin = String(req.headers?.origin || "");
      const allowed = ["https://prosfec.com.br", "https://www.prosfec.com.br", "https://prosfec.lovable.app", "https://id-preview--aa418b68-b669-401a-9959-d84246bcbbb6.lovable.app", "http://localhost:8080"];
      if (!allowed.includes(origin)) return res.status(403).json({ error: "Envie sua solicitação pelo portal PROSFEC Energy." });
      if (String(req.rawBody || "").length > 21_000_000) return res.status(413).json({ error: "A conta anexada excede 15 MB." });
      const { fatura: faturaBruta, ...corpo } = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
      let fatura: { bytes: Uint8Array; tipo: string; nome: string } | null = null;
      if (faturaBruta != null) {
        const f = faturaBruta as Record<string, unknown>;
        const tipo = String(f["tipo"] || "");
        const base64 = String(f["base64"] || "");
        if (!FATURA_TIPOS[tipo] || !base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) return res.status(400).json({ error: "Envie a conta em PDF ou foto (JPG, PNG ou WEBP)." });
        let bytes: Uint8Array;
        try { bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)); } catch { return res.status(400).json({ error: "Não foi possível ler a conta anexada." }); }
        if (bytes.length > FATURA_MAX) return res.status(413).json({ error: "A conta anexada excede 15 MB." });
        if (!assinaturaValida(bytes, tipo)) return res.status(400).json({ error: "O arquivo anexado não é um PDF ou imagem válida." });
        fatura = { bytes, tipo, nome: String(f["nome"] || "conta-de-luz").replace(/[^\w.\- ]/g, "_").slice(0, 100) };
      }
      const parsed = portalEnergiaSchema.safeParse(corpo);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Confira os dados informados." });
      const data = parsed.data;
      const [timestamp, nonce, signature] = data.challenge.split(".");
      if (!timestamp || !nonce || !signature || !/^[a-f0-9]{64}$/.test(signature)) return res.status(403).json({ error: "Atualize a página para enviar sua solicitação." });
      const expected = assinar(`${timestamp}.${nonce}`);
      const valid = timingSafeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expected));
      const age = Date.now() - Number(timestamp);
      if (!valid || !Number.isFinite(age) || age < 1500 || age > 30 * 60 * 1000) return res.status(403).json({ error: "Atualize a página para renovar o atendimento." });
      const path = `leads_energia/portal_${data.requestId}`;
      const { challenge: _challenge, requestId: _requestId, ...identidade } = data;
      const hash = createHash("sha256").update(JSON.stringify(identidade)).digest("hex");
      const existing = await store.read(path);
      if (existing) {
        if (existing["portalFingerprint"] !== hash) return res.status(409).json({ error: "Esta solicitação já foi enviada. Atualize a página para iniciar outra." });
        return res.json({ ok: true, protocolo: `PE-${data.requestId.toUpperCase()}` });
      }
      const ip = String(req.headers?.["cf-connecting-ip"] || req.headers?.["x-forwarded-for"] || "local").split(",")[0] || "local";
      const now = Date.now();
      for (const [key, item] of tentativas) if (now - item.inicio > 600000) tentativas.delete(key);
      const entry = tentativas.get(ip) || { inicio: now, total: 0 };
      if (entry.total >= 5) return res.status(429).json({ error: "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente." });
      entry.total++; tentativas.set(ip, entry);
      const partner = data.ref ? await store.read(`parceiros/${data.ref}`) : null;
      if (data.ref && !assessorEnergiaDisponivel(partner)) return res.status(400).json({ error: "O assessor deste link não está disponível. Solicite um link atualizado." });
      const agoraIso = new Date(now).toISOString();
      const lead: Record<string, unknown> = montarLeadPortalEnergia(data, partner, agoraIso);
      if (fatura && store.upload) {
        try {
          const arquivo = `documentos_energia/portal_${data.requestId}/contaLuz_${now}.${FATURA_TIPOS[fatura.tipo]}`;
          const url = await store.upload(arquivo, fatura.bytes, fatura.tipo);
          lead["documentos"] = { contaLuz: { url, path: arquivo, nome: fatura.nome, tipo: fatura.tipo, enviadoEm: agoraIso } };
          lead["faturaAnexada"] = true;
          (lead["anotacoes"] as unknown[]).push({ texto: "⚡ Conta de luz anexada pelo cliente no site — pronto para cotação.", autor: "Portal PROSFEC Energy", papel: "sistema", automatica: true, data: agoraIso });
        } catch {
          lead["faturaAnexada"] = false;
          (lead["anotacoes"] as unknown[]).push({ texto: "Cliente tentou anexar a conta de luz, mas o arquivo não pôde ser salvo. Solicite pelo WhatsApp.", autor: "Portal PROSFEC Energy", papel: "sistema", automatica: true, data: agoraIso });
        }
      } else lead["faturaAnexada"] = false;
      try {
        await store.create(path, { ...lead, portalFingerprint: hash });
      } catch (error) {
        const duplicate = await store.read(path);
        if (duplicate?.["portalFingerprint"] !== hash) throw error;
      }
      return res.json({ ok: true, protocolo: `PE-${data.requestId.toUpperCase()}` });
    } catch {
      return res.status(503).json({ error: "Não foi possível registrar sua análise agora. Seus dados continuam na tela; tente novamente." });
    }
  });
}