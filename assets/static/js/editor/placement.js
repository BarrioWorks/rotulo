/** Where the floating toolbar goes. Pure, so the rules are tested without a browser. */
/** Spots next to the selection, best first. Pinned is for selections taller than half the canvas. */
/** How far the toolbar stays inside the canvas edges. */
export const TOOLBAR_INSET = 4;
const INSET = TOOLBAR_INSET;
/** An overlap this short (a descender, a hairline) does not count as covering content. */
const GRAZE = 3;
export function intersect(a, b) {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
/** How much of the page's content a toolbar at `box` would cover, in square pixels. */
export function coverage(box, obstacles) {
    let area = 0;
    for (const o of obstacles) {
        const hit = intersect(box, o);
        if (hit && hit.height > GRAZE && hit.width > GRAZE)
            area += hit.width * hit.height;
    }
    return area;
}
function offscreenDirection(target, canvas) {
    if (target.y + target.height <= canvas.y)
        return "above";
    if (target.y >= canvas.y + canvas.height)
        return "below";
    return target.x + target.width <= canvas.x ? "left" : "right";
}
export function placeToolbar({ target, canvas, size, obstructions, editing = false, banner = false, gap = 8 }) {
    if (!intersect(target, canvas))
        return { kind: "offscreen", direction: offscreenDirection(target, canvas) };
    const x = Math.max(canvas.x + INSET, Math.min(target.x, canvas.x + canvas.width - size.width - INSET));
    const top = canvas.y + INSET;
    const bottom = canvas.y + canvas.height - size.height - INSET;
    const above = target.y - size.height - gap;
    const below = target.y + target.height + gap;
    if (banner && target.y <= canvas.y + gap && target.width >= canvas.width * .9) {
        const navBottom = Math.max(top, ...obstructions.map((o) => o.y + o.height + gap));
        const y = Math.max(navBottom, Math.min(bottom, target.y + target.height - size.height - gap));
        return { kind: "placed", x, y: Math.min(bottom, y), candidate: "pinned" };
    }
    if (below <= bottom)
        return { kind: "placed", x, y: below, candidate: "below-start" };
    if (above >= top)
        return { kind: "placed", x, y: above, candidate: "above-start" };
    // If neither vertical side fits, keep the caption away from the live text.
    if (editing) {
        if (target.x - size.width - gap >= canvas.x + INSET)
            return { kind: "placed", x: target.x - size.width - gap, y: top, candidate: "left" };
        if (target.x + target.width + size.width + gap <= canvas.x + canvas.width - INSET)
            return { kind: "placed", x: target.x + target.width + gap, y: top, candidate: "right" };
    }
    if (editing)
        return { kind: "hidden" };
    return { kind: "placed", x, y: Math.max(top, Math.min(bottom, above)), candidate: "above-start" };
}
/** Candidate regions exclude both the caption and selection, including when the panel flips. */
export function placePanel({ caption, selection, canvas, size, gap = 8 }) {
    const inset = 8;
    const left = canvas.x + inset;
    const right = canvas.x + canvas.width - inset;
    const top = canvas.y + inset;
    const bottom = canvas.y + canvas.height - inset;
    const width = Math.min(size.width, Math.max(0, right - left));
    const x = Math.max(left, Math.min(caption.x, right - width));
    const aboveEnd = Math.min(bottom, Math.min(caption.y, selection.y) - gap);
    const belowStart = Math.max(top, Math.max(caption.y + caption.height, selection.y + selection.height) + gap);
    const above = { x, y: top, width, height: Math.max(0, aboveEnd - top) };
    const below = { x, y: belowStart, width, height: Math.max(0, bottom - belowStart) };
    const preferAbove = caption.y < selection.y;
    const vertical = preferAbove ? [above, below] : [below, above];
    const unionLeft = Math.min(caption.x, selection.x);
    const unionRight = Math.max(caption.x + caption.width, selection.x + selection.width);
    const sides = [
        { x: unionRight + gap, y: top, width: Math.max(0, right - unionRight - gap), height: Math.max(0, bottom - top) },
        { x: left, y: top, width: Math.max(0, unionLeft - gap - left), height: Math.max(0, bottom - top) },
    ].filter((region) => region.width >= width);
    const room = [...vertical, ...sides].find((region) => region.height >= size.height)
        ?? [...vertical, ...sides].reduce((best, region) => region.height > best.height ? region : best, above);
    const height = Math.min(size.height, room.height);
    const y = room === above ? aboveEnd - height : room === below ? belowStart
        : Math.max(top, Math.min(caption.y, bottom - height));
    return { x: room.x, y: Math.max(top, Math.min(y, bottom - height)), width, height };
}
/** The toolbar's widest size. Mirrors the `max-width` of `.ftb` in editor.css. */
export const TOOLBAR_MAX_WIDTH = 640;
/**
 * Gives up items in `order` until the row fits `available`. `width` is the row as measured
 * without the More button; `more` is what adding More costs, paid once, the first time an action
 * moves into it, unless `hasMore` says the row already shows it.
 */
export function fitRow({ width, available, order, more, hasMore }) {
    let total = width + (hasMore ? more : 0);
    let withMore = hasMore;
    const collapsed = [];
    for (const item of order) {
        if (total <= available)
            break;
        total -= item.width;
        if (item.into === "more" && !withMore) {
            withMore = true;
            total += more;
        }
        collapsed.push(item.key);
    }
    return { collapsed, fits: total <= available };
}
/**
 * The order a selection's toolbar gives things up: actions from the last (least used) back,
 * except that an action showing a detail first loses the detail, so on a phone "Link" stays
 * and only its destination goes.
 */
export function collapseOrder(actions) {
    const order = [];
    for (let i = actions.length - 1; i >= 0; i--) {
        const a = actions[i];
        if (a.detail > 0) {
            order.push({ key: `${a.key}:detail`, width: a.detail, into: "drop" });
            order.push({ key: a.key, width: a.width - a.detail, into: "more" });
        }
        else {
            order.push({ key: a.key, width: a.width, into: "more" });
        }
    }
    return order;
}
