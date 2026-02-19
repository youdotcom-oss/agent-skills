# Comparison Graders

## Overview

The `compare` command supports three grading strategies:

1. **Weighted** (default) - Configurable weights for quality, latency, reliability
2. **Statistical** - Bootstrap sampling for confidence intervals
3. **Custom** - Your own logic-based or LLM-as-Judge grader

## Built-in Strategy: Weighted

Scores runs by combining quality, latency, and reliability metrics with configurable weights.

### How It Works

```
weighted_score = (quality × w_q) + (latency × w_l) + (reliability × w_r)
```

Where:
- **quality**: Grader score (0-1) from previous grading step
- **latency**: Inverse duration (faster = higher, normalized)
- **reliability**: 1 if no tool errors, 0 otherwise

### Configuration

Default weights: `quality=0.5, latency=0.3, reliability=0.2`

Override via environment variables:

```bash
COMPARE_QUALITY=0.7 COMPARE_LATENCY=0.2 COMPARE_RELIABILITY=0.1 \
  agent-eval-harness compare a.jsonl b.jsonl -o comparison.json
```

### When to Use

- Quick comparisons without custom logic
- Balancing speed vs correctness tradeoffs
- Initial exploration before writing custom graders

## Built-in Strategy: Statistical

Uses bootstrap sampling to compute confidence intervals and flag statistically significant differences.

### How It Works

1. Resample scores with replacement (1000 iterations by default)
2. Compute mean of each resample
3. Calculate 95% confidence interval from percentiles (2.5th and 97.5th)
4. Return median of bootstrap means as central estimate
5. If winner's lower CI > second's upper CI → statistically significant

### Configuration

```bash
COMPARE_BOOTSTRAP_ITERATIONS=5000 \
  agent-eval-harness compare a.jsonl b.jsonl --strategy statistical -o comparison.json
```

### When to Use

- Rigorous A/B testing
- Publishing results (need significance claims)
- Small sample sizes where noise matters
- When you need uncertainty bounds on metrics

### Output

The statistical strategy adds `confidenceIntervals` to quality and performance metrics:

**CaptureResult format:**
```json
{
  "quality": {
    "run-a": {
      "avgScore": 0.85,
      "passRate": 0.90,
      "confidenceIntervals": {
        "avgScore": [0.82, 0.88],
        "passRate": [0.87, 0.93]
      }
    }
  },
  "performance": {
    "run-a": {
      "latency": { "mean": 1200 },
      "confidenceIntervals": {
        "latencyMean": [1100, 1300]
      }
    }
  }
}
```

**TrialResult format:**
```json
{
  "capability": {
    "run-a": {
      "avgPassAtK": 0.92,
      "confidenceIntervals": { "avgPassAtK": [0.88, 0.95] }
    }
  },
  "reliability": {
    "run-a": {
      "type": "trial",
      "avgPassExpK": 0.78,
      "confidenceIntervals": { "avgPassExpK": [0.72, 0.84] }
    }
  },
  "quality": {
    "run-a": {
      "avgScore": 0.85,
      "confidenceIntervals": { "avgScore": [0.82, 0.88] }
    }
  },
  "performance": {
    "run-a": {
      "latency": { "mean": 1500 },
      "confidenceIntervals": { "latencyMean": [1380, 1620] }
    }
  }
}
```

**Markdown output** includes 95% CI columns when using statistical strategy:

```markdown
## Quality
| Run | Avg Score | 95% CI | Pass Rate | 95% CI | Pass | Fail |
|-----|-----------|--------|-----------|--------|------|------|
| run-a | 0.850 | [0.820, 0.880] | 90.0% | [0.870, 0.930] | 45 | 5 |
```

The per-prompt reasoning indicates significance:

```json
{
  "reasoning": "Winner \"run-a\" is statistically significant (p<0.05, non-overlapping 95% CIs)"
}
```

Or:

```json
{
  "reasoning": "No statistically significant difference between top runs (overlapping 95% CIs)"
}
```

## Custom Graders

For specialized comparison logic or LLM-as-Judge evaluation.

### Grader Interface

```typescript
import type { ComparisonGrader } from '@plaited/agent-eval-harness/pipeline'

type ComparisonGraderInput = {
  id: string                    // Prompt identifier
  input: string | string[]      // Original prompt
  hint?: string                 // Grader context
  metadata?: Record<string, unknown> // Optional metadata from prompt
  runs: Record<string, {
    output: string              // Agent output
    trajectory?: TrajectoryStep[]
    score?: GraderResult        // If previously graded
    duration?: number           // Total ms
    toolErrors?: boolean
  }>
}

type ComparisonGraderResult = {
  rankings: Array<{
    run: string                 // Run label
    rank: number               // 1 = best
    score: number              // 0-1
  }>
  reasoning?: string           // Explanation
}
```

