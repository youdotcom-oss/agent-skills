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
| BYOK | Each end user enters their own key in the harness (Jan.ai-, AnythingLLM-style local tools). | Secure local credential entry and storage, a clear missing/invalid-key UX, no shared-key quotas or cross-customer isolation. The runbook's shared-key machinery does not apply; do not impose it. |
| Keyless | OAuth, the free profile, or x402-paid retries. | Know the free profile's degraded surface (search only, no Contents, no `knowledge: "core"`); for paid keyless calls see the skill's `references/x402-direct-client.md`. |

Customer OAuth and unauthenticated profiles are outside the provider flow; the provider key serves customer requests server-side.

## 4. Parameter control and defaults

### 4.1 Model-controlled fields

Start with `query` and optional `freshness`. Expose more fields only when model and workload tests support them.

| Field class | Fields | Rule |
| --- | --- | --- |
| MCP arguments without override support | `query`, `freshness`, `offset` | Host controls exposure and validates. |
| Hybrid | `count`, `extraction`, `extraction_source`, `knowledge`, `exclude_domains`, `safesearch`, `crawl_timeout` | Permit model control selectively; a trusted override wins. |
| Host-only structured fields | `language`, `country`, `include_domains`, `boost_domains` | Supply via MCP overrides or the REST body; never add to the restricted model schema. |

Inline operators (`site:`, `lang:`, `loc:`) can still derive host-only fields even when those fields are absent from the model schema — see §6. If policy must forbid those filters, enforce it in host code.

### 4.2 Resolution order (without losing defaults)

1. Validate each input source; reject invalid model arguments and invalid recognized overrides. Do not rely on an override to repair malformed input.
2. Apply mandatory provider policy; reject customer settings that violate it.
3. Resolve approved customer and host settings into one trusted override set.
4. Use a trusted override when present; otherwise the permitted model value.
5. Normalize the query; derive locale/domain fields only when no explicit setting blocks that mapping.
6. Apply defaults to fields still unset. A fallback `language: "EN"` must not suppress `lang:fr`.
7. Validate resulting field combinations; reserve request budget; only then build the API request.

Keep defaults distinct from overrides. For MCP the wire precedence is fixed: `X-Search-*` headers override `params._meta["com.you.com/search"]`, which overrides model arguments. Merge per field; avoid conflicting header and `_meta` values. The server cannot distinguish a human setting from another host setting.

Provider-specific model-permission metadata is possible (for example, Baseten publishes `co.baseten/llm-controllable-params-default: ["query", "freshness"]`), but it only lists preferred model-controlled fields — it sets no values and is not a standard MCP permission mechanism. Agree your own key with You.com if needed, pub
...[truncated 8184 chars]