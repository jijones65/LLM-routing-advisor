/**
 * A D1-compatible database backed by node:sqlite.
 *
 * Lets the route handlers, schema and registry reconciliation be tested for real
 * — actual SQL against an actual database — rather than against a mock that
 * agrees with whatever the code happens to do. Everything runs in memory, so a
 * test gets a clean database in microseconds.
 */
import { DatabaseSync } from "node:sqlite";

class FakeStatement {
  constructor(db, query) {
    this.db = db;
    this.query = query;
    this.params = [];
  }

  bind(...values) {
    // D1 has no bindings for undefined; normalise so a missing value becomes NULL
    // rather than throwing deep inside the driver.
    this.params = values.map((value) => (value === undefined ? null : value));
    return this;
  }

  #prepared() {
    return this.db.prepare(this.query);
  }

  async first() {
    const rows = this.#prepared().all(...this.params);
    return rows.length > 0 ? rows[0] : null;
  }

  async all() {
    return { results: this.#prepared().all(...this.params) };
  }

  async run() {
    return this.#prepared().run(...this.params);
  }
}

export class FakeD1 {
  constructor() {
    this.db = new DatabaseSync(":memory:");
  }

  prepare(query) {
    return new FakeStatement(this.db, query);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  close() {
    this.db.close();
  }
}

/** Stub `fetch` with a canned response per URL substring. */
export function stubFetch(routes) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const target = String(url);
    calls.push(target);
    const match = Object.entries(routes).find(([fragment]) => target.includes(fragment));
    if (!match) return new Response("not found", { status: 404 });
    const [, handler] = match;
    const value = typeof handler === "function" ? handler(target) : handler;
    if (value instanceof Response) return value;
    return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}
