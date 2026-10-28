# Worked example: an agent behind an MCP server

On-demand example of the planning flow end to end, modeled on the public `youdotcom-oss/risk-analysis-server` shape. It shows the expected plan shape; adapt the values, not the structure, to other targets.

## Initial intent

> "I want an MCP server my agents can call to assess risk in news about a company: it searches, reads the important articles, and returns a severity rating with sources."

## Evidence sweep (before any questions)

- `you-discover` (`finder: all`): the You.com catalog returns the Search and Contents MCP entries (`you://catalog`); GitHub returns comparable agent-server implementations. One candidate is selected for reading.
- `searchDocs`: confirms the hosted MCP URL pattern, provider-key header, and the search override contract — the accepted override schema is published in the tool definition's `_meta["com.you.com/search"]` (read via `tools/list`), while override values are sent per call in the request `params._meta`.
- `you-search` ("MCP server news risk analysis reference implementation"): finds the public `youdotcom-oss/risk-analysis-server` pattern — proposal ranking, result scoring, selected-page retrieval, replaceable judge.
- `you-contents` on that repository's README (authenticated server available): confirms the judge returns a task-specific severity choice and that page reads are selective, not exhaustive.

Nothing above was worth asking the user. What remains are decisions:

## Question round (frontier only)

1. **Target shape** — recommendation: agent behind an MCP server, hosted, called by other agents. *(Yes.)*
2. **Model architecture** — recommendation: generative LLM + System One decision model, because severity is a bounded choice and most calls should not pay generative prices for ranking. *(Yes.)*
3. Everything downstream (key model, transport, budgets) waits for the next round; the answers above unblocked fresh lookups (judge candidates on Hugging Face via `you-discover` with `finder: huggingface`) that run before round two.

## Decisions record (excerpt)

| Decision | Choice | Why | Status |
| --- | --- | --- | --- |
| Transport | Hosted MCP for Search and Contents | Server already speaks MCP; least host code | decided |
| Key model | Provider-held shared key, server-side only | The MCP server is the provider to its calling agents | decided |
| Model permissions — Search | `query`, `freshness` only | Severity tasks are time-sensitive; everything else is host policy | decided |
| Provider defaults | `knowledge: "core"`, highlights, `count: 10` for fan-out (baseline 30 single-shot) | Fan-out multiplies result volume | defaulted |
| Reading discipline | Judge-assisted; deterministic discipline as fallback | Bounded severity choice suits a typed judge | decided |
| Decision model | Jev pattern; two HF candidates shortlisted, license/runtime unverified | HF catalog checked at plan time; fallback is deterministic | open |
| Fan-out | Max 4 queries per task, `count: 10`, one revision allowed | Matches the reference pattern's budget shape | defaulted |

Open blockers: verify the shortlisted judges' licenses and runtime cost before build; until then the implementation checklist treats the deterministic discipline as the only committed path.

## What this demonstrates

- The sweep settled facts; the user only made decisions.
- The record carries concrete values an agent can implement against, and the one unverifiable claim (judge choice) is marked `open` instead of being smoothed over.
- The seed pattern in `assets/seed-implementation-pattern.md` is the implementation starting shape; the blank record in `assets/decisions-record-template.md` is what the planning agent copies for the next target.
