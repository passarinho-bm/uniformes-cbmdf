"""Sprites adicionais (cursos de carreira, palas lisas, manicaca, passadeira lisa) e figuras de referência.
Uso: python make_sprites2.py <img> <img2> <assets> <contato.png>   (grava PNG em assets/sprites; rode to_webp.py depois)"""
import sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi
import seg

IMG, IMG2, ASSETS, CONTACT = [a.rstrip('/') + '/' for a in sys.argv[1:4]] + [sys.argv[4]]
OUT = ASSETS + 'sprites/'
made = []


def hsv(a):
    h = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2HSV)
    return h[..., 0].astype(int), h[..., 1].astype(int), h[..., 2].astype(int)


def largest(mask, close=2, fill=True):
    m = ndi.binary_closing(mask, iterations=close) if close else mask
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1))
    m = lab == (1 + int(np.argmax(sizes)))
    return ndi.binary_fill_holes(m) if fill else m


def sub(mask, box):
    m = np.zeros_like(mask)
    x0, y0, x1, y1 = box
    m[y0:y1, x0:x1] = mask[y0:y1, x0:x1]
    return m


def save(name, a, mask, max_w=None, erode=1):
    ys, xs = np.where(mask)
    im = seg.cut(a, mask, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), max_w=max_w, erode=erode)
    im.save(OUT + name + '.png', optimize=True)
    made.append((name, im))


# ---- distintivos de cursos de carreira (p.158)
a = seg.load(IMG2 + 'p158_0.png')
h, s, v = hsv(a)
ink = (s > 45) | (v < 150)
ink[:42, :] = False
txt = (v < 110) & (s < 60)  # legendas pretas
big = ndi.binary_opening(ink, iterations=4)
big = ndi.binary_dilation(big, iterations=6) & ink
lab, comps = seg.components(big, 4000, close=2)
print('cursos', [c[:4] for c in comps])
CUR = sys.argv[5:] and None
names_by_pos = {}
for c in comps:
    cx, cy = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2
    col = 0 if cx < 400 else 1 if cx < 670 else 2 if cx < 930 else 3
    names_by_pos.setdefault(col, []).append((cy, cx, c))
order = {0: ['cfo', 'cho', 'cho2', 'cfp'], 1: ['cao', 'cao-adm', 'cap'], 2: ['caeo', 'caep'], 3: ['cpo']}
for col, lst in names_by_pos.items():
    lst.sort(key=lambda t: (round(t[0] / 60), t[1]))
    for nm, (cy, cx, c) in zip(order[col], lst):
        m = lab == c[5]
        if col != 2:
            m = ndi.binary_fill_holes(ndi.binary_closing(np.pad(m, 12), iterations=10)[12:-12, 12:-12])
        else:
            m = m & seg.fg_mask(a, white=240, holes=False)
        if nm == 'cfp':
            yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
            m = (xx - (c[0] + c[2]) / 2) ** 2 + (yy - (c[3] - 86)) ** 2 <= 87 ** 2
        save('curso-' + nm, a, m, max_w=150)

# ---- palas lisas
a = seg.load(IMG + 'p089_1.png')
save('pala-preta-lisa', a, largest(sub(seg.fg_mask(a), (759, 182, 1109, 364)), close=2), max_w=220)
a = seg.load(IMG + 'p087_1.png')
h, s, v = hsv(a)
m = largest(sub((s > 120) & (v > 120), (752, 160, 1128, 420)), close=3)
tag = ndi.binary_dilation(ndi.binary_erosion(m, iterations=8) & ((s < 150) | (v < 120)), iterations=4)
b = cv2.inpaint(a.astype(np.uint8), tag.astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)
save('pala-laranja-lisa', b.astype(np.int16), m, max_w=220)
a = seg.load(IMG + 'p088_1.png')
h, s, v = hsv(a)
b = a.copy()
m = largest(sub((s > 120) & (v > 90), (775, 187, 1133, 432)), close=3)
tag = ndi.binary_dilation(ndi.binary_erosion(m, iterations=8) & ((s < 150) | (v > 215)), iterations=5)
b = cv2.inpaint(a.astype(np.uint8), tag.astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA).astype(np.int16)
save('pala-vermelho-lisa', b, m, max_w=220)

# ---- manicaca em branco (texto removido)
a = seg.load(IMG2 + 'p161_1.png')
dark = a.max(axis=2) < 150
dark[:, :270] = False
dark[:, 1090:] = False
dark[:215, :] = False
dark[560:, :] = False
m = largest(dark, close=3)
h, s, v = hsv(a)
inner = ndi.binary_erosion(m, iterations=16)
b = a.copy()
inner = ndi.binary_erosion(m, iterations=13)
med = np.median(a[inner & (v < 58)], axis=0)
rng = np.random.default_rng(2)
b[inner] = med + rng.normal(0, 1.5, (int(inner.sum()), 3))
b = cv2.GaussianBlur(np.clip(b, 0, 255).astype(np.uint8), (0, 0), 0.8).astype(np.int16)
save('manicaca', b, m, max_w=300)

# ---- passadeira/luva lisa (laranja) a partir da luva de aspirante
im = np.array(Image.open(OUT + 'luva-asp.png').convert('RGBA')) if __import__('os').path.exists(OUT + 'luva-asp.png') else np.array(Image.open(OUT + 'luva-asp.webp').convert('RGBA'))
rgb = im[..., :3].astype(np.int16)
hh, ss, vv = hsv(rgb)
star = (hh > 18) & (im[..., 3] > 0)
star = ndi.binary_dilation(star, iterations=4)
star = ndi.binary_dilation(star, iterations=3)
out = cv2.inpaint(rgb.astype(np.uint8), star.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)
pil = Image.fromarray(np.dstack([out.astype(np.uint8), im[..., 3]]), 'RGBA')
pil.save(OUT + 'luva-lisa.png', optimize=True)
made.append(('luva-lisa', pil))

# ---- figuras de referência (como no regulamento)
for src, name, w in ((IMG2 + 'p151_0.png', 'fig-lapela.jpg', 1200), (IMG2 + 'p117_0.png', 'fig-meia.jpg', 1100),
                     (IMG2 + 'p047_4.png', 'fig-gola.jpg', 1100), (IMG2 + 'p160_0.png', 'fig-breves-3a.jpg', 1200),
                     (IMG + 'p091_1.png', 'fig-bibico.jpg', 1200)):
    im = Image.open(src).convert('RGB')
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(ASSETS + 'fotos/' + name, quality=86, optimize=True)

W = 1500
x = y = 8
rowh = 0
from PIL import ImageDraw
sheet = Image.new('RGB', (W, 1200), (96, 104, 116))
dr = ImageDraw.Draw(sheet)
for name, m in made:
    t = m.copy()
    t.thumbnail((190, 170))
    if x + t.width + 8 > W:
        x, y, rowh = 8, y + rowh + 20, 0
    sheet.paste(t, (x, y), t)
    dr.text((x, y + t.height + 2), name, fill=(255, 255, 0))
    x += max(t.width, 110) + 10
    rowh = max(rowh, t.height)
sheet.crop((0, 0, W, y + rowh + 24)).save(CONTACT)
print(len(made), 'sprites')
