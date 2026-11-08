const LOCALE = "ar-EG-u-nu-latn"; // Arabic text, English (Latin) digits
const nf0 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export const money = (n: number) => `${nf0.format(Math.round(n || 0))} ج.م`;
export const pct = (n: number) => `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(n || 0)}%`;
export const num = (n: number, d = 1) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);
export const int = (n: number | null | undefined) => (n == null ? "—" : nf0.format(n));
export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString(LOCALE, { year: "numeric", month: "short", day: "numeric" }) : "—";
/** "2026-05" -> "مايو 2026" */
export const monthLabel = (ym: string, short = false) =>
  new Date(ym + "-01T00:00:00").toLocaleDateString(LOCALE, short ? { month: "short" } : { month: "long", year: "numeric" });
/** yyyy-mm-dd in local time (avoids showing yesterday's date after midnight in Egypt). */
export const toInputDate = (d: Date | string | null | undefined) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const vehicleLabel = (v: { year: number; make: string; model: string; vin: string } | null | undefined) =>
  v ? `${v.make} ${v.model} ${v.year} · ${v.vin.slice(-6)}` : "—";

/** Convert a DB record into plain form defaults (Dates -> yyyy-mm-dd). */
export const toDefaults = (o: object) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v instanceof Date ? toInputDate(v) : v])) as Record<
    string, string | number | boolean | null
  >;
