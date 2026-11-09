# PuzzleMe

Cross-platform offline jigsaw project. **Phase 1 only:** pnpm monorepo, strict TypeScript, Expo Router, shared Skia smoke scene, and a small tested game-core foundation. No gameplay or persistence is implemented yet.

## Run

Use Node **22.13+** (supported Expo range: Node 22.13+, 24.3+, 26+, or newer; prefer Node 24 LTS) and pnpm **11.25.0**. On macOS 13.7.8, use a compatible Node distribution; no local Xcode build is required.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install
pnpm dev
```

Open the URL printed by Expo (normally http://localhost:8081). The home page must display a mountain landscape drawn by Skia. The details button toggles the workspace foundation summary. CanvasKit WASM is copied locally during install/export; the renderer does not use a CDN.

```sh
pnpm check          # strict typecheck + Vitest
pnpm export:web     # apps/game/dist static output
pnpm --filter @puzzleme/game exec expo install --check
```

Serve `apps/game/dist` with a static HTTP server; configure SPA fallback for future routes. Do not open the exported HTML with file://.

## Architecture

| Package | Responsibility |
| --- | --- |
| `apps/game` | Expo Router, platform entry points, application orchestration |
| `packages/game-core` | Pure immutable puzzle-space data and game rules; no React/native imports |
| `packages/game-renderer` | Shared Skia scene; later geometry clipping and camera transforms |
| `packages/game-storage` | Adapter contract and save version; later native/web implementations |
| `packages/ui` | Shared theme tokens; later controls and screens |
| `packages/config` | Strict shared TypeScript settings |

Workspace packages expose TypeScript source directly to Metro. Expo's monorepo support handles workspace resolution. Native and web entry points share the renderer; web defers loading it until CanvasKit initializes. Hoisted installation is used for predictable native module resolution. Generated WASM is excluded from Git and reconstructed from the locked dependency.

## Compatibility decisions

Selected from npm stable metadata and **Expo 58.0.23 `bundledNativeModules.json`** on 2026-11-09:

- Expo 58.0.23; Router ~58.0.30
- React / React DOM 19.3.0; React Native 0.88.1; React Native Web ~0.21.4
- Skia 2.14.0 (Expo recommended); peers React >=19, RN >=0.78
- Reanimated 4.7.1, Worklets 0.13.0, Gesture Handler ~3.3.0 (Expo recommended)

`pnpm-lock.yaml` fixes the actual dependency graph. Use `expo install` when adding native dependencies. Zustand, ImagePicker, ImageManipulator and storage adapters will be added in their implementation phases rather than installing unused modules now.

## iOS / EAS

Xcode 15.2 is not a local build target for this modern SDK. Use EAS cloud builders with the SDK-supported Xcode image; run Metro on the Mac and install the resulting build on a registered physical device.

The SDK-matched `expo-dev-client` is included. Before the first build, sign into Expo, then run from `apps/game`:

```sh
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest build --platform ios --profile development
# Install the development build, then from the repository root:
pnpm ios
```

`eas.json` also defines `preview` (internal distribution) and `production` (store distribution). Before submission, choose an owned bundle identifier, configure Apple signing / App Store Connect and EAS project credentials, provide icons, splash art, privacy disclosures and release metadata. `eas submit --platform ios --profile production` is a later release step. No cloud builds or submissions have been run; iOS compatibility and physical-device gestures remain unverified.

## Scope and next phase

The Skia scene is a rendering smoke test, not generated puzzle geometry. Phase 2 will add deterministic topology, shared complementary cubic edges and geometry tests. Gameplay, importing photos, platform persistence, PWA/service-worker offline caching, statistics, production artwork and performance profiling are future phases. The current web shell is **not installable/offline-ready**. No 60 fps claim is made.

Do not advance beyond Phase 1 until approved.

## Continuous development

See [continuous development](docs/continuous-development.md) for CI, daily health checks,
branch protection recommendations, verification instructions, and the disabled future
Codex automation architecture. PRs require human review and are never auto-merged.
