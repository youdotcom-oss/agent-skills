import { describe, expect, test } from 'bun:test'

describe('Path A: Basic Integration', () => {
  test(
    'calls the API and returns a response with expected content',
    async () => {
      expect(process.env.MY_API_KEY).toBeDefined()
      const { run } = await import('./path-a-basic.ts')
      const result = await run('Search the web for the three branches of the US government')
      const text = result.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})

describe('Path B: Extended Integration', () => {
  test(
    'extended integration returns a response with expected content',
    async () => {
      expect(process.env.MY_API_KEY).toBeDefined()
      const { runExtended } = await import('./path-b-extended.ts')
      const result = await runExtended('Search the web for the three branches of the US government')
      const text = result.toLowerCase()
      expect(text).toContain('legislative')
      expect(text).toContain('executive')
      expect(text).toContain('judicial')
    },
    { timeout: 60_000 },
  )
})
