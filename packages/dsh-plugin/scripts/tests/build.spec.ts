import { describe, expect, test } from 'bun:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copySkills } from '../build.ts'

describe('copySkills', () => {
  test('excludes named skills from the shared source (excluded skills are not re-copied)', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'dsh-plugin-build-'))
    const sourceDir = join(tempDir, 'source')
    const targetDir = join(tempDir, 'target')

    try {
      await Bun.write(join(sourceDir, 'you-web', 'SKILL.md'), '# You Web\n')
      await Bun.write(join(sourceDir, 'you-free', 'SKILL.md'), '# You Free\n')
      await Bun.write(join(sourceDir, 'you-research', 'SKILL.md'), '# You Research\n')
      await Bun.write(join(targetDir, 'stale-you-free', 'SKILL.md'), '# Stale Free\n')

      const copied = await copySkills({
        sourceSkillsDir: sourceDir,
        targetSkillsDir: targetDir,
        exclude: ['you-free', 'you-web'],
      })

      expect(copied).toBe(1)
      expect((await readdir(targetDir)).sort()).toEqual(['you-research'])
      expect(await Bun.file(join(targetDir, 'you-research', 'SKILL.md')).text()).toBe('# You Research\n')
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
