import sys
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
pairs=[l.split() for l in sys.stdin if l.strip()]
for p in pairs:
    print(f"{p[2] if len(p)>2 else ''}\t{p[0]} on {p[1]}\t{cr(p[0],p[1]):.2f}")
