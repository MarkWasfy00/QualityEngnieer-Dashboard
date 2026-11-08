"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Pencil, Search, Eye } from "lucide-react";
import { Badge } from "./ui";
import { money, fmtDate, int, pct, num } from "@/lib/format";
import { label } from "@/lib/constants";

export type Column = {
  key: string;
  label: string;
  kind?: "text" | "badge" | "money" | "date" | "number" | "bool" | "percent" | "code" | "latin" | "decimal";
};
export type Row = { id: number; editHref?: string; viewHref?: string } & Record<string, string | number | boolean | null | undefined>;

function Cell({ col, v }: { col: Column; v: Row[string] }) {
  switch (col.kind) {
    case "badge": return <Badge value={v as string} />;
    case "code": return <>{label(v as string) || "—"}</>;
    case "money": return <span className="whitespace-nowrap">{money(Number(v))}</span>;
    case "date": return <span className="whitespace-nowrap">{fmtDate(v as string)}</span>;
    case "number": return <>{int(v as number | null)}</>;
    case "percent": return <>{pct(Number(v))}</>;
    case "decimal": return <>{v == null ? "—" : num(Number(v))}</>;
    case "bool": return v ? <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">رجعت تاني</span> : <span className="text-slate-400">لأ</span>;
    case "latin": return <span dir="ltr" className="font-mono text-xs">{v ?? "—"}</span>;
    default: return <>{v ?? "—"}</>;
  }
}

/** Text used for searching/filtering (includes Arabic labels of codes). */
const display = (c: Column | undefined, v: Row[string]) =>
  c && (c.kind === "badge" || c.kind === "code") ? label(String(v ?? "")) : String(v ?? "");

export default function DataTable({ columns, rows, filters = [] }: {
  columns: Column[]; rows: Row[]; filters?: string[];
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<Record<string, string>>({});
  const colOf = (k: string) => columns.find((c) => c.key === k);

  const opts = useMemo(
    () => Object.fromEntries(filters.map((f) => [f, [...new Set(rows.map((r) => String(r[f] ?? "")))].filter(Boolean).sort()])),
    [rows, filters],
  );

  const shown = useMemo(() => {
    const needle = q.toLowerCase();
    let out = rows.filter((r) =>
      (!needle || columns.some((c) => display(c, r[c.key]).toLowerCase().includes(needle))) &&
      Object.entries(sel).every(([k, v]) => !v || String(r[k]) === v));
    if (sort) {
      out = [...out].sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        if (x == null) return 1; if (y == null) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ar")) * sort.dir;
      });
    }
    return out;
  }, [rows, q, sel, sort, columns]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute start-3 top-2.5 text-slate-400" />
          <input className="input ps-9" placeholder="دوّر…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {filters.map((f) => (
          <select key={f} className="input w-auto" value={sel[f] ?? ""} onChange={(e) => setSel({ ...sel, [f]: e.target.value })}>
            <option value="">{colOf(f)?.label ?? f}: الكل</option>
            {opts[f].map((o) => <option key={o} value={o}>{display(colOf(f), o)}</option>)}
          </select>
        ))}
        <span className="ms-auto text-sm text-slate-500">{int(shown.length)} من {int(rows.length)} سجل</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-start text-xs text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-start font-semibold">
                  <button className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    onClick={() => setSort(sort?.key === c.key ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })}>
                    {c.label} <ArrowUpDown size={12} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                {columns.map((c) => <td key={c.key} className="px-4 py-3"><Cell col={c} v={r[c.key]} /></td>)}
                <td className="px-4 py-3 text-end whitespace-nowrap">
                  {r.viewHref && <Link href={r.viewHref} className="me-3 inline-flex text-slate-500 hover:text-brand" title="عرض"><Eye size={16} /></Link>}
                  {r.editHref && <Link href={r.editHref} className="inline-flex text-slate-500 hover:text-brand" title="تعديل"><Pencil size={16} /></Link>}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">مفيش سجلات.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
