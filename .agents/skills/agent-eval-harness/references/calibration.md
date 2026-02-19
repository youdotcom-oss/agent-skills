# Grader Calibration Guide

## Why Calibrate?

When an agent fails a task, there are two possibilities:

1. **The agent failed** - It made mistakes, used wrong tools, produced incorrect output
2. **The grader failed** - The grader is too strict, has bugs, or doesn't handle valid variations

Calibration helps you distinguish between these cases **before** running expensive trials.

## When to Calibrate

| Situation | Action |
|-----------|--------|
| Just wrote a new grader | Calibrate immediately with 10-20 samples |
| Pass rate dropped unexpectedly | Calibrate to check if grader is too strict |
| Pass rate seems suspiciously high | Calibrate to check if grader is too lenient |
| Before running k=10 trials | Calibrate to catch bugs early (save API costs) |
| Grader uses LLM-as-judge | Calibrate to verify LLM reasoning is sound |

## Calibration Workflow

### Step 1: Run Initial Capture

```bash
agent-eval-harness capture prompts.jsonl \
  --schema ./claude-headless.json \
  --grader ./my-grader.ts \
  -o results.jsonl
```

### Step 2: Sample Failures for Review

```bash
# Sample 10 random failures
agent-eval-harness calibrate results.jsonl --sample 10 -o calibration.md
```

This outputs a markdown file with:
- The prompt input
- The agent's output
- Trajectory snippet (first 2 steps, middle, last 2 steps)
- The grader's score and reasoning

### Step 3: Human Review

For each sampled failure, answer:

| Question | If Yes... |
|----------|-----------|
| Did the agent actually fail the task? | Grader is correct ✓ |
| Is the output correct but grader rejected it? | Grader is too strict → fix grader |
| Is the grader's reasoning wrong? | Grader has bugs → fix grader |
| Is the task ambiguous? | Improve prompt or hint |

### Step 4: Fix and Re-run

If you found grader issues:

1. Fix the grader
2. Re-score existing results (no need to re-run agent):
   ```bash
   agent-eval-harness grade results.jsonl --grader ./fixed-grader.ts -o re-scored.jsonl
   ```
3. Re-calibrate to verify fix

### Step 5: Validate with Reference Solutions

Before blaming the agent, prove the task is solvable:

```bash
# Ensure reference solutions pass
agent-eval-harness validate-refs prompts.jsonl --grader ./my-grader.ts
```

If references fail, the grader (not the agent) is broken.

## Calibration Metrics

Track these over time:

| Metric | Formula | Target |
|--------|---------|--------|
| False Negative Rate | (correct outputs marked fail) / (total fails) | < 5% |
| False Positive Rate | (wrong outputs marked pass) / (total passes) | < 5% |
| Grader Agreement | (human agrees with grader) / (samples reviewed) | > 90% |

## Example: Calibrating an LLM-as-Judge Grader

LLM graders are powerful but need extra calibration:

```bash
# 1. Run with LLM grader
agent-eval-harness capture prompts.jsonl --grader ./llm-grader.ts -o results.jsonl

# 2. Sample BOTH failures AND passes
agent-eval-harness calibrate results.jsonl --sample 5 --include-passes -o calibration.md

# 3. For each sample, verify LLM reasoning makes sense
# - Is the reasoning consistent with the score?
# - Would a human agree with this reasoning?
# - Are there edge cases the LLM missed?
```

## Common Calibration Pitfalls

### 1. Only Reviewing Failures

Always sample some passes too. A grader that passes everything has 100% pass rate but is useless.

### 2. Small Sample Size

10 samples catches ~65% of issues at 10% error rate. For critical evals, sample 30+.

### 3. Confirmation Bias

Don't calibrate with the goal of "proving the grader works." Actively look for failures.

### 4. One-Time Calibration

Re-calibrate when:
- Prompts change
- Agent behavior changes
- Grader logic is updated

## Calibration Checklist

Before trusting your evaluation results:

- [ ] Ran `validate-refs` to ensure references pass
- [ ] Sampled 10+ failures for manual review
- [ ] Sampled 5+ passes to check for false positives
- [ ] False negative rate < 5%
- [ ] False positive rate < 5%
- [ ] Grader reasoning makes sense for edge cases
- [ ] Re-calibrated after any grader changes

## Related Commands

| Command | Purpose |
|---------|---------|
| `calibrate` | Sample failures for review |
| `validate-refs` | Check reference solutions pass |
| `grade` | Re-score with updated grader |
| `balance` | Analyze test set coverage |
