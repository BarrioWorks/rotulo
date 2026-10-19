/** Where the floating toolbar goes. Pure, so the rules are tested without a browser. */
const ORDER = ["above-start", "below-start", "above-end", "below-end", "pinned", "docked"];
const INSET = 4;
export function intersect(a, b) {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
export function placeToolbar({ target, canvas, obstructions, size, previous = null, gap = 8 }) {
    const visible = intersect(target, canvas);
    if (!visible)
        return { kind: "offscreen", direction: target.y + target.height <= canvas.y ? "above" : "below" };
    const minX = canvas.x + INSET;
    const maxX = canvas.x + canvas.width - size.width - INSET;
    const clampX = (x) => Math.max(minX, Math.min(x, maxX));
    const topBars = obstructions.filter((o) => o.y < canvas.y + canvas.height / 2);
    const pinnedTop = Math.max(canvas.y, ...topBars.map((o) => o.y + o.height)) + gap;
    function position(candidate) {
        const right = visible.x + visible.width;
        const bottom = visible.y + visible.height;
        switch (candidate) {
            case "above-start": return { x: clampX(visible.x), y: visible.y - gap - size.height };
            case "below-start": return { x: clampX(visible.x), y: bottom + gap };
            case "above-end": return { x: clampX(right - size.width), y: visible.y - gap - size.height };
            case "below-end": return { x: clampX(right - size.width), y: bottom + gap };
            case "pinned": return { x: clampX(visible.x), y: pinnedTop };
            case "docked": return { x: clampX(canvas.x + (canvas.width - size.width) / 2), y: canvas.y + canvas.height - size.height - 12 };
        }
    }
    function valid(candidate) {
        if (candidate === "docked")
            return true;
        const { x, y } = position(candidate);
        const box = { x, y, width: size.width, height: size.height };
        const inside = y >= canvas.y + INSET && y + size.height <= canvas.y + canvas.height - INSET && size.width <= canvas.width - 2 * INSET;
        if (!inside || obstructions.some((o) => intersect(box, o)))
            return false;
        if (candidate === "pinned")
            return visible.height > canvas.height * 0.5;
        return !intersect(box, visible);
    }
    const sticky = previous !== null && previous !== "pinned" && previous !== "docked" && valid(previous);
    const chosen = sticky ? previous : (ORDER.find(valid) ?? "docked");
    return { kind: "placed", ...position(chosen), candidate: chosen };
}
