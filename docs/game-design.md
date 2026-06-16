# Bag Ninja - Game Design Document

## Game Concept

**Genre:** Top-down stealth/puzzle
**Theme:** Suburban lawncare mischief
**Tone:** Humorous, lighthearted
**Inspiration:** NES-era games (Zelda overworld, Paperboy neighborhood feel)

---

## Gameplay Loop

```
1. Move to lawn mower → Engage (ACTION button)
2. Mow grass tiles (mower fullness increases)
3. Mower full → Disengage → Stand next to mower → EMPTY (ACTION button)
4. Player now carries a yard waste bag
5. Navigate to Curtis' lawn → DROP (ACTION button)
6. Repeat until all grass is mowed and all bags are dropped
7. Avoid Curtis' line of sight while holding bag or on his property
```

---

## Map Layout

```
 ┌─────────────────────────────┐
 │  HOME A  │ FENCE │  HOME B  │  ← Top row (homes face street)
 │  YARD A  │       │  YARD B  │
 │  DRIVE A │       │  DRIVE B │
 ├──────────┼───────┼──────────┤
 │  HOME C  │ FENCE │  HOME D  │  ← Middle row (Curtis = C or D)
 │  YARD C  │       │  YARD D  │
 │  DRIVE C │       │  DRIVE D │
 ├──────────┼───────┼──────────┤
 │  HOME E  │ FENCE │  HOME F  │  ← Bottom row
 │  YARD E  │       │  YARD F  │
 │  DRIVE E │       │  DRIVE F │
 └─────────────────────────────┘
          ↕ STREET ↕
```

- Street runs vertically through center
- 3 homes on each side, front-facing the street
- Fences between each home block lateral movement
- Player can traverse the street freely
- Curtis' home is in the middle position (one side) — this makes his line of sight cover the street and adjacent yards

---

## Characters

### Player (Ninja)
- **States:** idle, walking (4 directions), pushing mower (4 directions), carrying bag (4 directions)
- **Sprites:** 16×16, 2-frame walk cycle per direction minimum
- **Abilities:** Move, engage/disengage mower, empty mower, drop bag

### Curtis
- **States:** indoors, emerging, patrolling yard, inspecting driveway, discovering bag (surprised), angry searching, returning indoors
- **Behavior:**
  - Emerges at random intervals (configurable: 5-15 seconds)
  - Patrols: walks to driveway end, checks for bags, walks around yard perimeter
  - On bag discovery: "!" animation, runs around yard for 3-5 seconds looking for culprit
  - Detection range: orthogonal line-of-sight (straight lines up/down/left/right, blocked by fences/homes)
  - If detects player holding bag OR player on his property: triggers police
  - After angry phase: returns indoors, timer resets

### Police
- **Appears:** From edge of screen after Curtis calls
- **Behavior:** Moves directly toward player, arrests on contact
- **Purpose:** Game over trigger (purely a lose-state animation)

---

## Mechanics Detail

### Mowing
- Each grass tile has state: `unmowed` | `mowed`
- Moving over an unmowed tile while engaged with mower → tile becomes mowed
- Each mowed tile increases fullness by a fixed percentage
- **Mower capacity:** Configurable. Suggested: 100% = 10 grass tiles (means ~6-7 bags total for full map)
- Mower cannot be engaged when at 100% fullness

### Bag Management
- Emptying mower produces exactly 1 bag, resets mower to 0%
- Player moves at same speed while carrying bag
- Bag can ONLY be dropped on Curtis' property tiles
- Dropped bags remain visible on Curtis' lawn (he can discover them)
- Player cannot pick up a dropped bag

### Line of Sight
- Calculated on grid: orthogonal rays (4 cardinal directions) from Curtis
- Blocked by: homes, fences, any solid obstacle
- NOT blocked by: other characters, bags, mowed/unmowed grass, street
- Check performed each game tick while Curtis is outdoors
- Detection triggers if: player is on Curtis' property tiles OR player is holding a bag and in Curtis' LOS

### Win Condition
- All accessible grass tiles are mowed (regardless of yard ownership)
- All generated bags have been dropped on Curtis' lawn
- Curtis has NOT detected the player

### Lose Condition
- Curtis detects player (holding bag in LOS, or trespassing on his property while he's outside)
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

## Audio (Stretch Goal)

- Mower engine hum (looping while engaged)
- Grass cutting "snip" per tile
- Bag drop thud
- Curtis "!" alert sound
- Police siren
- Win jingle
- Lose jingle

---

## Open Questions & Ambiguities

1. **Which yard does the mower start in?** Suggestion: Player's own yard (one of the non-Curtis yards, perhaps bottom-left). Or does the player not have a "home" — they're just a roaming ninja?

2. **Can the player mow Curtis' lawn?** The prompt says "all front yard accessible grass." If Curtis' lawn is accessible, the player would need to enter his property to mow it, creating tension. Suggestion: Curtis' lawn IS mowable but risky.

3. **Does Curtis detect the player on his property even without a bag?** The prompt says "on his property" triggers police. Suggestion: Only when Curtis is OUTSIDE and can see the player (not through walls from indoors).

4. **Can the player be caught while mowing (without a bag)?** Prompt implies detection is about bags/property. Suggestion: Being on Curtis' property while he's outside = lose. Holding a bag in his LOS = lose. Mowing elsewhere = safe.

5. **Fence gaps / yard entry:** How does the player enter yards if fences seal boundaries between homes? Suggestion: Fences only exist between adjacent lots. Yards are open to the street (front) and player enters from driveways/sidewalk.

6. **Multiple mowers or one?** Suggestion: One mower, starts in a specific yard. Player must return to it to re-engage after dropping a bag.

7. **Does Curtis' timer reset after each emergence?** Suggestion: Yes — after returning indoors, a new random timer starts for next emergence.

8. **NES color palette:** Should we strictly use the NES 54-color palette or a "NES-inspired" palette with slightly more flexibility? Suggestion: NES-inspired (close but not rigid) for practical pixel art creation.

9. **Screen orientation lock on mobile?** Game is portrait (9:16). Should we force portrait orientation or adapt? Suggestion: Force portrait, show "rotate device" message in landscape.

---

## Design Assumptions (Defaults Unless Overridden)

- Player does NOT have a "home" — they are a roaming ninja
- Curtis' lawn IS mowable (adds risk/reward)
- Curtis only detects when he is physically outside
- One mower, stationary when not engaged
- NES-inspired palette (not strictly limited to 54 colors)
- No scrolling — entire map visible at all times
- No multiple levels for MVP (single neighborhood layout)
