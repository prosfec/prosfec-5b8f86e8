import { createFileRoute } from "@tanstack/react-router";

let app: import("@/lib/mini-express").MiniExpressApp | null = null;

async function handle({ request }: { request: Request }) {
  try {
    const { createExpressApp } = await import("@/lib/prosfec-server");
    if (!app) app = createExpressApp();
    return await app.handle(request);
  } catch {
    return Response.json({ error: "Atendimento indisponível. Tente novamente." }, { status: 503 });
  }
}
export const Route = createFileRoute("/api/public/lead-energia")({ server: { handlers: { GET: handle, POST: handle } } });