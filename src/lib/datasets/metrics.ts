import type { Fmt, Metric, Pred, Rec } from "./types";
import { gkey } from "./cells";

const DAY = 86400000;
export const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
export const has = (v: unknown) => v != null && v !== "";
export const total = (rows: Rec[], f: string) => rows.reduce((a, r) => a + n(r[f]), 0);
export const daysBetween = (a: unknown, b: unknown) =>
  typeof a === "string" && typeof b === "string" ? Math.round((Date.parse(b) - Date.parse(a)) / DAY) : null;
export const daysSince = (d: unknown) => (typeof d === "string" ? Math.round((Date.now() - Date.parse(d)) / DAY) : null);
/** Text match ignoring spelling variants. */
export const is = (v: unknown, ...words: string[]) => typeof v === "string" && words.some((w) => gkey(v).includes(gkey(w)));

/** Building blocks for KPI tiles and breakdown columns. */
export const M = {
  count: (label = "العدد", where?: Pred): Metric => ({ label, fmt: "int", calc: (rs) => (where ? rs.filter(where) : rs).length }),
  sum: (f: string, label: string, fmt: Fmt = "money", where?: Pred): Metric =>
    ({ label, fmt, calc: (rs) => total(where ? rs.filter(where) : rs, f) }),
  avg: (f: string, label: string, fmt: Fmt = "money", where?: Pred): Metric => ({
    label, fmt, calc: (rs) => {
      const xs = (where ? rs.filter(where) : rs).filter((r) => typeof r[f] === "number");
      return xs.length ? total(xs, f) / xs.length : null;
    },
  }),
  distinct: (f: string, label: string, where?: Pred): Metric => ({
    label, fmt: "int", calc: (rs) => new Set((where ? rs.filter(where) : rs).map((r) => r[f]).filter(has).map((v) => gkey(String(v)))).size,
  }),
  /** a / b × 100 */
  ratio: (label: string, a: (rs: Rec[]) => number, b: (rs: Rec[]) => number): Metric =>
    ({ label, fmt: "pct", calc: (rs) => { const d = b(rs); return d ? (a(rs) / d) * 100 : null; } }),
  /** Share of rows matching `where`. */
  share: (label: string, where: Pred, of?: Pred): Metric =>
    ({ label, fmt: "pct", calc: (rs) => { const base = of ? rs.filter(of) : rs; return base.length ? (base.filter(where).length / base.length) * 100 : null; } }),
  custom: (label: string, fmt: Fmt, calc: (rs: Rec[]) => number | null): Metric => ({ label, fmt, calc }),
};

/** Profit ÷ revenue of the rows that have a cost. */
export const margin = (label: string, profit: string, revenue: string, hasCost: Pred = () => true) =>
  M.ratio(label, (rs) => total(rs.filter(hasCost), profit), (rs) => total(rs.filter(hasCost), revenue));
