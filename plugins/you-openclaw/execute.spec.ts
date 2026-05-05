/**
 * Execute-path tests for web_research and web_contents tools
 *
 * Uses mock.module() to intercept API calls so we can test
 * missing-key and API-throws paths without network access.
 *
 * @public
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import * as z from 'zod'

let callResearchCalls = 0
let fetchContentsCalls = 0
let callResearchImpl: (() => Promise<unknown>) | null = null
let fetchContentsImpl: (() => Promise<unknown>) | null = null

const defaultCallResearch = () => {
  callResearchCalls++
  return Promise.resolve({ output: { content: 'research result text' } })
}
const defaultFetchContents = () => {
  fetchContentsCalls++
  return Promise.resolve([])
}

mock.module('@youdotcom-oss/api', () => ({
  SearchQuerySchema: z.object({
    query: z.string(),
    count: z.number().optional(),
    freshness: z.string().optional(),
    offset: z.number().optional(),
    country: z.string().optional(),
    safesearch: z.string().optional(),
    livecrawl: z.string().optional(),
    livecrawl_formats: z.array(z.string()).optional(),
  }),
  ResearchQuerySchema: z.object({
    input: z.string(),
    research_effort: z.enum(['lite', 'standard', 'deep', 'exhaustive']).optional(),
  }),
  ContentsQuerySchema: z.object({
    urls: z.array(z.string()),
    formats: z.array(z.string()).optional(),
    format: z.string().optional(),
    crawl_timeout: z.number().optional(),
  }),
  fetchSearchResults: () => Promise.resolve({ results: { web: [] } }),
  callResearch: (..._args: unknown[]) => (callResearchImpl ?? defaultCallResearch)(),
  fetchContents: (..._args: unknown[]) => (fetchContentsImpl ?? defaultFetchContents)(),
}))

import pluginEntry from './index.ts'

const originalEnv = process.env.YDC_API_KEY

beforeEach(() => {
  delete process.env.YDC_API_KEY
  callResearchCalls = 0
  fetchContentsCalls = 0
  callResearchImpl = null
  fetchContentsImpl = null
})

afterEach(() => {
  if (originalEnv) {
    process.env.YDC_API_KEY = originalEnv
  } else {
    delete process.env.YDC_API_KEY
  }
})

type CapturedTool = { name: string; execute: (id: string, params: Record<string, unknown>) => Promise<unknown> }

const captureTools = (pluginConfig?: Record<string, unknown>): CapturedTool[] => {
  const tools: CapturedTool[] = []
  const mockApi = {
    id: 'you',
    name: 'You.com',
    pluginConfig: pluginConfig ?? {},
    registerWebSearchProvider: () => {},
    registerWebFetchProvider: () => {},
    registerTool: (tool: CapturedTool) => {
      tools.push(tool)
    },
  }
  pluginEntry.register(mockApi as never)
  return tools
}

const getTool = (tools: CapturedTool[], name: string): CapturedTool => {
  const tool = tools.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool ${name} not found`)
  return tool
}

// --- web_research execute ---

describe('web_research execute', () => {
  test('returns error when YDC_API_KEY is missing', async () => {
    const tools = captureTools()
    const research = getTool(tools, 'web_research')

    const result = (await research.execute('test-id', { input: 'quantum computing' })) as Record<string, unknown>
    const content = result.content as Array<{ type: string; text: string }>
    expect(content[0]?.text).toContain('YDC_API_KEY is required for research')
    expect(result.details).toEqual({ error: true, context: 'Research' })
    expect(callResearchCalls).toBe(0)
  })

  test('returns error when API call throws', async () => {
    process.env.YDC_API_KEY = 'test-key'
    callResearchImpl = () => Promise.reject(new Error('API rate limited'))

    const tools = captureTools()
    const research = getTool(tools, 'web_research')
    const result = (await research.execute('test-id', { input: 'quantum computing' })) as Record<string, unknown>
    const content = result.content as Array<{ type: string; text: string }>
    expect(content[0]?.text).toContain('Research failed: API rate limited')
    expect(result.details).toEqual({ error: true, context: 'Research' })
  })

  test('returns wrapped content on success', async () => {
    process.env.YDC_API_KEY = 'test-key'

    const tools = captureTools()
    const research = getTool(tools, 'web_research')
    const result = (await research.execute('test-id', { input: 'quantum computing' })) as Record<string, unknown>
    expect(result.details).toEqual({ tool: 'web_research', input: 'quantum computing' })
    expect(callResearchCalls).toBe(1)
  })
})

// --- web_contents execute ---

describe('web_contents execute', () => {
  test('returns error when YDC_API_KEY is missing', async () => {
    const tools = captureTools()
    const contents = getTool(tools, 'web_contents')

    const result = (await contents.execute('test-id', { urls: ['https://example.com'] })) as Record<string, unknown>
    const content = result.content as Array<{ type: string; text: string }>
    expect(content[0]?.text).toContain('YDC_API_KEY is required for contents')
    expect(result.details).toEqual({ error: true, context: 'Contents' })
    expect(fetchContentsCalls).toBe(0)
  })

  test('returns error when API call throws', async () => {
    process.env.YDC_API_KEY = 'test-key'
    fetchContentsImpl = () => Promise.reject(new Error('Network timeout'))

    const tools = captureTools()
    const contents = getTool(tools, 'web_contents')
    const result = (await contents.execute('test-id', { urls: ['https://example.com'] })) as Record<string, unknown>
    const content = result.content as Array<{ type: string; text: string }>
    expect(content[0]?.text).toContain('Contents failed: Network timeout')
    expect(result.details).toEqual({ error: true, context: 'Contents' })
  })

  test('returns secured content on success', async () => {
    process.env.YDC_API_KEY = 'test-key'

    const tools = captureTools()
    const contents = getTool(tools, 'web_contents')
    const result = (await contents.execute('test-id', { urls: ['https://example.com'] })) as Record<string, unknown>
    expect(result.details).toEqual({ tool: 'web_contents', urlCount: 1 })
    expect(fetchContentsCalls).toBe(1)
  })
})
