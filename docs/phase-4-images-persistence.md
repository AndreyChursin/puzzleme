# Phase 4 — Images and persistence

Issue #12. Based on main 007d7cc (including merged Phase 3 PR #11).

## Architecture

`apps/game/components/Session.tsx` owns gallery/import, resume and save lifecycle.
The three original bundled JPEG illustrations cover landscape, portrait and square
images. They have no external license or network dependency. Expo Asset resolves
packaged resources on native and Web. Gallery bytes are also cached locally after
first load so a newly mounted board need not refetch them while offline.

Expo ImagePicker selects images locally; ImageManipulator decodes/re-encodes pixels
before deciding resize dimensions. Platform decoders apply EXIF orientation; the
app does not rotate those pixels twice. Output is JPEG, maximum dimension 1600,
without upscaling or cropping. Metadata-only input dimensions are validated first
(up to 100 megapixels); corrupt, unsupported and processing/cache failures leave
the current game in place. JPEG/PNG/WebP and platform-supported HEIC/HEIF are
accepted. No image or game data is uploaded. Decode/normalization stays in the app;
pure normalization sizing and preset selection are in game-core.

`imagePuzzle` chooses factor pairs for 12/24/48/96/150 nearest the source aspect
ratio and assigns rectangular piece height to preserve the exact board ratio.
The version-1 shared boundaries are still generated once and traversed oppositely.
Existing square-piece callers retain their geometry/seed sequence. Snapping,
assembled state, hit testing and drawing now use solved rectangular height.
Skia decodes one image per board. Each translated piece clips that shared image
with its existing cubic path; no per-piece full-resolution image copies.

## Save format and durability

The current schema is version 2, algorithm 1. It stores the immutable definition's
complete reproducible descriptor (rows, columns, piece dimensions, seed), image
key/dimensions, placement/group/order state, elapsed seconds, difficulty setting
and lifetime completion count. Geometry is regenerated to restore canonical shared
edge identity rather than deserializing duplicated edge objects. Version-1
records of this descriptor schema migrate with default settings/statistics; the
old Phase 1 interface itself never wrote saves. Unknown schema/algorithm versions
are rejected without overwriting the original data.

Decode validates finite dimensions/coordinates, image/grid compatibility, piece
IDs/count/order, allowed status, group connectivity and correct solved offsets,
completion, timer and statistics. Transient selection is cleared and playing
saves resume paused. The Resume button continues; Restart resets the same image,
seed and difficulty. A missing/evicted image or invalid metadata offers gallery
recovery. Existing data remains until a newly selected game is saved.

`game-storage/platform.web.ts` uses IndexedDB transactions; metadata and image
records have separate keys. Images are bounded data URLs (12 MB encoded-file
limit before conversion); metadata is capped at 2 MB. IndexedDB write/quota errors
show an explicit unsaved warning. The previous committed metadata is retained.
`platform.ts` uses Expo FileSystem document-directory images and temporary-file
metadata replacement with a previous-generation backup. Interrupted replacement
can read that backup when the primary is absent. Unit tests mock this filesystem;
actual native filesystem durability is unverified.

Saves debounce 500 ms after changes and also flush on AppState background,
visibility-hidden, pagehide and unmount. Writes serialize through one queue.
Browser termination/OS process kill can interrupt async work; a final sub-500 ms
change is not guaranteed durable. Assets are cached before a new photo is saved;
failed imports cannot replace a valid save. Old/orphaned image records are retained
(no automatic garbage collection yet), so repeated imports can consume quota.
Private browsing, blocked storage, site-data clearing and browser eviction cannot
be prevented. This is one-current-game resume, not the Phase 5 My Puzzles UI.

## Validation and manual checks

Linux Node 24.22.1/pnpm 11.25.0: frozen-lockfile installation, strict TypeScript,
zero-warning ESLint, pnpm check (73 tests), 13 automation/dependency tests,
Expo SDK dependency compatibility, production Web export and dependency audit
(no known vulnerabilities) passed. Versions come from Expo 58's bundled native
module table; existing glob/minimatch security overrides remain intact.

Serve `apps/game/dist` with `python -m http.server 8080 --directory apps/game/dist`.
Run `python scripts/phase4-browser.py` (Python Playwright + Pillow + system Chromium).
It joins image-textured neighbors and reloads exact group positions, rejects a
corrupt JPEG, imports an EXIF-rotated JPEG through the real file chooser, checks
upright 80×120 output, closes/reopens a persistent browser profile, verifies cached
imported pixels and placements, exercises all five presets, simulates image eviction
and gallery recovery, checks cached-gallery rendering with network offline and
simulates quota failure with previous metadata retained. Screenshot output:
`artifacts/phase4.png` (ignored local evidence). Inspect textures/contours for gaps.
Initial browser runs exposed Web's missing Image.resolveAssetSource and a lack of
cross-mount offline image bytes; both were fixed using Expo Asset and local caching.

Manual Web: select all three galleries, import an oversized landscape/square/
portrait image, check proportional pieces and all difficulties. Drag and join
several groups, wait for Saved locally, close/reopen, Resume, then finish and
confirm elapsed time/statistics persist. Restart must keep the chosen image.
Try corrupt files, disabled IndexedDB, quota exhaustion and deleted asset records.
Inspect Network: user pixels must never leave the browser.

Manual iOS (not executed): rebuild the EAS development client for the new native
modules/config plugin, install on a registered physical iPhone, connect Metro.
Pick upright/rotated/mirrored HEIC/JPEG photos, compare orientation/crop, import
large photos, cancel the picker and reject unsupported content. Join groups,
background, force-close/relaunch after save, verify exact progress/image/timer,
Resume and Restart. Repeat with airplane mode and bundled images. Review permission
copy and native memory behavior. Test iPhone Safari separately, especially IndexedDB
private mode, eviction and page termination.

## Remaining limits

No physical iOS build/device, Safari, native orientation matrix, memory benchmark
or crash-durability test executed. Large raw-photo decode can still exhaust memory
before resizing on constrained devices. JPEG normalization discards alpha/metadata.
The Phase 3 JS-thread large-board performance limitation remains; no FPS claim.
Timer still uses foreground second ticks and may undercount background scheduling.
Cold Web startup offline is not implemented: there is no service worker/PWA cache
for app JS/CanvasKit. Verified offline image use is inside an already loaded app;
full offline restart remains Phase 6. No Phase 5 screens/navigation were added.
