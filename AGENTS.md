
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

The **Semantic Release** workflow (`release.yml`) runs manually via `workflow_dispatch` — from the Actions UI, or with `gh` (`workflow` + `repo` scopes):

```bash
gh workflow run release.yml --ref main -f base_ref=<ref> -f apply_versions=<bool> -f publish_artifacts=<bool> [-f droid_advice=false]
```

1. Preview locally first: `bun scripts/semver-release.ts plan --base <ref> --out /tmp/agent-skills-release-plan.json` (prints bump levels; applies nothing).
2. Dry-run in CI with `apply_versions=false` and `publish_artifacts=false`; inspect the `release-plan` artifact.
3. Set `base_ref` to the last release commit. `HEAD~1` only sees the last commit — after a squash-merge plus a follow-up fix it misses the feature changes — so prefer an explicit commit SHA (e.g. the previous `chore(release)` commit). An older base may bump every changed skill, plugin, npm package, PyPI package, and ClawHub package since that ref.
4. Apply versions: `apply_versions=true`, `publish_artifacts=false`. The workflow bumps, runs `build`/`check`/`test`, and commits `chore(release): apply semantic release plan [skip ci]` to the dispatched ref.
5. After the version-bump commit lands, publish-only: `apply_versions=false`, `publish_artifacts=true`. **Reuse the same `base_ref` from step 3.** The apply run advanced the ref, so a relative base like `HEAD~2` now points elsewhere — the explicit SHA is what makes the same value work for both runs. The publish jobs use the regenerated plan only to pick which packages to publish (`has_npm`/`has_pypi`/`has_clawhub`); published versions come from the checked-out release commit.
6. If a registry already succeeded and a retry should skip it, disable the matching publish toggle: `publish_npm`, `publish_pypi`, or `publish_clawhub`.

## Verification

- Non-trivial TypeScript/script change: at least `bun test <target>` and `bun run check:types`.
- Python/Hermes change: use `packages/hermes/package.json` scripts, usually `bun run --cwd packages/hermes check:python`.
- Formatting/linting: `bun run check:ts` for Biome, `bun run check:package` for package manifests, `bun run check:py` for Python.
- Skill content: `bun test tests/validate-skills.spec.ts`; use `bunx @plaited/development-skills validate-skill <path>` when validating one skill.
- Before final handoff after edits, run the smallest relevant checks plus any requested full checks. Report known pre-existing warnings separately.
