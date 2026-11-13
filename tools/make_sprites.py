"""Recorta das figuras do regulamento os sprites usados pelo site.
Uso: python make_sprites.py <pasta_img_extraidas> <assets/sprites> <contato.png>"""
import sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage as ndi
import seg

SRC, OUT, CONTACT = sys.argv[1].rstrip('/') + '/', sys.argv[2].rstrip('/') + '/', sys.argv[3]
made = []


def hsv(a):
    h = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2HSV)
    return h[..., 0].astype(int), h[..., 1].astype(int), h[..., 2].astype(int)


def largest(mask, close=2, fill=True):
    m = ndi.binary_closing(mask, iterations=close) if close else mask
    lab, n = ndi.label(m)
    if n == 0:
        return m
    sizes = ndi.sum(m, lab, range(1, n + 1))
    m = lab == (1 + int(np.argmax(sizes)))
    return ndi.binary_fill_holes(m) if fill else m


def save(name, a, mask, max_w=None, erode=1):
    ys, xs = np.where(mask)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    im = seg.cut(a, mask, box, max_w=max_w, erode=erode)
    im.save(OUT + name + '.png', optimize=True)
    made.append((name, im))
    return im


def sub(mask, box):
    m = np.zeros_like(mask)
    x0, y0, x1, y1 = box
    m[y0:y1, x0:x1] = mask[y0:y1, x0:x1]
    return m


RANKS = ['cel', 'tc', 'maj', 'cap', 'ten1', 'ten2', 'asp']

# ---- platinas azuis (oficiais) e versão cinza-escuro para a túnica
a = seg.load(SRC + 'p146_0.png')
fg = seg.fg_mask(a)
_, comps = seg.components(fg, 6000)
comps = sorted(comps, key=lambda b: b[0])


def to_gray_board(im):
    arr = np.asarray(im).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    blue = (b > r + 10) & (b > g + 2)
    lum = (r + g + b) / 3
    out = arr.copy()
    for i, k in enumerate((0.56, 0.60, 0.76)):
        out[..., i] = np.where(blue, np.clip(lum * k, 0, 255), arr[..., i])
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def clean_tags(a, mask):
    h_, s_, v_ = hsv(a)
    tags = mask & (s_ < 45) & (v_ > 150)
    tags = ndi.binary_dilation(ndi.binary_opening(tags, iterations=1), iterations=3) & mask
    if tags.sum() == 0:
        return a
    b = a.copy()
    ok = mask & ~tags & (s_ > 60)
    idx = ndi.distance_transform_edt(~ok, return_distances=False, return_indices=True)
    b[tags] = a[idx[0][tags], idx[1][tags]]
    return b


def board(name, a, mask):
    im = save('platina-azul-' + name, a, mask)
    g = to_gray_board(im)
    g.save(OUT + 'platina-cinza-' + name + '.png', optimize=True)
    made.append(('platina-cinza-' + name, g))


for r, c in zip(RANKS, comps):
    board(r, a, largest(sub(fg, c[:4]), close=1))

# ---- luvas amovíveis laranja (oficiais)
a = seg.load(SRC + 'p146_1.png')
h, s, v = hsv(a)
orange = (s > 150) & (v > 150) & (h < 20)
fg = seg.fg_mask(a)
_, comps = seg.components(fg, 6000)
comps = sorted(comps, key=lambda b: b[0])
for r, c in zip(RANKS, comps):
    save('luva-' + r, a, largest(sub(orange, c[:4]), close=3))

# ---- cadetes e subtenente
a = seg.load(SRC + 'p147_0.png')
h, s, v = hsv(a)
blue = (a[..., 2] > a[..., 0] + 10) & (v < 170)
orange = (s > 150) & (v > 150) & (h < 20)
board('cad1', a, largest(sub(blue, (148, 80, 278, 373)), close=3))
m2 = largest(sub(blue, (293, 98, 607, 699)), close=3)
board('cad2', clean_tags(a, m2), m2)
save('luva-cad2', a, largest(sub(orange, (707, 55, 982, 676)), close=3), max_w=140)
save('luva-cad1', a, largest(sub(orange, (1022, 80, 1150, 384)), close=3))
a = seg.load(SRC + 'p148_0.png')
h, s, v = hsv(a)
blue = (a[..., 2] > a[..., 0] + 10) & (v < 170)
orange = (s > 150) & (v > 150) & (h < 20)
board('st', a, largest(sub(blue, (300, 99, 612, 704)), close=3))
save('luva-st', a, largest(sub(orange, (712, 89, 979, 680)), close=3), max_w=140)

