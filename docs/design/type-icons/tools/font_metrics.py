import sys
from fontTools.ttLib import TTFont
for p in sys.argv[1:]:
    f=TTFont(p)
    os2=f['OS/2']; upm=f['head'].unitsPerEm
    name=f['name']
    def n(i):
        r=name.getName(i,3,1,0x409) or name.getName(i,1,0,0)
        return str(r) if r else ''
    feats=set()
    if 'GSUB' in f and f['GSUB'].table.FeatureList:
        feats={fr.FeatureTag for fr in f['GSUB'].table.FeatureList.FeatureRecord}
    axes=[(a.axisTag,a.minValue,a.maxValue) for a in f['fvar'].axes] if 'fvar' in f else []
    cmap=f.getBestCmap()
    # tabular check: advance widths of digits
    hm=f['hmtx']; digits=[hm[cmap[ord(c)]][0] for c in '0123456789']
    print(f"{p.split('/')[-1]}: family={n(1)!r} ver={n(5)[:40]!r} upm={upm} xh={os2.sxHeight/upm:.3f} cap={os2.sCapHeight/upm:.3f} xh/cap={os2.sxHeight/max(os2.sCapHeight,1):.3f} axes={axes} glyphs={len(cmap)} digits_equal={len(set(digits))==1} tnum={'tnum' in feats} feats={sorted(feats)}")
    print("   license:", n(13)[:160].replace('\n',' '), '|', n(14))
