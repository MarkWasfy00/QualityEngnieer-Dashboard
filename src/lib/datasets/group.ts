import type { Rec } from "./types";
import { cleanPlace, gkey, placeKey } from "./cells";

export const NONE = "غير محدد";
export type By = string | ((r: Rec) => string | null);

const valueOf = (r: Rec, by: By) => {
  const v = typeof by === "string" ? r[by] : by(r);
  return v == null || v === "" ? null : String(v);
};
/** Canonical key of a value: spelling variants collapse; `place` also ignores word order and "مخزن/معرض". */
export const canon = (s: string | null, place = false) => (s == null ? "" : (place ? placeKey(s) : gkey(s)) || gkey(s));

/** Groups rows by a field; each group is shown with its most common spelling. Biggest group first. */
export function groupRows(rows: Rec[], by: By, place = false) {
  const m = new Map<string, { rows: Rec[]; names: Map<string, number> }>();
  for (const r of rows) {
    const s = valueOf(r, by);
    const k = canon(s, place);
    const g = m.get(k) ?? m.set(k, { rows: [], names: new Map() }).get(k)!;
    g.rows.push(r);
    if (s != null) {
      const shown = (place ? cleanPlace(s) : s.replace(/\s+/g, " ").trim()) ?? s;
      g.names.set(shown, (g.names.get(shown) ?? 0) + 1);
    }
  }
  return [...m.entries()].map(([key, g]) => ({
    key, rows: g.rows,
    name: g.names.size ? [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0] : NONE,
  })).sort((a, b) => b.rows.length - a.rows.length);
}

/** The biggest group (by row count) with its share of all rows — for one-line summaries. */
export function top(rows: Rec[], by: By, place = false) {
  const g = groupRows(rows, by, place).filter((x) => x.name !== NONE)[0];
  return g ? { name: g.name, count: g.rows.length, share: rows.length ? (g.rows.length / rows.length) * 100 : 0 } : null;
}
