import { copyFile, cp, mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { $ } from 'bun'

// MINIMAL: one web-search submission; add separate reviewed packages for other MCP endpoints.
const root = resolve(import.meta.dir, '..')
const temporary = await mkdtemp(join(tmpdir(), 'you-openai-'))
const stage = join(temporary, 'plugin')
const output = join(root, 'dist', 'you-openai.zip')
try {
  // The archive is a verbatim copy of the checked-in submission package in
  // marketplace/openai plus the allowlisted shared files — no pack-time
  // rewriting, so reviewers read exactly what ships.
  const mcp = await Bun.file(join(root, 'marketplace/openai/mcp.json')).json()
  if (mcp.mcpServers?.you?.url !== 'https://api.you.com/mcp') {
    throw new Error('Review the changed MCP endpoint before packaging')
  }

  await mkdir(join(stage, 'skills'), { recursive: true })
  await mkdir(join(stage, 'assets'), { recursive: true })
  await copyFile(join(root, 'marketplace/openai/plugin.json'), join(stage, 'plugin.json'))
  await copyFile(join(root, 'marketplace/openai/mcp.json'), join(stage, 'mcp.json'))
  await copyFile(join(root, 'assets/you-icon.svg'), join(stage, 'assets/you-icon.svg'))
  await copyFile(join(root, 'LICENSE'), join(stage, 'LICENSE'))
  await cp(join(root, 'skills/you-web'), join(stage, 'skills/you-web'), { recursive: true })

  // Build in a fresh directory so removed files cannot survive from an earlier ZIP.
  await $`zip -qr ${join(temporary, 'you-openai.zip')} .`.cwd(stage)
  await mkdir(join(root, 'dist'), { recursive: true })
  await copyFile(join(temporary, 'you-openai.zip'), `${output}.tmp`)
  await rename(`${output}.tmp`, output)
  console.log(`Created ${output}. Review cases are drafts, not executed results; see docs/openai-submission.md.`)
} finally {
  await rm(temporary, { recursive: true, force: true })
}
