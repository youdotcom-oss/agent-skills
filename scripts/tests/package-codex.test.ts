import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { $ } from 'bun'

test('builds a standalone, single-server Codex archive with complete references', async () => {
  const root = resolve(import.meta.dir, '../..')
  await $`bun scripts/package-codex.ts`.cwd(root).quiet()
  const zip = resolve(root, 'dist/you-codex.zip')
  const entries = (await $`unzip -Z1 ${zip}`.text()).trim().split('\n')
  expect(entries).not.toContain('plugin.json')
  expect(entries).not.toContain('mcp.json')
  expect(entries.filter((path) => path.endsWith('SKILL.md'))).toEqual(['skills/you-web/SKILL.md'])
  const manifest = JSON.parse(await $`unzip -p ${zip} .codex-plugin/plugin.json`.text())
  const mcp = JSON.parse(await $`unzip -p ${zip} .mcp.json`.text())
  expect(Object.keys(mcp.mcpServers)).toEqual(['you'])
  expect(mcp.mcpServers.you.url).toBe('https://api.you.com/mcp')
  expect(manifest.interface.shortDescription.length).toBeLessThanOrEqual(30)
  expect(manifest.interface.defaultPrompt.length).toBeLessThanOrEqual(3)
  for (const prompt of manifest.interface.defaultPrompt) expect(prompt.length).toBeLessThanOrEqual(128)
  for (const path of [manifest.mcpServers, manifest.interface.logo, manifest.interface.composerIcon]) {
    expect(entries).toContain(path.replace(/^\.\//, ''))
  }
  const icon = await $`unzip -p ${zip} assets/you-icon.svg`.text()
  expect(icon).toContain('width="64" height="64" viewBox="0 0 64 64"')
  expect(icon).not.toMatch(/(?:href|script|foreignObject)/)
  expect(manifest.extensions['com.openai'].review.test_cases.positive).toHaveLength(5)
  expect(manifest.extensions['com.openai'].review.test_cases.negative).toHaveLength(3)
  expect(manifest.extensions['com.openai'].review.demo_recording_url).toBeUndefined()
})
