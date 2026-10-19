"""Fail when a template or TypeScript icon reference has no sprite symbol, or a symbol is unused.

Usage: python3 -I scripts/design/check_icons.py (from the repository root)
"""
import pathlib, re, sys

sprite = set(re.findall(r'<symbol id="i-([a-z0-9-]+)"', pathlib.Path("assets/static/img/icons.svg").read_text()))
ui = pathlib.Path("frontend/ui.ts").read_text()
typed = set(re.findall(r'"([a-z0-9-]+)"', re.search(r"export type IconName =(.*?);", ui, re.S).group(1)))
views = "".join(p.read_text() for p in pathlib.Path("assets/views").rglob("*.html"))
ts = "".join(p.read_text() for p in pathlib.Path("frontend").rglob("*.ts") if "agent" not in p.parts)
in_views = set(re.findall(r"icons\.svg#i-([a-z0-9-]+)", views))
used = in_views | {i for i in sprite if f'"{i}"' in ts} | {f"align-{a}" for a in ("left", "center", "right", "justify") if "`align-${" in ts}

errors = [f"template uses missing symbol i-{i}" for i in sorted(in_views - sprite)]
errors += [f"IconName lists i-{i}, which the sprite lacks" for i in sorted(typed - sprite)]
errors += [f"sprite symbol i-{i} is missing from IconName" for i in sorted(sprite - typed)]
errors += [f"sprite symbol i-{i} is unused" for i in sorted(sprite - used)]
print("\n".join(errors) or f"icons ok: {len(sprite)} symbols, all used and typed")
sys.exit(1 if errors else 0)
