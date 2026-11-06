# toolageworks.com

Website for **Toolage Works** ("that WORKS for you"). A static site on Cloudflare Workers (static assets) with a small API in front of a swappable database.

```
public/            the website (plain HTML/CSS/JS, no build step)
src/worker.js      Worker entry: serves public/, sends /api/* to the API
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
npm run dev                         # http://localhost:8787
npm test
```

## Deploy on Cloudflare (one time)

1. Cloudflare dashboard → Workers & Pages → Create application → import this GitHub repo.
2. Build command: *(none)*. Deploy command: `npx wrangler deploy`. Every push to `main` redeploys.
3. Create the database: `npx wrangler d1 create toolageworks`, paste the id into `wrangler.toml`, then
   `npx wrangler d1 execute toolageworks --remote --file=db/schema.sql`, and uncomment the `[[d1_databases]]` block.
4. Custom domain: add `toolageworks.com` to Cloudflare (Add a domain, free plan), change the nameservers at
   GoDaddy to the two Cloudflare gives you, then in the Worker → Settings → Domains & Routes add
   `toolageworks.com` and `www.toolageworks.com`. The domain stays registered at GoDaddy.

## Send leads to Zoho Creator too

`DATA_BACKEND = "d1+zoho"` saves every message in D1 first, then copies it to Zoho Creator.
If Zoho is down or the trial lapses, the message is still in D1 (the Zoho error is only logged).
Use `"zoho"` alone only if you want Zoho as the single store.

1. In Creator, make an app and a form with these field link names, all **Single Line** except Message
   (Multi Line) and Email (Email): `Name`, `Email`, `Company`, `Topic`, `Message`, `Source`.
2. At api-console.zoho.com, add a **Self Client**. Under **Generate Code**, use scope
   `ZohoCreator.form.CREATE`, 10 minutes, and copy the code. Within those 10 minutes run:
   ```
   curl -X POST https://accounts.zoho.com/oauth/v2/token -d grant_type=authorization_code -d client_id=CLIENT_ID -d client_secret=CLIENT_SECRET -d code=THE_CODE
   ```
   The reply contains `refresh_token`.
3. Cloudflare → the worker → Settings → Variables and Secrets → add three **Secrets**:
   `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`.
4. In `wrangler.toml` set `ZOHO_OWNER` (your Creator account name, from the app URL), `ZOHO_APP`
   (the app link name), `ZOHO_LEAD_FORM`, and `DATA_BACKEND = "d1+zoho"`, then push.

## Not done yet

- Email notification when a new message arrives.
- Cloudflare Turnstile on the form if spam gets past the honeypot.
- Pages for each app once they're closer to launch.
- Footer line "Toolage Works is a trade name of Every Place Enterprises, LLC" after the trade name is registered.
