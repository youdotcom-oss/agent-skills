import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createVersionUpdates, isInitialPackage, isPluginReleasePath } from '../semver-release.ts'

describe('semver release', () => {
  test('classifies plugin manifests and marketplaces as plugin release paths', () => {
    expect(isPluginReleasePath('plugin.json')).toBe(true)
    expect(isPluginReleasePath('mcp.json')).toBe(true)
    expect(isPluginReleasePath('.mcp.json')).toBe(true)
    expect(isPluginReleasePath('.claude-plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.claude-plugin/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('.codex-plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.agents/plugins/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('.cursor-plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.cursor-plugin/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('.plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.github/plugin/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('.grok-plugin/plugin.json')).toBe(true)
    expect(isPluginReleasePath('.grok-plugin/marketplace.json')).toBe(true)
    expect(isPluginReleasePath('marketplace/openai/plugin.json')).toBe(true)
    expect(isPluginReleasePath('marketplace/openai/mcp.json')).toBe(true)
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
            clawhub: {},
          },
        }),
      )

      for (const path of [
        'plugin.json',
        '.claude-plugin/plugin.json',
        '.codex-plugin/plugin.json',
        '.cursor-plugin/plugin.json',
        '.plugin/plugin.json',
        '.kimi-plugin/plugin.json',
        '.grok-plugin/plugin.json',
        'marketplace/openai/plugin.json',
      ]) {
        await mkdir(dirname(join(repoRoot, path)), { recursive: true })
        await writeFile(join(repoRoot, path), `${JSON.stringify({ name: 'you', version: '1.2.3' })}\n`)
      }

      for (const path of [
        '.claude-plugin/marketplace.json',
        '.agents/plugins/marketplace.json',
        '.cursor-plugin/marketplace.json',
        '.github/plugin/marketplace.json',
        '.grok-plugin/marketplace.json',
      ]) {
        await mkdir(dirname(join(repoRoot, path)), { recursive: true })
        await writeFile(
          join(repoRoot, path),
          `${JSON.stringify({ name: 'you-com', plugins: [{ name: 'you', version: '1.2.3' }] })}\n`,
        )
      }

      const updates = await createVersionUpdates({ repoRoot, planPath: 'plan.json' })
      const updatedByPath = new Map(updates.map((update) => [update.path, JSON.parse(update.content)]))

      expect(updatedByPath.get('plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.claude-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.codex-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.cursor-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.kimi-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.grok-plugin/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('marketplace/openai/plugin.json')?.version).toBe('1.2.4')
      expect(updatedByPath.get('.claude-plugin/marketplace.json')?.plugins[0].version).toBe('1.2.4')
      expect(updatedByPath.get('.agents/plugins/marketplace.json')?.plugins[0].version).toBe('1.2.4')
      expect(updatedByPath.get('.cursor-plugin/marketplace.json')?.plugins[0].version).toBe('1.2.4')
      expect(updatedByPath.get('.github/plugin/marketplace.json')?.plugins[0].version).toBe('1.2.4')
      expect(updatedByPath.get('.grok-plugin/marketplace.json')?.plugins[0].version).toBe('1.2.4')
    } finally {
      await rm(repoRoot, { force: true, recursive: true })
    }
  })

  test('classifies all-added package paths as an initial release', () => {
    const statuses = [
      { status: 'A', path: 'packages/dsh-plugin/package.json' },
      { status: 'A', path: 'packages/dsh-plugin/src/index.ts' },
      { status: 'M', path: 'packages/pi/src/index.ts' },
      { status: 'M', path: 'README.md' },
    ]

    expect(isInitialPackage(statuses, 'packages/dsh-plugin')).toBe(true)
    expect(isInitialPackage(statuses, 'packages/pi')).toBe(false)
    expect(isInitialPackage(statuses, 'packages/openclaw')).toBe(false)
    expect(isInitialPackage(statuses, 'packages/missing')).toBe(false)
  })

  test('leaves initial-release package versions untouched when applying a plan', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'agent-skills-release-'))

    try {
      await writeFile(
        join(repoRoot, 'plan.json'),
        JSON.stringify({
          schemaVersion: 1,
          baseRef: 'HEAD~1',
          headRef: 'HEAD',
          generatedAt: '2026-09-16T00:00:00.000Z',
          changes: ['packages/dsh-plugin/src/index.ts'],
          units: {
            skills: {},
            plugins: {},
            npm: {
              '@youdotcom-oss/dsh-plugin': {
                bump: 'initial',
                paths: ['packages/dsh-plugin/src/index.ts'],
                rationale: ['new package: publish declared version as-is'],
              },
            },
            clawhub: {},
          },
        }),
      )

      await mkdir(join(repoRoot, 'packages/dsh-plugin'), { recursive: true })
      await writeFile(
        join(repoRoot, 'packages/dsh-plugin/package.json'),
        `${JSON.stringify({ name: '@youdotcom-oss/dsh-plugin', version: '0.1.0' })}\n`,
      )

      const updates = await createVersionUpdates({ repoRoot, planPath: 'plan.json' })

      expect(updates).toEqual([])
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

  test('plans bump the strands unit for skill and mcp.json changes', async () => {
    const { createReleasePlan } = await import('../semver-release.ts')
    const repoRoot = await mkdtemp(join(tmpdir(), 'agent-skills-plan-'))
    const git = (...args: string[]) => execFileSync('git', ['-C', repoRoot, ...args])
    const planFromWorkingTree = async () => {
      // git diff HEAD covers staged changes but not untracked files, so stage
      // everything before planning — mirroring the committed-tree usage.
      git('add', '-A')
      return createReleasePlan('HEAD', repoRoot)
    }

    try {
      await mkdir(join(repoRoot, 'skills/you-web'), { recursive: true })
      await writeFile(join(repoRoot, 'skills/you-web/SKILL.md'), '---\nmetadata:\n  version: 1.0.0\n---\nbody\n')
      await writeFile(join(repoRoot, 'mcp.json'), '{}\n')
      git('init', '-q')
      git('config', 'user.email', 'test@example.com')
      git('config', 'user.name', 'Test')
      git('add', '-A')
      git('commit', '-q', '-m', 'base')

      // No changes: no strands unit.
      expect((await planFromWorkingTree()).units.strands).toEqual({})

      // Skill instruction change: patch.
      await writeFile(join(repoRoot, 'skills/you-web/SKILL.md'), '---\nmetadata:\n  version: 1.0.0\n---\nnew body\n')
      const patchPlan = await planFromWorkingTree()
      expect(patchPlan.units.strands.youdotcom?.bump).toBe('patch')

      git('commit', '-aqm', 'after-patch')

      // Skill description change: minor (activation contract). Regression
      // guard: changedSkillBump must diff the repo under test, not the
      // default repo root — a clean default repo would fall through to the
      // 'patch' default and mask the wrong-repo diff.
      await writeFile(
        join(repoRoot, 'skills/you-web/SKILL.md'),
        '---\nmetadata:\n  version: 1.0.0\ndescription: new description\n---\nnew body\n',
      )
      const descriptionPlan = await planFromWorkingTree()
      expect(descriptionPlan.units.strands.youdotcom?.bump).toBe('minor')

      git('commit', '-aqm', 'after-description')

      // New skill: minor.
      await mkdir(join(repoRoot, 'skills/you-new'), { recursive: true })
      await writeFile(join(repoRoot, 'skills/you-new/SKILL.md'), '---\nmetadata:\n  version: 1.0.0\n---\nnew\n')
      const minorPlan = await planFromWorkingTree()
      expect(minorPlan.units.strands.youdotcom?.bump).toBe('minor')

      git('commit', '-aqm', 'after-minor')

      // mcp.json change: patch.
      await writeFile(join(repoRoot, 'mcp.json'), '{"mcpServers":{}}\n')
      const mcpPlan = await planFromWorkingTree()
      expect(mcpPlan.units.strands.youdotcom?.bump).toBe('patch')

      git('commit', '-aqm', 'after-mcp')

      // Deleted skill: minor, from the deletion itself.
      await rm(join(repoRoot, 'skills/you-new'), { recursive: true })
      const deletePlan = await planFromWorkingTree()
      expect(deletePlan.units.strands.youdotcom?.bump).toBe('minor')
    } finally {
      await rm(repoRoot, { force: true, recursive: true })
    }
  }, 30_000)

  test('plans with a strands unit apply cleanly', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'agent-skills-release-'))

    try {
      await mkdir(join(repoRoot, 'skills/you-web'), { recursive: true })
      await writeFile(join(repoRoot, 'skills/you-web/SKILL.md'), '---\nmetadata:\n  version: 1.0.0\n---\nbody\n')
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
            plugins: {},
            npm: {},
            clawhub: {},
            strands: {
              youdotcom: {
                bump: 'patch',
                paths: ['skills/you-web/SKILL.md'],
                rationale: ['skill you-web changed'],
              },
            },
          },
        }),
      )

      const updates = await createVersionUpdates({ repoRoot, planPath: 'plan.json' })

      // Strands units pass validation but produce no version updates here —
      // the strands repo bumps and publishes on its own when dispatched.
      expect(updates).toEqual([])
    } finally {
      await rm(repoRoot, { force: true, recursive: true })
    }
  })
})
