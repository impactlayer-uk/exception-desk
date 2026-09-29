# Exception Desk — local prototype

A fictional service-enquiry handoff for the Nebius × NVIDIA Global AI Hackathon. A Nebius Token Factory model extracts facts and source evidence; deterministic checks decide whether a case needs safety escalation, clarification, or human review. The app never sends a reply or creates a booking. No real customer data or measured business outcomes are included.

**Status:** Prototype. The Nebius × NVIDIA Devpost account is registered. The Token Factory Playground returned one live response from NVIDIA Nemotron-3-Nano-30B-A3B using a fictional gas-enquiry note; this does not verify an API call from this app. Nebius API key management is unavailable during its 29 September maintenance window. A hosted demo, an app-level model call, a public video and contest submission are not yet verified. A qualifying entry requires all of them.

## Run locally

Node.js 20+ is required. Set `NEBIUS_API_KEY` and `NEBIUS_MODEL` in the process environment; the Playground-confirmed model routing key is `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`. Do not put the API key in the repository or browser. Then run `npm start` and open `http://127.0.0.1:4174`. Without those settings, the UI loads but the analysis endpoint returns a clear configuration error.

`npm test` checks that urgent source text overrides a routine model classification and untrusted instructions, invented location/consent cannot clear checks, a routine case remains human-reviewed, and the Nebius adapter sends a runtime inference request without returning the test key.

The runtime app is deliberately small and dependency-free; Wrangler is a development/deployment tool. The public demo deployment will follow verification of the Nebius credit route. This contest-specific project is released under the [MIT License](LICENSE); it does not include code from Dragon Academy, POWS or Balltrix.

## How a case moves

```mermaid
flowchart LR
  A[Operator enters fictional note] --> B[Worker rate limit]
  B --> C[D1 lifetime inference counter]
  C --> D[Nebius Token Factory: NVIDIA Nemotron]
  D --> E[Parse facts and verify quoted evidence]
  E --> F[Fixed service-area, consent and safety checks]
  F --> G[Human-review route and unsent draft]
```

The model is asked to extract facts and propose a reply, not to decide whether a job is booked. Source-text safety keywords, supported towns and explicit contact consent are checked separately in `src/policy.mjs`. Model suggestions are shown as untrusted text; the app never sends them. The Worker stores only the usage counter in D1, not customer notes or model output.

## Cloudflare demo preparation

The same UI and policy logic have a Worker adapter in `src/worker.mjs`. It serves the static files, keeps the Nebius key server-side, applies a two-request-per-minute-per-IP limit, and uses a separate D1 database to cap live calls at **20 for the lifetime of the demo**, including failed attempts. The cap is stored under one durable D1 key, so it does not reset daily. The Worker runs locally with `npm run dev:worker` after `npx wrangler d1 execute exception-desk-demo --local --file=schema.sql`. Its remote D1 database has been created and initialised, but the Worker is **not deployed** and has no API key. Never commit a key or add one to `wrangler.jsonc`. Credits and billing must be checked before enabling live inference; this application-level cap is not an account-wide spending limit.

To set up a separate Cloudflare deployment, create a D1 database, replace the database ID in `wrangler.jsonc`, then run `npx wrangler d1 execute exception-desk-demo --remote --file=schema.sql`. Set `NEBIUS_MODEL` to a model confirmed in your own Token Factory account, and add `NEBIUS_API_KEY` with `npx wrangler secret put NEBIUS_API_KEY`. Run `npm test` before `npm run deploy`. Do not add a key until the account's available credit and billing controls have been checked. The public form is only for fictional data; the demo is not a live customer intake system.

Built by [ImpactLayer](https://impactlayer.co.uk/) as a fictional work sample.
