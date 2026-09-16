/**
 * You.com skill provider and MCP setup for DeepSeek Harness (dsh).
 *
 * Registers the shared You.com skills (bundled from the repo's top-level `skills/`
 * directory at build time — see `scripts/build.ts`) into dsh's skill registry
 * (`ctx.skills`) via the official local filesystem provider, and mounts one
 * `dsh-mcp-client` instance per You.com MCP server so the corresponding tools
 * are available under `mcp__<serverName>__<rawName>` names.
 * @module @youdotcom-oss/dsh
 */

import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { StreamableHttpConfig } from '@deepseek-ai/dsh-mcp-client'
import * as McpClientPlugin from '@deepseek-ai/dsh-mcp-client'
import * as SkillFilesystemPlugin from '@deepseek-ai/dsh-skill-filesystem'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh-youcom'

/**
 * Absolute path to this package's bundled skills. `lib/index.js` (the built
 * output this resolves against at runtime) and `skills/` are sibling
 * directories under the package root, so this stays correct through the
 * install layout regardless of where the package itself is installed.
 */
const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))

/** Unique provider name this package registers under in `ctx.skills`. */
export const SKILL_PROVIDER_NAME = 'youcom'

/** One You.com MCP server this package bridges into dsh's tool registry. */
export interface YouComMcpServer {
  readonly serverName: string
  readonly url: string
  /** Whether this server expects `Authorization: Bearer $YDC_API_KEY`. */
  readonly authenticated: boolean
}

/**
 * The You.com MCP servers this package mounts, one `dsh-mcp-client` instance each.
 * `you-free` and `you-docs` are keyless; the rest need `$YDC_API_KEY`. `you` and
 * `you-free` both expose `you-search`, but `dsh-mcp-client` namespaces tools as
 * `mcp__<serverName>__<rawName>`, so `mcp__you__you-search` and
 * `mcp__you-free__you-search` coexist without collision.
 */
export const YOUCOM_MCP_SERVERS: readonly YouComMcpServer[] = [
  { serverName: 'you', url: 'https://api.you.com/mcp', authenticated: true },
  { serverName: 'you-free', url: 'https://api.you.com/mcp?profile=free', authenticated: false },
  { serverName: 'you-finance', url: 'https://api.you.com/mcp/finance', authenticated: true },
  { serverName: 'you-research', url: 'https://api.you.com/mcp/research', authenticated: true },
  { serverName: 'you-docs', url: 'https://you.com/docs/_mcp/server', authenticated: false },
]

/**
 * Build the resolved `dsh-mcp-client` config for one You.com MCP server.
 *
 * @param server - the server to connect.
 * @param apiKey - `$YDC_API_KEY`, or `undefined` when unset.
 * @returns the resolved Streamable HTTP config. An authenticated server with no
 *   key still resolves (no `Authorization` header); the connection then fails
 *   at startup, and `failOnStartupError: false` degrades that to zero tools
 *   from that server rather than blocking the rest of the profile.
 */
export function buildMcpClientConfig(server: YouComMcpServer, apiKey: string | undefined): StreamableHttpConfig {
  return {
    transport: 'streamable-http',
    serverName: server.serverName,
    url: server.url,
    headers: server.authenticated && apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    toolCallTimeoutMs: 60_000,
    failOnStartupError: false,
  }
}

/** Mount the You.com skill provider — bundled skills only, no MCP wiring. */
export function applySkills(ctx: Context): void {
  ctx.plugin(SkillFilesystemPlugin, {
    providerName: SKILL_PROVIDER_NAME,
    includeDefaultRoots: false,
    customSkillDirs: [skillsDir],
  })
}

/**
 * Mount one `dsh-mcp-client` instance per You.com MCP server.
 * @param apiKey - defaults to `$YDC_API_KEY`; overridable for tests.
 */
export function applyMcpServers(ctx: Context, apiKey: string | undefined = process.env.YDC_API_KEY): void {
  for (const server of YOUCOM_MCP_SERVERS) {
    ctx.plugin(McpClientPlugin, buildMcpClientConfig(server, apiKey))
  }
}

/** Register the You.com skill provider and MCP servers. */
export function apply(ctx: Context): void {
  applySkills(ctx)
  applyMcpServers(ctx)
}
