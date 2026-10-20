// Paste into preview_evaluate on the homepage. Bypasses the cache, loads every lazy image,
// and returns the scroll positions to capture for a full-page stitch at the current viewport.
(async () => {
  for (const url of ["/static/css/app.css", "/static/css/marketing.css", "/static/js/marketing.js"]) {
    await fetch(url, { cache: "reload" });
  }
  for (const img of document.querySelectorAll("img[loading=lazy]")) img.loading = "eager";
  await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  await document.fonts.ready;
  const height = document.documentElement.scrollHeight;
  const step = innerHeight;
  const stops = [];
  for (let y = 0; y < height; y += step) stops.push(Math.min(y, height - step));
  return { height, width: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth, stops };
})()
