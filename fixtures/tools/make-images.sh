#!/usr/bin/env bash
# Regenerates every raster image used by the fixtures. Output is committed; rerun only to change the art.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

layer() { magick -size ${W}x${H} xc:none "$@"; }
jpeg() { magick "$1" -strip -sampling-factor 4:2:0 -interlace JPEG -quality "${3:-84}" "$2"; }

soft() { magick -size ${W}x${H} xc:"$1" -resize 25% "${@:3}" -resize ${W}x${H}! "$2"; }

hero_bakery() {
  local W=1600 H=900 d="$work/bakery"; mkdir -p "$d"
  magick -size ${W}x${H} -define gradient:angle=150 gradient:'#f8d7ad-#e3925a' "$d/bg.png"
  soft black "$d/glow.png" -fill '#fff1d2' -draw 'circle 290,70 290,190' -blur 0x48
  soft black "$d/sun.png" -fill '#fff6e4' -draw 'circle 290,70 290,100' -blur 0x6
  soft white "$d/vignette.png" -fill none -stroke '#c9a083' -strokewidth 60 -draw 'rectangle 0,0 400,225' -blur 0x40
  soft none "$d/hill.png" -fill 'rgba(255,226,186,0.55)' -draw 'ellipse 40,175 170,70 0,360' -blur 0x18

  magick -size ${W}x${H} gradient:'#b8693a-#6e331a' "$d/table-fill.png"
  layer -fill white -draw 'path "M 0,668 Q 800,612 1600,676 L 1600,900 L 0,900 Z"' "$d/table-mask.png"
  magick "$d/table-fill.png" "$d/table-mask.png" -compose CopyOpacity -composite "$d/table.png"
  layer -stroke 'rgba(255,214,160,0.55)' -strokewidth 5 -fill none \
    -draw 'path "M 0,670 Q 800,614 1600,678"' -blur 0x2 "$d/table-edge.png"

  layer -fill 'rgba(50,18,4,0.55)' -draw 'ellipse 585,716 300,40 0,360' -blur 0x22 "$d/boule-shadow.png"
  layer -fill '#b4652c' -draw 'ellipse 560,598 268,168 0,360' "$d/boule-base.png"
  layer -fill '#eaa95c' -draw 'ellipse 520,546 205,104 0,360' -blur 0x40 "$d/boule-hi.png"
  layer -fill 'rgba(80,34,10,0.6)' -draw 'ellipse 600,704 270,72 0,360' -blur 0x32 "$d/boule-lo.png"
  magick "$d/boule-base.png" "$d/boule-lo.png" -compose Atop -composite \
    "$d/boule-hi.png" -compose Atop -composite "$d/boule.png"
  layer -fill none -stroke '#f6d7a2' -strokewidth 12 \
    -draw 'stroke-linecap round path "M 392,566 Q 560,500 728,566" path "M 420,628 Q 560,578 700,628" path "M 470,512 Q 560,478 650,512"' \
    -blur 0x1.4 "$d/boule-score.png"

  layer -fill 'rgba(50,18,4,0.5)' -draw 'ellipse 1040,724 330,28 -6,354' -blur 0x18 "$d/bag-shadow.png"
  layer -fill '#be7536' -draw 'translate 1030,654 rotate -9 ellipse 0,0 330,62 0,360' "$d/bag-base.png"
  layer -fill '#efb56c' -draw 'translate 1020,634 rotate -9 ellipse 0,0 290,26 0,360' -blur 0x16 "$d/bag-hi.png"
  magick "$d/bag-base.png" "$d/bag-hi.png" -compose Atop -composite "$d/bag.png"
  layer -fill none -stroke '#f8deae' -strokewidth 10 \
    -draw 'translate 1030,654 rotate -9 stroke-linecap round path "M -230,-18 L -170,12 M -120,-20 L -60,10 M -10,-22 L 50,8 M 100,-22 L 160,8 M 210,-18 L 260,6"' \
    -blur 0x1.2 "$d/bag-score.png"

  layer -fill 'rgba(50,18,4,0.45)' -draw 'ellipse 1400,746 160,20 0,360' -blur 0x14 "$d/cup-shadow.png"
  layer -fill '#efe2d2' -draw 'ellipse 1395,734 165,26 0,360' \
    -fill '#fffaf2' -draw 'ellipse 1395,728 150,20 0,360' \
    -fill none -stroke '#fbf3e8' -strokewidth 18 -draw 'path "M 1468,628 Q 1528,630 1514,668 Q 1502,694 1456,688"' \
    -stroke none -fill '#fffaf2' -draw 'path "M 1315,604 L 1475,604 Q 1471,704 1395,726 Q 1319,704 1315,604 Z"' \
    -fill '#e6d6c2' -draw 'ellipse 1395,604 80,15 0,360' \
    -fill '#5e2f17' -draw 'ellipse 1395,606 70,11 0,360' "$d/cup-raw.png"
  layer -fill 'rgba(150,100,60,0.35)' -draw 'path "M 1420,604 L 1475,604 Q 1471,704 1395,726 Q 1450,690 1420,604 Z"' -blur 0x10 "$d/cup-shade.png"
  magick "$d/cup-raw.png" "$d/cup-shade.png" -compose Atop -composite "$d/cup.png"

  layer -fill none -stroke 'rgba(255,255,255,0.92)' -strokewidth 17 \
    -draw 'stroke-linecap round path "M 1378,572 C 1348,522 1418,492 1386,432 C 1364,392 1398,362 1390,322" path "M 1420,568 C 1400,528 1454,502 1430,454 C 1414,422 1440,400 1434,372" path "M 548,412 C 518,362 588,332 556,274 C 536,238 568,210 560,172" path "M 600,418 C 584,380 626,356 606,316"' \
    -blur 0x8 "$d/steam.png"

  magick "$d/bg.png" \
    "$d/glow.png" -compose Screen -composite \
    "$d/sun.png" -compose Screen -composite \
    -compose Over \
    "$d/hill.png" -composite \
    "$d/table.png" -composite "$d/table-edge.png" -composite \
    "$d/boule-shadow.png" -composite "$d/boule.png" -composite "$d/boule-score.png" -composite \
    "$d/bag-shadow.png" -composite "$d/bag.png" -composite "$d/bag-score.png" -composite \
    "$d/cup-shadow.png" -composite "$d/cup.png" -composite \
    "$d/steam.png" -composite \
    "$d/vignette.png" -compose Multiply -composite \
    "$d/out.png"
  jpeg "$d/out.png" "$1"
}


