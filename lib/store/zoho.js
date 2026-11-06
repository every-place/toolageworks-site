// Zoho Creator adapter (Creator REST API v2.1).
// All the JSON and OAuth work happens here in JavaScript, so nothing needs Deluge.
//
// Secrets (set with `wrangler pages secret put NAME`, never committed):
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
// Settings (wrangler.toml [vars]):
//   ZOHO_OWNER      account owner name, as in the Creator app URL
//   ZOHO_APP        app link name, e.g. "toolage-works"
//   ZOHO_LEAD_FORM  form link name, e.g. "Lead"
//   ZOHO_DC         data center domain: "com" (US, default), "eu", "in", "com.au", "ca"...

let cachedToken = null; // { value, expiresAt } — lives as long as the Worker isolate

async function accessToken(env) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const dc = env.ZOHO_DC || "com";
  const params = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN,
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const res = await fetch(`https://accounts.zoho.${dc}/oauth/v2/token`, { method: "POST", body: params });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

async function creator(env, path, init = {}) {
  const dc = env.ZOHO_DC || "com";
  const url = `https://www.zohoapis.${dc}/creator/v2.1/data/${env.ZOHO_OWNER}/${env.ZOHO_APP}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${await accessToken(env)}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.code && data.code !== 3000)) throw new Error(`Zoho Creator error ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export function zohoStore(env) {
  for (const key of ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN", "ZOHO_OWNER", "ZOHO_APP"]) {
    if (!env[key]) throw new Error(`DATA_BACKEND is zoho but ${key} is not set.`);
  }
  const form = env.ZOHO_LEAD_FORM || "Lead";
  return {
    name: "zoho",
    async createLead(lead) {
      // Field link names must match the Creator form (see README, "Zoho Creator setup").
      const data = await creator(env, `/form/${form}`, {
        method: "POST",
        body: JSON.stringify({
          data: {
            Name: lead.name,
            Email: lead.email,
            Company: lead.company,
            Topic: lead.topic,
            Message: lead.message,
            Source: lead.source,
          },
          result: { fields: ["ID"] },
        }),
      });
      return { id: data?.data?.ID ?? null };
    },
  };
}
