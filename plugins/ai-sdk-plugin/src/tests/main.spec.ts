import { afterEach, describe, expect, mock, test } from 'bun:test'

type MockMcpClient = {
  close: ReturnType<typeof mock<() => Promise<void>>>
  tools: ReturnType<typeof mock<() => Promise<unknown>>>
}

const createMCPClientMock = mock(async () => ({
  close: mock(async (): Promise<void> => {}),
  tools: mock(
    async (): Promise<unknown> => ({
      'you-contents': { name: 'you-contents' },
      'you-research': { name: 'you-research' },
      'you-search': { name: 'you-search' },
    }),
  ),
})) as ReturnType<typeof mock<() => Promise<MockMcpClient>>>

const uploadSkillMock = mock(async (): Promise<unknown> => ({
  providerReference: { anthropic: 'skill_test_123' },
  displayTitle: 'You.com',
  name: 'you',
  description: 'You.com web tools',
  latestVersion: '1',
  warnings: [],
}))

const assertNonEmptySearchResult = (value: unknown) => {
  expect(value).toBeDefined()

  if (typeof value === 'string') {
    expect(value.length).toBeGreaterThan(0)
    return
  }

  if (Array.isArray(value)) {
    expect(value.length).toBeGreaterThan(0)
    return
  }

  if (typeof value === 'object' && value !== null) {
    if ('isError' in value) {
      expect(value.isError).not.toBe(true)
    }

    if ('content' in value && Array.isArray(value.content)) {
      expect(value.content.length).toBeGreaterThan(0)
      return
    }

    expect(Object.keys(value).length).toBeGreaterThan(0)
    return
  }

  throw new Error(`Unexpected search result type: ${typeof value}`)
}

/** Default app-attribution headers the plugin sends to identify itself to You.com. */
const REFERER = 'https://github.com/youdotcom-oss/agent-skills'
const TITLE = 'You.com AI SDK Plugin'

const transportWithAttribution = (url: string, apiKey?: string, extra?: Record<string, string>) => ({
  transport: {
    headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), 'http-referer': REFERER, 'x-title': TITLE, ...extra },
    type: 'http',
    url,
  },
})

