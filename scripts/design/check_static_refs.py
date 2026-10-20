"""Every /static/... path written in a view or a stylesheet must exist under assets/static."""
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[2]
static = root / "assets" / "static"
pattern = re.compile(r"/static/([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)")

missing = []
for source in [*root.glob("assets/views/**/*.html"), *static.glob("css/*.css")]:
    for line_number, line in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
        for match in pattern.finditer(line):
            if not (static / match.group(1)).is_file():
                missing.append(f"{source.relative_to(root)}:{line_number}: /static/{match.group(1)}")

if missing:
    print("missing static files:", *missing, sep="\n  ")
    sys.exit(1)
print("static references ok")
