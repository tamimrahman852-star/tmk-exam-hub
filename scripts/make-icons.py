"""Builds the app icons from client/public/logo.png (the single source of truth).
Run again whenever you replace logo.png:  python3 scripts/make-icons.py   (needs: pip install pillow)
"""
from PIL import Image, ImageChops
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'client', 'public')
src = Image.open(os.path.join(ROOT, 'logo.png')).convert('RGB')

# 1. find the badge (everything that is not near-white) and crop a centred square around it
bg = Image.new('RGB', src.size, (255, 255, 255))
bbox = ImageChops.difference(src, bg).convert('L').point(lambda p: 255 if p > 12 else 0).getbbox()
cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
side = int(max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 1.03)
box = (int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2))
square = Image.new('RGB', (side, side), (255, 255, 255))
square.paste(src, (-box[0], -box[1]))  # paste (not crop) so out-of-bounds stays white, never black

def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, 'icons', name), optimize=True)

save(square, 'icon-512.png', 512)
save(square, 'icon-192.png', 192)
save(square, 'apple-touch-icon.png', 180)
save(square, 'favicon-64.png', 64)

# 2. maskable icon: badge inside the 80% safe zone on white so Android never clips it
canvas = Image.new('RGB', (512, 512), (255, 255, 255))
inner = square.resize((400, 400), Image.LANCZOS)
canvas.paste(inner, (56, 56))
canvas.save(os.path.join(ROOT, 'icons', 'icon-maskable-512.png'), optimize=True)
print('icons written, badge bbox', bbox)
