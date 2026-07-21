import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'

type YouMcpConnectionResolver = {
  serverName: string
  resolve: (ctx: { requesterSenderId: string }) => { url: string; headers?: Record<string, string> }
}

type OpenClawPluginApiWithMcpResolver = {
  registerMcpServerConnectionResolver: (resolver: YouMcpConnectionResolver) => void
}

const YOU_MCP_URL = 'https://api.you.com/mcp'
const YOU_FREE_MCP_URL = `${YOU_MCP_URL}?profile=free`
const YOU_FINANCE_MCP_URL = `${YOU_MCP_URL}?tools=you-finance`
const YOU_DOCS_MCP_URL = 'https://you.com/docs/_mcp/server'

const readYouApiKey = (): string | undefined => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  const apiKey = env?.YDC_API_KEY?.trim()
  return apiKey ? apiKey : undefined
}

const buildAuthenticatedMcpConnection = (url: string): { url: string; headers?: Record<string, string> } => {
  const apiKey = readYouApiKey()
  return {
    url,
    ...(apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
  }
}

export default definePluginEntry({
  id: 'you',
  name: 'You.com',
  description: 'Requester-scoped connection resolvers for the You.com remote MCP server profiles.',
  register: (api) => {
    const apiWithMcpResolver = api as unknown as OpenClawPluginApiWithMcpResolver
    apiWithMcpResolver.registerMcpServerConnectionResolver({
      serverName: 'you',
      resolve: () => buildAuthenticatedMcpConnection(YOU_MCP_URL),
    })
    apiWithMcpResolver.registerMcpServerConnectionResolver({
      serverName: 'you-free',
      resolve: () => ({ url: YOU_FREE_MCP_URL }),
    })
    apiWithMcpResolver.registerMcpServerConnectionResolver({
      serverName: 'you-finance',
      resolve: () => buildAuthenticatedMcpConnection(YOU_FINANCE_MCP_URL),
    })
    apiWithMcpResolver.registerMcpServerConnectionResolver({
      serverName: 'you-docs',
      resolve: () => ({ url: YOU_DOCS_MCP_URL }),
    })
  },
})
