#!/usr/bin/env bash
# Builds the marketing images from raw 1280x800 editor captures of Furnace Hill (see claims.md, "Images").
# Usage: docs/launch/home/make-images.sh <raw-dir>   (raw-dir holds before.png, after.png, editing.png,
# import-success.png and publish-review.png, captured in the real editor at a 1280x800 viewport)
set -euo pipefail
raw=${1:?raw capture directory}
out="$(dirname "$0")/../../../assets/static/img/marketing"
mkdir -p "$out"
webp() { magick "$1" "${@:3}" -strip -quality 80 -define webp:method=6 "$out/$2.webp"; }
for state in before after; do
  webp "$raw/$state.png" "editor-$state-1280"
  webp "$raw/$state.png" "editor-$state-800" -resize 800x
  webp "$raw/$state.png" "editor-$state-phone" -crop 600x660+680+0 +repage
done
webp "$raw/import-success.png" step-import -crop 760x250+260+252 +repage
webp "$raw/editing.png" step-edit -crop 540x262+700+150 +repage
webp "$raw/publish-review.png" step-publish -crop 386x430+890+0 +repage
for f in "$out"/*.webp; do magick identify -format '%f %wx%h %b\n' "$f"; done
du -cb "$out"/*.webp | tail -1
