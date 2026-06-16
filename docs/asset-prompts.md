# Bag Ninja - Prompts for External Visual Generation

These prompts are intended for use with Gemini or another image-capable tool to generate reference art, rough concepts, or layout inspiration that can later be simplified into final pixel art.

## General Guidance

- Ask for **concept sheets** or **reference layouts** first, not final production sprites.
- Emphasize **top-down 2D game readability**.
- Remind the model that the final game is **NES-inspired**, but references can be cleaner and more detailed as long as shapes remain simple.
- Keep outputs aligned with a **portrait playfield** and the **current 13x24 starter-grid default** unless you are intentionally exploring a different grid size.

## Using Third-Party Tilesets

If you use existing art packs instead of generated rough art, adapt them to the project contract in [sprite-spec.md](/abs/path/c:/dev/bagninja/docs/sprite-spec.md:1).

Working rule:

- the game should consume individual `16x16` PNG files with the filenames defined in the sprite spec
- if a source pack already includes individual `16x16` files, copy the chosen file and rename it to the project filename
- if a source pack is arranged as a tilesheet or spritesheet, crop out the exact `16x16` tile you want and save it as an individual PNG
- if you want animation, export separate frame files such as `tall-grass-01.png` and `tall-grass-02.png`

Practical recommendation:

- prefer extracting only the small set of tiles you actually need
- do not try to import a full RPG tileset structure into the runtime
- normalize every chosen asset into the project filenames early
- keep a note of the original source and license for each adopted asset

## Recommended Source Fit For Current Asset Needs

Based on the currently discussed sources:

- `Modern Exteriors` is the best fit for suburban structures and props such as `house`, `pavement`, `road`, `bush`, `tree`, and possibly `bag`, because it is top-down suburban art and the pack page says it includes `16x16` assets and single named files
- `Grass Tileset 16x16` is a good fit for `grass-mowed`
- `fantastic fence 16x16` is a good fit for `fence`

Suggested mapping plan:

| Project Asset | Best Candidate Source | Notes |
|---------------|-----------------------|-------|
| `assets/base/grass-mowed.png` | Grass Tileset 16x16 | Export one clean loopable grass tile |
| `assets/base/road.png` | Modern Exteriors | Prefer a simple asphalt tile |
| `assets/base/pavement.png` | Modern Exteriors | Prefer a plain walkway tile |
| `assets/items/house.png` | Modern Exteriors | Crop or select one readable house-front obstacle tile |
| `assets/items/fence.png` | fantastic fence 16x16 | Export one fence segment that reads well in isolation |
| `assets/items/roadblock.png` | Generated or custom-edited construction barrier | Orange-white striped single-tile blocker |
| `assets/items/bush.png` | Modern Exteriors | Prefer a compact obstacle silhouette |
| `assets/items/tree.png` | Modern Exteriors | Prefer a top-down canopy that stays readable at 16x16 |
| `assets/items/tall-grass.png` | Generated or custom-edited grass overlay | Best handled as a transparent overlay, not a full opaque tile |
| `assets/entities/mower-idle.png` | Generated or custom-edited from Modern Exteriors props | A single unattended mower world sprite is sufficient for now |
| `assets/items/bag.png` | Generated or custom-edited from Modern Exteriors props | Used as the free in-world bag sprite |

## Important Fit Notes

- `tall-grass.png` should usually be made specifically for this project, because it needs transparency and must sit over `grass-mowed.png`
- Curtis territory is now authored as a separate gameplay zone, so it does not require a distinct base tile asset
- `house.png` in this project is not a whole building system; it is a single blocking tile representation, so choose readability over realism
- `fence.png` should be chosen as a single-tile segment that still reads clearly when repeated
- `roadblock.png` should read as a construction-style portable barrier, distinct from fences at a glance
- `bag.png` is small and specific enough that generating it may be faster than extracting it

## Recommended Adoption Workflow

1. Pick the source pack per asset.
2. Export or crop a single `16x16` PNG for each required filename.
3. Save it directly under the final project path and filename from the sprite spec.
4. Keep animated variants as separate numbered frame files only where needed.
5. Track attribution and license notes in a simple asset-source list if you adopt third-party art.

