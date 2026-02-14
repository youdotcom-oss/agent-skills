# YDC AI SDK Integration - Test Prompts

These prompts trigger the `ydc-ai-sdk-integration` skill and generate code that is validated by the integration tests.

## Usage

**Working Directory:** `/Users/edward/Workspace/agent-skills/tests/ydc-ai-sdk-integration/`

Run these prompts from the test directory. The **Primary Prompts** (marked with 🧪) explicitly specify output file paths and are validated by integration tests. Other prompts are examples for skill documentation.

## 🧪 Primary Prompts (Tested)

### Path A: generateText() with youSearch

**Prompt:**
```
Create an AI SDK application using generateText() with You.com web search. Save the code to generated/path-a-generate.ts.
```

**Expected Output:**
- `generated/path-a-generate.ts` - generateText integration
- Uses `@youdotcom-oss/ai-sdk-plugin` and `ai` packages
- Configures `youSearch()` tool with standard YDC_API_KEY
- Uses `@ai-sdk/anthropic` provider with Claude Sonnet 4.5
- Includes `maxSteps` parameter for multi-step execution

---

### Path B: streamText() with youSearch and stopWhen

**Prompt:**
```
Create an AI SDK application using streamText() with You.com web search and stopWhen pattern. Save the code to generated/path-b-stream.ts.
```

**Expected Output:**
- `generated/path-b-stream.ts` - streamText integration
- Uses `streamText` and `StepResult` type from `ai`
- Includes `stepCountIs` helper function
- Configures `stopWhen: stepCountIs(3)` for multi-step execution
- Destructures `textStream` for iteration
- Tool: `youSearch()` with standard YDC_API_KEY

---

### Path C: generateText() with Multiple Tools

**Prompt:**
```
Create an AI SDK application using generateText() with both youSearch and youContents tools. Save the code to generated/path-c-multi-tool.ts.
```

**Expected Output:**
- `generated/path-c-multi-tool.ts` - Multi-tool integration
- Imports both `youSearch` and `youContents`
- Tools object with both: `{ search: youSearch(), extract: youContents() }`
- Handles research workflow (search + content extraction)

---

### Path D: Custom API Key

**Prompt:**
```
Create an AI SDK application using generateText() with youSearch and a custom environment variable CUSTOM_YDC_KEY. Save the code to generated/path-d-custom-key.ts.
```

**Expected Output:**
- `generated/path-d-custom-key.ts` - Custom API key handling
- Reads from `process.env.CUSTOM_YDC_KEY`
- Passes API key to tool: `youSearch({ apiKey })`
- Validates custom env var exists

---

## 📚 Example Prompts (Documentation Only)

These prompts demonstrate skill capabilities but are not validated by automated tests.

### Next.js API Route

**Prompt:**
```
Create a Next.js API route that uses streamText() with You.com tools.
```

**Expected Behavior:**
- Next.js App Router route handler (app/api/chat/route.ts)
- Uses `result.toDataStreamResponse()` for streaming
- Includes stopWhen pattern

---

### Express Server

**Prompt:**
```
Create an Express server that streams AI responses with You.com tools.
```

**Expected Behavior:**
- Express route handler with streaming
- Sets appropriate headers (Content-Type, Transfer-Encoding)
- Iterates textStream and writes chunks to response

---

## Validation

Each generated file should:
- [ ] Import required packages: `ai`, `@ai-sdk/anthropic`, `@youdotcom-oss/ai-sdk-plugin`
- [ ] Configure API keys from environment variables (YDC_API_KEY, ANTHROPIC_API_KEY)
- [ ] Use correct AI SDK function (generateText or streamText)
- [ ] Include tools object with selected You.com tools
- [ ] For streamText: Include stopWhen parameter and textStream destructuring
- [ ] Follow TypeScript best practices (arrow functions, type safety)
