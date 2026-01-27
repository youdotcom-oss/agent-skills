# You.com Agent Skills

Agent skills for integrating You.com's AI-powered search, content extraction, and web capabilities with popular AI agent frameworks.

## Available Skills

### ai-sdk-integration

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

### claude-agent-sdk-integration

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

### openai-agent-sdk-integration

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

Build Microsoft Teams applications powered by Anthropic's Claude model with You.com MCP server integration.

**Use when:**
- Creating new Teams apps with AI capabilities
- Adding You.com MCP to existing Teams.ai applications
- Integrating Anthropic Claude models with Teams framework

**Features:**
- Template-based setup with inline markers
- Teams.ai Memory API integration patterns
- AnthropicChatModel configuration examples
- Environment setup and API key validation

---

## Installation

Get up and running in one command:

```bash
npx skills add youdotcom-oss/agent-skills
```

**What this does:**
- Clones the skills repository to your local machine
- Makes all 4 skills available to your AI coding agent
- Enables automatic skill activation when you request integration

---

## Usage

Once installed, your AI coding agent will automatically activate the relevant skill when you request integration. For example:

- "Integrate Vercel AI SDK with You.com tools"
- "Set up Claude Agent SDK with You.com MCP"
- "Add You.com to my Teams app with Anthropic"
- "Configure OpenAI Agents SDK with You.com MCP"

Each skill provides step-by-step instructions, code templates, and validation checklists.

---

## Skill Structure

Each skill follows the agent-skills-spec format:

```
skills/{skill-name}/
├── SKILL.md          # Complete workflow with YAML frontmatter
└── assets/           # Code templates (optional)
```

**Skills are self-contained:**
- YAML frontmatter defines skill metadata (name, description, compatibility)
- Markdown body contains complete workflow, templates, validation, troubleshooting
- Assets directory provides ready-to-use code templates

---

## Prerequisites

**API Keys:**
- You.com API key: [Get yours](https://you.com/platform/api-keys)
- Provider API keys (Anthropic, OpenAI, etc.) depending on the skill

**Supported AI Agents:**
- Claude Code (Anthropic)
- Cursor
- Cody (Sourcegraph)
- Continue
- VS Code extensions
- And more (any agent supporting agent-skills-spec format)

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
- Use kebab-case (e.g., `ai-sdk-integration`)

---

## License

MIT - See [LICENSE](./LICENSE) file for details

---

## Support

- **Issues**: [GitHub Issues](https://github.com/youdotcom-oss/agent-skills/issues)
- **Email**: support@you.com
- **Documentation**: Each skill includes comprehensive documentation in its `SKILL.md` file
