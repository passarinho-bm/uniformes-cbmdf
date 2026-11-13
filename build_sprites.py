#!/usr/bin/env python3
"""Gera js/sprites.js embutindo assets/sprites/*.png em base64.
Rode de novo sempre que alterar as imagens em assets/sprites."""
import base64
import glob
import json
import os

raiz = os.path.dirname(os.path.abspath(__file__))
dados = {}
tipos = {}
for pasta, prefixo in (('sprites', ''), ('base', 'base:')):
    for f in sorted(glob.glob(os.path.join(raiz, 'assets', pasta, '*.*'))):
        nome, ext = os.path.splitext(os.path.basename(f))
        if ext not in ('.png', '.webp'):
            continue
        with open(f, 'rb') as fh:
            dados[prefixo + nome] = base64.b64encode(fh.read()).decode('ascii')
        tipos[prefixo + nome] = 'image/webp' if ext == '.webp' else 'image/png'
sz = os.path.join(raiz, 'assets', 'sprites', 'sizes.json')
tamanhos = json.load(open(sz)) if os.path.exists(sz) else {}

js = """/* GERADO por build_sprites.py — não edite à mão. */
(function () {
  var B64 = %s;
  var TIPOS = %s;
  var out = {};
  Object.keys(B64).forEach(function (k) {
    try {
      var bin = atob(B64[k]), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      out[k] = URL.createObjectURL(new Blob([arr], { type: TIPOS[k] }));
    } catch (e) { /* cai no caminho do arquivo */ }
  });
  window.SPRITES = out;
  window.SPRITE_SIZE = %s;
})();
""" % (json.dumps(dados, separators=(',', ':')), json.dumps(tipos, separators=(',', ':')), json.dumps(tamanhos, separators=(',', ':')))
with open(os.path.join(raiz, 'js', 'sprites.js'), 'w') as fh:
    fh.write(js)
print(len(dados), 'sprites,', len(js) // 1024, 'KB')
