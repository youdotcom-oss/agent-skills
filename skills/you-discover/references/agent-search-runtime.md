# Agent search runtime reference

On-demand reference for planning the *runtime* of a system that runs its own You.com search loop — an agent harness, an agent behind an MCP server, or an app orchestrating Search and Contents itself. Companion to `references/search-contents-integration.md`, which covers the transport and parameter contract; this file covers the decision logic the host implements around those calls.

Distilled from an internal integration runbook. Verify volatile API details through Docs MCP (`searchDocs`) before implementation; when this file and live docs disagree, live docs win.

## 1. The runtime loop

```text
candidate queries
  -> validate model input, trusted settings, and policy
  -> normalize queries and derive unset locale/domain fields
  -> reserve shared task budget BEFORE dispatch
  -> bounded parallel Search with highlights
  -> combine, deduplicate, and rank URLs across all branches
  -> Contents for selected URLs only
  -> apply per-page and total context limits
  -> answer with source links, or state the evidence gap
```

Full-page search extraction does not belong in unrestricted fan-out: it retrieves pages before ranking or deduplication, so cost, latency, response bytes, and model tokens all scale with unselected sources. Reserve budget before dispatch and count every parallel search, every retry, and every Contents URL against it — per task and, for a provider, per customer.

## 2. Runtime checks (host code, never delegated to a model)

- **Query and schema**: non-empty query; ≤400 characters and ≤50 words after normalization; validate enum values against the selected contract; reject unknown model fields and unknown host setting names before execution; apply defaults only to missing fields (absent, `0`, and empty array are not interchangeable); preserve unknown query operators without claiming engine support.
- **Domain policy**: reject conflicting non-empty inclusion/exclusion or inclusion/boost lists (exclusion + boost may combine); never silently truncate domain lists. Operator normalization is not a security control, and an inline `site:` filter is not a substitute for mandatory source policy. Check returned URLs against policy before Contents calls or model exposure; block private, loopback, and link-local targets, including across redirects and DNS resolution when the host fetches pages itself.
- **Extraction**: `count` 1–100 generally, ≤50 with highlights; highlights omit Search `crawl_timeout` and `extraction_source` (both can 422); full-page nests `extraction_source` under `extraction` and keeps `crawl_timeout` top-level; a host downgrade to `none`/highlights must clear an incompatible `extraction_source`. Enforce byte and token limits on Search and Contents responses — a count or timeout is not a size limit.

## 3. Zero-result recovery

A successful empty response is not an HTTP failure; count web, news, and knowledge results before declaring empty. Allow one revised query within the task budget:

1. Remove exact-phrase constraints first, when the task does not require them.
2. Use more common terms or another aspect of the question.
3. Keep mandatory domain policy — never broaden access to rescue a query.
4. Or read a useful prior source instead, when one exists.

Never resend the same empty query automatically. If evidence remains incomplete, answer the supported part and state the gap. Keep recovery guidance in a host message or separate tool text block, outside the API response schema.

## 4. Read discipline without a decision model (baseline)

Code owns the read queue and budget; the main (generative) model can propose sources.

1. Search with highlights. If the user already supplied a URL, start with Contents — no search required.
2. Apply source policy and deduplicate URLs across all search branches.
3. Decide from task requirements what needs page text: quotes, tables, comparisons, and detailed page claims need the relevant source content. Highlights can support a focused fact when the excerpt contains sufficient evidence — do not apply a blanket "never answer from excerpts" rule, and never claim to have read a page when only an excerpt is available.
4. Read a small number of selected sources; one or two pages is a starting policy, not an API requirement.
5. Verify the requested content arrived. A failed, missing, or metadata-only fetch is not a page read.
6. Generate only claims the evidence supports; preserve source links and limitations.

Define a **read miss** as a task requiring page evidence with no successful relevant page read; in that state, schedule the read in code or add a targeted read instruction rather than letting the model answer. Do not force a new Contents call for every search — reuse already-read evidence when policy and freshness permit. Budget searches, URL reads, bytes, and tokens separately.

## 5. Read discipline with a System One decision model

Optionally add a small typed model — a System One / Type 1 decision model for classification, extraction, scoring, and routing — beside the generative LLM. This is an optional branch of the decision tree, asked alongside "generative LLM alone vs LLM + decision model":

