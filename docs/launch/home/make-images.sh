#!/usr/bin/env bash
# Builds the homepage images from raw 1280x800 captures of one editing session on Furnace Hill Coffee,
# taken in the real editor and on the published site at a 1280x800 viewport.
# Usage: docs/launch/home/make-images.sh <raw-dir>
# raw-dir holds s1-selected.png, s1-typed.png, s2-replaced.png, s3-link.png, s4-review.png, s4-live.png and s5-site.png.
set -euo pipefail
raw=${1:?raw capture directory}
out="$(dirname "$0")/../../../assets/static/img/marketing"
mkdir -p "$out"
find "$out" -name '*.webp' -delete
webp() { magick "$1" "${@:3}" -strip -quality 78 -define webp:method=6 "$out/$2.webp"; }
full() { webp "$raw/$1.png" "$2-1280"; webp "$raw/$1.png" "$2-800" -resize 800x; }

full s1-typed demo-1-typed
webp "$raw/s1-selected.png" demo-1-selected-crop -crop 520x220+728+190 +repage
webp "$raw/s1-typed.png" demo-1-typed-crop -crop 520x220+728+190 +repage
full s2-replaced demo-2-photo
webp "$raw/s2-replaced.png" demo-2-photo-phone -crop 730x660+300+56 +repage -resize 640x
full s3-link demo-3-link
webp "$raw/s3-link.png" demo-3-link-phone -crop 630x460+645+200 +repage
webp "$raw/s4-review.png" demo-4-review -crop 384x536+890+58 +repage
webp "$raw/s4-live.png" demo-4-live -crop 384x300+890+57 +repage
full s5-site demo-5-site
webp "$raw/s5-site.png" demo-5-site-phone -crop 1110x520+85+120 +repage -resize 640x

for f in "$out"/*.webp; do magick identify -format '%f %wx%h %b\n' "$f"; done
du -cb "$out"/*.webp | tail -1
