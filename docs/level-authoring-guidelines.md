# Bag Ninja - Level Authoring Guidelines

## Purpose

This document defines the content constraints for authoring levels independently of the runtime implementation.

It is meant for:

- manual level design
- AI-assisted layout generation
- browser-based level editor implementation
- validation tooling

## Stable Authoring Constraints

- Tile size is exactly `16 x 16`.
- The current starter level and editor default use a `13 x 24` grid.
- The runtime canvas scales from loaded level dimensions and the schema itself supports other rectangular sizes.
- Level authors work in gameplay tiles, not display-scaled pixels.
- Levels should remain single-screen and portrait-oriented.

## Authoring Model

Levels are authored with exactly four layers:

- `Base`
- `Items`
- `Markers`
- `Zones`

### Base

Use the base layer for underlying terrain:

- mowed grass
- road
- pavement

Every cell must have exactly one base tile.

### Items

Use the items layer for placed objects:

- house
- fence
- tree
- bush
- tall grass

Rules:

- at most one item per cell
- items sit on top of the base layer
- an item cell may not also contain a marker

### Markers

Use the markers layer for possible runtime spawn points:

- Curtis spawn
- player spawn
- mower spawn
- police spawn

Rules:

- at most one marker per cell
- marker cells may not also contain an item
- if multiple markers of the same type exist, the playable runtime chooses randomly among them at spawn time
- use multiple markers only when you intentionally want alternate spawn possibilities

### Zones

Use the zones layer for gameplay territory markup:

- Curtis territory

Rules:

- at most one zone symbol per cell
- zones do not block item or marker placement
- zones define ownership and rule behavior, not visuals

## Runtime Entity Boundary

These are runtime entities, not normal static authored items:

- player
- Curtis
- police

They should be represented through markers or runtime state, not as regular placed content objects.

## Neighborhood Composition Constraints

Each level should express:

- one vertical road band through the center
- three home/front-yard zones on the left
- three home/front-yard zones on the right
- Curtis' home in the middle row on one side
- open front-yard flow between properties and road
- strong single-screen readability

## Yard Size Targets

These are target guidelines, not hard validation rules:

- a normal mowable yard should usually contain `20-30` mowable grass cells
- total non-Curtis mowable grass should usually fall around `120-160` cells
- Curtis property should support patrol pressure without dominating the whole map

## Movement and LOS Constraints

### Blocking Items

These block movement and LOS:

- house
- fence
- tree
- bush

### Non-Blocking Items

These do not block LOS:

- tall grass

Walkability:

- tall grass is walkable

## Moveable Item Constraints

Runtime moveable items are not authored as normal `Items`.

The current moveable items are:

- mower
- bag

Rules:

- mower is represented by mower spawn markers rather than a static authored item
- bags are generated at runtime and are not placed in the authored items layer
- the player may stand on the same tile as one free moveable item
- free moveable items may not stack with each other on the same tile
- while attached to the player, a moveable item is hidden in the world and follows runtime occupancy rules

## Curtis Property Constraints

- Curtis is confined to Curtis property only.
- Curtis property should be expressed explicitly through the `Zones` layer.
- Curtis territory may include both grass and pavement cells.
- Curtis bag discovery is flavor only and does not need extra authored markup.

## Mowing Constraints

- Only cells represented by `mowed grass` base plus `tall grass` item are mowable.
- Curtis territory is not mowable objective space.
- Road, pavement, and blocking items are not mowable.
- Authors should avoid tiny one-tile mowable scraps unless intentional.

## Bag Constraints

- Bags are walkable runtime props.
- Bags do not block LOS.
- Level design should not rely on bags to shape routes.

## Validation Categories

The validator should report issues grouped by:

- shape errors
- invalid symbols
- invalid item/marker overlap
- invalid spawn placement
- unreachable mowable terrain
- broken route to Curtis property
- disconnected Curtis patrol area

## Recommended Authoring Workflow

1. Block out the road, pavement, and mowed-grass bases.
2. Add houses and fences.
3. Add bushes, trees, and tall grass.
4. Paint Curtis territory in the zones layer.
5. Add markers.
6. Run validation.
7. Iterate on mowing density and sightline pressure.
