# toolageworks.com

Website for **Toolage Works** ("that WORKS for you"). A static site on Cloudflare Pages with a small API in front of a swappable database.

```
public/            the website (plain HTML/CSS/JS, no build step)
functions/api/     Cloudflare Pages Function: every /api/* request
lib/api.js         API routes and validation (the only thing the site talks to)
lib/store/         database adapters: d1.js, zoho.js, memory.js
db/schema.sql      tables for Cloudflare D1
test/              `npm test` (Node's built-in test runner)
```

## Why it's built this way

- **Static pages** load fast, cost nothing to host, and have nothing to patch (unlike WordPress).
- **The site only calls our own `/api/...` routes.** Which database answers is one setting, `DATA_BACKEND`:
  - `d1`: Cloudflare D1 (SQLite), free tier, zero setup beyond one command.
  - `zoho`: Zoho Creator, so records show up in Creator reports and workflows. All the OAuth and JSON handling lives in `lib/store/zoho.js`, so there's no Deluge parsing.
  - `memory`: local testing only.
  Adding another backend later (Supabase, Postgres, Airtable) means one new file with a `createLead()` function.
- Security headers, a strict Content Security Policy, a honeypot spam trap, input limits, and secrets kept out of the repo.

## Run it locally

```
npm install
cp .dev.vars.example .dev.vars      # DATA_BACKEND=memory
npm run dev                         # http://localhost:8788
npm test
```

## Deploy on Cloudflare Pages (one time)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo.
2. Build command: *(none)*. Build output directory: `public`.
3. Create the database: `npx wrangler d1 create toolageworks`, paste the id into `wrangler.toml`, then
   `npx wrangler d1 execute toolageworks --remote --file=db/schema.sql`.
4. Custom domain: Pages project → Custom domains → add `toolageworks.com` and `www.toolageworks.com`.
   Cloudflare shows the DNS records to add. In GoDaddy → DNS, add them (a CNAME for `www`; for the bare domain
   either move nameservers to Cloudflare, which is the simplest and free, or follow Cloudflare's instructions).

## Switch to Zoho Creator

1. In Creator, make an app (link name `toolage-works`) with a form `Lead` and fields
   `Name`, `Email`, `Company`, `Topic`, `Message` (multi-line), `Source`.
2. In the Zoho API Console (api-console.zoho.com) create a **Self Client**, generate a code with scope
   `ZohoCreator.form.CREATE`, and exchange it for a refresh token.
3. Set secrets: `npx wrangler pages secret put ZOHO_CLIENT_ID` (and `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`).
4. In `wrangler.toml` set `ZOHO_OWNER` and `DATA_BACKEND = "zoho"`, then redeploy.

## Not done yet

- Email notification when a new message arrives.
- Cloudflare Turnstile on the form if spam gets past the honeypot.
- Pages for each app once they're closer to launch.
- Footer line "Toolage Works is a trade name of Every Place Enterprises, LLC" after the trade name is registered.
