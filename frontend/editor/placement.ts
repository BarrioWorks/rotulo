/** Where the floating toolbar goes. Pure, so the rules are tested without a browser. */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Candidate = "above-start" | "below-start" | "above-end" | "below-end" | "right" | "left" | "pinned" | "docked";

export type Direction = "above" | "below" | "left" | "right";

export type Placement =
  /** `width` is set only when docked: the toolbar becomes a strip as wide as the canvas. */
  | { kind: "placed"; x: number; y: number; candidate: Candidate; width?: number }
  /** The selection is scrolled out of the canvas; the editor shows a pill pointing at it. */
  | { kind: "offscreen"; direction: Direction };

export interface PlacementInput {
  /** The selection, in app pixels. */
  target: Box;
  /** The visible canvas, in app pixels. The toolbar stays inside it. */
  canvas: Box;
  /** The site's own fixed bars, in app pixels. The toolbar never sits on them. */
  obstructions: Box[];
  /** Words and pictures around the selection, in app pixels. The toolbar avoids covering them. */
  obstacles?: Box[];
  size: { width: number; height: number };
  /** The candidate used last time. A spot next to the selection is kept while it stays clear, so the toolbar does not flip while scrolling. */
  previous?: Candidate | null;
  gap?: number;
}

/** Spots next to the selection, best first. Pinned is for selections taller than half the canvas. */
const ORDER: Candidate[] = ["above-start", "below-start", "above-end", "below-end", "right", "left", "pinned"];
const INSET = 4;
/** An overlap this short (a descender, a hairline) does not count as covering content. */
const GRAZE = 3;

export function intersect(a: Box, b: Box): Box | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

/** How much of the page's content a toolbar at `box` would cover, in square pixels. */
export function coverage(box: Box, obstacles: Box[]): number {
  let area = 0;
  for (const o of obstacles) {
    const hit = intersect(box, o);
    if (hit && hit.height > GRAZE && hit.width > GRAZE) area += hit.width * hit.height;
  }
  return area;
}

function offscreenDirection(target: Box, canvas: Box): Direction {
  if (target.y + target.height <= canvas.y) return "above";
  if (target.y >= canvas.y + canvas.height) return "below";
  return target.x + target.width <= canvas.x ? "left" : "right";
}

export function placeToolbar({ target, canvas, obstructions, obstacles = [], size, previous = null, gap = 8 }: PlacementInput): Placement {
  const visible = intersect(target, canvas);
  if (!visible) return { kind: "offscreen", direction: offscreenDirection(target, canvas) };

  const minX = canvas.x + INSET;
  const maxX = canvas.x + canvas.width - size.width - INSET;
  const clampX = (x: number) => Math.max(minX, Math.min(x, maxX));
  const topBars = obstructions.filter((o) => o.y < canvas.y + canvas.height / 2);
  const pinnedTop = Math.max(canvas.y, ...topBars.map((o) => o.y + o.height)) + gap;
  const right = visible.x + visible.width;
  const bottom = visible.y + visible.height;
  const sideY = Math.max(canvas.y + INSET, Math.min(visible.y, canvas.y + canvas.height - size.height - INSET));

  function position(candidate: Exclude<Candidate, "docked">): Box {
    const at = (x: number, y: number) => ({ x, y, width: size.width, height: size.height });
    switch (candidate) {
      case "above-start": return at(clampX(visible!.x), visible!.y - gap - size.height);
      case "below-start": return at(clampX(visible!.x), bottom + gap);
      case "above-end": return at(clampX(right - size.width), visible!.y - gap - size.height);
      case "below-end": return at(clampX(right - size.width), bottom + gap);
      case "right": return at(right + gap, sideY);
      case "left": return at(visible!.x - gap - size.width, sideY);
      case "pinned": return at(clampX(visible!.x), pinnedTop);
    }
  }

  /** The candidate's box when it fits the canvas and stays off the selection and the site's bars. */
  function fit(candidate: Exclude<Candidate, "docked">): Box | null {
    const box = position(candidate);
    const inside = box.x >= minX - 0.5 && box.x <= maxX + 0.5 && box.y >= canvas.y + INSET && box.y + size.height <= canvas.y + canvas.height - INSET;
    if (!inside || obstructions.some((o) => intersect(box, o))) return null;
    if (candidate === "pinned") return visible!.height > canvas.height * 0.5 ? box : null;
    return intersect(box, visible!) ? null : box;
  }

  const clear = (candidate: Candidate): Box | null => {
    if (candidate === "docked") return null;
    const box = fit(candidate);
    return box && coverage(box, obstacles) === 0 ? box : null;
  };

  const keep = previous !== null && previous !== "pinned" ? clear(previous) : null;
  if (keep && previous) return { kind: "placed", x: keep.x, y: keep.y, candidate: previous };
  for (const candidate of ORDER) {
    const box = clear(candidate);
    if (box) return { kind: "placed", x: box.x, y: box.y, candidate };
  }

  // Every spot covers something: dock in a strip along the top of the canvas, just under the
  // site's own top bar, or along the bottom when the selection itself sits at the top.
  const strip = (y: number): Box => ({ x: canvas.x, y, width: canvas.width, height: size.height });
  const bottomBars = obstructions.filter((o) => o.y >= canvas.y + canvas.height / 2);
  const top = strip(pinnedTop - gap);
  const bottomEdge = Math.min(canvas.y + canvas.height, ...bottomBars.map((o) => o.y));
  const docked = intersect(top, visible) ? strip(bottomEdge - size.height) : top;
  return { kind: "placed", x: docked.x, y: docked.y, candidate: "docked", width: docked.width };
}
