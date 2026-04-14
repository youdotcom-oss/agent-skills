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
import type { WebFetchProviderPlugin } from 'openclaw/plugin-sdk/provider-web-fetch'
import { wrapExternalContent } from 'openclaw/plugin-sdk/provider-web-fetch'
import type { WebSearchProviderPlugin } from 'openclaw/plugin-sdk/provider-web-search'
import { wrapWebContent } from 'openclaw/plugin-sdk/provider-web-search'
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

export const WebSearchToolSchema = SearchQuerySchema.pick({
  query: true,
  count: true,
  freshness: true,
  country: true,
  safesearch: true,
})

export const ContentsToolSchema = ContentsQuerySchema.pick({
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

const secureContentResults = <T extends { markdown?: string | null; html?: string | null }>(results: T[]) =>
  results.map((item) => ({
    ...item,
    ...(item.markdown && { markdown: wrapExternalContent(item.markdown, { source: 'web_fetch' }) }),
    ...(item.html && { html: wrapExternalContent(item.html, { source: 'web_fetch' }) }),
  }))

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
          ? resolveApiKey(ctx.searchConfig as Record<string, unknown> | undefined)
          : getKey()

        return {
          description:
            'Search the web using You.com. Returns structured results with snippets. Supports freshness, country, and safesearch filters. Use web_research for deep research with citations.',
          parameters: z.toJSONSchema(WebSearchToolSchema) as Record<string, unknown>,
          execute: async (args: Record<string, unknown>) => {
            const parsed = WebSearchToolSchema.parse(args)
            try {
              const results = await fetchSearchResults({
                searchQuery: {
                  query: parsed.query,
                  ...(parsed.count !== undefined && { count: parsed.count }),
                  ...(parsed.freshness !== undefined && { freshness: parsed.freshness }),
                  ...(parsed.country !== undefined && { country: parsed.country }),
                  ...(parsed.safesearch !== undefined && { safesearch: parsed.safesearch }),
                },
                YDC_API_KEY: apiKey,
                getUserAgent: PLUGIN_UA,
              })
              const payload = {
                query: parsed.query,
                results: results.results.web?.map((r) => ({
                  title: r.title,
                  url: r.url,
                  description: r.description,
                  ...(r.page_age && { published: r.page_age }),
                  ...(r.snippets?.length && { snippets: r.snippets }),
                  ...(r.contents?.markdown && { markdown: wrapWebContent(r.contents.markdown, 'web_search') }),
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

    // --- Web fetch provider (powers built-in web_fetch tool) ---
    // Contents API requires YDC_API_KEY.
    const webFetchProvider: WebFetchProviderPlugin = {
      id: 'youdotcom',
      label: 'You.com Fetch',
      hint: 'Extract full page content from URLs · $100 credit on signup',
      requiresCredential: true,
      credentialLabel: 'You.com API key',
      envVars: ['YDC_API_KEY'],
      placeholder: 'ydc-...',
      signupUrl: 'https://you.com/platform',
      docsUrl: 'https://docs.you.com',
      autoDetectOrder: 80,
      credentialPath: CREDENTIAL_PATH,
      inactiveSecretPaths: [CREDENTIAL_PATH],
      getCredentialValue: (fetchConfig) => {
        const ws = (fetchConfig as Record<string, unknown> | undefined)?.webSearch as
          | Record<string, unknown>
          | undefined
        return ws?.apiKey ?? (fetchConfig as Record<string, unknown> | undefined)?.apiKey
      },
      setCredentialValue: (fetchConfigTarget, value) => {
        const target = fetchConfigTarget as Record<string, unknown>
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
          ? resolveApiKey(ctx.fetchConfig as Record<string, unknown> | undefined)
          : getKey()

        if (!apiKey) return null

        return {
          description:
            'Extract full page content from URLs using You.com. Returns Markdown, HTML, and/or metadata for each URL.',
          parameters: z.toJSONSchema(ContentsToolSchema) as Record<string, unknown>,
          execute: async (args: Record<string, unknown>) => {
            const parsed = ContentsToolSchema.parse(args)
            try {
              const results = await fetchContents({
                contentsQuery: {
                  urls: parsed.urls,
                  ...(parsed.formats !== undefined && { formats: parsed.formats }),
                  ...(parsed.crawl_timeout !== undefined && { crawl_timeout: parsed.crawl_timeout }),
                },
                YDC_API_KEY: apiKey,
                getUserAgent: PLUGIN_UA,
              })
              return secureContentResults(results) as unknown as Record<string, unknown>
            } catch {
              return { error: 'fetch_failed', message: 'Content extraction failed. Try again or check the URL.' }
            }
          },
        }
      },
    }

    api.registerWebFetchProvider(webFetchProvider)

    // --- web_research tool (deep research with cited answers) ---
    api.registerTool(
      {
        label: 'You.com Research',
        name: 'web_research',
        description:
          'Perform deep research using You.com. Returns a comprehensive, cited Markdown answer with inline references. Requires YDC_API_KEY. Supports effort levels: lite (<30s), standard (<60s), deep (<300s), exhaustive (<600s).',
        parameters: z.toJSONSchema(ResearchQuerySchema) as Record<string, unknown>,
        async execute(_id, params) {
          const parsed = ResearchQuerySchema.parse(params)
          try {
            const key = getKey()
            if (!key) {
              return formatToolError(new Error('YDC_API_KEY is required for research'), 'Research')
            }
            const results = await callResearch({
              researchQuery: {
                input: parsed.input,
                research_effort: parsed.research_effort ?? 'standard',
              },
              YDC_API_KEY: key,
              getUserAgent: PLUGIN_UA,
            })
            const safeOutput = {
              ...results,
              output: {
                ...results.output,
                content: wrapWebContent(results.output.content, 'web_search'),
              },
            }
            return {
              content: [{ type: 'text', text: JSON.stringify(safeOutput, null, 2) }],
              details: { tool: 'web_research', input: parsed.input },
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
          const parsed = ContentsToolSchema.parse(params)
          try {
            const key = getKey()
            if (!key) {
              return formatToolError(new Error('YDC_API_KEY is required for contents'), 'Contents')
            }
            const results = await fetchContents({
              contentsQuery: {
                urls: parsed.urls,
                ...(parsed.formats !== undefined && { formats: parsed.formats }),
                ...(parsed.crawl_timeout !== undefined && { crawl_timeout: parsed.crawl_timeout }),
              },
              YDC_API_KEY: key,
              getUserAgent: PLUGIN_UA,
            })
            return {
              content: [{ type: 'text', text: JSON.stringify(secureContentResults(results), null, 2) }],
              details: { tool: 'web_contents', urlCount: parsed.urls.length },
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
