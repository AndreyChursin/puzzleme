# Automation validation — 2026-11-09

Environment: Linux, Node **24.22.1**, pnpm **11.25.0**. Application source,
workspace configuration, TypeScript configuration, and existing tests are unchanged.

## Executed successfully

- `pnpm install --frozen-lockfile`, including the existing CanvasKit copy hook;
  also exercised through the health command runner.
- `pnpm typecheck`; also exercised through the health command runner.
- `pnpm lint` with ESLint 10.14.0, including the new automation scripts.
- `pnpm test`: 1 game-core test file, 8 tests passed.
- `pnpm test:automation`: 8 tests passed. Covers allowlisted diagnostics, synthetic
  secret exclusion from stdout/artifacts/summary, temporary log cleanup, child
  exit-code preservation, rejecting arbitrary command input, duplicate detection,
  required labels, repeated-report idempotency, infrastructure failures, and API
  error propagation. GitHub API calls are mocked; no test issue was published.
- `pnpm export:web` through the health runner: production Expo Web export succeeded.
- `pnpm check:dependencies`: Expo reports dependencies are up to date.
- Both workflows validated with **actionlint 1.7.12**.
- All five YAML files parsed with **PyYAML 6.0.3**; issue form required structure,
  field identifiers, and workflow root keys checked.
- Every referenced action SHA resolved to its published `action.yml`; supplied
  input names validated against that exact action revision.
- `git diff --check`; no application source or existing test changes.

Local commands used writable `XDG_DATA_HOME`, `XDG_CACHE_HOME`, and
`__UNSAFE_EXPO_HOME_DIRECTORY` under `/tmp` because this environment's home is
read-only. These overrides are not needed on ordinary developer/GitHub runners.
An initial local invocation without those overrides failed on the pnpm home path;
it passed with the environment overrides. Initial automation test naming collided
with Vitest discovery; the Node test file was renamed and both suites passed.

## Executed and failed: dependency audit

`pnpm audit --audit-level=low --json`, also through the health runner, returned
exit code 1 with **2 moderate**, 0 high, and 0 critical advisories:

- `glob`: [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4),
  AbortSignal cancellation bypass; patched range `>=14.0.2`. Present in the Expo
  CLI/fingerprint dependency graph.
- `minimatch`: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249),
  globparts amplification denial of service; patched range `>=11.0.1`. Present in
  Expo tooling and the new ESLint/TypeScript-ESLint dependency graph.

No advisory is ignored, no audit failure is masked, and no broad transitive
upgrade/override is introduced in this infrastructure PR. Review upstream
compatibility and remediation separately. Until remediated, daily health checks
are expected to fail audit and create at most one open marked audit issue.
Audit results are point-in-time registry data and may change.

## Not executed

- Actual GitHub scheduled/manual health runs, live issue creation/deduplication,
  Actions artifact upload/retention, and token permissions. These require the
  workflow on the default branch and a controlled hosted test. The inline
  reporter is tested with mocks only.
- iOS/EAS builds, signing, submissions, or physical-device tests.
- New browser runtime, screenshot, offline/PWA, gameplay, or performance tests;
  application code is unchanged. Web export is a build check only.
- Branch protection or repository setting mutations; recommendations are in
  [continuous-development.md](continuous-development.md).
- Codex/external dispatcher integration; only an architecture is prepared,
  with missing authentication and service configuration documented.

## Files

Created: `.github/workflows/ci.yml`, `.github/workflows/health-check.yml`,
`.github/pull_request_template.md`, three issue forms under `.github/ISSUE_TEMPLATE/`,
`.github/scripts/health-check.mjs`, `.github/scripts/automation-tests.mjs`,
`.node-version`, `eslint.config.mjs`, `docs/continuous-development.md`, and this record.
Modified: `package.json` (tooling/scripts), `pnpm-lock.yaml` (lint tooling), and
`README.md` (documentation link).

## Maintainer follow-up

Require the **CI checks** status on main after its first hosted success, require
reviewed PRs, prevent force pushes/deletion, retain disabled auto-merge, and review
Actions/fork token policy. Configure no production secrets for validation. After
merge, manually run both workflows, verify health reporting in a controlled test,
and monitor the daily schedule. Review the moderate advisories. Before enabling
future AI work, provision and review the documented dispatcher, authentication,
approval records, budgets, and isolated publisher. Do not merge automatically.
