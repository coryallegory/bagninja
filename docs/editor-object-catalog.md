# Bag Ninja - Level Editor Object Catalog

## Purpose

This document defines the exact authoring objects the level editor should expose.

These objects are editor-facing content tools. They should correspond directly to the level schema. If an object does not have a clear schema mapping, it should not be exposed yet.

## Layer Model

The editor should expose exactly four layers:

- `Base`
- `Items`
- `Markers`
- `Zones`

## Base Objects

These define the underlying terrain and exactly one base tile must exist in every cell.

| Editor Label | Symbol | Walkable | Mowable | Blocks LOS |
|--------------|--------|----------|---------|------------|
| Mowed Grass | `g` | yes | no | no |
| Road | `R` | yes | no | no |
| Pavement | `S` | yes | no | no |

## Item Objects

These are placed over base terrain. Only one item may occupy a cell.

| Editor Label | Symbol | Walkable | Blocks LOS | Notes |
|--------------|--------|----------|------------|-------|
| Empty | `_` | yes | no | No item on cell |
| House | `H` | no | yes | House frontage / wall |
| Fence | `F` | no | yes | Boundary or yard fence |
| Bush | `B` | no | yes | Shrub blocker |
| Tree | `T` | no | yes | Larger blocker |
| Tall Grass | `L` | yes | no | Unmowed-grass representation over mowed-grass base |

## Marker Objects

These are possible spawn/event points. Only one marker may occupy a cell.

| Editor Label | Symbol | Notes |
|--------------|--------|-------|
| Empty | `_` | No marker on cell |
| Curtis Spawn | `c` | Possible Curtis spawn point |
| Player Spawn | `p` | Possible player spawn point |
| Mower Spawn | `m` | Possible mower spawn point |
| Police Spawn | `o` | Possible police spawn point |

## Zone Objects

These define gameplay ownership and territory.

| Editor Label | Symbol | Notes |
|--------------|--------|-------|
| Empty | `_` | No special territory |
| Curtis Territory | `C` | Curtis may walk here and bags may be dropped here |

## Placement Rules

- Every cell must contain exactly one base tile.
- A cell may contain zero or one item.
- A cell may contain zero or one marker.
- A cell may contain zero or one zone mark.
- A cell may not contain both an item and a marker.

Runtime moveable items such as mower and bag are out of scope for direct cell authoring in this editor.

Current runtime note:

- the playable runtime chooses randomly among matching player, mower, Curtis, or police markers when that entity spawns
- marker cells are still static authored positions; the randomness applies only to spawn choice among authored options

## Editor Tools

The first editor version should expose these tools:

- base paint
- item paint
- marker paint
- zone paint
- erase item
- erase marker
- erase zone
- click-drag paint
- import JSON
- export JSON
- download JSON
- run validation

## Objects Explicitly Out of Scope For MVP Editor

Do not expose these yet:

- patrol route authoring
- cutscene triggers
- sound emitters
- event scripting
- entity timelines
- runtime bag-drop events

## Placeholder Visuals In Editor

| Object | Placeholder Suggestion |
|--------|------------------------|
| Mowed Grass | muted green tile |
| Road | dark gray tile |
| Pavement | pale gray tile |
| House | brown block |
| Fence | tan line block |
| Bush | rounded dark green block |
| Tree | dark green tree silhouette |
| Tall Grass | lighter green tuft |
| Curtis Spawn | dark circular marker |
| Player Spawn | blue circular marker |
| Mower Spawn | orange circular marker |
| Police Spawn | blue-red square marker |
| Curtis Territory | translucent yellow-green overlay |
