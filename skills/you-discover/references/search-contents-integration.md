# Search and Contents integration reference

On-demand reference for planning an integration that calls You.com Search or Contents — through hosted MCP or direct REST — from an inference provider, a BYOK local harness, an agent behind an MCP server, or an SDK/direct-API app.

Distilled from an internal integration runbook. Concrete values below are the recommended starting baseline. Before implementation, verify volatile contract details — endpoint shapes, field enums and limits, override names, pricing — through the Docs MCP `searchDocs` tool. If Docs MCP is unavailable, use the canonical pages under https://you.com/docs/api-reference. When this file and live docs disagree, live docs win.

## 1. Choose the transport

| Path | Use when | The host must implement |
| --- | --- | --- |
| A: hosted MCP | The runtime speaks MCP tool calls. | Tool discovery, model permissions, trusted overrides, budgets, response handling. |
| B: direct REST | The runtime executes HTTP itself. | Tool schemas, defaults, overrides, query normalization, REST mapping, budgets, response handling. |

Recommended flow either way: search with highlights, select and deduplicate sources, read selected URLs with Contents, answer with source links. Full-page extraction during search retrieves pages before the host ranks them; one measured full-page response was 1.7 MB (an observed example, not a typical size or a limit). Several such responses can exceed message and context limits.

Keep defaults in host code. Do not depend on the model to repeat them on each call. Use normalization for query syntax; use host controls for permissions, budgets, and retries.

## 2. Terms and ownership

- **Provider**: the platform integrating You.com. **Host**: the provider code running tools and the agent loop. **Model arguments**: fields produced by the language model — treat as untrusted input.
- **Default**: used only when no permitted argument or explicit setting supplies the field. An override replaces a model value; a default does not.
- **Hybrid field**: available to the model but also supports a host override. **Host-only field**: absent from the model schema; the host supplies it.
- **Fan-out**: several search requests for one user task, often in parallel.
- **The host authenticates its own users/customers and owns access, budgets, and the agent loop.** Keep the You.com key server-side: never in model context, browser code, tool results, or logs.

## 3. Key models

Branch on who holds the `YDC_API_KEY` before choosing defaults; the guidance differs materially.

| Key model | Pattern | Host responsibilities |
| --- | --- | --- |
| Provider-held shared key | Provider holds one key for its customers (hosted MCP or REST). | Customer auth, quotas applied *before* calls consume the shared key, per-customer overrides and cache isolation, no mutation of shared request headers across concurrent customers, share cached results only when isolation policy permits. |
| BYOK | Each end user enters their own key in the harness (Jan.ai-, AnythingLLM-style local tools). | Secure local credential entry and storage, a clear missing/invalid-key UX, no shared-key quotas or cross-customer isolation. The shared-key machinery in this file does not apply; do not impose it. |
| Keyless | OAuth, the free profile, or x402-paid retries. | Know the free profile's degraded surface (search only, no Contents, no `knowledge: "core"`); for paid keyless calls see the skill's [x402 direct client](x402-direct-client.md). |

Customer OAuth and unauthenticated profiles are outside the provider flow; the provider key serves customer requests server-side.

## 4. Parameter control and defaults

### 4.1 Model-controlled fields

Start with `query` and optional `freshness`. Expose more fields only when model and workload tests support them.

| Field class | Fields | Rule |
| --- | --- | --- |
| MCP arguments without override support | `query`, `freshness`, `offset` | Host controls exposure and validates. |
| Hybrid | `count`, `extraction`, `extraction_source`, `knowledge`, `exclude_domains`, `safesearch`, `crawl_timeout` | Permit model control selectively; a trusted override wins. |
| Host-only structured fields | `language`, `country`, `include_domains`, `boost_domains` | Supply via MCP overrides or the REST body; never add to the restricted model schema. |

Inline operators (`site:`, `lang:`, `loc:`) can still derive host-only fields even when those fields are absent from the model schema — see §7. If policy must forbid those filters, enforce it in host code.

### 4.2 Resolution order (without losing defaults)

1. Validate each input source; reject invalid model arguments and invalid recognized overrides. Do not rely on an override to repair malformed input.
2. Apply mandatory provider policy; reject customer settings that violate it.
3. Resolve approved customer and host settings into one trusted override set.
4. Use a trusted override when present; otherwise the permitted model value.
5. Normalize the query; derive locale/domain fields only when no explicit setting blocks that mapping.
6. Apply defaults to fields still unset. A fallback `language: "EN"` must not suppress `lang:fr`.
7. Validate resulting field combinations; reserve request budget; only then build the API request.

