#!/usr/bin/env node
/**
 * Local dev/verification server.
 *
 * Serves the built worker over plain Node HTTP with a SQLite-backed D1 stand-in,
 * so the whole app — page render, client bundle, API routes, database — can be
 * exercised in a real browser without deploying. The prototype had no way to run
 * locally at all; every change had to be verified in production.
 *
 *   node scripts/build.mjs && node scripts/dev-server.mjs [--port 8787] [--fixtures]
 */
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FakeD1 } from "../test/fake-d1.mjs";
import { REGISTRY_FIXTURES } from "../test/fixtures/registry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const portFlag = process.argv.indexOf("--port");
const port = portFlag > -1 ? Number(process.argv[portFlag + 1]) : 8787;

const worker = (await import(join(root, "dist/server/index.js"))).default;
const db = new FakeD1();

// --fixtures serves canned source payloads instead of calling the six real
// gateways, so the registry views can be developed and checked offline.
if (process.argv.includes("--fixtures")) {
  globalThis.fetch = async (target) => {
    const url = String(target);
    const match = Object.entries(REGISTRY_FIXTURES).find(([fragment]) => url.includes(fragment));
    if (!match) return new Response("no fixture for this URL", { status: 404 });
    return new Response(JSON.stringify(match[1]), { status: 200, headers: { "content-type": "application/json" } });
  };
  console.log("Using registry fixtures — no third-party sources will be contacted.");
}

const server = createServer(async (incoming, outgoing) => {
  const url = `http://localhost:${port}${incoming.url}`;
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  try {
    const response = await worker.fetch(
      new Request(url, { method: incoming.method, headers: incoming.headers, body }),
      {
        DB: db,
        AUTH_REQUIRED: process.env.AUTH_REQUIRED,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
        SUPABASE_GOOGLE_ENABLED: process.env.SUPABASE_GOOGLE_ENABLED,
        CLAIM_LEGACY_PLANS: process.env.CLAIM_LEGACY_PLANS,
      },
    );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "text/plain" });
    outgoing.end(String(error?.stack ?? error));
  }
});

server.listen(port, () => console.log(`Serving dist/server/index.js on http://localhost:${port}`));
