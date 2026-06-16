# Bag Ninja - Revised Project Plan

## Overview

**Bag Ninja** is a top-down pixel art browser game in an NES-inspired style. The player is a lawncare ninja who must mow all accessible front yards in a suburban neighborhood and dump the resulting yard waste bags on Curtis' lawn without being caught.

**Target platforms:** Desktop and mobile browsers  
**Primary presentation:** Portrait gameplay area at 9:16  
**Internal resolution:** 208x384 pixels with nearest-neighbor scaling  
**Tile size:** 16x16 pixels  
**Starter grid size:** 13 tiles wide x 24 tiles tall  
**Progress model:** Single-run only, no persistence for MVP

## Current Repository State

As of June 16, 2026, the repository currently contains:

- a standalone level editor in `tools/`
- a standalone playable vertical slice in `play/`
- plain HTML, CSS, and JavaScript rather than the planned TypeScript/Vite scaffold
- deterministic generated assets under `assets/`
- asset-backed rendering in the playable page with fallback drawing for missing images
- `2x` displayed canvas scaling for readability while preserving the low-resolution internal grid
- real-time fixed-tick simulation shared between browser runtime and tests
- configurable Curtis indoor/outdoor timing
- level loading, movement, collision, mower fullness, bag interactions, Curtis detection, police chase, and win/loss checks

The sections below separate the current implementation from the deferred upgrade path so the document stays aligned with the codebase.

## MVP Principles

- Build a vertical slice before adding polish.
- Use placeholder art first.
- Keep rules explicit and configurable.
- Test core gameplay rules as they are added.
- Prefer simple modules and a central game state over ECS for MVP.
- Keep content authoring boundaries explicit so level design, assets, and engine work can progress independently.

## Current Tech Stack

| Layer | Current Choice | Notes |
|-------|----------------|-------|
| Language | Plain JavaScript | Current repo is browser-first and unbundled |
| Rendering | HTML5 Canvas 2D | Used by the playable slice |
| Build | None | Static files opened directly or served locally |
| Package manager | npm | Used for test script wiring |
| Deployment | Static hosting | No backend needed |
| Testing | Node built-in test runner | `node --test` via `npm test` |

## Deferred Upgrade Path

| Layer | Future Option | Notes |
|-------|--------|-------|
| Language | TypeScript | Strong tooling and maintainability |
| Rendering | HTML5 Canvas 2D | Precise pixel-art control |
| Build | Vite | Fast startup and simple static build |
| Package manager | npm | Standard and sufficient |
| Deployment | Static hosting | No backend needed |
| Testing | Vitest | Good fit for TypeScript and gameplay rule tests |

## Current Architecture

The current repository uses a lean static-file structure:

```text
bagninja/
|-- assets/
|-- docs/
|-- play/
|   |-- index.html
|   |-- game.css
|   |-- game.js
|   `-- game-core.js
|-- tests/
|   `-- game-core.test.js
|-- tools/
|   |-- level-editor.html
|   |-- level-editor.css
|   |-- level-editor.js
|   |-- asset-viewer.html
|   |-- asset-viewer.css
|   |-- asset-viewer.js
|   `-- level-default.json
|-- package.json
`-- README.md
```

Behavior split today:

- `play/game-core.js` owns gameplay rules and simulation state transitions
- `play/game.js` owns browser timing, rendering, controls, and presentation
- `tests/game-core.test.js` verifies the shared gameplay core
- `tools/level-editor.js` owns schema-aware authoring and structural validation

## Deferred Modular Architecture

Use a simple data-oriented module structure instead of ECS.