Keep defaults distinct from overrides. Two different MCP metadata locations are involved, and they are not interchangeable:

- **Published contract**: the tool definition's `_meta["com.you.com/search"]` (seen in `tools/list`) publishes the accepted override schema. Read a provider-specific permission key (for example Baseten's `co.baseten/llm-controllable-params-default: ["query", "freshness"]`) only if it is present and the integration recognizes it; such a key only lists preferred model-controlled fields — it sets no values and is not a standard MCP permission mechanism. The host must still restrict the schema sent to the model and validate generated arguments; keep the You.com override contract under `com.you.com/search` unchanged.
- **Sent values**: per-call overrides go in the request's `params._meta["com.you.com/search"]` or in `X-Search-*` headers. The wire precedence is fixed: headers override `params._meta`, which overrides model arguments. Merge per field; avoid conflicting header and `_meta` values. The server cannot distinguish a human setting from another host setting. There is no supported `false`, `null`, or `"off"` value that disables `knowledge`; omitting it does not disable a server default — do not invent an opt-out.

The host does not need a separate MCP proxy to restrict the model: filter the schema before inference and validate the resulting call before execution. Add trusted settings through `params._meta`; for a soft default, fill an omitted MCP argument; for a fixed value, use an override. Do not inject the language fallback as an explicit override unless suppressing `lang:` mapping is intended.

### 4.3 Recommended integration defaults

| Field | Baseline | Rule |
| --- | --- | --- |
| `knowledge` | `"core"` | Licensed results on. A string, never boolean `true`. For MCP, set explicitly and check the discovered schema before relying on omission. |
| `count` | 30 | Maximum per web/news section, not a total. Lower it for fan-out. Raw REST defaults to 10. |
| `extraction` | `"highlights"` | MCP string form; REST needs the nested object in §6. Raw REST without extraction returns snippets. |
| `language` | `"EN"` fallback | Apply after operator mapping; an explicit override only when language is fixed by policy. |
| `freshness` | Omit | Set for time-sensitive searches: `day`, `week`, `month`, `year`, or `YYYY-MM-DDtoYYYY-MM-DD`. The broader window wins when query text also specifies a timeframe. |
| `offset` | Omit (first page) | Integers 0–9; skips `offset × count` results. |
| `safesearch` | Omit | API default is `moderate`; pin a value when policy requires it. |
| `country`, domain lists | Omit | Explicit host setting, or derived from `loc:` / `site:` operators. |
| `extraction_source` | Omit | Full-page default `blend`; never send with highlights. |
| Search `crawl_timeout` | 10s, full-page only | Omit for highlights and plain search. |

For Contents: `formats: ["markdown"]`; crawl timeout defaults to 10s; omit `max_age` to accept cached content regardless of age. Search `freshness` does not control the Contents cache.

## 5. Path A: hosted MCP

1. **Connect**: Streamable HTTP to `https://api.you.com/mcp?tools=you-search,you-contents` with `Authorization: Bearer <YDC_API_KEY>` set in the server-side MCP client. Initialize, complete the handshake, call `tools/list`, confirm both tools are present, and let the client manage any session identifier.
2. **Read the runtime contract**: retain each tool's description, `inputSchema`, and `outputSchema` (descriptions, types, enums, constraints). For `you-search`, also read the tool definition's `_meta["com.you.com/search"]`, which publishes the accepted override schema. Cache the discovered contract for the tested connection/release and refresh after a server change or tool-list change notification; do not cache an unknown schema indefinitely.
3. **Restrict and send**: expose only the permitted fields (preserving their descriptions — field names alone are not enough), reject fields outside the permitted set, and apply host values per §4.2. Send calls as MCP messages (`tools/call` with `arguments`, plus `_meta` overrides) — these are not REST bodies, and the search override namespace does not configure Contents; apply Contents policy in the host before the call.
4. **Override headers**: per-call `params._meta` is preferred for customer-specific settings; the equivalent `X-Search-*` HTTP headers (for example `X-Search-Knowledge`, `X-Search-Count`, `X-Search-Extraction-Source`) win when both supply the same field. Send numbers as header strings and domain lists comma-separated in headers, JSON numbers and arrays in `_meta`; use `_meta` for large lists to avoid header limits. Unknown override keys are ignored by the server and invalid values on recognized keys error — validate in the host so a misspelled key cannot silently bypass policy.
5. **Responses**: on success, prefer `structuredContent` — Search returns the API object with `results` and `metadata`; Contents returns `{ "output": [...] }`. The first text block also carries the JSON; do not add both copies to model context. Empty Search results may include a second text block with recovery guidance — preserve it separately. Errors can set `isError: true` without `structuredContent`; never parse error prose as JSON. The optional result `_meta["you/usage"]` describes retrieval activity, not an invoice.

