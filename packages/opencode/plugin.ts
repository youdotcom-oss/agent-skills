import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type Mcp, Plugin, type Skill } from '@opencode/plugin'

const YOU_COM_MCP_SERVERS = {
  you: 'https://api.you.com/mcp',
  'you-free': 'https://api.you.com/mcp?profile=free',
  'you-finance': 'https://api.you.com/mcp/finance',
  'you-research': 'https://api.you.com/mcp/research',
  'you-docs': 'https://you.com/docs/_mcp/server',
} as const

const skillsDir = join(import.meta.dirname, 'skills')

type BundledSkill = { id: string; name: string; description?: string; path: string; content: string }

const parseFrontmatter = (source: string): { name?: string; description?: string; body: string } => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match?.[1]) return { body: source }
  const attributes: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^([\w-]+):\s*(.*)$/.exec(line.trim())
    if (!entry?.[1] || !entry[2]) continue
    attributes[entry[1]] = entry[2].replace(/^['"]|['"]$/g, '')
  }
  return { name: attributes.name, description: attributes.description, body: source.slice(match[0].length) }
}

/** Reads each bundled skill's SKILL.md before transform registration, per the V2
 * guidance that transform callbacks must stay synchronous and side-effect free. */
const loadBundledSkills = async (): Promise<BundledSkill[]> => {
  const entries = await readdir(skillsDir, { withFileTypes: true })
  const skills: BundledSkill[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const file = join(skillsDir, entry.name, 'SKILL.md')
    const parsed = parseFrontmatter(await readFile(file, 'utf8'))
    skills.push({
      id: entry.name,
      name: parsed.name ?? entry.name,
      description: parsed.description,
      // MINIMAL: the V2 docs describe `path` as "the skill's base directory";
      // verified against OpenCode 2.0.27, which serves the skill with this
      // directory as its base for supporting files.
      path: join(skillsDir, entry.name),
      content: parsed.body,
    })
  }
  return skills
}

export default Plugin.define({
  id: 'youdotcom',
  async setup(ctx) {
    await ctx.mcp.transform((editor) => {
      for (const [name, url] of Object.entries(YOU_COM_MCP_SERVERS)) {
        // MINIMAL: `oauth` is omitted because OpenCode 2 enables OAuth for
        // remote servers by default; pass an OAuthConfig here only if a
        // server needs pre-registered client credentials.
        const config: Mcp.ServerConfig = { type: 'remote', url }
        editor.set(name, config)
      }
    })

    const skills = await loadBundledSkills()
    await ctx.skill.transform((editor) => {
      for (const skill of skills) editor.add(skill as unknown as Skill.Info)
    })
  },
})
