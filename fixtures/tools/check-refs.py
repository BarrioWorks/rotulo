"""Checks that every local reference in a static site resolves.

Usage: python3 -I check-refs.py SITE_ROOT [SITE_ROOT ...]

For each HTML file: href/src/srcset/poster targets exist, #fragments point at an id
in the target page, and non-void tags are balanced. For each CSS file: url() targets exist.
Absolute paths (/assets/x.js) resolve against SITE_ROOT, as they do when the site is served
from its own origin.
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
OPTIONAL_END = {"p", "li", "option", "tr", "td", "th", "dt", "dd"}
URL_ATTRS = {"href", "src", "poster", "action"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs = []
        self.ids = set()
        self.stack = []
        self.problems = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if value is None:
                continue
            if name == "id":
                self.ids.add(value)
            elif name in URL_ATTRS:
                self.refs.append((tag, name, value))
            elif name == "srcset":
                for candidate in value.split(","):
                    if candidate.strip():
                        self.refs.append((tag, name, candidate.split()[0]))
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID:
            self.problems.append(f"line {self.getpos()[0]}: end tag for void element </{tag}>")
            return
        while self.stack and self.stack[-1][0] != tag and self.stack[-1][0] in OPTIONAL_END:
            self.stack.pop()
        if not self.stack or self.stack[-1][0] != tag:
            self.problems.append(f"line {self.getpos()[0]}: unexpected </{tag}>")
            return
        self.stack.pop()

    def close(self):
        super().close()
        for tag, line in self.stack:
            if tag not in OPTIONAL_END:
                self.problems.append(f"line {line}: <{tag}> never closed")


def is_external(url):
    parts = urlsplit(url)
    return bool(parts.scheme) or url.startswith("//")


def resolve(root, source, url):
    path = unquote(urlsplit(url).path)
    if not path:
        return source
    base = root if path.startswith("/") else source.parent
    target = (base / path.lstrip("/")).resolve()
    if target.is_dir():
        target = target / "index.html"
    return target


def check_site(root):
    root = root.resolve()
    problems = []
    pages = {}
    for html in sorted(root.rglob("*.html")):
        page = Page()
        page.feed(html.read_text(encoding="utf-8"))
        page.close()
        pages[html] = page
        problems += [f"{html.relative_to(root)}: {p}" for p in page.problems]

    checked = 0
    for html, page in pages.items():
        for tag, attr, url in page.refs:
            if is_external(url) or url.startswith(("data:", "javascript:")):
                continue
            checked += 1
            target = resolve(root, html, url)
            where = f"{html.relative_to(root)}: <{tag} {attr}=\"{url}\">"
            if root not in target.parents and target != root:
                problems.append(f"{where} escapes the site root")
            elif not target.is_file():
                problems.append(f"{where} -> missing {target}")
            else:
                fragment = urlsplit(url).fragment
                if fragment and target.suffix == ".html":
                    ids = pages[target].ids if target in pages else set()
                    if fragment not in ids:
                        problems.append(f"{where} -> no id=\"{fragment}\" in {target.name}")

    for css in sorted(root.rglob("*.css")):
        for url in re.findall(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", css.read_text(encoding="utf-8")):
            if is_external(url) or url.startswith("data:"):
                continue
            checked += 1
            target = resolve(root, css, url)
            if not target.is_file():
                problems.append(f"{css.relative_to(root)}: url({url}) -> missing {target}")

    return len(pages), checked, problems


def main():
    failed = False
    for arg in sys.argv[1:]:
        count, checked, problems = check_site(Path(arg))
        status = "ok" if not problems else "FAIL"
        print(f"{status}  {arg}: {count} pages, {checked} local references")
        for p in problems:
            print(f"      {p}")
        failed |= bool(problems)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
