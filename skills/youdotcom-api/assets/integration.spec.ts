import { describe, expect, test } from 'bun:test'

describe('Path A: Research API', () => {
  test(
    'calls the Research API and returns a cited answer with expected content',
    async () => {
      expect(process.env.YDC_API_KEY).toBeDefined()
      const { run } = await import('./path-a-research.ts')
      const result = await run('Search the web for the three branches of the US government')
      const text = result.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})

describe('Path B: Search + Contents API', () => {
  test(
    'searches and extracts full page content with expected keywords',
    async () => {
      expect(process.env.YDC_API_KEY).toBeDefined()
      const { run } = await import('./path-b-search-contents.ts')
      const result = await run('Search the web for the three branches of the US government')
      const text = result.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
