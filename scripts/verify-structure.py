#!/usr/bin/env python3
"""Verify structural editing against an isolated local Rótulo server."""
import io
import json
import sys
import socket
import uuid
import zipfile
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener

origin = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5151"
if urlparse(origin).hostname not in ("127.0.0.1", "localhost"):
    raise SystemExit("Use an isolated local development server.")
_resolve = socket.getaddrinfo
def local_dns(host, *args, **kwargs):
    return _resolve("127.0.0.1" if host.endswith(".localhost") else host, *args, **kwargs)
socket.getaddrinfo = local_dns
http = build_opener(HTTPCookieProcessor(CookieJar()))
email = f"structure-{uuid.uuid4().hex[:12]}@example.com"
password = "local-structure-verification"


def request(path, data=None, content_type="application/json", expected=200):
    raw = json.dumps(data).encode() if isinstance(data, dict) else data
    req = Request(origin + path, data=raw, headers={"Origin": origin, "Content-Type": content_type})
    try:
        with http.open(req) as response:
            status, body = response.status, response.read()
    except HTTPError as error:
        status, body = error.code, error.read()
    assert status == expected, (path, status, body.decode()[:500])
    return json.loads(body) if body.startswith(b"{") else body.decode()


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.stack = []
        self.nodes = {}
        self.order = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        key = attrs.get("data-ph-id") or attrs.get("id")
        parent = next((item[1] for item in reversed(self.stack) if item[1]), None)
        if key:
            self.nodes[key] = {"tag": tag, "parent": parent, "attrs": attrs}
            self.order.append(key)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append((tag, key))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                self.stack = self.stack[:index]
                break

    def element(self, html_id):
        return next(key for key, node in self.nodes.items() if node["attrs"].get("id") == html_id)


def preview():
    with http.open(state["preview_origin"] + "/") as response:
        return response.read().decode()


def edit(command, expected=200):
    global revision
    result = request(f"/api/projects/{pid}/edits", {"base_revision": revision, "page": "index.html", "edit": command}, expected=expected)
    if expected == 200:
        revision = result["revision"]
    return result


def history(action):
    global revision
    revision = request(f"/api/projects/{pid}/{action}", {"base_revision": revision})["revision"]


request("/register", urlencode({"name": "Structure verification", "email": email, "password": password}).encode(), "application/x-www-form-urlencoded")
archive = io.BytesIO()
fixture = Path(__file__).resolve().parent.parent / "fixtures/sites/editor-structure"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
    for file in fixture.iterdir():
        bundle.writestr(file.name, file.read_bytes())
boundary = "rotulo-" + uuid.uuid4().hex
body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="structure.zip"\r\nContent-Type: application/zip\r\n\r\n'.encode() + archive.getvalue() + f"\r\n--{boundary}--\r\n".encode())
project = request("/api/imports", body, "multipart/form-data; boundary=" + boundary, 201)
pid = project["project"]["pid"]
state = request(f"/api/projects/{pid}/editor")
revision = state["project"]["revision"]
page = Page(preview())
ids = {name: page.element(name) for name in ("hero-button", "hero-target", "hero-copy", "card-a", "card-b", "card-c", "card-grid", "moving-image", "image-target", "nav-items", "footer-columns")}

for source, target, position in [("hero-button", "hero-target", "inside"), ("card-c", "card-a", "before"), ("moving-image", "image-target", "inside")]:
    before_move = preview()
    edit({"op": "move_element", "element": ids[source], "target": ids[target], "position": position})
    after_move = preview()
    moved = Page(after_move)
    if position == "inside":
        assert moved.nodes[ids[source]]["parent"] == ids[target], source
    else:
        cards = [key for key in moved.order if moved.nodes[key]["parent"] == ids["card-grid"]]
        assert cards == [ids["card-c"], ids["card-a"], ids["card-b"]], cards
    history("undo")
    assert preview() == before_move, f"Undo did not restore {source} and its sibling order"
    history("redo")
    assert preview() == after_move, f"Redo did not restore the move of {source}"
