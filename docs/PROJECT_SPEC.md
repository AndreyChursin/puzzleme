<!-- Source: original PuzzleMe specification uploaded in the project conversation. -->
<!-- The complete original text follows verbatim. Status belongs in ROADMAP.md. -->

# PuzzleMe — Cross-Platform Jigsaw Puzzle Game

## Role

You are a Senior TypeScript Software Architect and Cross-Platform Game Developer specializing in React Native, Expo, React Native Skia, and interactive 2D game engines.

Your objective is to design and implement **PuzzleMe**, a high-quality offline jigsaw puzzle game for iOS and Web.

The application must share its game engine, rendering logic, and most UI components across both platforms.

Work incrementally. Prioritize maintainability, deterministic game logic, reliable persistence, and performance.

## 1. Target Platforms

- iOS: native application distributed through TestFlight and the App Store.
- Web: responsive application for desktop and mobile browsers.

Both platforms must support the same gameplay features.

The application must work offline after installation or after the web application has been cached for offline use.

No backend, authentication, cloud synchronization, or online multiplayer is required.

## 2. Technology Stack

Use:

- pnpm workspaces
- TypeScript (strict mode)
- Expo and React Native
- React Native Web
- Expo Router
- React Native Skia
- React Native Gesture Handler
- React Native Reanimated
- Zustand
- Expo ImagePicker
- Expo ImageManipulator
- Vitest

Use platform-appropriate local persistence.

Use compatible stable versions of all dependencies.

Validate the selected Expo SDK and Skia versions before implementation.

## 3. Monorepo Structure

