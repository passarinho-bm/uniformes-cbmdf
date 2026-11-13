"""Utilitários de recorte: fundo branco -> transparente, componentes conexos."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def load(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(np.int16)


def fg_mask(a, white=236, holes=True):
    """Tudo que não é branco ligado à borda. holes=True mantém brancos internos."""
    whiteish = a.min(axis=2) >= white
    if not holes:
        return ~whiteish
    lab, n = ndi.label(whiteish)
    border = set(np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])))
    border.discard(0)
    return ~np.isin(lab, list(border))


def components(fg, min_area, close=3):
    g = ndi.binary_closing(fg, structure=np.ones((3, 3)), iterations=close) if close else fg
    lab, n = ndi.label(g)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        area = int((lab[sl] == i + 1).sum())
        if area >= min_area:
            out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, area, i + 1))
    return lab, sorted(out, key=lambda b: (round(b[1] / 80), b[0]))


def cut(a, fg, box, pad=2, max_w=None, erode=1, feather=0.8):
    x0, y0, x1, y1 = box[:4]
    x0, y0 = max(x0 - pad, 0), max(y0 - pad, 0)
    x1, y1 = min(x1 + pad, a.shape[1]), min(y1 + pad, a.shape[0])
    m = fg[y0:y1, x0:x1]
    if erode:
        m = ndi.binary_erosion(m, iterations=erode)
    al = np.clip(ndi.gaussian_filter(m.astype(np.float32), feather) * 1.2, 0, 1)
    rgba = np.dstack([a[y0:y1, x0:x1].astype(np.uint8), (al * 255).astype(np.uint8)])
    im = Image.fromarray(rgba, 'RGBA')
    if max_w and im.width > max_w:
        im = im.resize((max_w, max(1, round(im.height * max_w / im.width))), Image.LANCZOS)
    return im
