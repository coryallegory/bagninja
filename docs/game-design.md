# Bag Ninja - Game Design Document

## Game Concept

**Genre:** Top-down stealth/puzzle
**Theme:** Suburban lawncare mischief
**Tone:** Humorous, lighthearted
**Inspiration:** NES-era games (Zelda overworld, Paperboy neighborhood feel)

---

## Gameplay Loop

```
1. Move adjacent to lawn mower → Engage (ACTION button)
   - Player and mower merge into a single combined sprite on one grid square
2. Mow grass tiles — moving onto an unmown tile transitions it to mown state and increases mower fullness
3. Mower full → Disengage → Player separates to adjacent open square → EMPTY (ACTION button)
4. Player now carries a yard waste bag
5. Navigate to Curtis' lawn → DROP (ACTION button)
6. Repeat until all accessible grass is mowed and all bags are dropped on Curtis' lawn
7. Avoid Curtis' line of sight while on his property (with or without a bag)
```

---

## Map Layout

```
 ┌─────────────────────────────────────┐
 │ HOME A │ YARD A │ STREET │ YARD B │ HOME B │  ← Top row
 │ (edge) │ DRIVE A│        │ DRIVE B│ (edge) │
 ├────────┼────────┤        ├────────┼────────┤
 │ FENCE  │        │        │        │ FENCE  │  ← Border between homes
 ├────────┼────────┤        ├────────┼────────┤
 │ HOME C │ YARD C │ STREET │ YARD D │ HOME D │  ← Middle row (Curtis = C or D)
 │ (edge) │ DRIVE C│        │ DRIVE D│ (edge) │
 ├────────┼────────┤        ├────────┼────────┤
 │ FENCE  │        │        │        │ FENCE  │  ← Border between homes
 ├────────┼────────┤        ├────────┼────────┤
 │ HOME E │ YARD E │ STREET │ YARD F │ HOME F │  ← Bottom row
 │ (edge) │ DRIVE E│        │ DRIVE F│ (edge) │
 └─────────────────────────────────────┘
```

- **Street** runs vertically through the center of the canvas, unobstructed from top to bottom
- **Homes** — only the front edge of each home is visible along the left and right edges of the canvas (top-down view)
- **Yards and driveways** fill the space between the home edges and the street
- **Fences** exist only along the borders between homes on the left and right edges of the canvas — they prevent the player from exiting the screen laterally, NOT from moving between yards
- **Yards are open** to the street and to each other; the player can move freely between yards via the street or through the open grass
- **Obstacles** (bushes, trees, garden features) are placed logically in yards and provide line-of-sight cover
- Curtis' home is in the middle position (one side) — this makes his line of sight cover the street and adjacent yards

---

## Characters

### Player (Ninja)
- **States:** idle, walking (4 directions), pushing mower (4 directions), carrying bag (4 directions)
- **Sprites:** 16×16, 2-frame walk cycle per direction minimum
- **Combined mower sprite:** When engaged with mower, player + mower are rendered as a single combined sprite occupying one grid square
- **Abilities:** Move, engage/disengage mower, empty mower, drop bag
- **Start position:** Random accessible square in a non-Curtis yard (not necessarily the same yard as the mower)

### Curtis
- **States:** indoors, emerging, patrolling yard, inspecting driveway, discovering bag (surprised), angry searching, returning indoors
- **Behavior:**
  - Emerges at random intervals (configurable: 5-15 seconds)
  - Patrols: walks to driveway end, checks for bags, walks around yard perimeter
  - On bag discovery: "!" animation, runs around yard for 3-5 seconds looking for culprit
  - **Detection (multi-stage escalation):**
    1. **Spot** — Curtis has line-of-sight to player on his property (with or without bag); Curtis stops and faces the player
    2. **Alert** — If line of sight is NOT broken within a few cycles, Curtis shouts "HEY!" (visual text/bubble)
    3. **Police** — If line of sight continues unbroken for a few more cycles after alert, Curtis calls police → game over
  - Detection range: orthogonal line-of-sight (straight lines up/down/left/right, blocked by homes/obstacles)
  - Curtis can ONLY detect the player when he is physically outside
  - After angry phase: returns indoors, timer resets

