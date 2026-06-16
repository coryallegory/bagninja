# Bag Ninja - Level Format and Validation

## Purpose

This document defines the manual level format for Bag Ninja and the validation rules the game and editor should enforce.

Related content contracts:

- [level-authoring-guidelines.md](/abs/path/c:/dev/bagninja/docs/level-authoring-guidelines.md:1)
- [editor-object-catalog.md](/abs/path/c:/dev/bagninja/docs/editor-object-catalog.md:1)
- [sprite-spec.md](/abs/path/c:/dev/bagninja/docs/sprite-spec.md:1)

## Grid Model

- The schema supports arbitrary rectangular grid dimensions.
- The `base` layer is authoritative for width and height.
- Each row in a given layer must match the width defined by `base`.
- Exported authored levels should include explicit `base`, `items`, `markers`, and `zones` arrays.
- The editor normalizes imported layer dimensions to the `base` size, but the shared gameplay core expects all four layers to be present.
- Authoring uses exactly four layers:
  - `base`
  - `items`
  - `markers`
  - `zones`

The current starter content and editor default use a `13 x 24` grid, but the runtime sizes the canvas from the loaded level dimensions and the schema itself is not locked to `13 x 24`.

## Layer Model

### Base

The base layer defines the underlying ground for every cell.

Each cell must contain exactly one base symbol.

This layer is responsible for:

- mowing eligibility
- road and pavement layout
- general yard composition

### Items

The items layer defines a placed object occupying the cell above the base layer.

- Use `_` for empty
- At most one item may occupy a cell
- Items sit over base terrain

This layer is responsible for:

- blockers such as trees, bushes, houses, and fences
- walkable authored overlays such as tall grass
- visual authored objects that are not terrain

### Markers

The markers layer defines spawn and event points.

- Use `_` for empty
- At most one marker may occupy a cell
- A cell may not contain both an item and a marker

Markers are used as spawn and event points.

Current runtime note:

- if multiple markers of the same type exist, the playable runtime chooses randomly among them when that entity spawns
- marker placement remains fixed in authored content; only spawn selection among matching markers is randomized

### Zones

The zones layer defines gameplay territory and ownership.

- Use `_` for empty
- At most one zone symbol may occupy a cell
- Zones do not conflict with items or markers

This layer is responsible for:

- Curtis property identification
- bag drop legality
- Curtis patrol and detection territory

## Recommended JSON Shape

```json
{
  "id": "neighborhood-01",
  "name": "Starter Neighborhood",
  "base": [
    "gggggRRRggggg",
    "gggggRRRggggg",
    "gggggRRRggggg",
    "gggggRRRggggg",
    "gggggRRRggggg",
    "gSSSSRRRggggg",
    "gSSSSRRRSSSgg",
    "gggggRRRSSSgg",
    "gggggRRRggggg",
    "gggggRRRggggg",
    "ggSSSRRRggggg",
    "ggSSSRRRggggg",
    "gggggRRRggggg",
    "gggggRRRSSSSg",
    "gggggRRRSSSSg",
    "gggggRRRggggg",
    "gggggRRRggggg",
    "ggSSSRRRggggg",
    "ggSSSRRRggggg",
    "gggggRRRggggg",
    "gggggRRRSSSgg",
    "gggggRRRSSSgg",
    "gggggRRRggggg",
    "gggggRRRggggg"
  ],
  "items": [
    "FFFFF___FFFFF",
    "FLLLL___LLLLF",
    "HLLLL___LTLLF",
    "HLLTL___LLLLH",
    "HLLLL___LLTLH",
    "H_______LLLLH",
    "H__________HH",
    "FLTLL______HH",
    "FLLLL___LLLLF",
    "HHLLL___LBLTF",
    "HH_______B__H",
    "HH______T___H",
    "HLLLL_______H",
    "HLLTL_______H",
    "FLLLL_______H",
    "FLBBL_______F",
    "HHBBL___LBBLF",
    "HH______LLLLH",
    "HH______LLTLH",
    "HLLLL___LLLHH",
    "HLLLL______HH",
    "FLLTL______HH",
    "FLLLL___LLLLF",
    "FFFFF___FFFFF"
  ],
  "markers": [
    "_____________",
    "_____________",
    "_____________",
    "_______p_____",
    "_____________",
    "__m__________",
    "__________m__",
    "_____p_______",
    "_____________",
    "_____________",
    "_____________",
    "__m__________",
    "_____________",
    "___________c_",
    "_____________",
    "_______p_____",
    "_____________",
    "__m__________",
    "__o__________",
    "_____________",
    "_____p_______",
    "__________m__",
    "_____________",
    "_____________"
  ],
  "zones": [
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "____________C",
    "________CCCCC",
    "________CCCCC",
    "________CCCCC",
    "____________C",
    "____________C",
    "________CCCCC",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________",
    "_____________"
  ]
}
```