```text
bagninja/
|-- docs/
|   |-- original-prompt.txt
|   |-- project-plan.md
|   |-- game-design.md
|   |-- level-format.md
|   |-- level-authoring-guidelines.md
|   |-- editor-object-catalog.md
|   |-- sprite-spec.md
|   |-- asset-prompts.md
|   `-- neighborhood-01.json
|-- src/
|   |-- main.ts
|   |-- core/
|   |   |-- game.ts
|   |   |-- loop.ts
|   |   |-- config.ts
|   |   |-- state.ts
|   |   |-- input.ts
|   |   `-- renderer.ts
|   |-- gameplay/
|   |   |-- movement.ts
|   |   |-- mowing.ts
|   |   |-- moveable-items.ts
|   |   |-- curtis.ts
|   |   |-- police.ts
|   |   |-- los.ts
|   |   |-- actions.ts
|   |   |-- win-loss.ts
|   |   `-- pathing.ts
|   |-- level/
|   |   |-- schema.ts
|   |   |-- loader.ts
|   |   |-- validator.ts
|   |   `-- levels/
|   |       `-- neighborhood-01.json
|   |-- ui/
|   |   |-- hud.ts
|   |   |-- controls.ts
|   |   `-- screens.ts
|   |-- assets/
|   |   |-- placeholder/
|   |   `-- final/
|   `-- test/
|       |-- level-validator.test.ts
|       |-- mowing.test.ts
|       |-- moveable-items.test.ts
|       |-- los.test.ts
|       `-- win-loss.test.ts
|-- package.json
|-- tsconfig.json
|-- vite.config.ts
`-- README.md
```

## Core Design Decisions

1. **Single-screen playfield**
   The full neighborhood fits on one screen. No scrolling or camera logic is needed for MVP.

2. **Grid-locked logic with tweened rendering**
   Game logic runs on discrete tile positions. Visual movement interpolates between tiles.

3. **Curtis is confined to his property**
   Curtis may patrol only tiles marked as his property.

4. **Bag discovery is flavor, not a new rules system**
   Curtis reacts when he notices new bags on his property, but this is presentation and state flavor unless the player is visible on his property.

5. **Bottom control area must not cover gameplay**
   Mobile controls and action button should sit in reserved UI space below the active gameplay view rather than over the playfield.

6. **Placeholder-first asset workflow**
   Basic colored blocks and temporary sprites should be enough to finish gameplay before final art.

7. **Larger yards are a core gameplay need**
   The level should support roughly 20-30 mowable cells per normal yard so mowing feels substantial rather than incidental.

## Lean Implementation Plan

### Phase 0: Spec Lock and Project Setup

- Scaffold Vite + TypeScript
- Add a single config module for tunable values
- Create the initial game state shape
- Set up Vitest
- Add placeholder rendering for tiles and entities
- Reserve a bottom UI band for mobile controls and action button

**Deliverable:** A running app that shows a static playfield and accepts input.

### Phase 1: Level System and Validation

- Implement a simple JSON level format using `base`, `items`, `markers`, and `zones`
- Support base terrain, placed items, and runtime spawn markers
- Define explicit Curtis property through the `zones` layer
- Write level-authoring, editor-object, and sprite-spec docs as stable content contracts
- Implement validation rules:
  - Base layer defines authoritative width and height
  - Only valid base, item, and marker symbols are used
  - No cell contains both an item and a marker
  - At least one valid Curtis, player, and mower spawn marker exists
  - All mowable grass tiles are reachable
  - At least one route exists from all mowing areas to Curtis property
- Create one hand-authored initial level file
- Add a simple browser-based level editor for authoring and exporting level JSON

**Deliverable:** One valid neighborhood JSON file and a validator that can reject bad layouts.

### Phase 2: Player, Mower, and Mowing Loop

- Implement grid movement
- Implement collision rules
- Implement the shared `moveable item` runtime model
- Add action-based mower start/stop behavior
- Add mowing state changes and fullness tracking
- Add emptying behavior to produce a bag
- Add bag pickup, carry, and bag dropping on Curtis property only

**Tests to add during this phase:**
- Mowing changes only eligible tiles
- Fullness increases correctly
- Mower cannot engage when full
- Emptying creates exactly one bag and resets fullness
- Attached moveable-item occupancy rules remain valid

**Deliverable:** The full player gameplay loop works with placeholders.

### Phase 3: Curtis Rules and Lose State

- Implement Curtis indoor/outdoor timer
- Implement Curtis patrol limited to his property, with pause-at-point wandering and home-return transitions
- Implement any-angle line-of-sight checks
- Implement suspicion-based escalation: spot -> alert -> police
- Make bag discovery a flavor reaction only
- Implement police arrival / arrest lose sequence

