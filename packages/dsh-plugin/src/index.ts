/**
 * You.com integration for DeepSeek Harness (dsh).
 *
 * Registers three things on `ctx`:
 *
 * - Skills via the official local filesystem provider (bundled from the
 *   repo's top-level `skills/` directory at build time — see
 *   `scripts/build.ts`).
 * - You.com MCP servers via one `dsh-mcp-client` instance each, so the
 *   corresponding tools are available as `mcp__<serverName>__<rawName>`.
 * - A `WebSearchProvider` (`POST /v1/search`) and a `WebFetchProvider`
 *   (`POST /v1/contents`) into `ctx.web`, deferred via `ctx.inject(['web'])`
 *   so skills + MCP still register when no web seam is loaded.
 *
 * @module @youdotcom-oss/dsh-plugin
 */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import type { StreamableHttpConfig } from '@deepseek-ai/dsh-mcp-client'
import * as McpClientPlugin from '@deepseek-ai/dsh-mcp-client'
import * as SkillFilesystemPlugin from '@deepseek-ai/dsh-skill-filesystem'
import z from '@deepseek-ai/schemastery'
import { YOUCOM_FETCH_DEFAULT_BASE_URL, YouComFetchProvider } from './web/fetch-provider.ts'
import { YOUCOM_DEFAULT_BASE_URL, YOUCOM_FREE_MCP_URL, YouComSearchProvider } from './web/search-provider.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh-plugin'

/**
 * This package's version, read from `package.json` at module load. The read
 * lives here (in `src/index.ts`, which compiles to `lib/index.js` — exactly
 * one directory below the package root) rather than in `src/web/`, because
 * `lib/web/` is two directories below and `../package.json` from there would
 * resolve to `lib/package.json`, which does not exist. `package.json` is
 * always published by npm regardless of the `files` allow-list, so this read
 * works in the installed layout.
 */
const pluginVersion: string = createRequire(import.meta.url)('../package.json').version

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
 *
 * The `you-free` URL is shared with `web/search-provider.ts` as the keyless
 * fallback the search provider POSTs to directly when no `apiKey` is configured,
 * so it lives in one place (`YOUCOM_FREE_MCP_URL`) and is imported here.
 */
export const YOUCOM_MCP_SERVERS: readonly YouComMcpServer[] = [
  { serverName: 'you', url: 'https://api.you.com/mcp', authenticated: true },
  { serverName: 'you-free', url: YOUCOM_FREE_MCP_URL, authenticated: false },
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

/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface PluginConfig {
  /** You.com API key. Falls back to `$YDC_API_KEY`. Empty → search falls back to the keyless MCP profile, and fetch is unavailable. */
  apiKey?: string
  /** Endpoint base shared by `/v1/search` and `/v1/contents`. Defaults to the public API. */
  baseURL?: string
  /** Keyless MCP endpoint search falls back to when `apiKey` is empty. Defaults to You.com's public `free` profile. No fetch equivalent exists. */
  freeSearchURL?: string
  /** Default search result count when a request carries no `maxResults`. Omitted = none. */
  numResults?: number
  /** Merge `results.news[]` into search sources alongside `results.web[]`. Defaults to `true`. */
  includeNews?: boolean
}

/**
 * Schemastery schema for the plugin config, validating a config that arrives
 * from a YAML patch row at the trust boundary.
 *
 * Every field is optional (no `.required()` calls): the bundle row carries no
 * config and `apply()` fills each field from env vars or constants. Supplied
 * but invalid values still throw `ValidationError` (e.g. `numResults: 0`).
 */
export const Config = z.object({
  apiKey: z.string(),
  baseURL: z.string(),
  freeSearchURL: z.string(),
  numResults: z.number().step(1).min(1),
  includeNews: z.boolean(),
})

/** Resolve the API key from the launch environment, falling back to `process.env`. */
function resolveApiKey(ctx: Context): string {
  const fromEnv = launchEnvironmentOf(ctx).get('YDC_API_KEY')?.value
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv
  return process.env.YDC_API_KEY ?? ''
}

/**
 * Register the You.com search and fetch providers with `ctx.web`. Intended
 * to run inside a `ctx.inject(['web'], …)` fork so the web seam is
 * available; outside that fork, `ctx.web` is not present.
 */
export function applyWebProviders(ctx: Context, config: PluginConfig): void {
  const apiKey = config.apiKey ?? resolveApiKey(ctx)
  const baseURL = config.baseURL ?? YOUCOM_DEFAULT_BASE_URL
  const fetchBaseURL = config.baseURL ?? YOUCOM_FETCH_DEFAULT_BASE_URL

  ctx.web.registerSearchProvider(
    new YouComSearchProvider({
      apiKey,
      baseURL,
      freeSearchURL: config.freeSearchURL ?? YOUCOM_FREE_MCP_URL,
      pluginVersion,
      includeNews: config.includeNews ?? true,
      ...(config.numResults === undefined ? {} : { numResults: config.numResults }),
    }),
  )

  ctx.web.registerFetchProvider(
    new YouComFetchProvider({
      apiKey,
      baseURL: fetchBaseURL,
      pluginVersion,
    }),
  )
}

/** Register the You.com skill provider, MCP servers, and (when available) web providers. */
export function apply(ctx: Context, config?: PluginConfig): void {
  // Validate config at the trust boundary so supplied-but-invalid values
  // (e.g. `numResults: 0`) fail here rather than after a missing web seam
  // leaves the inner fork inactive.
  const resolved = Config(config ?? {}) as PluginConfig
  applySkills(ctx)
  applyMcpServers(ctx, resolved.apiKey ?? resolveApiKey(ctx))
  // Defer web-provider registration until `ctx.web` is available — a
  // missing web seam leaves only this inner fork inactive; skills + MCP
  // still register above. The synchronous Cordis broadcast (`reflect.ts:
  // notify`) means registration order cannot create a transient window
  // where the web seam is briefly unavailable to this fork.
  ctx.inject(['web'], (webCtx) => {
    applyWebProviders(webCtx, resolved)
  })
}

export { buildClientInfoHeader } from './web/attribution.ts'
export type { YouComFetchProviderOptions } from './web/fetch-provider.ts'
export { mapYouComContentsResponse, YOUCOM_FETCH_PROVIDER_ID, YouComFetchProvider } from './web/fetch-provider.ts'
export type { YouComSearchProviderOptions } from './web/search-provider.ts'
// Re-export the web provider classes + identifiers so callers that depend on
// this package's plugin module can build providers directly (e.g. tests).
export {
  mapYouComResult,
  mapYouComSearchResponse,
  YOUCOM_FREE_MCP_URL,
  YOUCOM_PROVIDER_ID,
  YouComSearchProvider,
} from './web/search-provider.ts'