## Prompt Set: Quick Asset Generation

Use these when you want directly usable rough assets rather than concept sheets.

Global instructions to prepend or append:

```text
Output each asset as an individual 16x16 PNG with transparent background unless the asset is a full ground tile.
Use top-down retro pixel art readability.
Keep silhouettes simple, high-contrast, and easy to read at 16x16.
Do not add blur, antialiasing, lighting effects, or realistic texture.
Use a limited color count and clean pixel edges.
Keep filenames exactly as requested.
```

## Prompt: Base Tile Batch

```text
Generate four individual 16x16 top-down pixel-art ground tiles for a retro suburban stealth game.

Style:
- simple NES-inspired readability
- clean pixel edges
- full-tile opaque ground art
- no transparency required unless helpful for edge detail

Create these files:
- grass-mowed.png: tidy suburban mowed grass, medium green, subtle variation
- road.png: dark asphalt road tile, readable from top-down, simple center texture only
- pavement.png: pale concrete pavement tile, simple clean walkway look

Requirements:
- 16x16 pixels each
- each tile should loop cleanly beside copies of itself
- keep the look simple enough for gameplay first, not decorative realism
```

## Prompt: Item Tile Batch

```text
Generate seven individual 16x16 top-down pixel-art item sprites for a retro suburban stealth game.

Style:
- NES-inspired
- transparent background
- centered, readable silhouettes
- strong contrast between blocking objects and walkable objects

Create these files:
- house.png: top-down house-front obstacle tile, brown suburban roof or structure mass, clearly blocking
- fence.png: short suburban fence segment seen from top-down, tan or light wood, clearly blocking
- roadblock.png: orange-and-white portable road barrier, construction style, clearly blocking, distinct from fence
- bush.png: rounded shrub obstacle, dark green, compact silhouette
- tree.png: small top-down tree canopy with tiny trunk hint, clearly blocking
- tall-grass.png: taller unmowed grass tufts, lighter and livelier than mowed grass, transparent around blades

Requirements:
- 16x16 pixels each
- transparent background
- do not fill the whole square unless the object truly occupies it visually
- tall-grass.png must layer cleanly over grass-mowed.png
```

## Prompt: Marker Batch

```text
Generate four individual 16x16 top-down debug-style marker sprites for a retro suburban stealth game editor.

Style:
- simple, symbolic, readable
- transparent background
- meant for editor/debug use, not final world art

Create these files:
- curtis-spawn.png: dark marker for Curtis spawn
- player-spawn.png: blue marker for player spawn
- mower-spawn.png: orange marker for mower spawn
- police-spawn.png: police marker using blue/red logic

Requirements:
- 16x16 pixels each
- transparent background
- very simple shapes such as circles, dots, badges, or squares
- should remain readable over grass, road, or pavement
```

## Prompt: Player Batch

```text
Generate individual 16x16 top-down pixel-art player sprites for a humorous retro suburban stealth game.

Character:
- lawncare ninja player
- playful but readable
- strong silhouette

Style:
- NES-inspired
- transparent background
- top-down view
- limited color count

Create these files:
- player-idle-up-01.png
- player-idle-down-01.png
- player-idle-left-01.png
- player-idle-right-01.png
- player-walk-up-01.png
- player-walk-up-02.png
- player-walk-down-01.png
- player-walk-down-02.png
- player-walk-left-01.png
- player-walk-left-02.png
- player-walk-right-01.png
- player-walk-right-02.png
- player-carry-up-01.png
- player-carry-down-01.png
- player-carry-left-01.png
- player-carry-right-01.png
- player-operate-mower-up-01.png
- player-operate-mower-up-02.png
- player-operate-mower-down-01.png
- player-operate-mower-down-02.png
- player-operate-mower-left-01.png
- player-operate-mower-left-02.png
- player-operate-mower-right-01.png
- player-operate-mower-right-02.png

Requirements:
- keep the player readable at 16x16 first
- walking and mower-operation frames should be subtle 2-frame loops
- carrying frames should show a bag held or implied
```

