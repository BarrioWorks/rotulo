#!/usr/bin/env python3
"""Check anonymous launch SEO responses. Standard library only."""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

PATHS = ('/', '/compatible-exports', '/visual-html-editor', '/static-website-hosting')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag='', attrs=(), parent=None, line=0):
        self.tag, self.attrs, self.parent, self.line = tag, dict(attrs), parent, line
        self.children = []

    def text(self):
        return ''.join(c if isinstance(c, str) else c.text() for c in self.children)

    def all(self, tag=None):
        for child in self.children:
            if isinstance(child, Node):
                if tag is None or child.tag == tag:
                    yield child
                yield from child.all(tag)

    def ancestors(self):
        node = self.parent
        while node:
            yield node
            node = node.parent


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.current = self.root
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current, self.getpos()[0])
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for node in [self.current, *self.current.ancestors()]:
            if node.tag == tag:
                self.current = node.parent
                break

    def handle_data(self, data):
        self.current.children.append(data)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(url, headers=None):
    try:
        response = urllib.request.build_opener(NoRedirect).open(
            urllib.request.Request(url, headers=headers or {}), timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


def normalized(text):
    return ' '.join(text.split())


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5150').rstrip('/')
    origin = urllib.parse.urlsplit(base)
    if origin.scheme not in ('http', 'https') or not origin.netloc or origin.path:
        raise SystemExit('Base URL must be an HTTP(S) origin without a path')
    failed = 0
    checks = 0
    cache = {}

    def check(ok, label, detail=''):
        nonlocal failed, checks
        checks += 1
        failed += not ok
        print(f"{'PASS' if ok else 'FAIL'} {label}" + (f' | {detail}' if detail else ''))

    def get(path):
        url = urllib.parse.urljoin(base + '/', path)
        if url not in cache:
            try:
                cache[url] = fetch(url)
            except (OSError, ValueError) as error:
                cache[url] = (0, {}, str(error).encode())
        return cache[url]

    titles, descriptions = set(), set()
    for path in PATHS:
        status, headers, body = get(path)
        doc = Document(body.decode('utf-8', errors='replace')).root
        check(status == 200, f'{path} status', str(status))
        title_nodes = list(doc.all('title'))
        title = normalized(title_nodes[0].text()) if title_nodes else ''
        check(len(title_nodes) == 1 and 30 <= len(title) <= 65 and title not in titles,
              f'{path} unique title, one, 30..65 chars', f'{len(title)} chars: {title}')
        titles.add(title)
        metas = list(doc.all('meta'))
        def meta(name):
            return [n.attrs.get('content', '') for n in metas
                    if (n.attrs.get('name') or n.attrs.get('property', '')).lower() == name]
        descs = meta('description')
        desc = descs[0] if descs else ''
        check(len(descs) == 1 and 70 <= len(desc) <= 160 and desc not in descriptions,
              f'{path} unique description, one, 70..160 chars', f'{len(desc)} chars')
        descriptions.add(desc)
        canonicals = [n.attrs.get('href', '') for n in doc.all('link')
                      if 'canonical' in n.attrs.get('rel', '').lower().split()]
        check(canonicals == [base + path], f'{path} absolute self-canonical', repr(canonicals))
        robots = meta('robots')
        tokens = {x.strip().lower() for x in ','.join(robots).split(',')}
        check(len(robots) == 1 and tokens == {'index', 'follow'}
              and 'noindex' not in headers.get('X-Robots-Tag', '').lower(), f'{path} index, follow')
        for name in ('og:title', 'og:description', 'og:url', 'og:image', 'twitter:card'):
            check(bool(meta(name)) and all(meta(name)), f'{path} {name}')
        check(len(list(doc.all('h1'))) == 1, f'{path} exactly one h1')
        headings = [n for n in doc.all() if n.tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6')]
        skips = [f'line {b.line}: {a.tag} to {b.tag}' for a, b in zip(headings, headings[1:])
                 if int(b.tag[1]) > int(a.tag[1]) + 1]
        check(not skips, f'{path} heading order', '; '.join(skips))
        for n in doc.all('img'):
            decorative = n.attrs.get('role') == 'presentation' or any(
                p.attrs.get('aria-hidden', '').lower() == 'true' for p in n.ancestors())
            check('alt' in n.attrs and (bool(n.attrs['alt'].strip()) or decorative)
                  and all(n.attrs.get(k, '').isdigit() and int(n.attrs[k]) > 0 for k in ('width', 'height')),
                  f'{path} image alt and dimensions line {n.line}', n.attrs.get('src', ''))
        schemas = []
        for n in doc.all('script'):
            if n.attrs.get('type', '').lower() != 'application/ld+json':
                continue
            try:
                value = json.loads(n.text())
                schemas.append(value)
                check(True, f'{path} JSON-LD parses line {n.line}')
                forbidden = [key for obj in walk(value) for key in obj
                             if key.lower() in {'aggregaterating', 'review', 'offers'}]
                check(not forbidden, f'{path} JSON-LD no ratings, reviews or offers', repr(forbidden))
            except ValueError as error:
                check(False, f'{path} JSON-LD parses line {n.line}', str(error))
        if path == '/':
            faq_nodes = [obj for schema in schemas for obj in walk(schema)
                         if 'FAQPage' in ([obj.get('@type')] if isinstance(obj.get('@type'), str) else obj.get('@type', []))]
            actual = [(q.get('name'), q.get('acceptedAnswer', {}).get('text'))
                      for obj in faq_nodes for q in obj.get('mainEntity', [])]
            visible = []
            for n in doc.all():
                if 'mk-faq-item' in n.attrs.get('class', '').split() and not any(
                    'hidden' in p.attrs or p.attrs.get('aria-hidden') == 'true' for p in [n, *n.ancestors()]):
                    visible.append((normalized(' '.join(x.text() for x in n.all('h3'))),
                                    normalized(' '.join(x.text() for x in n.all('p')))))
            check(bool(visible) and len(faq_nodes) == 1 and actual == visible,
                  '/ FAQPage matches visible questions and answers exactly', f'{len(actual)} schema / {len(visible)} visible')
        links = set()
        for n in doc.all('a'):
            href = n.attrs.get('href', '')
            url = urllib.parse.urlsplit(urllib.parse.urljoin(base + path, href))
            if (url.scheme, url.netloc) == (origin.scheme, origin.netloc):
                links.add(urllib.parse.urlunsplit((url.scheme, url.netloc, url.path or '/', url.query, '')))
        missing = [p for p in PATHS if p != path and base + p not in links]
        check(not missing, f'{path} links to other marketing pages', repr(missing))
        for url in sorted(links):
            code, _, _ = get(url)
            target = urllib.parse.urlsplit(url).path
            check(code == 200 or (target in ('/login', '/register', '/projects') and 300 <= code < 400),
                  f'{path} internal link {url}', str(code))
    for path in ('/login', '/register'):
        code, headers, body = get(path)
        tags = [n.attrs.get('content', '').lower() for n in Document(body.decode()).root.all('meta')
                if n.attrs.get('name', '').lower() == 'robots']
        check(code == 200 and any('noindex' in {v.strip() for v in t.split(',')} for t in tags), f'{path} meta noindex')
        check('noindex' in headers.get('X-Robots-Tag', '').lower(), f'{path} header noindex')
    code, headers, _ = get('/projects')
    check(300 <= code < 400 and urllib.parse.urljoin(base, headers.get('Location', '')) == base + '/login', '/projects anonymous redirect to login', str(code))
    code, _, _ = get('/launch-seo-missing-page-9d6c03')
    check(code == 404, 'missing path real 404', str(code))
    code, headers, robots_body = get('/robots.txt')
    robots = robots_body.decode(errors='replace')
    check(code == 200 and 'text/plain' in headers.get('Content-Type', ''), 'robots.txt status and text type')
    directives = [tuple(s.strip() for s in line.split(':', 1)) for line in robots.splitlines() if ':' in line]
    for path in ('/projects', '/api'):
        check(any(k.lower() == 'disallow' and v.rstrip('/') == path for k, v in directives), f'robots.txt disallows {path}')
    check(any(k.lower() == 'sitemap' and v == base + '/sitemap.xml' for k, v in directives), 'robots.txt names absolute sitemap')
    code, headers, body = get('/sitemap.xml')
    check(code == 200 and 'xml' in headers.get('Content-Type', ''), 'sitemap status and XML type')
    try:
        root = ET.fromstring(body)
        ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
        locs = [n.text for n in root.findall(f'{ns}url/{ns}loc')]
        check(root.tag == ns + 'urlset', 'sitemap valid XML urlset')
        check(len(locs) == len(PATHS) and set(locs) == {base + p for p in PATHS}, 'sitemap exactly four absolute marketing URLs, no private paths', repr(locs))
    except ET.ParseError as error:
        check(False, 'sitemap valid XML', str(error))
    try:
        code, _, customer_body = fetch(base + '/robots.txt', {'Host': 'furnace-hill-coffee.sites.localhost:5150'})
        check(customer_body != robots_body and (base + '/sitemap.xml').encode() not in customer_body,
              'customer host does not receive Pagehaven robots', str(code))
    except OSError as error:
        check(False, 'customer host request', str(error))
    print(f'SUMMARY {checks - failed} PASS, {failed} FAIL')
    return int(bool(failed))


if __name__ == '__main__':
    sys.exit(main())
