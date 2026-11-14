"""Gera o brasão do CBMDF (cabeçalho e ícone da aba) a partir da imagem original.

Uso: python tools/make_brasao.py caminho/do/brasao.png
Remove o fundo claro (preenchimento a partir das bordas), recorta e salva
assets/brasao.webp (cabeçalho, 96 px de altura) e assets/brasao-icon.png (ícone 64 px).
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src = sys.argv[1]
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), axis=0)
dist = np.abs(a - bg).max(axis=2)
claro = dist < 26                      # parecido com o fundo
lab, _ = ndimage.label(claro)
borda = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fundo = np.isin(lab, list(borda)) | (dist < 14)   # fundo externo + furos internos (argolas) com a cor exata do fundo
# o contorno escuro isola as partes internas claras (machados, escudo), que não são fundo

alpha = np.where(fundo, 0, 255).astype(np.uint8)
alpha = ndimage.binary_opening(alpha > 0, iterations=1).astype(np.uint8) * 255
# suaviza a borda do recorte
alpha = np.asarray(Image.fromarray(alpha).filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(1.2)))
out = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')
box = out.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
out = out.crop(box)
w, h = out.size
print('recorte', out.size)

def salvar(img, altura, nome, quadrado=False, **kw):
    r = img.resize((max(1, round(img.width * altura / img.height)), altura), Image.LANCZOS)
    if quadrado:
        c = Image.new('RGBA', (altura, altura), (0, 0, 0, 0))
        c.paste(r, ((altura - r.width) // 2, 0))
        r = c
    caminho = os.path.join(raiz, 'assets', nome)
    r.save(caminho, **kw)
    print(nome, r.size, os.path.getsize(caminho), 'bytes')

salvar(out, 96, 'brasao.webp', quality=92, method=6)
salvar(out, 64, 'brasao-icon.png', quadrado=True, optimize=True)
