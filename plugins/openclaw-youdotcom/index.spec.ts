/**
 * Tests for You.com OpenClaw Plugin
 *
 * @public
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { ContentsQuerySchema, ResearchQuerySchema, SearchQuerySchema } from '@youdotcom-oss/api'
import { z } from 'zod'
import pluginEntry, { formatToolError, resolveApiKey } from './index.ts'

const originalEnv = process.env.YDC_API_KEY

beforeEach(() => {
  delete process.env.YDC_API_KEY
})

afterEach(() => {
  if (originalEnv) {
    process.env.YDC_API_KEY = originalEnv
  } else {
    delete process.env.YDC_API_KEY
  }
})

// --- resolveApiKey ---

describe('resolveApiKey', () => {
  test('returns apiKey from webSearch.apiKey in plugin config', () => {
    const key = resolveApiKey({ webSearch: { apiKey: 'config-key-123' } })
    expect(key).toBe('config-key-123')
  })

  test('falls back to top-level apiKey when webSearch is absent', () => {
    const key = resolveApiKey({ apiKey: 'top-level-key' })
    expect(key).toBe('top-level-key')
  })

  test('falls back to YDC_API_KEY env var when config is empty', () => {
    process.env.YDC_API_KEY = 'env-key-456'
    const key = resolveApiKey({})
    expect(key).toBe('env-key-456')
  })

  test('prefers webSearch.apiKey over env var', () => {
    process.env.YDC_API_KEY = 'env-key'
    const key = resolveApiKey({ webSearch: { apiKey: 'config-key' } })
    expect(key).toBe('config-key')
  })

  test('returns empty string when no key is available', () => {
    const key = resolveApiKey({})
    expect(key).toBe('')
  })

  test('ignores non-string apiKey values', () => {
    const key = resolveApiKey({ webSearch: { apiKey: 123 } })
    expect(key).toBe('')
  })

  test('ignores empty string apiKey', () => {
    process.env.YDC_API_KEY = 'env-fallback'
    const key = resolveApiKey({ webSearch: { apiKey: '' } })
    expect(key).toBe('env-fallback')
  })

  test('returns empty string for undefined plugin config', () => {
    const key = resolveApiKey(undefined)
    expect(key).toBe('')
  })
})

// --- formatToolError ---

describe('formatToolError', () => {
  test('formats Error instances with message', () => {
    const result = formatToolError(new Error('rate limited'), 'Search')
    expect(result.content).toHaveLength(1)
    expect(result.content[0]?.type).toBe('text')
    expect(result.content[0]?.text).toBe('Search failed: rate limited')
    expect(result.details.error).toBe(true)
    expect(result.details.context).toBe('Search')
  })

  test('formats non-Error values as Unknown error', () => {
    const result = formatToolError('string error', 'Research')
    expect(result.content[0]?.text).toBe('Research failed: Unknown error')
  })

  test('formats null/undefined errors', () => {
    const result = formatToolError(null, 'Contents')
    expect(result.content[0]?.text).toBe('Contents failed: Unknown error')
  })

  test('formats undefined errors', () => {
    const result = formatToolError(undefined, 'Search')
    expect(result.content[0]?.text).toBe('Search failed: Unknown error')
  })
})

// --- Schema serialization ---

describe('schema JSON Schema output', () => {
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

  test('WebSearchToolSchema produces valid JSON Schema with required query', () => {
    const schema = z.toJSONSchema(WebSearchToolSchema) as Record<string, unknown>
    expect(schema.type).toBe('object')
    const props = schema.properties as Record<string, unknown>
    expect(Object.keys(props)).toContain('query')
    expect(schema.required).toContain('query')
  })

  test('ResearchQuerySchema produces valid JSON Schema with required input', () => {
    const schema = z.toJSONSchema(ResearchQuerySchema) as Record<string, unknown>
    expect(schema.type).toBe('object')
    const props = schema.properties as Record<string, unknown>
    expect(Object.keys(props)).toContain('input')
    expect(schema.required).toContain('input')
  })

  test('ContentsToolSchema produces valid JSON Schema with required urls', () => {
    const schema = z.toJSONSchema(ContentsToolSchema) as Record<string, unknown>
    expect(schema.type).toBe('object')
    const props = schema.properties as Record<string, unknown>
    expect(Object.keys(props)).toContain('urls')
    expect(schema.required).toContain('urls')
  })
})

// --- Plugin contract ---

describe('plugin entry contract', () => {
  test('exports a valid plugin entry with correct id and name', () => {
    expect(pluginEntry.id).toBe('youdotcom')
    expect(pluginEntry.name).toBe('You.com')
  })

  test('has a register function', () => {
    expect(typeof pluginEntry.register).toBe('function')
  })

  test('register calls api.registerWebSearchProvider and api.registerTool', () => {
    const registeredProviders: string[] = []
    const registeredTools: string[] = []
    const mockApi = {
      id: 'youdotcom',
      name: 'You.com',
      pluginConfig: {},
      registerWebSearchProvider: (provider: { id: string }) => {
        registeredProviders.push(provider.id)
      },
      registerTool: (tool: { name: string }, _opts?: unknown) => {
        registeredTools.push(tool.name)
      },
    }
    pluginEntry.register(mockApi as never)
    expect(registeredProviders).toContain('youdotcom')
    expect(registeredTools).toContain('web_research')
    expect(registeredTools).toContain('web_contents')
  })

  test('web search provider has requiresCredential false', () => {
    let provider: { requiresCredential?: boolean } = {} as never
    const mockApi = {
      id: 'youdotcom',
      name: 'You.com',
      pluginConfig: {},
      registerWebSearchProvider: (p: { requiresCredential?: boolean }) => {
        provider = p
      },
      registerTool: () => {},
    }
    pluginEntry.register(mockApi as never)
    expect(provider.requiresCredential).toBe(false)
  })
})
