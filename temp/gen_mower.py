from PIL import Image

# Palette
T = (  0,   0,   0,   0)   # transparent
K = ( 28,  16,  16, 255)   # near-black outline
R = (220,  38,  26, 255)   # bright red body
r = (145,  18,  10, 255)   # dark red shadow (bottom of deck)
G = ( 70,  65,  62, 255)   # dark gray engine housing
g = (118, 110, 105, 255)   # medium gray bag
L = (185, 178, 170, 255)   # light gray handle
O = (198, 108,  24, 255)   # orange air filter
W = ( 48,  44,  40, 255)   # wheel dark
w = ( 95,  88,  82, 255)   # wheel highlight

# 16x16 pixel grid  (row 0 = top, col 0 = left)
# Mower faces RIGHT.  Handle/bag = back (left).  Front = right.
grid = [
#    0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
    [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T],  # 0
    [L, L, L, T, T, T, T, T, T, T, T, T, T, T, T, T],  # 1  handle grip bar
    [T, T, T, L, T, T, T, T, T, T, T, T, T, T, T, T],  # 2  handle arm diagonal
    [T, T, T, T, L, T, T, T, T, T, T, T, T, T, T, T],  # 3  handle arm diagonal
    [T, g, g, g, L, T, T, T, T, T, T, T, T, T, T, T],  # 4  bag top + handle joins frame
    [T, g, g, g, G, G, G, T, T, T, T, T, T, T, T, T],  # 5  bag + engine housing
    [T, g, g, g, G, O, G, T, T, T, T, T, T, T, T, T],  # 6  bag + engine (O=air filter)
    [K, g, K, R, R, R, R, R, R, R, R, R, R, K, T, T],  # 7  deck top; bag flush left
    [K, R, R, R, R, R, R, R, R, R, R, R, R, K, T, T],  # 8  deck body
    [K, r, r, r, r, r, r, r, r, r, r, r, r, K, T, T],  # 9  deck underside shadow
    [T, K, K, T, T, T, T, T, T, T, T, T, K, K, T, T],  # 10 axle stubs
    [T, K, w, K, T, T, T, T, T, T, T, K, w, K, T, T],  # 11 wheel (highlight row)
    [T, K, W, K, T, T, T, T, T, T, T, K, W, K, T, T],  # 12 wheel (dark row)
    [T, T, K, K, T, T, T, T, T, T, T, K, K, T, T, T],  # 13 wheel bottom
    [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T],  # 14
    [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T],  # 15
]

img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
px = img.load()
for y in range(16):
    for x in range(16):
        px[x, y] = grid[y][x]

out = r"C:\dev\bagninja\temp\mower-16x16.png"
img.save(out)
print(f"Saved {out}")
