import type { Field, Fmt, Format, Rec } from "./types";
import { canon, groupRows, NONE } from "./group";
import { gkey } from "./cells";
import { int, money, num, pct } from "@/lib/format";

const DAY = 86400000;
export type Query = Record<string, string | undefined>;

export function fmtValue(v: number | null | undefined, fmt: Fmt) {
  if (v == null || !isFinite(v)) return "—";
  switch (fmt) {
    case "money": return money(v);
    case "pct": return pct(v);
    case "days": return `${int(Math.round(v))} يوم`;
    case "num": return Math.abs(v) >= 100 ? int(Math.round(v)) : num(v, 1);
    default: return int(Math.round(v));
  }
}

export type Col = { key: string; label: string; type: NonNullable<Field["type"]> };
export type ReportView = ReturnType<typeof computeReport>;

/** Rows matching the period (on the layout's main date) and the drop-down filters. */
export function applyFilters(fmt: Format, rows: Rec[], q: Query) {
  const fields = new Map(fmt.fields.map((f) => [f.key, f]));
  const sel = (fmt.report.filters ?? []).filter((k) => q[k]).map((k) => ({ k, v: canon(q[k]!, !!fields.get(k)?.place), place: !!fields.get(k)?.place }));
  const df = fmt.dateField, from = q.from || undefined, to = q.to || undefined;
  return rows.filter((r) => {
    if (df && (from || to)) {
      const d = r[df];
      if (typeof d !== "string" || (from && d < from) || (to && d > to)) return false;
    }
    return sel.every(({ k, v, place }) => canon(r[k] == null ? null : String(r[k]), place) === v);
  });
}

/** Weekly buckets (week starts Saturday) for periods up to ~4 months, monthly beyond. */
function buckets(rows: Rec[], date: string) {
  const ds = rows.map((r) => r[date]).filter((d): d is string => typeof d === "string").sort();
  if (!ds.length) return { unit: "month" as const, keyOf: () => null as string | null, label: (k: string) => k };
  const weekly = (Date.parse(ds[ds.length - 1]) - Date.parse(ds[0])) / DAY <= 120;
  const keyOf = (r: Rec) => {
    const d = r[date];
    if (typeof d !== "string") return null;
    if (!weekly) return d.slice(0, 7);
    const x = new Date(d + "T00:00:00Z");
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 1) % 7));
    return x.toISOString().slice(0, 10);
  };
  const label = (k: string) => (weekly ? `${+k.slice(8, 10)}/${+k.slice(5, 7)}` : `${+k.slice(5, 7)}/${k.slice(2, 4)}`);
  return { unit: weekly ? ("week" as const) : ("month" as const), keyOf, label };
}