card_sourdough() {
  local W=800 H=600 d="$work/sourdough"; mkdir -p "$d"
  magick -size ${W}x${H} -define gradient:angle=160 gradient:'#efe4d2-#d4c0a0' "$d/bg.png"
  soft black "$d/glow.png" -fill '#fff4de' -draw 'circle 50,30 50,110' -blur 0x30
  layer -fill 'rgba(50,20,4,0.5)' -draw 'ellipse 415,470 250,46 0,360' -blur 0x24 "$d/shadow.png"
  layer -fill '#a95c27' -draw 'circle 400,320 400,540' "$d/base.png"
  layer -fill '#e7a85e' -draw 'ellipse 360,260 160,130 0,360' -blur 0x40 "$d/hi.png"
  layer -fill 'rgba(70,28,6,0.6)' -draw 'ellipse 440,500 230,90 0,360' -blur 0x34 "$d/lo.png"
  magick "$d/base.png" "$d/lo.png" -compose Atop -composite "$d/hi.png" -compose Atop -composite "$d/loaf.png"
  layer -fill none -stroke '#f5d9a8' -strokewidth 14 \
    -draw 'stroke-linecap round path "M 270,330 Q 330,170 520,190"' -strokewidth 8 -draw 'stroke-linecap round path "M 330,420 Q 380,360 450,350" path "M 470,430 Q 520,380 540,300"' -blur 0x1.6 "$d/score.png"
  layer -fill 'rgba(255,255,255,0.85)' \
    -draw 'circle 330,200 334,200 circle 372,186 375,186 circle 452,214 456,214 circle 420,250 423,250 circle 350,262 352,262 circle 480,300 483,300 circle 300,300 303,300' \
    -blur 0x2 "$d/flour.png"
  soft white "$d/vignette.png" -fill none -stroke '#cdb9a0' -strokewidth 40 -draw 'rectangle 0,0 200,150' -blur 0x26
  magick "$d/bg.png" "$d/glow.png" -compose Screen -composite -compose Over \
    "$d/shadow.png" -composite "$d/loaf.png" -composite "$d/score.png" -composite "$d/flour.png" -composite \
    "$d/vignette.png" -compose Multiply -composite "$d/out.png"
  jpeg "$d/out.png" "$1" 86
}

