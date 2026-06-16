# Bag Ninja - Game Design Document

## Game Concept

**Genre:** Top-down stealth/puzzle  
**Theme:** Suburban lawncare mischief  
**Tone:** Humorous and lighthearted  
**Visual target:** NES-inspired pixel art  
**Play target:** Browser play on desktop and mobile

## Core Gameplay Loop

1. Move around the neighborhood on foot.
2. Move onto the mower cell and use the action button to start it.
3. While operating the mower, the mower sprite is hidden and the player uses a mower-operating state.
4. Move across unmowed grass to cut it and fill the mower.
5. When full, stand on the mower tile and use the action button to empty it and create one yard waste bag on the nearest valid free tile.
6. Move onto the bag cell and use the action button to pick it up.
7. Carry the bag onto Curtis' property and use the action button to drop it there.
8. Repeat until all mowable grass is cut and all generated bags are on Curtis' property.
9. Avoid being seen by Curtis while on his property.

## Playfield

- The current starter content and editor default use a `13x24` gameplay grid.
- Each tile is `16x16` pixels.
- The starter level's active gameplay view is `208x384` pixels.
- The current playable runtime sizes the canvas dynamically from the loaded level dimensions while keeping `16x16` tiles.
- Mobile controls and action UI should sit below the gameplay area, not on top of it.
- The road runs vertically through the middle of the neighborhood.
- Three homes sit on each side of the road.
- Yards are mostly open to the road and to neighboring yards.
- Fences only exist where you want actual movement and LOS blocking.
- A normal mowable yard should usually contain roughly `20-30` mowable cells after pavement and obstacles are accounted for.

## Entity Rules

### Player

- Moves in four directions on the grid
- Can walk, start mower, stop mower, empty mower, pick up bag, carry bag, and drop bag
- Starts at a valid player spawn marker
- Does not drive the world simulation forward by moving or acting

### Mower

- Starts at a valid mower spawn marker
- Is a runtime `moveable item`
- Is non-blocking and may share a cell with the player
- Cannot share a tile with a free bag
- Is hidden visually while the player is in the `operate-mower` state
- Tracks fullness based on how many grass tiles have been mowed
- Produces exactly one bag when emptied at full capacity
- Cannot be started while full

### Curtis

- Is confined to Curtis property
- Is always outdoors in the current playable runtime
- Advances on the game simulation tick even when the player stands still
- Detects the player only when:
  - the player is on Curtis property
  - Curtis has orthogonal line of sight to the player
- Uses multi-stage escalation:
  - `spot`
  - `alert`
  - `police`
- Reacts to discovering newly dropped bags as flavor only

### Police

- Appears only as part of the lose sequence
- Spawns after Curtis reaches `police` state and yells for police
- Moves toward the player one grid step per simulation tick
- Contact with the player triggers the loss presentation

## Terrain and Item Rules

### Base Terrain

- Mowed grass is walkable and not mowable
- Road is walkable and not mowable
- Pavement is walkable and not mowable

### Zones

- Curtis territory is authored in a separate `zones` layer
- Curtis territory may include both grass and pavement cells
- Curtis territory does not change the visual base tile by itself

### Blocking Items

These block movement and LOS:

- house
- fence
- bush
- tree

### Non-Blocking Authored Items

These do not block LOS:

- tall grass

Walkability:

- tall grass is walkable

### Runtime Moveable Items

Runtime moveable items are:

- mower
- bag

Shared behavior:

- free in the world or attached to an actor
- hidden visually while attached
- non-blocking by terrain rules
- cannot stack with another free moveable item on the same tile
- use the action button for interaction

## Mowing Rules

- Unmowed grass is represented by `tall grass` over a `mowed grass` base tile
- Moving across an unmowed grass tile while operating the mower removes the `tall grass` item and leaves mowed grass underneath
- Each mowed tile increases mower fullness
- Curtis territory is never part of the mowable objective

## Bag Rules

- Emptying a full mower creates exactly one bag
- Bag is a runtime `moveable item`, not an authored level item
- The player can carry only one bag at a time
- The player picks up a bag by standing on it and using the action button
- Bags can be dropped only on Curtis property
- While carrying a bag, the action control is only available on Curtis property
- Dropped bags remain where they were placed
- Dropped bags are walkable and do not block LOS
- Multiple bags do not create extra mechanical penalties
- The only gameplay importance of dropped bags is:
  - they count toward the win condition
  - Curtis may react to newly noticed bags as flavor

## Detection Rules

- Curtis uses orthogonal line of sight only
- LOS is blocked by:
  - houses
  - fences
  - bushes
  - trees
- LOS is not blocked by:
  - road
  - grass
  - tall grass
  - mower
  - bags
  - characters
- Breaking LOS before the police call resets Curtis back to idle
- Once Curtis has called the police, the lose sequence continues even if LOS breaks

## Win Condition

The player wins when:

- all mowable grass tiles are mown
- all generated bags are on Curtis property
- the player has not been caught

## Lose Condition

The player loses when the police reach the player after Curtis completes the escalation path.

## UI Requirements

### Desktop

- Keyboard movement
- Keyboard action button
- Optional on-screen buttons can be hidden

### Mobile

- Directional controls in a reserved bottom control band
- Contextual action button in that same bottom control band
- Controls must not cover the gameplay view

## Simulation Rules

- The game runs on a fixed simulation tick independent of player input
- The current browser implementation uses a `400ms` tick interval
- Curtis patrol, Curtis detection escalation, and police pursuit all advance on that tick
- The player may move between ticks, but standing still does not pause the world

## Asset Workflow

- Start with placeholders
- Replace with final sprite art only after MVP is playable
- Keep sprite sizes and pivot assumptions stable so placeholder-to-final swap is low risk

## Current Implementation Status

The current browser-playable slice implements:

- level JSON loading
- dynamic canvas sizing from loaded level dimensions
- asset-backed tile and entity rendering with code-drawn fallbacks for missing images
- player movement with collision from current item state
- idle mower spawn placement
- mowing by removing `tall grass` while operating the mower
- action-based mower start and stop
- mower fullness
- bag creation from emptying a full mower
- bag pickup and drop rules
- win-condition detection for mowing plus bag placement
- Curtis spawn validation on Curtis-property tiles
- visible Curtis placeholder rendering
- basic Curtis patrol movement constrained by Curtis territory
- orthogonal Curtis LOS checks through blocking items only
- basic Curtis detection escalation from `spot` to `alert` to `police`
- fixed-rate autonomous simulation ticking independent of player input
- police spawn, pursuit, and capture state transitions
- game-over freeze, fade, and splash overlay after police contact

The current playable slice does not yet implement:

- indoor and outdoor Curtis state timing
- polished arrest artwork and final presentation assets
- win screen presentation

## Open Scope Boundaries

These are intentionally out of MVP unless later requested:

- Multiple levels
- Persistent progression
- Score system
- Advanced pathfinding behaviors
- Complex audio system
