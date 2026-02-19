# Running Evals in Docker

Docker provides a consistent, isolated environment for running agent evaluations. This guide covers lessons learned from real debugging sessions.

## Why Docker?

| Benefit | Description |
|---------|-------------|
| **Reproducibility** | Same environment in CI and local development |
| **Isolation** | API keys and CLIs don't pollute host system |
| **CI Integration** | GitHub Actions can run Docker Compose directly |
| **Multi-CLI Support** | Bundle multiple agent CLIs (Claude, Gemini) in one image |

## Dockerfile Structure

### Key Requirements

```dockerfile
# Start with Bun for fast TypeScript execution
FROM oven/bun:1.2.9

# Install Node.js 24+ (required for Gemini CLI's modern JS features)
RUN apt-get update && apt-get install -y git curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install Gemini CLI (npm global is accessible to all users)
RUN npm install -g @google/gemini-cli

# Create non-root user for Claude CLI
RUN useradd -m -s /bin/bash testuser
USER testuser
WORKDIR /home/testuser

# Install Claude CLI as non-root user
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/testuser/.local/bin:$PATH"
```

## Common Pitfalls & Solutions

### 1. Claude CLI Refuses to Run as Root

**Symptom:**
```
--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons
```

**Cause:** Claude CLI blocks auto-approve flags when running as root for security.

**Solution:** Create a non-root user and run tests as that user:
```dockerfile
RUN useradd -m -s /bin/bash testuser
USER testuser
RUN curl -fsSL https://claude.ai/install.sh | bash
```

### 2. Gemini CLI Syntax Error

**Symptom:**
```
SyntaxError: Unexpected token '.'
```

**Cause:** Gemini CLI uses optional chaining (`?.`) which requires Node.js 14+. The Bun base image includes Node.js 12.

**Solution:** Install Node.js 24 (latest LTS):
```dockerfile
RUN apt-get update && apt-get install -y nodejs  # From NodeSource repo
```

### 3. Global Package Permission Denied

**Symptom:**
```
error: Failed to link @google/gemini-cli: EACCES
```

**Cause:** Bun's global install creates packages in user-specific directories (`~/.bun`).

**Solution:** Use npm for system-wide packages (installs to `/usr/local`):
```dockerfile
# As root, before USER switch
RUN npm install -g @google/gemini-cli
```

### 4. CLI Not Found in PATH

**Symptom:**
```
which gemini  # fails
```

**Cause:** Non-root user doesn't have `/usr/local/bin` in PATH, or package was installed to root's home directory.

**Solution:** Verify symlinks point to accessible locations:
```bash
# Debug inside container
docker compose run --rm test bash -c 'which gemini && ls -la $(which gemini)'
```

### 5. Environment Variables Not Passed

**Symptom:** Tests timeout silently with no API calls being made.

**Solution:** Pass all required API keys via docker-compose.yml:
```yaml
environment:
  - ANTHROPIC_API_KEY
  - GEMINI_API_KEY
```

## Debugging Checklist

When tests fail in Docker, run these checks:

```bash
# 1. Verify CLI installation and access
docker compose run --rm test bash -c '
  echo "=== Node.js ===" && node --version &&
  echo "=== Bun ===" && bun --version &&
  echo "=== Claude ===" && which claude && claude --version &&
  echo "=== Gemini ===" && which gemini && gemini --version
'

# 2. Verify environment variables
docker compose run --rm test bash -c '
  echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+set}"
  echo "GEMINI_API_KEY: ${GEMINI_API_KEY:+set}"
'

# 3. Test CLI directly
docker compose run --rm test bash -c '
  gemini -p "Say hello" --output-format stream-json 2>&1 | head -5
'

# 4. Run as root to isolate permission issues
docker compose run --rm --user root test bash -c 'whoami && which claude'
```

## CI Integration (GitHub Actions)

```yaml
test-integration:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Run integration tests
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      run: docker compose -f docker-compose.test.yml run --rm test
```

## Version Matrix

Tested configurations:

| Component | Version | Notes |
|-----------|---------|-------|
| Bun | 1.2.9 | Base image |
| Node.js | 24.x | Required for Gemini CLI |
| Claude CLI | 2.1.14+ | Install as non-root |
| Gemini CLI | 0.25.0+ | Install via npm global |

## Example docker-compose.yml

```yaml
services:
  test:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      - ANTHROPIC_API_KEY
      - GEMINI_API_KEY
```

## Related

- [Execution Environment](../SKILL.md#execution-environment) - Main skill docs
- [Dockerfile.test](../../../../Dockerfile.test) - Reference implementation