**Tests to add during this phase:**
- LOS blocked by homes and obstacles
- Curtis never leaves property
- Detection only occurs when player is on Curtis property and Curtis has LOS while outside
- Breaking LOS decays or interrupts escalation correctly

**Deliverable:** The stealth rule set is complete.

### Phase 4: Win Condition, Screens, and Mobile Controls

- Implement win condition:
  - all mowable grass is cut
  - all generated bags are on Curtis property
- Add title, win, and lose screens
- Implement touch controls in the bottom UI band
- Implement contextual action button outside the gameplay area

**Tests to add during this phase:**
- Win does not trigger early
- Win does trigger when both mowing and bag conditions are satisfied
- Lose triggers only after full escalation path

**Deliverable:** MVP-complete playable game.

### Phase 5: Art, Juice, and Tuning

- Replace placeholders with final pixel art
- Tune Curtis timing, mower capacity, and movement speed
- Add lightweight VFX/UI feedback
- Optional sound effects
- Final browser/device testing

## Configuration To Expose Early

Put these in `src/core/config.ts` so they can be tuned without touching gameplay logic:

- `tileSize`
- `defaultGridWidth`
- `defaultGridHeight`
- `moveDurationMs`
- `curtisOutsideDurationMinMs`
- `curtisOutsideDurationMaxMs`
- `curtisInsideDurationMinMs`
- `curtisInsideDurationMaxMs`
- `curtisNoticeDurationMs`
- `curtisAlertDurationMs`
- `curtisSuspicionDecayDurationMs`
- `mowerCapacityTiles`
- `policeArrivalDurationMs`
- `showTouchControls`

## Content Boundaries

The project should treat these as separate concerns with explicit contracts:

- **Level design** defines base terrain, placed items, and runtime markers.
- **Level editor** exposes only approved authoring objects and writes valid level JSON.
- **Asset pipeline** produces only approved tile and sprite outputs with stable IDs and dimensions.
- **Game engine** consumes the JSON and sprite IDs without inventing new content semantics ad hoc.

This separation is important if multiple AI tools are used on the project. The docs should be specific enough that one tool can work on art prompts or level editing without silently changing gameplay assumptions.

## What To Test Early

Do not wait for a late test phase. Add small deterministic tests as systems appear.

- Level validation
- Reachability from spawn markers
- LOS blocking
- Mowing/fullness transitions
- Moveable-item attachment and drop rules
- Win/lose conditions

## Placeholder Art Plan

Start with:

- Colored rectangles for terrain
- A simple 16x16 player block with facing marker
- A simple mower block
- A bag icon block
- Curtis and police as distinct colored blocks

Only after the full gameplay loop works should final sprite production begin.

## Level Size Rationale

- `16x16` tiles preserve sprite readability for the player, mower, bags, Curtis, and obstacles.
- A `13x24` starter grid gives enough space for six readable front-yard territories while keeping the whole neighborhood on one screen.
- This size supports roughly `20-30` mowable cells in a normal yard and roughly `120-160` mowable cells across the full non-Curtis map, depending on obstacle density.
- Enlarging the grid is safer than shrinking tile size because gameplay clarity matters more than raw map density.

## Risks and Recommended Handling

| Risk | Recommendation |
|------|----------------|
| Overengineering early | Avoid ECS and keep game state centralized |
| Weak mobile usability | Reserve UI space below gameplay, use large tap targets |
| Broken level layouts | Build validation before content expansion |
| Rule drift across docs and code | Keep `game-design.md` and config constants aligned |
| Art delays | Use placeholders until MVP is fully playable |

## Immediate Next Steps

1. Tune Curtis inside/outside timing against `play/levels/level-01.json`.
2. Add semantic level validation only where it materially protects shipped content.
3. Add win-screen presentation and continue replacing fallback visuals with final art where needed.
4. Decide whether the playable page should expose a title/start flow or continue loading directly into gameplay.

## Stretch Backlog

- Add moving car hazards that traverse the road from top-to-bottom or bottom-to-top.
- Car contact should immediately kill the player and trigger game over.
- Curtis and police should prioritize avoiding cars over their normal movement decisions.
