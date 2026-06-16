# Bag Ninja - Sprite and Tile Specification

## Purpose

This document defines the visual object inventory that art generation, placeholder implementation, atlas planning, and engine rendering should all use.

The main goal is to separate:

- what visual objects exist
- whether they are base tiles, items, markers, or runtime entities
- which ones are static versus animatable

## Global Rules

- Base tile size is `16 x 16`.
- Generated assets and later replacements should share stable IDs and filenames.
- Directional entities should use `up`, `down`, `left`, `right`.
- State names should remain stable across rough and final art.
- The current playable slice now renders from the asset files in `assets/` with code-drawn fallbacks where an image is still missing.

## Asset Format

For quick initial generation, use:

- individual `.png` files
- `16 x 16` pixels per tile or sprite frame
- transparent background for all items, entities, markers, UI, and FX
- opaque full-tile fills for base tiles unless you intentionally add texture
- nearest-neighbor scaling only; do not add baked blur or antialiasing

Recommended export rules:

- use `RGBA` PNG
- keep one asset frame per file
- do not use a spritesheet yet unless batching becomes necessary later
- align all art to the full `16 x 16` tile box

These filenames should be treated as the long-term runtime contract. You can replace the image contents later without renaming files or changing code.

## Recommended Asset Folder Layout

