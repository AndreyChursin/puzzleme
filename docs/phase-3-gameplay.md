# Phase 3 interactive gameplay

Issue #10. Pure game rules live in `game-core/gameplay.ts`; the renderer caches
Skia contour paths and uses exact Skia path containment to select the topmost
piece. Placements and group IDs are independent of frozen definitions. Seeded
shuffle places pieces in shuffled, spaced slots below the solved board.

PanResponder provides shared mouse/touch dragging. Empty-space drag pans, two
fingers zoom, trackpad wheel pans and control-wheel zooms. +/−, Fit and Reset view
are alternatives. Coordinates are transformed into puzzle space before movement.
Cancellation restores the gesture-start state. Release searches only solved
neighbors and translates/merges the entire active group. Completion requires one
group with consistent solved offsets, not proximity. Pause blocks interaction;
restart restores the seed. Timer advances only while playing.

Validation: Linux Node 24.22.1/pnpm 11.25.0. Frozen install, TypeScript, ESLint,
unit tests (repeated, including pnpm check), automation/dependency tests (13),
production Web export and audit passed. `pnpm export` is absent; the repository's
actual command is `pnpm export:web`. No CI configuration or dependencies changed.

Serve export with `python -m http.server 8080 --directory apps/game/dist`.
Run `python scripts/phase3-browser.py`, then `WIDTH=390 python scripts/phase3-browser.py`
with Python Playwright and /usr/bin/chromium installed. The scripts drag all 12
pieces through the production UI, wait for victory and verify restart; screenshots
are written to ignored artifacts/phase3.png. Both viewport runs passed without page
errors. Manually verify group drag, cancellation, pause, pinch, zoom, trackpad and
pan; check correct neighbors snap within 20 puzzle units and others do not.

On iPhone: follow README EAS development-client setup; install on a registered
physical device, connect Metro, drag tabs/holes, join groups and complete a puzzle.
Test two-finger zoom vs dragging, cancellation via app background, rotation,
pause/resume and restart. Compare geometry and mouse/touch behavior with Web.
No native build, device, Safari or true touch/pinch validation executed here.

Performance: paths are created once per mounted board, not per move. The small
core benchmark in gameplay.test.ts times 100 moves plus release for 12/48/150.
These timings are not rendering/gesture frame measurements. JS-thread immutable
updates currently rerender the board per movement; large-board rendering and
animation-thread migration remain profiling/optimization work. No 60 FPS claim.
Timer uses one-second ticks, so background scheduling can reduce elapsed accuracy.
No persistence or image import; preview remains colored geometry. Completion
banner is intentionally simple. Keyboard piece manipulation is not implemented.

## Stabilization review (PR #11)

Fixed the one-finger continuation jump after pinch by rebasing the pointer delta;
rollback now restores the gesture-start camera as well as state. Cancellation
cannot resurrect an active drag after pause/restart. Added regression coverage
for cancellation and joining two already connected multi-piece groups.

Removed repeated `find` lookups from hit testing/rendering/snapping; group counts
are computed in one pass rather than filtering the entire board for every piece.
Memoized piece components retain placement identity for unaffected pieces, and
paths remain cached. Added 12/48/150 board-size controls to reproduce load testing.

Executed: frozen install, TypeScript, ESLint, 52 unit tests, 13 automation tests,
`pnpm check`, production export and audit (no vulnerabilities). Mouse and CDP
emulated-touch production runs both complete all 12 pieces, verify victory lock
and restart with no page errors. `TOUCH=1 WIDTH=390 python scripts/phase3-browser.py`
exercises actual browser touch events rather than only a smaller mouse viewport.
`python scripts/phase3-profile.py` checks a touch-cancel rollback by comparing
canvas screenshots byte-for-byte and exercises 100 moves at each board size.

Headless system Chromium, Linux software rendering, one run (includes automation
transport and event scheduling):

| Pieces | 100 pointer moves wall time | Browser TaskDuration delta |
| --- | ---: | ---: |
| 12 | 5097.2 ms | 4089.3 ms |
| 48 | 5771.4 ms | 4757.6 ms |
| 150 | 13469.2 ms | 12612.0 ms |

These are neither frame rates nor hardware-device measurements. The pronounced
150-piece slowdown remains a performance blocker for claiming responsive large
boards. The PR stays draft: JS-thread board updates and full-scene Skia work need
further profiling/animation-thread investigation. No physical iOS, Safari or
multitouch device validation ran. Pinch-transition code was reviewed/fixed but
multi-finger end-to-end automation remains pending. No Phase 4 work was added.
