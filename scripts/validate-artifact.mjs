import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");
const migrationPath = resolve(projectRoot, "dist/.openai/drizzle/0000_live_registry.sql");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);
const migration = await readFile(migrationPath, "utf8");
assert.match(migration, /catalog_models/);
assert.match(migration, /application_blueprints/);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");
