/**
 * Mirrors `split_declarations` and `merge_declarations` in `src/document.rs`, so the live preview
 * rewrites the inline style exactly as the server will. `fixtures/style-merge.json` holds the cases both sides test.
 */
/** Splits `a: b; c: url(x;y)` into declarations, respecting parentheses and quotes. */
function splitDeclarations(style) {
    const out = [];
    let depth = 0, quote = null, start = 0;
    for (let i = 0; i < style.length; i++) {
        const c = style[i];
        if (quote !== null) {
            if (c === quote)
                quote = null;
        }
        else if (c === '"' || c === "'")
            quote = c;
        else if (c === "(")
            depth++;
        else if (c === ")")
            depth--;
        else if (c === ";" && depth <= 0) {
            out.push(style.slice(start, i));
            start = i + 1;
        }
    }
    out.push(style.slice(start));
    return out.filter((d) => d.trim() !== "");
}
/** Sets or removes only the changed properties and keeps every other declaration as written. */
export function mergeDeclarations(existing, changes) {
    const declarations = splitDeclarations(existing)
        .filter((d) => !Object.hasOwn(changes, (d.split(":")[0] ?? "").trim().replace(/[A-Z]/g, (c) => c.toLowerCase())))
        .map((d) => d.trim());
    for (const property of Object.keys(changes).sort()) {
        const value = changes[property];
        if (value !== null && value !== undefined)
            declarations.push(`${property}: ${value}`);
    }
    return declarations.join("; ");
}