### Police
- **Appears:** From edge of screen after Curtis calls
- **Behavior:** Moves directly toward player, arrests on contact
- **Purpose:** Game over trigger (purely a lose-state animation)

---

## Mechanics Detail

### Mowing
- Each grass tile has state: `unmown` | `mown`
- Moving onto an unmown tile while engaged with mower → tile becomes mown, mower fullness increases
- Each mown tile increases fullness by a fixed percentage
- **Mower capacity:** Configurable. Suggested: 100% = 10 grass tiles (means ~6-7 bags total for full map)
- Mower cannot be engaged when at 100% fullness
- **Curtis' lawn is always pre-mown** — it is never mowable by the player
- **One mower** starts in a random non-Curtis yard (not necessarily the same yard as the player)

### Bag Management
- Emptying mower produces exactly 1 bag, resets mower to 0%
- Player moves at same speed while carrying bag
- Bag can ONLY be dropped on Curtis' property tiles
- Dropped bags remain visible on Curtis' lawn (he can discover them)
- Player cannot pick up a dropped bag

### Line of Sight
- Calculated on grid: orthogonal rays (4 cardinal directions) from Curtis
- Blocked by: homes, obstacles (bushes, trees, garden features)
- NOT blocked by: other characters, bags, mowed/unmowed grass, street, fences (fences are only at canvas edges)
- Check performed each game tick while Curtis is outdoors
- **Detection trigger:** Player is on Curtis' property tiles (with or without a bag) while Curtis is outside and has line of sight
- Detection is **multi-stage** — player has time to break LOS before police are called (see Curtis behavior above)