# ---- divisas metálicas de gola
a = seg.load(SRC + 'p148_1.png')
h, s, v = hsv(a)
gold = (s > 60) & (v > 80) & (h > 8) & (h < 35)
for name, box in zip(['sgt1', 'sgt2', 'sgt3', 'cb', 'sd'],
                     [(209, 267, 436, 639), (464, 268, 672, 591), (704, 267, 911, 546), (944, 267, 1150, 501), (1180, 268, 1384, 462)]):
    save('divisa-gola-' + name, a, largest(sub(gold, box), close=3), max_w=90)

# ---- armas emborrachadas
a = seg.load(SRC + 'p153_1.png')
dark = a.max(axis=2) < 70
dark = ndi.binary_fill_holes(ndi.binary_closing(dark, iterations=3))
boxes = [(77, 53, 154, 182), (275, 56, 346, 187), (474, 56, 544, 185), (669, 56, 739, 188), (860, 56, 930, 187), (1055, 53, 1125, 182),
         (151, 263, 222, 389), (431, 266, 508, 393), (708, 265, 785, 391), (987, 266, 1064, 392)]
names = ['combatente', 'complementar', 'medico', 'dentista', 'capelao-catolico', 'capelao-evangelico', 'intendente', 'condutor', 'manutencao', 'musico']
for name, box in zip(names, boxes):
    m = largest(sub(dark, (box[0] - 6, box[1] - 6, box[2] + 6, box[3] + 6)), close=0)
    m = ndi.binary_dilation(m, iterations=3)  # inclui a borda cinza
    save('arma-emb-' + name, a, m, erode=0)

# ---- bandeira do DF, emblema e símbolo
a = seg.load(SRC + 'p155_0.png')
fg = seg.fg_mask(a, white=250)
save('bandeira-df', a, largest(sub(fg, (372, 342, 1045, 795)), close=0), max_w=320)
a = seg.load(SRC + 'p157_0.png')
fg = seg.fg_mask(a)
save('emblema', a, largest(fg, close=0), max_w=300)
a = seg.load(SRC + 'p156_0.png')
save('simbolo', a, seg.fg_mask(a), max_w=260)

# ---- plaquetas em branco (texto removido)
a = seg.load(SRC + 'p109_0.png')
h, s, v = hsv(a)
for name, box in (('plaqueta-ouro', (20, 29, 381, 105)), ('plaqueta-vermelha', (404, 29, 732, 105))):
    m = largest(sub((s > 90) & (v > 110), box), close=3)
    ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    b = a.copy()
    w = x1 - x0
    col = b[:, x0 + int(w * 0.035), :].copy()
    b[y0:y1, x0 + int(w * 0.035):x1 - int(w * 0.035), :] = col[y0:y1, None, :]
    save(name, b, m)

# ---- distintivo de curso de carreira (do bolso azul-marinho)
a = seg.load(SRC + 'p109_2.png')
h, s, v = hsv(a)
gold = (s > 70) & (v > 110) & (h > 8) & (h < 35)
save('curso-carreira', a, largest(sub(gold, (240, 330, 460, 560)), close=1, fill=False), max_w=150, erode=0)

# ---- distintivo de OBM (institucional, faixa sem sigla) e suporte de couro
a = seg.load(SRC + 'p166_0.png')
fg = seg.fg_mask(a)
h, s, v = hsv(a)
b = a.copy()
rows_red = (s > 120) & ((h < 8) | (h > 170))
for yy in range(26, 96):
    xs = np.where(rows_red[yy, 20:278])[0] + 20
    if len(xs) > 40:
        x0, x1 = xs.min() + 6, xs.max() - 6
        seg_red = a[yy, x0:x1][rows_red[yy, x0:x1]]
        gold_here = (h[yy, x0:x1] > 10) & (h[yy, x0:x1] < 40)
        if gold_here.any() and len(seg_red):
            b[yy, x0:x1] = np.median(seg_red, axis=0)
