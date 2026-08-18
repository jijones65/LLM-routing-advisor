#!/usr/bin/env node
/**
 * Build the deployable artefact.
 *
 * Produces exactly what the prototype's shell script produced — a single ES
 * module at `dist/server/index.js` plus the hosting manifest and migrations —
 * so the existing OpenAI Sites deployment is unaffected. The difference is that
 * the single file is now generated from a source tree rather than being the
 * source tree.
 *
 * Three passes:
 *   1. bundle the client into one IIFE-free ES module string;
 *   2. read the stylesheet;
 *   3. bundle the worker, substituting both into `page.ts` as string literals.
 *
 * The client is bundled first because the worker embeds it. Both are minified —
 * they ship inside an HTML response on every request.
 */
import { build } from "esbuild";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const shared = {
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "browser",
  legalComments: "none",
  logLevel: "warning",
};

async function bundleClient() {
  const result = await build({
    ...shared,
    entryPoints: [join(root, "src/client/main.ts")],
    write: false,
    minify: true,
  });
  return result.outputFiles[0].text;
}

async function bundleWorker(clientCode, styles) {
  await build({
    ...shared,
    entryPoints: [join(root, "src/server/index.ts")],
    outfile: join(dist, "server/index.js"),
    minify: false,
    define: {
      __CLIENT__: JSON.stringify(clientCode),
      __STYLES__: JSON.stringify(styles),
    },
  });
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(join(dist, "server"), { recursive: true });
  await mkdir(join(dist, ".openai/drizzle"), { recursive: true });

  const styles = await readFile(join(root, "src/client/styles.css"), "utf8");
  // Whitespace-only minification: enough to matter over the wire, and it keeps
  // the stylesheet greppable in a served page when debugging a layout problem.
  const compactStyles = styles
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();

  const clientCode = await bundleClient();
  await bundleWorker(clientCode, compactStyles);

  await cp(join(root, ".openai/hosting.json"), join(dist, ".openai/hosting.json"));
  await cp(join(root, "migrations"), join(dist, ".openai/drizzle"), { recursive: true });

  const { size } = await stat(join(dist, "server/index.js"));
  const report = {
    worker: `${(size / 1024).toFixed(1)} KB`,
    clientBundle: `${(clientCode.length / 1024).toFixed(1)} KB`,
    styles: `${(compactStyles.length / 1024).toFixed(1)} KB`,
  };
  await writeFile(join(dist, "build-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Built dist/server/index.js — worker ${report.worker}, client ${report.clientBundle}, css ${report.styles}`,
  );
}

await main();
