"""
Bag Ninja — player sprites v3.
- Non-mower sprites: slim purple silhouette, red sash, cream headwrap.
- Operate-mower sprites: combined player + mower in one 16x16 image.
  DOWN: player (compressed) at top, top-down mower view at bottom.
  UP:   top-down mower at top, player back at bottom.
  RIGHT: player right-profile (left half), mower side-view (right half).
  LEFT:  horizontal flip of RIGHT.
"""
from PIL import Image
import os

OUT = r"C:\dev\bagninja\assets\entities"

# ── Player palette ────────────────────────────────────────────────────────────
T  = (  0,   0,   0,   0)  # transparent
H  = ( 22,   8,  35, 255)  # headwrap very dark purple-black
Hm = ( 50,  28,  72, 255)  # headwrap back highlight
W  = (212, 206, 192, 255)  # cloth wrapping (cream)
M  = ( 80,  58,  90, 255)  # face mask (purple-gray)
e  = (108,  84, 122, 255)  # eye slit
J  = ( 96,  40, 148, 255)  # purple main
Jl = (128,  62, 190, 255)  # purple light
Jd = ( 58,  20,  92, 255)  # purple dark/edge
R  = (198,  44,  32, 255)  # red sash
Rd = (128,  24,  16, 255)  # red dark edge
P  = ( 44,  16,  68, 255)  # leg wrap dark purple
Pd = ( 26,   8,  42, 255)  # leg shadow
S  = ( 16,   6,  24, 255)  # shoe near-black

# ── Mower palette (for combined operate sprites) ──────────────────────────────
Lm = (185, 178, 170, 255)  # handle light gray
Km = ( 28,  16,  16, 255)  # mower outline near-black
Rm = (220,  38,  26, 255)  # mower red deck
rm = (145,  18,  10, 255)  # mower dark red shadow
Gm = ( 70,  65,  62, 255)  # engine housing dark gray
Wm = ( 48,  44,  40, 255)  # wheel dark

def save(grid, name):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            px[x, y] = c
    im.save(os.path.join(OUT, name))
    print(f"  {name}")

def flip(g):
    return [list(reversed(r)) for r in g]

def twin(grid, a, b):
    save(grid, a)
    save(grid, b)

# ══════════════════════════════════════════════════════════════════════════════
# NON-MOWER SPRITES
# ══════════════════════════════════════════════════════════════════════════════

