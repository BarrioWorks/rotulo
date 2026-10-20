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
export function placeToolbar({ target, canvas, size, gap = 8 }) {
    if (!intersect(target, canvas))
        return { kind: "offscreen", direction: offscreenDirection(target, canvas) };
    const x = Math.max(canvas.x + INSET, Math.min(target.x, canvas.x + canvas.width - size.width - INSET));
    const below = target.y + target.height + gap;
    if (below + size.height <= canvas.y + canvas.height - INSET)
        return { kind: "placed", x, y: below, candidate: "below-start" };
    return { kind: "placed", x, y: Math.max(canvas.y + INSET, target.y - size.height - gap), candidate: "above-start" };
}
/** Properties open beyond the caption, away from the selected element. */
export function placePanel({ caption, selection, canvas, size, gap = 8 }) {
    const above = caption.y < selection.y;
    return {
        x: Math.max(canvas.x + INSET, Math.min(caption.x, canvas.x + canvas.width - size.width - INSET)),
        y: above ? caption.y - gap - size.height : caption.y + caption.height + gap,
        width: size.width, height: size.height,
    };
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
