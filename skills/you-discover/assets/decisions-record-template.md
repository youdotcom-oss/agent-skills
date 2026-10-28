# Decisions record template

Copy this file, rename it for the target being planned, and fill it in during the planning loop. Every row carries a concrete value, not prose. Status is `decided`, `defaulted` (recommendation accepted without discussion), or `open`; open rows are blockers and are never silently defaulted.

## Target

| Item | Value |
| --- | --- |
| What is being built | |
| Model architecture (generative LLM alone / LLM + System One decision model) | |
| Selected `you-discover` resources (with score treated as relevance, not trust) | |

## Decisions

| Decision | Choice | Why | Status |
| --- | --- | --- | --- |
| Transport (hosted MCP / direct REST, per capability) | | | |
| Key model (provider-held shared / BYOK / keyless: OAuth, free profile, x402) | | | |
| Key storage and operation (who holds the key, rotation, quota owner) | | | |
| Model permissions — Search fields the model may set (start: `query`, optional `freshness`) | | | |
| Model permissions — Contents fields the model may set | | | |
| Provider defaults (`knowledge: "core"`, highlights, result count, locale fallback) | | | |
| Fixed policy (moderation, source rules, permitted customer overrides) | | | |
| Fan-out (max queries per task, simultaneous searches, per-search `count`) | | | |
| Reading discipline (deterministic / judge-assisted; URL and page-content budgets) | | | |
| Decision model, if System One (named model, license, runtime, calibration plan) | | | |
| Context (per-response byte limit, combined input-token limit, output headroom) | | | |
| Reliability (deadlines, retry limits, partial-result handling, judge fallback) | | | |
| Payment path, if keyless paid endpoints (x402 / MPP, per endpoint) | | | |

## Open blockers

- [ ] (none — or list each open decision and what would settle it)

## Implementation checklist

- [ ] Obtain the credential for the chosen key model; store it outside model context, browser code, tool results, and logs.
- [ ] Connect the chosen transport and capture the live tool/REST contract (descriptions, schemas, enums, limits).
- [ ] Restrict the model schema to the permitted fields above, preserving field descriptions.
- [ ] Implement validation, query normalization, default/override resolution, and budget reservation before dispatch.
- [ ] Implement the search runtime from the seed pattern: highlights search, deduplication, selected-page reads, context limits, cited answer.
- [ ] If System One: wire the judge behind host checks with the deterministic discipline as fallback.
- [ ] Add bounded retries, deadlines, sanitized logging (no keys), and partial-result handling.

## Acceptance checks

- [ ] Contract and control checks pass (invalid input fails before any API call; overrides beat model values; `knowledge` sent as the string `"core"`).
- [ ] Normalization and request-shape checks pass for the chosen transport.
- [ ] Response and evidence checks pass (results matched by URL, knowledge attribution preserved, no invented citations).
- [ ] Operational checks pass (shared budget, deadlines, per-customer isolation for shared keys).
- [ ] Live smoke test: Search, selected Contents, and a source-linked answer on each enabled path.