## 6. Path B: direct REST

Endpoints: `POST https://ydc-index.io/v1/search` and `POST https://ydc-index.io/v1/contents`, with `X-API-Key: <YDC_API_KEY>` and `Content-Type: application/json`. Use POST for new integrations; never send MCP envelopes, `_meta`, or MCP control headers to these endpoints. Build two contracts from the public API reference and OpenAPI schemas — the small model tool schema and the complete REST request/response schema — preserving descriptions, types, enums, constraints, and nullable fields. Apply provider defaults in code rather than copying REST defaults into the model tool. A minimal model search schema exposes `query` (required, short natural-language phrase; host maps `site:`/`lang:`/`loc:`) and optional `freshness`, with `additionalProperties: false`. Validate output with the REST response schema and preserve URLs, content fields, dates, and knowledge attribution for the model; do not reduce output to an unlabeled text string. The MCP `tools/list` schemas are not identical to the REST schemas; adapt deliberately.

Map the effective fields to the REST body:

| Effective field | REST body |
| --- | --- |
| `query` | Normalized query (required). |
| `knowledge` | `knowledge: "core"`; never boolean `true`. |
| `count` | Top-level integer (baseline 30; lower for fan-out). |
| `freshness`, `offset`, `safesearch` | Same top-level names; include only when set. |
| `language`, `country` | Top-level values after explicit settings, operator mapping, and fallback resolution. |
| Domain lists | Top-level JSON arrays; apply the conflict and limit rules in §7. The documented MCP contract permits 500 excluded domains where the REST reference permits 5000 — use 500 for a shared compatibility profile; inclusion and boost lists permit 500 on both paths. |
| `extraction: "none"` | Omit `extraction` entirely (there is no REST `"none"` mode). |
| `extraction: "highlights"` | `extraction: { "extraction_mode": "highlights" }`. |
| `extraction: "full_page"` | `extraction: { "extraction_mode": "full_page", "full_page": { "extraction_formats": ["markdown"] } }`. |
| `extraction_source` | Nest at `extraction.extraction_source`; full-page only. |
| Search `crawl_timeout` | Top-level integer 1–60; full-page only. |

REST also supports `extraction.highlights.total_max_tokens` (1024–8192, default 8192), an approximate highlight-token budget across web results — a host setting; do not send it through MCP unless the discovered contract supports it.

**Search response handling**: the response is an object with `results` and `metadata`; any result section can be absent — count absent sections as empty rather than fabricating records. Use `results.web[].url`/`title` to identify and cite sources; `contents.highlights` replaces snippets in highlights mode; `contents.markdown`/`html` appear only when full-page extraction succeeded for that result. News results have their own documented fields — do not assume the web highlights shape. Knowledge entries are licensed facts: preserve `type`, `title`, `attribution`, and optional `as_of`; attribution names data providers and is not a URL citation — never invent URLs for these facts or submit them to Contents, and ignore unsupported knowledge types without failing the search. Use `metadata.search_uuid` to correlate diagnostics. REST returns no `structuredContent` or `_meta["you/usage"]`; compute host metrics instead (count web items with returned markdown/HTML as pages extracted, for parity with MCP full-page metrics), keeping retrieval metrics distinct from billing and model-read metrics.

**Contents requests**: send only selected public HTTP/HTTPS URLs; a user-supplied URL can go directly to Contents without a search. Use a non-empty URL list, Markdown by default (HTML or metadata only when needed), independent `crawl_timeout` of 1–60s, and `max_age` omitted for no cache-age limit or `0` to force a fresh fetch. Start with small batches — 10 URLs per batch is a provider policy example, not an OpenAPI-declared limit; discover the MCP URL limit from `tools/list` rather than assuming it proves the REST limit. REST returns an array (MCP wraps it in `output`); match entries by URL, not position. Treat missing or empty text as an unread page, not evidence; a metadata-only success is not an extraction failure; preserve partial successes and report missing URLs.

## 7. Query normalization and validation

