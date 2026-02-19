# Troubleshooting Guide for Headless Adapters

This guide documents common issues encountered when creating headless adapter schemas, based on real debugging sessions.

## Table of Contents

1. [Tool Calls Not Appearing in Trajectories](#tool-calls-not-appearing)
2. [Stdin Mode Issues](#stdin-mode-issues)
3. [JSONPath Debugging](#jsonpath-debugging)
4. [Output Event Matching](#output-event-matching)

---

## Tool Calls Not Appearing in Trajectories {#tool-calls-not-appearing}

### Symptom

- Trajectories show `"trajectoryRichness": "messages-only"`
- Zero tool_call events in captured output
- Agent responses suggest tool usage (long response times, mentions of tools)
- Result output includes information that clearly required external tool calls

### Root Cause

Tool calls are often nested inside arrays in the CLI's JSON output, but the schema's `outputEvents` mappings only check single JSONPath locations without array iteration.

**Example:** Claude Code emits tool calls inside `$.message.content[]` arrays:
```json
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "text", "text": "I'll search for that..."},
      {"type": "tool_use", "name": "WebSearch", "input": {...}},
      {"type": "tool_result", "tool_use_id": "...", "content": "..."}
    ]
  }
}
```

### Solution

Use wildcard `[*]` syntax in JSONPath expressions to iterate over array items:

```json
{
  "outputEvents": [
    {
      "match": { "path": "$.message.content[*].type", "value": "tool_use" },
      "emitAs": "tool_call",
      "extract": { "title": "$.name", "status": "'pending'" }
    },
    {
      "match": { "path": "$.message.content[*].type", "value": "tool_result" },
      "emitAs": "tool_call",
      "extract": { "title": "$.tool_use_id", "status": "'completed'" }
    }
  ]
}
```

### Debugging Steps

1. **Capture raw CLI output:**
   ```bash
   <agent> -p "Use a tool" --output-format stream-json 2>&1 | tee raw-output.jsonl
   ```

2. **Examine JSON structure:**
   ```bash
   cat raw-output.jsonl | jq '.' | less
   ```

3. **Look for tool-related fields:**
   ```bash
   cat raw-output.jsonl | jq 'paths | select(.[-1] | tostring | test("tool|call|use"))'
   ```

4. **Test JSONPath extraction:**
   ```bash
   cat raw-output.jsonl | jq '.message.content[] | select(.type == "tool_use")'
   ```

5. **Update schema with correct paths** and test with `headless --debug`

---

## Stdin Mode Issues {#stdin-mode-issues}

### Symptom

- CLI returns error: `error: unexpected argument '' found`
- Adapter works when prompt is passed via flag, fails with stdin
- Command construction looks correct but CLI rejects it

### Root Cause

When using stdin mode (where CLI reads prompt from stdin via `-` or similar), the headless adapter was incorrectly adding an empty string as a positional argument, resulting in commands like:

```bash
codex exec --json - ""  # ❌ Empty string causes error
```

Instead of:

```bash
echo "prompt" | codex exec --json -  # ✅ Correct
```

### Solution

Use the `stdin: true` field in the prompt configuration:

```json
{
  "command": ["codex", "exec", "--json", "-"],
  "prompt": {
    "stdin": true
  }
}
```

This tells the adapter to:
1. Not add the prompt text to the command arguments
2. Use `stdin: 'pipe'` when spawning the process
3. Write the prompt to the process's stdin stream

### Important Notes

- **The `-` marker** (or equivalent) must be in the `command` array, not added automatically
- **Empty `flag: ""`** is different from `stdin: true`:
  - `flag: ""` = positional argument (appends prompt to command args)
  - `stdin: true` = write to stdin (no prompt in command args)

### When to Use Stdin Mode

Use `stdin: true` when:
- CLI documentation shows `-` for stdin (e.g., `codex exec -`)
- CLI accepts prompts via pipe: `echo "prompt" | cli-command`
- CLI has `--stdin` or similar flag expecting piped input

**Do not use** when:
- CLI expects prompt as positional argument: `cli-command "prompt text"`
- CLI uses flag for prompt: `cli-command -p "prompt text"`

### Debugging Steps

1. **Test CLI manually with stdin:**
   ```bash
   echo "Say hello" | <agent> <flags> -
   ```

2. **Verify no trailing arguments:**
   ```bash
   # Should work:
   echo "test" | codex exec --json -

   # Will fail:
   echo "test" | codex exec --json - ""
   ```

3. **Check process spawn in adapter:**
   - Enable verbose mode: `headless --debug --verbose`
   - Look for command construction in output

4. **Update schema:**
   - Add `"stdin": true` to prompt config
   - Remove empty `flag` field if present
   - Ensure `-` is in command array

---

## JSONPath Debugging {#jsonpath-debugging}

### Common JSONPath Patterns

#### Nested Fields
```json
{
  "message": {
    "content": "Hello"
  }
}
```
**Path:** `$.message.content`

#### Array Index
```json
{
  "items": [
    {"text": "First"},
    {"text": "Second"}
  ]
}
```
**Path:** `$.items[0].text` → "First"

#### Array Wildcard
```json
{
  "items": [
    {"type": "tool", "name": "Read"},
    {"type": "tool", "name": "Write"}
  ]
}
```
**Path:** `$.items[*].type` → Returns array of items where you can check `type`

#### Nested Array Access
```json
{
  "message": {
    "content": [
      {"type": "text"},
      {"type": "tool_use", "name": "Search"}
    ]
  }
}
```
**Path:** `$.message.content[*].type` → Iterate over content array

#### Literal Values
Sometimes you need to return a fixed value:
```json
{
  "extract": {
    "status": "'pending'"  // Single quotes = literal string
  }
}
```

### Testing JSONPath Expressions

Use `jq` to test paths against real CLI output:

```bash
# Test basic path
cat output.jsonl | jq '.message.content'

# Test array access
cat output.jsonl | jq '.message.content[0]'

# Test wildcard iteration
cat output.jsonl | jq '.message.content[] | select(.type == "tool_use")'

# Test extraction
cat output.jsonl | jq '.message.content[] | select(.type == "tool_use") | .name'
```

### Common Mistakes

❌ **Missing `$` prefix:**
```json
"path": "type"  // Wrong
"path": "$.type"  // Correct
```

❌ **Wrong array syntax:**
```json
"path": "$.items.*"  // Wrong
"path": "$.items[*]"  // Correct
```

❌ **Nested wildcard without intermediate property:**
```json
"path": "$.[*].type"  // Wrong (missing property name)
"path": "$.content[*].type"  // Correct
```

❌ **Trying to use jq-specific syntax:**
```json
"path": "$.items[] | select(.active)"  // Wrong (jq syntax)
"path": "$.items[*]"  // Correct (JSONPath syntax)
```

---

## Output Event Matching {#output-event-matching}

### Understanding Match Logic

Output events use a two-step process:
1. **Match:** Find JSON lines that match a pattern
2. **Extract:** Pull specific fields from matched lines

```json
{
  "match": { "path": "$.type", "value": "message" },
  "emitAs": "message",
  "extract": { "content": "$.text" }
}
```

This means:
- Check if `$.type` equals `"message"`
- If yes, emit a session `message` update
- Extract content from `$.text`

### Wildcard Matching

When using array wildcards `[*]`, the match checks each array item:

```json
{
  "match": { "path": "$.items[*].type", "value": "tool_use" },
  "emitAs": "tool_call",
  "extract": { "title": "$.name" }
}
```

This means:
- Iterate over `$.items[]` array
- For each item where `type == "tool_use"`
- Emit a `tool_call` update
- Extract title from `$.name` (relative to that item)

### Extract Paths are Relative

**Important:** Extract paths are relative to the matched object, not the root!

```json
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "tool_use", "name": "Read", "input": {...}}
    ]
  }
}
```

```json
{
  "match": { "path": "$.message.content[*].type", "value": "tool_use" },
  "extract": {
    "title": "$.name",  // ✅ Relative to matched item
    "content": "$.input"  // ✅ Relative to matched item
  }
}
```

NOT:
```json
{
  "extract": {
    "title": "$.message.content[0].name"  // ❌ This won't work
  }
}
```

### Result Events

The `result` configuration marks when the agent is done:

```json
{
  "result": {
    "matchPath": "$.type",
    "matchValue": "completed",
    "contentPath": "$.summary"
  }
}
```

- **matchPath + matchValue:** Identify the completion event
- **contentPath:** Extract final output (can be any field, not necessarily the full response)

**Common patterns:**

```json
// Match specific type
{
  "matchPath": "$.type",
  "matchValue": "turn.completed"
}

// Match any non-null value
{
  "matchPath": "$.status",
  "matchValue": "*"
}

// Extract token stats as result
{
  "contentPath": "$.usage.output_tokens"
}

// Extract nothing (just signal completion)
{
  "contentPath": "$.type"
}
```

### Debugging Match Issues

1. **Check if events are being matched at all:**
   ```bash
   # Run headless --debug with verbose mode
   bunx @plaited/agent-eval-harness headless --schema schema.json --debug
   ```

2. **Verify JSON structure matches your paths:**
   ```bash
   cat raw-output.jsonl | jq 'select(.type == "your-expected-type")'
   ```

3. **Test extraction paths:**
   ```bash
   cat raw-output.jsonl | jq 'select(.type == "tool_use") | .name'
   ```

4. **Common issues:**
   - Path doesn't exist: Returns `undefined`, no update emitted
   - Wrong array syntax: Match fails, no updates
   - Extract path points to wrong object: Empty or wrong content in updates

### Match Debugging Checklist

- [ ] Raw CLI output contains the events you're trying to match
- [ ] `matchPath` points to an existing field
- [ ] `matchValue` exactly matches the field value (case-sensitive)
- [ ] For wildcards `[*]`, the array exists and isn't empty
- [ ] Extract paths are relative to the matched object
- [ ] Result event is actually emitted by the CLI (not just inferred)