```text
puzzleme/
├── apps/
│   └── game/
├── packages/
│   ├── game-core/
│   ├── game-renderer/
│   ├── game-storage/
│   ├── ui/
│   └── config/
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### Architectural responsibilities

**game-core**
- Puzzle topology
- Piece geometry generation
- Deterministic puzzle generation
- Piece adjacency
- Piece positioning
- Piece group management
- Snapping and merging
- Win detection
- Game state serialization

**game-renderer**
- Skia rendering
- Piece clipping
- Image textures
- Shadows and selection states
- Rendering optimization
- Coordinate transformations

**game-storage**
- Local game state persistence
- Local image asset management
- Saved puzzle metadata
- Storage versioning and migration

**ui**
- Reusable screens and controls
- Theme tokens
- Dialogs and overlays

**apps/game**
- Expo application
- Navigation
- Platform-specific integrations
- Gameplay orchestration

## 4. Core Game Concept

PuzzleMe is a classic jigsaw puzzle game.

Players reconstruct an image by dragging and connecting irregularly shaped interlocking pieces.

Supported image sources:

1. Bundled images provided with the application.
2. Images selected from the user's device.

All puzzle generation and image processing must happen locally.

No images or gameplay information may be uploaded to external services.

## 5. Puzzle Generation Engine

Implement a deterministic puzzle generator.

### Requirements

- Support rectangular source images.
- Generate rows and columns based on the selected difficulty.
- Preserve the image aspect ratio.
- Generate interlocking piece boundaries.
- Support flat outer edges.
- Ensure adjacent pieces have exactly complementary boundaries.
- Generate reproducible geometry using a random seed.
- Prevent invalid or self-intersecting piece contours.

### Piece geometry

Each piece consists of four edges:

- Top
- Right
- Bottom
- Left

Each edge can be:

- Flat
- Tab
- Blank

Adjacent pieces must share a single boundary definition with opposite orientation.

Represent contours using cubic Bézier curves.

Do not generate adjacent edges independently.

### Piece data

Each piece must include:

- Unique ID
- Grid row and column
- Original solved position
- Current position
- Neighbor IDs
- Edge geometry
- Group ID
- Rendering metadata

Separate immutable puzzle definitions from mutable game state.

## 6. Image Processing

Support:

- Bundled images
- User-selected photographs
- Landscape and portrait images
- Image normalization
- EXIF orientation correction
- Aspect ratio preservation
- Downscaling large images
- Local image caching

Do not duplicate full-resolution image data for every piece.

Prefer shared image resources and piece-specific clipping paths.

Handle invalid images and memory limitations gracefully.

On Web, verify browser compatibility for local image loading and offline persistence.

## 7. Game Mechanics

### Dragging

Players can drag individual pieces freely around the board.

Requirements:

- Smooth movement
- Correct touch and mouse handling
- Selected piece appears above other pieces
- Piece position updates during dragging
- Final position is committed to game state on release

### Snapping

Pieces snap together when:

1. They are valid neighbors in the solved puzzle.
2. Their relative positions are within a configurable tolerance.
3. They are not already part of the same group.

Use puzzle-space coordinates, not screen-space coordinates.

Do not use image comparison or pixel collision detection to determine valid connections.

### Grouping

When two pieces connect:

- Merge their groups.
- Preserve their correct relative positions.
- Move the entire group together.
- Allow groups to connect to other groups.
- Prevent duplicate connections.

### Completion

The puzzle is completed when all pieces belong to one correctly assembled group.

Trigger a victory animation and save the result.

## 8. Board and Camera

Implement a virtual puzzle workspace supporting:

- Pan
- Zoom
- Dragging pieces
- Moving connected groups
- Resetting camera position
- Fitting the puzzle into the viewport

Keep puzzle coordinates independent from viewport coordinates.

Implement explicit gesture conflict handling between dragging pieces and panning the board.

Ensure consistent behavior across touchscreens, trackpads, and mouse input.

## 9. Difficulty Levels

Initial presets:

| Difficulty | Pieces |
|---|---:|
| Beginner | 12 |
| Easy | 24 |
| Medium | 48 |
| Hard | 96 |
| Expert | 150 |

Choose appropriate rows and columns based on image aspect ratio.

Do not assume that the piece count must form a square grid.

Initially, pieces must not rotate.

Design the game engine so rotation can be introduced later.

## 10. Application Screens

Implement:

### Home
- New Puzzle
- Continue
- My Puzzles
- Statistics
- Settings

### Image Selection
- Bundled image gallery
- Select photo from device
- Image preview

### Difficulty Selection
- Difficulty presets
- Piece count
- Start button

### Gameplay
- Puzzle board
- Timer
- Progress
- Pause
- Preview image
- Zoom controls
- Reset view

### Victory
- Completed image
- Completion time
- Difficulty
- Play again
- Return home

### Settings
- Sound
- Haptic feedback where supported
- Theme
- Reset local data

## 11. Persistence

Persist locally:

- Puzzle definition
- Image reference
- Puzzle seed
- Piece positions
- Group memberships
- Elapsed time
- Completion state
- Settings
- Statistics

Use debounced and lifecycle-aware saving.

Persist image assets separately from serialized game state.

Ensure imported user images remain available after restarting the application.

Use appropriate platform-specific storage implementations.

For Web, account for storage quotas and browser data eviction.

Use versioned save formats.

## 12. Offline Support

### iOS

All game functionality must work without network access.

Bundled assets and imported photos must remain accessible offline.

### Web

Implement an installable Progressive Web App (PWA) where practical.

Cache application assets and bundled puzzle images.

Ensure the application can restart offline after a successful initial load and cache installation.

Document browser limitations and storage persistence behavior.

## 13. Performance

Target smooth interaction at approximately 60 frames per second on supported devices.

Avoid unnecessary React rerenders during drag operations.

Prefer Skia and animation-thread transformations for continuous interactions.

Avoid expensive full-board recalculations on every pointer movement.

Test performance with 12, 48, and 150 pieces.

Optimize image memory usage and rendering where necessary.

Do not claim performance targets are achieved without profiling.

## 14. Testing

Implement unit tests for:

- Seeded puzzle generation
- Complementary edges
- Valid piece contours
- Neighbor relationships
- Snapping tolerance
- Group merging
- Group positioning
- Win detection
- Serialization and restoration
- Invalid state handling

Add integration tests for:

- Creating a puzzle
- Moving a piece
- Connecting two pieces
- Restoring saved progress
- Completing a puzzle

Test rendering and gestures manually on iOS and Web.

## 15. Build and Distribution

Configure:

- pnpm workspace scripts
- Expo web development
- Production web export
- Expo Application Services (EAS) build configuration
- iOS development builds
- iOS preview builds
- iOS production builds
- TestFlight readiness

The development workflow must support a developer using macOS 13.7.8 and Xcode 15.2.

Do not require local iOS compilation.

Use EAS cloud builds where necessary.

## 16. Implementation Phases

### Phase 1 — Project Foundation

- Initialize pnpm monorepo
- Create Expo application
- Configure React Native Web
- Configure TypeScript
- Create workspace packages
- Integrate Skia
- Verify a basic Skia scene in Web
- Configure test runner
- Add documentation

### Phase 2 — Puzzle Geometry

- Implement piece topology
- Implement shared edge definitions
- Generate Bézier contours
- Generate deterministic puzzle definitions
- Add geometry tests
- Render a static assembled puzzle

### Phase 3 — Interactive Gameplay

- Shuffle pieces
- Implement dragging
- Implement snapping
- Implement group merging
- Implement camera pan and zoom
- Implement completion detection

### Phase 4 — Images and Persistence

- Bundled image gallery
- Device image picker
- Image normalization
- Local persistence
- Restore unfinished games

### Phase 5 — Product Interface

- Home screen
- Difficulty selection
- Gameplay controls
- Settings
- Victory screen
- Statistics

### Phase 6 — Cross-Platform Validation

- Browser testing
- iOS cloud development build
- Physical device testing
- Performance profiling
- Offline validation
- Fix platform-specific issues

### Phase 7 — Release Preparation

- App icons
- Splash screen
- Privacy disclosures
- TestFlight build
- Production web build
- Release documentation

## 17. Development Rules

- Keep the application runnable after every phase.
- Do not implement all phases at once.
- Do not introduce a backend.
- Do not introduce online dependencies into gameplay.
- Do not duplicate game rules across platforms.
- Do not mix rendering code with puzzle rules.
- Use strict TypeScript.
- Avoid `any`.
- Prefer pure functions in game-core.
- Write tests for critical game mechanics.
- Document architectural decisions.
- Do not claim tests passed unless executed.
- Do not claim iOS compatibility without testing.

## 18. First Task

Start with Phase 1 only.

1. Inspect the current repository.
2. Propose the final package architecture.
3. Verify dependency compatibility.
4. Initialize the workspace.
5. Implement a minimal Expo application.
6. Display a Skia-rendered test scene in the browser.
7. Add a minimal game-core package and unit test.
8. Run available checks.
9. Document local startup instructions.
10. Summarize the implementation and remaining risks.

Stop after Phase 1 and wait for approval before proceeding.
