import { describe, expect, test } from 'bun:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copySkills } from '../build.ts'

describe('copySkills', () => {
  test('copies skill directories and removes stale generated skills', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'hermes-skills-build-'))
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
      expect(await readdir(targetDir)).toEqual(['.gitkeep', 'you-web'])
      expect(await Bun.file(join(targetDir, 'you-web', 'SKILL.md')).text()).toBe('# You Web\n')
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })
})
