#!/usr/bin/env bash
# Zips each fixture site into fixtures/zips/<name>.zip. Entries are sorted, timestamped
# 2024-01-01 00:00:00 and mode 0644, so the same inputs always give byte-identical zips.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sites="$repo/fixtures/sites"
out="$repo/fixtures/zips"
mkdir -p "$out"

python3 -I - "$sites" "$out" <<'PY'
import os
import sys
import zipfile
from pathlib import Path

sites, out = Path(sys.argv[1]), Path(sys.argv[2])
STAMP = (2024, 1, 1, 0, 0, 0)

for site in sorted(p for p in sites.iterdir() if p.is_dir()):
    files = sorted(p for p in site.rglob("*") if p.is_file())
    target = out / f"{site.name}.zip"
    tmp = target.with_suffix(".zip.tmp")
    with zipfile.ZipFile(tmp, "w") as zf:
        for path in files:
            info = zipfile.ZipInfo(path.relative_to(site).as_posix(), STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.create_system = 3
            zf.writestr(info, path.read_bytes(), compresslevel=9)
    os.replace(tmp, target)
    print(f"{target.relative_to(out.parent.parent)}  {len(files)} files  {target.stat().st_size} bytes")
PY