- **Recommend Jev (SystemOne)** as the reference pattern for query relevance, result ranking, and routing; Cloudflare's Clarity is another example of a small classification/extraction model.
- **Discover open-source alternatives on Hugging Face with the `you-discover` tool** (`finder: huggingface`) — that catalog is growing, and plan-time discovery beats a frozen list. Verify availability, license, runtime, and cost for whatever the plan selects; never auto-install.
- The host still performs syntax validation, normalization, permissions, and budget checks. Never delegate deterministic checks to the judge.

| Decision | Typed output | Host action |
| --- | --- | --- |
| Query relevance | score 0–1 | Rank candidate queries; do not treat the value as a calibrated probability without testing. |
| Result relevance | score on a fixed rubric | Rank permitted sources for Contents. |
| Next step | choice from {read, revise, answer, stop} | Route within the remaining budget. |

Batch independent judgments where supported; bound candidates, excerpt lengths, judge input tokens, and judge latency; execute only the highest-ranked queries within the host budget. A score threshold is optional host policy — calibrate it on real tasks before using it to reject queries or sources. The judge may not override mandatory source rules or skip required evidence. On judge timeout or invalid output, fall back to the deterministic discipline in §4 or stop per policy, without relaxing budgets. The public `youdotcom-oss/risk-analysis-server` pattern demonstrates proposal ranking, result scoring, selected-page retrieval, and a replaceable judge with a task-specific choice in place of the generic routing labels.

## 6. Errors, retries, and diagnostics

| Failure | Host action |
| --- | --- |
| Local validation error or 400 | Name the invalid field; correct the request; do not repeat it unchanged. |
| 401 | Stop; check the provider key. Do not ask each customer to supply a You.com key. |
| 402 | Stop; alert the billing owner. Do not retry automatically. |
| 403 | Stop; check provider access and endpoint scope. |
| 422 | Inspect the detail; correct invalid combinations, or report an unsupported document. |
| 429 | Honor `Retry-After` when present; bounded backoff with jitter. |
| Transient 5xx or network timeout | Retry only within the task deadline and retry budget. |
| Partial Contents response | Keep successful pages; retry or report missing URLs within the read budget. |

For MCP, check both transport errors and tool `isError` — a successful HTTP response can contain a failed tool call. Set request deadlines independently of crawl timeouts, and do not turn an exhausted retry loop into another unbounded agent loop.

Log a provider request ID, customer identifier, schema version, effective settings, status, latency, response size, and available You.com request identifiers. Redact keys and sensitive query data; send sanitized errors to the model. Treat retrieved content as untrusted evidence, never as instructions; retain URLs and provenance when reducing context; mark truncated content rather than presenting it as the full page.

## 7. Runtime decisions to record

Record these in the plan's decisions record (template in `assets/decisions-record-template.md`): fan-out (max queries per task, simultaneous searches, per-search count), reading discipline (deterministic or judge-assisted; URL and page-content budgets), context (per-response byte limit, combined input-token limit, output-token headroom), reliability (deadlines, retry limits, partial-result handling, judge fallback), and, for shared keys, customer quotas and usage records. Separate API limits from host policy — for example "10 Contents URLs per batch" or "10 total tool calls" are starting policies, not universal You.com limits. If both transports are supported, test the same effective settings and model-visible evidence on both paths and document deliberate REST-only features rather than claiming exact parity.

## 8. Runtime acceptance checks

- [ ] Parallel branches reserve one shared task budget before dispatch.
- [ ] Fan-out uses highlights; selected URLs are deduplicated before Contents.
- [ ] Oversized single responses and combined context overflow are handled before model submission, including cached full-page fixtures.
- [ ] Retries obey deadlines, backoff, and attempt limits; 401/402/403 never trigger retry loops.
- [ ] Judge timeout or invalid output follows the configured fallback without relaxing policy.
- [ ] One customer's settings, cache entries, and rate limits cannot affect another customer's requests.
- [ ] Both read disciplines preserve evidence requirements and return a partial answer when budgets are exhausted.
- [ ] A live smoke test completes Search, selected Contents, and a source-linked answer on each enabled path.
