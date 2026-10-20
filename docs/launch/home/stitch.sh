#!/usr/bin/env bash
# Stitches viewport captures of one page into a full-page PNG and slices it into fixed-height sections.
# Usage: stitch.sh <out-prefix> <page-height> <section-height> <capture:scroll-y>...
# Each capture is a PNG taken at the given scroll position, at the page's CSS width and device pixel ratio 1.
set -euo pipefail
out=$1 height=$2 section=$3; shift 3
tmp=$(mktemp -d)
args=()
for pair in "$@"; do
  file=${pair%%:*} y=${pair##*:}
  args+=( "(" "$file" -repage "+0+${y%.*}" ")" )
done
magick -size "$(magick identify -format %w "${1%%:*}")x$height" xc:white "${args[@]}" -flatten "$out-full.png"
magick "$out-full.png" -crop "x$section" +repage "$tmp/part-%02d.png"
n=1
for part in "$tmp"/part-*.png; do mv "$part" "$out-$(printf %02d $n).png"; n=$((n + 1)); done
rm -rf "$tmp"
ls "$out"-*.png