save('obm-escudo', b, largest(fg, close=0), max_w=200)
a = seg.load(SRC + 'p165_0.png')
dark = a.max(axis=2) < 80
save('obm-suporte', a, largest(sub(dark, (597, 88, 853, 628)), close=3), max_w=150)

# ---- apliques de comando
a = seg.load(SRC + 'p166_1.png')
h, s, v = hsv(a)
sat = (s > 90) & (v > 60)
save('aplique-cmtgeral', a, largest(sub(sat, (381, 209, 704, 611)), close=3), max_w=120)
save('aplique-subcmt', a, largest(sub(sat, (720, 208, 1024, 611)), close=3), max_w=120)
a = seg.load(SRC + 'p167_0.png')
h, s, v = hsv(a)
sat = (s > 90) & (v > 60)
for name, box in (('aplique-cmtop', (32, 176, 249, 466)), ('aplique-cmtesp', (320, 177, 544, 467)), ('aplique-excmt', (617, 182, 839, 471))):
    save(name, a, largest(sub(sat, box), close=3), max_w=110)

# ---- coberturas
for name, f, box, mw in (('gorro-laranja', 'p086_1', (145, 237, 480, 602), 300), ('gorro-vermelho', 'p088_0', (26, 150, 329, 483), 300),
                         ('quepe-m', 'p089_0', (80, 25, 869, 511), 420), ('quepe-f', 'p090_0', (113, 57, 944, 546), 420),
                         ('boina', 'p092_0', (137, 50, 866, 314), 420)):
    a = seg.load(SRC + f + '.png')
    fg = seg.fg_mask(a, white=244)
    save(name, a, largest(sub(fg, box), close=2), max_w=mw, erode=3)
a = seg.load(SRC + 'p087_1.png')
fg = seg.fg_mask(a)
h, s, v = hsv(a)
orange = (s > 120) & (v > 120)
save('pala-laranja-cmt', a, largest(sub(orange, (0, 160, 378, 420)), close=3), max_w=220)
save('pala-laranja-sup', a, largest(sub(orange, (378, 160, 748, 420)), close=3), max_w=220)
a = seg.load(SRC + 'p088_1.png')
h, s, v = hsv(a)
red = (s > 120) & (v > 90)
save('pala-vermelho-cmt', a, largest(sub(red, (11, 200, 372, 432)), close=3), max_w=220)
save('pala-vermelho-sup', a, largest(sub(red, (380, 200, 748, 432)), close=3), max_w=220)
a = seg.load(SRC + 'p089_1.png')
fg = seg.fg_mask(a)
save('pala-preta-cmt', a, largest(sub(fg, (15, 182, 365, 365)), close=2), max_w=220)
save('pala-preta-sup', a, largest(sub(fg, (389, 182, 738, 364)), close=2), max_w=220)

# ---- cadarço em branco (laranja)
a = seg.load(SRC + 'p106_0.png')
h, s, v = hsv(a)
orange = (s > 150) & (v > 150) & (h < 20)
save('cadarco-laranja', a, largest(sub(orange, (590, 300, 1213, 683)), close=3), max_w=280)

# ---- folha de contato
W = 1500
x = y = 8
rowh = 0
sheet = Image.new('RGB', (W, 3000), (96, 104, 116))
from PIL import ImageDraw
dr = ImageDraw.Draw(sheet)
for name, m in made:
    t = m.copy()
    t.thumbnail((170, 150))
    if x + t.width + 8 > W:
        x = 8
        y += rowh + 20
        rowh = 0
    sheet.paste(t, (x, y), t)
    dr.text((x, y + t.height + 2), name.replace('platina-', 'pl-')[:20], fill=(255, 255, 0))
    x += max(t.width, 110) + 10
    rowh = max(rowh, t.height)
sheet.crop((0, 0, W, y + rowh + 24)).save(CONTACT)
print(len(made), 'sprites')
