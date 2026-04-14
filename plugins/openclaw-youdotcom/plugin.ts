/**
 * You.com OpenClaw Plugin
 *
 * Exposes You.com Search, Deep Search (Research), and Contents APIs
 * as OpenClaw agent tools plus a web search provider.
 *
 * Search works without an API key (free tier, rate-limited).
 * Research and Contents require a YDC_API_KEY.
 *
 * Uses @youdotcom-oss/api for API calls and Zod validation.
 *
 * @public
 */

import { Type } from '@sinclair/typebox'
import type { GetUserAgent } from '@youdotcom-oss/api'
import { callDeepSearch, fetchContents, fetchSearchResults } from '@youdotcom-oss/api'
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import type { WebSearchProviderPlugin } from 'openclaw/plugin-sdk/provider-web-search'

const PLUGIN_UA: GetUserAgent = () => 'OpenClaw-YDC-Plugin/1.0.0 (You.com)'

export const resolveApiKey = (pluginConfig: Record<string, unknown> | undefined): string => {
  const webSearch = pluginConfig?.webSearch as Record<string, unknown> | undefined
  const fromConfig = webSearch?.apiKey ?? (pluginConfig as Record<string, unknown> | undefined)?.apiKey
  if (typeof fromConfig === 'string' && fromConfig) return fromConfig
  return process.env.YDC_API_KEY ?? ''
}

