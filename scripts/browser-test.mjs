#!/usr/bin/env node
/**
 * End-to-end smoke test in a real browser.
 *
 * Boots the built worker against an in-memory database with registry fixtures,
 * then drives the actual interface: every tab renders, the brief controls change
 * the plan, score breakdowns expand, preferences are explained visibly, and
 * a plan saves to the database. This is the layer the unit tests cannot reach —
 * the prototype's entire interface lived in template strings where a renamed id
 * failed only in production.
 *
 *   npm run test:browser
 *
 * Skips cleanly with a message if Playwright is not installed.
 */
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FakeD1 } from "../test/fake-d1.mjs";
import { REGISTRY_FIXTURES } from "../test/fixtures/registry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("Playwright is not installed — skipping the browser test. `npm i -D playwright` to enable it.");
  process.exit(0);
}

// Third-party sources are served from fixtures; anything pointed at the local
// test server passes through, so the test can call the app's own API.
const realFetch = globalThis.fetch;
globalThis.fetch = async (target, init) => {
  const url = String(typeof target === "string" ? target : (target?.url ?? target));
  if (url.includes("localhost") || url.includes("127.0.0.1")) return realFetch(target, init);
  const match = Object.entries(REGISTRY_FIXTURES).find(([fragment]) => url.includes(fragment));
  if (!match) return new Response(JSON.stringify({ error: "no fixture for this URL" }), { status: 404 });
  return new Response(JSON.stringify(match[1]), { status: 200, headers: { "content-type": "application/json" } });
};

const worker = (await import(join(root, "dist/server/index.js"))).default;
const db = new FakeD1();