## Prompt: Mower Batch

```text
Generate individual 16x16 top-down pixel-art mower sprites for a retro suburban stealth game.

Style:
- transparent background
- readable top-down push mower silhouette
- red or bold body color for easy readability

Create these files:
- mower-idle.png
- optional future: mower-full.png

Requirements:
- 16x16 pixels each
- limited colors
- only one unattended mower world sprite is required for the current model
- full-state version should visibly imply collected clippings or fuller bag/container
```

## Prompt: Runtime Moveable Item Batch

```text
Generate small 16x16 top-down pixel-art runtime moveable item sprites for a retro suburban stealth game.

Style:
- transparent background
- very readable at 16x16
- simple NES-inspired silhouettes

Create these files:
- mower-idle.png: unattended push mower sitting in the world
- bag.png: unattended yard waste bag sitting in the world

Requirements:
- 16x16 pixels each
- these are free world-state objects, not attached-to-player sprites
- mower should read immediately as a mower without needing directional variants
- bag should read immediately as a lawn bag and not a crate or sack
```

## Prompt: Curtis and Police Batch

```text
Generate individual 16x16 top-down pixel-art NPC sprites for a humorous retro suburban stealth game.

Need two characters:
- Curtis, a grumpy homeowner
- Police officer for lose-state presentation

Style:
- transparent background
- NES-inspired readability
- simple, distinct silhouettes

Create these files:

Curtis:
- curtis-idle-up-01.png
- curtis-idle-down-01.png
- curtis-idle-left-01.png
- curtis-idle-right-01.png
- curtis-walk-up-01.png
- curtis-walk-up-02.png
- curtis-walk-down-01.png
- curtis-walk-down-02.png
- curtis-walk-left-01.png
- curtis-walk-left-02.png
- curtis-walk-right-01.png
- curtis-walk-right-02.png
- curtis-alert-up-01.png
- curtis-alert-down-01.png
- curtis-alert-left-01.png
- curtis-alert-right-01.png
- curtis-angry-up-01.png
- curtis-angry-down-01.png
- curtis-angry-left-01.png
- curtis-angry-right-01.png

Police:
- police-walk-up-01.png
- police-walk-up-02.png
- police-walk-down-01.png
- police-walk-down-02.png
- police-walk-left-01.png
- police-walk-left-02.png
- police-walk-right-01.png
- police-walk-right-02.png

Requirements:
- Curtis should read as irritated suburban homeowner
- police should read instantly as police without requiring realism
- keep all poses clear at 16x16
```

## Prompt: Optional Animated Item Batch

Use this only if you want slight environmental motion.

```text
Generate simple 2-frame animated versions of selected 16x16 top-down pixel-art item sprites for a retro suburban stealth game.

Style:
- transparent background
- subtle looping motion only
- maintain the same silhouette and color identity across frames

Create these files:
- tall-grass-01.png
- tall-grass-02.png
- bush-01.png
- bush-02.png
- tree-01.png
- tree-02.png

Animation intent:
- tall grass: gentle sway
- bush: very slight rustle
- tree: subtle canopy shift

Requirements:
- motion must be minimal and readable
- frames should loop cleanly
- objects must remain recognizable on every frame
```

## Prompt: UI and FX Batch

```text
Generate simple retro UI and feedback assets for a top-down suburban stealth game.

Style:
- clean pixel-art UI
- transparent background where appropriate
- readable at small scale

Create:
- action-button.png: simple contextual action button art
- dpad.png: compact retro directional pad graphic
- fullness-bar.png: empty mower fullness meter frame
- fullness-fill.png: fill graphic for the meter
- hey.png: small Curtis reaction text bubble or callout
- exclamation.png: sharp alert icon

Requirements:
- keep everything simple and gameplay-first
- avoid decorative clutter
- should fit visually with NES-inspired sprites
```

## Prompt: Neighborhood Layout Concepts

