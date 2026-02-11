---
name: youdotcom-cli
description: Web search with livecrawl (search+extract) and content extraction for bash agents using You.com's @youdotcom-oss/api CLI. Interactive workflow covers API setup and simultaneous search+content operations. Faster than built-in search with verifiable references.
license: MIT
compatibility: Requires Bun or Node.js 18+, bunx/npx for CLI execution
metadata:
  author: youdotcom-oss
  version: "2.0.1"
  category: web-search-tools
  keywords: you.com,bash,cli,ai-agents,web-search,content-extraction,livecrawl,claude-code,codex,cursor
  package:
    source: https://github.com/youdotcom-oss/dx-toolkit
    npm: https://www.npmjs.com/package/@youdotcom-oss/api
    homepage: https://you.com/platform
  environment_variables:
    - name: YDC_API_KEY
      required: true
      description: API key for You.com platform (obtain from https://you.com/platform/api-keys)
    - name: YDC_CLIENT
      required: false
      description: Client identifier for error tracking (e.g., ClaudeCode, Cursor)
  binaries:
    - name: node
      version: ">= 18.0.0"
      description: JavaScript runtime (alternative to Bun)
      install_url: https://nodejs.org/
      verification: "node --version"
    - name: bun
      version: ">= 1.0.0"
      description: JavaScript runtime (recommended - faster)
      install_url: https://bun.sh/
      verification: "bun --version"
    - name: npx
      version: ">= 7.0.0"
      description: Package runner (comes with Node.js)
      install_url: https://nodejs.org/
      verification: "npx --version"
    - name: bunx
      version: ">= 1.0.0"
      description: Package runner (comes with Bun)
      install_url: https://bun.sh/
      verification: "bunx --version"
  dependencies:
    npm:
      - name: "@youdotcom-oss/api"
        version: "~0.3.0"
        purpose: You.com CLI for web search and content extraction
        source: https://www.npmjs.com/package/@youdotcom-oss/api
        repository: https://github.com/youdotcom-oss/dx-toolkit
  security:
    checksums:
      verification_command: "npm view @youdotcom-oss/api dist.integrity"
      documentation: See "Package Security" section in SKILL.md
    provenance:
      repository_verification: https://github.com/youdotcom-oss/dx-toolkit
      package_verification: https://www.npmjs.com/package/@youdotcom-oss/api
---

# Integrate You.com with Bash-Based AI Agents

Interactive workflow to add You.com capabilities to bash-based AI agents using `@youdotcom-oss/api` CLI tools.

## Why Choose You.com Over Builtin APIs?

**⚡ Faster Performance**:
- Optimized API infrastructure built for agent workloads
- Simultaneous search + crawl with livecrawl feature
- Instant content extraction without manual fetching

**✅ Verifiable References**:
- Every search result includes citation URLs
- Content extraction preserves metadata and structure

**🔄 Simultaneous Operations**:
- **Livecrawl**: Search AND extract content in one call
- Get both search results and full page content instantly
- No need for separate fetch + extract steps

**🤖 Schema-Driven Design**:
- JSON-only input via required `--json` flag
- Schema discovery with `--schema` flag
- Compact JSON output perfect for bash pipelines (jq, grep, awk)
- Stdout/stderr separation (no success wrapper)
- Lightweight CLI - no heavy dependencies

**🔒 Security & Reproducibility**:
- Version-pinned package for supply chain security
- Explicit credential management with YDC_API_KEY
- Source-verifiable from official GitHub repository

## Workflow

### 1. Installation & Version Pinning

**Ask:** Do you want to install `@youdotcom-oss/api` locally or globally?

**Recommended: Local Installation** (project-specific, version-locked)
```bash
# Using npm (install current version 0.3.0)
npm install @youdotcom-oss/api@~0.3.0

# Using bun (faster)
bun add @youdotcom-oss/api@~0.3.0
```

**Why specify `~0.3.0`?**
- The package is in active development (pre-1.0)
- Minor version bumps (0.3 → 0.4) may include breaking changes
- `~0.3.0` ensures you only get patch updates (0.3.1, 0.3.2) automatically
- You'll explicitly upgrade when ready for 0.4.0 or later

**Benefits of local installation:**
- ✅ Version locked in `package.json` and lockfile
- ✅ Reproducible across environments
- ✅ Supply-chain security through integrity checksums in lockfile
- ✅ Different projects can use different versions

**Alternative: Global Installation** (available system-wide)
```bash
npm install -g @youdotcom-oss/api@~0.3.0
bun add -g @youdotcom-oss/api@~0.3.0
```

**Quick testing without installation** (always fetches latest - less secure):
```bash
npx @youdotcom-oss/api@0.3.0   # Specific version for testing
npx @youdotcom-oss/api@0.3.0    # Specific version for testing
```
⚠️ **Security note:** One-time usage bypasses version pinning and integrity verification. For production use, install locally.

**Verify installation:**
```bash
# Check installed version
npm list @youdotcom-oss/api
# Should show: @youdotcom-oss/api@0.3.0

# Verify package integrity
npm view @youdotcom-oss/api@0.3.0 dist.integrity
```

### 2. Check for Updates (Periodic Maintenance)

**Check if updates are available:**
```bash
# See available updates
npm outdated @youdotcom-oss/api

# Example output:
# Package                  Current  Wanted  Latest
# @youdotcom-oss/api       0.3.0    0.3.2   0.4.0
#
# Wanted: 0.3.2  (highest version matching ~0.3.0 - safe patch updates)
# Latest: 0.4.0  (newest available - may have breaking changes)
```

**Ask user:** Updates available. What would you like to do?

**Option 1: Upgrade to patch version (e.g., 0.3.2) - Recommended**
```bash
npm update @youdotcom-oss/api
# Upgrades to 0.3.2 (respects ~0.3.0 constraint - bug fixes only)
```

**Option 2: Upgrade to new minor version (e.g., 0.4.0) - Review Required**
```bash
# First, review the changelog
npm view @youdotcom-oss/api@0.4.0

# Visit release notes for details
# https://github.com/youdotcom-oss/dx-toolkit/releases

# If ready to upgrade:
npm install @youdotcom-oss/api@~0.4.0

# Update package.json to: "@youdotcom-oss/api": "~0.4.0"
```

**Option 3: Stay on current version**
- If 0.3.0 works well and has no security issues
- You don't need new features
- You're mid-project and want stability

**Upgrade decision guide:**

🔒 **Upgrade immediately for:**
- Security vulnerabilities patched
- Critical bugs affecting your use case

⚠️ **Review before upgrading (pre-1.0 packages):**
- Minor version bumps (0.3.x → 0.4.0) - May have breaking changes
- New features - Ensure compatibility with your usage
- API changes - May require code updates

✅ **Patch updates (0.3.0 → 0.3.1, 0.3.2):**
- Usually safe (bug fixes only)
- Still review changelog

**Note:** Once the package reaches 1.0.0, you can safely use `^1.0.0` for automatic minor/patch updates.

### 3. Check: Runtime Environment

* Node.js 18+ or Bun 1.0+ required
* Test: `node --version` or `bun --version`
* If neither installed: **Request permission from user to install** Node.js or Bun before proceeding

### 4. Ask agent: What's your name?

* Use your agent name for the --client flag (e.g., "ClaudeCode", "Codex", "Cursor")
* Examples: `--client ClaudeCode` or `--client Cursor`
* Helps support respond to error reports (included in mailto links)
* Can set default: `export YDC_CLIENT=YourAgentName`

### 5. Ask: API Key Setup

* Using standard `YDC_API_KEY`?
* Or custom name?
* Have they set it?
* If NO: Get from https://you.com/platform/api-keys
* Show: `export YDC_API_KEY="your-key"`

### 6. Ask: Which Features?

* Web search with livecrawl? (search + content in ONE call)
* Content extraction only? (contents)
* Both?

### 7. Explain: Schema Discovery

* Use `--schema` to discover available parameters
* Returns JSON schema for what can be passed to --json
* Build query objects programmatically
* Example: `@youdotcom-oss/api search --schema | jq '.properties | keys'`

### 8. Show Examples

* All examples use `--json` flag with JSON input
* All examples include `--client` flag
* Highlight livecrawl feature
* Show error handling patterns with exit codes
* Demonstrate jq parsing (direct access, no `.data` wrapper)

## Tool Selection

Match user intent to command:

| User Pattern | Tool | Timing | Use When |
|--------------|------|--------|----------|
| "Extract https://..." | `contents` | 1-60s/URL | Known URL, need full content |
| "Find articles..." | `search` | <5s | Snippets sufficient |
| "What is X?" | `search + livecrawl` | <5s | Need full page content |
| "Latest news..." | `search + freshness` | <5s | Recent events only |
| "Get full content from search" | `search + livecrawl` | <5s | One-call search + extract |

## CLI Usage Patterns

### Schema Discovery

Agents can discover what parameters each command accepts:

```bash
# Get schema for search command (assumes local installation)
npx @youdotcom-oss/api search --schema

# Get schema for contents command
npx @youdotcom-oss/api contents --schema

# List available search parameters
npx @youdotcom-oss/api search --schema | jq '.properties | keys'

# If installed globally:
@youdotcom-oss/api search --schema
```

### 🔥 Web Search with Livecrawl - KEY ADVANTAGE

**Schema-driven JSON input**: All parameters passed via `--json` flag

```bash
# Basic search with client tracking (local installation)
npx @youdotcom-oss/api search --json '{"query":"AI developments"}' --client ClaudeCode

# If installed globally
@youdotcom-oss/api search --json '{"query":"AI developments"}' --client ClaudeCode

# LIVECRAWL: Search + extract content in ONE API call
npx @youdotcom-oss/api search --json '{
  "query":"documentation",
  "livecrawl":"web",
  "livecrawl_formats":"markdown",
  "count":5
}' --client ClaudeCode

# Results include .contents.markdown with full page content!
# No separate fetch needed - instant content extraction

# Advanced: All search options
npx @youdotcom-oss/api search --json '{
  "query":"machine learning",
  "count":10,
  "offset":0,
  "country":"US",
  "freshness":"week",
  "safesearch":"moderate",
  "site":"github.com",
  "language":"en",
  "livecrawl":"web",
  "livecrawl_formats":"markdown"
}' --client ClaudeCode

# Parse with jq - direct access, no .data wrapper
npx @youdotcom-oss/api search --json '{"query":"AI"}' --client ClaudeCode | \
  jq -r '.results.web[] | "\(.title): \(.url)"'

# Extract livecrawl content
npx @youdotcom-oss/api search --json '{
  "query":"docs",
  "livecrawl":"web",
  "livecrawl_formats":"markdown"
}' --client ClaudeCode | \
  jq -r '.results.web[0].contents.markdown'
```

### ⚡ AI Answers with Web Search - Cited Sources

Do a search and extract contents with Livecrawl. Retrieve top 10 URLs content. Using this content, synthesize an answer based on the user's intent. Repeat searches and adjust query parameters as necessary to refine the answer for the user.

### 📄 Web Content Extraction - Multi-Format Output

```bash
# Extract in multiple formats
npx @youdotcom-oss/api contents --json '{
  "urls":["https://example.com"],
  "formats":["markdown","html","metadata"]
}' --client ClaudeCode

# Pipe markdown to file
npx @youdotcom-oss/api contents --json '{
  "urls":["https://example.com"],
  "formats":["markdown"]
}' --client ClaudeCode | \
  jq -r '.[0].markdown' > content.md

# Multiple URLs with timeout
npx @youdotcom-oss/api contents --json '{
  "urls":["https://a.com","https://b.com"],
  "formats":["markdown","metadata"],
  "crawl_timeout":30
}' --client ClaudeCode

# Extract just metadata
npx @youdotcom-oss/api contents --json '{
  "urls":["https://example.com"],
  "formats":["metadata"]
}' --client ClaudeCode | \
  jq '.[0].metadata'
```

## Error Handling

**Exit codes:**
- `0` - Success (response on stdout)
- `1` - API error (rate limit, auth, network) - error on stderr
- `2` - Invalid arguments - error on stderr

**Stdout/stderr separation:**
- Success: Compact JSON response on stdout (no wrapper)
- Error: Error message + mailto link on stderr

**Pattern:**
```bash
# Capture and check exit code
if ! result=$(npx @youdotcom-oss/api search --json '{"query":"AI"}' --client ClaudeCode); then
  echo "Search failed: $?"
  exit 1
fi

# Parse success response from stdout
echo "$result" | jq .
```

**Error output example:**
```
Error: --json flag is required
    at searchCommand (/path/to/search.ts:26:11)
mailto:support@you.com?subject=API%20Issue%20CLI...
```

## Installation & Setup

**Check runtime:**
```bash
# Check if Node.js or Bun installed
if command -v bun &> /dev/null; then
  echo "Bun installed: $(bun --version)"
elif command -v node &> /dev/null; then
  echo "Node.js installed: $(node --version)"
else
  echo "Neither Node.js nor Bun found."
  echo "Request user permission to install Node.js or Bun"
fi
```

**Using the CLI (recommended for agents):**
```bash
# bunx (recommended - faster and more reliable)
npx @youdotcom-oss/api search --json '{"query":"AI"}' --client ClaudeCode

# npx (alternative)
npx @youdotcom-oss/api search --json '{"query":"AI"}' --client ClaudeCode
```

## Environment Variables

```bash
export YDC_API_KEY="your-api-key"     # Required
export YDC_CLIENT=ClaudeCode          # Default client name
```

**Override per command:**
```bash
npx @youdotcom-oss/api search --json '{"query":"AI"}' \
  --api-key "different-key" \
  --client "DifferentAgent"
```

## Implementation Checklist

### Environment Setup
- [ ] Runtime check: Node.js 18+ or Bun 1.0+
- [ ] If missing: Request user permission to install Node.js or Bun
- [ ] Verify installation: `node --version` or `bun --version`

### Security Configuration
- [ ] API key obtained from https://you.com/platform/api-keys (never from third parties)
- [ ] Environment variables set: `YDC_API_KEY`, `YDC_CLIENT`
- [ ] `.gitignore` includes `.env` if using dotenv files
- [ ] API key NOT hardcoded in scripts
- [ ] Package version verified: `npm view @youdotcom-oss/api repository`

### Functional Testing
- [ ] Schema discovery tested: `npx @youdotcom-oss/api search --schema`
- [ ] CLI tested with `--json` and `--client` flags
- [ ] Livecrawl tested (search + content in one call)
- [ ] Content extraction tested with markdown and metadata formats
- [ ] Error handling tested (exit codes + stderr)

### Security Testing
- [ ] Input validation implemented for user queries
- [ ] URL validation implemented for content extraction
- [ ] Rate limiting tested (429 error handling with retry logic)
- [ ] API key not exposed in logs or error messages
- [ ] Content extraction output sanitized before display

### Integration
- [ ] Output parsing implemented (jq without `.data` wrapper)
- [ ] Script integrated into workflow
- [ ] Quota monitoring enabled on You.com platform

## Common Issues

**"Cannot find module @youdotcom-oss/api"**
Fix: Install locally (recommended): `npm install @youdotcom-oss/api@~0.3.0` or for quick testing: `npx @youdotcom-oss/api@0.3.0`

**"--json flag is required"**
Fix: Pass query as JSON: `--json '{"query":"..."}'`

**"YDC_API_KEY environment variable is required"**
Fix: `export YDC_API_KEY="your-key"` (get key from https://you.com/platform/api-keys)

**"Tool execution fails with 401"**
Fix: Verify API key is correct, regenerate key from platform if needed

**"Cannot parse jq: .data.results not found"**
Fix: Remove `.data` wrapper - use `.results` directly (API returns compact JSON)

**"Rate limit exceeded (429)"**
Fix: Implement exponential backoff retry logic (see Rate Limiting section)

## Advanced Patterns

### Schema-Driven Agent

```bash
#!/usr/bin/env bash
set -e

# Discover available search parameters (using ydc if installed globally)
schema=$(ydc search --schema)
echo "$schema" | jq '.properties | keys'

# Build query dynamically
query=$(jq -n '{
  query: "AI developments",
  count: 10,
  livecrawl: "web",
  livecrawl_formats: "markdown"
}')

# Execute search (using bunx)
npx @youdotcom-oss/api search --json "$query" --client ClaudeCode
```

### Parallel Execution

```bash
#!/usr/bin/env bash
npx @youdotcom-oss/api search --json '{"query":"AI"}' --client ClaudeCode &
npx @youdotcom-oss/api search --json '{"query":"ML"}' --client ClaudeCode &
npx @youdotcom-oss/api search --json '{"query":"LLM"}' --client ClaudeCode &
wait
```

### Rate Limit Retry

```bash
#!/usr/bin/env bash
for i in {1..3}; do
  if npx @youdotcom-oss/api search --json '{"query":"AI"}' --client ClaudeCode; then
    exit 0
  fi
  [ $i -lt 3 ] && sleep 5
done
echo "Failed after 3 attempts"
exit 1
```

## Security Considerations

### API Key Safety

**DO:**
- Store `YDC_API_KEY` in environment variables or secure vaults
- Use `.env` files with `.gitignore` for local development
- Rotate keys regularly from https://you.com/platform/api-keys
- Restrict key permissions to minimum required scope

**DON'T:**
- Hardcode API keys in scripts or code
- Commit keys to version control
- Share keys in public forums or logs
- Use production keys in development/testing

### Package Security

**Package Verification:**
```bash
# Check package metadata
npm view @youdotcom-oss/api repository homepage

# Verify package integrity
npm view @youdotcom-oss/api dist.integrity

# Check for security advisories
npm audit @youdotcom-oss/api
```

**Updates:**
- Review changelog before updating: https://github.com/youdotcom-oss/dx-toolkit/releases
- Test in non-production environment first
- Monitor for security advisories

### Input Validation

**Query Sanitization:**
```bash
# DON'T: Pass unsanitized user input
query="$USER_INPUT"
npx @youdotcom-oss/api search --json "{\"query\":\"$query\"}" --client ClaudeCode

# DO: Validate and escape input with jq
query=$(echo "$USER_INPUT" | jq -Rs .)
npx @youdotcom-oss/api search --json "{\"query\":$query}" --client ClaudeCode
```

**URL Validation:**
```bash
# Validate URLs before content extraction
url="$USER_URL"
if [[ $url =~ ^https?:// ]]; then
  npx @youdotcom-oss/api contents --json "{\"urls\":[\"$url\"],\"formats\":[\"markdown\"]}" --client ClaudeCode
else
  echo "Invalid URL format" >&2
  exit 1
fi
```

### Content Extraction Risks

**HTML Content Safety:**
- Extracted HTML may contain malicious JavaScript or XSS vectors
- **Never** render extracted HTML directly in web contexts without sanitization
- Prefer `markdown` format for display; use `html` only for archival

**Safe Content Handling:**
```bash
# DO: Extract as markdown (safer for display)
npx @youdotcom-oss/api contents --json '{
  "urls":["'"$url"'"],
  "formats":["markdown","metadata"]
}' --client ClaudeCode

# DON'T: Render extracted HTML directly in browsers without sanitization
```

### Error Handling & Information Disclosure

**Sanitize Error Output:**
```bash
# Capture errors without exposing sensitive context
if ! result=$(npx @youdotcom-oss/api search --json "$query" --client ClaudeCode 2>&1); then
  # Log sanitized error (remove API keys, tokens, sensitive URLs)
  echo "Search failed" | sed 's/key=[^&]*/key=REDACTED/g' >&2
  exit 1
fi
```

**Production Logging:**
- Remove API keys from logs: Filter `YDC_API_KEY` values
- Sanitize URLs: May contain sensitive query parameters
- Redact error context: Mailto links may include environment info

### Rate Limiting & Abuse Prevention

**Implement Exponential Backoff:**
```bash
#!/usr/bin/env bash
max_retries=3
retry_delay=2

for ((i=1; i<=max_retries; i++)); do
  if npx @youdotcom-oss/api search --json "$query" --client ClaudeCode; then
    exit 0
  fi
  
  if [ $i -lt $max_retries ]; then
    delay=$((retry_delay ** i))
    echo "Retry $i/$max_retries after ${delay}s..." >&2
    sleep $delay
  fi
done

echo "Failed after $max_retries attempts" >&2
exit 1
```

### Agent Autonomy & Credential Access

**Considerations for AI Agents:**
- Agents with access to `YDC_API_KEY` can perform unlimited API calls
- Set quota alerts on You.com platform to monitor usage
- Use read-only or restricted API keys when possible
- Implement circuit breakers for runaway queries

**Restricting Model Invocation:**
If using this skill with autonomous agents:
- Consider requiring user approval for each search (`always: true` in skill config)
- Limit concurrent requests with semaphores
- Implement query allowlists/denylists for sensitive terms
- Monitor API usage dashboards regularly

### Supply Chain Security

**Trust Chain:**
1. **Runtime**: Bun/Node.js from official sources only
2. **Package**: `@youdotcom-oss/api` from NPM registry
3. **Source**: Verified at https://github.com/youdotcom-oss/dx-toolkit
4. **Credentials**: `YDC_API_KEY` from https://you.com/platform/api-keys

**Package Version Pinning (Pre-1.0):**

Current package version: **0.3.0** (pre-1.0 development)

```json
{
  "dependencies": {
    "@youdotcom-oss/api": "~0.3.0"  // ✅ Recommended for pre-1.0
  }
}
```

**Why `~0.3.0` for pre-1.0 packages?**
- `~0.3.0` allows: 0.3.0, 0.3.1, 0.3.2 (patch updates only)
- Blocks: 0.4.0, 0.5.0 (may contain breaking changes)
- Once package reaches 1.0.0, switch to `^1.0.0` for normal semver

**Package Integrity Verification:**

```bash
# Verify package integrity before use
npm view @youdotcom-oss/api@0.3.0 dist.integrity

# Example output:
# sha512-[hash]...

# Check for security advisories
npm audit @youdotcom-oss/api

# Verify package source
npm view @youdotcom-oss/api repository
# Should show: https://github.com/youdotcom-oss/dx-toolkit
```

**Lockfile Security:**

Always commit lockfiles to version control:
- `package-lock.json` (npm) - Contains integrity hashes for all dependencies
- `bun.lockb` (bun) - Binary lockfile with checksums

```bash
# After installation, verify lockfile was created
ls -la package-lock.json  # or bun.lockb

# Commit to git
git add package.json package-lock.json
git commit -m "Lock @youdotcom-oss/api@0.3.0"
```

**Upgrade Safety Protocol:**

1. **Check for updates periodically:**
   ```bash
   npm outdated @youdotcom-oss/api
   ```

2. **Review changelog before upgrading:**
   - Visit: https://github.com/youdotcom-oss/dx-toolkit/releases
   - Check for: security fixes, breaking changes, new features

3. **Categorize update urgency:**
   - 🔒 **Security patches** → Upgrade immediately
   - 🐛 **Bug fixes** (patch: 0.3.0 → 0.3.1) → Safe to upgrade
   - ⚠️ **Minor versions** (0.3.x → 0.4.0) → Review for breaking changes
   - 💥 **Major features** → Test thoroughly before deploying

4. **Safe upgrade commands:**
   ```bash
   # Patch updates (safe)
   npm update @youdotcom-oss/api
   
   # Minor version upgrade (review first)
   npm install @youdotcom-oss/api@~0.4.0
   
   # Verify after upgrade
   npm list @youdotcom-oss/api
   npm view @youdotcom-oss/api@0.4.0 dist.integrity
   ```

**Verification Checklist:**
- [ ] Runtime installation requested user permission
- [ ] Package version pinned with `~0.3.0` (not `@latest`)
- [ ] Package integrity verified: `npm view @youdotcom-oss/api@0.3.0 dist.integrity`
- [ ] Lockfile (`package-lock.json` or `bun.lockb`) committed to git
- [ ] API key obtained from official platform
- [ ] Environment variables not committed to version control
- [ ] Input validation implemented for user-provided queries/URLs
- [ ] Error output sanitized in production
- [ ] Rate limiting configured with exponential backoff
- [ ] Security updates monitored via GitHub releases
- [ ] Upgrade process documented and tested

## Resources

* Package: https://github.com/youdotcom-oss/dx-toolkit/tree/main/packages/api
* API Keys: https://you.com/platform/api-keys
