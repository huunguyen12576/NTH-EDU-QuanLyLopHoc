"""Procedural textures (no external assets): lacquer ground, gold-leaf panel, film grain."""
import numpy as np, os
from PIL import Image
from scipy.ndimage import gaussian_filter
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "tex")
rng = np.random.default_rng(11)

def fbm(h, w, octaves=5, base=64):
    acc = np.zeros((h, w)); amp = 1.0; tot = 0
    for o in range(octaves):
        s = base / (2 ** o)
        n = gaussian_filter(rng.standard_normal((h, w)), s)
        n /= n.std() + 1e-9
        acc += amp * n; tot += amp; amp *= 0.55
    return acc / tot

H, W = 1920, 1080
# lacquer: deep warm black with slow polished swirls + faint horizontal sanding marks
n = fbm(H // 2, W // 2, 5, 90)
sand = gaussian_filter(rng.standard_normal((H // 2, W // 2)), (0.4, 22))
v = 0.5 + 0.18 * n + 0.05 * sand / (sand.std() + 1e-9)
v = np.clip(v, 0, 1)
base = np.array([10, 9, 8]); hi = np.array([30, 23, 17])
img = (base[None, None] + (hi - base)[None, None] * v[..., None]).astype(np.uint8)
Image.fromarray(img).resize((W, H), Image.BICUBIC).save(os.path.join(OUT, "lacquer.png"))

# gold leaf: square leaves with slightly different tones, seams, and soft wear
h, w = 1000, 800
g = np.zeros((h, w))
leaf = 110
for y in range(0, h, leaf):
    for x in range(0, w, leaf):
        ox, oy = rng.integers(-6, 6, 2)
        g[max(0, y + oy):y + leaf + oy, max(0, x + ox):x + leaf + ox] = rng.normal(0, 0.06)
g += 0.10 * fbm(h, w, 4, 40) + 0.03 * fbm(h, w, 2, 3)
seam = np.zeros((h, w))
for y in range(0, h, leaf): seam[y:y + 2, :] = 1
for x in range(0, w, leaf): seam[:, x:x + 2] = 1
seam = gaussian_filter(seam, 1.0) * (0.5 + 0.5 * (fbm(h, w, 2, 30) > 0))
c0 = np.array([196, 150, 72]); c1 = np.array([238, 205, 130])
t = np.clip(0.55 + g, 0, 1)[..., None]
img = c0 + (c1 - c0) * t - 40 * seam[..., None]
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT, "goldleaf.png"))

# film grain frames (mid-grey, used with overlay blend)
for k in range(6):
    gr = rng.standard_normal((960, 540))
    gr = gaussian_filter(gr, 0.6)
    gr = 128 + 34 * gr / gr.std()
    Image.fromarray(np.clip(gr, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f"grain{k}.png"))
print("ok")
