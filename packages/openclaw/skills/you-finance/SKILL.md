---
name: "you-finance"
description: "Use You.com finance MCP for market data, ticker lookups, company financials, analyst or earnings research, and other finance-specific web questions."
compatibility: "Requires network access and You.com MCP server auth via `YDC_API_KEY` or OAuth, with the finance profile exposing `you-finance`."
metadata: {"openclaw":{"emoji":"🔍","primaryEnv":"YDC_API_KEY"},"mcp_servers":"{\"you-finance\":{\"url\":\"https://api.you.com/mcp?tools=you-finance\",\"auth\":\"YDC_API_KEY OAuth\",\"tools\":[\"you-finance\"]}}","author":"youdotcom-oss","version":"0.0.0","category":"finance","keywords":"you.com,mcp,finance,market-data,tickers,earnings,company-financials"}
---

# You.com Finance MCP

Use this skill for finance-specific questions that need current market information, company financials, ticker data, earnings context, sector comparisons, or cited financial research.

## Prerequisites

The authenticated You.com finance MCP server profile must be installed and connected before using this skill:

- Server URL: `https://api.you.com/mcp?tools=you-finance`
- Auth: either `YDC_API_KEY` bearer auth or OAuth login into the server
- Required tool: `you-finance`

For bearer auth, configure the host MCP client with an authorization header equivalent to:

```json
{
  "Authorization": "Bearer ${YDC_API_KEY}"
}
```

## MCP server

Use the You.com finance MCP server profile at `https://api.you.com/mcp?tools=you-finance`. The server requires `YDC_API_KEY` bearer auth or OAuth login.

Required tool:

- `you-finance`: answer finance-specific questions with current market, company, ticker, earnings, or financial source context.

## Server check

Before using this skill, check the MCP tools available in the current agent environment.

- If `you-finance` is available, use it directly.
- Prefer a dedicated `you-finance` server profile when the host exposes server profiles. The expected remote MCP config is `https://api.you.com/mcp?tools=you-finance`.
- If `you-finance` is missing, ask the user to install or enable the You.com finance MCP server profile.
- `you-finance` requires You.com auth via `YDC_API_KEY` or OAuth, depending on the host plugin.

## When to use

- Stock price or ticker lookup.
- Company financials, filings, earnings, guidance, analyst context, or valuation comparisons.
- Market, sector, ETF, macro, rates, commodities, or crypto questions where finance-specific sources are expected.

## When not to use

- General web search: use `you-web` and `you-search`.
- Reading arbitrary URLs: use `you-web` and `you-contents`.
- Non-financial deep research: use `you-research`.

## Answering rules

- Include the date or timeframe for market-sensitive data.
- Cite URLs or source names returned by the tool for factual claims.
- Flag uncertainty when sources disagree or when data may be delayed.
