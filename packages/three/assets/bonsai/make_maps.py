"""Derive the bonsai texture set from the Codex albedos. Usage: make_maps.py <src_dir> <out_dir>"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
N = 1024

def load(name):
    return Image.open(os.path.join(src, name)).convert('RGB').resize((N, N), Image.LANCZOS)

def seam_score(a):
    a = a.astype(np.float32)
    wrap = np.abs(a[:, 0] - a[:, -1]).mean() + np.abs(a[0] - a[-1]).mean()
    inner = np.abs(a[:, 1] - a[:, 0]).mean() + np.abs(a[1] - a[0]).mean()
    return wrap / max(inner, 1e-3)

def make_seamless(img):
    """Crossfade with a half-offset copy: edges come from the copy's centre, so the wrap is continuous."""
    a = np.asarray(img).astype(np.float32)
    b = np.roll(a, (N // 2, N // 2), axis=(0, 1))
    t = np.abs(np.linspace(-1, 1, N))
    edge = np.maximum(t[:, None], t[None, :])
    w = np.clip((edge - 0.55) / 0.4, 0, 1)
    w = w * w * (3 - 2 * w)
    return Image.fromarray((a * (1 - w[..., None]) + b * w[..., None]).clip(0, 255).astype(np.uint8))

def lum(a):
    a = a.astype(np.float32) / 255
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

def normal_from(img, strength, blur):
    h = Image.fromarray((lum(np.asarray(img)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    h = np.asarray(h).astype(np.float32) / 255
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    n = np.dstack([-dx * strength, dy * strength, np.ones_like(h)])  # OpenGL (+Y up) convention
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).round().astype(np.uint8))

def gray(v):
    return Image.fromarray((np.clip(v, 0, 1) * 255).round().astype(np.uint8)).convert('RGB')

def save(img, name):
    img.save(os.path.join(out, name), 'WEBP', quality=88, method=6)

report = []
for key, file in (('bark', 'bonsai-01.png'), ('moss', 'bonsai-03.png'), ('clay', 'bonsai-04.png')):
    img = load(file)
    before = seam_score(np.asarray(img))
    img = make_seamless(img)
    report.append(f'{key}: seam ratio {before:.2f} -> {seam_score(np.asarray(img)):.2f}')
    save(img, f'{key}-albedo.webp')
    L = lum(np.asarray(img))
    if key == 'bark':
        save(normal_from(img, 9.0, 1.2), 'bark-normal.webp')
        # Crevices (dark) rougher, raised plates a little smoother.
        save(gray(0.95 - 0.25 * (L - L.min()) / (np.ptp(L) + 1e-6)), 'bark-roughness.webp')
    elif key == 'moss':
        save(normal_from(img, 6.0, 1.0), 'moss-normal.webp')
    else:
        save(gray(0.92 - 0.12 * (L - L.min()) / (np.ptp(L) + 1e-6)), 'clay-roughness.webp')

# Leaf atlas: key out the magenta, despill, bleed colour into transparent texels for clean mips.
a = np.asarray(load('bonsai-02.png')).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
magenta = np.clip((np.minimum(r, b) - g) / 255, 0, 1)
alpha = np.clip(1 - (magenta - 0.06) / 0.18, 0, 1)
# Erode the matte by a pixel so the keyed rim never survives the alpha test.
alpha = np.minimum(alpha, np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(np.float32) / 255 + 0.35)
spill = np.clip(b - g * 0.55, 0, None)
rgb = a.copy()
rgb[..., 0] -= spill; rgb[..., 2] -= spill
rgb = rgb.clip(0, 255)
premul = Image.fromarray((rgb * alpha[..., None]).astype(np.uint8))
wsum = Image.fromarray((alpha * 255).astype(np.uint8))
for radius in (2, 6, 16, 40):
    pc = np.asarray(premul.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)
    ws = np.asarray(wsum.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)[..., None] / 255
    fill = pc / np.maximum(ws, 1e-3)
    hole = (alpha < 0.5)[..., None] & (ws > 0.02)
    rgb = np.where(hole & (rgb.sum(-1, keepdims=True) >= 0), np.where(alpha[..., None] < 0.5, fill, rgb), rgb)
rgb = rgb.clip(0, 255)
atlas = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
atlas.save(os.path.join(out, 'leaf-atlas.webp'), 'WEBP', quality=90, method=6, exact=True)
# Thickness: white = thin. Bright yellow tips and frond edges are thin; dense dark interiors are thick.
L = lum(rgb.astype(np.uint8))
core = np.asarray(wsum.filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
thin = np.clip(0.25 + 0.9 * (L - 0.25) + 0.35 * (1 - core), 0, 1) * (alpha > 0.02)
save(gray(thin), 'leaf-thickness.webp')
cov = [alpha[y:y + 512, x:x + 512].mean() for y in (0, 512) for x in (0, 512)]
edge = max(alpha[:4].max(), alpha[-4:].max(), alpha[:, :4].max(), alpha[:, -4:].max(), alpha[508:516].max(), alpha[:, 508:516].max())
report.append('atlas cell coverage ' + ', '.join(f'{c:.2f}' for c in cov) + f'; max alpha on cell borders {edge:.2f}')
print('\n'.join(report))
