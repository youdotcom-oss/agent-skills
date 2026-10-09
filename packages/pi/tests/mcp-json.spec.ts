import { describe, expect, test } from 'bun:test'

/**
 * Contract for the package's bundled mcp.json: omp (whose forked extension
 * API has no `registerMcpServer`) discovers these server entries instead of
 * the programmatic registrations in main.ts. Keep both sources in sync.
 *
 * Loaded via Bun.file rather than a static import: tsconfig has no
 * resolveJsonModule, and validating this file's shape is the test's job.
 */
const loadMcpJson = (): Promise<unknown> => Bun.file(new URL('../mcp.json', import.meta.url)).json()

// omp resolves `!` header commands when connecting and drops the header when
// the command prints nothing, so an unset YDC_API_KEY falls back to OAuth
// instead of sending a bogus token. A plain `${YDC_API_KEY}` placeholder
// would be sent literally, so it must never appear here.
const AUTH_COMMAND = '!if [ -n "$YDC_API_KEY" ]; then printf \'Bearer %s\' "$YDC_API_KEY"; fi'

describe('bundled mcp.json (omp extension-package discovery)', () => {
  test('declares the same servers, urls, and auth behavior as the extension registrations', async () => {
    expect(await loadMcpJson()).toEqual({
      mcpServers: {
        you: { type: 'http', url: 'https://api.you.com/mcp', headers: { Authorization: AUTH_COMMAND } },
        'you-finance': {
          type: 'http',
          url: 'https://api.you.com/mcp/finance',
          headers: { Authorization: AUTH_COMMAND },
        },
        'you-research': {
          type: 'http',
          url: 'https://api.you.com/mcp/research',
          headers: { Authorization: AUTH_COMMAND },
        },
        'you-free': { type: 'http', url: 'https://api.you.com/mcp?profile=free' },
        'you-discover': { type: 'http', url: 'https://api.you.com/mcp?profile=discover' },
        'you-docs': { type: 'http', url: 'https://you.com/docs/_mcp/server' },
      },
    })
  })
})
