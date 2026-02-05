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
- Three powerful tools: `youSearch`, `youExpress`, `youContents`
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

This installs all 5 skills at once:
- `ydc-ai-sdk-integration`
- `ydc-claude-agent-sdk-integration`
- `ydc-openai-agent-sdk-integration`
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

## Contributing

Contributions are welcome! To add a new skill:

1. Fork this repository
2. Create a new skill directory in `skills/`
3. Add `SKILL.md` following agent-skills-spec format
4. Add optional assets in `assets/` subdirectory
5. Test your skill with `npx skills add <your-fork>`
6. Submit a pull request

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
