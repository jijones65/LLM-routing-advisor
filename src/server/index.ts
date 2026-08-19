import { getCatalog } from "./db/repo.js";
import type { D1Database } from "./db/index.js";
import {
  auditRoute,
  blueprintRoute,
  blueprintsRoute,
  candidatesRoute,
  catalogRoute,
  conceptPaperRoute,
  conceptPaperTemplateRoute,
  registriesRoute,
} from "./routes/api.js";
import { renderPage } from "./render/page.js";

/** Bindings the worker expects. `DB` matches `.openai/hosting.json`. */
export interface Env {
  readonly DB?: D1Database;
}

/**
 * Route table.
 *
 * A flat lookup rather than a chain of `if (pathname === ...)`: adding a route is
 * one entry, and every route is visible in one place, which the prototype's
 * inline chain inside `fetch` was not.
 */
const ROUTES: Record<string, (request: Request, url: URL, env: Env) => Promise<Response>> = {
  "/api/catalog": async (request, _url, env) => {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    return catalogRoute(env.DB);
  },
  "/api/audit": async (request, url, env) => {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    return auditRoute(url, env.DB);
  },
  "/api/registries": async (request, url, env) => {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    return registriesRoute(url, env.DB);
  },
  "/api/registry-candidates": async (request, url, env) => {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    return candidatesRoute(url, env.DB);
  },
  "/api/blueprints": async (request, _url, env) => blueprintsRoute(request, env.DB),
  "/api/concept-paper": async (request) => conceptPaperRoute(request),
  "/api/concept-paper-template": async (request) => conceptPaperTemplateRoute(request),
  "/api/health": async () =>
    new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    }),
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const route = ROUTES[url.pathname];
    if (route) {
      try {
        return await route(request, url, env);
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }
    }

    if (url.pathname.startsWith("/api/blueprints/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length === 3 || (parts.length === 4 && parts[3] === "markdown")) {
        try {
          return await blueprintRoute(request, env.DB, decodeURIComponent(parts[2]), parts[3] === "markdown");
        } catch (error) {
          return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        }
      }
    }

    if (url.pathname !== "/") return new Response("Not found", { status: 404 });

    // The page renders from the bundled catalogue even when storage is down, so
    // planning an application never depends on the database being reachable.
    const { models } = await getCatalog(env.DB);
    return new Response(renderPage(models), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
    });
  },
};
