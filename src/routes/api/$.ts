// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";

import { createExpressApp } from "../../lib/prosfec-server";

let appInstance: ReturnType<typeof createExpressApp> | null = null;

function getApp() {
  if (!appInstance) appInstance = createExpressApp();
  return appInstance;
}

const handle = ({ request }: { request: Request }) => getApp().handle(request);

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
