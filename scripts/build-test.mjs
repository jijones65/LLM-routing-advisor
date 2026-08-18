#!/usr/bin/env node
/**
 * Compile the source tree to plain ES modules under `build/` so the test suite
 * can import individual modules directly.
 *
 * Kept separate from `build.mjs`: the deployable artefact is one bundled file,
 * which is the wrong shape for unit tests. `page.ts` is stubbed here because its
 * `__STYLES__` / `__CLIENT__` placeholders are only defined by the real bundle.
 */
import { build } from "esbuild";
import { glob } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entryPoints = [];
for await (const file of glob("src/**/*.ts", { cwd: root })) entryPoints.push(join(root, file));

await build({
  entryPoints,
  outdir: join(root, "build"),
  outbase: join(root, "src"),
  format: "esm",
  target: "es2022",
  platform: "neutral",
  bundle: false,
  logLevel: "warning",
  define: { __STYLES__: '"/* styles omitted in test build */"', __CLIENT__: '""' },
});
console.log(`Compiled ${entryPoints.length} modules to build/`);
