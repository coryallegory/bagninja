# Bag Ninja - Project Plan

## Overview

**Bag Ninja** is a top-down pixel art browser game in the NES aesthetic. The player is a lawncare ninja who must mow all accessible front yards in a suburban neighborhood and covertly dump the resulting yard waste bags on Curtis' lawn without being caught.

**Target platforms:** Desktop and mobile browsers
**Aspect ratio:** 9:16 (standard mobile portrait), displayed at same ratio on desktop
**Resolution:** 144×256 pixels (scaled up with nearest-neighbor filtering)
**Tile size:** 16×16 pixels (grid: 9 tiles wide × 16 tiles tall)

---

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript | Type safety, tooling, modern JS ecosystem |
| Rendering | HTML5 Canvas (2D context) | Lightweight, pixel-perfect control, no framework overhead |
| Build | Vite | Fast dev server, simple config, asset bundling |
| Package manager | npm | Standard ecosystem |
| Deployment | Static hosting (GitHub Pages or similar) | No backend required |

---

## Project Structure

```
bagninja/
├── docs/                    # Design documents
│   ├── original-prompt.txt
│   ├── project-plan.md
│   └── game-design.md
├── src/
│   ├── index.html           # Entry HTML
│   ├── main.ts              # Boot / game loop
│   ├── core/
│   │   ├── game.ts          # Game state machine (menu, play, win, lose)
│   │   ├── loop.ts          # Fixed-timestep game loop
│   │   ├── input.ts         # Keyboard + touch input abstraction
│   │   └── renderer.ts      # Canvas scaling, draw calls
│   ├── ecs/
│   │   ├── entity.ts        # Entity base
│   │   ├── component.ts     # Component types
│   │   └── system.ts        # System runner
│   ├── systems/
│   │   ├── movement.ts      # Grid-based movement + animation tweening
│   │   ├── mowing.ts        # Grass state transitions, fullness tracking
│   │   ├── bag.ts           # Bag creation, carrying, dropping
│   │   ├── curtis-ai.ts     # Curtis patrol / inspect / angry states
│   │   ├── police.ts        # Police arrival on detection
│   │   ├── collision.ts     # Boundary / fence / obstacle checks
│   │   └── visibility.ts    # Line-of-sight calculations
│   ├── map/
│   │   ├── tilemap.ts       # Tile definitions and map data
│   │   ├── level.ts         # Level loading, terrain grid, spawn zones
│   │   ├── loader.ts        # Map loading from JSON
│   │   └── levels/
│   │       └── neighborhood.json # Level 1: accessibility grid + metadata
│   ├── sprites/
│   │   ├── spritesheet.ts   # Sprite atlas definitions
│   │   └── animator.ts      # Frame-based animation controller
│   ├── ui/
│   │   ├── hud.ts           # Fullness meter, action button state
│   │   ├── dpad.ts          # Touch d-pad overlay
│   │   └── screens.ts       # Title, win, lose screens
│   └── assets/
│       ├── spritesheet.png  # Combined sprite atlas
│       └── tiles.png        # Tileset image
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation
- Project scaffolding (Vite + TypeScript)
- Game loop with fixed timestep
- Canvas setup with pixel-perfect scaling (9:16)
- Input system (keyboard arrows + touch d-pad)
- Basic tile map rendering

### Phase 2: Map & Movement
- Design neighborhood accessibility grid (9×16 terrain type grid)
- Define level data format (JSON) with terrain types, spawn zones, Curtis property markers
- Grid-based player movement with smooth tweening between cells
- Collision detection using terrain walkability rules
- Camera (static — single screen, no scrolling)
- Validate level design: ensure all accessible grass is reachable, paths to Curtis' lawn exist

### Phase 3: Core Mechanics
- Lawn mowing system (unmown grass tiles transition to mown when mower moves onto them)
- Curtis' lawn is pre-mown and never mowable
- Mower fullness percentage tracking
- Engage/disengage mower interaction (combined sprite on engage, separate to adjacent square on disengage)
- Empty mower → receive yard waste bag
- Bag carrying state (player cannot use mower while holding bag)
- Drop bag on Curtis' lawn only
- Random spawn placement: mower in non-Curtis yard, player in non-Curtis yard

### Phase 4: Curtis AI
- Curtis state machine: idle (indoors) → emerge → patrol → spot player → alert ("HEY!") → call police → return indoors
- Multi-stage detection escalation: spot → face player → shout "HEY!" → call police (each stage requires continued LOS)
- Player can escape at any stage by breaking line of sight
- Random emergence timer
- Line-of-sight detection (cardinal/orthogonal ray casting on grid, blocked by homes and obstacles)
- Detection triggers: player on Curtis' property (with or without bag) while Curtis is outside with LOS

### Phase 5: Win/Lose Conditions
- Police arrival animation on detection (lose condition)
- Win condition: all accessible grass mown + all bags on Curtis' lawn
- End screens with restart option

### Phase 6: Art & Polish
- NES-style pixel art sprites (16×16):
  - Player (4-direction walk cycle, idle, carrying bag)
  - Lawn mower (stationary, engaged with player)
  - Grass tiles (unmowed, mowed)
  - Yard waste bag (on ground, carried)
  - Curtis (4-direction walk, idle, angry)
  - Police officer
  - Homes (3 distinct), fences, driveways, plants, street
- Title screen
- Sound effects (optional stretch goal)
- Mobile touch controls polish

### Phase 7: Testing & Deployment
- Playtesting and balance (Curtis timing, mower capacity)
- Build optimization
- Deploy to GitHub Pages

---

## Key Technical Decisions

1. **ECS-lite architecture** — Entities with component bags, systems iterate per frame. Keeps game logic modular and testable without heavy framework overhead.

2. **Accessibility grid level definition** — Each level is a 9×16 grid of terrain types that defines walkability, LOS blocking, gameplay zones, and entity spawn rules. This separates map/obstacle design from game logic and enables future multi-level support.

3. **Grid-based movement with tweening** — Logical positions are grid cells; visual positions interpolate smoothly between cells over ~150ms to mimic NES-era movement feel.

3. **Fixed timestep loop** — Logic runs at 60 updates/sec decoupled from render frame rate for consistent behavior across devices.

4. **Single-screen static view** — No camera scrolling needed. The entire neighborhood fits in one 9:16 screen.

5. **Touch controls** — Virtual d-pad (bottom-left) + action button (bottom-right) overlaid on canvas for mobile. Hidden on desktop.

---

## Estimated Tile Budget

| Element | Tiles (approx) |
|---------|----------------|
| Street (center) | 2 tiles wide × 16 tall = 32 |
| Each yard | ~3 tiles wide × varies |
| Homes (partial, top edge) | 3 tiles wide × 2-3 tall each |
| Fences | 1 tile wide between homes |
| Driveways | 1-2 tiles wide × 2-3 tall |
| Walkable lawn | Remaining space (~60-70 grass tiles total) |

Total map: 9 × 16 = 144 tiles

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Pixel art quality | Use established NES palette (e.g., NTSC NES 54-color palette), reference existing NES games for proportions |
| Touch controls feel bad | Large tap targets, visual feedback, dead zones on d-pad |
| Curtis AI too hard/easy | Expose timing constants for easy tuning |
| Scope creep | Strict MVP first (phases 1-5), polish after |