export const formatToolError = (error: unknown, context: string) => ({
  content: [
    { type: 'text' as const, text: `${context} failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
  ],
  details: { error: true, context },
})

export default definePluginEntry({
  id: 'youdotcom',
  name: 'You.com',
  description: 'Web search, deep research, and content extraction via You.com APIs',
  register(api) {
    const getKey = () => resolveApiKey(api.pluginConfig)

    // --- Web search provider (powers built-in web_search tool) ---
    // Search works without an API key (free tier); research/contents require YDC_API_KEY.
    const webSearchProvider: WebSearchProviderPlugin = {
      id: 'youdotcom',
      label: 'You.com Search',
      hint: 'Search, research & content extraction · $100 credit on signup',
      requiresCredential: false,
      credentialLabel: 'You.com API key',
      envVars: ['YDC_API_KEY'],
      placeholder: 'ydc-...',
      signupUrl: 'https://you.com/platform',
      docsUrl: 'https://docs.you.com',
      onboardingScopes: ['text-inference'],
      autoDetectOrder: 80,
      credentialPath: 'plugins.entries.youdotcom.config.webSearch.apiKey',
      inactiveSecretPaths: ['plugins.entries.youdotcom.config.webSearch.apiKey'],
      getCredentialValue: (searchConfig) => {
        const ws = (searchConfig as Record<string, unknown> | undefined)?.webSearch as
          | Record<string, unknown>
          | undefined
        return ws?.apiKey ?? (searchConfig as Record<string, unknown> | undefined)?.apiKey
      },
      setCredentialValue: (searchConfigTarget, value) => {
        const target = searchConfigTarget as Record<string, unknown>
        const ws = target.webSearch as Record<string, unknown> | undefined
        if (ws) {
          ws.apiKey = value
        } else {
          target.apiKey = value
        }
      },
      getConfiguredCredentialValue: (config) =>
        (config?.plugins?.entries?.youdotcom?.config as Record<string, unknown> | undefined)?.webSearch
          ? (
              (config?.plugins?.entries?.youdotcom?.config as Record<string, unknown>).webSearch as Record<
                string,
                unknown
              >
            )?.apiKey
          : (config?.plugins?.entries?.youdotcom?.config as Record<string, unknown> | undefined)?.apiKey,
      setConfiguredCredentialValue: (configTarget, value) => {
        const entry = configTarget.plugins?.entries?.youdotcom
        if (entry) {
          const cfg = entry.config as Record<string, unknown>
          const ws = (cfg.webSearch as Record<string, unknown> | undefined) ?? {}
          cfg.webSearch = { ...ws, apiKey: value }
        }
      },
      createTool: (ctx) => {
        const apiKey = ctx.runtimeMetadata?.selectedProvider
          ? resolveApiKey(ctx.searchConfig as Record<string, unknown> | undefined) || process.env.YDC_API_KEY || ''
          : getKey()

        return {
          description:
            'Search the web using You.com. Returns structured results with snippets. Supports freshness, country, and safesearch filters. Use web_research for deep research with citations.',
          parameters: Type.Object({
            query: Type.String({ description: 'Search query string' }),
            count: Type.Optional(
              Type.Number({
                description: 'Number of results to return (1-100, default: 10)',
                minimum: 1,
                maximum: 100,
              }),
            ),
            freshness: Type.Optional(
              Type.String({
                description: 'Filter by recency: "day", "week", "month", "year", or "YYYY-MM-DDtoYYYY-MM-DD"',
              }),
            ),
            country: Type.Optional(
              Type.String({ description: 'Two-letter country code (e.g. US, GB, DE) to bias results' }),
            ),
            safesearch: Type.Optional(
              Type.String({ description: 'Safe search filter: "off", "moderate", or "strict"' }),
            ),
          }).valueOf() as Record<string, unknown>,
          execute: async (args: Record<string, unknown>) => {
            const query = args.query as string
            const count = args.count as number | undefined
            const freshness = args.freshness as string | undefined
            const country = args.country as string | undefined
            const safesearch = args.safesearch as string | undefined
            try {
              const results = await fetchSearchResults({
                searchQuery: {
                  query,
                  ...(count && { count }),
                  ...(freshness && { freshness }),
                  ...(country && { country: country as 'US' }),
                  ...(safesearch && { safesearch: safesearch as 'off' }),
                },
                YDC_API_KEY: apiKey,
                getUserAgent: PLUGIN_UA,
              })
              const payload = {
                query,
                results: results.results.web?.map((r) => ({
                  title: r.title,
                  url: r.url,
                  description: r.description,
                  ...(r.page_age && { published: r.page_age }),
                  ...(r.snippets?.length && { snippets: r.snippets }),
                  ...(r.contents?.markdown && { markdown: r.contents.markdown }),
                })),
              }
              return payload as Record<string, unknown>
            } catch {
              return { error: 'search_failed', message: 'Search request failed. Try again or refine your query.' }
            }
          },
        }
      },
    }

    api.registerWebSearchProvider(webSearchProvider)

    // --- ydc_search tool (full-featured web search) ---
    api.registerTool(
      {
        label: 'You.com Search',
        name: 'ydc_search',
        description:
          'Search the web using You.com. Returns titles, URLs, descriptions, and optional live-crawled content. Supports freshness, country, safesearch, and livecrawl filters.',
        parameters: Type.Object({
          query: Type.String({ description: 'Search query string' }),
          count: Type.Optional(Type.Number({ description: 'Number of results (1-100)', minimum: 1, maximum: 100 })),
          freshness: Type.Optional(
            Type.String({ description: 'Filter: day, week, month, year, or YYYY-MM-DDtoYYYY-MM-DD' }),
          ),
          country: Type.Optional(Type.String({ description: 'Country code (e.g. US, GB, DE)' })),
          safesearch: Type.Optional(Type.String({ description: 'Filter level: off, moderate, strict' })),
          livecrawl: Type.Optional(Type.String({ description: 'Live-crawl sections: web, news, all' })),
          livecrawl_formats: Type.Optional(Type.String({ description: 'Livecrawl format: html or markdown' })),
        }),
        async execute(_id, params) {
          try {
            const results = await fetchSearchResults({
              searchQuery: {
                query: params.query,
                ...(params.count && { count: params.count }),
                ...(params.freshness && { freshness: params.freshness }),
                ...(params.country && { country: params.country }),
                ...(params.safesearch && { safesearch: params.safesearch }),
                ...(params.livecrawl && { livecrawl: params.livecrawl }),
                ...(params.livecrawl_formats && { livecrawl_formats: params.livecrawl_formats }),
              },
              YDC_API_KEY: getKey(),
              getUserAgent: PLUGIN_UA,
            })
            return {
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              details: { tool: 'ydc_search', query: params.query },
            }
          } catch (error) {
            return formatToolError(error, 'Search')
          }
        },
      },
      { optional: true },
    )

    // --- ydc_research tool (deep research with cited answers) ---
    api.registerTool(
      {
        label: 'You.com Research',
        name: 'ydc_research',
        description:
          'Perform deep research using You.com. Returns a comprehensive, cited Markdown answer with inline references. Requires YDC_API_KEY. Supports effort levels: low (<30s), medium (<60s), high (<300s).',
        parameters: Type.Object({
          query: Type.String({
            description: 'Research question requiring in-depth investigation',
          }),
          search_effort: Type.Optional(
            Type.String({ description: 'Effort level: low, medium, high. Default: medium' }),
          ),
        }),
        async execute(_id, params) {
          try {
            const key = getKey()
            if (!key) {
              return formatToolError(new Error('YDC_API_KEY is required for research'), 'Research')
            }
            const results = await callDeepSearch({
              deepSearchQuery: {
                query: params.query,
                ...(params.search_effort && { search_effort: params.search_effort }),
              },
              YDC_API_KEY: key,
              getUserAgent: PLUGIN_UA,
            })
            return {
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              details: { tool: 'ydc_research', query: params.query },
            }
          } catch (error) {
            return formatToolError(error, 'Research')
          }
        },
      },
      { optional: true },
    )

    // --- ydc_contents tool (extract content from URLs) ---
    api.registerTool(
      {
        label: 'You.com Contents',
        name: 'ydc_contents',
        description:
          'Extract full page content from URLs using You.com Contents API. Requires YDC_API_KEY. Returns Markdown, HTML, and/or metadata for each URL.',
        parameters: Type.Object({
          urls: Type.Array(Type.String(), {
            description: 'Array of URLs to extract content from',
          }),
          formats: Type.Optional(
            Type.Array(Type.String(), {
              description: 'Output formats: "markdown", "html", "metadata"',
            }),
          ),
          crawl_timeout: Type.Optional(
            Type.Number({ description: 'Timeout in seconds (1-60)', minimum: 1, maximum: 60 }),
          ),
        }),
        async execute(_id, params) {
          try {
            const key = getKey()
            if (!key) {
              return formatToolError(new Error('YDC_API_KEY is required for contents'), 'Contents')
            }
            const results = await fetchContents({
              contentsQuery: {
                urls: params.urls,
                ...(params.formats && { formats: params.formats }),
                ...(params.crawl_timeout && { crawl_timeout: params.crawl_timeout }),
              },
              YDC_API_KEY: key,
              getUserAgent: PLUGIN_UA,
            })
            return {
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              details: { tool: 'ydc_contents', urlCount: params.urls.length },
            }
          } catch (error) {
            return formatToolError(error, 'Contents')
          }
        },
      },
      { optional: true },
    )
  },
})
