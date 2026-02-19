# Inline Graders

Inline graders score individual agent outputs in isolation. Each input/output pair is graded independently, producing a pass/fail result with a score.

## Grader Interface

```typescript
import type { Grader } from '@plaited/agent-eval-harness/schemas'

type GraderInput = {
  input: string | string[]      // Original prompt(s)
  output: string                // Agent output
  hint?: string                 // Grader context/expectation
  trajectory?: TrajectoryStep[] // Execution trace
  metadata?: Record<string, unknown> // Optional metadata from prompt
  cwd?: string                  // Working directory (for git-based grading)
}

type GraderResult = {
  pass: boolean                 // Did it pass?
  score: number                // 0.0 to 1.0
  reasoning?: string           // Explanation
  outcome?: Record<string, unknown> // Structured outcome data (merged onto result)
}
```

## Building an Inline Grader

### Step 1: Export the Schema

Get the JSON Schema for validation in any language:

```bash
agent-eval-harness schemas GraderResult --json -o grader-result.json
```

### Step 2: Create the Grader

**TypeScript (recommended):**

```typescript
// my-grader.ts
import type { Grader } from '@plaited/agent-eval-harness/schemas'

export const grade: Grader = async ({ input, output, hint, trajectory, metadata }) => {
  // Your scoring logic here
  const pass = evaluateOutput(output, hint)

  return {
    pass,
    score: pass ? 1.0 : 0.0,
    reasoning: pass ? 'Meets criteria' : 'Does not meet criteria'
  }
}

const evaluateOutput = (output: string, hint?: string): boolean => {
  if (!hint) return true
  return output.toLowerCase().includes(hint.toLowerCase())
}
```

**Python:**

```python
#!/usr/bin/env python3
import json
import sys

data = json.load(sys.stdin)
output = data.get("output", "").lower()
hint = (data.get("hint") or "").lower()

pass_result = hint in output if hint else True

print(json.dumps({
    "pass": pass_result,
    "score": 1.0 if pass_result else 0.0,
    "reasoning": "Contains hint" if pass_result else "Missing hint"
}))
```

### Step 3: Use the Grader

```bash
# With capture command
agent-eval-harness capture prompts.jsonl --schema ./claude.json --grader ./my-grader.ts -o results.jsonl

# With grade command (pipeline)
agent-eval-harness grade extracted.jsonl --grader ./my-grader.ts -o graded.jsonl

# With trials command
agent-eval-harness trials prompts.jsonl --schema ./claude.json -k 5 --grader ./my-grader.ts -o trials.jsonl
```

## Git-Based Outcome Grading

The most powerful grading pattern for coding agents: use Git to detect actual environmental changes, not just check the agent's output text.

### Why Git-Based Grading?

**Grade outcomes, not paths.** Anthropic's eval framework emphasizes grading final environmental state, not procedural steps. Git provides the perfect oracle:

- **Universal** - Works in any git repo, any language
- **Precise** - Shows exactly what files changed
- **Zero config** - No complex outcome schemas needed
- **Debuggable** - `git diff` shows what happened

### The `cwd` Parameter

Graders receive an optional `cwd` parameter - the working directory where the agent executed:

```typescript
export const grade: Grader = async ({ input, output, hint, trajectory, metadata, cwd }) => {
  // cwd is the session's working directory
  // Use it to run git commands and detect outcomes
}
```

### The `outcome` Field

Graders can return an optional `outcome` field with structured data about what changed:

```typescript
return {
  pass: true,
  score: 1.0,
  reasoning: 'Created Button.tsx with valid syntax',
  outcome: {  // ← Optional: structured outcome data
    filesCreated: ['src/components/Button.tsx'],
    validSyntax: true,
    type: 'file_creation'
  }
}
```

The harness merges this `outcome` onto the capture result, making it available for downstream analysis.

### Pattern 1: File Creation

**Task:** "Create a button component"

