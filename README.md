# You.com Agent Skills

Agent skills for integrating You.com's AI-powered search, content extraction, and web capabilities with popular AI agent frameworks and bash-based agents.

These skills provide interactive workflows that guide your AI agent through setting up You.com integrations for SDKs, frameworks, and CLI tools.

## Available Skills

### ydc-ai-sdk-integration

Integrate Vercel AI SDK applications with You.com tools for real-time web search, AI-powered answers, and content extraction.

**Use when:**
- Building AI SDK applications with `generateText()` or `streamText()`
- Adding web search capabilities to your AI agents
- Extracting and processing web content programmatically

**Features:**
- Interactive setup workflow for existing or new projects
- Three powerful tools: `youSearch`, `youContents`
- Smart integration with existing AI SDK code
- Support for multiple AI providers (Anthropic, OpenAI, Google, etc.)

---

### ydc-claude-agent-sdk-integration

Connect Claude Agent SDK (Python and TypeScript) to You.com's HTTP MCP server for web search and content extraction.

**Use when:**
- Building Claude-powered agents in Python or TypeScript
- Integrating MCP tools with Claude Agent SDK v1 or v2
- Adding You.com capabilities to existing Claude applications

**Features:**
- Complete templates for Python and TypeScript (v1 & v2)
- HTTP MCP server configuration patterns
- Bearer token authentication setup
- Error handling and validation examples

---

### ydc-openai-agent-sdk-integration

Add You.com MCP tools to OpenAI Agents SDK using Hosted MCP or Streamable HTTP modes.

**Use when:**
- Building OpenAI-powered agents with MCP integration
- Using Python or TypeScript OpenAI Agents SDK
- Choosing between Hosted MCP and Streamable HTTP deployment

**Features:**
- Dual-mode templates (Hosted MCP + Streamable HTTP)
- Python and TypeScript implementations
- Complete configuration examples for both modes
- Tool approval and validation patterns

---

### ydc-crewai-mcp-integration

Integrate You.com's remote MCP server with crewAI agents for web search, AI-powered answers, and content extraction.

**Use when:**
- Building crewAI agents that need real-time web access
- Integrating You.com MCP via `MCPServerHTTP` or `MCPServerAdapter`
- Adding web search and content extraction to existing crewAI workflows

**Features:**
- DSL and MCPServerAdapter integration patterns
- Python implementation with uv/pip setup
- Bearer token authentication for the remote MCP server
- Complete crewAI crew and task configuration examples

---

### teams-anthropic-integration

Use @youdotcom-oss/teams-anthropic to add Anthropic Claude models (Opus, Sonnet, Haiku) to Microsoft Teams.ai applications. Optionally integrate You.com MCP server for web search and content extraction.

**Use when:**
- Building Teams.ai apps with Claude models
- Need streaming, function calling, or conversation memory
- Optionally want web search capabilities via You.com MCP

**Features:**
- Two paths: Basic setup (Claude only) or with You.com MCP
- Complete templates for new and existing apps
- Streaming responses and function calling
- Conversation memory with Teams.ai Memory API

---

### youdotcom-cli

Integrate You.com's web search, AI answers, and content extraction with bash-based AI agents using a universal CLI tool.

**Use when:**
- Working with bash-capable AI agents (Claude Code, Cursor, Codex, etc.)
- Need fast web search with verifiable citations
- Want simultaneous search + content extraction (livecrawl)
- Building agent workflows with JSON CLI tools

**Features:**
- Schema-driven JSON input via `--json` flag
- Schema discovery with `--schema` flag
- Livecrawl: search + extract content in one API call
- Client tracking with `--client` flag
- Works with bunx/npx (no installation needed)
- Compatible with any bash-based agent

---

## Installation

### For Agent Skills Spec Compatible Agents

**Install All Skills** (recommended):

```bash
# Using npm
npx skills add youdotcom-oss/agent-skills

# Using Bun (recommended)
bunx skills add youdotcom-oss/agent-skills
```

This installs all 6 skills at once:
- `ydc-ai-sdk-integration`
- `ydc-claude-agent-sdk-integration`
- `ydc-openai-agent-sdk-integration`
- `ydc-crewai-mcp-integration`
- `teams-anthropic-integration`
- `youdotcom-cli`

**Install Individual Skills**:

```bash
# Install just one skill
npx skills add youdotcom-oss/agent-skills --skill youdotcom-cli
bunx skills add youdotcom-oss/agent-skills --skill ydc-ai-sdk-integration

# Install multiple specific skills
npx skills add youdotcom-oss/agent-skills --skill youdotcom-cli --skill ydc-ai-sdk-integration
```

---

## Quick Start

Before using any skill, you'll need a You.com API key:

