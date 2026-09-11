import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copySkills } from '../build.ts'

describe('copySkills', () => {
  test('converts skill metadata to OpenClaw JSON metadata during copy', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'hermes-skills-build-'))
    const sourceDir = join(tempDir, 'source')
    const targetDir = join(tempDir, 'target')

    try {
      await Bun.write(
        join(sourceDir, 'you-web', 'SKILL.md'),
        `---
name: you-web
description: Use You.com MCP tools.
metadata:
  author: youdotcom-oss
  version: 0.0.1
  category: web-search-tools
  keywords: you.com,openclaw,web-search
---

# You Web
`,
      )

      await copySkills({ sourceSkillsDir: sourceDir, targetSkillsDir: targetDir })

      const copiedSkill = await Bun.file(join(targetDir, 'you-web', 'SKILL.md')).text()
      expect(copiedSkill).toContain(
        'metadata: {"openclaw":{"emoji":"🔍","primaryEnv":"YDC_API_KEY"},"author":"youdotcom-oss","version":"0.0.1","category":"web-search-tools","keywords":"you.com,openclaw,web-search"}',
      )
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })
})