### Building a Custom Grader

**Step 1: Create the grader file**

```typescript
// my-compare-grader.ts
import type { ComparisonGrader } from '@plaited/agent-eval-harness/pipeline'

export const grade: ComparisonGrader = async ({ id, input, hint, runs }) => {
  // Grade each run in isolation first
  const scored = await Promise.all(
    Object.entries(runs).map(async ([label, run]) => {
      const score = await scoreRun(run, hint)
      return { label, score }
    })
  )

  // Sort by score descending
  const sorted = scored.sort((a, b) => b.score - a.score)

  return {
    rankings: sorted.map((r, i) => ({
      run: r.label,
      rank: i + 1,
      score: r.score
    })),
    reasoning: `Ranked by scoring criteria`
  }
}

const scoreRun = async (run: { output: string; toolErrors?: boolean }, hint?: string): Promise<number> => {
  let score = 0

  // Example: Check if output contains hint
  if (hint && run.output.toLowerCase().includes(hint.toLowerCase())) {
    score += 0.5
  }

  // Example: Penalize tool errors
  if (run.toolErrors) {
    score -= 0.2
  }

  return Math.max(0, Math.min(1, score + 0.5))
}
```

**Step 2: Use the grader**

```bash
agent-eval-harness compare a.jsonl b.jsonl \
  --strategy custom \
  --grader ./my-compare-grader.ts \
  -o comparison.json
```

### LLM-as-Judge Pattern

For semantic evaluation, integrate an LLM into your grader:

```typescript
// llm-compare-grader.ts
import Anthropic from '@anthropic-ai/sdk'
import type { ComparisonGrader } from '@plaited/agent-eval-harness/pipeline'

const client = new Anthropic()

export const grade: ComparisonGrader = async ({ id, input, hint, runs }) => {
  // Build prompt for LLM
  const runDescriptions = Object.entries(runs)
    .map(([label, run]) => `## ${label}\nOutput: ${run.output}`)
    .join('\n\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Compare these agent runs for the task: "${input}"
${hint ? `Expected: ${hint}` : ''}

${runDescriptions}

Rank from best to worst. Respond as JSON:
{"rankings": [{"run": "label", "rank": 1, "score": 0.95}, ...], "reasoning": "..."}`
    }]
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')

  return {
    rankings: json.rankings ?? [],
    reasoning: json.reasoning ?? 'LLM comparison complete'
  }
}
```

**Key principle:** Grade each run in isolation, then rank. This produces consistent, reproducible comparisons.

## Tool Usage Analysis

Tool usage is NOT included in standard comparison output because:

1. Different adapters provide different `trajectoryRichness` levels
2. The `tool_call.name` field often contains tool use IDs, not human-readable names
3. Adapters with `messages-only` richness don't capture tool calls

### Custom Tool Analysis Grader

For tool analysis, create a custom grader:

```typescript
import type { ComparisonGrader } from '@plaited/agent-eval-harness/pipeline'

export const grade: ComparisonGrader = async ({ runs }) => {
  const runAnalysis = Object.entries(runs).map(([label, run]) => {
    const toolCalls = (run.trajectory ?? []).filter(s => s.type === 'tool_call')
    return { label, toolCount: toolCalls.length }
  })

  // Rank by efficiency (fewer calls = better)
  const sorted = runAnalysis.sort((a, b) => a.toolCount - b.toolCount)

  return {
    rankings: sorted.map((r, i) => ({
      run: r.label,
      rank: i + 1,
      score: 1 / (1 + r.toolCount / 10)
    })),
    reasoning: `Tool counts: ${sorted.map(r => `${r.label}=${r.toolCount}`).join(', ')}`
  }
}
```

### Adapter Format Reference

| Adapter | `trajectoryRichness` | Tool Name Format |
|---------|---------------------|------------------|
| claude-headless | `full` | Tool use ID (e.g., `toolu_017...`) |
| gemini-headless | `full` | Function name |
| droid | `messages-only` | N/A |
| Custom | Varies | Check your schema |

## Strategy Selection Guide

| Use Case | Recommended Strategy |
|----------|---------------------|
| Quick comparison | `weighted` (default) |
| A/B test with significance | `statistical` |
| Semantic quality evaluation | `custom` (LLM-as-Judge) |
| Complex multi-criteria scoring | `custom` (logic-based) |
| Tool usage analysis | `custom` (see above) |

## Hybrid Graders (Weighted + LLM)

Layer LLM-as-Judge on top of built-in `weighted` comparison for balanced scoring.

### Architecture

| Component | Weight | Source |
|-----------|--------|--------|
| **Weighted score** | 50% | Built-in: quality, latency, reliability |
| **LLM Judge** | 50% | Semantic quality assessment |

```
final_score = (weighted_score × 0.5) + (llm_score × 0.5)
```

**Why 50/50?**
- Weighted catches objective metrics (speed, errors, prior grading)
- LLM catches semantic quality (relevance, completeness, accuracy)
- Neither alone is sufficient for production comparisons

### Available Context

```
{ id, input, hint?, metadata?, runs: { [label]: { output, trajectory?, score?, duration?, toolErrors? } } }
```

`hint` and prior `score` (from inline grading) are available for LLM context.

### Implementation (Any Language)

Graders use stdin/stdout JSON protocol. Example patterns:

**TypeScript:**
```typescript
import type { ComparisonGrader } from '@plaited/agent-eval-harness/pipeline'

export const grade: ComparisonGrader = async ({ input, hint, runs }) => {
  const scored = await Promise.all(
    Object.entries(runs).map(async ([label, run]) => {
      // 50%: Use prior score from weighted/inline grading
      const weighted = run.score?.score ?? 0

      // 50%: LLM semantic assessment
      const llm = await llmJudge(input, run.output, hint)

      return { label, score: (weighted * 0.5) + (llm * 0.5) }
    })
  )
  return { rankings: rank(scored) }
}
```

**Python:**
```python
#!/usr/bin/env python3
import json, sys

data = json.load(sys.stdin)
scored = []

for label, run in data["runs"].items():
    weighted = run.get("score", {}).get("score", 0)  # Prior grading
    llm = llm_judge(data["input"], run["output"], data.get("hint"))
    scored.append({"run": label, "score": (weighted * 0.5) + (llm * 0.5)})

ranked = sorted(scored, key=lambda x: -x["score"])
print(json.dumps({
    "rankings": [{"run": r["run"], "rank": i+1, "score": r["score"]}
                 for i, r in enumerate(ranked)]
}))
```

### LLM Judge Component

The LLM evaluates semantic quality (0-1 normalized):

```python
def llm_judge(input, output, hint=None):
    prompt = f"""Rate this response 0-100:
Task: {input}
{"Expected: " + hint if hint else ""}
Response: {output}

Criteria: relevance, completeness, accuracy, clarity
Return only the number."""

    score = int(llm_call(prompt)) / 100
    return max(0, min(1, score))
```

### Workflow

1. Run `capture` with inline `--grader` to get per-result scores
2. Run `compare --strategy custom --grader ./hybrid.py`
3. Hybrid grader combines prior scores (50%) + LLM judgment (50%)

```bash
# Step 1: Capture with inline grader
agent-eval-harness capture prompts.jsonl -s claude.json -g ./grader.ts -o run-a.jsonl
agent-eval-harness capture prompts.jsonl -s gemini.json -g ./grader.ts -o run-b.jsonl

# Step 2: Compare with hybrid grader
agent-eval-harness compare run-a.jsonl run-b.jsonl \
  --strategy custom --grader ./hybrid-compare.py -o comparison.json
```

### Calibration

1. **Fallback**: Without LLM API key, use weighted-only (score × 1.0)
2. **Caching**: Cache LLM calls by hash(input + output) to reduce cost
3. **Threshold**: Adjust pass threshold based on labeled samples

### Trials Variant

For `TrialsComparisonGrader`, combine passAtK metrics with LLM assessment of best trial:

```python
weighted = (run["passAtK"] * 0.5) + (run["passExpK"] * 0.3) + consistency * 0.2
llm = llm_judge_best_trial(run["trials"])
final = (weighted * 0.5) + (llm * 0.5)
```

The trials comparison report also includes **quality** and **performance** metrics when available:

- **Quality** (optional): `avgScore`, `medianScore`, `p25Score`, `p75Score` — aggregated from `trial.score` across all prompts. Only present when a grader was used during trials capture.
- **Performance** (always present): `latency` (p50/p90/p99/mean/min/max), `totalDuration` — aggregated from `trial.duration` across all prompts.

With `--strategy statistical`, both include `confidenceIntervals` (`avgScore` CI for quality, `latencyMean` CI for performance).

## Related Documentation

- [inline-graders.md](inline-graders.md) - Single input/output graders
- [eval-concepts.md](eval-concepts.md) - pass@k, pass^k metrics
- [calibration.md](calibration.md) - Grader calibration workflow