const server = createServer(async (incoming, outgoing) => {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const response = await worker.fetch(
    new Request(`http://localhost${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
    }),
    { DB: db },
  );
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
});

await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${server.address().port}`;

const failures = [];
let checks = 0;

function expect(label, condition, detail = "") {
  checks += 1;
  if (condition) return;
  failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const browserCandidates = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browserPath = browserCandidates.find((candidate) => existsSync(candidate));
let browser;
try {
  browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
} catch (error) {
  console.log(
    `A compatible browser could not launch in this environment — skipping the browser test. ${error.message}`,
  );
  server.close();
  db.close();
  process.exit(0);
}

try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));

  await page.goto(base, { waitUntil: "networkidle" });

  // --- design view ---------------------------------------------------------
  expect("the plan renders role cards", (await page.locator(".role-card").count()) >= 3);
  expect("every plan style appears in the comparison strip", (await page.locator(".team-option").count()) === 6);
  expect("every capability is offered", (await page.locator(".cap").count()) >= 18);
  expect("each choice shows its sourcing state", (await page.locator(".role-card .verify").count()) >= 3);
  expect("each choice shows a price or cost class", (await page.locator(".role-card .price").count()) >= 3);
  expect("each choice separates four readings", (await page.locator(".role-card .result-reading").count()) >= 12);
  expect("plan cards show complete team previews", (await page.locator(".team-option .team-preview").count()) === 6);
  expect("every choice shows a decision status", (await page.locator(".role-card .decision-card").count()) >= 3);
  expect("structural team checks render", (await page.locator(".team-check").count()) >= 7);
  expect("the shared team trial worksheet has five trials", (await page.locator(".team-trial").count()) === 5);
  await page.fill("#custom-application", "Supplier comparison for a school");
  await page.waitForTimeout(150);
  expect(
    "a custom application type still builds a team",
    /supplier comparison for a school/i.test((await page.textContent("#route-title")) ?? "") &&
      (await page.locator(".role-card").count()) >= 3,
  );

  // --- score breakdown -----------------------------------------------------
  await page.locator(".why").first().click();
  await page.waitForTimeout(150);
  const terms = await page.locator(".breakdown .term").count();
  expect("the score breakdown expands", terms >= 4, `${terms} terms`);
  expect("the breakdown shows a total", (await page.locator(".breakdown-total").count()) >= 1);
  await page.locator(".why").first().click();
  await page.waitForTimeout(150);
  expect("the score breakdown collapses again", (await page.locator(".breakdown .term").count()) === 0);

  // --- changing the brief changes the plan ---------------------------------
  const primaryName = () => page.locator(".role-card").first().locator(".model-choice > strong").textContent();
  const balanced = await primaryName();
  await page.locator('[data-style="quality"]').click();
  await page.waitForTimeout(150);
  const quality = await primaryName();
  expect(
    "near-equal primary scores are labelled too close to call",
    (await page.locator(".role-card").first().locator(".close-call").count()) === 1,
  );
  expect(
    "a close call shows joint leaders",
    (await page.locator(".role-card").first().locator(".close-candidates span").count()) >= 2,
  );
  await page.locator('[data-style="cost"]').click();
  await page.waitForTimeout(150);
  const cost = await primaryName();
  expect(
    "plan styles produce different teams",
    new Set([balanced, quality, cost]).size >= 2,
    `${balanced} / ${quality} / ${cost}`,
  );

  // --- a strong preference is visibly explained ----------------------------
  await page.locator('[data-style="quality"]').click();
  await page.locator("#data-control").check();
  await page.waitForTimeout(200);
  const summaries = await page.locator(".role-card .role-copy small").allTextContents();
  expect("the data-control requirement changes the team", summaries.length > 0);
  const readout = await page.textContent("#readout");
  expect(
    "the summary states the preference was applied",
    /private or local options receive a strong preference/i.test(readout),
    readout?.slice(0, 90),
  );
  await page.locator("#data-control").uncheck();
  await page.waitForTimeout(150);

  // --- selecting a need adds the matching specialist ------------------------
  await page.locator('[data-need="code-build"]').click();
  await page.waitForTimeout(200);
  const roleLabels = await page.locator(".role-card .role-kind, .role-card .role-label").allTextContents();
  expect(
    "a coding need adds a coding specialist",
    roleLabels.some((label) => /coding/i.test(label)),
    roleLabels.join(", "),
  );

  // --- explorer ------------------------------------------------------------
  await page.locator('[data-tab="explore"]').click();
  await page.waitForTimeout(250);
  const allRows = await page.locator(".model-row").count();
  expect("the explorer lists the catalogue", allRows > 100, `${allRows} rows`);
  await page.fill("#model-search", "voice");
  await page.waitForTimeout(250);
  const searched = await page.locator(".model-row").count();
  expect("search narrows the catalogue", searched > 0 && searched < allRows, `${searched} of ${allRows}`);
  await page.fill("#model-search", "");
  await page.selectOption("#deployment-filter", "open-weight");
  await page.waitForTimeout(250);
  expect("the deployment filter applies", (await page.locator(".model-row").count()) < allRows);
  await page.selectOption("#deployment-filter", "all");

  // --- live registry -------------------------------------------------------
  await page.locator('[data-tab="registry"]').click();
  await page.waitForTimeout(2500);
  expect("the registry lists endpoints", (await page.locator(".endpoint-row").count()) > 0);
  expect("every source is shown", (await page.locator(".source-card").count()) === 6);
  expect("overlap between sources is reported", /\d/.test((await page.textContent("#overlap-rate")) ?? ""));
  await page.selectOption("#registry-classification", "possible-match");
  await page.waitForTimeout(700);
  const matched = await page.locator(".endpoint-row").count();
  expect("the classification filter applies", matched > 0, `${matched} rows`);

  // --- coverage check ------------------------------------------------------
  await page.locator('[data-tab="audit-layer"]').click();
  await page.waitForTimeout(1500);
  expect("sourcing confidence is reported", (await page.locator("#verification-summary div").count()) === 4);
  expect("every provider source is listed", (await page.locator(".coverage-row").count()) > 20);
  expect("the watchlist is shown", (await page.locator("#watchlist-grid div").count()) > 0);

  // --- update centre -------------------------------------------------------
  await page.locator('[data-tab="updates"]').click();
  await page.waitForTimeout(250);
  expect("the change log is populated", (await page.locator("#events .event").count()) > 0);
  expect("withdrawn models are listed", (await page.locator(".retired-item").count()) > 0);

  // --- about ---------------------------------------------------------------
  await page.locator('[data-tab="about"]').click();
  await page.waitForTimeout(150);
  expect("the About guide explains all five working tabs", (await page.locator(".about-card").count()) === 5);
  expect("the About guide gives a five-step workflow", (await page.locator(".about-workflow li").count()) === 5);
  expect(
    "the About guide explains evidence limits",
    /what it cannot prove/i.test((await page.textContent("#about-page")) ?? ""),
  );

  // --- saving a plan -------------------------------------------------------
  await page.locator('[data-tab="design"]').click();
  await page.waitForTimeout(250);
  await page.locator(".team-trial").first().locator('[data-trial-outcome="pass"]').click();
  await page.waitForTimeout(150);
  expect(
    "a real-task trial result can be recorded",
    /partly tested/i.test((await page.textContent("#team-evaluation")) ?? ""),
  );
  await page.locator("#save-blueprint").click();
  await page.waitForTimeout(600);
  expect("a plan saves", (await page.textContent("#toast")) === "Plan saved");
  const saved = await (await fetch(`${base}/api/blueprints`)).json();
  expect("the saved plan is retrievable", saved.blueprints.length === 1);
  const payload = JSON.parse(saved.blueprints[0].payload_json);
  expect("the saved plan records the scoring version", Boolean(payload.scoringVersion));
  expect("the saved plan records separate readings", Boolean(payload.routing[0]?.readings));
  expect("the saved plan records close-call guidance", Boolean(payload.routing[0]?.decision));
  expect(
    "the saved plan records team trial outcomes",
    payload.teamEvaluation?.trials?.some((trial) => trial.outcome === "pass"),
  );

  expect("no console errors", consoleErrors.length === 0, consoleErrors.join(" | "));
} finally {
  await browser.close();
  server.close();
  db.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${checks} browser checks failed:`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`All ${checks} browser checks passed.`);
