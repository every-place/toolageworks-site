import { test } from "node:test";
import assert from "node:assert/strict";
import { handleApi, validateLead } from "../lib/api.js";
import { getStore } from "../lib/store/index.js";

const env = { DATA_BACKEND: "memory" };
const post = (body, accept = "application/json") =>
  new Request("https://toolageworks.com/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: accept },
    body: JSON.stringify(body),
  });

test("health reports the backend", async () => {
  const res = await handleApi(new Request("https://toolageworks.com/api/health"), env);
  assert.deepEqual(await res.json(), { ok: true, backend: "memory" });
});

test("valid lead is saved", async () => {
  const res = await handleApi(post({ name: "Pat", email: "Pat@Example.com", message: "Help with Excel" }), env);
  assert.equal(res.status, 201);
  const saved = getStore(env)._all().at(-1);
  assert.equal(saved.email, "pat@example.com");
  assert.equal(saved.topic, "General");
});

test("missing fields are rejected", async () => {
  const res = await handleApi(post({ name: "", email: "nope", message: "" }), env);
  assert.equal(res.status, 422);
  assert.deepEqual((await res.json()).fields, ["name", "email", "message"]);
});

test("honeypot submissions are dropped quietly", async () => {
  const before = getStore(env)._all().length;
  const res = await handleApi(post({ name: "Bot", email: "b@b.co", message: "spam", website: "x" }), env);
  assert.equal(res.status, 200);
  assert.equal(getStore(env)._all().length, before);
});

test("plain form post redirects to the thanks page", async () => {
  const body = new URLSearchParams({ name: "Lee", email: "lee@example.com", message: "Hi" });
  const req = new Request("https://toolageworks.com/api/contact", { method: "POST", body, headers: { Accept: "text/html" } });
  const res = await handleApi(req, env);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "https://toolageworks.com/thanks/");
});

test("long input is trimmed", () => {
  const { lead } = validateLead({ name: "x".repeat(500), email: "a@b.co", message: "m" });
  assert.equal(lead.name.length, 120);
});

test("unknown routes 404", async () => {
  const res = await handleApi(new Request("https://toolageworks.com/api/nope"), env);
  assert.equal(res.status, 404);
});

test("zoho adapter refuses to start without secrets", () => {
  assert.throws(() => getStore({ DATA_BACKEND: "zoho" }), /ZOHO_CLIENT_ID/);
});

test("a failing mirror backend does not lose the message", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "down" }), { status: 500 });
  const zohoEnv = { DATA_BACKEND: "memory+zoho", ZOHO_CLIENT_ID: "x", ZOHO_CLIENT_SECRET: "x", ZOHO_REFRESH_TOKEN: "x", ZOHO_OWNER: "o", ZOHO_APP: "a" };
  const origError = console.error; console.error = () => {};
  try {
    const before = getStore(env)._all().length;
    const res = await handleApi(post({ name: "Kim", email: "kim@example.com", message: "Hi" }), zohoEnv);
    assert.equal(res.status, 201);
    assert.equal(getStore(env)._all().length, before + 1);
  } finally {
    globalThis.fetch = realFetch; console.error = origError;
  }
});

test("a mirror without its secrets is skipped, not fatal", async () => {
  const origError = console.error; console.error = () => {};
  try {
    const res = await handleApi(post({ name: "Jo", email: "jo@example.com", message: "Hi" }), { DATA_BACKEND: "memory+zoho" });
    assert.equal(res.status, 201);
  } finally { console.error = origError; }
});
