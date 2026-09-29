# Exception Desk — local prototype

A fictional service-enquiry handoff for the Nebius × NVIDIA Global AI Hackathon. A Nebius Token Factory model extracts facts and source evidence; deterministic checks decide whether a case needs safety escalation, clarification, or human review. The app never sends a reply or creates a booking. No real customer data or measured business outcomes are included.

**Status:** Private prototype. The Nebius × NVIDIA Devpost account is registered, but Token Factory access, live inference, a public demo, an open-source licence and contest submission are not yet verified. A qualifying entry requires a confirmed NVIDIA open-source model, at least one successful live Token Factory call, public judging access, a public licensed repository and a public video.

## Run locally

Node.js 20+ is required. Set `NEBIUS_API_KEY` and `NEBIUS_MODEL` in the process environment; the latter must be chosen from the authenticated Nebius model list. Do not put the key in the repository or browser. Then run `npm start` and open `http://127.0.0.1:4174`. Without those settings, the UI loads but the analysis endpoint returns a clear configuration error.

`npm test` checks that urgent source text overrides a routine model classification and untrusted instructions, invented location/consent cannot clear checks, a routine case remains human-reviewed, and the Nebius adapter sends a runtime inference request without returning the test key.

The app is deliberately small and dependency-free. The public demo deployment and cost cap will be chosen only after the Nebius credit route is verified. The source is currently unlicensed and not offered for reuse.

Built by [ImpactLayer](https://impactlayer.co.uk/) as a fictional work sample.
