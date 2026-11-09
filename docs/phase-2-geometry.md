# Phase 2: deterministic puzzle geometry

`@puzzleme/game-core` exports `generatePuzzle({ rows, columns, pieceSize, seed })`
and `traverseEdge(pieceEdge)`. It has no UI or platform dependencies.

```ts
import { generatePuzzle, traverseEdge } from '@puzzleme/game-core';
const puzzle = generatePuzzle({ rows: 3, columns: 4, pieceSize: 100, seed: 42 });
const commands = puzzle.pieces[0]!.edges.flatMap(traverseEdge);
// Move to commands[0].start, then emit each cubic's two controls and endpoint.
```

Coordinates use a top-left origin and downward y axis. Pieces are row-major with
stable `piece:row:column` IDs. Their edges are top/right/bottom/left, traversed
clockwise. Canonical horizontal edges run left to right; vertical edges run top
to bottom. Neighbors reference the exact same frozen edge object and traverse it
in opposite directions. `traverseEdge` reverses segment order and swaps handles.
Exterior boundaries are straight cubic segments; interior boundaries have four
cubics forming a neck and rounded tab. Tab depth is 16–22% of piece size and its
center is 46–54% along the boundary. Cubic control points stay inside the local
edge strip so tabs do not reach unrelated boundaries.

Version 1 generates horizontal edges row-major, then vertical edges row-major.
Each interior edge consumes three unsigned 32-bit LCG draws (multiplier 1664525,
increment 1013904223): depth, polarity, center. Flat edges consume no draws.
The seed must be an unsigned 32-bit integer, including zero. Dimensions use
`createGrid` validation, generation is capped at 10,000 pieces, and piece size
must be finite in [1, 1,000,000]. These limits bound allocation and numerical
scale; they are not performance guarantees. All returned objects are frozen.
Changing the sequence or geometry requires a new algorithm version before saved
games rely on it. Persistence is not implemented in this phase.

## Neighbors, validation and mutable state

`getNeighbors(puzzle, piece)` returns top/right/bottom/left IDs, with null at the
exterior. `validatePuzzle(puzzle)` reports count, ID/position, continuity, finite
coordinates, exterior flatness, complementary neighbor and sampled contour
intersection errors. This diagnostic is intended for generated definitions and
tests, not arbitrary untrusted JSON. `sampleContour` defaults to 24 samples per
cubic; its crossing test detects nonadjacent polyline intersections, including
touching and collinear segments. This is a numerical regression diagnostic, not
an exact algebraic cubic-intersection solver. Tests cover 64 seeds plus extreme
seed and boundary-grid cases and assert clockwise winding and bounded area.
Validation is intentionally opt-in: all-pairs segment checks are unsuitable for
per-frame use or automatic validation of a 10,000-piece board.

`createAssembledState(puzzle)` creates independent mutable positions/selection
records. It never writes into or embeds state in the frozen definition. Positions
are piece origins in puzzle space. The static preview uses definitions directly;
no interaction or state persistence is implemented.

## Shared Skia preview

The shared renderer creates 12 closed Skia paths from `traverseEdge` using
`Skia.PathBuilder`, with a 3×4 grid at seed 42 and size 100. Paths are memoized and
scaled to available width. Web waits for locally served CanvasKit; native uses
the same renderer and core geometry. Per-piece colors make the complementary
contours visible. Both sides stroke their common boundary with identical geometry.
No image clipping, gestures, panning, snapping or Phase 3 work is included.

## Verification

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:automation`,
`pnpm check:dependencies`, and `pnpm export:web`.

Browser: serve the production build with
`python -m http.server 8080 --directory apps/game/dist`, then open
http://localhost:8080 in Chrome. Confirm 12 colored pieces in three rows and four
columns, a flat rectangular exterior and fitted tab/socket seams with no gaps.
Toggle the details button twice and confirm the seed-42 description. Resize to a
phone viewport and reload. Check the console for errors and Network for local
CanvasKit WASM success. Repeat in Safari; no CDN is required.

Physical iPhone: follow README EAS setup on a Mac, install the development build,
run `pnpm ios` and connect the app to Metro. Confirm the same 3×4 seed-42 contours
and colors as Web, with no clipping or seams separating. Toggle details by touch,
rotate portrait/landscape, and background/resume. Inspect native/Metro logs for
errors. Also serve the Web export from the Mac's reachable LAN address and
repeat in iPhone Safari. Device checks verify native Skia/Hermes compatibility;
Chromium phone viewport checks do not establish it.

## Executed validation (2026-11-09)

Linux, Node 24.22.1, pnpm 11.25.0: frozen-lockfile installation, typecheck,
zero-warning lint, all 42 Vitest tests, all 8 automation tests, and production
Web export passed. Headless system Chromium passed at 1440×1000 and 390×844:
preview canvas attached, details toggled, local WASM returned 200, and zero
page/request errors. Desktop screenshot visually inspected for the assembled
12-piece contours. No iOS build, physical iPhone, Safari or benchmark executed.

The workspace uses writable cache overrides:
`XDG_DATA_HOME=/tmp/puzzleme-data XDG_CACHE_HOME=/tmp/puzzleme-cache`, with pnpm
`--store-dir /tmp/puzzleme-store`; Expo export additionally uses
`npm_config_store_dir=/tmp/puzzleme-store EXPO_NO_TELEMETRY=1`.

Known limits: contour diagnostics sample curves rather than prove all possible
cubic intersections. Large-grid performance, native rendering parity, image
clipping and interaction remain unverified or outside this phase. Algorithm
versioning must be respected before any saved-state format relies on the seed.

## Rebase validation — 2026-11-09

Rebased PR #7 onto main `638a333` after the dependency-remediation and specification
merges. No code conflicts occurred. Preserved patched glob/minimatch overrides,
lockfile and new dependency regression tests. Updated ROADMAP to distinguish this
PR's implemented subset from remaining full-spec Phase 2 requirements; the original
PROJECT_SPEC is unchanged.

Executed after rebase (Linux, Node 24.22.1, pnpm 11.25.0): frozen-lockfile install,
typecheck, zero-warning lint, 42 unit tests, 13 automation/dependency regression
tests, Expo dependency compatibility and production Web export all passed.
`pnpm audit --audit-level moderate` passed with no known vulnerabilities.
Chromium production-build smoke checks at 1440×1000 and 390×844 passed canvas load
and details toggle with zero page errors. No iOS/device/Safari tests executed.