```text
assets/
|-- base/
|-- items/
|-- markers/
|-- entities/
|-- ui/
`-- fx/
```

## Filename Convention

Use lowercase kebab-case filenames that map directly to the stable asset IDs.

Pattern:

- `base.<group>.<name>` -> `base/<group>-<name>.png`
- `item.<name>` -> `items/<name>.png`
- `item.<name>.<frame>` -> `items/<name>-<frame>.png`
- `moveable.<name>` -> `entities/<name>-idle.png` or another state-specific entity filename
- `marker.<name>` -> `markers/<name>.png`
- `entity.<name>.<state>` -> `entities/<name>-<state>.png`
- `entity.<name>.<state>.<direction>.<frame>` -> `entities/<name>-<state>-<direction>-<frame>.png`

Examples:

- `base.grass.mowed` -> `assets/base/grass-mowed.png`
- `item.tall-grass` -> `assets/items/tall-grass.png`
- `item.tall-grass.01` -> `assets/items/tall-grass-01.png`
- `marker.player-spawn` -> `assets/markers/player-spawn.png`
- `entity.mower.idle` -> `assets/entities/mower-idle.png`
- `entity.player.walk.down.01` -> `assets/entities/player-walk-down-01.png`

## Base and Item Symbol Mapping

These are the concrete files you should generate first for level rendering.

### Base Layer Mapping

| Level Symbol | Asset ID | Filename |
|--------------|----------|----------|
| `g` | `base.grass.mowed` | `assets/base/grass-mowed.png` |
| `R` | `base.road` | `assets/base/road.png` |
| `S` | `base.pavement` | `assets/base/pavement.png` |

### Zone Layer Mapping

| Level Symbol | Asset ID | Filename |
|--------------|----------|----------|
| `C` | `zone.curtis-territory` | optional overlay or tint |

### Item Layer Mapping

| Level Symbol | Asset ID | Filename |
|--------------|----------|----------|
| `H` | `item.house` | `assets/items/house.png` |
| `F` | `item.fence` | `assets/items/fence.png` |
| `B` | `item.bush` | `assets/items/bush.png` |
| `T` | `item.tree` | `assets/items/tree.png` |
| `L` | `item.tall-grass` | `assets/items/tall-grass.png` |
Notes:

- `_` means no item and does not need an asset file.
- `tall-grass.png` should be transparent around the grass shape so the underlying `grass-mowed.png` base remains visible.
- `house.png`, `fence.png`, `bush.png`, and `tree.png` should also use transparency around the silhouette rather than filling the entire tile.
- If an authored item later becomes animated, keep the same asset ID and add numbered frame files such as `tall-grass-01.png`, `tall-grass-02.png`.

## Base Tiles

| Asset ID | Type | Tile Size | Notes |
|----------|------|-----------|-------|
| `base.grass.mowed` | base | 16x16 | Post-mow grass |
| `base.road` | base | 16x16 | Center road |
| `base.pavement` | base | 16x16 | Walkable edge path |

## Zone Visuals

| Asset ID | Type | Tile Size | Notes |
|----------|------|-----------|-------|
| `zone.curtis-territory` | zone overlay | 16x16 | Optional translucent overlay used to indicate Curtis territory regardless of underlying base tile |

## Item Sprites

| Asset ID | Type | Tile Size | Notes |
|----------|------|-----------|-------|
| `item.house` | item | 16x16 | House frontage block |
| `item.fence` | item | 16x16 | Fence blocker |
| `item.bush` | item | 16x16 | Bush blocker |
| `item.tree` | item | 16x16 | Tree blocker |
| `item.tall-grass` | item | 16x16 | Walkable unmowed-grass representation |
## Optional Animated Item Convention

Items may be static or animated without changing the level schema.

Rules:

- the authored level still references only the item symbol such as `L` or `A`
- animation is determined entirely by asset presence and runtime mapping
- the base filename remains the canonical asset name
- additional animation frames append `-01`, `-02`, `-03`, and so on

Recommended animated-item naming:

| Asset ID | Static Filename | Animated Filenames |
|----------|-----------------|-------------------|
| `item.tall-grass` | `assets/items/tall-grass.png` | `assets/items/tall-grass-01.png`, `assets/items/tall-grass-02.png` |
| `item.tree` | `assets/items/tree.png` | `assets/items/tree-01.png`, `assets/items/tree-02.png` |
| `item.bush` | `assets/items/bush.png` | `assets/items/bush-01.png`, `assets/items/bush-02.png` |

Practical guidance:

- start with static files first
- only animate items where motion materially helps readability or mood
- `tall-grass` is the best first animated item candidate
- keep blocking items visually readable even if they sway slightly
- use short looping animations, usually 2 frames for rough art and 2-4 frames for final art

## Runtime Moveable Item Sprites

Moveable items are runtime objects that are not authored in the static `items` layer.

| Asset ID | Type | Tile Size | Notes |
|----------|------|-----------|-------|
| `moveable.mower.idle` | moveable item | 16x16 | Free unattended mower in the world |
| `moveable.mower.full` | moveable item | 16x16 | Optional future mower-full world state |
| `moveable.bag.idle` | moveable item | 16x16 | Free bag in the world |

Notes:

- the free unattended mower currently uses `assets/entities/mower-idle.png`
- the free bag currently uses `assets/items/bag.png`
- attached moveable items are hidden in the world and represented through player-state sprites instead

## Marker Sprites

These may be editor-only or debug-only visuals.

| Asset ID | Type | Tile Size | Notes |
|----------|------|-----------|-------|
| `marker.curtis-spawn` | marker | 16x16 | Editor marker |
| `marker.player-spawn` | marker | 16x16 | Editor marker |
| `marker.mower-spawn` | marker | 16x16 | Editor marker |
| `marker.police-spawn` | marker | 16x16 | Editor marker |

Recommended filenames:

- `assets/markers/curtis-spawn.png`
- `assets/markers/player-spawn.png`
- `assets/markers/mower-spawn.png`
- `assets/markers/police-spawn.png`

## Animatable Runtime Entities

### Player

| Asset ID Prefix | States | Directions | Minimum Frames |
|-----------------|--------|------------|----------------|
| `entity.player` | `idle`, `walk`, `carry`, `operate-mower` | `up`, `down`, `left`, `right` | 1 idle, 2 walk, 1 carry, 2 operate-mower |

Notes:

- `carry` is the player carrying a bag on foot.
- `operate-mower` is the player with the mower attached and hidden in-world.
- For rough art, `01` and `02` frame numbering is sufficient.

### Mower

| Asset ID Prefix | States | Directions | Minimum Frames |
|-----------------|--------|------------|----------------|
| `entity.mower` | `idle`, `full` | none for unattended mower | 1 idle, 1 full |

Notes:

- The mower is marker-spawned at runtime, not a placed authored item.
- While the player is operating the mower, the mower sprite is hidden and the player uses `entity.player.operate-mower`.
- The unattended mower only needs one nondirectional sprite for now.
- Recommended unattended filename: `assets/entities/mower-idle.png`
- A future full-state variant can use `assets/entities/mower-full.png` if needed.

### Curtis

| Asset ID Prefix | States | Directions | Minimum Frames |
|-----------------|--------|------------|----------------|
| `entity.curtis` | `idle`, `walk`, `alert`, `angry` | `up`, `down`, `left`, `right` | 1 idle, 2 walk, 1 alert, 1 angry |

### Police

| Asset ID Prefix | States | Directions | Minimum Frames |
|-----------------|--------|------------|----------------|
| `entity.police` | `walk` | `up`, `down`, `left`, `right` | 2 walk |

Current repository note:

- the generated asset set currently includes `police-walk-*` frames only
- `arrive` and `arrest` are future extension states for a fuller lose-sequence presentation

## UI and FX

| Asset ID | Purpose |
|----------|---------|
| `ui.action-button` | Contextual action button base |
| `ui.dpad` | Mobile directional control |
| `ui.fullness-bar` | Mower fullness meter |
| `ui.fullness-fill` | Meter fill |
| `fx.alert.hey` | Text bubble or callout |
| `fx.alert.exclamation` | Curtis reaction marker |

## Separation of Concerns

Level design should reference:

- base symbols
- item symbols
- marker symbols

Level design should not directly reference:

- animation frame counts
- atlas coordinates
- palette choices

Asset generation should reference:

- stable asset IDs
- tile size
- state names

Asset generation should not redefine:

- gameplay semantics
- level schema
- movement or LOS rules