```typescript
import type { Grader } from '@plaited/agent-eval-harness/schemas'

export const grade: Grader = async ({ output, hint, cwd }) => {
  if (!cwd) {
    return { pass: false, score: 0, reasoning: 'No working directory provided' }
  }

  // Detect what files were created using git
  const status = await Bun.$`git -C ${cwd} status --porcelain`.text()
  
  const filesCreated = status
    .split('\n')
    .filter(line => line.startsWith('??'))  // ?? = untracked files
    .map(line => line.slice(3))
  
  const buttonFileCreated = filesCreated.some(f => 
    f.toLowerCase().includes('button')
  )
  
  // Check if file has valid syntax
  let validSyntax = true
  if (buttonFileCreated) {
    const tscCheck = await Bun.$`cd ${cwd} && npx tsc --noEmit`.nothrow()
    validSyntax = tscCheck.exitCode === 0
  }
  
  return {
    pass: buttonFileCreated && validSyntax,
    score: (buttonFileCreated ? 0.5 : 0) + (validSyntax ? 0.5 : 0),
    reasoning: `Files created: ${filesCreated.join(', ')}. Valid syntax: ${validSyntax}`,
    outcome: {  // ← Structured outcome for analysis
      filesCreated,
      validSyntax,
      type: 'file_creation'
    }
  }
}
```

### Pattern 2: Test Fixing

**Task:** "Fix the failing tests in auth.spec.ts"

```typescript
export const grade: Grader = async ({ output, cwd }) => {
  if (!cwd) return { pass: false, score: 0, reasoning: 'No cwd' }
  
  // Run tests to verify they pass
  const testResult = await Bun.$`cd ${cwd} && bun test`.nothrow()
  const testsPassed = testResult.exitCode === 0
  
  // Check what files were modified
  const diff = await Bun.$`git -C ${cwd} diff --name-only`.text()
  const filesModified = diff.split('\n').filter(Boolean)
  
  return {
    pass: testsPassed,
    score: testsPassed ? 1 : 0,
    reasoning: testsPassed 
      ? `Tests passed. Modified: ${filesModified.join(', ')}`
      : `Tests failed: ${testResult.stderr.toString().slice(0, 200)}`,
    outcome: {
      testsPassed,
      exitCode: testResult.exitCode,
      filesModified,
      type: 'test_execution'
    }
  }
}
```

### Pattern 3: Non-Breaking Changes

**Task:** "Refactor the authentication flow without breaking existing tests"

```typescript
export const grade: Grader = async ({ output, cwd }) => {
  if (!cwd) return { pass: false, score: 0, reasoning: 'No cwd' }
  
  // Verify tests still pass
  const testResult = await Bun.$`cd ${cwd} && bun test`.nothrow()
  const testsPassed = testResult.exitCode === 0
  
  // Check what files changed
  const diff = await Bun.$`git -C ${cwd} diff --name-only`.text()
  const changedFiles = diff.split('\n').filter(Boolean)
  
  // Define critical files that shouldn't be touched
  const touchedCriticalFiles = changedFiles.some(f => 
    f.includes('package.json') || 
    f.includes('tsconfig.json') ||
    f.includes('.env')
  )
  
  return {
    pass: testsPassed && !touchedCriticalFiles,
    score: testsPassed ? (touchedCriticalFiles ? 0.5 : 1) : 0,
    reasoning: `Tests: ${testsPassed ? 'pass' : 'fail'}. Changed: ${changedFiles.join(', ')}. Critical files touched: ${touchedCriticalFiles}`,
    outcome: {
      testsPassed,
      filesModified: changedFiles,
      touchedCriticalFiles,
      type: 'refactoring_safety'
    }
  }
}
```

### Pattern 4: Code Quality

**Task:** "Add TypeScript types to the API functions"

```typescript
export const grade: Grader = async ({ output, cwd }) => {
  if (!cwd) return { pass: false, score: 0, reasoning: 'No cwd' }
  
  // Check type errors before
  const beforeErrors = await Bun.$`cd ${cwd} && git stash && npx tsc --noEmit 2>&1 | grep -c "error TS" || echo 0`.text()
  await Bun.$`cd ${cwd} && git stash pop`.nothrow()
  
  // Check type errors after
  const afterErrors = await Bun.$`cd ${cwd} && npx tsc --noEmit 2>&1 | grep -c "error TS" || echo 0`.text()
  
  const errorsBefore = parseInt(beforeErrors.trim())
  const errorsAfter = parseInt(afterErrors.trim())
  const improved = errorsAfter < errorsBefore
  
  return {
    pass: improved,
    score: Math.max(0, (errorsBefore - errorsAfter) / errorsBefore),
    reasoning: `Type errors: ${errorsBefore} → ${errorsAfter}`,
    outcome: {
      errorsBefore,
      errorsAfter,
      improved,
      type: 'code_quality'
    }
  }
}
```

