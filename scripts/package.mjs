#!/usr/bin/env node
/**
 * Package `dist/` as `site.tar.gz` for upload to the OpenAI Sites project.
 *
 * The prototype's repo had no deploy step in it — `site.tar.gz` appeared only in
 * `.gitignore`, which means the artefact was built and uploaded by hand and the
 * exact contents were never reproducible. This makes it one command.
 *
 * Sites expects the worker at `dist/server/index.js` and the hosting manifest at
 * `.openai/hosting.json`. The build already produces both under `dist/`; this
 * archive preserves the worker prefix while placing the manifest at its root.
 *
 *   npm run package
 */
import { execFile } from "node:child_process";
import { access, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const archive = join(root, "site.tar.gz");

const REQUIRED = ["server/index.js", ".openai/hosting.json"];

for (const relative of REQUIRED) {
  try {
    await access(join(root, "dist", relative));
  } catch {
    console.error(`dist/${relative} is missing. Run \`npm run build\` first.`);
    process.exit(1);
  }
}

await run("tar", ["-czf", archive, "-C", root, "dist/server", "-C", join(root, "dist"), ".openai"]);

const { stdout } = await run("tar", ["-tzf", archive]);
const entries = stdout.trim().split("\n");
const { size } = await stat(archive);

console.log(`Wrote site.tar.gz (${(size / 1024).toFixed(1)} KB, ${entries.length} entries)`);
for (const entry of entries) console.log(`  ${entry}`);
