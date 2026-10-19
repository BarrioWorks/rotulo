import re,sys,collections
css=open(sys.argv[1]).read()
css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
props=['font-family','font-size','font-weight','line-height','letter-spacing','font','text-transform','font-variant-numeric','font-feature-settings']
# naive flatten: handle @media by just scanning blocks
out=[]
for m in re.finditer(r'([^{}]+)\{([^{}]*)\}',css):
    sel=' '.join(m.group(1).split()); body=m.group(2)
    decl={}
    for d in body.split(';'):
        if ':' in d:
            k,v=d.split(':',1);k=k.strip();v=v.strip()
            if k in props: decl[k]=v
    if decl: out.append((sel,decl))
for sel,d in out:
    print(sel,'=>','; '.join(f'{k}:{v}' for k,v in d.items()))
print('\n# value counts')
for p in props:
    c=collections.Counter(d[p] for s,d in out if p in d)
    if c: print(p, dict(c.most_common()))
