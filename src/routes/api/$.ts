// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";

import { createExpressApp } from "../../lib/prosfec-server";

let appInstance: ReturnType<typeof createExpressApp> | null = null;

function getApp() {
  if (!appInstance) appInstance = createExpressApp();
  return appInstance;
}

// Nenhuma exceção pode vazar: o cliente sempre recebe JSON, nunca HTML.
const handle = async ({ request }: { request: Request }) => {
  try {
    return await getApp().handle(request);
  } catch (err: any) {
    console.error("[PROSFEC API] Falha não tratada na rota:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || "Erro interno no servidor. Tente novamente em instantes.",
      }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
};

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
