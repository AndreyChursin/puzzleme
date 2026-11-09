# Issue #2: Expo tooling dependency advisories

Validated from main `3c7970962e4b04c74abe0316e9ff585066f3f5d5` on
2026-11-09 with Linux, Node 24.22.1 and pnpm 11.25.0.

## Reproduction and correction

The original lockfile audit reported two moderate advisories:

- `glob@13.0.7`: GHSA-3g3m-2fjr-6pw4 (reported patched range >=14.0.2).
- `minimatch@10.2.6`: GHSA-g3hv-75wg-m249 (patched range >=11.0.1).

Expo CLI/fingerprint requested glob 13 and minimatch 10; ESLint and TypeScript
ESLint also requested minimatch 10. The stable Expo/tooling versions inspected
still request those majors. The workspace temporarily overrides glob 13 to
14.0.2 and minimatch to 11.0.1, with only their necessary dependency changes in
the lockfile. No advisory is ignored, and application/native versions are unchanged.

The new regression tests exercise minimatch preprocessing with five `**/../a/b/`
segments, optimization level 2 and an expansion budget of four. Before the fix,
it produced 32 pattern alternatives and failed the budget assertion. Afterward,
the assertion passes for Expo fingerprint, ESLint, config-array, TypeScript
ESLint and glob's resolved minimatch instances.

Additional compatibility tests cover cancellation before recursive directory
reads, Expo's promise/stream glob helpers, synchronous iOS project discovery,
dotfiles, directory exclusions and fingerprint ignore negation. The cancellation
test also passed on the original glob version; it is a compatibility guard, not
evidence of reproducing the advisory's traversal behavior in that version.

## Actual results

- Clean `pnpm install --frozen-lockfile`: passed (removed node_modules first).
- `pnpm audit --audit-level=low --json`: passed, zero advisories at every severity.
- `pnpm typecheck` and `pnpm lint`: passed.
- `pnpm test`: 8 tests passed.
- `pnpm test:automation`: 13 tests passed, including 5 new dependency tests.
- `pnpm check:dependencies`: passed, dependencies are up to date.
- `pnpm export:web`: passed, exported to `apps/game/dist`.
- Chromium 156.0.8078.79 at 1440x1000 and 390x844: local CanvasKit returned
  HTTP 200, canvas rendered, details opened/closed, no uncaught page errors.
  Desktop emitted one resource error for the absent favicon (HTTP 404).
- `git diff --check`: passed.

Environment-only workarounds: installation used `--store-dir /tmp/puzzleme-pnpm-store`;
script invocations needing dependency verification used
`pnpm_config_store_dir=/tmp/puzzleme-pnpm-store`. Expo compatibility validation
used `EXPO_NO_CACHE=1` to avoid a home-directory cache write. Initial attempts
without these settings failed with cache-directory ENOENT errors. These settings
are not repository changes or audit suppressions.

## Manual verification and remaining risks

1. With the pinned Node/pnpm versions, run the install, audit, typecheck, lint,
   test, automation, Expo compatibility and export commands above. Expect all to
   exit zero, no audit findings, 8 unit tests and 13 automation tests.
2. Serve `apps/game/dist` over HTTP, e.g. `python3 -m http.server 8765 --directory
   apps/game/dist`, and open http://localhost:8765 in desktop and mobile browsers.
   Confirm the mountain scene, local WASM request, and details toggle. Inspect
   console/network errors; the existing missing favicon is outside this fix.
3. iOS (not executed): follow README's EAS development-client setup with an
   SDK-supported builder, Expo account and Apple signing/registered device.
   Install the client, run `pnpm ios`, and confirm the same scene and toggle.
   Record device, OS, build and results. Mobile Chromium is not native iOS testing.

Both overrides cross major versions. minimatch 11 removes APIs such as AST and
makeRe; inspected consumers use supported matching APIs. The tests and build
cover current usage, not every Expo command or arbitrary user glob pattern.
Remove the overrides after upstream accepts patched majors and repeat validation.
Native builds, signing and device testing remain unverified. Audit is a registry
snapshot, not proof that every dependency is free from vulnerabilities.

Rollback: revert this fix's manifest, workspace configuration, lockfile, tests and
documentation together and reinstall. This restores the original advisories;
there are no application data migrations.
