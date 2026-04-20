Additional checks for this codebase:

## Code Quality

- Prefer `type` over `interface` for type definitions
- Use arrow functions (`const fn = () =>`) over function declarations
- Use `#field` (ES2022 private) instead of `private field` (TypeScript)
- No `any` types — use `unknown` with type guards
- No index.ts files (except plugin entry points) — use feature-named re-exports
- Explicit `.ts` extensions on all local imports
- Object params when >2 args: `fn({ a, b, c }: { ... })`
- Zod namespace import: `import * as z from 'zod'`
- Import directly from specific files, not through re-exports within a module

## Testing

- Use `test()` not `it()` for test declarations
- No conditional assertions — assert the condition first
- Test both branches: try/catch, conditionals, fallbacks
- Prefer real dependencies over mocks for module resolution tests
- Organize with `describe()` blocks

## Bun Runtime

- `Bun.file()` over `fs.existsSync()` / `readFileSync()`
- `Bun.write()` over `writeFileSync()`
- `Bun.\$\`cmd\`` over `child_process.spawn()`
- `import.meta.dir` over `process.cwd()`
- Run commands from repo root with `bun --cwd packages/<name>` — never `cd` into packages

## Monorepo Specifics

- Use relative paths within packages, not workspace aliases
- Cross-package deps must use exact versions (no `^` or `~`)
- Only root `bun.lock` is committed
- Package directory name must match npm name after `@youdotcom-oss/`

## Security

- Never commit secrets, API keys, or tokens
- Check for OWASP top 10, command injection, XSS
- Verify new dependencies for license compliance
- Watch for ReDoS patterns in regex

## Breaking Changes

- Flag any changes to public API signatures
- Check for TSDoc `@public` markers on modified exports
- Verify backward compatibility of Zod schema changes
