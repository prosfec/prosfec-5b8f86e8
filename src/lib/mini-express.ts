// Minimal Express-compatible shim so the original PROSFEC Express API can run
// unchanged on the edge runtime. Supports the subset used by server.ts:
// app.use(mw), app.get/post/put/delete(path, handler), express.json(),
// req.url/body/query/params/headers, res.status().json()/send()/end().

type Handler = (req: any, res: any, next: (err?: any) => void) => any;

interface Layer {
  method: string | null;
  path: string | null;
  handler: Handler;
}

export interface MiniExpressApp {
  use: (a: any, b?: any) => void;
  get: (path: string, handler: Handler) => void;
  post: (path: string, handler: Handler) => void;
  put: (path: string, handler: Handler) => void;
  patch: (path: string, handler: Handler) => void;
  delete: (path: string, handler: Handler) => void;
  listen: (...args: any[]) => void;
  handle: (request: Request) => Promise<Response>;
}

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  if (pattern === "*") return {};
  const pParts = pattern.split("/").filter(Boolean);
  const uParts = pathname.split("/").filter(Boolean);
  if (pattern.endsWith("*")) {
    // e.g. /api/*
    const base = pParts.slice(0, -1);
    if (uParts.length < base.length) return null;
    for (let i = 0; i < base.length; i++) if (base[i] !== uParts[i]) return null;
    return {};
  }
  if (pParts.length !== uParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    const p = pParts[i]!;
    const u = uParts[i]!;
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(u);
    else if (p !== u) return null;
  }
  return params;
}

export function createApp(): MiniExpressApp {
  const layers: Layer[] = [];

  const add = (method: string | null, path: string | null, handler: Handler) => {
    layers.push({ method, path, handler });
  };

  const app: MiniExpressApp = {
    use: (a: any, b?: any) => {
      if (typeof a === "function") add(null, null, a);
      else add(null, typeof a === "string" ? (a.endsWith("*") ? a : a + "*") : null, b);
    },
    get: (path, handler) => add("GET", path, handler),
    post: (path, handler) => add("POST", path, handler),
    put: (path, handler) => add("PUT", path, handler),
    patch: (path, handler) => add("PATCH", path, handler),
    delete: (path, handler) => add("DELETE", path, handler),
    listen: () => {
      /* no-op on the edge runtime */
    },
    handle: async (request: Request) => {
      const url = new URL(request.url);
      const rawBody = ["GET", "HEAD"].includes(request.method) ? "" : await request.text();

      const headers: Record<string, any> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
        headers[key.toLowerCase()] = value;
      });

      const query: Record<string, any> = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      const req: any = {
        method: request.method,
        url: url.pathname + url.search,
        originalUrl: url.pathname + url.search,
        path: url.pathname,
        headers,
        query,
        params: {},
        get: (name: string) => headers[name.toLowerCase()],
        body: undefined,
        rawBody,
      };

      let resolveResponse: (r: Response) => void;
      const responsePromise = new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });
      let finished = false;
      let statusCode = 200;
      const resHeaders = new Headers();

      const finish = (body: BodyInit | null, contentType?: string) => {
        if (finished) return res;
        finished = true;
        if (contentType && !resHeaders.has("content-type")) {
          resHeaders.set("content-type", contentType);
        }
        resolveResponse(new Response(body, { status: statusCode, headers: resHeaders }));
        return res;
      };

      const res: any = {
        status(code: number) {
          statusCode = code;
          return res;
        },
        set(name: string, value: string) {
          resHeaders.set(name, value);
          return res;
        },
        setHeader(name: string, value: string) {
          resHeaders.set(name, value);
          return res;
        },
        type(value: string) {
          resHeaders.set("content-type", value);
          return res;
        },
        json(payload: any) {
          return finish(JSON.stringify(payload), "application/json; charset=utf-8");
        },
        send(payload: any) {
          if (payload === undefined || payload === null) return finish(null);
          if (typeof payload === "object") return res.json(payload);
          return finish(String(payload), "text/html; charset=utf-8");
        },
        end(payload?: any) {
          return finish(payload ?? null);
        },
        sendStatus(code: number) {
          statusCode = code;
          return finish(String(code), "text/plain; charset=utf-8");
        },
        redirect(location: string) {
          statusCode = 302;
          resHeaders.set("location", location);
          return finish(null);
        },
        sendFile() {
          statusCode = 404;
          return finish("Not found", "text/plain; charset=utf-8");
        },
        get headersSent() {
          return finished;
        },
      };

      const run = async (index: number): Promise<void> => {
        if (finished) return;
        const layer = layers[index];
        if (!layer) {
          if (!finished) {
            statusCode = 404;
            finish(JSON.stringify({ error: "Not found" }), "application/json; charset=utf-8");
          }
          return;
        }

        const pathname = new URL(req.url, url.origin).pathname;
        if (layer.method && layer.method !== req.method) return run(index + 1);
        if (layer.path) {
          const params = matchPath(layer.path, pathname);
          if (!params) return run(index + 1);
          req.params = params;
        }

        let advanced = false;
        const next = (err?: any) => {
          if (advanced) return;
          advanced = true;
          if (err) {
            console.error(err);
            statusCode = 500;
            finish(
              JSON.stringify({ error: err?.message || "Internal error" }),
              "application/json; charset=utf-8",
            );
            return;
          }
          void run(index + 1);
        };

        try {
          await layer.handler(req, res, next);
        } catch (err: any) {
          console.error(err);
          if (!finished) {
            statusCode = 500;
            finish(
              JSON.stringify({ error: err?.message || "Internal error" }),
              "application/json; charset=utf-8",
            );
          }
          return;
        }

        // Middleware that neither responded nor called next() (e.g. sync mw)
        if (!finished && !advanced && !layer.method) next();
      };

      void run(0);
      return responsePromise;
    },
  };

  return app;
}

export const express: any = Object.assign(() => createApp(), {
  json:
    () =>
    (req: any, _res: any, next: (err?: any) => void) => {
      const contentType = (req.headers["content-type"] || "") as string;
      if (req.rawBody && contentType.includes("application/json")) {
        try {
          req.body = JSON.parse(req.rawBody);
        } catch {
          req.body = {};
        }
      } else if (req.rawBody && contentType.includes("application/x-www-form-urlencoded")) {
        req.body = Object.fromEntries(new URLSearchParams(req.rawBody));
      } else {
        req.body = req.body ?? {};
      }
      next();
    },
  urlencoded: () => (req: any, _res: any, next: (err?: any) => void) => {
    if (req.rawBody) req.body = Object.fromEntries(new URLSearchParams(req.rawBody));
    next();
  },
  static: () => (_req: any, _res: any, next: (err?: any) => void) => next(),
});

export default express;