card_pastries() {
  local W=800 H=600 d="$work/pastries"; mkdir -p "$d"
  magick -size ${W}x${H} -define gradient:angle=150 gradient:'#fae3d2-#eab496' "$d/bg.png"
  soft black "$d/glow.png" -fill '#fff3e6' -draw 'circle 150,30 150,110' -blur 0x30
  layer -fill '#fffaf4' -draw 'ellipse 400,400 300,96 0,360' -fill '#efe2d6' -draw 'ellipse 400,392 250,70 0,360' "$d/plate.png"
  layer -fill 'rgba(70,30,10,0.35)' -draw 'ellipse 410,470 300,30 0,360' -blur 0x18 "$d/plate-shadow.png"
  layer -fill 'rgba(70,30,10,0.45)' -draw 'ellipse 405,398 230,40 0,360' -blur 0x16 "$d/shadow.png"
  layer -fill '#c27530' \
    -draw 'translate 190,360 rotate 38 ellipse 0,0 74,32 0,360' \
    -draw 'translate 270,320 rotate 22 ellipse 0,0 86,52 0,360' \
    -draw 'translate 400,300 rotate 0 ellipse 0,0 98,72 0,360' \
    -draw 'translate 530,320 rotate -22 ellipse 0,0 86,52 0,360' \
    -draw 'translate 610,360 rotate -38 ellipse 0,0 74,32 0,360' "$d/base.png"
  layer -fill '#f0b468' \
    -draw 'translate 400,272 ellipse 0,0 70,34 0,360' \
    -draw 'translate 268,300 rotate 22 ellipse 0,0 56,22 0,360' \
    -draw 'translate 532,300 rotate -22 ellipse 0,0 56,22 0,360' \
    -draw 'translate 188,346 rotate 38 ellipse 0,0 44,12 0,360' \
    -draw 'translate 612,346 rotate -38 ellipse 0,0 44,12 0,360' -blur 0x14 "$d/hi.png"
  magick "$d/base.png" "$d/hi.png" -compose Atop -composite "$d/croissant.png"
  layer -fill none -stroke 'rgba(110,50,14,0.55)' -strokewidth 5 \
    -draw 'stroke-linecap round path "M 330,252 Q 318,300 336,356" path "M 470,252 Q 482,300 464,356" path "M 228,290 Q 220,320 236,352" path "M 572,290 Q 580,320 564,352"' \
    -blur 0x1.5 "$d/folds.png"
  soft white "$d/vignette.png" -fill none -stroke '#d9b29a' -strokewidth 40 -draw 'rectangle 0,0 200,150' -blur 0x26
  magick "$d/bg.png" "$d/glow.png" -compose Screen -composite -compose Over \
    "$d/plate-shadow.png" -composite "$d/plate.png" -composite "$d/shadow.png" -composite \
    "$d/croissant.png" -composite "$d/folds.png" -composite \
    "$d/vignette.png" -compose Multiply -composite "$d/out.png"
  jpeg "$d/out.png" "$1" 86
}

card_coffee() {
  local W=800 H=600 d="$work/coffee"; mkdir -p "$d"
  magick -size ${W}x${H} -define gradient:angle=135 gradient:'#d9b48c-#9c6b45' "$d/bg.png"
  soft black "$d/glow.png" -fill '#ffeccc' -draw 'circle 60,20 60,120' -blur 0x34
  layer -fill 'rgba(50,20,4,0.45)' -draw 'circle 420,320 420,540' -blur 0x22 "$d/shadow.png"
  layer -fill '#f6ede1' -draw 'circle 400,300 400,510' \
    -fill '#eadccb' -draw 'circle 400,300 400,470' \
    -fill '#fffaf3' -draw 'roundrectangle 540,282 602,318 18,18' \
    -stroke none -fill '#fffaf3' -draw 'circle 400,300 400,452' \
    -fill '#6f3a1b' -draw 'circle 400,300 400,428' "$d/cup.png"
  layer -fill '#b8783f' -draw 'circle 400,300 400,420' -fill '#6f3a1b' -draw 'circle 400,300 400,404' -blur 0x10 "$d/crema-raw.png"
  layer -fill white -draw 'circle 400,300 400,428' "$d/coffee-mask.png"
  magick "$d/crema-raw.png" "$d/coffee-mask.png" -compose DstIn -composite "$d/crema.png"
  layer -fill '#f6e6cc' \
    -draw 'circle 362,280 362,322 circle 438,280 438,322 polygon 324,292 476,292 400,378' -blur 0x2.5 "$d/heart.png"
  magick "$d/bg.png" "$d/glow.png" -compose Screen -composite -compose Over \
    "$d/shadow.png" -composite "$d/cup.png" -composite "$d/crema.png" -composite "$d/heart.png" -composite "$d/out.png"
  jpeg "$d/out.png" "$1" 86
}

