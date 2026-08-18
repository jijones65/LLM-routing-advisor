#!/usr/bin/env node
/**
 * Package `dist/` as `site.tar.gz` for upload to the OpenAI Sites project.
 *
 * The prototype's repo had no deploy step in it — `site.tar.gz` appeared only in
 * `.gitignore`, which means the artefact was built and uploaded by hand and the
 * exact contents were never reproducible. This makes it one command.
 *
 * The archive root must contain `server/index.js` and `.openai/hosting.json`,
 * which is what `build.mjs` already produces, so this only tars and verifies.
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

// -C dist so paths in the archive are relative to the bundle root, not to dist/.
await run("tar", ["-czf", archive, "-C", join(root, "dist"), "server", ".openai"]);

const { stdout } = await run("tar", ["-tzf", archive]);
const entries = stdout.trim().split("\n");
const { size } = await stat(archive);

console.log(`Wrote site.tar.gz (${(size / 1024).toFixed(1)} KB, ${entries.length} entries)`);
for (const entry of entries) console.log(`  ${entry}`);
