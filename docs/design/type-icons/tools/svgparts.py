import re

def inner(svg_text):
    body = re.search(r'<svg[^>]*>(.*)</svg>', svg_text, re.S).group(1)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    body = re.sub(r'<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*/>', '', body)
    return ' '.join(body.split()).replace(' />', '/>')

def viewbox(svg_text):
    return re.search(r'viewBox="([^"]+)"', svg_text).group(1)