### Pattern 5: Build Success

**Task:** "Fix the build errors"

```typescript
export const grade: Grader = async ({ output, cwd }) => {
  if (!cwd) return { pass: false, score: 0, reasoning: 'No cwd' }
  
  // Try to build
  const buildResult = await Bun.$`cd ${cwd} && bun run build`.nothrow()
  const buildSucceeded = buildResult.exitCode === 0
  
  // Check what was changed
  const diff = await Bun.$`git -C ${cwd} diff --stat`.text()
  
  return {
    pass: buildSucceeded,
    score: buildSucceeded ? 1 : 0,
    reasoning: buildSucceeded 
      ? `Build succeeded. Changes:\n${diff}`
      : `Build failed: ${buildResult.stderr.toString().slice(0, 300)}`,
    outcome: {
      buildSucceeded,
      exitCode: buildResult.exitCode,
      diffStat: diff,
      type: 'build_verification'
    }
  }
}
```

### Fallback for Non-Git Repos

Always check if git is available before using git commands:

```typescript
export const grade: Grader = async ({ output, hint, cwd }) => {
  // Check if we're in a git repo
  if (cwd) {
    const isGit = await Bun.$`git -C ${cwd} rev-parse --git-dir 2>/dev/null`.nothrow()
    
    if (isGit.exitCode === 0) {
      // Use git-based grading
      const status = await Bun.$`git -C ${cwd} status --porcelain`.text()
      // ... git-based logic
    }
  }
  
  // Fall back to output-based grading
  const pass = hint ? output.toLowerCase().includes(hint.toLowerCase()) : true
  return {
    pass,
    score: pass ? 1 : 0,
    reasoning: cwd ? 'Git not available, using output matching' : 'No cwd provided'
  }
}
```

### Best Practices for Git-Based Grading

1. **Always check for `cwd`** - It's an optional parameter
2. **Validate paths for security** - See security notes below
3. **Use `.nothrow()`** - Don't let failed commands crash the grader
4. **Grade outcomes, not paths** - Check if tests pass, not which tools were used
5. **Return structured outcomes** - Makes downstream analysis easier
6. **Keep repos clean** - Run evals in clean working directories (`git status` should be clean)
7. **Include reasoning** - Explain what git detected and why it passed/failed
8. **Handle non-git gracefully** - Provide fallback logic for non-git environments

### Security Considerations

**IMPORTANT:** When using the `cwd` parameter in shell commands, validate paths to prevent command injection.

```typescript
import { resolve } from 'node:path'

const isValidPath = (path: string): boolean => {
  // Reject paths with shell metacharacters
  const dangerousChars = /[;&|`$(){}[\]<>'"\\]/
  if (dangerousChars.test(path)) {
    return false
  }
  
  // Reject directory traversal and option injection
  if (path.includes('..') || path.startsWith('-')) {
    return false
  }
  
  return true
}

export const grade: Grader = async ({ cwd }) => {
  if (!cwd || !isValidPath(cwd)) {
    return { pass: false, score: 0, reasoning: 'Invalid path' }
  }
  
  // Normalize path to prevent traversal
  const safeCwd = resolve(cwd)
  
  // Now safe to use in shell commands
  const result = await Bun.$`git -C ${safeCwd} status --porcelain`.text()
  // ...
}
```

**Trust boundary:** The `cwd` parameter typically comes from trusted sources (`process.cwd()`, CLI `--cwd` flag). If accepting paths from untrusted sources (e.g., JSONL metadata), always validate before using in shell commands.

### Git Status Detection Scope

The examples above detect:
- **Untracked files** (`??`) - New files not yet staged
- **Modified files** (`M` or ` M`) - Changed tracked files

Not included in basic examples:
- **Staged files** (`A`) - Files added to index
- **Renamed files** (`R`) - Files moved/renamed
- **Deleted files** (`D`) - Files removed
- **Copied files** (`C`) - Files duplicated

For comprehensive detection, parse all `git status --porcelain` codes. See `git status --help` for complete format specification.

### Performance Note

**Git-based grading has higher latency than output-based grading** because each grader invocation spawns multiple git processes (typically 2-3 per evaluation). For large evaluation batches:

- Output-based grading: ~1-5ms per evaluation
- Git-based grading: ~50-200ms per evaluation (depending on repo size)

Use git-based grading when environmental outcomes matter more than speed. For high-throughput scenarios, consider batching or caching strategies.

### Outcome Field Benefits

When graders return the `outcome` field, it's merged onto the capture result:

```jsonl
{
  "id": "create-button",
  "input": "Create a button component",
  "output": "I created Button.tsx with a reusable button component.",
  "trajectory": [...],
  "pass": true,
  "score": 1,
  "reasoning": "Files created: src/Button.tsx. Valid syntax: true",
  "outcome": {
    "filesCreated": ["src/Button.tsx"],
    "validSyntax": true,
    "type": "file_creation"
  }
}
```

This enables powerful downstream analysis:

```bash
# Find all test-fixing tasks
cat results.jsonl | jq 'select(.outcome.type == "test_execution")'