1. **Get API Key**: Visit [you.com/platform/api-keys](https://you.com/platform/api-keys)
2. **Set Environment Variable**:
   ```bash
   export YDC_API_KEY="your-api-key-here"
   ```
3. **Request Integration**: Ask your AI agent to integrate You.com (see Usage examples below)

---

## Usage

Once installed, your AI coding agent will automatically activate the relevant skill when you request integration. For example:

- "Integrate Vercel AI SDK with You.com tools"
- "Set up Claude Agent SDK with You.com MCP"
- "Add You.com to my Teams app with Anthropic"
- "Configure OpenAI Agents SDK with You.com MCP"
- "Integrate You.com MCP with my crewAI agents"
- "Add You.com CLI tools to my bash agent"

Each skill provides step-by-step instructions, code templates, and validation checklists.

---

## Skill Structure

Each skill follows the [agent-skills-spec](https://agentskills.io) format:

```
skills/{skill-name}/
├── SKILL.md          # Complete workflow with YAML frontmatter
└── assets/           # Code templates (optional, mostly inlined)
```

**Skills are self-contained:**
- **YAML frontmatter** defines skill metadata (name, description, category, keywords, compatibility)
- **Markdown body** contains complete workflow, inline code examples, templates, validation, and troubleshooting
- **Assets directory** (optional) for additional templates - most examples are now inlined for immediate visibility

---

## Prerequisites

**API Keys:**
- You.com API key: [Get yours](https://you.com/platform/api-keys)
- Provider API keys (Anthropic, OpenAI, etc.) depending on the skill

---

## Documentation

Each skill includes:
- **Prerequisites** - Required packages and environment variables
- **Complete templates** - Ready-to-run code for Python and TypeScript
- **Configuration examples** - Side-by-side comparisons for different modes
- **Validation checklists** - Ensure your integration works correctly
- **Troubleshooting** - Common issues and solutions

---

## Development

### Environment Setup

Create a `.env` file in the project root with the following API keys:

```bash
# Required for all skills
YDC_API_KEY=your-you-com-api-key

# Required for Claude Agent SDK skill
ANTHROPIC_API_KEY=your-anthropic-api-key

# Required for OpenAI Agent SDK skill
OPENAI_API_KEY=your-openai-api-key
```

Get API keys from:
- You.com: [you.com/platform/api-keys](https://you.com/platform/api-keys)
- Anthropic: [console.anthropic.com](https://console.anthropic.com)
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Skill Evals

Skills are validated by running Claude Code against prompts and checking that the generated integration code passes real API tests.

**Run all skill evals:**

```bash
bun run eval
```

**Run a single skill eval:**

```bash
bun run eval --skill ydc-crewai-mcp-integration
```

**Run with parallelism:**

```bash
bun run eval -j 4
```

**Regenerate `data/RESULTS.md` from existing results (no re-run):**

```bash
bun run eval:summary
```

**Note**: Evals use real API keys from `.env` and invoke Claude Code as a subprocess to generate integration code. Valid API keys are required.

### Eval Structure

```
data/
├── prompts/
│   └── prompts.jsonl       # One entry per skill variant (id, prompt, grader config)
├── results/
│   └── results.jsonl       # Grader output per eval run (gitignored)
└── RESULTS.md              # Human-readable summary (committed on weekly CI run)

tests/{skill-id}/           # Generated integration code lives here (gitignored)
├── agent.ts                # Example: TypeScript integration file
└── agent.spec.ts           # Tests that validate the generated code

scripts/
├── run.ts                  # Eval orchestrator (clean → harness → grade → summarize)
└── grader.ts               # Scoring logic for generated integration code
```

**Eval IDs and test directories use language suffixes where needed:**
- `ydc-claude-agent-sdk-integration-python` → `tests/ydc-claude-agent-sdk-integration-python/`
- `ydc-claude-agent-sdk-integration-typescript` → `tests/ydc-claude-agent-sdk-integration-typescript/`
- `ydc-openai-agent-sdk-integration-python` → `tests/ydc-openai-agent-sdk-integration-python/`
- `ydc-openai-agent-sdk-integration-typescript` → `tests/ydc-openai-agent-sdk-integration-typescript/`
- Single-variant skills (e.g., `ydc-crewai-mcp-integration`) use a single test directory

**Workflow:**
1. `data/prompts/prompts.jsonl` contains prompts that trigger each skill
2. The eval harness runs Claude Code against each prompt, generating code into `tests/{skill-id}/`
3. The grader validates the generated code against the test files
4. Results are written to `data/results/results.jsonl` and summarized in `data/RESULTS.md`

### CI

Evals run automatically on:
- **Pull requests** that change `skills/*/SKILL.md`, assets, or eval scripts
- **Pushes to main** for the same paths
- **Weekly schedule** (Monday 06:00 UTC) — results committed back to `data/RESULTS.md`

Current eval results: see [`data/RESULTS.md`](./data/RESULTS.md)

### Linting & Formatting

**Check for issues:**
```bash
# Check all files (TypeScript + Python)
bun run check

# Check only Python files
bun run check:py
```

**Auto-fix issues:**
```bash
# Fix all files (TypeScript + Python)
bun run check:write

# Fix only Python files
bun run check:write-py
```

**Tools:**
- TypeScript: [Biome](https://biomejs.dev) for linting and formatting
- Python: [Ruff](https://docs.astral.sh/ruff/) for linting and formatting
- Python package management: [uv](https://docs.astral.sh/uv/)

### Prerequisites

- **Bun** >= 1.2.21 (for TypeScript evals and orchestration)
- **Python** >= 3.12 (for Python skill evals)
- **uv** (automatically used by Bun scripts for Python)

---

## Contributing

Contributions are welcome! To add a new skill:

1. Fork this repository
2. Create a new skill directory in `skills/`
3. Add `SKILL.md` following agent-skills-spec format
4. Add optional assets in `assets/` subdirectory
5. Add a prompt entry to `data/prompts/prompts.jsonl` and reference test files in `tests/`
6. Test your skill with `npx skills add <your-fork>`
7. Submit a pull request

**Skill naming convention:**
- Directory name must match `name` field in YAML frontmatter
- Use kebab-case (e.g., `ydc-ai-sdk-integration`)

---

## License

MIT - See [LICENSE](./LICENSE) file for details

---

## Support

- **Issues**: [GitHub Issues](https://github.com/youdotcom-oss/agent-skills/issues)
- **Email**: support@you.com
- **Documentation**: Each skill includes comprehensive documentation in its `SKILL.md` file
