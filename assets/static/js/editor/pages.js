/** "Our story | Harbor Bakery" shows as "Our story"; the home page is always "Home". */
export function pageLabel(page, siteName) {
    if (page.path === "index.html")
        return "Home";
    const name = siteName.trim().toLowerCase();
    const parts = page.title.split(/\s+[|·•–—-]\s+/).map((p) => p.trim()).filter(Boolean);
    const kept = parts.length > 1 ? parts.filter((p) => p.toLowerCase() !== name) : parts;
    return kept.join(" · ") || page.path.replace(/\.html$/, "");
}
/** "Our Offers!" becomes "our-offers". */
export function slugify(name) {
    return name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
