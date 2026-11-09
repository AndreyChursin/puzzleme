# PuzzleMe implementation roadmap

## Source and status rules

[PROJECT_SPEC.md](PROJECT_SPEC.md) preserves the complete original requirements,
including all seven phases and the original Phase 1 approval boundary. This roadmap
organizes that scope into reviewable acceptance criteria; it does not authorize new
feature work. Read it alongside [AGENTS.md](../AGENTS.md) and [README](../README.md).

Baseline inspected: `origin/main` at `3c79709` on 2026-11-09. Phase 1 was introduced
in [PR #1](https://github.com/AndreyChursin/puzzleme/pull/1), including the subsequent
fix to Expo's supported `--host lan` development option. Continuous validation was
added in [PR #4](https://github.com/AndreyChursin/puzzleme/pull/4). CI infrastructure
is supporting work, not completion of gameplay or release phases.

“Completed (verified)” applies only to the named work with recorded evidence.
“Pending” includes missing implementation and required checks not yet executed.
Historical validation records are dated evidence, not a claim that every platform
or every future commit has been validated. Add evidence and update this document
as work lands; never infer later-phase completion from package names or a mock UI.

## Current progress

| Phase | Current status |
| --- | --- |
| 1 — Project foundation | Completed for the verified foundation scope listed below; iOS/device validation remains pending |
| 2 — Puzzle geometry | Partially implemented in PR #7: seeded explicit grid, shared contours, validation and static color preview; full phase criteria remain pending |
| 3 — Interactive gameplay | Implemented initial playable board in Issue #10; native/touch and rendering performance verification pending |
| 4 — Images and persistence | Not implemented; only persistence interface/version scaffolding exists |
| 5 — Product interface | Not implemented; foundation landing screen is not the required product screen set |
| 6 — Cross-platform validation | Pending; limited Phase 1 Chromium smoke checks do not satisfy this phase |
| 7 — Release preparation | Not implemented; EAS profiles alone do not establish release/TestFlight readiness |

## Phase 1 — Project foundation

Acceptance criteria and verified progress:

- [x] pnpm workspace with `apps/game` and `game-core`, `game-renderer`, `game-storage`,
  `ui`, `config` packages. Source: [workspace](../pnpm-workspace.yaml),
  [application manifest](../apps/game/package.json), and package manifests.
- [x] Minimal Expo/React Native Web app with Expo Router and strict shared TypeScript.
  Source: [layout](../apps/game/app/_layout.tsx),
  [TypeScript configuration](../packages/config/tsconfig.base.json).
- [x] Validate selected Expo/Skia dependency compatibility. Recorded versions and
  `expo install --check` results: [Phase 1 validation](phase-1-validation.md).
- [x] Shared Skia scene displayed in a browser; local CanvasKit bootstrap, desktop
  and mobile Chromium smoke checks, and project-details interaction verified.
  Source: [renderer](../packages/game-renderer/src/TestScene.tsx),
  [web bootstrap](../apps/game/components/Scene.web.tsx); evidence in Phase 1 validation.
  This is hand-authored test art, not generated puzzle geometry.
- [x] Minimal pure game-core and Vitest coverage: immutable rectangular grid,
  invalid dimensions and unsafe counts. [Tests](../packages/game-core/src/index.test.ts)
  and Phase 1 validation record eight passing tests.
- [x] Typecheck, production web export, startup documentation and architecture decisions.
  See [README](../README.md) and the validation record. The corrected `pnpm dev`
  command subsequently reached Metro and returned HTTP 200 in the project conversation.
- [x] EAS development/preview/production profiles configured in
  [eas.json](../apps/game/eas.json); this is configuration, not an executed iOS build.

Pending checks/limits (do not include these in the completion claim): iOS/EAS build,
physical-device rendering/gesture validation, performance profiling, real gameplay,
photo imports, persistence adapters and PWA/offline restart. Zustand, ImagePicker and
ImageManipulator remain requirements for later implementation, not installed features.

Supporting infrastructure has separate evidence in
[automation validation](automation-validation.md) and operational instructions in
[continuous development](continuous-development.md). Its recorded moderate dependency
advisories and unverified hosted health reporting remain follow-up items; do not
silently treat the audit or hosted runtime checks as passed.

## Phase 2 — Puzzle geometry

Status: **partially implemented in [PR #7](https://github.com/AndreyChursin/puzzleme/pull/7)**
(on top of main `638a333`). The PR implements seeded explicit rows/columns,
immutable shared Bézier edges, flat boundaries, neighbor lookup, separate mutable
state records and a static assembled color preview using the same Skia paths on
Web/iOS. Sources: [generator](../packages/game-core/src/puzzle.ts),
[validation](../packages/game-core/src/validation.ts),
[state](../packages/game-core/src/state.ts),
[preview](../packages/game-renderer/src/TestScene.tsx).

This is not full Phase 2 completion under the recovered specification. Pending:
image-dimension/difficulty-based grid selection for all five presets, rectangular
piece sizing to preserve arbitrary image aspect ratios, explicit solved-position/
neighbor/render metadata in definitions, group IDs in mutable state, textured
shared-image clipping, and physical iOS parity checks. The current intersection
diagnostic samples curves rather than providing an exact cubic-intersection proof.
These requirements are preserved below; the rebase does not implement new scope.

Acceptance criteria:

- Generate deterministic immutable puzzle definitions from a seed, image dimensions
  and difficulty, preserving rectangular/portrait/landscape aspect ratios. Select
  rows/columns for 12, 24, 48, 96 and 150 pieces without assuming square grids.
- Store stable piece IDs, row/column, solved positions, neighbor IDs, shared edge
  definitions and rendering metadata separately from mutable positions/group IDs.
- Define each internal boundary once, with opposite orientation on its neighbor;
  flat outer edges and complementary tab/blank cubic Bézier contours. Prevent invalid
  and self-intersecting contours; leave room for future rotation without enabling it.
- Render a static assembled textured puzzle using shared image resources and
  piece-specific clipping, without moving game rules into the renderer.
- Execute tests for reproducibility, complementary boundaries, contour validity and
  neighbor relationships, including rectangular grids and all difficulty presets.

Evidence required for completion: generator/geometry implementation, executed test
results and browser inspection of the assembled puzzle. Partial implementation
and prior executed checks are recorded in [Phase 2 evidence](phase-2-geometry.md).
The rebase onto main preserves the dependency-remediation overrides and tests;
see that evidence for checks rerun on the combined tree. Full phase completion
remains pending until all criteria above are implemented and verified.

## Phase 3 — Interactive gameplay

Status: initial shared playable board implemented; see [Phase 3 evidence](phase-3-gameplay.md). Physical iOS/touch and rendering-performance checks remain pending.

Acceptance criteria:

- Shuffle and drag pieces with touch/mouse input; raise selection, update continuously
  and commit final positions on release. Move entire connected groups together.
- Snap only solved neighbors in different groups within configurable puzzle-space
  tolerance. Merge groups while preserving relative positions; prevent duplicate
  connections and support group-to-group connections. No pixel collision matching.
- Detect victory only for one correctly assembled group; trigger victory animation
  and expose the result for saving. Pieces initially do not rotate.
- Implement independent puzzle/viewport transforms, pan, zoom, fit and reset; handle
  conflicts between board pan, piece drag and zoom on touchscreens, trackpads and mouse.
- Avoid React rerenders and full-board calculations per pointer move; use Skia and
  animation-thread transformations where appropriate.
- Execute unit tests for tolerance, merging, positioning and win detection; integration
  tests for creation, movement, connecting pieces and completing a puzzle. Manually
  validate Web/iOS gestures. Record 12/48/150-piece profiling rather than claiming 60 fps.

Evidence required: engine/gesture implementation, tests, device/browser observations
and profiling records. None currently recorded.

## Phase 4 — Images and persistence

Status: **not implemented**. [Storage contract](../packages/game-storage/src/index.ts)
contains only an interface and save-format version, without an adapter or saved games.

Acceptance criteria:

- Bundle an offline image gallery and import device photos locally using ImagePicker
  and ImageManipulator. Normalize images, correct EXIF orientation, preserve aspect
  ratio, downscale large assets and handle invalid images/memory errors gracefully.
- Cache images separately from serialized state; share image resources across pieces.
  Imported images must survive application/browser restart, without external uploads.
- Implement platform-appropriate local storage and versioned formats/migrations for
  definition, image reference, seed, piece positions, groups, timer, completion,
  settings and statistics. Add debounced and lifecycle-aware saves and restore flow.
- Account for web local-image compatibility, quota failures, data eviction and storage
  persistence behavior. Document limitations and recovery behavior.
- Execute serialization/restoration/invalid-state tests and integration tests restoring
  saved progress and image assets across restart on supported platforms.

Evidence required: adapters, image pipeline, migration/error handling and executed
restart/restore tests. None currently recorded.

## Phase 5 — Product interface

Status: **not implemented**. The current foundation screen is not the full home flow.

Acceptance criteria:

- Home: New Puzzle, Continue, My Puzzles, Statistics, Settings.
- Image selection: bundled gallery, local photo selection and image preview.
- Difficulty: Beginner 12, Easy 24, Medium 48, Hard 96, Expert 150; show counts and Start.
- Gameplay: board, elapsed timer, progress, pause, preview image, zoom and reset view.
- Victory: completed image, completion time, difficulty, play again and return home.
- Settings: sound, supported haptics, theme and reset local data; persist settings and
  statistics through the Phase 4 storage boundary.
- Build shared reusable controls, dialogs and overlays; verify navigation and complete
  new/continue/complete/replay flows on responsive Web and iOS.

Evidence required: working screens/flows with executed integration and manual checks.
None currently recorded.

## Phase 6 — Cross-platform validation

Status: **pending**. Phase 1's limited Chromium smoke check does not complete this phase.

Acceptance criteria:

- Validate the complete gameplay feature set in desktop/mobile browsers and on a
  physical iOS device using an EAS cloud development build; fix platform-specific bugs.
- Support the developer workflow on macOS 13.7.8 with Xcode 15.2 without requiring
  local iOS compilation; use compatible EAS cloud builders where necessary.
- Test native offline behavior and imported/bundled asset availability after restart.
  Implement web PWA installation where practical, cache app/bundled assets and verify
  offline restart after successful initial load/cache installation. Document browser
  compatibility, eviction and quota limitations.
- Profile 12, 48 and 150 pieces with device/browser, build, timings and interaction
  traces. Target approximately 60 fps; report measured results and remaining limits.
- Run the complete unit/integration suite and manually test rendering and gestures
  across mouse, touch and trackpad input. Record failures as well as passes.

Evidence required: cloud-build/device records, browser matrix, offline restart tests,
profiling and defect resolutions. None currently recorded for full gameplay.

## Phase 7 — Release preparation

Status: **not implemented**. EAS configuration is not release approval or a signed build.

Acceptance criteria:

- Provide production app icons, splash screen, privacy disclosures and release docs.
- Produce/validate production web export and document hosting/PWA behavior.
- Configure iOS development, preview and production signing/account metadata, produce
  a TestFlight build and record installation/testing results and remaining release risks.
- Prepare App Store/TestFlight distribution with the required Expo/Apple account setup;
  no local iOS build requirement and no invented credentials or readiness claims.
- Review all product requirements, test evidence, known limitations and release checklist
  before distribution. Publication/submission requires authorization for that action;
  never merge PRs automatically.

Evidence required: release artifacts, signed build/TestFlight evidence, asset/privacy
review and release validation. None currently recorded.

## Next authorized step and recovery completeness

This documentation task adds no gameplay. The original instruction stopped after
Phase 1; Phase 2 is the next implementation phase only when explicitly authorized.

All original specification sections (role plus sections 1–18) were recovered verbatim
from the uploaded `Вставленный текст.txt`. No original requirements are known to be
missing. The later Expo-host correction is reflected in the existing implementation;
continuous-development requirements and evidence remain in their existing documents.
No physical-device, offline, performance or release results can be recovered because
none were recorded as executed in the original implementation conversation.

## Documentation handoff validation — 2026-11-09

On Linux with Node 24.22.1 and pnpm 11.25.0, executed successfully for this handoff:

- `pnpm install --frozen-lockfile` (including the local CanvasKit copy hook).
- `pnpm check`: strict TypeScript and eight game-core tests.
- `pnpm lint` and `pnpm test:automation` (eight automation tests).
- Exact comparison of PROJECT_SPEC content against the original upload, confirming
  all 18 numbered sections; relative Markdown link checks; `git diff --check`.
- Diff scope check: only `AGENTS.md`, `docs/PROJECT_SPEC.md` and `docs/ROADMAP.md`
  added relative to the baseline; existing implementation/configuration unchanged.

No new browser, export, iOS, offline, performance or release checks were run for
this documentation-only task. Historical results above retain their original scope.
