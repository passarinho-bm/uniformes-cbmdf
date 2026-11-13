"""Retoque final das fotos-base: contorno das mangas, manchas e restos de itens.
Trabalha na metade direita e espelha. Parte sempre de tools/base_orig (cópia de segurança).
Uso: python fix_bases.py <pasta do projeto>"""
import os
import shutil
import sys
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

root = sys.argv[1].rstrip('/') + '/'
BASE, ORIG = root + 'assets/base/', root + 'tools/base_orig/'
if not os.path.isdir(ORIG):
    shutil.copytree(BASE, ORIG)

PRED = {
    'navy': lambda h, s, v: (v < 110) & ~((h > 3) & (h < 45) & (s > 55)),
    'orange': lambda h, s, v: (s > 110) & (v > 150) & (h > 3) & (h < 22),
    'khaki': lambda h, s, v: (s > 40) & (v > 120) & (h > 5) & (h < 24),
}


def polys(shape, items):
    m = np.zeros(shape, np.uint8)
    for it in items:
        if len(it) == 3 and not isinstance(it[0], (tuple, list)):
            cv2.circle(m, (int(it[0]), int(it[1])), int(it[2]), 255, -1)
        else:
            cv2.fillPoly(m, [np.array(it, np.int32)], 255)
    return m > 0


def nfill(rgb, unknown, src):
    m = src.astype(np.float32)
    f = rgb.astype(np.float32)
    acc = np.zeros_like(f)
    done = np.zeros(m.shape, bool)
    for sg in (3, 7, 15, 35, 80, 160):
        num = cv2.GaussianBlur(f * m[..., None], (0, 0), sg)
        den = cv2.GaussianBlur(m, (0, 0), sg)
        ok = (den > 0.03) & (~done)
        acc[ok] = num[ok] / den[ok, None]
        done |= ok
    out = f.copy()
    out[unknown] = acc[unknown]
    return out


def fix(name, axis, fabric, add=(), cut=(), smooth=(), seed=1):
    im = np.array(Image.open(ORIG + name + '.webp').convert('RGBA'))
    rgb, a = im[..., :3].copy(), im[..., 3]
    H, W = a.shape
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    alpha0 = a > 128
    addm, cutm, smm = polys((H, W), add), polys((H, W), cut), polys((H, W), smooth)
    final = (alpha0 | addm) & ~cutm
    unknown = ((final & ~alpha0) | (smm & final))
    src = ndi.binary_erosion(alpha0, iterations=3) & ~smm & ~cutm & PRED[fabric](h, s, v)
    out = nfill(rgb, unknown, src)
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1.8, out.shape).astype(np.float32)
    out[unknown] += noise[unknown]
    lum = out.mean(axis=2)
    sd = np.sqrt(np.maximum(cv2.blur(lum * lum, (7, 7)) - cv2.blur(lum, (7, 7)) ** 2, 0))
    flat = (cv2.blur((sd < 1.3).astype(np.float32), (9, 9)) > 0.6) & final
    grain = cv2.GaussianBlur(rng.normal(0, 3.4, (H, W)).astype(np.float32), (0, 0), 0.6)
    out[flat] += grain[flat][:, None]
    rgb = np.clip(out, 0, 255).astype(np.uint8)
    # espelha a metade direita
    xs = np.arange(W)
    left = xs < axis
    srcx = np.clip(2 * axis - xs, 0, W - 1)
    rgb[:, left] = rgb[:, srcx[left]]
    final[:, left] = final[:, srcx[left]]
    final = ndi.binary_opening(final, structure=np.ones((5, 5)))
    al = ndi.gaussian_filter(ndi.binary_erosion(final, iterations=1).astype(np.float32), 0.9)
    al = (np.clip(al * 1.1, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(np.dstack([rgb, al]), 'RGBA').save(BASE + name + '.webp', quality=90, method=6)
    print(name, 'ok', int(unknown.sum()), 'px refeitos')


# ---- túnica masculina (1200x916, eixo 598)
T_SMOOTH = [(690, 245, 28), [(705, 98), (872, 132), (856, 178), (716, 152)], [(1072, 358), (1118, 358), (1118, 394), (1072, 394)]]
for n in ('tunica-m-noplat', 'tunica-m-plat', 'tunica-m-plat-prata'):
    fix(n, 598, 'navy', add=[[(1040, 335), (1048, 341), (1093, 398), (1094, 412), (1060, 412)]], cut=[[(1049, 339), (1095, 397), (1140, 397), (1140, 339)]], smooth=T_SMOOTH[:1] + T_SMOOTH[2:] if 'noplat' not in n else T_SMOOTH)

# ---- túnica feminina (1119x950, eixo 559)
F_ADD = [[(860, 115), (975, 270), (1012, 440), (1108, 845), (1100, 860), (968, 885), (870, 550), (850, 430), (820, 300)]]
F_CUT = [[(862, 110), (1119, 110), (1119, 843), (1110, 843), (1014, 438), (977, 268)],
         [(840, 478), (870, 552), (966, 886), (895, 886), (827, 552), (832, 478)]]
F_SMOOTH = [[(798, 392), (862, 392), (862, 482), (798, 482)], (690, 152, 9), (825, 145, 9), [(702, 125), (860, 118), (880, 176), (702, 170)]]
for n in ('tunica-f-noplat', 'tunica-f-plat', 'tunica-f-plat-prata'):
    fix(n, 559, 'navy', add=F_ADD, cut=F_CUT, smooth=F_SMOOTH if 'noplat' in n else F_SMOOTH[:3])

# ---- gandola (1030x800, eixo 507)
G_ADD = [[(735, 120), (950, 435), (1005, 640), (1003, 662), (860, 668), (845, 480), (745, 335)], [(726, 368), (745, 368), (745, 442), (726, 442)]]
G_CUT = [[(737, 116), (1030, 116), (1030, 638), (1008, 638), (953, 432)]]
G_SMOOTH = [[(588, 92), (737, 118), (806, 222), (722, 262), (598, 202)], (512, 270, 14), (627, 243, 12), (735, 212, 14), (507, 235, 10), (836, 310, 22), (580, 92, 18)]
for n in ('gandola-noplat', 'gandola-plat'):
    fix(n, 507, 'orange', add=G_ADD, cut=G_CUT, smooth=G_SMOOTH)

