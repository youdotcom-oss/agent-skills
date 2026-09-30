import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { $ } from 'bun'

test('builds a portable Agent Plugins archive with a single MCP server and complete references', async () => {
  const root = resolve(import.meta.dir, '../..')
  await $`bun scripts/package-openai.ts`.cwd(root).quiet()
  const zip = resolve(root, 'dist/you-openai.zip')
  const entries = (await $`unzip -Z1 ${zip}`.text()).trim().split('\n')

  // Portable layout: root plugin.json + mcp.json are auto-discovered; no
  // Codex compatibility overlay ships in the submission archive.
  expect(entries).toContain('plugin.json')
  expect(entries).toContain('mcp.json')
  expect(entries).not.toContain('.codex-plugin/plugin.json')
  expect(entries).not.toContain('.mcp.json')
  expect(entries.filter((path) => path.endsWith('SKILL.md'))).toEqual(['skills/you-web/SKILL.md'])

  const manifest = JSON.parse(await $`unzip -p ${zip} plugin.json`.text())
  expect(manifest.$schema).toBe('https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
  expect(manifest.name).toBe('you')

  const mcp = JSON.parse(await $`unzip -p ${zip} mcp.json`.text())
  expect(mcp.$schema).toBe('https://agent-plugins.org/schemas/1.0.0/mcp.schema.json')
  expect(Object.keys(mcp.mcpServers)).toEqual(['you'])
  expect(mcp.mcpServers.you).toEqual({ type: 'streamable-http', url: 'https://api.you.com/mcp' })

  const openai = manifest.extensions['com.openai']
  expect(openai.interface.shortDescription.length).toBeLessThanOrEqual(30)
  expect(openai.interface.defaultPrompt.length).toBeLessThanOrEqual(3)
  for (const prompt of openai.interface.defaultPrompt) expect(prompt.length).toBeLessThanOrEqual(128)
  for (const path of [openai.interface.logo, openai.interface.composerIcon]) {
    expect(entries).toContain(path.replace(/^\.\//, ''))
  }
  expect(openai.review.test_cases.positive).toHaveLength(5)
  expect(openai.review.test_cases.negative).toHaveLength(3)
  expect(openai.review.demo_recording_url).toBeUndefined()

  const icon = await $`unzip -p ${zip} assets/you-icon.svg`.text()
  expect(icon).toContain('width="64" height="64" viewBox="0 0 64 64"')
  expect(icon).not.toMatch(/(?:href|script|foreignObject)/)
})
