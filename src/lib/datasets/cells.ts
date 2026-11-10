import type ExcelJS from "exceljs";
import { norm } from "@/lib/receivables/parse";

export type Cell = ExcelJS.CellValue;

/** Plain value of a cell: rich text → string, formula → its cached result (null when Excel didn't save one). */
export function raw(v: Cell): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return v.result != null && typeof v.result === "object" && "error" in v.result ? null : raw(v.result as Cell);
    if ("formula" in v || "sharedFormula" in v) return null;
    if ("hyperlink" in v && "text" in v) return String(v.text);
    if ("text" in v) return String(v.text);
    if ("error" in v) return null;
    return null;
  }
  return v;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim() || null;

/** Text of a cell; numbers keep their digits (chassis / invoice numbers), dates become yyyy-mm-dd. */
export function text(v: Cell): string | null {
  const x = raw(v);
  if (x == null) return null;
  if (x instanceof Date) return iso(x);
  if (typeof x === "number") return Number.isInteger(x) ? String(x) : String(Math.round(x * 1e6) / 1e6);
  if (typeof x === "boolean") return x ? "نعم" : "لا";
  return clean(String(x));
}

/** Numbers, also "1,031,525.00", "1 250 000", "250000 ج.م". Anything else → null. */
export function number(v: Cell): number | null {
  const x = raw(v);
  if (x == null || x instanceof Date) return null;
  if (typeof x === "number") return isFinite(x) ? x : null;
  if (typeof x === "boolean") return null;
  const s = String(x).replace(/[,\s]/g, "").replace(/ج\.?م\.?$/, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

const DAY = 86400000;
export const iso = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
const plausible = (d: Date) => d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;

/**
 * Dates as Date cells, Excel serial numbers, "15/7/2026" or "2026-07-15" strings → "yyyy-mm-dd".
 * past = true: the date can't be in the future (a sale, a receipt) — when Excel swapped day and month
 * (9/12 read as Sep-12 → really 9 Dec… or the reverse) and that lands in the future, the swap is undone.
 */
export function date(v: Cell, past = false): string | null {
  const x = raw(v);
  if (x == null) return null;
  let d: Date | null = null;
  if (x instanceof Date) d = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
  else if (typeof x === "number") { if (x > 30000 && x < 80000) d = new Date(Math.round((x - 25569) * DAY)); }
  else {
    const t = String(x).trim();
    let m = t.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
    if (m) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    else if ((m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/))) {
      const y = +m[3] < 100 ? +m[3] + 2000 : +m[3];
      if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) d = new Date(Date.UTC(y, +m[2] - 1, +m[1]));
    }
  }
  if (!d || isNaN(+d) || !plausible(d)) return null;
  if (past && +d > Date.now() + DAY) {
    const sw = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCDate() - 1, d.getUTCMonth() + 1));
    if (d.getUTCDate() <= 12 && +sw <= Date.now() + DAY) d = sw;
    else return null; // a sale/receipt can't be in the future — typo in the year
  }
  return iso(d);
}

/** Header text → comparison key (no spaces, no diacritics, أ/ا ة/ه ي/ى unified, lower case). */
export const hkey = (s: unknown) => norm(String(s ?? "")).replace(/[\s:：*]+/g, "").toLowerCase();

/** Group key for free text: spelling variants of the same name end up together. */
export const gkey = (s: string) => norm(s).toLowerCase();

/** Looser key for places: "مخزن الاسكندريه كارفور" = "مخزن/اسكندرية كارفور" = "كارفور الإسكندرية". */
export const placeKey = (s: string) =>
  norm(s).toLowerCase().replace(/[/\\\-_،,()]/g, " ").split(" ")
    .filter((w) => w && w !== "مخزن" && w !== "معرض")
    .map((w) => w.replace(/^ال(?=..)/, ""))
    .sort().join(" ");

/** "مخزن/زايد" → "زايد", "معرض كوم حمادة" → "كوم حمادة". */
export const cleanPlace = (s: string | null | undefined) =>
  s ? s.replace(/^\s*(مخزن|معرض)\s*[/\\-]?\s*/, "").replace(/\s+/g, " ").trim() || s.trim() : null;

export { norm };