DOWN_IDLE = [
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  W,  W,  W,  W,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  M,  e,  M,  e,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Rd, R,  R,  R,  R,  Rd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Pd, P,  T,  T,  Pd, P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  S,  S,  T,  T,  S,  S,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

UP_IDLE = [
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  H,  H,  H,  H,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  Hm, Hm, Hm, Hm, H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  Pd, T,  T,  P,  Pd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  S,  S,  T,  T,  S,  S,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

LEFT_IDLE = [
  [ T,  T,  T,  T,  T,  T,  T,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  H,  W,  W,  W,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  M,  e,  W,  W,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  Rd, R,  R,  R,  R,  Rd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  P,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  P,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  P,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Pd, P,  Pd, T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  S,  S,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

# Celebrate frames
_CEL_HEAD = [
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  W,  W,  W,  W,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  M,  e,  M,  e,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
]

CEL1 = _CEL_HEAD + [
  [ T,  T,  T,  Jd, T,  T,  Jd, J,  J,  Jd, T,  T,  Jd, T,  T,  T],
  [ T,  T, Jd,  J, Jd, Jd,  J,  J,  J,  J,  Jd, Jd,  J, Jd, T,  T],
  [ T,  T,  T,  T,  T,  Rd, R,  R,  R,  R,  Rd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  P,  P,  T,  T,  T,  T,  P,  P,  T,  T,  T,  T],
  [ T,  T,  T,  T,  P,  P,  T,  T,  T,  T,  P,  P,  T,  T,  T,  T],
  [ T,  T,  T,  T,  Pd, P,  T,  T,  T,  T,  Pd, P,  T,  T,  T,  T],
  [ T,  T,  T,  T,  S,  S,  T,  T,  T,  T,  S,  S,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

CEL2 = _CEL_HEAD + [
  [ T,  T, Jd,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T, Jd,  J, Jd,  Jd, Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Rd, R,  R,  R,  R,  Rd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Pd, P,  T,  T,  Pd, P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  S,  S,  T,  T,  S,  S,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

CEL3 = [
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  W,  W,  W,  W,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  H,  M,  e,  M,  e,  H,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],
  [ T,  T,  Jd, T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  Jd, T,  T],
  [ T,  T,  J, Jd, Jd, Jd,  J,  J,  J,  J,  Jd, Jd, Jd,  J, T,  T],
  [ T,  T,  T,  T,  T,  Rd, R,  R,  R,  R,  Rd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Pd, P,  T,  T,  Pd, P,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  S,  S,  T,  T,  S,  S,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

CEL4 = _CEL_HEAD + [
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  Jd, T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, Jd, Jd,  J, Jd, T],
  [ T,  T,  T,  T,  T,  Rd, R,  R,  R,  R,  Rd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  P,  P,  T,  T,  T,  T,  P,  P,  T,  T,  T,  T],
  [ T,  T,  T,  T,  P,  P,  T,  T,  T,  T,  P,  P,  T,  T,  T,  T],
  [ T,  T,  T,  T,  Pd, P,  T,  T,  T,  T,  Pd, P,  T,  T,  T,  T],
  [ T,  T,  T,  T,  S,  S,  T,  T,  T,  T,  S,  S,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
]

# ══════════════════════════════════════════════════════════════════════════════
# COMBINED OPERATE-MOWER SPRITES
# ══════════════════════════════════════════════════════════════════════════════

# ── DOWN combined ─────────────────────────────────────────────────────────────
# Player faces viewer (south), pushes mower away (downward on screen).
# Rows 0-4:  compressed player head + shoulders
# Row 5:     Lm handle bars at cols 4 & 11, hands implied by Rd sash below
# Rows 6-7:  handle rails descending
# Row 8:     near (back) deck edge — solid Km border
# Row 9:     near wheels (Wm) inset, near red deck stripe
# Rows 10-12: mower deck body with engine housing hint
# Row 13:    far (front/blade) deck edge
# Rows 14-15: far wheels
DOWN_MOWER = [
#   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],  # 0
  [ T,  T,  T,  T,  T,  H,  W,  W,  W,  W,  H,  T,  T,  T,  T,  T],  # 1
  [ T,  T,  T,  T,  T,  H,  M,  e,  M,  e,  H,  T,  T,  T,  T,  T],  # 2
  [ T,  T,  T,  T,  T,  T,  H,  H,  H,  H,  T,  T,  T,  T,  T,  T],  # 3
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],  # 4
  [ T,  T,  T,  T,  Lm, Rd, R,  R,  R,  R,  Rd, Lm, T,  T,  T,  T],  # 5  hands on handle bars
  [ T,  T,  T,  T,  Lm, T,  T,  T,  T,  T,  T,  Lm, T,  T,  T,  T],  # 6
  [ T,  T,  T,  T,  Lm, T,  T,  T,  T,  T,  T,  Lm, T,  T,  T,  T],  # 7
  [ T,  T,  Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, T,  T],  # 8  near deck edge
  [ T,  T,  Km, Wm, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Wm, Km, T,  T],  # 9  near wheels + deck
  [ T,  T,  Km, Rm, rm, rm, rm, Gm, rm, rm, rm, rm, Rm, Km, T,  T],  # 10 engine at col 7
  [ T,  T,  Km, rm, rm, rm, rm, rm, rm, rm, rm, rm, rm, Km, T,  T],  # 11
  [ T,  T,  Km, rm, rm, rm, rm, rm, rm, rm, rm, rm, rm, Km, T,  T],  # 12
  [ T,  T,  Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, T,  T],  # 13 far deck edge
  [ T,  T,  Km, Wm, T,  T,  T,  T,  T,  T,  T,  T,  Wm, Km, T,  T],  # 14 far wheels
  [ T,  T,  T,  Km, T,  T,  T,  T,  T,  T,  T,  T,  Km, T,  T,  T],  # 15
]

# ── UP combined ───────────────────────────────────────────────────────────────
# Player faces away (north), pushes mower forward (upward on screen).
# Mower top-down at top, player back at bottom.
# Rows 0-1:  far (blade-side) wheels — furthest from player
# Row 2:     far deck edge
# Rows 3-4:  deck body with engine
# Row 5:     near (handle-side) deck stripe + wheels
# Row 6:     near deck edge
# Row 7:     handle rails meet player hands
# Rows 8-9:  back of player head
# Rows 10-15: player torso + legs (back view)
UP_MOWER = [
#   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
  [ T,  T,  T,  Km, T,  T,  T,  T,  T,  T,  T,  T,  Km, T,  T,  T],  # 0  far wheel top
  [ T,  T,  Km, Wm, T,  T,  T,  T,  T,  T,  T,  T,  Wm, Km, T,  T],  # 1  far wheels
  [ T,  T,  Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, T,  T],  # 2  far deck edge
  [ T,  T,  Km, rm, rm, rm, rm, rm, rm, rm, rm, rm, rm, Km, T,  T],  # 3
  [ T,  T,  Km, Rm, rm, rm, Gm, rm, rm, rm, rm, rm, Rm, Km, T,  T],  # 4  engine at col 6
  [ T,  T,  Km, Wm, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Wm, Km, T,  T],  # 5  near wheels + deck
  [ T,  T,  Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, Km, T,  T],  # 6  near deck edge
  [ T,  T,  T,  T,  Lm, Jd, J,  J,  J,  J,  Jd, Lm, T,  T,  T,  T],  # 7  handle meets hands
  [ T,  T,  T,  T,  T,  H,  H,  H,  H,  H,  H,  T,  T,  T,  T,  T],  # 8  headwrap back
  [ T,  T,  T,  T,  T,  H,  Hm, Hm, Hm, Hm, H,  T,  T,  T,  T,  T],  # 9  back highlight
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],  # 10 shoulders
  [ T,  T,  T,  T,  T,  Jd, J,  J,  J,  J,  Jd, T,  T,  T,  T,  T],  # 11 torso
  [ T,  T,  T,  T,  T,  T,  Jd, J,  J,  Jd, T,  T,  T,  T,  T,  T],  # 12 hips
  [ T,  T,  T,  T,  T,  P,  P,  T,  T,  P,  P,  T,  T,  T,  T,  T],  # 13 thighs
  [ T,  T,  T,  T,  T,  Pd, P,  T,  T,  Pd, P,  T,  T,  T,  T,  T],  # 14 shins
  [ T,  T,  T,  T,  T,  S,  S,  T,  T,  S,  S,  T,  T,  T,  T,  T],  # 15 shoes
]

# ── RIGHT combined ────────────────────────────────────────────────────────────
# Player right-profile occupies cols 0-5 (slim 5px head, arm reaches col 5).
# Mower side-view (facing right) in cols 6-15, vertically centred rows 5-13.
# Handle grip point at col 6, row 5-6 (meets player's hand level).
RIGHT_MOWER = [
#   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 0
  [ T,  T,  H,  H,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 1  head crown
  [ T,  H,  W,  W,  H,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 2  headwrap
  [ H,  W,  W,  e,  H,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 3  face (eye col3, right-profile)
  [ T,  T,  H,  H,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 4  chin
  [ T,  Jd, J,  J,  J,  Jd, Lm, T,  T,  T,  T,  T,  T,  T,  T,  T],  # 5  shoulder + handle grip
  [ T,  Rd, R,  R,  R,  Rd, Lm, T,  T,  T,  T,  T,  T,  T,  T,  T],  # 6  sash + handle rail
  [ T,  Jd, J,  J,  T,  T,  Lm, Gm, Gm, T,  T,  T,  T,  T,  T,  T],  # 7  torso + engine housing
  [ T,  T,  Km, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Rm, Km, T,  T],  # 8  deck top edge
  [ T,  T,  Km, Rm, rm, rm, rm, rm, rm, rm, rm, rm, rm, Km, T,  T],  # 9  deck
  [ T,  T,  Km, rm, rm, rm, rm, rm, rm, rm, rm, rm, rm, Km, T,  T],  # 10 deck underside
  [ T,  T,  T,  Km, Km, T,  T,  T,  T,  T,  Km, Km, T,  T,  T,  T],  # 11 axle stubs
  [ T,  T,  T,  Km, Wm, Km, T,  T,  T,  Km, Wm, Km, T,  T,  T,  T],  # 12 wheels
  [ T,  T,  T,  T,  Km, Km, T,  T,  T,  Km, Km, T,  T,  T,  T,  T],  # 13 wheel bottom
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 14
  [ T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],  # 15
]

LEFT_MOWER = flip(RIGHT_MOWER)

# ══════════════════════════════════════════════════════════════════════════════
# WRITE ALL FILES
# ══════════════════════════════════════════════════════════════════════════════

print("DOWN")
twin(DOWN_IDLE,  "player-idle-down-01.png",           "player-walk-down-01.png")
save(DOWN_IDLE,  "player-walk-down-02.png")
twin(DOWN_MOWER, "player-operate-mower-down-01.png",  "player-operate-mower-down-02.png")
save(DOWN_IDLE,  "player-carry-down-01.png")

print("UP")
twin(UP_IDLE,    "player-idle-up-01.png",             "player-walk-up-01.png")
save(UP_IDLE,    "player-walk-up-02.png")
twin(UP_MOWER,   "player-operate-mower-up-01.png",    "player-operate-mower-up-02.png")
save(UP_IDLE,    "player-carry-up-01.png")

print("LEFT")
twin(LEFT_IDLE,  "player-idle-left-01.png",           "player-walk-left-01.png")
save(LEFT_IDLE,  "player-walk-left-02.png")
twin(LEFT_MOWER, "player-operate-mower-left-01.png",  "player-operate-mower-left-02.png")
save(LEFT_IDLE,  "player-carry-left-01.png")

print("RIGHT (flipped)")
twin(flip(LEFT_IDLE),  "player-idle-right-01.png",          "player-walk-right-01.png")
save(flip(LEFT_IDLE),  "player-walk-right-02.png")
twin(RIGHT_MOWER,      "player-operate-mower-right-01.png", "player-operate-mower-right-02.png")
save(flip(LEFT_IDLE),  "player-carry-right-01.png")

print("CELEBRATE")
save(CEL1, "player-celebrate-01.png")
save(CEL2, "player-celebrate-02.png")
save(CEL3, "player-celebrate-03.png")
save(CEL4, "player-celebrate-04.png")

print("\nDone.")
