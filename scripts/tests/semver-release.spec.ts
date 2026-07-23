import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createVersionUpdates, isPluginReleasePath } from '../semver-release.ts'

describe('semver release', () => {
  test('classifies plugin manifests and marketplaces as plugin release paths', () => {
    expect(isPluginReleasePath('.claude-plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.claude-plugin/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('.codex-plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.agents/plugins/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('.cursor-plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.cursor-plugin/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('.plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.github/plugin/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('skills/you-web/SKILL.md')).toBe(false)
  })

  test('bumps marketplace plugin versions with their paired plugin manifests', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'agent-skills-release-'))

    try {
      await writeFile(
        join(repoRoot, 'plan.json'),
        JSON.stringify({
          schemaVersion: 1,
          baseRef: 'HEAD~1',
          headRef: 'HEAD',
          generatedAt: '2026-07-22T00:00:00.000Z',
          changes: ['skills/you-web/SKILL.md'],
          units: {
            skills: {},
            plugins: {
              you: {
                bump: 'patch',
                paths: ['skills/you-web/SKILL.md'],
                rationale: ['skill you-web changed'],
              },
            },
            npm: {},
            pypi: {},
            clawhub: {},
          },
        }),
      )

      for (const path of [
        '.claude-plugin/plugin.json',
        '.codex-plugin/plugin.json',
        '.cursor-plugin/plugin.json',
        '.plugin/plugin.json',
        '.kimi-plugin/plugin.json',
      ]) {
        await mkdir(dirname(join(repoRoot, path)), { recursive: true })
        await writeFile(join(repoRoot, path), `${JSON.stringify({ name: 'you', version: '1.2.3' })}\n`)
      }

      for (const path of [
        '.claude-plugin/marketplace.json',
        '.agents/plugins/marketplace.json',
        '.cursor-plugin/marketplace.json',
        '.github/plugin/marketplace.json',
      ]) {
        await mkdir(dirname(join(repoRoot, path)), { recursive: true })
        await writeFile(
          join(repoRoot, path),
          `${JSON.stringify({ name: 'you-com', plugins: [{ name: 'you', version: '1.2.3' }] })}\n`,
        )
      }

      const updates = await createVersionUpdates({ repoRoot, planPath: 'plan.json' })
      const updatedByPath = new Map(updates.map((update) => [update.path, JSON.parse(update.content)]))

      expect(updatedByPath.get('.claude-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.codex-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.cursor-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.kimi-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.claude-plugin/marketplace.json')?.plugins[0].version).toBe('1.2.4')
      expect(updatedByPath.get('.agents/plugins/marketplace.json')?.plugins[0].version).toBe('1.2.4')
      expect(updatedByPath.get('.cursor-plugin/marketplace.json')?.plugins[0].version).toBe('1.2.4')
      expect(updatedByPath.get('.github/plugin/marketplace.json')?.plugins[0].version).toBe('1.2.4')
    } finally {
      await rm(repoRoot, { force: true, recursive: true })
    }
  })

  test('skips missing skills when applying a release plan', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'agent-skills-release-'))

    try {
      await writeFile(
        join(repoRoot, 'plan.json'),
        JSON.stringify({
          schemaVersion: 1,
          baseRef: 'HEAD~1',
          headRef: 'HEAD',
          generatedAt: '2026-07-22T00:00:00.000Z',
          changes: ['skills/deleted-skill/SKILL.md'],
          units: {
            skills: {
              'deleted-skill': {
                bump: 'minor',
                paths: ['skills/deleted-skill/SKILL.md'],
                rationale: ['skill activation or MCP contract changed'],
              },
            },
            plugins: {},
            npm: {},
            pypi: {},
            clawhub: {},
          },
        }),
      )

      const updates = await createVersionUpdates({ repoRoot, planPath: 'plan.json' })

      expect(updates).toEqual([])
    } finally {
      await rm(repoRoot, { force: true, recursive: true })
    }
  })

  test('bumps Hermes PyPI package and plugin versions together', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'agent-skills-release-'))

    try {
      await writeFile(
        join(repoRoot, 'plan.json'),
        JSON.stringify({
          schemaVersion: 1,
          baseRef: 'HEAD~1',
          headRef: 'HEAD',
          generatedAt: '2026-07-22T00:00:00.000Z',
          changes: ['packages/hermes/plugin.yaml'],
          units: {
            skills: {},
            plugins: {},
            npm: {},
            pypi: {
              'hermes-youdotcom': {
                bump: 'minor',
                paths: ['packages/hermes/plugin.yaml'],
                rationale: ['Hermes package changed'],
              },
            },
            clawhub: {},
          },
        }),
      )

      await mkdir(join(repoRoot, 'packages/hermes'), { recursive: true })
      await writeFile(join(repoRoot, 'packages/hermes/pyproject.toml'), 'version = "1.2.3"\n')
      await writeFile(join(repoRoot, 'packages/hermes/package.json'), `${JSON.stringify({ version: '1.2.3' })}\n`)
      await writeFile(join(repoRoot, 'packages/hermes/plugin.yaml'), 'name: youdotcom\nversion: 1.2.3\n')

      const updates = await createVersionUpdates({ repoRoot, planPath: 'plan.json' })
      const updatedByPath = new Map(updates.map((update) => [update.path, update.content]))

      expect(updatedByPath.get('packages/hermes/pyproject.toml')).toContain('version = "1.3.0"')
      expect(JSON.parse(updatedByPath.get('packages/hermes/package.json') ?? '{}').version).toBe('1.3.0')
      expect(updatedByPath.get('packages/hermes/plugin.yaml')).toContain('version: 1.3.0')
    } finally {
      await rm(repoRoot, { force: true, recursive: true })
    }
  })
})
