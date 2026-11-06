// Picks the data backend from the DATA_BACKEND setting.
// Every adapter has the same shape: { name, createLead(lead) -> { id } }.
// To add a backend (Supabase, Airtable, Postgres...), write one file with that shape and list it here.
//
// DATA_BACKEND can name one backend ("d1") or several joined with "+" ("d1+zoho").
// With several, the first one must succeed; the rest get a copy and their failures
// are only logged, so a Zoho outage or an expired trial never loses a message.
import { d1Store } from "./d1.js";
import { zohoStore } from "./zoho.js";
import { memoryStore } from "./memory.js";

const adapters = { d1: d1Store, zoho: zohoStore, memory: memoryStore };

function make(choice, env) {
  const factory = adapters[choice];
  if (!factory) throw new Error(`Unknown DATA_BACKEND "${choice}". Use one of: ${Object.keys(adapters).join(", ")}`);
  return factory(env);
}

// Failed copies are written to a sync_errors table in D1 (when D1 is bound), so they can be
// read in the D1 console and re-sent later. Never throws.
async function recordSyncError(env, target, leadId, err) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS sync_errors (id INTEGER PRIMARY KEY AUTOINCREMENT, target TEXT, lead_id TEXT, error TEXT, created_at TEXT)"
    ).run();
    await env.DB.prepare("INSERT INTO sync_errors (target, lead_id, error, created_at) VALUES (?, ?, ?, ?)")
      .bind(target, leadId ?? null, String(err?.message || err).slice(0, 2000), new Date().toISOString())
      .run();
  } catch (e) {
    console.error("Could not record sync error:", e);
  }
}

export function getStore(env = {}) {
  const choices = (env.DATA_BACKEND || "memory").toLowerCase().split("+").map((s) => s.trim()).filter(Boolean);
  if (choices.length === 1) return make(choices[0], env);

  const primary = make(choices[0], env);
  // A mirror that isn't configured yet (e.g. missing Zoho secrets) is skipped, not fatal.
  const skipped = [];
  const mirrors = choices.slice(1).flatMap((c) => {
    try {
      return [make(c, env)];
    } catch (err) {
      console.error(`Mirror ${c} skipped:`, err.message);
      skipped.push([c, err]);
      return [];
    }
  });
  return {
    name: choices.join("+"),
    async createLead(lead) {
      const saved = await primary.createLead(lead);
      await Promise.all(skipped.map(([c, err]) => recordSyncError(env, c, saved.id, err)));
      await Promise.all(
        mirrors.map((m) =>
          m.createLead(lead).catch((err) => {
            console.error(`Mirror to ${m.name} failed:`, err);
            return recordSyncError(env, m.name, saved.id, err);
          })
        )
      );
      return saved;
    },
  };
}
