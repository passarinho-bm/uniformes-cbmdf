"""Converte assets/sprites/*.png em WebP (com alfa) e grava sizes.json. Rode após make_sprites.py."""
import glob
import json
import os
import sys
from PIL import Image

d = sys.argv[1].rstrip('/') + '/'
sizes = {}
if os.path.exists(d + 'sizes.json'):
    sizes = json.load(open(d + 'sizes.json'))
for f in sorted(glob.glob(d + '*.png')):
    im = Image.open(f).convert('RGBA')
    name = os.path.splitext(os.path.basename(f))[0]
    im.save(d + name + '.webp', quality=90, method=6)
    sizes[name] = [im.width, im.height]
    os.remove(f)
json.dump(sizes, open(d + 'sizes.json', 'w'), separators=(',', ':'), sort_keys=True)
print(len(sizes), 'sprites')
