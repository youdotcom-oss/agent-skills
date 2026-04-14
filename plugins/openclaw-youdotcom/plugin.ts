/**
 * You.com OpenClaw Plugin
 *
 * Exposes You.com Search, Deep Search (Research), and Contents APIs
 * as OpenClaw agent tools plus a web search provider.
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
  const fromConfig = pluginConfig?.apiKey
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
    const webSearchProvider: WebSearchProviderPlugin = {
      id: 'youdotcom',
      label: 'You.com Search',
      hint: 'Search the web using You.com APIs with livecrawl support',
      requiresCredential: true,
      credentialLabel: 'You.com API key',
      envVars: ['YDC_API_KEY'],
      placeholder: 'ydc-...',
      signupUrl: 'https://you.com/platform/api-keys',
      docsUrl: 'https://docs.you.com',
      credentialPath: 'plugins.entries.youdotcom.config.apiKey',
      getCredentialValue: (searchConfig) => searchConfig?.apiKey,
      setCredentialValue: (searchConfigTarget, value) => {
        searchConfigTarget.apiKey = value
      },
      getConfiguredCredentialValue: (config) => config?.plugins?.entries?.youdotcom?.config?.apiKey,
      setConfiguredCredentialValue: (configTarget, value) => {
        const entry = configTarget.plugins?.entries?.youdotcom
        if (entry) entry.config = { ...entry.config, apiKey: value }
      },
      createTool: (ctx) => {
        const apiKey = ctx.runtimeMetadata?.selectedProvider
          ? (ctx.searchConfig?.apiKey as string) || process.env.YDC_API_KEY || ''
          : getKey()
        if (!apiKey) return null

        return {
          description:
            'Search the web using You.com. Returns titles, URLs, descriptions, and optional live-crawled content.',
          parameters: Type.Object({
            query: Type.String({ description: 'Search query string' }),
            count: Type.Optional(Type.Number({ description: 'Number of results (1-10)', minimum: 1, maximum: 10 })),
          }).valueOf() as Record<string, unknown>,
          execute: async (args: Record<string, unknown>) => {
            const query = args.query as string
            const count = args.count as number | undefined
            try {
              const results = await fetchSearchResults({
                searchQuery: { query, count: count ?? 10 },
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
          'Perform deep research using You.com. Returns a comprehensive, cited Markdown answer with inline references. Supports effort levels: low (<30s), medium (<60s), high (<300s).',
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
            const results = await callDeepSearch({
              deepSearchQuery: {
                query: params.query,
                ...(params.search_effort && { search_effort: params.search_effort }),
              },
              YDC_API_KEY: getKey(),
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
          'Extract full page content from URLs using You.com Contents API. Returns Markdown, HTML, and/or metadata for each URL.',
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
            const results = await fetchContents({
              contentsQuery: {
                urls: params.urls,
                ...(params.formats && { formats: params.formats }),
                ...(params.crawl_timeout && { crawl_timeout: params.crawl_timeout }),
              },
              YDC_API_KEY: getKey(),
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
