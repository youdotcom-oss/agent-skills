/**
 * LLM-as-judge grader for skill generation evals.
 *
 * @remarks
 * Runs the integration tests, collects the output and generated files,
 * then asks Haiku to assess pass/fail and score (0.0–1.0).
 *
 * @public
 */

import { join, resolve } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { Grader } from '@plaited/agent-eval-harness/schemas'

const SAFE_CWD_PATTERN = /^[a-zA-Z0-9_./-]+$/

export const grade: Grader = async ({ input, output, metadata }) => {
  const rawCwd = metadata?.cwd as string | undefined
  const language = (metadata?.language as string | undefined) ?? 'typescript'

  if (!rawCwd || !SAFE_CWD_PATTERN.test(rawCwd) || rawCwd.includes('..')) {
    return {
      pass: false,
      score: 0,
      reasoning: `Invalid or missing metadata.cwd: ${rawCwd}`,
    }
  }

  const testDir = resolve(rawCwd)
  const isTs = language === 'typescript'

  // ── Run tests ────────────────────────────────────────────────────────────
  const testResult = isTs
    ? await Bun.$`bun test`
        .cwd(testDir)
        .env({ ...process.env })
        .nothrow()
    : await Bun.$`uv run pytest`
        .cwd(testDir)
        .env({ ...process.env, UV_NO_PROGRESS: '1' })
        .nothrow()

  const testOutput = (testResult.stdout.toString() + testResult.stderr.toString()).slice(0, 3000)

  const testsPassed = testResult.exitCode === 0

  // ── Collect generated files ──────────────────────────────────────────────
  let generatedFiles = ''

  try {
    const glob = new Bun.Glob('**/*.{ts,py,js}')
    for await (const file of glob.scan({ cwd: testDir })) {
      const content = await Bun.file(join(testDir, file)).text()
      generatedFiles += `\n### ${file}\n\`\`\`\n${content.slice(0, 1500)}\n\`\`\`\n`
    }
  } catch {
    generatedFiles = '(no generated files found)'
  }

  // ── LLM judge ────────────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      pass: testsPassed,
      score: testsPassed ? 1 : 0,
      reasoning: 'LLM judge skipped (no API key) — test exit code used.',
    }
  }

  const promptText = Array.isArray(input) ? input.join('\n---\n') : input
  const client = new Anthropic()

  let judgePass = false
  let judgeScore = 0
  let judgeReasoning = 'LLM judge failed'

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are evaluating AI-generated integration code for correctness.

IMPORTANT: The test results below are ground truth — they ran real API calls against live services. If tests passed (exit code 0), the code WORKS with real packages and real endpoints. Do not second-guess whether packages exist or endpoints are real; the test output proves they do.

## Task prompt given to the agent
${promptText.slice(0, 1000)}

## Agent's final response
${output.slice(0, 1000)}

## Generated files (what the agent wrote to disk)
${generatedFiles || '(none)'}

## Test output (exit code: ${testResult.exitCode})
\`\`\`
${testOutput}
\`\`\`

Assess whether the agent successfully completed the integration task:
- Did it generate the required files?
- Do the tests pass? (If exit code 0 with passing tests, the integration works — score high)
- Does the test output show real API calls (non-trivial durations like 1000ms+)?
- Are there any obvious structural issues (missing exports, wrong file names, no tests at all)?

If tests pass with real timings, score 0.85–1.0. Only score below 0.65 if tests failed or no files were generated.

Respond with ONLY valid JSON:
{"pass": <true|false>, "score": <0.0-1.0>, "reasoning": "<2-3 sentences summarizing your assessment>"}`,
        },
      ],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        pass: boolean
        score: number
        reasoning: string
      }
      judgePass = Boolean(parsed.pass)
      judgeScore = Math.min(1, Math.max(0, Number(parsed.score)))
      judgeReasoning = parsed.reasoning ?? ''
    }
  } catch {
    judgeReasoning = 'LLM judge failed (API error) — test exit code used as ground truth'
    judgePass = testsPassed
    judgeScore = testsPassed ? 1.0 : 0
  }

  return {
    pass: judgePass,
    score: judgeScore,
    reasoning: judgeReasoning,
    outcome: {
      testsPassed,
      testOutput: testOutput.slice(0, 500),
      language,
      type: 'skill_generation',
    },
  }
}
