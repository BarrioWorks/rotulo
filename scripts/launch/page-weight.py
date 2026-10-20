#!/usr/bin/env python3
"""Inventory HTML assets with curl. No browser timing or dependency install."""
import re
import runpy
import subprocess
import sys
import urllib.parse

# Reuse the adjacent HTML parser without creating __pycache__ files.
Document = runpy.run_path(__file__.replace('page-weight.py', 'seo-check.py'))['Document']
PAGES = ('/', '/compatible-exports', '/visual-html-editor', '/static-website-hosting', '/login')
FONT_EXTENSIONS = ('.woff', '.woff2', '.ttf', '.otf', '.eot')


def fetch(url, redirects=0):
    if redirects > 5:
        raise ValueError('Too many redirects')
    result = subprocess.run(['curl', '--silent', '--show-error', '--max-time', '20',
                             '--dump-header', '-', url], capture_output=True, check=True)
    head, body = result.stdout.split(b'\r\n\r\n', 1)
    lines = head.decode('latin1').splitlines()
    code = int(lines[0].split()[1])
    headers = dict(line.lower().split(':', 1) for line in lines[1:] if ':' in line)
    headers = {k: v.strip() for k, v in headers.items()}
    if 300 <= code < 400 and 'location' in headers:
        return fetch(urllib.parse.urljoin(url, headers['location']), redirects + 1)
    return code, headers, body


def candidates(value):
    # HTML launch fixtures use ordinary URLs without commas in their names.
    choices = []
    for item in value.split(','):
        bits = item.split()
        if bits:
            try:
                rank = float(bits[1][:-1]) if len(bits) > 1 else 1
            except ValueError:
                rank = 1
            choices.append((rank, bits[0]))
    return [max(choices, key=lambda item: item[0])[1]] if choices else []


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5150').rstrip('/')
    cache = {}
    failures = 0
    flags = 0

    def get(url):
        nonlocal failures
        if url not in cache:
            try:
                cache[url] = fetch(url)
            except (OSError, ValueError, subprocess.SubprocessError) as error:
                print(f'FAIL request {url}: {error}')
                cache[url] = (0, {}, b'')
            if cache[url][0] != 200:
                failures += 1
        return cache[url]

    print('Byte thresholds: initial > 1500000; single image > 300000. Cold cache per page.')
    for path in PAGES:
        url = base + path
        code, headers, html = get(url)
        print(f'\nPAGE {path}\nHTML {len(html)} bytes status={code} encoding={headers.get("content-encoding", "none")}')
        doc = Document(html.decode('utf-8', errors='replace')).root
        resources = {}
        blocking = []
        nonlazy = []

        def add(ref, kind, eager=True):
            target = urllib.parse.urljoin(url, ref)
            parsed = urllib.parse.urlsplit(target)
            if parsed.scheme not in ('http', 'https'):
                return
            target = urllib.parse.urlunsplit((*parsed[:4], ''))
            if target in resources:
                resources[target]['eager'] |= eager
            else:
                resources[target] = {'kind': kind, 'eager': eager}

        images = list(doc.all('img'))
        for index, img in enumerate(images):
            eager = img.attrs.get('loading', '').lower() != 'lazy'
            if index >= 2 and eager:
                nonlazy.append(f'line {img.line}: {img.attrs.get("src", "")}')
            for ref in [img.attrs.get('src', ''), *candidates(img.attrs.get('srcset', ''))]:
                if ref:
                    add(ref, 'image', eager)
            parent = img.parent
            if parent and parent.tag == 'picture':
                for source in parent.all('source'):
                    for ref in candidates(source.attrs.get('srcset', '')):
                        add(ref, 'image', eager)
        for node in doc.all():
            a = node.attrs
            in_head = any(p.tag == 'head' for p in node.ancestors())
            if node.tag == 'link' and a.get('href'):
                rel = a.get('rel', '').lower().split()
                if 'stylesheet' in rel:
                    add(a['href'], 'CSS')
                    if in_head:
                        blocking.append(f'CSS line {node.line}: {a["href"]} media={a.get("media", "all")}')
                elif 'preload' in rel and a.get('as') in ('font', 'image', 'script', 'style'):
                    add(a['href'], {'script': 'JS', 'style': 'CSS'}.get(a['as'], a['as']))
            if node.tag == 'script' and a.get('src'):
                add(a['src'], 'JS')
                if in_head and a.get('type', '').lower() != 'module' and 'defer' not in a and 'async' not in a:
                    blocking.append(f'JS line {node.line}: {a["src"]}')
            if node.tag == 'style' and in_head:
                blocking.append(f'inline CSS line {node.line} ({len(node.text().encode())} bytes included in HTML)')
        # CSS imports and url() assets are resolved relative to their stylesheet.
        pending = [u for u, r in resources.items() if r['kind'] == 'CSS']
        visited = set()
        while pending:
            css_url = pending.pop()
            if css_url in visited:
                continue
            visited.add(css_url)
            _, _, body = get(css_url)
            css = re.sub(r'/\*.*?\*/', '', body.decode('utf-8', errors='replace'), flags=re.S)
            imports = re.findall(r'@import\s+(?:url\(\s*)?[\'\"]([^\'\"]+)', css, re.I)
            refs = re.findall(r'url\(\s*[\'\"]?([^\'\"\s)]+)', css, re.I)
            for ref in dict.fromkeys(imports + refs):
                absolute = urllib.parse.urljoin(css_url, ref)
                ext = urllib.parse.urlsplit(absolute).path.lower()
                kind = 'CSS' if ref in imports or ext.endswith('.css') else 'font' if ext.endswith(FONT_EXTENSIONS) else 'image'
                add(absolute, kind)
                if kind == 'CSS' and absolute not in visited:
                    pending.append(absolute)
        initial = len(html)
        all_bytes = len(html)
        for target, resource in sorted(resources.items()):
            status, hdrs, body = get(target)
            size = len(body)
            all_bytes += size
            eager = resource['eager']
            if eager:
                initial += size
            print(f'{resource["kind"]} {size} bytes {"eager" if eager else "lazy"} status={status} encoding={hdrs.get("content-encoding", "none")} type={hdrs.get("content-type", "unknown")} {target}')
            if resource['kind'] == 'image' and not hdrs.get('content-type', '').lower().startswith('image/'):
                flags += 1
                print(f'FLAG image response is not an image: {target}')
            if resource['kind'] == 'image' and size > 300000:
                flags += 1
                print(f'FLAG image exceeds 300000 bytes: {target}')
        print('HEAD render-blocking: ' + ('; '.join(blocking) or 'none'))
        print('Images after first two without loading=lazy: ' + ('; '.join(nonlazy) or 'none'))
        if nonlazy:
            flags += len(nonlazy)
        print(f'INITIAL {initial} bytes; ALL inventoried {all_bytes} bytes; {len(resources)} unique resource URLs')
        if initial > 1500000:
            flags += 1
            print('FLAG initial weight exceeds 1500000 bytes')
    print(f'\nSUMMARY {failures} request failures, {flags} flags')
    return int(bool(failures or flags))


if __name__ == '__main__':
    sys.exit(main())