describe('createYouClient', () => {
  const originalApiKey = process.env.YDC_API_KEY
  const originalServerUrl = process.env.MCP_SERVER_URL

  const loadMockedCreateYouClient = async () => {
    mock.module('@ai-sdk/mcp', () => ({ createMCPClient: createMCPClientMock }))
    mock.module('ai', () => ({ uploadSkill: uploadSkillMock }))
    return (await import(`../main.ts?mocked=${Date.now()}-${Math.random()}`)).createYouClient
  }

  const loadRealCreateYouClient = async () =>
    (await import(`../main.ts?e2e=${Date.now()}-${Math.random()}`)).createYouClient

  afterEach(() => {
    createMCPClientMock.mockClear()
    uploadSkillMock.mockClear()
    delete process.env.YDC_API_KEY
    delete process.env.MCP_SERVER_URL

    if (originalApiKey) {
      process.env.YDC_API_KEY = originalApiKey
    }

    if (originalServerUrl) {
      process.env.MCP_SERVER_URL = originalServerUrl
    }
  })

  test('executes you-search against the hosted MCP server', async () => {
    const createYouClient = await loadRealCreateYouClient()
    const client = await createYouClient({
      profile: 'free',
    })
    const tools = (await client.tools()) as Record<string, { execute: (...args: unknown[]) => Promise<unknown> }>
    const searchTool = tools['you-search']

    expect(searchTool).toBeDefined()

    if (!searchTool) {
      throw new Error('Missing you-search tool')
    }

    const result = await searchTool.execute(
      {
        query: 'OpenAI',
      },
      {
        messages: [],
        toolCallId: 'e2e-you-search',
      },
    )

    assertNonEmptySearchResult(result)
    await client.close()
  })

  test('sends default app-attribution headers (http-referer, x-title) alongside auth', async () => {
    const createYouClient = await loadMockedCreateYouClient()
    await createYouClient({ apiKey: 'config-key', tools: ['you-search', 'you-contents'] })

    expect(createMCPClientMock).toHaveBeenCalledWith(
      transportWithAttribution('https://api.you.com/mcp?tools=you-search%2Cyou-contents', 'config-key'),
    )
  })

  test('uses the hosted MCP base URL even when MCP_SERVER_URL is set in the environment', async () => {
    const createYouClient = await loadMockedCreateYouClient()
    process.env.YDC_API_KEY = 'env-key'
    process.env.MCP_SERVER_URL = 'https://env.example.com/mcp'

    await createYouClient({ tools: 'you-search' })

    expect(createMCPClientMock).toHaveBeenCalledWith(
      transportWithAttribution('https://api.you.com/mcp?tools=you-search', 'env-key'),
    )
  })

  test('uses the profile query parameter instead of tools when a profile is provided', async () => {
    const createYouClient = await loadMockedCreateYouClient()
    process.env.YDC_API_KEY = 'env-key'

    await createYouClient({ profile: 'free', tools: ['you-search', 'you-contents'] })

    expect(createMCPClientMock).toHaveBeenCalledWith(
      transportWithAttribution('https://api.you.com/mcp?profile=free', 'env-key'),
    )
  })

  test('sends attribution headers even when no API key is available', async () => {
    const createYouClient = await loadMockedCreateYouClient()
    delete process.env.YDC_API_KEY

    await createYouClient({ tools: 'you-search' })

    expect(createMCPClientMock).toHaveBeenCalledWith(
      transportWithAttribution('https://api.you.com/mcp?tools=you-search', undefined),
    )
  })

  test('caller-provided headers override defaults and add new ones', async () => {
    const createYouClient = await loadMockedCreateYouClient()
    process.env.YDC_API_KEY = 'env-key'

    await createYouClient({
      tools: 'you-search',
      headers: { 'http-referer': 'https://myapp.vercel.app', 'x-title': 'MyApp', 'x-custom': 'extra' },
    })

    expect(createMCPClientMock).toHaveBeenCalledWith({
      transport: {
        headers: {
          Authorization: 'Bearer env-key',
          'http-referer': 'https://myapp.vercel.app',
          'x-title': 'MyApp',
          'x-custom': 'extra',
        },
        type: 'http',
        url: 'https://api.you.com/mcp?tools=you-search',
      },
    })
  })
})

describe('uploadYouSkill', () => {
  const loadUploadYouSkill = async () => {
    mock.module('@ai-sdk/mcp', () => ({ createMCPClient: createMCPClientMock }))
    mock.module('ai', () => ({ uploadSkill: uploadSkillMock }))
    return (await import(`../main.ts?mocked=${Date.now()}-${Math.random()}`)).uploadYouSkill
  }

  afterEach(() => uploadSkillMock.mockClear())

  test('uploads the You.com SKILL.md bundle and returns the provider reference', async () => {
    const uploadYouSkill = await loadUploadYouSkill()
    const result = (await uploadYouSkill({ api: 'fake-provider' as never })) as {
      providerReference: Record<string, string>
    }

    expect(uploadSkillMock).toHaveBeenCalledWith(
      expect.objectContaining({
        displayTitle: 'You.com',
        files: expect.arrayContaining([expect.objectContaining({ path: 'you/SKILL.md' })]),
      }),
    )
    // The bundled SKILL.md must carry tool-selection + trust-boundary guidance.
    const call = (uploadSkillMock.mock.calls[0] as unknown as [{ files: Array<{ path: string; data: string }> }])[0]
    const skillContent = call.files[0]!.data
    expect(skillContent).toContain('you-search')
    expect(skillContent).toContain('UNTRUSTED')
    expect(result.providerReference).toEqual({ anthropic: 'skill_test_123' })
  })
})