The example above is illustrative. Final authored data should be adjusted to the actual neighborhood layout you want.

A concrete starter artifact is included at [neighborhood-01.json](/abs/path/c:/dev/bagninja/docs/neighborhood-01.json:1).

## Base Symbols

| Symbol | Meaning | Walkable | Mowable | Blocks LOS |
|--------|---------|----------|---------|------------|
| `g` | Mowed grass | yes | no | no |
| `R` | Road | yes | no | no |
| `S` | Pavement | yes | no | no |

## Item Symbols

| Symbol | Meaning | Walkable | Blocks LOS | Notes |
|--------|---------|----------|------------|-------|
| `_` | Empty | yes | no | No item on cell |
| `H` | House | no | yes | House frontage / wall object |
| `F` | Fence | no | yes | Physical boundary blocker |
| `B` | Bush | no | yes | Shrub-style blocker |
| `T` | Tree | no | yes | Larger yard blocker |
| `L` | Tall grass | yes | no | Represents unmowed grass when placed over mowed-grass base |
## Marker Symbols

| Symbol | Meaning | Notes |
|--------|---------|-------|
| `_` | Empty | No marker on cell |
| `c` | Curtis spawn | Possible Curtis spawn point |
| `p` | Player spawn | Possible player spawn point |
| `m` | Mower spawn | Possible mower spawn point |
| `o` | Police spawn | Possible police spawn point |

## Zone Symbols

| Symbol | Meaning | Notes |
|--------|---------|-------|
| `_` | Empty | No special gameplay territory |
| `C` | Curtis territory | Curtis may exist here and bags may be dropped here |

## Expression Rules

- Every cell has exactly one base symbol.
- Every cell has zero or one item.
- Every cell has zero or one marker.
- Every cell has zero or one zone symbol.
- A cell may not contain both a non-empty item and a non-empty marker.
- Curtis property is expressed explicitly through the `zones` layer.
- The editor and engine should treat base, items, markers, and zones as separate concerns.

## Runtime Moveable Items

The authored level schema does not place runtime `moveable items` directly.

Runtime moveable items are:

- mower
- bag

Rules:

- mower is marker-driven through `m` spawn markers
- bags are generated at runtime by the mower-emptying loop
- moveable items are not stored in the authored `items` layer
- legacy bag symbols in older experimental files may still be imported and converted into runtime bags during load, but they are not part of the current authoring contract

## Validation Rules

### Currently Enforced Structural Validation

The current runtime and editor validation enforce these checks:

1. `base` contains at least one row and at least one column.
2. Every row in `base` has the same width.
3. `items`, `markers`, and `zones` normalize cleanly to the `base` dimensions.
4. All symbols in each authored layer are valid for that layer.
5. No cell contains both a non-empty item and a non-empty marker.
6. At least one player spawn marker exists.
7. At least one mower spawn marker exists.
8. At least one Curtis spawn marker exists.
9. All spawn markers are on walkable cells with no item overlap.
10. Curtis spawn markers exist inside Curtis territory.

### Planned Semantic Validation

These checks are part of the design intent, but they are not fully implemented in the current validator:

1. All mowable grass tiles are reachable.
2. There is at least one valid route from mowing areas to Curtis property.
3. Curtis has a valid patrol area on Curtis property.

## Runtime Rules That Affect Authoring

- Tall grass is walkable and does not block LOS.
- Trees, bushes, fences, and houses block both movement and LOS.
- Unmowed grass is represented by a `Tall grass` item placed over a `Mowed grass` base tile.
- Mower placement is marker-driven, not item-authored.
- Mower and bag share a runtime `moveable item` interaction model.
- The player stands on the mower tile and uses the action button to start or stop it.
- The player stands on the mower tile and uses the action button to empty it when full.
- The player stands on the bag tile and uses the action button to pick it up.
- The player drops a carried bag only while standing on Curtis-territory zone tiles.
- Free moveable items do not stack with each other on the same tile.
- When a full mower is emptied, the new bag is placed on the nearest valid free tile rather than stacking onto another moveable item.
- The current playable runtime also sizes the canvas from the loaded level dimensions rather than hardcoding one canvas resolution.

## Content Workflow

For MVP:

1. Paint the full base layer.
2. Place items on top of that base.
3. Paint Curtis territory in the zones layer.
4. Place markers.
5. Run validation.
6. Export JSON.
