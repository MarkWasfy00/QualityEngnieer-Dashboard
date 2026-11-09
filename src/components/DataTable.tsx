"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Pencil, Search, Eye } from "lucide-react";
import { StatusBadge } from "./PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    case "badge": return <StatusBadge value={v as string} />;
    case "code": return <>{label(v as string) || "—"}</>;
    case "money": return <span className="whitespace-nowrap">{money(Number(v))}</span>;
    case "date": return <span className="whitespace-nowrap">{fmtDate(v as string)}</span>;
    case "number": return <>{int(v as number | null)}</>;
    case "percent": return <>{pct(Number(v))}</>;
    case "decimal": return <>{v == null ? "—" : num(Number(v))}</>;
    case "bool": return v ? <Badge className="bg-orange-100 font-semibold text-orange-700">رجعت تاني</Badge> : <span className="text-muted-foreground">لأ</span>;
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
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-2 size-4 text-muted-foreground" />
          <Input className="ps-8" placeholder="دوّر…" aria-label="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {filters.map((f) => (
          <NativeSelect key={f} aria-label={colOf(f)?.label ?? f} value={sel[f] ?? ""} onChange={(e) => setSel({ ...sel, [f]: e.target.value })}>
            <NativeSelectOption value="">{colOf(f)?.label ?? f}: الكل</NativeSelectOption>
            {opts[f].map((o) => <NativeSelectOption key={o} value={o}>{display(colOf(f), o)}</NativeSelectOption>)}
          </NativeSelect>
        ))}
        <span className="ms-auto text-sm text-muted-foreground">{int(shown.length)} من {int(rows.length)} سجل</span>
      </div>
      <Table className="[&_td]:px-4 [&_th]:px-4">
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key}>
                <Button variant="ghost" size="xs" className="-ms-2 text-muted-foreground"
                  onClick={() => setSort(sort?.key === c.key ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })}>
                  {c.label} <ArrowUpDown />
                </Button>
              </TableHead>
            ))}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((r) => (
            <TableRow key={r.id}>
              {columns.map((c) => <TableCell key={c.key} className="py-2.5 whitespace-normal"><Cell col={c} v={r[c.key]} /></TableCell>)}
              <TableCell className="py-1 text-end">
                {r.viewHref && <Button asChild variant="ghost" size="icon-sm"><Link href={r.viewHref} title="عرض"><Eye /></Link></Button>}
                {r.editHref && <Button asChild variant="ghost" size="icon-sm"><Link href={r.editHref} title="تعديل"><Pencil /></Link></Button>}
              </TableCell>
            </TableRow>
          ))}
          {!shown.length && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length + 1} className="py-12 text-center text-muted-foreground">مفيش سجلات.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
