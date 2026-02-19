import { describe, expect, test } from 'bun:test'

describe('Path A: Claude Agent SDK with You.com MCP', () => {
  test(
    'queries Claude and returns a response via MCP',
    async () => {
      expect(process.env.YDC_API_KEY).toBeDefined()
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined()
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
