# You.com for Antigravity

Execute web search over public and licensed data sources, webpage and PDF extraction, fast answer synthesis, and deep multi-step research in Antigravity using You.com's Skills and hosted MCP server. [Read the docs](https://you.com/docs).  

## Skills

| Skill | Use it for |
| --- | --- |
| `you-web` | Find current sources, read the underlying pages, and cite the evidence. |
| `you-research` | Investigate a question across multiple sources and synthesize the findings with citations. |
| `you-finance` | Research stock prices, earnings, and company financials. |
| `you-discover` | Find You.com APIs, MCP servers, SDKs, and integration docs. |

## MCP servers

| Server name | Endpoint | Tools | Default |
| --- | --- | --- | --- |
| `Free web search and fetch` | `https://api.you.com/mcp/free` | `you-search`, `you-extract`, `you-discover` | Enabled; no key required; rate limited |
| `Web search and fetch full access` | `https://api.you.com/mcp` | `you-search`, `you-extract`, `you-contents`, `you-balance`, `you-discover` | Enabled; OAuth |
| `Research` | `https://api.you.com/mcp/research` | `you-research` | Enabled; OAuth |
| `Finance Research` | `https://api.you.com/mcp/finance` | `you-finance` | Enabled; OAuth |
| `API Documentation search` | `https://you.com/docs/_mcp/server` | `searchDocs` | Enabled; no key required |

## Sign in

On first use of an authenticated server, follow the browser prompt to sign in to You.com via OAuth. No key is needed at install time.

If you prefer an API key, get one at [you.com/platform/api-keys](https://you.com/platform/api-keys). Set up a custom remote server for the endpoint you need in your personal [Antigravity MCP configuration](https://antigravity.google/docs/mcp) with the header `Authorization: Bearer <your-api-key>`. Disable the corresponding bundled server to avoid duplicate tools. Keep your API key out of project files and source control.

`Free web search and fetch` is enabled by default and does not require sign-in. To use only the keyless web tools, disable `Web search and fetch full access` in Antigravity's MCP manager. The free endpoint supports up to 100 queries per day and does not include research or finance tools.

If you connect with an MPP/x402-aware MCP client instead of signing in, `you-contents` is still available on `https://api.you.com/mcp` for paid URL reads. It takes a `urls` array. `you-extract` is the single-URL tool for free or authenticated reads, not a replacement for `you-contents` on the payment path.

## Try it

- "Use You.com to broadly search the web and fetch relevant pages, and build a timeline of Anthropic's journey from founding to recent IPO."
- "Use You.com to extract the [MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) and explain how remote MCP clients obtain and use access tokens."
- "Use You.com to do deep, qualitative and quantitative research of the competitive landscape of the fitness wearables industry."

## Data and safety

Antigravity sends tool inputs, such as search queries, URLs, and research questions, to the You.com server that handles the request. Requests are subject to the [You.com privacy policy](https://you.com/privacy) and [terms](https://you.com/terms). Do not include secrets, PII or otherwise sensitive information in tool inputs. Contact us for an enterprise agreement.

The plugin registers shared skills and remote HTTPS MCP servers. It does not install hooks or launch local MCP processes.
