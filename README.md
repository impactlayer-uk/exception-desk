# Exception Desk — local prototype

A fictional service-enquiry handoff for the Nebius × NVIDIA Global AI Hackathon. A Nebius Token Factory model extracts facts and source evidence; deterministic checks decide whether a case needs safety escalation, clarification, or human review. The app never sends a reply or creates a booking. No real customer data or measured business outcomes are included.

**Status:** Private prototype. The Nebius × NVIDIA Devpost account is registered. The Token Factory Playground returned one live response from NVIDIA Nemotron-3-Nano-30B-A3B using a fictional gas-enquiry note; this does not verify an API call from this app. Nebius API key management is unavailable during its 29 September maintenance window. A public demo, an open-source licence and contest submission are not yet verified. A qualifying entry requires a successful app-level live Token Factory call, public judging access, a public licensed repository and a public video.

## Run locally

Node.js 20+ is required. Set `NEBIUS_API_KEY` and `NEBIUS_MODEL` in the process environment; the Playground-confirmed model routing key is `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`. Do not put the API key in the repository or browser. Then run `npm start` and open `http://127.0.0.1:4174`. Without those settings, the UI loads but the analysis endpoint returns a clear configuration error.

`npm test` checks that urgent source text overrides a routine model classification and untrusted instructions, invented location/consent cannot clear checks, a routine case remains human-reviewed, and the Nebius adapter sends a runtime inference request without returning the test key.

The runtime app is deliberately small and dependency-free; Wrangler is a development/deployment tool. The public demo deployment will follow verification of the Nebius credit route. The source is currently unlicensed and not offered for reuse.

## Cloudflare demo preparation

The same UI and policy logic have a Worker adapter in `src/worker.mjs`. It serves the static files, keeps the Nebius key server-side, applies a two-request-per-minute-per-IP limit, and uses a separate D1 database to cap live calls at 100 a day. The Worker runs locally with `npm run dev:worker` after `npx wrangler d1 execute exception-desk-demo --local --file=schema.sql`. Its remote D1 database has been created and initialised, but the Worker is **not deployed** and has no API key or confirmed model. Never commit a key or add one to `wrangler.jsonc`.

Built by [ImpactLayer](https://impactlayer.co.uk/) as a fictional work sample.
