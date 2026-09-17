import { describe, expect, test } from 'bun:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copySkills, overlaySkills } from '../build.ts'

describe('overlaySkills', () => {
  test('applies per-package overrides on top of the shared tree and leaves other skills untouched', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-plugin-overlay-'))
    const sharedDir = join(tempDir, 'skills')
    const overridesDir = join(tempDir, 'skills-overrides')

    try {
      await Bun.write(join(sharedDir, 'you-web', 'SKILL.md'), '# shared you-web\n')
      await Bun.write(join(sharedDir, 'you-research', 'SKILL.md'), '# shared you-research\n')
      await Bun.write(join(overridesDir, 'you-web', 'SKILL.md'), '# dsh you-web\n')
      await Bun.write(join(overridesDir, 'you-free', 'SKILL.md'), '# should not appear\n')

      await overlaySkills({ skillsDir: sharedDir, overridesDir })

      expect(await Bun.file(join(sharedDir, 'you-web', 'SKILL.md')).text()).toBe('# dsh you-web\n')
      expect(await Bun.file(join(sharedDir, 'you-research', 'SKILL.md')).text()).toBe('# shared you-research\n')
      expect(await Bun.file(join(overridesDir, 'you-free', 'SKILL.md')).exists()).toBe(true)
      expect(await Bun.file(join(sharedDir, 'you-free', 'SKILL.md')).exists()).toBe(false)
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })

  test('is a no-op when the overrides directory does not exist', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-plugin-overlay-'))
    const sharedDir = join(tempDir, 'skills')

    try {
      await Bun.write(join(sharedDir, 'you-web', 'SKILL.md'), '# shared you-web\n')

      await overlaySkills({ skillsDir: sharedDir, overridesDir: join(tempDir, 'does-not-exist') })

      expect(await Bun.file(join(sharedDir, 'you-web', 'SKILL.md')).text()).toBe('# shared you-web\n')
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })
})

describe('copySkills', () => {
  test('excludes named skills from the shared source (excluded skills are not re-copied)', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-plugin-build-'))
    const sourceDir = join(tempDir, 'source')
    const targetDir = join(tempDir, 'target')

    try {
      await Bun.write(join(sourceDir, 'you-web', 'SKILL.md'), '# You Web\n')
      await Bun.write(join(sourceDir, 'you-free', 'SKILL.md'), '# You Free\n')
      await Bun.write(join(targetDir, 'stale-you-free', 'SKILL.md'), '# Stale Free\n')

      const copied = await copySkills({
        sourceSkillsDir: sourceDir,
        targetSkillsDir: targetDir,
        exclude: ['you-free'],
      })

      expect(copied).toBe(1)
      expect((await readdir(targetDir)).sort()).toEqual(['you-web'])
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })
  test('copies skill directories and removes stale generated skills', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-plugin-build-'))
    const sourceDir = join(tempDir, 'source')
    const targetDir = join(tempDir, 'target')

    try {
      await Bun.write(join(sourceDir, 'you-web', 'SKILL.md'), '# You Web\n')
      await Bun.write(join(sourceDir, 'ignored.txt'), 'ignored')
      await Bun.write(join(sourceDir, 'incomplete', 'README.md'), 'ignored')
      await Bun.write(join(targetDir, '.gitkeep'), '')
      await Bun.write(join(targetDir, 'stale-skill', 'SKILL.md'), '# Stale\n')

      const copied = await copySkills({ sourceSkillsDir: sourceDir, targetSkillsDir: targetDir })

      expect(copied).toBe(1)
      expect((await readdir(targetDir)).sort()).toEqual(['.gitkeep', 'you-web'])
      expect(await Bun.file(join(targetDir, 'you-web', 'SKILL.md')).text()).toBe('# You Web\n')
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })
})
