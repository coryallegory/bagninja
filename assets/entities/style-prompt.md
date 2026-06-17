# Bag Ninja — Sprite Style Prompt

## Workflow

Image generators cannot reliably produce 16×16 images. Instead:

1. Generate a **sprite sheet** using the style block below — each sprite cell is 64×64px (4× upscale of the 16×16 target)
2. Crop individual frames from the sheet
3. Scale each cropped frame down to 16×16 using **nearest-neighbor** resampling (not bilinear — this preserves hard pixel edges)

Because 64÷16=4 (integer ratio), the scale-down is lossless for pixel art.

---

## STYLE BLOCK

```
Style: NES/early-SNES era top-down RPG character sprite, rendered at 4× upscale.
Output as a sprite sheet. Each sprite cell is exactly 64×64 pixels.
Arrange cells in a horizontal row (or 2×2 grid for 4 frames), with a solid
1-pixel neutral border between cells to make cropping clean.

Each "pixel" in the sprite must be a solid 4×4 block of flat color — no
anti-aliasing, no gradients, no sub-pixel blending between blocks. The result
should look like a 16×16 sprite that has been scaled up 4× with nearest-neighbor.

Limited palette of 8–12 colors maximum, shared identically across all frames.
Fully transparent background within each sprite cell (checkerboard background
is acceptable in the preview; the actual pixel data should be transparent).

Perspective: slight top-down angle, character facing toward camera (facing-down
view in a 4-directional top-down game). Head occupies roughly the top 20–22px
of the 64px cell, body the middle 22px, legs the bottom 20px.

Reference aesthetic: Dragon Warrior NES overworld sprites, early Final Fantasy
character sprites, NES Zelda Link sprite — simple readable silhouette, limbs
implied by 4–8px widths (1–2 game-pixels). No outlines — form defined by color
contrast between body regions.
```

---

## CHARACTER REFERENCE — Bag Ninja player character

```
The player character is a shinobi/ninja in a dark jade-green outfit with charcoal
wrappings and a bright red cloth sash/belt at the waist. Small masked face,
dark head wrap. Slim, agile build. Facing-down view (front-on, slight top-down
camera tilt). Consistent color palette must be maintained across all frames.
```

---

## How to use

Paste STYLE BLOCK + CHARACTER REFERENCE together, then append a CONTENT BLOCK
describing what frames to generate. Example content block:

```
Content: 4-frame celebration animation sprite sheet.
The ninja has just completed a mission successfully.
Frame 1: both arms raised high above head, triumphant stance, weight centered.
Frame 2: slight jump — body shifted 4px (1 game-pixel) upward, knees bent.
Frame 3: arms raised, same as frame 1, weight shifted to opposite foot.
Frame 4: landing — body at rest height, arms dropping toward sides.

Arrange as a horizontal row of 4 cells, each 64×64px, separated by a 1px border.
All 4 frames share the same color palette. Transparent sprite background.
```

---

## After generation

- Crop each 64×64 cell individually
- Scale to 16×16 using nearest-neighbor (in Photoshop: Image Size → Resample: Nearest Neighbor; in GIMP: Scale Image → Interpolation: None)
- Save as PNG with transparency
- Name files: `player-celebrate-01.png` through `player-celebrate-04.png`
- Drop into `assets/entities/` — game picks them up automatically