export function computeReport(fmt: Format, all: Rec[], q: Query = {}, opts: { tableLimit?: number } = {}) {
  const spec = fmt.report;
  const fields = new Map(fmt.fields.map((f) => [f.key, f]));
  const col = (k: string): Col => ({ key: k, label: fields.get(k)?.label ?? k, type: fields.get(k)?.type ?? "text" });
  const rows = applyFilters(fmt, all, q);

  const dates = fmt.dateField ? rows.map((r) => r[fmt.dateField!]).filter((d): d is string => typeof d === "string").sort() : [];

  const kpis = spec.kpis.map((k) => {
    const v = k.metric.calc(rows);
    return { label: k.metric.label, value: fmtValue(v, k.metric.fmt), hint: k.hint?.(rows), tone: k.tone?.(v, rows) };
  });

  const trends = (spec.trends ?? []).map((t) => {
    const src = t.where ? rows.filter(t.where) : rows;
    const b = buckets(src, t.date);
    const m = new Map<string, Rec[]>();
    for (const r of src) { const k = b.keyOf(r); if (k) (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
    const points = [...m.entries()].sort((a, c) => a[0].localeCompare(c[0]))
      .map(([k, rs]) => ({ label: b.label(k), value: Math.round(t.metric.calc(rs) ?? 0) }));
    return { title: t.title, subtitle: t.subtitle ?? (b.unit === "week" ? "كل أسبوع (بيبدأ السبت)" : "كل شهر"), unit: b.unit, money: t.metric.fmt === "money", color: t.color ?? 0, points };
  }).filter((t) => t.points.length > 0);

  const breakdowns = spec.breakdowns.map((b) => {
    const src = b.where ? rows.filter(b.where) : rows;
    const place = typeof b.by === "string" && !!fields.get(b.by)?.place;
    const chart = b.chart ?? 0, sortBy = b.sort ?? Math.max(0, chart);
    let groups = groupRows(src, b.by, place).map((g) => {
      const values = b.metrics.map((m) => m.calc(g.rows));
      return { name: g.name, values, display: values.map((v, i) => fmtValue(v, b.metrics[i].fmt)) };
    });
    if (b.order) {
      const idx = (name: string) => { const i = b.order!.findIndex((o) => gkey(name).includes(gkey(o))); return i < 0 ? 999 : i; };
      groups.sort((a, c) => idx(a.name) - idx(c.name));
    } else {
      groups.sort((a, c) => (c.values[sortBy] ?? -Infinity) - (a.values[sortBy] ?? -Infinity));
    }
    // "غير محدد" at the end, and drop empty groups when the column is mostly empty.
    groups = [...groups.filter((g) => g.name !== NONE), ...groups.filter((g) => g.name === NONE)];
    const top = b.top ?? 25;
    return {
      title: b.title, subtitle: b.subtitle, chart,
      columns: b.metrics.map((m) => ({ label: m.label, fmt: m.fmt })),
      rows: groups.slice(0, top), more: Math.max(0, groups.length - top), groups: groups.length,
    };
  }).filter((b) => b.rows.length > 0 && !(b.rows.length === 1 && b.rows[0].name === NONE));

  const lists = (spec.lists ?? []).map((l) => {
    const xs = rows.filter(l.where);
    if (l.sort) xs.sort(l.sort);
    return { title: l.title, columns: l.columns.map(col), rows: xs.slice(0, l.limit ?? 100), total: xs.length };
  }).filter((l) => l.total > 0);

  const sorted = fmt.dateField ? [...rows].sort((a, b) => String(b[fmt.dateField!] ?? "").localeCompare(String(a[fmt.dateField!] ?? ""))) : rows;
  const limit = opts.tableLimit ?? 1500;

  const filters = (spec.filters ?? []).map((k) => ({
    key: k, label: col(k).label,
    options: groupRows(all, k, !!fields.get(k)?.place).map((g) => g.name).filter((n) => n !== NONE).sort((a, b) => a.localeCompare(b, "ar")).slice(0, 300),
  })).filter((f) => f.options.length > 1);

  return {
    total: all.length, count: rows.length,
    period: { first: dates[0] ?? null, last: dates[dates.length - 1] ?? null },
    summary: rows.length && spec.summary ? spec.summary(rows) : null,
    kpis, trends, breakdowns, lists, filters,
    table: { columns: spec.table.filter((k) => fields.has(k)).map(col), rows: sorted.slice(0, limit), total: rows.length },
    hasDate: !!fmt.dateField,
  };
}

/** "الفترة: … · الفرع: …" for report headers. */
export function describeFilters(fmt: Format, q: Query, fmtDate: (d: string) => string) {
  const fields = new Map(fmt.fields.map((f) => [f.key, f]));
  return [
    q.from || q.to ? `الفترة: ${q.from ? fmtDate(q.from) : "البداية"} لحد ${q.to ? fmtDate(q.to) : "النهارده"}` : null,
    ...(fmt.report.filters ?? []).filter((k) => q[k]).map((k) => `${fields.get(k)?.label ?? k}: ${q[k]}`),
  ].filter(Boolean).join(" · ") || "كل البيانات";
}
