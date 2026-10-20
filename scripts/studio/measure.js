// Paste into the editor page (preview_evaluate). Resolves to layout, load and memory numbers.
// Run once right after load and once after the interaction under test; compare the JSON.
(async () => {
  const vw = innerWidth, vh = innerHeight;
  const visible = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(w), h: Math.round(h) };
  };
  const frame = document.querySelector("iframe[data-canvas]") || document.querySelector("iframe");
  const fr = visible(frame);
  const persistent = [...document.querySelectorAll("aside, nav, [data-rail]")]
    .map((el) => ({ el, r: visible(el) }))
    .filter(({ el, r }) => r && r.w * r.h > 0 && !el.closest("[hidden],dialog:not([open])"))
    .map(({ el, r }) => ({ tag: el.tagName.toLowerCase(), cls: el.className, ...r }));
  const nav = performance.getEntriesByType("navigation")[0];
  // Layout shifts are only readable through a buffered observer.
  const cls = await new Promise((done) => {
    let sum = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) sum += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => done(sum), 50);
  });
  const mem = performance.memory;
  return {
    viewport: { w: vw, h: vh },
    canvas: fr,
    canvasShare: fr ? +((fr.w * fr.h) / (vw * vh)).toFixed(3) : 0,
    persistentPanels: persistent,
    load: nav && {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      transferKB: Math.round(nav.transferSize / 1024),
    },
    layoutShift: +cls.toFixed(4),
    heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null,
    domNodes: document.getElementsByTagName("*").length,
    resources: performance.getEntriesByType("resource").length,
  };
})();
