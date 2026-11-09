import { Suspense } from "react";
import Link from "next/link";
import { Upload, AlertTriangle, FileDown } from "lucide-react";
import { parseRange } from "@/lib/kpis";
import { getReceivableStats, COLLECT_TARGET_DAYS, type Group } from "@/lib/receivables/stats";
import { money, pct, int, num } from "@/lib/format";
import { label } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RangeFilter from "@/components/RangeFilter";
import RecFilters from "@/components/RecFilters";
import DataTable, { type Column } from "@/components/DataTable";
import { ChartCard, CollectionTrend, DaysLine } from "@/components/Charts";

type SP = { from?: string; to?: string; branch?: string; bank?: string };

const Tile = ({ sub, ...props }: Omit<React.ComponentProps<typeof StatCard>, "hint"> & { sub?: string }) => <StatCard hint={sub} {...props} />;

const rateTone = (r: number) => (r >= 80 ? "text-emerald-700" : r >= 60 ? "text-amber-700" : "text-red-700");

function GroupTable({ title, rows, sold, limit = 50, codes = false }: { title: string; rows: Group[]; sold: number; limit?: number; codes?: boolean }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b"><CardTitle>{title}</CardTitle></CardHeader>
      <Table containerClassName="max-h-[420px] overflow-auto" className="[&_td]:px-4 [&_th]:px-4">
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent">
            {["الاسم", "صفقات", "% من المبيعات", "المديونية", "اتحصّل", "المتبقي", `متأخر +${COLLECT_TARGET_DAYS}`, "متوسط أيام التحصيل"].map((h) => <TableHead key={h} className="text-xs text-muted-foreground">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
            {rows.slice(0, limit).map((g) => (
              <TableRow key={g.name}>
                <TableCell className="font-medium">{codes ? label(g.name) : g.name}</TableCell>
                <TableCell>{int(g.deals)}</TableCell>
                <TableCell>{pct(sold ? (g.deals / sold) * 100 : 0)}</TableCell>
                <TableCell className="whitespace-nowrap">{money(g.due)}</TableCell>
                <TableCell className={`font-semibold ${rateTone(g.rate)}`}>{pct(g.rate)}</TableCell>
                <TableCell className="whitespace-nowrap">{int(g.open)} · {money(g.openValue)}</TableCell>
                <TableCell className={`${g.overdue ? "font-semibold text-red-700" : "text-muted-foreground"}`}>{int(g.overdue)}</TableCell>
                <TableCell>{g.avgDays == null ? "—" : `${num(g.avgDays, 0)} يوم`}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>
  );
}

const openColumns: Column[] = [
  { key: "age", label: "عمرها (يوم)", kind: "number" },
  { key: "saleDate", label: "تاريخ البيع", kind: "date" },
  { key: "customerName", label: "العميل" },
  { key: "car", label: "العربية" },
  { key: "amountDue", label: "المبلغ", kind: "money" },
  { key: "bank", label: "البنك" },
  { key: "branch", label: "الفرع" },
  { key: "salesman", label: "السيلز" },
  { key: "remarks", label: "ملاحظات" },
];

export default async function ReceivablesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const d = await getReceivableStats({ ...parseRange(sp), branch: sp.branch, bank: sp.bank });
  const s = d.summary;
  const maxAging = Math.max(1, ...d.aging.map((a) => a.value));
  const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string" && v) as [string, string][]).toString();
  const pdfQuery = q ? `?${q}` : "";

  return (
    <>
      <PageHeader title="أداء التحصيل والمديونيات" subtitle="من شيت المديونيات: اتحصّل قد إيه، فاضل قد إيه، وبناخد وقت قد إيه">
        {d.total > 0 && <Button asChild variant="secondary"><a href={`/api/export/receivables${pdfQuery}`} target="_blank"><FileDown /> تقرير PDF</a></Button>}
        <Button asChild><Link href="/receivables/import"><Upload /> رفع شيت جديد</Link></Button>
      </PageHeader>

      {!d.total ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            لسه مفيش بيانات مديونيات. <Link href="/receivables/import" className="text-primary underline">ارفع شيت الإكسيل</Link> وهتظهر التحليلات هنا.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Suspense><RangeFilter /></Suspense>
            <Suspense><RecFilters filters={[{ key: "branch", label: "الفرع", options: d.options.branches }, { key: "bank", label: "البنك / الدفع", options: d.options.banks }]} /></Suspense>
          </div>

          <Card className="mb-4 border-s-4 border-s-primary">
            <CardContent>
            <div className="mb-1 text-base font-bold">إحنا عاملين إزاي؟</div>
            {s.deals ? (
              <p className="leading-7">
                اتحصّل <b className={rateTone(s.rate)}>{pct(s.rate)}</b> من الصفقات ({int(s.collected)} من {int(s.deals)})،
                يعني <b>{pct(s.valueRate)}</b> من قيمة المديونية.
                {s.avgDays != null && <> متوسط التحصيل <b>{num(s.avgDays, 0)} يوم</b> من البيع (النص {num(s.medianDays ?? 0, 0)} يوم)، </>}
                {s.onTime != null && <>و<b>{pct(s.onTime)}</b> من التحصيلات خلصت في {COLLECT_TARGET_DAYS} يوم أو أقل. </>}
                فاضل <b>{int(s.open)}</b> صفقة بـ <b>{money(s.openValue)}</b>
                {s.overdue > 0 && <>، منهم <b className="text-red-700">{int(s.overdue)} متأخرين أكتر من {COLLECT_TARGET_DAYS} يوم بـ {money(s.overdueValue)}</b></>}.
              </p>
            ) : <p>مفيش صفقات بالفلاتر دي.</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <Tile title="الصفقات" value={int(s.deals)} sub={`قيمة المديونية ${money(s.due)}`} />
            <Tile title="نسبة التحصيل" value={pct(s.rate)} sub={`بالقيمة ${pct(s.valueRate)}`} tone={s.rate >= 80 ? "good" : s.rate < 60 ? "bad" : undefined} />
            <Tile title="اتحصّل" value={money(s.collectedValue)} sub={`${int(s.collected)} صفقة`} tone="good" />
            <Tile title="المتبقي" value={money(s.openValue)} sub={`${int(s.open)} صفقة لسه`} />
            <Tile title="متوسط أيام التحصيل" value={s.avgDays == null ? "—" : `${num(s.avgDays, 0)} يوم`}
              sub={s.onTime == null ? undefined : `${pct(s.onTime)} في ${COLLECT_TARGET_DAYS} يوم أو أقل`} />
            <Tile title={`متأخر +${COLLECT_TARGET_DAYS} يوم`} value={int(s.overdue)} sub={money(s.overdueValue)} tone={s.overdue ? "bad" : "good"} />
          </div>

          {(s.returned > 0 || s.credit > 0 || s.noDate > 0) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {s.returned > 0 && <>{int(s.returned)} مردودات مش محسوبة. </>}
              {s.credit > 0 && <>{int(s.credit)} صفقة بمدين بالسالب (رصيد دائن) مش داخلة في المبالغ. </>}
              {s.noDate > 0 && <>{int(s.noDate)} صفقة مفتوحة من غير تاريخ بيع ({money(s.noDateValue)}) مش داخلة في الأعمار. </>}
            </p>
          )}

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>نسبة العربيات المتباعة · {int(d.sales.total)} عربية</CardTitle>
              <CardDescription>كل ماركة نسبتها كام من إجمالي العربيات المتباعة (من غير المردودات)</CardDescription>
              <CardAction className="flex flex-wrap gap-2">
                {d.sales.payments.map((p) => (
                  <Badge key={p.name} variant="secondary">{p.name} <b>{pct(p.pct)}</b> ({int(p.count)})</Badge>
                ))}
              </CardAction>
            </CardHeader>
            <CardContent>
            <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
              {d.sales.brands.slice(0, 16).map((b) => (
                <div key={b.name} className="grid grid-cols-[90px_1fr_110px] items-center gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{b.name}</span>
                  <div className="h-4 rounded bg-muted">
                    <div className="h-4 rounded bg-chart-1" style={{ width: `${(b.pct / (d.sales.brands[0]?.pct || 1)) * 100}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-foreground/80"><b>{pct(b.pct)}</b> · {int(b.count)} عربية</span>
                </div>
              ))}
            </div>
            {d.sales.brands.length > 16 && <p className="mt-2 text-xs text-muted-foreground">+ {int(d.sales.brands.length - 16)} ماركات تانية بنسب صغيرة</p>}
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="الصفقات كل شهر" subtitle="حسب شهر البيع: اللي اتحصّل واللي لسه">
              <CollectionTrend data={d.monthly} />
            </ChartCard>
            <ChartCard title="متوسط أيام التحصيل" subtitle={`حسب شهر التحصيل · الخط المتقطع = المستهدف ${COLLECT_TARGET_DAYS} يوم`}>
              <DaysLine data={d.collectDays} target={COLLECT_TARGET_DAYS} />
            </ChartCard>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>أعمار المديونية المفتوحة</CardTitle>
              <CardDescription>عدد الأيام من تاريخ البيع لحد النهارده</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {d.aging.map((a, i) => (
                <div key={a.name} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{a.name}</span>
                  <div className="h-5 rounded bg-muted">
                    <div className="h-5 rounded" style={{ width: `${(a.value / maxAging) * 100}%`, background: i >= 2 ? "var(--chart-2)" : "var(--chart-1)" }} />
                  </div>
                  <span className="whitespace-nowrap text-foreground/80"><b>{int(a.count)}</b> صفقة · {money(a.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <GroupTable title="الأداء حسب البنك / طريقة الدفع" rows={d.byBank} sold={d.sales.total} />
            <GroupTable title="الأداء حسب الفرع" rows={d.byBranch} sold={d.sales.total} />
          </div>
          <div className="mt-4">
            <GroupTable title="الأداء حسب السيلز" rows={d.bySalesman} sold={d.sales.total} limit={200} />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-foreground">المديونيات المفتوحة ({int(d.openRows.length)})</h2>
          {d.openRows.some((r) => (r.age ?? 0) > 90) && (
            <p className="mb-3 flex items-center gap-1 text-sm text-red-700"><AlertTriangle className="size-4" /> فيه صفقات مفتوحة من أكتر من 90 يوم — مرتبة فوق.</p>
          )}
          <DataTable columns={openColumns} filters={["bank", "branch", "salesman"]}
            rows={d.openRows.map((r) => ({
              id: r.id, age: r.age, saleDate: r.saleDate?.toISOString() ?? null, customerName: r.customerName, car: r.car,
              amountDue: r.amountDue, bank: r.bank, branch: r.branch, salesman: r.salesman, remarks: r.remarks ?? r.status,
            }))} />
        </>
      )}
    </>
  );
}