Hosted MCP performs this transformation; a direct REST adapter must implement it to offer the same model-facing query syntax. Never normalize twice on the MCP path.

- Tokenize in order, preserving double-quoted groups (including inside operators such as `intitle:"annual report"`); apostrophes do not delimit groups. Preserve quoted groups, boolean terms, signed terms, and unknown operators — preservation does not guarantee the engine enforces them.
- `site:host`: without an explicit domain setting, extract the hostname and remove the token; remove invalid values or values beginning with `*.`. Bare URLs or hostnames with a path likewise yield their hostname; plain `example.com` stays query text. Lowercase the extracted hostname; strip scheme, credentials, port, path, query, and fragment; keep subdomains including `www.`; deduplicate. When `include_domains` is supplied, or effective `exclude_domains` is non-empty, keep domain tokens unchanged. An explicit empty `include_domains` list suppresses extraction; an empty `exclude_domains` list does not — omit unused lists rather than sending placeholders.
- `lang:code` / `loc:code`: with an explicit language/country setting, keep the token; otherwise match the public enum case-insensitively and emit the canonical code. The first supported value wins; remove later duplicates, conflicts, and unsupported codes. Precedence: explicit setting, then derived operator value, then the `EN` fallback.
- `filetype:.pdf`: remove one leading dot (`filetype:pdf`) and keep the token.
- After normalization: reject an empty query; reject more than 400 characters or 50 whitespace-separated words (character count uses JavaScript string length, for MCP parity); reject domain lists beyond the selected path's limit; reject non-empty `include_domains` combined with non-empty `exclude_domains` or `boost_domains` (exclusion + boost may combine); apply the extraction checks in `references/agent-search-runtime.md` §2. Mapping a URL to a domain does not retrieve the page — call Contents for a known URL.

## 8. Integration decisions to record

Use the existing configuration system; no special file format is required. Record, at minimum: transport (MCP or REST, endpoint, tested contract version); model permissions (allowed Search and Contents fields); provider defaults (`knowledge: "core"`, highlights, count, locale fallback); fixed policy (moderation and source rules, permitted customer overrides); fan-out limits; reading discipline; context limits; reliability settings; key model and shared-key operation. The decisions-record template in `assets/decisions-record-template.md` carries these rows. Separate API limits from host policy (for example, 10 Contents URLs per batch or 10 total tool calls are starting policies, not universal You.com limits). If both transports are supported, test the same effective settings and model-visible evidence on both paths and document deliberate REST-only features rather than claiming exact parity.

## 9. Acceptance checks

Use fixtures for failure and payload tests and a test key for live smoke tests; never run an uncontrolled full-page fan-out test.

- [ ] MCP initializes and discovers Search and Contents; a missing optional provider metadata key does not break the integration.
- [ ] Model input contains only permitted fields with their descriptions retained; trusted settings never come from model-generated `_meta` or arbitrary customer headers.
- [ ] Defaults fill omissions without overwriting valid model values; MCP precedence (headers > `params._meta` > arguments) merges per field.
- [ ] Invalid arguments and recognized invalid overrides fail before any API call; unknown host setting names are detected before execution.
- [ ] `knowledge` is sent as the string `"core"` even when the model omits it; boolean `true` is never sent. A customer cannot weaken mandatory source or moderation policy.
- [ ] A baseline request sends `count: 30`, `knowledge: "core"`, language fallback `EN`, and highlights in the correct transport shape.
- [ ] The normalization rules in §7 produce the stated outputs: `lang:fr` beats the fallback but not an explicit language; empty, >400-character, and >50-word queries fail locally; inclusion conflicts fail while exclusion + boost succeeds; oversized lists fail without truncation.
- [ ] `count: 51` with highlights fails before dispatch; highlights omit `crawl_timeout` and `extraction_source`; full-page nests `extraction_source` correctly with top-level `crawl_timeout`; a host downgrade clears an incompatible `extraction_source`; `none` omits REST extraction.
- [ ] Missing result sections do not fail parsing; knowledge-only results do not trigger zero-result recovery; knowledge attribution and `as_of` survive formatting with no invented citation URL.
- [ ] MCP structured and text JSON copies are not duplicated in model context; MCP error prose is not parsed as a success object.
- [ ] Contents results are matched by URL; missing entries and null/empty text do not count as successful reads; metadata-only success is not mislabeled as extraction failure.
- [ ] A live smoke test completes Search, selected Contents, and a source-linked answer on each enabled path.