about_oven() {
  local W=1200 H=900 d="$work/oven"; mkdir -p "$d"
  magick -size ${W}x${H} -define gradient:angle=180 gradient:'#6b3a24-#2c140b' "$d/bg.png"
  soft black "$d/glow.png" -fill '#ff9a4a' -draw 'ellipse 150,150 140,120 0,360' -blur 0x40
  layer -fill '#8d4a2c' -draw 'path "M 260,760 L 260,430 A 340,320 0 0 1 940,430 L 940,760 Z"' "$d/ring.png"
  magick -size 600x600 radial-gradient:'#ffe2a0-#c4451a' "$d/fire-fill.png"
  magick -size ${W}x${H} xc:'#c4451a' "$d/fire-fill.png" -geometry +300+260 -composite "$d/fire-full.png"
  layer -fill white -draw 'path "M 340,760 L 340,450 A 260,240 0 0 1 860,450 L 860,760 Z"' "$d/mouth-mask.png"
  magick "$d/fire-full.png" "$d/mouth-mask.png" -compose CopyOpacity -composite "$d/mouth.png"
  layer -fill 'rgba(60,20,6,0.85)' -draw 'path "M 340,760 L 340,640 Q 600,600 860,640 L 860,760 Z"' -blur 0x6 "$d/floor.png"
  layer -fill '#b0652c' -draw 'ellipse 500,640 92,52 0,360 ellipse 700,646 100,54 0,360' \
    -fill '#e9a557' -draw 'ellipse 490,622 60,22 0,360 ellipse 690,628 66,22 0,360' "$d/loaves-raw.png"
  magick "$d/loaves-raw.png" -blur 0x3 "$d/loaves.png"
  layer -fill '#4a2414' -draw 'rectangle 0,760 1200,900' -fill '#7a4528' -draw 'rectangle 0,756 1200,772' "$d/hearth.png"
  layer -fill '#c48650' -draw 'roundrectangle 180,790 1020,826 18,18' -fill '#9d6235' -draw 'roundrectangle 1000,800 1200,816 8,8' "$d/peel.png"
  magick "$d/bg.png" "$d/glow.png" -compose Screen -composite -compose Over \
    "$d/ring.png" -composite "$d/mouth.png" -composite \
    "$d/floor.png" -composite "$d/loaves.png" -composite "$d/hearth.png" -composite "$d/peel.png" -composite "$d/out.png"
  jpeg "$d/out.png" "$1" 84
}

hero_harbour() {
  local W=1600 H=900 d="$work/harbour"; mkdir -p "$d"
  magick -size ${W}x${H} gradient:'#bfe3ea-#f3e6d6' "$d/sky.png"
  soft black "$d/glow.png" -fill '#fff6e2' -draw 'circle 120,92 120,200' -blur 0x46
  soft black "$d/sun.png" -fill '#fffaf0' -draw 'circle 120,92 120,118' -blur 0x5
  layer -fill '#7fb3bd' -draw 'path "M 0,560 L 0,470 Q 140,420 300,470 Q 420,500 560,450 Q 700,400 860,470 Q 930,500 960,500 L 960,560 Z"' -blur 0x2 "$d/hills.png"
  layer -fill '#5f9aa6' -draw 'path "M 900,560 L 900,500 Q 1100,440 1300,490 Q 1450,520 1600,470 L 1600,560 Z"' -blur 0x2 "$d/hills2.png"
  magick -size ${W}x340 gradient:'#4f97a3-#1f5866' "$d/sea-fill.png"
  magick -size ${W}x${H} xc:none "$d/sea-fill.png" -geometry +0+560 -composite "$d/sea.png"
  layer -fill none -stroke 'rgba(255,244,214,0.8)' -strokewidth 6 \
    -draw 'stroke-linecap round line 420,582 540,582 line 400,606 560,606 line 430,632 530,632 line 390,664 570,664 line 440,700 520,700 line 410,744 550,744' -blur 0x3 "$d/shimmer.png"
  layer -fill none -stroke 'rgba(255,255,255,0.35)' -strokewidth 4 \
    -draw 'stroke-linecap round line 120,640 300,640 line 520,700 760,700 line 980,660 1100,660 line 1240,760 1480,760 line 200,800 420,800 line 700,840 900,840' "$d/waves.png"
  layer -fill '#163f4a' \
    -draw 'polygon 1040,700 1260,700 1230,740 1070,740' -draw 'rectangle 1140,520 1148,700' -draw 'polygon 1150,530 1150,690 1240,690' \
    -draw 'polygon 300,640 420,640 404,662 316,662' -draw 'rectangle 356,560 360,640' -draw 'polygon 362,566 362,632 410,632' "$d/boats.png"
  layer -fill '#2b2620' -draw 'rectangle 0,580 250,596' \
    -draw 'rectangle 30,596 42,700 rectangle 130,596 142,700 rectangle 230,596 242,700' "$d/pier.png"
  magick "$d/sky.png" "$d/glow.png" -compose Screen -composite "$d/sun.png" -compose Screen -composite -compose Over \
    "$d/hills.png" -composite "$d/hills2.png" -composite "$d/sea.png" -composite \
    "$d/shimmer.png" -composite "$d/waves.png" -composite "$d/boats.png" -composite "$d/pier.png" -composite "$d/out.png"
  jpeg "$d/out.png" "$1" 84
}

