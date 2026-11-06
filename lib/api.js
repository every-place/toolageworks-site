import { getStore } from "./store/index.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

// Accept JSON (from site.js) or a plain form post (no-JS fallback).
async function readBody(request) {
  const type = request.headers.get("Content-Type") || "";
  if (type.includes("application/json")) return request.json();
  const form = await request.formData();
  return Object.fromEntries(form);
}

export function validateLead(raw) {
  const lead = {
    name: clean(raw.name, 120),
    email: clean(raw.email, 200).toLowerCase(),
    company: clean(raw.company, 160),
    topic: clean(raw.topic, 80) || "General",
    message: clean(raw.message, 4000),
  };
  const errors = [];
  if (!lead.name) errors.push("name");
  if (!EMAIL_RE.test(lead.email)) errors.push("email");
  if (!lead.message) errors.push("message");
  return { lead, errors };
}

async function contact(request, env) {
  let raw;
  try {
    raw = await readBody(request);
  } catch {
    return json({ error: "Could not read the form." }, 400);
  }

  // Honeypot: real people never fill the hidden "website" field. Pretend success.
  if (raw.website) return json({ ok: true });

  const { lead, errors } = validateLead(raw);
  if (errors.length) return json({ error: "Please add your name, a valid email, and a message.", fields: errors }, 422);

  lead.source = "toolageworks.com";
  lead.created_at = new Date().toISOString();

  try {
    const store = getStore(env);
    const saved = await store.createLead(lead);
    const wantsHtml = !(request.headers.get("Accept") || "").includes("application/json");
    if (wantsHtml) return Response.redirect(new URL("/thanks/", request.url).toString(), 303);
    return json({ ok: true, id: saved.id }, 201);
  } catch (err) {
    console.error("createLead failed:", err);
    return json({ error: "Sorry, the message didn't go through." }, 502);
  }
}

export async function handleApi(request, env = {}) {
  const { pathname } = new URL(request.url);
  const route = `${request.method} ${pathname.replace(/\/+$/, "")}`;

  switch (route) {
    case "GET /api/health": {
      const store = getStore(env);
      return json({ ok: true, backend: store.name });
    }
    case "POST /api/contact":
      return contact(request, env);
    default:
      return json({ error: "Not found" }, 404);
  }
}
