
# Agent Instructions

This repo packages You.com skills and plugin manifests for multiple coding-agent surfaces. Keep changes small, verified, and tied to the requested surface.

## Tooling discovery

- Prefer Bun for TypeScript, scripts, orchestration, and running checks. Use Bun to trigger Python and TypeScript tooling unless an existing script says otherwise.
- Bun MCP docs: https://bun.com/docs/mcp
- Before choosing commands, scan `package.json`, `biome.json`, `ruff.toml`, and relevant `packages/*/package.json` scripts. Do not guess command names.
- Root checks currently flow through Bun: `bun test`, `bun run check`, `bun run check:types`, `bun run check:ts`, `bun run check:py`, `bun run check:package`.
- Package checks often differ. Use the package script in `packages/<name>/package.json` for package-scoped work.

## Minimal-implementation directive

Before writing code, resolve the task at the FIRST step that holds:

1. Does this capability need to exist for the stated task? If it is speculative, do not build it. Say so in one sentence and stop.
2. Does something already in THIS codebase do it? Reuse it. Read before you write; re-implementing a helper that lives three files over is the most common waste.
3. Does the standard library or the runtime/platform already do it? (`<input type="date">`, a DB unique constraint, a CSS rule.) Use it.
4. Does an already-installed dependency do it? Use it. Do not add a new dependency for something a few lines cover.
5. Can it be one clear expression? Write the one expression.
6. Otherwise: the smallest code that fully handles the task.

NON-NEGOTIABLE FLOOR: none of the steps above may remove any of these, and "minimal" is never a reason to drop them:

- input validation at trust boundaries (anything crossing a process, network, file, or user edge),
- error handling that prevents data loss or silent corruption,
- authn/authz and other security checks,
- accessibility for anything a human interacts with.

If a step would require cutting one of these, that step does not apply.

Leave exactly one runnable check behind for any non-trivial logic.
Mark deliberate shortcuts with a `MINIMAL:` comment naming the ceiling and the upgrade path, so "later" is greppable instead of forgotten.

## Style enforcement

- TypeScript, JSON, and Markdown formatting/linting are governed by `biome.json` plus `tsc`.
- Python formatting/linting is governed by `ruff.toml` plus Hermes package checks.
- Read these config files before changing style rules. Keep only conventions not enforced by tools in this file.

## Workflow

- Read existing code before editing. Prefer `Read`, `Grep`, and `Glob` for exploration.
- Treat generated or copied skill/package files as release artifacts unless the task is explicitly about them.
- Do not inline MCP configs into shared manifests unless the host specifically requires it; users choose keyless, API-key, OAuth, MPP, or x402 setup by need.
- Keep marketplace `plugins[].version` pegged to the paired `plugin.json` version.
- For PR review work, use `gh` when available and check PR comments, reviews, code scanning alerts, and inline comments.
- Conventional commits only: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `ci:`.

## Release workflow

The GitHub Actions UI runs **Semantic Release** manually:

1. Open **Actions** -> **Semantic Release** -> **Run workflow**.
2. First run with `apply_versions=false` and `publish_artifacts=false`; inspect the `release-plan` artifact.
3. Set `base_ref` to the intended comparison point. `HEAD~1` only sees the last commit; an older base may bump every changed skill, plugin, npm package, PyPI package, and ClawHub package since that ref.
4. Run again with `apply_versions=true` to commit version bumps.
5. Run with `publish_artifacts=true` only when ready to publish npm, PyPI, and ClawHub artifacts.

## Verification

- Non-trivial TypeScript/script change: at least `bun test <target>` and `bun run check:types`.
- Python/Hermes change: use `packages/hermes/package.json` scripts, usually `bun run --cwd packages/hermes check:python`.
- Formatting/linting: `bun run check:ts` for Biome, `bun run check:package` for package manifests, `bun run check:py` for Python.
- Skill content: `bun test tests/validate-skills.spec.ts`; use `bunx @plaited/development-skills validate-skill <path>` when validating one skill.
- Before final handoff after edits, run the smallest relevant checks plus any requested full checks. Report known pre-existing warnings separately.
