/**
 * Orchestrator for skill generation evals.
 *
 * @remarks
 * Cleans generated dirs, runs the agent eval harness, and produces a
 * markdown summary via Claude. Supports --skill, -j, and --summary-only flags.
 *
 * Usage:
 *   bun scripts/run.ts                        # run all 7 skills
 *   bun scripts/run.ts --skill <id>           # run a single skill
 *   bun scripts/run.ts -j 4                   # parallel (4 workers)
 *   bun scripts/run.ts --summary-only         # regenerate RESULTS.md only
 *
 * @public
 */

import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

const ROOT = import.meta.dir.replace(/\/scripts$/, '')
const PROMPTS_FILE = join(ROOT, 'data/prompts/prompts.jsonl')
const RESULTS_FILE = join(ROOT, 'data/results/results.jsonl')
const RESULTS_MD = join(ROOT, 'data/RESULTS.md')
const SCHEMA_FILE = join(ROOT, 'scripts/claude-code.json')
const GRADER_FILE = join(ROOT, 'scripts/grader.ts')

// ── CLI arg parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const skillFlag = args.indexOf('--skill')
const skillId = skillFlag !== -1 ? args[skillFlag + 1] : null
const concurrencyFlag = args.indexOf('-j')
const concurrency = concurrencyFlag !== -1 ? args[concurrencyFlag + 1] : null
const summaryOnly = args.includes('--summary-only')

// ── Step 1: Clean generated dirs ────────────────────────────────────────────

const clean = async () => {
  console.log('Cleaning test directories...')
  await Bun.$`find ${ROOT}/tests -mindepth 2 -not -name '.gitkeep' -delete`.nothrow()
  console.log('Done.')
}

// ── Step 2: Filter prompts for --skill flag ──────────────────────────────────

const buildPromptFile = async (): Promise<string> => {
  if (!skillId) return PROMPTS_FILE

  const content = await Bun.file(PROMPTS_FILE).text()
  const lines = content.trim().split('\n')
  const filtered = lines.filter((line) => {
    try {
      const entry = JSON.parse(line) as { id: string }
      return entry.id === skillId
    } catch {
      return false
    }
  })

  if (filtered.length === 0) {
    console.error(`No prompt entry found for skill: ${skillId}`)
    console.error(`Available IDs: ${lines.map((l) => (JSON.parse(l) as { id: string }).id).join(', ')}`)
    process.exit(1)
  }

  const tmpFile = join(ROOT, 'data/results/.tmp-prompts.jsonl')
  await Bun.write(tmpFile, `${filtered.join('\n')}\n`)
  return tmpFile
}

// ── Step 3: Run harness ──────────────────────────────────────────────────────

const runHarness = async (promptFile: string) => {
  console.log(`\nRunning harness with prompts: ${promptFile}`)

  const cmd = [
    'bunx',
    '@plaited/agent-eval-harness',
    'capture',
    promptFile,
    '--schema',
    SCHEMA_FILE,
    '--grader',
    GRADER_FILE,
    '-o',
    RESULTS_FILE,
    '--progress',
    '-t',
    '900000',
  ]

  if (concurrency) {
    cmd.push('-j', concurrency)
  }

  console.log(`Command: ${cmd.join(' ')}\n`)

  // Unset CLAUDECODE so Claude CLI can launch nested sessions without error
  const env = { ...process.env }
  delete env.CLAUDECODE

  const result = await Bun.$`${cmd}`.cwd(ROOT).env(env).nothrow()

  if (result.exitCode !== 0) {
    console.error('Harness exited with code', result.exitCode)
    console.error(result.stderr.toString())
  }
}

// ── Step 4: Generate RESULTS.md ──────────────────────────────────────────────

const generateSummary = async () => {
  const resultsFileObj = Bun.file(RESULTS_FILE)
  if (!(await resultsFileObj.exists())) {
    console.warn('No results.jsonl found — skipping summary generation.')
    return
  }

  const content = await resultsFileObj.text()
  const lines = content.trim().split('\n').filter(Boolean)

  if (lines.length === 0) {
    console.warn('results.jsonl is empty — skipping summary generation.')
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set — skipping LLM summary. Generating basic summary instead.')
    await generateBasicSummary(lines)
    return
  }

  console.log('\nGenerating RESULTS.md via Claude...')

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are summarizing agent skill evaluation results. These evals test whether an AI coding agent (Claude Code) correctly generates integration code using various SDKs and MCP servers.

Each result entry is a JSON line from results.jsonl. The score is 0.0-1.0 (pass threshold: 0.65).

Results:
${lines.join('\n')}

Generate a markdown report with:
1. Overall pass rate (X/7 skills)
2. A table: | Skill | Pass | Score | Notes |
3. Notable failure patterns
4. Recommendations for improving failing skills

Keep it concise. Focus on actionable insights.`,
      },
    ],
  })

  const firstContent = message.content[0]
  const summaryText = firstContent?.type === 'text' ? firstContent.text : 'Summary generation failed.'

  const timestamp = new Date().toISOString()
  const md = `# Skill Eval Results\n\n_Generated: ${timestamp}_\n\n${summaryText}\n`
  await Bun.write(RESULTS_MD, md)
  console.log(`Summary written to ${RESULTS_MD}`)
}

const generateBasicSummary = async (lines: string[]) => {
  // CaptureResult.score holds the full GraderResult object (not a raw number)
  type GraderResult = { pass: boolean; score: number; reasoning?: string }
  type ResultEntry = { id: string; score?: GraderResult }
  const entries = lines.map((l) => JSON.parse(l) as ResultEntry)
  const passed = entries.filter((e) => e.score?.pass).length
  const total = entries.length

  const rows = entries
    .map((e) => {
      const gr = e.score
      const passStr = gr?.pass ? 'PASS' : 'FAIL'
      const scoreStr = gr ? `${(gr.score * 100).toFixed(0)}%` : 'N/A'
      const notes = (gr?.reasoning ?? '').slice(0, 80)
      return `| ${e.id} | ${passStr} | ${scoreStr} | ${notes} |`
    })
    .join('\n')

  const timestamp = new Date().toISOString()
  const md = `# Skill Eval Results\n\n_Generated: ${timestamp}_\n\n## Overall: ${passed}/${total} skills passing\n\n| Skill | Pass | Score | Notes |\n|-------|------|-------|-------|\n${rows}\n`
  await Bun.write(RESULTS_MD, md)
  console.log(`Basic summary written to ${RESULTS_MD}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (summaryOnly) {
  await generateSummary()
} else {
  await clean()
  const promptFile = await buildPromptFile()
  await runHarness(promptFile)
  await generateSummary()
}
