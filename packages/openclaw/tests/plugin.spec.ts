import { describe, expect, test } from 'bun:test'
import pluginEntry from '../plugin.ts'

const manifestPath = new URL('../openclaw.plugin.json', import.meta.url)

describe('plugin entry', () => {
  test('has the you id and You.com name', () => {
    expect(pluginEntry.id).toBe('you')
    expect(pluginEntry.name).toBe('You.com')
  })

  test('keeps runtime registration empty because MCP setup is manifest and skill metadata', () => {
    expect(() => pluginEntry.register({} as never)).not.toThrow()
  })
})

describe('plugin manifest', () => {
  test('declares skills and YDC_API_KEY setup metadata for You.com auth', async () => {
    const manifest = JSON.parse(await Bun.file(manifestPath).text())
    expect(manifest.skills).toEqual(['./skills'])
    expect(manifest.setup).toEqual({
      providers: [
        {
          id: 'you',
          envVars: ['YDC_API_KEY'],
        },
      ],
      requiresRuntime: false,
    })
    expect(manifest.configSchema).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {},
    })
  })
})