print("PASS hero button, grid order, image move, undo and redo")

before = preview()
edit({"op": "move_element", "element": ids["hero-target"], "target": ids["hero-button"], "position": "inside"}, 422)
assert preview() == before
print("PASS invalid cycle leaves the persisted draft unchanged")

for target, kind in [("nav-items", "link"), ("footer-columns", "container")]:
    previous = set(Page(preview()).nodes)
    edit({"op": "insert_element", "element": ids[target], "position": "inside", "kind": kind})
    inserted = Page(preview())
    new_roots = [key for key in inserted.nodes if key not in previous and inserted.nodes[key]["parent"] == ids[target]]
    assert len(new_roots) == 1, (kind, new_roots)
    if kind == "link":
        assert inserted.nodes[new_roots[0]]["tag"] == "li"
        assert any(node["parent"] == new_roots[0] and node["tag"] == "a" for node in inserted.nodes.values())
    history("undo")
    assert set(Page(preview()).nodes) == previous
    history("redo")
print("PASS navigation item and footer column insertion with history")

previous = set(Page(preview()).nodes)
edit({"op": "duplicate_element", "element": ids["card-a"]})
assert len(Page(preview()).nodes) > len(previous)
history("undo")
assert set(Page(preview()).nodes) == previous
history("redo")
edit({"op": "rename_element", "element": ids["card-a"], "name": "Featured card"})
assert Page(preview()).nodes[ids["card-a"]]["attrs"].get("data-ph-name") == "Featured card"
print("PASS subtree duplication and editor organization names")

before_style = preview()
edit({"op": "set_style", "element": ids["hero-button"], "styles": {"width": "100%", "max-width": "320px", "border-radius": "12px", "opacity": "0.9"}})
after_style = preview()
assert "max-width: 320px" in Page(after_style).nodes[ids["hero-button"]]["attrs"]["style"]
for value in ["1.px", "calc(100% - 1px)", "5000px"]:
    edit({"op": "set_style", "element": ids["hero-button"], "styles": {"width": value}}, 422)
    assert preview() == after_style
history("undo")
assert preview() == before_style
history("redo")
assert preview() == after_style
print("PASS visual sizing, validation, exact undo and redo")

edit({"op": "insert_element", "element": ids["hero-target"], "position": "inside", "kind": "table"})
after_table = preview()
assert any(node["tag"] == "td" for node in Page(after_table).nodes.values())
history("undo")
assert preview() == after_style
history("redo")
assert preview() == after_table
print("PASS accessible table insertion persists through history")

state = request(f"/api/projects/{pid}/editor")
assert state["project"]["revision"] == revision
release = request(f"/api/projects/{pid}/publish", {"base_revision": revision}, expected=201)
with http.open(release["site_url"] + "/") as response:
    published = response.read().decode()
assert "data-ph-" not in published
live = Page(published)
assert live.nodes["hero-button"]["parent"] == "hero-target"
assert live.nodes["hero-button"]["attrs"]["class"] == "cta"
assert "max-width: 320px" in live.nodes["hero-button"]["attrs"]["style"]
assert "scope=\"col\"" in published
assert live.nodes["moving-image"]["parent"] == "image-target"
assert [key for key in live.order if live.nodes[key]["parent"] == "card-grid"][:2] == ["card-c", "card-a"]
assert "Featured card" not in published
print("PASS reload and local publish preserve edits and remove editor metadata")
result = {"origin": origin, "email": email, "password": password, "pid": pid, "preview_origin": state["preview_origin"], "site_url": release["site_url"], "revision": revision, "ids": ids}
Path("/tmp/rotulo-structure-session.json").write_text(json.dumps(result))
print(json.dumps({"pid": pid, "revision": revision, "site_url": release["site_url"]}))
