"""Extrai as figuras embutidas de páginas do PDF do regulamento.
Uso: python extract.py <pdf> <pasta_saida> <pag> [<pag> ...]   (gera também folhas de contato)"""
import os
import sys
import pymupdf
from PIL import Image, ImageDraw

pdf, out = sys.argv[1], sys.argv[2]
pages = [int(x) for x in sys.argv[3:]]
os.makedirs(out, exist_ok=True)
d = pymupdf.open(pdf)
tiles = []
for n in pages:
    for i, info in enumerate(d[n - 1].get_images(full=True)):
        pix = pymupdf.Pixmap(d, info[0])
        if info[1]:
            mask = pymupdf.Pixmap(d, info[1])
            if pix.alpha:
                pix = pymupdf.Pixmap(pix, 0)
            pix = pymupdf.Pixmap(pix, mask)
        if pix.colorspace and pix.colorspace.n > 3:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
        fn = os.path.join(out, 'p%03d_%d.png' % (n, i))
        pix.save(fn)
        tiles.append((fn, 'p%d_%d %dx%d' % (n, i, pix.width, pix.height)))
print(len(tiles), 'imagens')
# folhas de contato 3x3
per, tw, th = 9, 520, 340
for s in range(0, len(tiles), per):
    sheet = Image.new('RGB', (tw * 3, (th + 22) * 3), (120, 126, 136))
    dr = ImageDraw.Draw(sheet)
    for k, (fn, lab) in enumerate(tiles[s:s + per]):
        im = Image.open(fn).convert('RGBA')
        im.thumbnail((tw - 8, th - 8))
        x, y = (k % 3) * tw + 4, (k // 3) * (th + 22) + 20
        sheet.paste(im, (x, y), im)
        dr.text((x, y - 16), lab, fill=(255, 255, 0))
    sheet.save(os.path.join(out, 'contact_%02d.png' % (s // per)))
    print('contact_%02d.png' % (s // per), [t[1] for t in tiles[s:s + per]])