### Win Condition
- All accessible grass tiles are mown (excludes Curtis' lawn which is pre-mown)
- All generated bags have been dropped on Curtis' lawn
- Curtis has NOT called the police on the player

### Lose Condition
- Curtis escalates through detection stages (spot → alert → police call) without player breaking LOS
- Police arrive → arrest animation → Game Over screen

---

## UI Elements

### HUD (always visible during gameplay)
- **Mower Fullness Bar** — top of screen, only visible when player is engaged with mower
- **Action Button** — bottom-right, contextual label:
  - Near mower (not engaged): "MOW"
  - Engaged with mower (at mower, full): "EMPTY"
  - Engaged with mower (not full): "STOP"
  - Carrying bag, on Curtis' lawn: "DROP"
  - Carrying bag, not on Curtis' lawn: (grayed "DROP" or hidden)
- **D-Pad** (mobile only) — bottom-left, 4-directional

### Screens
- **Title Screen** — "BAG NINJA" title, "TAP TO START" / "PRESS ENTER"
- **Win Screen** — Victory message, lawn bags piled on Curtis' yard
- **Lose Screen** — Player in handcuffs, "BUSTED!" text, retry option

---

## Animation Specs

- **Frame rate:** 60 FPS render, animations at 8-12 FPS (every 5-8 game frames swap sprite frame) to match NES feel
- **Movement tween:** ~150ms per grid cell transition (smooth slide between cells)
- **Curtis "!" reaction:** 500ms pause with exclamation sprite above head
- **Police siren:** Flashing red/blue color cycle on police sprite

---

## Accessibility Grid & Level Definition

The map is defined as a 9×16 grid where each cell has a **terrain type** that determines movement rules, visual rendering, and gameplay behavior. This grid serves as:

1. **Collision map** — determines which squares are walkable for the player, mower, and Curtis
2. **Entity placement** — defines valid spawn positions for the player, mower, and Curtis
3. **Gameplay zones** — identifies Curtis' property tiles for detection/drop rules
4. **Level design tool** — allows designing and reviewing maps independently of game logic

### Terrain Types

| Symbol | Terrain | Walkable (Player) | Walkable (Curtis) | Notes |
|--------|---------|--------------------|--------------------|-------|
| `.` | Street | ✓ | ✗ | Curtis never leaves his yard |
| `G` | Grass (unmown) | ✓ | ✗ | Becomes `g` when mowed |
| `g` | Grass (mown) | ✓ | ✗ | Result of mowing |
| `C` | Curtis' lawn | ✓ | ✓ | Always pre-mown; bag drop zone |
| `H` | Home (wall) | ✗ | ✗ | Blocks LOS |
| `F` | Fence (edge) | ✗ | ✗ | Canvas boundary only |
| `D` | Driveway | ✓ | ✓ (Curtis' only) | Part of Curtis' property if adjacent to his home |
| `O` | Obstacle | ✗ | ✗ | Bushes/trees; blocks LOS, provides cover |
| `P` | Planting | ✗ | ✗ | Decorative, non-walkable |

### Level Definition Format

Each level is defined as a JSON object containing:
- `grid`: 16 rows of 9-character strings using the symbols above
- `curtisHome`: Which home position belongs to Curtis (e.g., `"C"` or `"D"`)
- `curtisSpawn`: Grid coordinates where Curtis emerges from his home
- `curtisDoor`: Grid coordinates of Curtis' door (he returns here)
- `mowerSpawnZones`: Array of grid regions (non-Curtis yards) for random mower placement
- `playerSpawnZones`: Array of grid regions (non-Curtis yards) for random player placement
- `curtisPropertyTiles`: Array of grid coordinates that are considered Curtis' property

This system supports designing multiple levels/neighborhoods in the future.

---

- Mower engine hum (looping while engaged)
- Grass cutting "snip" per tile
- Bag drop thud
- Curtis "!" alert sound
- Police siren
- Win jingle
- Lose jingle

---

## Resolved Design Decisions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Which yard does the mower start in? | Random non-Curtis yard. Player starts in a random non-Curtis yard (not necessarily the same). |
| 2 | Can the player mow Curtis' lawn? | **No.** Curtis' lawn is always pre-mown and never mowable. |
| 3 | Does Curtis detect the player without a bag? | **Yes.** Curtis calls police on any player on his property (with or without bag), but only when he's outside and has LOS. |
| 4 | Can the player be caught while mowing? | Only if mowing on Curtis' property (which isn't possible since it's not mowable). Being on Curtis' property at all when he's outside triggers detection. |
| 5 | Fence gaps / yard entry | Fences only exist at canvas edges between homes to prevent exiting the screen. Yards are open to each other and the street. |
| 6 | Multiple mowers or one? | One mower, starts in a random non-Curtis yard. |
| 7 | Does Curtis' timer reset? | Yes — after returning indoors, a new random timer starts. |
| 8 | NES color palette | NES-inspired (not strictly limited to 54 colors). |
| 9 | Screen orientation on mobile? | Lock portrait orientation, no rotation support. Show "rotate device" message in landscape. |

---

## Design Assumptions (Confirmed)

- Player does NOT have a "home" — they are a roaming ninja
- Curtis' lawn is **never mowable** (always pre-mown)
- Curtis only detects when he is physically outside AND has line of sight
- Detection is multi-stage with escalation (spot → "HEY!" → police) giving player time to escape
- Curtis calls police if player is on his property with OR without a bag
- One mower, stationary when not engaged, starts in random non-Curtis yard
- Player and mower combine into single sprite when engaged; separation places player on adjacent open square
- NES-inspired palette (not strictly limited to 54 colors)
- No scrolling — entire map visible at all times
- Portrait orientation locked, no rotation
- Fences exist only at canvas edges between homes (boundary prevention, not yard separation)
- No multiple levels for MVP (single neighborhood layout)
