# Output Formats

The harness uses a "capture once, derive many views" approach. The `capture` command produces full trajectory JSONL, and derived views are created with separate commands.

## Capture Output (Full Trajectory)

The `capture` command always outputs full trajectory JSONL:

```bash
agent-eval-harness capture prompts.jsonl --schema ./claude-headless.json -o results.jsonl
```

### Schema

```typescript
type CaptureResult = {
  id: string                      // Prompt identifier
  input: string | string[]        // Single prompt or multi-turn conversation
  output: string                  // Final agent response
  hint?: string                   // Grader context (if provided in prompt)
  trajectory: TrajectoryStep[]    // Full execution trajectory
  metadata: Record<string, unknown>  // Prompt metadata
  timing: {
    start: number                 // Unix timestamp (ms)
    end: number                   // Unix timestamp (ms)
    firstResponse?: number        // Time to first response (ms)
    sessionCreation: number       // Time to create session (ms)
    total: number                 // Total duration (end - start, ms)
    inputTokens?: number          // Input tokens consumed (if available)
    outputTokens?: number         // Output tokens generated (if available)
  }
  toolErrors: boolean             // Whether any tool calls failed
  errors?: string[]               // Error messages (if any)
  score?: GraderResult            // Grader score (if grader was provided)
}

type TrajectoryStep =
  | { type: 'thought'; content: string; timestamp: number; stepId?: string }
  | { type: 'message'; content: string; timestamp: number; stepId?: string }
  | {
      type: 'tool_call'
      name: string              // Tool title
      status: string            // pending, in_progress, completed, failed
      input?: unknown           // Raw input parameters
      output?: unknown          // Raw output
      duration?: number         // Execution time (ms)
      timestamp: number
      stepId?: string
    }
  | { type: 'plan'; entries: unknown[]; timestamp: number; stepId?: string }

type GraderResult = {
  pass: boolean
  score: number                 // 0.0 to 1.0
  reasoning?: string
}
```

### Example Output

```jsonl
{"id":"test-001","input":"Create a primary button","output":"I created the button in src/button.tsx","trajectory":[{"type":"thought","content":"I'll create a styled button template","timestamp":100,"stepId":"test-001-step-1"},{"type":"tool_call","name":"Write","status":"completed","input":{"file_path":"src/button.tsx","content":"..."},"output":"File written","duration":234,"timestamp":150,"stepId":"test-001-step-2"},{"type":"message","content":"I created the button","timestamp":500,"stepId":"test-001-step-3"}],"metadata":{"category":"ui"},"timing":{"start":1704067200000,"end":1704067201234,"firstResponse":100},"toolErrors":false}
```

## Summary Format

The `summarize` command derives compact JSONL from full trajectory:

```bash
agent-eval-harness summarize results.jsonl -o summary.jsonl
```

### Schema

```typescript
type SummaryResult = {
  id: string                    // Prompt identifier
  input: string                 // Original prompt text
  output: string                // Final agent response
  toolCalls: string[]           // List of tool names used
  duration: number              // Total execution time (ms)
}
```

### Example Output

```jsonl
{"id":"test-001","input":"Create a primary button","output":"I created the button in src/button.tsx","toolCalls":["Write"],"duration":1234}
{"id":"test-002","input":"Fix the TypeScript error","output":"I fixed the type error...","toolCalls":["Read","Edit"],"duration":2567}
```

### Analysis with jq

```bash
# Calculate average duration
cat summary.jsonl | jq -s 'map(.duration) | add / length'

# Count tool usage
cat summary.jsonl | jq -s 'map(.toolCalls) | flatten | group_by(.) | map({tool: .[0], count: length})'

# Filter by output content
cat summary.jsonl | jq 'select(.output | contains("error"))'
```

## Markdown Format

The `summarize` command can also produce markdown for LLM-as-judge workflows:

```bash
agent-eval-harness summarize results.jsonl --markdown -o results.md
```

### Structure

```markdown
## Evaluation Record: <id>

**Input:** <original prompt>

**Trajectory:**
1. [THOUGHT] <truncated content> [->stepId]
2. [TOOL:<name>] -> <status> (<duration>ms) [->stepId]
   File: <path> (<size> chars)
   ```<ext>
   <head lines>

   // ... N lines omitted ...

   <tail lines>
   ```
3. [PLAN] <plan summary> [->stepId]
4. [MESSAGE] <truncated content> [->stepId]

**Output:** <truncated final output>
**Metadata:** category=ui, agent=claude-headless, ...
**Tool Errors:** false
**Duration:** <ms>ms

---
```

