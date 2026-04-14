/**
 * You.com OpenClaw Plugin
 *
 * Exposes You.com Search, Research, and Contents APIs
 * as OpenClaw agent tools plus a web search provider.
 *
 * Search works without an API key (free tier, rate-limited).
 * Research and Contents require a YDC_API_KEY.
 *
 * Uses @youdotcom-oss/api for API calls and Zod validation.
 *
 * @public
 */

import type { GetUserAgent } from '@youdotcom-oss/api'
import {
  ContentsQuerySchema,
  callResearch,
  fetchContents,
  fetchSearchResults,
  ResearchQuerySchema,
  SearchQuerySchema,
} from '@youdotcom-oss/api'
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import type { WebSearchProviderPlugin } from 'openclaw/plugin-sdk/provider-web-search'
import { createWebSearchProviderContractFields } from 'openclaw/plugin-sdk/provider-web-search-contract'
import { z } from 'zod'

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

const WebSearchToolSchema = SearchQuerySchema.pick({
  query: true,
  count: true,
  freshness: true,
  country: true,
  safesearch: true,
})

const ContentsToolSchema = ContentsQuerySchema.pick({
  urls: true,
  formats: true,
  crawl_timeout: true,
})

const CREDENTIAL_PATH = 'plugins.entries.youdotcom.config.webSearch.apiKey'

const contractFields = createWebSearchProviderContractFields({
  credentialPath: CREDENTIAL_PATH,
  inactiveSecretPaths: [CREDENTIAL_PATH],
  searchCredential: { type: 'scoped', scopeId: 'webSearch' },
  configuredCredential: { pluginId: 'youdotcom', field: 'webSearch.apiKey' },
})

export default definePluginEntry({
  id: 'youdotcom',
  name: 'You.com',
  description: 'Web search, research, and content extraction via You.com APIs',
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
      credentialPath: CREDENTIAL_PATH,
      ...contractFields,
      createTool: (ctx) => {
        const apiKey = ctx.runtimeMetadata?.selectedProvider
          ? resolveApiKey(ctx.searchConfig as Record<string, unknown> | undefined) || process.env.YDC_API_KEY || ''
          : getKey()

        return {
          description:
            'Search the web using You.com. Returns structured results with snippets. Supports freshness, country, and safesearch filters. Use web_research for deep research with citations.',
          parameters: z.toJSONSchema(WebSearchToolSchema) as Record<string, unknown>,
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

    // --- web_research tool (deep research with cited answers) ---
    api.registerTool(
      {
        label: 'You.com Research',
        name: 'web_research',
        description:
          'Perform deep research using You.com. Returns a comprehensive, cited Markdown answer with inline references. Requires YDC_API_KEY. Supports effort levels: lite (<30s), standard (<60s), deep (<300s), exhaustive (<600s).',
        parameters: z.toJSONSchema(ResearchQuerySchema) as Record<string, unknown>,
        async execute(_id, params) {
          try {
            const key = getKey()
            if (!key) {
              return formatToolError(new Error('YDC_API_KEY is required for research'), 'Research')
            }
            const results = await callResearch({
              researchQuery: {
                input: params.input,
                ...(params.research_effort && {
                  research_effort: params.research_effort as 'lite' | 'standard' | 'deep' | 'exhaustive',
                }),
              },
              YDC_API_KEY: key,
              getUserAgent: PLUGIN_UA,
            })
            return {
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              details: { tool: 'web_research', input: params.input },
            }
          } catch (error) {
            return formatToolError(error, 'Research')
          }
        },
      },
      { optional: true },
    )

    // --- web_contents tool (extract content from URLs) ---
    api.registerTool(
      {
        label: 'You.com Contents',
        name: 'web_contents',
        description:
          'Extract full page content from URLs using You.com Contents API. Requires YDC_API_KEY. Returns Markdown, HTML, and/or metadata for each URL.',
        parameters: z.toJSONSchema(ContentsToolSchema) as Record<string, unknown>,
        async execute(_id, params) {
          try {
            const key = getKey()
            if (!key) {
              return formatToolError(new Error('YDC_API_KEY is required for contents'), 'Contents')
            }
            const results = await fetchContents({
              contentsQuery: {
                urls: params.urls,
                ...(params.formats && { formats: params.formats as ('markdown' | 'html' | 'metadata')[] }),
                ...(params.crawl_timeout && { crawl_timeout: params.crawl_timeout }),
              },
              YDC_API_KEY: key,
              getUserAgent: PLUGIN_UA,
            })
            return {
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              details: { tool: 'web_contents', urlCount: params.urls.length },
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