small_replacement() {
  local W=600 H=400 d="$work/small"; mkdir -p "$d"
  magick -size ${W}x${H} -define gradient:angle=135 gradient:'#d7efe9-#7fc0b8' "$d/bg.png"
  soft black "$d/glow.png" -fill '#f2fbf8' -draw 'circle 40,30 40,80' -blur 0x24
  layer -fill 'rgba(20,60,60,0.35)' -draw 'ellipse 310,330 170,24 0,360' -blur 0x14 \
    -fill '#f4b860' -draw 'circle 300,210 300,330' \
    -fill '#fbe3b0' -draw 'circle 300,210 300,290' \
    -fill '#d9534f' -draw 'circle 300,164 300,184 circle 340,182 340,202 circle 346,226 346,246 circle 314,254 314,274 circle 274,250 274,270 circle 256,212 256,232 circle 268,176 268,196 circle 300,212 300,234' "$d/tart.png"
  magick "$d/bg.png" "$d/glow.png" -compose Screen -composite -compose Over "$d/tart.png" -composite \
    -strip -depth 8 -define png:compression-level=9 "PNG24:$1"
}

hero_studio() {
  local W=1600 H=1000 d="$work/studio"; mkdir -p "$d"
  magick -size ${W}x${H} -define gradient:angle=135 gradient:'#16183a-#2c2760' "$d/bg.png"
  soft black "$d/glow.png" -fill '#3b3f9a' -draw 'circle 300,80 300,220' -blur 0x50
  layer -fill '#6c86ff' -draw 'circle 640,420 640,700' "$d/c.png"
  layer -fill '#ff7a59' -draw 'circle 1060,470 1060,800' "$d/a.png"
  layer -fill '#ffd166' -draw 'roundrectangle 300,560 860,820 60,60' "$d/b.png"
  layer -fill none -stroke 'rgba(255,255,255,0.55)' -strokewidth 4 -draw 'circle 1230,250 1230,370' -draw 'line 120,900 1500,520' "$d/e.png"
  magick "$d/bg.png" "$d/glow.png" -compose Screen -composite -compose Over \
    "$d/c.png" -composite "$d/a.png" -compose Multiply -composite -compose Over "$d/a.png" -compose Dissolve -define compose:args=78 -composite \
    -compose Over "$d/b.png" -composite "$d/e.png" -composite \
    -quality 82 -define webp:method=6 "$1"
}

site="$root/sites/harbor-bakery/images"
hero_bakery "$site/hero.jpg"
card_sourdough "$site/sourdough.jpg"
card_pastries "$site/pastries.jpg"
card_coffee "$site/coffee.jpg"
about_oven "$site/oven.jpg"
hero_harbour "$root/images/replacement-hero.jpg"
small_replacement "$root/images/replacement-small.png"
mkdir -p "$root/sites/northwind-studio/dist/assets"
hero_studio "$root/sites/northwind-studio/dist/assets/hero-8c3e51d7.webp"
