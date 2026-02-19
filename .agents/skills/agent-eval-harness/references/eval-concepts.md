# Evaluation Concepts

Core concepts for agent evaluation based on Anthropic's "Demystifying Evals for AI Agents" guidance.

## The Non-Determinism Problem

Agents are inherently non-deterministic. A single run doesn't tell you:
- **Can** the agent solve this problem? (capability)
- **Will** it reliably solve it every time? (regression safety)

The `trials` command addresses this by running each prompt multiple times.

## pass@k vs pass^k

Two metrics that answer different questions:

| Metric | Formula | Question | Use Case |
|--------|---------|----------|----------|
| **pass@k** | `1 - (1-p)^k` | Can the agent ever do this? | Capability evals |
| **pass^k** | `p^k` | Will it work every time? | Regression evals |

Where `p` = raw pass rate (passes / k trials)

### Example

Run a prompt 5 times, 3 pass (60% raw pass rate):

| Metric | Calculation | Result | Interpretation |
|--------|-------------|--------|----------------|
| **pass@5** | `1 - (0.4)^5` | **98.9%** | Agent can likely do this task |
| **pass^5** | `(0.6)^5` | **7.8%** | Not reliable for production |

### When to Use Each

**pass@k (Capability Evals):**
- Exploring what an agent can do
- Testing new features or prompts
- Higher k values (5-10) for thorough assessment
- Accept if pass@k > 90%

**pass^k (Regression Evals):**
- CI/CD pipelines
- Known-good tasks that must always work
- Lower k values (3-5) for efficiency
- Reject if pass^k < 80%

## Capability vs Regression Evals

| Eval Type | Starting Point | Goal | Metric |
|-----------|----------------|------|--------|
| **Capability** | Low pass rates | Find agent's limits | pass@k |
| **Regression** | ~100% pass rates | Catch degradation | pass^k |

### Capability Eval Workflow

```bash
# Run many trials to assess capability
agent-eval-harness trials new-prompts.jsonl bunx agent -k 10 --grader ./grader.ts -o capability.jsonl

# Analyze results
cat capability.jsonl | jq 'select(.passAtK > 0.9) | {id, passAtK}'
```

Questions answered:
- What tasks can the agent handle?
- Where are the capability boundaries?
- Which prompts need refinement?

### Regression Eval Workflow

```bash
# Run fewer trials for known-good tasks
agent-eval-harness trials regression-suite.jsonl bunx agent -k 3 --grader ./grader.ts -o regression.jsonl

# Fail CI if reliability drops
cat regression.jsonl | jq -e 'all(.passExpK > 0.8)'
```

Questions answered:
- Did the latest change break anything?
- Is the agent still reliable on known tasks?
- Which tasks became flaky?

## Grader Calibration

### The Problem

When your eval says an agent "failed", there are two possibilities:

| Reality | What Happened |
|---------|---------------|
| Agent failed | The agent did the wrong thing |
| **Grader failed** | The agent did the right thing, but your grader didn't recognize it |

Without calibration, you can't tell which.

### Why Calibration Matters

Imagine tracking agent performance:

```
Week 1: 70% pass rate
Week 2: 65% pass rate  ← "Agent got worse!"
Week 3: 60% pass rate  ← "Something is broken!"
```

But what if your grader is rejecting valid solutions?

```
Week 1: 70% grader pass → 70% actually correct
Week 2: 65% grader pass → 75% actually correct (grader rejected 10% valid)
Week 3: 60% grader pass → 80% actually correct (grader rejected 20% valid)
```

**The agent is improving, but your grader can't see it.**

### Using the Calibrate Command

```bash
# Sample 10 failures for human review
agent-eval-harness calibrate results.jsonl --sample 10 -o calibration.md
```

Review the markdown output and label each sample:
- **Valid failure** - Agent was actually wrong
- **Grader bug** - Agent was correct, grader too strict
- **Ambiguous** - Unclear

### When to Calibrate

| Situation | Calibrate? |
|-----------|------------|
| Building a new grader | Yes - validate it works |
| Pass rate suddenly drops | Yes - is it agent or grader? |
| Agent uses unexpected approach | Yes - grader might not recognize it |
| Grader is simple string match | Yes - likely too strict |
| Well-tested LLM judge | Maybe - periodic spot checks |

### Grader Bug Examples

**Too strict (exact match):**
```typescript
// Bad: rejects "Dario Amodei is the CEO" when hint is "Dario Amodei"
const pass = output === hint
```

**Better (contains check):**
```typescript
// Good: accepts variations
const pass = output.toLowerCase().includes(hint.toLowerCase())
```

**Best (semantic match via LLM):**
```typescript
// Best: understands meaning, not just text
const pass = await llmJudge({ output, hint })
```

## Reference Solutions

### Purpose

Reference solutions prove a task is solvable before blaming the agent.

**Prompt file with reference:**
```jsonl
{"id":"test-001","input":"Create a button component","hint":"<button>","reference":"export const Button = () => <button>Click</button>"}
```

### Validation Workflow

```bash
# Check that reference solutions pass your grader
agent-eval-harness validate-refs prompts.jsonl --grader ./grader.ts -o validation.jsonl

# If references fail, your grader or task is broken
cat validation.jsonl | jq 'select(.pass == false)'
```

### Why This Matters

If your reference solution fails your own grader:
- The task definition is ambiguous
- The grader is too strict
- The hint is wrong

Fix the eval before evaluating the agent.

## Test Set Balance

### The Problem

An eval with only "make X work" misses "don't break Y".

**Unbalanced:**
- 50 prompts: "Add feature X"
- 0 prompts: "Don't break existing feature Y"

### Using the Balance Command

```bash
agent-eval-harness balance prompts.jsonl -o balance.json
```

Analyzes:
- Category distribution (from `metadata.category`)
- Positive/negative case ratio
- Coverage gaps

### Balanced Eval Design

Include both positive and negative cases:

| Type | Example | Purpose |
|------|---------|---------|
| Positive | "Add a login button" | Agent should succeed |
| Negative | "Add a button without breaking tests" | Agent should not break things |
| Edge case | "Handle empty input gracefully" | Agent should be robust |

## Summary

| Concept | Command | Key Insight |
|---------|---------|-------------|
| Non-determinism | `trials` | Run multiple times to measure reliability |
| pass@k | `trials -k N` | Capability: can agent do this? |
| pass^k | `trials -k N` | Regression: will it always work? |
| Calibration | `calibrate` | Validate grader, not just agent |
| Reference validation | `validate-refs` | Prove tasks are solvable |
| Balance | `balance` | Cover positive + negative cases |
