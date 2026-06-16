# Bag Ninja - Session Handoff

## Purpose

This document captures the current project state, recent decisions, and open backlog so a future session can resume without relying on chat memory.

Last updated: June 16, 2026

## Current Runtime Snapshot

- The playable game lives in `play/`.
- Shared gameplay rules live in `play/game-core.js`.
- Browser rendering, timing, and input live in `play/game.js`.
- Level authoring tools live in `tools/`.
- The default playable level is `play/levels/level-01.json`.
- The default editor level is `tools/level-default.json`.
- Core tests live in `tests/game-core.test.js`.

## Confirmed Core Rules

- The game is real-time, not turn-based.
- The simulation tick is `400ms`.
- Curtis, police, suspicion buildup, indoor/outdoor timing, and other world simulation all advance on that fixed tick.
- Player input does not advance the world.
- Quick taps can move the player faster than the held-repeat cadence.

## Moveable Item Model

Moveable runtime items are:

- mower
- bag

Rules:

- authored level files do not place these as normal static items
- mower comes from mower spawn markers
- bags are generated at runtime
- the player may occupy the same tile as one free moveable item
- free moveable items may not stack on the same tile
- if the player already has an attached moveable item, they cannot enter a tile containing another free moveable item
- mower and bag are both walkable
- mower and bag do not block LOS

### Mower Rules

- the player engages the mower by standing on its tile and using action
- the player cannot start the mower while carrying a bag
- mowing removes `Tall Grass` from the tile and increases mower fullness
- when the mower is full, it remains engaged but stops mowing additional grass
- disengaging a full mower resets mower fullness to zero and immediately puts one bag into the player's hands
- while the player is operating the mower, the player uses mower-operating visuals and the free mower sprite is hidden

### Bag Rules

- the player picks up a bag by standing on its tile and using action
- the player can carry only one bag at a time
- bags can be dropped only on Curtis-zone tiles
- a bag may be dropped onto a Curtis-zone tile even if the mower is also on that tile
- a bag may not be dropped onto another free bag
- bags count toward the win condition only when free in the world and on Curtis property

## Curtis Rules

- Curtis is confined to Curtis-zone tiles only
- Curtis uses any-angle unobstructed LOS
- LOS is blocked by: house, fence, roadblock, bush, tree
- LOS is not blocked by: grass, road, pavement, tall grass, mower, bag, characters
- Curtis notices the player when:
  - the player is on Curtis property and visible, or
  - the player is visibly carrying a bag and visible anywhere
- Curtis turns to face the player immediately on notice
- Curtis suspicion escalates through:
  - `idle`
  - `spot`
  - `alert`
  - `police`
- Curtis stops moving while suspicious
- Curtis bag discovery is flavor only

### Curtis Patrol Behavior

- Curtis alternates between outdoor and indoor states
- while outdoors, he "putters" by selecting interest points on his property
- he pauses at those points briefly, then moves again
- before disappearing indoors, he returns to his home spawn point
- he should never disappear from an arbitrary tile

## Police Rules

- when Curtis reaches `police`, he calls for police
- police then spawn from a police spawn marker
- if more than one marker of a given type exists, spawn choice is random among them
- police move toward the player on the simulation tick
- police contact causes capture, freeze/fade, and game-over splash

## Win / Loss

The player wins when:

- all mowable grass has been cut
- all generated bags are on Curtis property
- the player has not been captured

The player loses when:

- police contact the player after Curtis completes the escalation path

## Level Authoring Model

Authored layers are:

- `base`
- `items`
- `markers`
- `zones`

Key symbols:

- base: `g`, `R`, `S`
- items: `_`, `H`, `F`, `K`, `B`, `T`, `L`
- markers: `_`, `c`, `p`, `m`, `o`
- zones: `_`, `C`

Notes:

- `K` is roadblock and blocks movement and LOS
- `L` is tall grass and represents unmowed lawn when placed over `g`
- mower and bag are runtime-only and are not authored in the static items layer

## Mobile and Desktop Controls

### Desktop

- keyboard movement via arrows or `WASD`
- action via `Space`, `Enter`, or `E`
- held keyboard movement repeats every `400ms`
- tapping directional keys can still move faster than held-repeat

### Mobile

- touch controls are integrated into the play area
- left thumb uses a joystick
- right thumb uses a circular action target
- both controls are intentionally faint
- the joystick uses:
  - a thin outlined center ring
  - a thin outlined movable inner ring
  - four outer white triangles
  - no outer ring
  - no filled center
- the action target matches the joystick footprint and is a plain white circle with about `70%` opacity
- joystick initial engage moves immediately
- held joystick movement repeats every `400ms`
- changing direction while dragging does not trigger an extra immediate move; the new direction applies on the next repeat tick

## Asset / Visual Notes

- asset-backed rendering is active with fallback drawing when files are missing
- `tools/asset-viewer.html` previews the current asset contract
- `assets/items/roadblock.png` exists and is generated by `tools/generate-core-assets.js`
- mower progress UI is only visible while the player is actively operating the mower

## Known Current Constraints

- The game still assumes a single-screen full-map view.
- There is no scrolling camera yet.
- Touch controls currently overlay the play area on mobile widths.
- Browser automation verification in this environment was blocked by local browser runtime sandbox startup issues, so recent touch-control layout changes were code/test verified but not fully browser-automated here.

## Outstanding Backlog

- Replace remaining fallback-drawn visuals with final art as desired
- Add win-screen presentation
- Tune Curtis inside/outside timing and patrol feel against the current level
- Decide whether to keep direct-to-game loading or add a title/start flow
- Add optional semantic level validation only where it materially helps content quality
- Stretch: road cars that traverse the street and kill the player on contact, with Curtis and police prioritizing car avoidance

## Recommended First Resume Steps

1. Open `play/index.html` and verify mobile touch control feel on an actual device or device emulator.
2. Tune control opacity/placement only after confirming thumb comfort.
3. Continue with art replacement or UI flow work, not engine rewrites, unless camera/viewport is intentionally being revisited.