# Calculate test pass rate
cat results.jsonl | jq -s 'map(select(.outcome.testsPassed)) | length'

# Identify refactoring tasks that touched critical files
cat results.jsonl | jq 'select(.outcome.touchedCriticalFiles == true)'
```

## Grading Patterns

### Hint-Based Matching

Simple pattern for checking if output contains expected content:

```typescript
export const grade: Grader = async ({ output, hint }) => {
  if (!hint) {
    return { pass: true, score: 1.0, reasoning: 'No hint provided' }
  }

  const contains = output.toLowerCase().includes(hint.toLowerCase())
  return {
    pass: contains,
    score: contains ? 1.0 : 0.0,
    reasoning: contains ? 'Output contains hint' : 'Output missing hint'
  }
}
```

### Multi-Criteria Scoring

Score based on multiple independent criteria:

```typescript
export const grade: Grader = async ({ output, hint, trajectory }) => {
  let score = 0
  const reasons: string[] = []

  // Criterion 1: Contains hint
  if (hint && output.toLowerCase().includes(hint.toLowerCase())) {
    score += 0.4
    reasons.push('Contains expected content')
  }

  // Criterion 2: No tool errors
  const hasErrors = trajectory?.some(s =>
    s.type === 'tool_call' && s.status === 'error'
  )
  if (!hasErrors) {
    score += 0.3
    reasons.push('No tool errors')
  }

  // Criterion 3: Efficient execution
  const toolCount = trajectory?.filter(s => s.type === 'tool_call').length ?? 0
  if (toolCount <= 5) {
    score += 0.3
    reasons.push(`Efficient (${toolCount} tools)`)
  }

  return {
    pass: score >= 0.7,
    score,
    reasoning: reasons.join('; ') || 'Failed all criteria'
  }
}
```

### Metadata-Based Grading

Use metadata for category-specific scoring logic:

```typescript
export const grade: Grader = async ({ output, hint, metadata }) => {
  const category = (metadata?.category as string) ?? 'general'
  const difficulty = (metadata?.difficulty as string) ?? 'medium'

  // Apply different criteria based on category
  if (category === 'code') {
    // Code tasks require syntax validation
    const hasCodeBlock = /```[\s\S]*?```/.test(output)
    if (!hasCodeBlock) {
      return { pass: false, score: 0.0, reasoning: 'Code category requires code block' }
    }
  } else if (category === 'web-search') {
    // Web search tasks require sources
    const hasSources = /source:/i.test(output) || /https?:\/\//.test(output)
    if (!hasSources) {
      return { pass: false, score: 0.5, reasoning: 'Web search should cite sources' }
    }
  }

  // Adjust score threshold by difficulty
  const baseScore = hint ? (output.toLowerCase().includes(hint.toLowerCase()) ? 1.0 : 0.0) : 1.0
  const threshold = difficulty === 'hard' ? 0.9 : difficulty === 'easy' ? 0.6 : 0.7

  return {
    pass: baseScore >= threshold,
    score: baseScore,
    reasoning: `Category: ${category}, Difficulty: ${difficulty}`
  }
}
```

### Trajectory-Based Grading

Analyze the execution path, not just the output:

```typescript
export const grade: Grader = async ({ trajectory }) => {
  const toolCalls = trajectory?.filter(s => s.type === 'tool_call') ?? []

  // Check for required tool usage
  const usedWrite = toolCalls.some(t => t.name === 'Write')
  const usedRead = toolCalls.some(t => t.name === 'Read')

  if (!usedWrite || !usedRead) {
    return {
      pass: false,
      score: 0.0,
      reasoning: `Missing required tools: ${!usedWrite ? 'Write' : ''} ${!usedRead ? 'Read' : ''}`
    }
  }

  return {
    pass: true,
    score: 1.0,
    reasoning: 'Used required Read and Write tools'
  }
}
```

### LLM-as-Judge

Use an LLM for semantic evaluation:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { Grader } from '@plaited/agent-eval-harness/schemas'

const client = new Anthropic()

export const grade: Grader = async ({ input, output, hint }) => {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Evaluate this agent output.

Task: ${Array.isArray(input) ? input.join(' → ') : input}
${hint ? `Expected: ${hint}` : ''}

Agent output:
${output}

Did the agent correctly complete the task? Respond as JSON only:
{"pass": true/false, "score": 0.0-1.0, "reasoning": "brief explanation"}`
    }]
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  try {
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
  } catch {
    return { pass: false, score: 0, reasoning: 'Failed to parse LLM response' }
  }
}
```

## Detection Logic

The harness determines grader type by file extension:

| Extension | Treatment |
|-----------|-----------|
| `.ts`, `.js`, `.mjs`, `.cjs` | Import as ES module |
| Everything else (`.py`, `.sh`, etc.) | Execute as subprocess |

## Executable Protocol

For non-JavaScript graders, use stdin/stdout JSON:

**Input (stdin):**
```json
{
  "input": "Find the CEO of Anthropic",
  "output": "The CEO of Anthropic is Dario Amodei.",
  "hint": "Dario Amodei",
  "trajectory": [...],
  "metadata": {"category": "web-search", "difficulty": "easy"},
  "cwd": "/path/to/working/directory"
}
```

**Output (stdout):**
```json
{
  "pass": true,
  "score": 1.0,
  "reasoning": "Output contains expected name",
  "outcome": {
    "method": "semantic_match",
    "confidence": 0.95
  }
}
```

**Exit codes:**
- `0` = Success (result parsed from stdout)
- Non-zero = Error (stderr used for error message)

## Testing Graders

Test independently before using with the harness:

```bash
# TypeScript
echo '{"input":"test","output":"hello world","hint":"world"}' | bun run ./my-grader.ts

