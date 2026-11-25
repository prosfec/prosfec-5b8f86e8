import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { portalEnergiaSchema, referenciaEnergiaSchema, assessorEnergiaDisponivel, montarLeadPortalEnergia } from "./portalEnergia";
import type { MiniExpressApp } from "./mini-express";

type Store = {
  read: (path: string) => Promise<Record<string, unknown> | null>;
  create: (path: string, data: unknown) => Promise<void>;
  secret: () => string;
};
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
      if (String(req.rawBody || "").length > 12000) return res.status(413).json({ error: "Solicitação muito grande." });
      const parsed = portalEnergiaSchema.safeParse(req.body);
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
      const lead = montarLeadPortalEnergia(data, partner, new Date(now).toISOString());
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