```text
Create a top-down suburban neighborhood layout concept for a small retro stealth-puzzle game.

Requirements:
- Portrait composition intended for a 9:16 game screen
- A single static screen with a vertical street running through the center
- Three front yards and partial house fronts on each side of the street
- One house in the middle row on one side belongs to Curtis
- Yards should be modest, readable, and slightly different from each other
- Include pavement strips, mowed lawn, taller lawn patches, shrubs, small trees, and simple garden features
- The layout should feel suitable for a tile-based grid game with clear walkable routes
- The whole scene should be easy to simplify into the current default gameplay tile map, roughly `13x24` unless the level size is being intentionally changed
- Tone should be lighthearted suburban mischief, not realistic or gritty

Please provide:
- 3 distinct layout variations
- clean top-down reference art
- clear property boundaries and obstacle placement
- strong readability for stealth line-of-sight gameplay
```

## Prompt: Tile and Obstacle Concepts

```text
Create a top-down retro game environment concept sheet for a suburban lawn stealth game.

Need visual references for:
- mown grass
- taller lawn / unmowed-lawn overlay
- Curtis territory overlay
- street
- pavement
- front house edge
- fence boundary pieces
- shrubs
- small tree
- decorative planting bed

Style goals:
- NES-inspired shapes and readability
- simple silhouettes
- high contrast between walkable and blocking terrain
- suburban and slightly comedic tone
- designed so the assets could later be redrawn as 16x16 sprites or tiles

Output as a clean concept sheet on a neutral background.
```

## Prompt: Character Reference Concepts

```text
Create a character concept sheet for a top-down pixel-art style suburban stealth game.

Characters:
- lawncare ninja player character
- push lawn mower
- Curtis, a grumpy suburban homeowner
- police officer for a brief lose-state sequence
- yard waste bag

Requirements:
- top-down game readability first
- humorous tone
- silhouettes simple enough to be reduced into 16x16 sprites
- show facing directions where useful
- NES-inspired color and shape logic
- avoid realistic detail

Please present the concepts as a top-down reference sheet, not final polished illustration.
```

## Prompt: Placeholder Sprite Sheet Planning

```text
Help plan a placeholder sprite sheet for a top-down retro browser game called Bag Ninja.

I do not need final art yet. I need a simple production planning sheet showing:
- player states: idle, walk, carrying bag, operating mower
- Curtis states: idle, patrol, alert
- police state: chase movement
- mower free-world state: idle
- bag free-world state
- simple UI icons for action and alert

Constraints:
- final implementation will use 16x16 sprites
- top-down perspective
- minimal frames
- readable with placeholder colors

Please organize the sheet for easy conversion into a practical game sprite atlas.
```

## Prompt: Pixel-Art Production Prompt

Use this only after gameplay is locked.

```text
Create final-production reference art for a top-down browser game called Bag Ninja.

Style:
- NES-inspired pixel art
- playful suburban stealth tone
- strong readability at 16x16 sprite scale
- limited-color discipline
- clear silhouettes

Need:
- player sprites for idle, walking in 4 directions, carrying bag, operating mower
- Curtis sprites for idle, patrol, alert/angry
- police sprite for lose-state chase
- push mower sprites
- yard waste bag sprite
- tiles for street, pavement, house fronts, mown grass, taller lawn overlay, Curtis lawn, shrubs, tree, planting beds, fences

Important:
- design for a 9:16 portrait game
- everything must read clearly in top-down view
- avoid unnecessary texture noise
- keep proportions and colors consistent across the full set
```

## Prompt: Manual Level Sketch Conversion

This prompt is useful when you want help converting an idea into a grid-friendly plan.

```text
Convert this top-down suburban yard game idea into a grid-friendly level sketch for the current starter grid, approximately 13x24 unless otherwise specified.

Game constraints:
- portrait playfield with the current default gameplay grid, approximately 13x24 unless intentionally changed
- vertical street through center
- three homes per side
- open front yards
- Curtis property in the middle row on one side
- obstacles should create line-of-sight breaks without blocking the level too much
- the level must support mowing routes, bag carrying routes, and a stealth risk near Curtis property

Please output:
- a simple annotated top-down sketch
- a suggested tile map breakdown
- recommended obstacle positions
- a note about likely player route and Curtis sightline pressure
```
