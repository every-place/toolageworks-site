// Cloudflare D1 (SQLite) adapter. Needs a D1 binding named DB (see wrangler.toml)
// and the tables from db/schema.sql.
export function d1Store(env) {
  if (!env.DB) throw new Error("DATA_BACKEND is d1 but no D1 binding named DB is configured.");
  return {
    name: "d1",
    async createLead(lead) {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO leads (id, name, email, company, topic, message, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(id, lead.name, lead.email, lead.company, lead.topic, lead.message, lead.source, lead.created_at)
        .run();
      return { id };
    },
  };
}
