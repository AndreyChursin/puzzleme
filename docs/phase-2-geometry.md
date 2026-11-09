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

## Verification

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:automation`,
`pnpm check:dependencies`, and `pnpm export:web`. Unit tests verify repeatability,
a fixed seed fixture, scaling, closure, shared reversed handles, immutability,
invalid inputs and single-row/column/single-piece grids.

Browser regression: serve `apps/game/dist` with `python -m http.server 8080
--directory apps/game/dist`, open http://localhost:8080 in desktop Chrome and
mobile Safari, and confirm the mountain Skia scene renders. Toggle the details
button twice; check the browser console and Network panel for errors and confirm
local CanvasKit loads. Reload at mobile viewport sizes. Generated pieces are a
core API only and are not displayed by this smoke scene yet.

Physical iPhone: follow the README EAS development-build setup, install the build,
run `pnpm ios` on the Mac, connect to Metro, and open the app. Confirm Skia draws
the mountain scene, details toggle responds to touch, and portrait/landscape
rotation and background/foreground resume do not crash. Repeat the static Web
check in Safari. Native builds and physical-device checks require human testing;
JavaScript unit tests do not establish Hermes or iPhone rendering compatibility.

No piece renderer, dragging, snapping, or persistence is added. Visual tab quality,
Hermes parity and large-grid performance still require later integration testing.

## Executed validation (2026-11-09)

Linux, Node 24.22.1, pnpm 11.25.0: frozen-lockfile installation, typecheck,
zero-warning lint, all 30 Vitest tests, all 8 automation tests, Expo dependency
compatibility and production Web export passed. Headless system Chromium passed
at 1440×1000 and 390×844: canvas attached, details toggled open/closed, zero page
errors. This confirms the existing shell loads, not visual puzzle rendering.
No iOS build, physical iPhone, Safari, Hermes or performance test was executed.

This managed workspace requires writable caches: installation used
`XDG_DATA_HOME=/tmp/puzzleme-data XDG_CACHE_HOME=/tmp/puzzleme-cache` and
`--store-dir /tmp/puzzleme-store`. Expo commands additionally used
`npm_config_store_dir=/tmp/puzzleme-store EXPO_NO_TELEMETRY=1`; the dependency
check used `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/puzzleme-expo`. Initial default-cache
attempts failed because `/home/agent` was unwritable; the redirected runs passed.
The initial fixed-seed test failed due to an incorrectly transcribed expected
coordinate; correcting the fixture made the complete 30-test suite pass.
