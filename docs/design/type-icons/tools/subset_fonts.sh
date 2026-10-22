#!/bin/sh
# Rebuild Rótulo's two self-hosted font files from upstream sources.
# Usage: subset_fonts.sh <InterVariable.ttf> <Newsreader[opsz,wght].ttf> <out dir>
# Needs fonttools and brotli in a throwaway venv (python3 -m venv v && v/bin/pip install fonttools brotli). Not an app dependency.
# Sources: https://github.com/rsms/inter/releases (v4.1, SIL OFL 1.1)
#          https://github.com/google/fonts/tree/main/ofl/newsreader (SIL OFL 1.1, upstream github.com/productiontype/Newsreader)
set -eu
INTER=$1; NEWS=$2; OUT=$3; T=$(mktemp -d)
U="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0100-017F,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215"
fonttools varLib.instancer "$INTER" wght=400:600 opsz=14 -q -o "$T/inter.ttf"
pyftsubset "$T/inter.ttf" --unicodes="$U" --layout-features="kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case,cv05,cv08,zero" --flavor=woff2 --output-file="$OUT/inter-text-400-600.woff2"
fonttools varLib.instancer "$NEWS" wght=450 opsz=36 -q -o "$T/news.ttf"
pyftsubset "$T/news.ttf" --unicodes="$U" --layout-features="kern,liga,ccmp,locl,mark,mkmk,case,lnum" --flavor=woff2 --output-file="$OUT/newsreader-display-450.woff2"
rm -r "$T"
ls -l "$OUT"/inter-text-400-600.woff2 "$OUT"/newsreader-display-450.woff2
