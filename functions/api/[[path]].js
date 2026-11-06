// Cloudflare Pages Function: every request to /api/* lands here.
// The site only ever talks to these routes, never to Zoho or D1 directly,
// so the database behind them can change without touching the front end.
import { handleApi } from "../../lib/api.js";

export const onRequest = (context) => handleApi(context.request, context.env);
