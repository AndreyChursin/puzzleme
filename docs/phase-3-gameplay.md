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
