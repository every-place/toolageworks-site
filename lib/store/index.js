// Picks the data backend from the DATA_BACKEND setting.
// Every adapter has the same shape: { name, createLead(lead) -> { id } }.
// To add a backend (Supabase, Airtable, Postgres...), write one file with that shape and list it here.
import { d1Store } from "./d1.js";
import { zohoStore } from "./zoho.js";
import { memoryStore } from "./memory.js";

const adapters = { d1: d1Store, zoho: zohoStore, memory: memoryStore };

export function getStore(env = {}) {
  const choice = (env.DATA_BACKEND || "memory").toLowerCase();
  const make = adapters[choice];
  if (!make) throw new Error(`Unknown DATA_BACKEND "${choice}". Use one of: ${Object.keys(adapters).join(", ")}`);
  return make(env);
}
