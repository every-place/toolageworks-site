// Cloudflare Worker entry point.
// Files in public/ are served directly by Cloudflare. Only /api/* requests run this code
// (see run_worker_first in wrangler.toml), so the site talks to our own API and never
// to Zoho or D1 directly. The database behind it can change without touching the pages.
import { handleApi } from "../lib/api.js";

export default {
  fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
