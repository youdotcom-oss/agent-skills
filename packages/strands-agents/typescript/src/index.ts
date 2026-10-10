/**
 * You.com plugin for Strands Agents.
 *
 * Bundles the You.com MCP servers (from the shipped `mcp.json`) and the
 * You.com Agent Skills (from the bundled `skills/` directory) into a single
 * plugin:
 *
 * ```ts
 * import { Agent } from '@strands-agents/sdk'
 * import { YouDotComPlugin } from '@youdotcom-oss/strands-agents'
 *
 * const agent = new Agent({ model, plugins: [new YouDotComPlugin()] })
 * ```
 *
 * Servers that require an API key are enabled only when `YDC_API_KEY` (or the
 * explicit `apiKey` config) is available; keyless servers are always enabled.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  BeforeInvocationEvent,
  type LocalAgent,
  McpClient,
  type Plugin,
  TextBlock,
  type Tool,
} from '@strands-agents/sdk'
import { AgentSkills } from '@strands-agents/sdk/vended-plugins/skills'

/** Servers that authenticate with `YDC_API_KEY`. Any server in the shipped
 * `mcp.json` not listed here is treated as keyless. Keying this policy by
 * server name keeps the shipped `mcp.json` the single source of truth for
 * server topology (urls) while auth policy stays a consumer-side concern. */
const API_KEY_SERVERS = new Set(['you', 'you-finance', 'you-research'])

const API_KEY_ENV_VAR = 'YDC_API_KEY'

const CAPABILITY_NOTE_MARKER = 'unavailable You.com MCP servers'

/** One entry of the shipped `mcp.json`'s `mcpServers` map. Only `url` is
 * consumed; the rest of the entry is preserved verbatim. */
export interface McpServerEntry {
  url: string
  [key: string]: unknown
}

/** Constructor config for {@link YouDotComPlugin}. */
export interface YouDotComPluginConfig {
  /** You.com API key. Defaults to the `YDC_API_KEY` environment variable.
   * When absent, servers that require a key are skipped with a warning and
   * only keyless servers are enabled. */
  apiKey?: string | undefined
}

function loadMcpConfig(): Record<string, McpServerEntry> {
  const raw = JSON.parse(readFileSync(new URL('mcp.json', import.meta.url), 'utf-8')) as {
    mcpServers?: Record<string, McpServerEntry>
  }
  return raw.mcpServers ?? {}
}

/**
 * Strands plugin bundling You.com MCP servers and Agent Skills.
 *
 * Delegates skill handling to an internal {@link AgentSkills} instance pointed
 * at the bundled skills directory, and registers one {@link McpClient} per
 * enabled server when attached to an agent.
 */
export class YouDotComPlugin implements Plugin {
  readonly name = 'youdotcom'

  /** Enabled MCP server configs by name, as shipped in `mcp.json`. */
  readonly servers: Record<string, McpServerEntry>

  #apiKey: string | undefined
  #skippedServers: string[]
  #inner: AgentSkills
  #clients: Map<string, McpClient>
  #notedAgents = new WeakSet<LocalAgent>()

  constructor(config: YouDotComPluginConfig = {}) {
    this.#apiKey = config.apiKey ?? process.env[API_KEY_ENV_VAR]
    const allServers = loadMcpConfig()
    const enabled: Record<string, McpServerEntry> = {}
    const skipped: string[] = []
    for (const [name, server] of Object.entries(allServers)) {
      if (this.#serverEnabled(name)) {
        enabled[name] = server
      } else {
        skipped.push(name)
      }
    }
    this.servers = enabled
    this.#skippedServers = skipped
    this.#inner = new AgentSkills({ skills: [fileURLToPath(new URL('skills/', import.meta.url))] })
    this.#clients = new Map(
      Object.entries(this.servers).map(([name, server]) => {
        const headers =
          API_KEY_SERVERS.has(name) && this.#apiKey ? { Authorization: `Bearer ${this.#apiKey}` } : undefined
        return [name, new McpClient({ url: server.url, ...(headers ? { headers } : {}) })] as const
      }),
    )
  }

  #serverEnabled(name: string): boolean {
    if (!API_KEY_SERVERS.has(name)) {
      return true
    }
    if (this.#apiKey) {
      return true
    }
    console.warn(
      `Server '${name}' requires an API key; set ${API_KEY_ENV_VAR} to enable it. Enabled keyless servers only.`,
    )
    return false
  }

  initAgent(agent: LocalAgent): Promise<void> {
    return this.#initAgent(agent)
  }

  async #initAgent(agent: LocalAgent): Promise<void> {
    // Skills first: the inner AgentSkills plugin registers its activation hook
    // so skill metadata is injected before the first invocation.
    await this.#inner.initAgent(agent)

    // Mirror Agent.initialize()'s MCP handling: connect lazily via listTools,
    // register discovered tools, and keep the registry in sync on refresh.
    await Promise.all(
      Array.from(this.#clients.entries()).map(async ([name, client]) => {
        const tools = await client.listTools()
        agent.toolRegistry.add(tools)
        client.onToolsChanged = (oldToolNames, newTools) => {
          for (const name of oldToolNames) {
            agent.toolRegistry.remove(name)
          }
          agent.toolRegistry.addOrReplace(newTools)
        }
        console.debug(`server='${name}' | registered MCP client`)
      }),
    )

    // Tell the agent which servers are unavailable when running keyless —
    // otherwise it discovers its capability boundary by failing tool calls.
    if (this.#skippedServers.length > 0 && !this.#apiKey) {
      const note =
        `The following You.com MCP servers are ${CAPABILITY_NOTE_MARKER} ` +
        `because no API key is configured: ${this.#skippedServers.join(', ')}. ` +
        `Set ${API_KEY_ENV_VAR} to enable them.`
      agent.addHook(BeforeInvocationEvent, (event) => {
        if (this.#notedAgents.has(event.agent)) {
          return
        }
        this.#notedAgents.add(event.agent)
        const systemPrompt = event.agent.systemPrompt
        if (systemPrompt == null || typeof systemPrompt === 'string') {
          event.agent.systemPrompt = systemPrompt ? `${systemPrompt}\n\n${note}` : note
        } else {
          event.agent.systemPrompt = [...systemPrompt, new TextBlock(note)]
        }
      })
    }
  }

  getTools(): Tool[] {
    return this.#inner.getTools()
  }
}
