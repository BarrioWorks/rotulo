"""Builds a larger realistic site ZIP from the bakery fixture: many pages, ~150 photos, fonts.

Usage: python3 -I scripts/make-large-site.py fixtures/sites/harbor-bakery out.zip
"""
import os
import random
import sys
import zipfile

source, out = sys.argv[1], sys.argv[2]
rng = random.Random(7)
files = {}
for root, _, names in os.walk(source):
    for name in names:
        full = os.path.join(root, name)
        rel = os.path.relpath(full, source).replace(os.sep, "/")
        with open(full, "rb") as f:
            files[rel] = f.read()

pages = [p for p in files if p.endswith(".html")]
photos = [p for p in files if p.endswith(".jpg")]
for i in range(1, 37):
    template = files[pages[i % len(pages)]].decode()
    gallery = "".join(f'<img src="images/gallery/photo-{i}-{j}.jpg" alt="Photo {j}" width="800" height="600">' for j in range(4))
    files[f"story-{i}.html"] = template.replace("</main>", f'<section class="gallery">{gallery}</section></main>').encode()
    for j in range(4):
        base = files[photos[(i + j) % len(photos)]]
        # Bytes after the JPEG end marker keep it a valid image while making each photo unique.
        files[f"images/gallery/photo-{i}-{j}.jpg"] = base + rng.randbytes(60_000)

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for path in sorted(files):
        info = zipfile.ZipInfo(path, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, files[path])
print(f"{len(files)} files, {sum(map(len, files.values())) / 1e6:.1f} MB unpacked, {os.path.getsize(out) / 1e6:.1f} MB zip")
