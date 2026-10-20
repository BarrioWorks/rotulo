/**
 * Tiny runtime parsers for data that crosses a trust boundary (server JSON, postMessage).
 * A parser returns the typed value or `undefined`; it never throws.
 */
export type Parser<T> = (value: unknown) => T | undefined;
export type Parsed<P> = P extends Parser<infer T> ? T : never;

export const MAX_STRING = 4096;

export function str(max = MAX_STRING, pattern?: RegExp): Parser<string> {
  return (v) => (typeof v === "string" && v.length <= max && (!pattern || pattern.test(v)) ? v : undefined);
}

export function num(min = -1e9, max = 1e9): Parser<number> {
  return (v) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
}

export function int(min = 0, max = Number.MAX_SAFE_INTEGER): Parser<number> {
  return (v) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined);
}

/** Binary data, such as a font file the app hands to the preview. */
export function bytes(max: number): Parser<ArrayBuffer> {
  return (v) => (v instanceof ArrayBuffer && v.byteLength > 0 && v.byteLength <= max ? v : undefined);
}

export const bool: Parser<boolean> = (v) => (typeof v === "boolean" ? v : undefined);

export function lit<const L extends string>(...values: L[]): Parser<L> {
  return (v) => (typeof v === "string" && (values as string[]).includes(v) ? (v as L) : undefined);
}

/** Wraps an optional or nullable field. Missing and `null` both become `null`. */
export interface Optional<T> {
  readonly optional: true;
  readonly parse: Parser<T>;
}

export function opt<T>(parse: Parser<T>): Optional<T> {
  return { optional: true, parse };
}

type Field = Parser<unknown> | Optional<unknown>;
type FieldValue<F> = F extends Optional<infer T> ? T | null : F extends Parser<infer T> ? T : never;
export type Shape = Record<string, Field>;
export type ObjectOf<S extends Shape> = { [K in keyof S]: FieldValue<S[K]> };

function isOptional(f: Field): f is Optional<unknown> {
  return typeof f === "object";
}

/** Parses a plain object with exactly the listed fields; unknown fields are ignored. */
export function obj<S extends Shape>(shape: S): Parser<ObjectOf<S>> {
  return (v) => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return undefined;
    const source = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(shape)) {
      const raw = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined;
      if (isOptional(field)) {
        if (raw === undefined || raw === null) {
          out[key] = null;
          continue;
        }
        const parsed = field.parse(raw);
        if (parsed === undefined) return undefined;
        out[key] = parsed;
      } else {
        const parsed = field(raw);
        if (parsed === undefined) return undefined;
        out[key] = parsed;
      }
    }
    return out as ObjectOf<S>;
  };
}

export function arr<T>(item: Parser<T>, max = 10000): Parser<T[]> {
  return (v) => {
    if (!Array.isArray(v) || v.length > max) return undefined;
    const out: T[] = [];
    for (const x of v) {
      const parsed = item(x);
      if (parsed === undefined) return undefined;
      out.push(parsed);
    }
    return out;
  };
}

/** A string-keyed map whose values all parse. */
export function record<T>(item: Parser<T>, maxKeys = 64): Parser<Record<string, T>> {
  return (v) => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return undefined;
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length > maxKeys) return undefined;
    const out: Record<string, T> = {};
    for (const [k, x] of entries) {
      const parsed = item(x);
      if (parsed === undefined) return undefined;
      out[k] = parsed;
    }
    return out;
  };
}
