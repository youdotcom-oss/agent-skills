import { join } from 'node:path'
import type { Plugin } from '@opencode-ai/plugin'
import type { McpRemoteConfig } from '@opencode-ai/sdk'

const YOU_COM_MCP: McpRemoteConfig = {
  type: 'remote',
  url: 'https://api.you.com/mcp',
  enabled: true,
  oauth: {},
}

const YOU_COM_FREE_MCP: McpRemoteConfig = {
  type: 'remote',
  url: 'https://api.you.com/mcp?profile=free',
  enabled: true,
}

const YOU_COM_FINANCE_MCP: McpRemoteConfig = {
  type: 'remote',
  url: 'https://api.you.com/mcp?tools=you-finance',
  enabled: true,
  oauth: {},
}

const YOU_COM_DOCS_MCP: McpRemoteConfig = {
  type: 'remote',
  url: 'https://you.com/docs/_mcp/server',
  enabled: true,
}

const currentDir = import.meta.dirname

const YouComPlugin: Plugin = async () => ({
  config: async (input) => {
    input.instructions ??= []
    // @ts-expect-error -- skills is a new opencode feature, types not yet updated
    input.skills ??= {}
    // @ts-expect-error -- skills is a new opencode feature, types not yet updated
    input.skills.paths ??= []

    // @ts-expect-error -- skills is a new opencode feature, types not yet updated
    input.skills.paths.push(join(currentDir, 'skills'))

    input.mcp ??= {}
    input.mcp.you = { ...YOU_COM_MCP }
    input.mcp['you-free'] = { ...YOU_COM_FREE_MCP }
    input.mcp['you-finance'] = { ...YOU_COM_FINANCE_MCP }
    input.mcp['you-docs'] = { ...YOU_COM_DOCS_MCP }
  },
})

export default YouComPlugin
