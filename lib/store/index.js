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

export function getStore(env = {}) {
  const choices = (env.DATA_BACKEND || "memory").toLowerCase().split("+").map((s) => s.trim()).filter(Boolean);
  if (choices.length === 1) return make(choices[0], env);

  const [primary, ...mirrors] = choices.map((c) => make(c, env));
  return {
    name: choices.join("+"),
    async createLead(lead) {
      const saved = await primary.createLead(lead);
      await Promise.all(
        mirrors.map((m) => m.createLead(lead).catch((err) => console.error(`Mirror to ${m.name} failed:`, err)))
      );
      return saved;
    },
  };
}
