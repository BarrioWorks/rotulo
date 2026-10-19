#!/bin/sh
# Rebuild the self-hosted fonts in assets/static/fonts/ from upstream sources.
# Usage: scripts/design/build_fonts.sh <SchibstedGrotesk[wght].ttf> <Newsreader[opsz,wght].ttf> <out dir>
# Sources (SIL OFL 1.1): https://github.com/google/fonts/tree/main/ofl/schibstedgrotesk
#                        https://github.com/google/fonts/tree/main/ofl/newsreader
# Needs fonttools and brotli from a throwaway venv on PATH (python3 -m venv v && v/bin/pip install fonttools brotli).
# They are build tools, not app dependencies. Prints the metric overrides for the fallback @font-face rules in app.css.
set -eu
SANS=$1; SERIF=$2; OUT=$3; T=$(mktemp -d)
U="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0100-017F,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215"
fonttools varLib.instancer "$SANS" wght=400:700 -q -o "$T/sans.ttf"
pyftsubset "$T/sans.ttf" --unicodes="$U" --layout-features="kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case" --flavor=woff2 --output-file="$OUT/schibsted-grotesk-400-700.woff2"
fonttools varLib.instancer "$SERIF" wght=450 opsz=36 -q -o "$T/serif.ttf"
pyftsubset "$T/serif.ttf" --unicodes="$U" --layout-features="kern,liga,ccmp,locl,mark,mkmk,case,lnum" --flavor=woff2 --output-file="$OUT/newsreader-display-450.woff2"
python3 -I "$(dirname "$0")/fallback_metrics.py" "$T/sans.ttf" /usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf "$T/serif.ttf" /usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf
rm -r "$T"
ls -l "$OUT"/*.woff2
