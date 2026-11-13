"""Reconstrói a foto-base da camisa bege (2º A) a partir do diagrama da p.36.
A camisa do regulamento é uma ilustração (cor chapada + linhas finas): gera-se um campo de tecido
limpo, copiam-se as linhas originais das áreas não encobertas e redesenham-se as encobertas.
Uso: python base_camisa.py <p036_0.png> <assets/base>"""
import sys
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC, OUT = sys.argv[1], sys.argv[2].rstrip('/') + '/'
S = cv2.cvtColor(cv2.imread(SRC), cv2.COLOR_BGR2RGB)
H, W = S.shape[:2]
AX = 845
CROP = (370, 10, 1320, 945)
hsv = cv2.cvtColor(S, cv2.COLOR_RGB2HSV)
hue, sat, val = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)


def poly(pts, shape=(H, W)):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return m > 0


# ---- contorno da metade direita (coordenadas do diagrama)
OUTLINE = [(845, 45), (942, 44), (982, 82), (1014, 82), (1110, 97), (1141, 104), (1301, 318), (1293, 346),
           (1178, 401), (1124, 401), (1163, 912), (1100, 925), (1000, 933), (845, 936)]
G = poly(OUTLINE)

# ---- regiões a ignorar (legendas e itens gravados)
ex = np.zeros((H, W), bool)
for (x0, y0, x1, y1) in [(998, 4, 1456, 142), (1104, 144, 1456, 336), (1120, 364, 1456, 530), (1120, 550, 1456, 628),
                         (964, 438, 1040, 548), (915, 300, 1095, 384), (965, 238, 1092, 302), (845, 270, 990, 288),
                         (972, 168, 1030, 204)]:
    ex[y0:y1, x0:x1] = True
ex |= poly([(972, 58), (1165, 58), (1165, 205), (1040, 190), (990, 215), (938, 215), (938, 200), (984, 200), (975, 150)])
cv2.circle(tmp := np.zeros((H, W), np.uint8), (958, 182), 26, 255, -1)
ex |= tmp > 0

# ---- campo de tecido (liso)
fabric_px = (sat > 45) & (val > 150) & (hue > 5) & (hue < 22) & G & ~ex
fabric_px[:, :AX] = False
m = fabric_px.astype(np.float32)
f = S.astype(np.float32)
field = np.zeros_like(f)
done = np.zeros((H, W), bool)
for sg in (25, 60, 140, 300):
    num = cv2.GaussianBlur(f * m[..., None], (0, 0), sg)
    den = cv2.GaussianBlur(m, (0, 0), sg)
    ok = (den > 0.05) & ~done
    field[ok] = num[ok] / den[ok, None]
    done |= ok
rng = np.random.default_rng(4)
tex = cv2.GaussianBlur(rng.normal(0, 3.0, (H, W)).astype(np.float32), (0, 0), 0.7)
out = field + tex[..., None]

# ---- linhas originais (áreas confiáveis)
lead = np.zeros((H, W), np.uint8)
for p1, p2 in (((1022, 525), (1128, 584)), ((1005, 380), (1124, 410)), ((1020, 262), (1104, 250))):
    cv2.line(lead, p1, p2, 255, 12)
isline = (val < 168) & ~((sat < 50) & (val > 112)) & (lead == 0)
a_line = np.clip((172 - val) / 48.0, 0, 1) * (G & ~ex) * isline
a_line = a_line[..., None]
out = out * (1 - a_line) + f * a_line

# ---- linhas redesenhadas (3x para suavizar)
K = 3
layer = np.zeros((H * K, W * K), np.uint8)


def line(pts, t=1.6):
    p = (np.array(pts, np.float32) * K).astype(np.int32)
    cv2.polylines(layer, [p], False, 255, int(round(t * K)), cv2.LINE_AA)


def curve(p0, p1, p2, t=1.6, n=24):
    ts = np.linspace(0, 1, n)[:, None]
    p = (1 - ts) ** 2 * np.array(p0) + 2 * (1 - ts) * ts * np.array(p1) + ts ** 2 * np.array(p2)
    line(p, t)


line([(982, 82), (990, 150), (997, 208)])            # borda externa da gola
line([(997, 208), (944, 208)])                        # borda inferior da gola
line([(1014, 82), (990, 100), (1002, 135)])           # ponta da passadeira
line([(1002, 135), (1090, 163), (1142, 180)])         # borda inferior da passadeira
line([(1004, 140), (1090, 168), (1141, 185)], 1.4)
line([(1014, 82), (1110, 97), (1141, 104)], 1.4)      # borda superior
line([(925, 378), (1083, 378)])                       # topo da pestana do bolso
line([(925, 378), (925, 445)])
line([(1083, 378), (1083, 445)])
line([(925, 445), (1083, 445)])                       # base da pestana
for x in (984, 989, 1018, 1023):
    line([(x, 447), (x, 543)], 1.2)                   # pregas do bolso
curve((1142, 182), (1104, 300), (1124, 400), 1.6)     # costura da cava
line([(1293, 340), (1178, 395)], 1.3)                 # bainha da manga
small = cv2.resize(layer, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
small = (small * G)[..., None]
INK = np.array([70, 56, 46], np.float32)
out = out * (1 - small * 0.92) + INK * small * 0.92

# ---- botão da passadeira (cópia do botão do bolso)
bx, by, r = 1003, 427, 11
patch = f[by - r:by + r + 1, bx - r:bx + r + 1].copy()
yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
pa = np.clip((r - 1.5 - np.hypot(xx, yy)), 0, 1)[..., None]
tx, ty = 1013, 108
out[ty - r:ty + r + 1, tx - r:tx + r + 1] = out[ty - r:ty + r + 1, tx - r:tx + r + 1] * (1 - pa) + patch * pa

# ---- espelha e exporta
out = np.clip(out, 0, 255).astype(np.uint8)
xs = np.arange(W)
left = xs < AX
srcx = np.clip(2 * AX - xs, 0, W - 1)
out[:, left] = out[:, srcx[left]]
G[:, left] = G[:, srcx[left]]
al = ndi.gaussian_filter(ndi.binary_erosion(G, iterations=1).astype(np.float32), 0.9)
al = (np.clip(al * 1.1, 0, 1) * 255).astype(np.uint8)
x0, y0, x1, y1 = CROP
Image.fromarray(np.dstack([out, al])[y0:y1, x0:x1], 'RGBA').save(OUT + 'camisa.webp', quality=92, method=6)
print('camisa ok', x1 - x0, y1 - y0)
