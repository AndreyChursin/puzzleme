# Continuous development

This infrastructure validates the existing Phase 1 application. It does not change
puzzle mechanics, implement future phases, deploy a release, or enable AI fixes.

## Toolchain and local reproduction

Use Node **24.22.1** (`.node-version`) and pnpm **11.25.0** (`packageManager`). Both
workflows pin these versions and Node 24-native actions to full commit SHAs. pnpm's store is
cached by OS/toolchain/lockfile using setup-node; node_modules is not cached.
Update toolchain pins together and verify compatibility with the current Expo SDK.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm test:automation
pnpm export:web
pnpm check:dependencies
pnpm audit --audit-level=low --json
```

Frozen installation verifies workspace manifests against the lockfile; the Expo
check validates SDK/native dependency version compatibility. CI additionally checks
that dependency manifests and lockfile were not modified. ESLint covers TypeScript,
TSX, and JavaScript configuration/automation files, excluding generated output.
Unit tests currently cover the game-core foundation, not the complete game.
Automation tests cover diagnostic disclosure and mocked issue-reporting behavior.

CI runs for pushes to main, PRs targeting main, and manual dispatch. The single
required check is **CI checks**. Health runs daily at **06:00 UTC (09:00 Moscow)**
and via manual dispatch. GitHub schedules run the default branch, may be delayed,
and can be disabled after inactivity in public repositories. Scheduled runs only
start after the workflow lands on the default branch. Workflows have time limits;
health commands also have a ten-minute timeout. Read-only PR validation uses
`pull_request`, never `pull_request_target`.

## Health failure handling and privacy

Validation has only `contents: read`; checkout does not persist Git credentials.
No environment, deployment, cloud provider, Expo, Apple, or production secrets are
attached to either workflow. Do not add them to validation jobs. Dependencies and
PR scripts execute untrusted code; GitHub's ephemeral read-only token is not a
production credential. Keep fork approval and read-only token policies enabled.

Each health command captures stdout/stderr into a private temporary runner file.
Only allowlisted diagnostics are published: check identifier, exit code, status,
interruption indicator, TypeScript error codes, and audit severity counts. Raw
messages, source lines, paths, registry URLs, dependency payloads, and environment
values never enter the artifact, issue body, or command log. Temporary output is
deleted after normal completion; runner disposal removes it after cancellation.
This intentionally trades detailed error messages for disclosure control. Reproduce
locally for detailed errors, and review them before sharing. Do not enable shell
tracing or Actions debug logging with secret-bearing configuration.

Safe JSON logs appear in the job summary and the **health-diagnostics** artifact
(retained seven days). Installation failure skips dependent checks; other failures
do not stop remaining checks. Audit covers all locked dependencies at low severity
or above; registry/network failures also fail the check. There is no ignored audit
failure or automated dependency upgrade. Investigate findings before changing pins.

The separate reporter has `issues: write`, executes only the inline reporting
script, and never checks out code or executes artifacts. It uses job outcome
metadata, not raw errors. It creates missing `bug`/`automated` labels as needed and
one issue per failed check (or infrastructure failure), with a run/commit link and
acceptance criteria. It paginates all open issues and matches the stable
`puzzleme-health:<check>:v1` marker, independent of labels/title. Keep this marker
when editing an automated issue. Existing open matches suppress creation and
comments; closed issues permit a new recurrence. Health workflow concurrency
serializes lookup/create across scheduled/manual runs. New occurrences remain
visible in Actions even while an issue is open. This coarse per-check grouping
avoids storms but may group distinct causes; maintainers should split them manually.
Cancellation does not open issues. Runner outage or GitHub API failure may prevent
reporting; monitor Actions notifications as a fallback. Reporter failure is visible
as a failed job and is not retried in a loop.

## Required GitHub configuration (maintainer actions)

These are recommendations only; this PR does not modify repository settings.

1. Enable GitHub Actions and allow the pinned actions used by these workflows.
   Default workflow permissions should be read-only; allow the health reporter's
   explicit `issues: write` permission. Enable Issues. No additional secret is
   required for CI or health checks; the reporter uses ephemeral `GITHUB_TOKEN`.
2. After the first successful PR run, protect `main` with a branch rule/ruleset:
   require a pull request, at least one approving reviewer, dismiss stale approvals,
   require conversation resolution, require the **CI checks** status check from
   GitHub Actions, and require the branch to be up to date before merging.
   Apply to administrators where feasible and keep bypass permissions minimal.
   Daily health checks are not PR-required checks (they do not run for PRs).
3. Block force pushes and branch deletion on `main`.
4. Disable **Allow auto-merge** in repository merge settings. Do not enable merge
   queues, bot merge credentials, or auto-merge workflows for now. Humans review
   and merge PRs explicitly; CI success alone never authorizes merging.
5. Keep fork PR tokens read-only and secrets unavailable; require approval of
   outside-contributor workflow runs. Do not use self-hosted runners for arbitrary
   PRs. Review workflow changes carefully; consider CODEOWNERS for `.github/`,
   dependency manifests, and release configuration once owners are agreed.
6. After merge, manually dispatch both workflows and confirm scheduled runs,
   artifact retention, labels, and issue reporting permissions. To test failure
   handling, use a disposable test repository/branch with a controlled failing
   check, run twice, and verify a single open marked issue. Do not inject fake
   failures into main or publish genuine secrets to test redaction.

## Manual application verification

Web: run `pnpm export:web`, serve `apps/game/dist` over HTTP with SPA fallback,
and open desktop/mobile viewports. Confirm the Skia mountain scene renders from
local CanvasKit WASM and the project-details button opens/closes. Inspect browser
console errors. The current shell is not a PWA/offline-ready application; Web
export success does not establish offline operation or browser runtime correctness.

On an SDK-supported iOS development client/device, follow README's EAS setup,
install the development build, run `pnpm ios`, and verify the same scene and toggle.
Record device, OS, client build, connectivity, results, and screenshots for UI
changes. Signing/Expo accounts and physical-device testing are manual prerequisites;
this CI does not build, sign, submit, or validate iOS. Mark unexecuted tests explicitly.

## Future Codex triage and fixes (disabled architecture)

GitHub Actions can schedule validation and queue work. **Do not assume it can
schedule Codex Cloud tasks directly.** No Codex endpoint, scheduler, token, or
service integration is configured here. A maintainer must choose a documented
supported interface and provision its authentication before implementing this flow.

Proposed trust boundaries and bounded state machine:

1. A trusted GitHub App/service receives issue metadata or a maintainer requests
   triage. Triage is read-only: classify, suggest reproduction, and draft a plan.
   Treat issue text, comments, attachments, links, logs, and repository content as
   untrusted data; they cannot authorize tools or override policy. Never execute
   embedded commands or implement arbitrary issue text automatically.
2. A maintainer with write access explicitly approves a specific issue, commit,
   scope/path allowlist, acceptance criteria, test commands, and risk classification.
   A label alone or an approval-looking issue comment is insufficient: validate
   actor permissions and the approval record through the authenticated service.
   Bind approval to a content hash; changed scope/text invalidates approval.
3. An authenticated dispatcher creates an idempotent queue record keyed by
   repository + issue + approved scope hash. Only one active attempt per key.
   Persist states `proposed -> approved -> running -> PR opened | failed | expired`.
   Allow **one initial fix attempt and one maintainer-approved retry**, each with
   a 30-minute wall-clock limit and explicit tool/token budget. No self-retries,
   recursive agents, webhook/comment feedback loops, or reopening work automatically.
   On budget exhaustion or unclear scope, stop and ask a maintainer in the issue.
4. Run approved work in an isolated ephemeral checkout with no production secrets,
   signing keys, deployment credentials, or unrestricted GitHub token. Prefer a
   service-mediated patch/PR publishing step rather than giving the coding process
   a write credential. Restrict outbound access and filesystem scope. Sanitize
   diagnostics before publication, and retain auditable approval/attempt records.
5. Sensitive changes require separate explicit approval **before implementation**:
   workflows/permissions, auth/security, secrets, dependencies/install scripts,
   deployment/signing, data migrations, persistence formats, purchases/billing,
   destructive operations, or changes to game mechanics. Enforce scope outside
   the model; unexpected sensitive diffs stop the attempt. This project's current
   Phase 1 boundary also requires explicit approval before advancing gameplay.
6. Publish a draft feature-branch PR with issue link, diff, checks actually executed,
   unexecuted checks, risks, and rollback. Run ordinary read-only PR CI. Human review
   and any Web/iOS verification are required. **Never merge automatically**;
   the service must have no merge permission or auto-merge path. A new push does
   not grant additional attempts or broaden approved scope.

Missing configuration before enabling: supported Codex execution interface and
account entitlement; explicit external dispatcher/queue and durable attempt store;
GitHub App identity, installation and least-privilege permissions (read issues and
contents for triage; a separate narrowly scoped publisher for branches/PRs);
webhook signature verification and replay protection; secret storage/rotation;
maintainer approval authentication; budgets, sandbox policies, audit retention,
notification destination, and an emergency disable switch. No values are invented
and no placeholder workflow pretends this integration exists.

Rollback: revert this infrastructure PR to remove workflows/templates/tooling.
Disable Actions workflows first if they misbehave. Existing issues/artifacts and
repository settings are not undone by a Git revert; review them manually. There
are no application data migrations or gameplay changes to reverse.
