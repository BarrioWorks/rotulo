export const MAX_STRING = 4096;
export function str(max = MAX_STRING, pattern) {
    return (v) => (typeof v === "string" && v.length <= max && (!pattern || pattern.test(v)) ? v : undefined);
}
export function num(min = -1e9, max = 1e9) {
    return (v) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
}
export function int(min = 0, max = Number.MAX_SAFE_INTEGER) {
    return (v) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined);
}
/** Binary data, such as a font file the app hands to the preview. */
export function bytes(max) {
    return (v) => (v instanceof ArrayBuffer && v.byteLength > 0 && v.byteLength <= max ? v : undefined);
}
export const bool = (v) => (typeof v === "boolean" ? v : undefined);
export function lit(...values) {
    return (v) => (typeof v === "string" && values.includes(v) ? v : undefined);
}
export function opt(parse) {
    return { optional: true, parse };
}
function isOptional(f) {
    return typeof f === "object";
}
/** Parses a plain object with exactly the listed fields; unknown fields are ignored. */
export function obj(shape) {
    return (v) => {
        if (typeof v !== "object" || v === null || Array.isArray(v))
            return undefined;
        const source = v;
        const out = {};
        for (const [key, field] of Object.entries(shape)) {
            const raw = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined;
            if (isOptional(field)) {
                if (raw === undefined || raw === null) {
                    out[key] = null;
                    continue;
                }
                const parsed = field.parse(raw);
                if (parsed === undefined)
                    return undefined;
                out[key] = parsed;
            }
            else {
                const parsed = field(raw);
                if (parsed === undefined)
                    return undefined;
                out[key] = parsed;
            }
        }
        return out;
    };
}
export function arr(item, max = 10000) {
    return (v) => {
        if (!Array.isArray(v) || v.length > max)
            return undefined;
        const out = [];
        for (const x of v) {
            const parsed = item(x);
            if (parsed === undefined)
                return undefined;
            out.push(parsed);
        }
        return out;
    };
}
/** A string-keyed map whose values all parse. */
export function record(item, maxKeys = 64) {
    return (v) => {
        if (typeof v !== "object" || v === null || Array.isArray(v))
            return undefined;
        const entries = Object.entries(v);
        if (entries.length > maxKeys)
            return undefined;
        const out = {};
        for (const [k, x] of entries) {
            const parsed = item(x);
            if (parsed === undefined)
                return undefined;
            out[k] = parsed;
        }
        return out;
    };
}