# Python
echo '{"input":"test","output":"hello world","hint":"world"}' | ./grader.py

# Shell
echo '{"input":"test","output":"hello world","hint":"world"}' | ./grader.sh
```

## Commands That Support Inline Graders

| Command | Flag | Purpose |
|---------|------|---------|
| `capture` | `--grader` | Add score to each result |
| `trials` | `--grader` | Compute pass@k, pass^k metrics |
| `grade` | `--grader` | Score extracted results (pipeline) |
| `calibrate` | `--grader` | Re-score samples with different grader |
| `validate-refs` | `--grader` | Check reference solutions |

## Best Practices

### Grade Outcomes, Not Paths

**✅ Do: Grade final environmental state**
- Did the tests pass?
- Was the file created with valid syntax?
- Is the answer semantically correct?
- Does the build succeed?

**❌ Don't: Grade procedural steps**
- Don't require specific tool usage ("must use WebSearch")
- Don't enforce reasoning patterns ("must think step-by-step")
- Don't mandate particular approaches ("must read file before editing")

**Why this matters:** Agents should be free to find novel solutions. If the outcome is correct, the path doesn't matter. Use git-based grading to check environmental changes, not trajectory inspection to enforce procedures.

### Other Best Practices

1. **Grade in isolation** - Each input/output should be scored independently
2. **Deterministic scoring** - Same input should always produce same score
3. **Always return valid JSON** - Use `JSON.stringify()` or `json.dumps()`
4. **Handle missing fields** - `hint`, `trajectory`, and `cwd` may be undefined
5. **Include reasoning** - Helps debug failures during calibration
6. **Test independently** - Validate grader before running full eval
7. **Keep graders simple** - Complex logic is hard to debug and calibrate
8. **Use git for outcomes** - Let git detect file changes instead of parsing output text
9. **Return structured outcomes** - Makes downstream analysis and aggregation easier

## Related Documentation

- [comparison-graders.md](comparison-graders.md) - Multi-run comparison graders
- [calibration.md](calibration.md) - Grader calibration workflow
- [eval-concepts.md](eval-concepts.md) - pass@k, pass^k metrics