**Step ID Format:** `<prompt-id>-step-<N>` (e.g., `test-001-step-2`)

**Truncation Rules:**
- Thought/message content: First 100 characters
- Output: First 200 characters
- Code preview: Head (8 lines) + tail (4 lines) for files > 12 lines

## Trials Output

The `trials` command produces per-prompt trial results:

```bash
agent-eval-harness trials prompts.jsonl --schema ./claude-headless.json -k 5 --grader ./grader.ts -o trials.jsonl
```

### Schema

```typescript
type TrialResult = {
  id: string                    // Prompt identifier
  input: string                 // Original prompt text
  hint?: string                 // Grader context (if provided)
  k: number                     // Number of trials
  passRate?: number             // passes / k (with grader only)
  passAtK?: number              // 1 - (1-passRate)^k (with grader only)
  passExpK?: number             // passRate^k (with grader only)
  trials: TrialEntry[]          // Individual trial results
}

type TrialEntry = {
  trialNum: number              // Trial number (1-indexed)
  output: string                // Agent output for this trial
  trajectory: TrajectoryStep[]  // Full trajectory for this trial
  duration: number              // Duration in milliseconds
  pass?: boolean                // Pass/fail (if grader provided)
  score?: number                // Numeric score (if grader provided)
  reasoning?: string            // Grader reasoning (if grader provided)
}
```

### Example (Without Grader)

```jsonl
{"id":"search-001","input":"Find the CEO of Anthropic","k":5,"trials":[{"trialNum":1,"output":"Dario Amodei...","trajectory":[...],"duration":1234},{"trialNum":2,"output":"The CEO is Dario...","trajectory":[...],"duration":1100},...]}
```

### Example (With Grader)

```jsonl
{"id":"search-001","input":"Find the CEO of Anthropic","k":5,"passRate":0.8,"passAtK":0.9997,"passExpK":0.3277,"trials":[{"trialNum":1,"output":"Dario Amodei...","pass":true,"score":1.0,"duration":1234},{"trialNum":2,"output":"I don't know...","pass":false,"score":0.0,"reasoning":"Missing hint content","duration":1100},...]}
```

## Step-Level Retrieval Pattern

For step-specific analysis, use the step IDs in the trajectory:

```typescript
// Load results
const results = (await Bun.file('results.jsonl').text())
  .trim()
  .split('\n')
  .map(line => JSON.parse(line))

// Build step index
const stepIndex = new Map<string, unknown>()
for (const result of results) {
  for (const step of result.trajectory) {
    stepIndex.set(step.stepId, step)
  }
}

// Retrieve specific step by ID
const stepId = 'test-001-step-2'  // From markdown [->stepId]
const fullStep = stepIndex.get(stepId)
console.log(fullStep.input)  // Complete tool input
```

## toolErrors Field

The `toolErrors` field indicates whether any tool calls failed during execution:

| `toolErrors` | Meaning |
|--------------|---------|
| `false` | All tool calls completed successfully |
| `true` | One or more tool calls had `status: 'failed'` |

**Note:** `toolErrors` only indicates tool-level failures. For semantic pass/fail (did the agent accomplish the task?), use a grader:

```bash
agent-eval-harness capture prompts.jsonl --schema ./claude-headless.json --grader ./grader.ts -o results.jsonl
```

## Input Format

All commands accept the same JSONL input:

```jsonl
{"id":"test-001","input":"Create a primary button","hint":"should contain <button>","metadata":{"category":"ui"}}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `input` | Yes | Prompt text for the agent |
| `hint` | No | Grader context - what to look for |
| `reference` | No | Reference solution (for validate-refs) |
| `metadata` | No | Tags, category, difficulty for filtering |
| `timeout` | No | Override default timeout for this prompt |

## Streaming Behavior

All commands stream output line-by-line as results complete:

```bash
# Watch results in real-time
agent-eval-harness capture prompts.jsonl --schema ./claude-headless.json --progress -o results.jsonl &
tail -f results.jsonl
```

Use `--append` to continue interrupted runs without overwriting previous results.
