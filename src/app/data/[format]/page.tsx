import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Upload, FileDown, Sheet, ArrowRight } from "lucide-react";
import { loadDataset } from "@/lib/datasets/store";
import { computeReport, type Col, type Query } from "@/lib/datasets/report";
import { fmtDate, int } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RangeFilter from "@/components/RangeFilter";
import RecFilters from "@/components/RecFilters";
import DataTable, { type Column } from "@/components/DataTable";
import { ChartCard, PeriodBars, SERIES } from "@/components/Charts";

export const dynamic = "force-dynamic";

const KIND: Record<Col["type"], Column["kind"]> = { text: "text", id: "latin", int: "number", number: "decimal", money: "money", date: "date", pct: "percent" };
const columns = (cs: Col[]): Column[] => cs.map((c) => ({ key: c.key, label: c.label, kind: KIND[c.type] }));
const asRows = (rs: Record<string, string | number | null>[]) => rs.map((r, i) => ({ ...r, id: i + 1 }));

type Report = ReturnType<typeof computeReport>;
function Breakdown({ b }: { b: Report["breakdowns"][number] }) {
  const max = b.chart >= 0 ? Math.max(1, ...b.rows.map((r) => Math.abs(r.values[b.chart] ?? 0))) : 1;
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle>{b.title}</CardTitle>
        <CardDescription>{b.subtitle ?? `${int(b.groups)} ${b.groups === 1 ? "مجموعة" : "مجموعات"}${b.more ? ` · بيظهر أكبر ${int(b.rows.length)}` : ""}`}</CardDescription>
      </CardHeader>
      <Table containerClassName="max-h-[460px] overflow-auto" className="[&_td]:px-4 [&_th]:px-4">
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground">الاسم</TableHead>
            {b.columns.map((c) => <TableHead key={c.label} className="text-xs text-muted-foreground">{c.label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {b.rows.map((r) => (
            <TableRow key={r.name}>
              <TableCell className="max-w-64 whitespace-normal font-medium">{r.name}</TableCell>
              {r.display.map((d, i) => (
                <TableCell key={i} className="whitespace-nowrap">
                  {i === b.chart ? (
                    <div className="flex min-w-40 items-center gap-2">
                      <span className="w-28 shrink-0 font-semibold">{d}</span>
                      <div className="h-2.5 flex-1 rounded bg-muted">
                        <div className={`h-2.5 rounded ${(r.values[i] ?? 0) < 0 ? "bg-red-400" : "bg-chart-1"}`} style={{ width: `${(Math.abs(r.values[i] ?? 0) / max) * 100}%` }} />
                      </div>
                    </div>
                  ) : d}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export default async function DatasetPage({ params, searchParams }: {
  params: Promise<{ format: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ format: id }, sp] = await Promise.all([params, searchParams]);
  const ds = await loadDataset(decodeURIComponent(id));
  if (!ds) notFound();
  const { format: fmt, rows, last } = ds;
  const q: Query = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const d = computeReport(fmt, rows, q);
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();
  const pdf = `/api/export/data/${fmt.id}${qs ? `?${qs}` : ""}`;
  const xlsx = `/api/export/data/${fmt.id}?${qs ? `${qs}&` : ""}type=xlsx`;

  return (
    <>
      <div className="mb-2"><Link href="/data" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowRight className="size-4" /> كل تقارير الإكسيل</Link></div>
      <PageHeader title={fmt.title} subtitle={fmt.description}>
        {d.total > 0 && <Button asChild variant="secondary"><a href={pdf} target="_blank"><FileDown /> تقرير PDF</a></Button>}
        {d.total > 0 && <Button asChild variant="outline"><a href={xlsx}><Sheet /> إكسيل</a></Button>}
        <Button asChild><Link href="/receivables/import"><Upload /> رفع ملف جديد</Link></Button>
      </PageHeader>

      {!d.total ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground">
          لسه مفيش بيانات من النوع ده. <Link href="/receivables/import" className="text-primary underline">ارفع الملف هنا</Link>.
        </CardContent></Card>
      ) : (
        <>
          {(d.hasDate || d.filters.length > 0) && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {d.hasDate && <Suspense><RangeFilter /></Suspense>}
              {d.filters.length > 0 && <Suspense><RecFilters filters={d.filters} /></Suspense>}
            </div>
          )}

          <Card className="mb-4 border-s-4 border-s-primary">
            <CardContent>
              <div className="mb-1 text-base font-bold">الخلاصة</div>
              <p className="leading-7">{d.summary ?? "مفيش بيانات بالفلاتر دي."}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {int(d.count)} من {int(d.total)} سطر
                {d.period.first && <> · من {fmtDate(d.period.first)} لحد {fmtDate(d.period.last)}</>}
                {last && <> · آخر ملف: {last.fileName} ({fmtDate(last.createdAt)})</>}
                {fmt.mode === "snapshot" && <> · الشيت ده بيمثل الوضع الحالي، وكل ملف جديد بيستبدل اللي قبله</>}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {d.kpis.map((k) => <StatCard key={k.label} title={k.label} value={k.value} hint={k.hint} tone={k.tone} />)}
          </div>

          {d.trends.length > 0 && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {d.trends.map((t) => (
                <ChartCard key={t.title} title={t.title} subtitle={t.subtitle}>
                  <PeriodBars name={t.title} money={t.money} color={SERIES[t.color % SERIES.length]} data={t.points} />
                </ChartCard>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {d.breakdowns.map((b) => <Breakdown key={b.title} b={b} />)}
          </div>

          {d.lists.map((l) => (
            <section key={l.title}>
              <h2 className="mb-3 mt-8 text-lg font-bold">{l.title} ({int(l.total)})</h2>
              <DataTable columns={columns(l.columns)} rows={asRows(l.rows)} />
              {l.total > l.rows.length && <p className="mt-2 text-xs text-muted-foreground">بيظهر أول {int(l.rows.length)} — الكل في ملف الإكسيل.</p>}
            </section>
          ))}

          <h2 className="mb-3 mt-8 text-lg font-bold">كل البيانات</h2>
          <DataTable columns={columns(d.table.columns)} rows={asRows(d.table.rows)} />
          {d.table.total > d.table.rows.length && (
            <p className="mt-2 text-xs text-muted-foreground">بيظهر أحدث {int(d.table.rows.length)} سطر من {int(d.table.total)} — نزّل الإكسيل عشان تشوف الكل.</p>
          )}
        </>
      )}
    </>
  );
}
