import { Suspense } from "react";
import Link from "next/link";
import { Upload, FileDown } from "lucide-react";
import { parseRange } from "@/lib/kpis";
import { getSalesStats, type SalesGroup } from "@/lib/sales-journal/stats";
import { money, pct, int, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RangeFilter from "@/components/RangeFilter";
import RecFilters from "@/components/RecFilters";
import DataTable, { type Column } from "@/components/DataTable";
import { ChartCard, PeriodBars, SERIES } from "@/components/Charts";

type SP = { from?: string; to?: string; branch?: string; brand?: string };

const Tile = ({ sub, ...props }: Omit<React.ComponentProps<typeof StatCard>, "hint"> & { sub?: string }) => <StatCard hint={sub} {...props} />;

const marginTone = (m: number | null) => (m == null ? "text-muted-foreground" : m >= 5 ? "text-emerald-700" : m >= 0 ? "text-amber-700" : "text-red-700");

function GroupTable({ title, rows, limit = 50 }: { title: string; rows: SalesGroup[]; limit?: number }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b"><CardTitle>{title}</CardTitle></CardHeader>
      <Table containerClassName="max-h-[440px] overflow-auto" className="[&_td]:px-4 [&_th]:px-4">
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow className="hover:bg-transparent">
            {["الاسم", "عربيات", "% من المبيعات", "الإيرادات", "متوسط السعر", "الربح", "هامش الربح", "بخسارة"].map((h) => <TableHead key={h} className="text-xs text-muted-foreground">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
            {rows.slice(0, limit).map((g) => (
              <TableRow key={g.name}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>{int(g.cars)}</TableCell>
                <TableCell className="font-semibold">{pct(g.share)}</TableCell>
                <TableCell className="whitespace-nowrap">{money(g.revenue)}</TableCell>
                <TableCell className="whitespace-nowrap">{money(g.avgPrice)}</TableCell>
                <TableCell className="whitespace-nowrap">{money(g.profit)}</TableCell>
                <TableCell className={`font-semibold ${marginTone(g.margin)}`}>{g.margin == null ? "—" : pct(g.margin)}</TableCell>
                <TableCell className={`${g.losses ? "font-semibold text-red-700" : "text-muted-foreground"}`}>{int(g.losses)}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>
  );
}

const lossColumns: Column[] = [
  { key: "date", label: "التاريخ", kind: "date" }, { key: "invoiceNo", label: "الفاتورة", kind: "latin" },
  { key: "customer", label: "العميل" }, { key: "product", label: "العربية" }, { key: "branch", label: "الفرع" },
  { key: "price", label: "سعر البيع", kind: "money" }, { key: "cost", label: "التكلفة", kind: "money" }, { key: "loss", label: "الخسارة", kind: "money" },
];
const returnColumns: Column[] = [
  { key: "date", label: "التاريخ", kind: "date" }, { key: "invoiceNo", label: "إشعار المرتجع", kind: "latin" },
  { key: "customer", label: "العميل" }, { key: "product", label: "العربية" }, { key: "branch", label: "الفرع" },
  { key: "value", label: "القيمة", kind: "money" },
];

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const d = await getSalesStats({ ...parseRange(sp), branch: sp.branch, brand: sp.brand });
  const s = d.summary;
  const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string" && v) as [string, string][]).toString();
  const unit = d.periods.unit === "week" ? "أسبوع" : "شهر";
  const topBrand = d.byBrand[0], topBranch = d.byBranch[0];

  return (
    <>
      <PageHeader title="تحليل المبيعات" subtitle="من قيود المبيعات في أودو: اتباع كام عربية، بكام، والربح قد إيه">
        {d.total > 0 && <Button asChild variant="secondary"><a href={`/api/export/sales-report${q ? `?${q}` : ""}`} target="_blank"><FileDown /> تقرير PDF</a></Button>}
        <Button asChild><Link href="/receivables/import"><Upload /> رفع ملف جديد</Link></Button>
      </PageHeader>

      {!d.total ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            لسه مفيش قيود مبيعات. صدّر &quot;عنصر اليومية&quot; من أودو و<Link href="/receivables/import" className="text-primary underline">ارفعه هنا</Link>.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Suspense><RangeFilter /></Suspense>
            <Suspense><RecFilters filters={[{ key: "branch", label: "الفرع", options: d.options.branches }, { key: "brand", label: "الماركة", options: d.options.brands }]} /></Suspense>
          </div>

          <Card className="mb-4 border-s-4 border-s-primary">
            <CardContent>
            <div className="mb-1 text-base font-bold">إحنا عاملين إزاي؟</div>
            {s.cars ? (
              <p className="leading-7">
                من {fmtDate(d.period.first)} لحد {fmtDate(d.period.last)} اتباع <b>{int(s.cars)}</b> عربية
                (حوالي <b>{s.perDay.toFixed(1)}</b> عربية في اليوم) بإيرادات <b>{money(s.grossRevenue)}</b>.
                {s.margin != null && <> الربح <b>{money(s.profit)}</b> يعني هامش <b className={marginTone(s.margin)}>{pct(s.margin)}</b>، </>}
                {s.losses > 0 && <>و<b className="text-red-700">{int(s.losses)} عربية اتباعت بأقل من تكلفتها</b>. </>}
                {topBrand && <>أكتر ماركة اتباعت {topBrand.name} ({pct(topBrand.share)} من المبيعات)، </>}
                {topBranch && <>وأكتر فرع باع {topBranch.name} ({pct(topBranch.share)}). </>}
                {s.returns > 0 && <>فيه {int(s.returns)} مرتجع ({pct(s.returnRate)}). </>}
              </p>
            ) : <p>مفيش مبيعات بالفلاتر دي.</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <Tile title="العربيات المتباعة" value={int(s.cars)} sub={`${int(s.returns)} مرتجع · الصافي ${int(s.netCars)}`} />
            <Tile title="الإيرادات" value={money(s.grossRevenue)} sub={s.returnsValue ? `الصافي بعد المرتجعات ${money(s.netRevenue)}` : undefined} />
            <Tile title="إجمالي الربح" value={money(s.profit)} sub={s.margin == null ? "مفيش تكلفة شاسيه" : `هامش ${pct(s.margin)}`}
              tone={s.margin == null ? undefined : s.margin >= 5 ? "good" : s.margin < 0 ? "bad" : undefined} />
            <Tile title="متوسط سعر العربية" value={money(s.avgPrice)} sub={`متوسط الربح ${money(s.avgProfit)}`} />
            <Tile title="اتباعت بخسارة" value={int(s.losses)} sub="سعر البيع أقل من تكلفة الشاسيه" tone={s.losses ? "bad" : "good"} />
            <Tile title="فوائد التقسيط" value={money(s.interest)} sub={`${pct(s.installmentShare)} من العربيات بالتقسيط`} />
          </div>
          {s.costCovered < 99 && (
            <p className="mt-2 text-xs text-muted-foreground">الربح محسوب على {pct(s.costCovered)} من العربيات بس — الباقي مالوش تكلفة شاسيه في أودو.</p>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title={`العربيات المتباعة كل ${unit}`} subtitle={d.periods.unit === "week" ? "الأسبوع بيبدأ يوم السبت" : undefined}>
              <PeriodBars name="عربيات" data={d.periods.rows.map((p) => ({ label: p.label, value: p.cars }))} />
            </ChartCard>
            <ChartCard title={`الربح كل ${unit}`} subtitle="سعر البيع − تكلفة الشاسيه">
              <PeriodBars name="الربح" money color={SERIES[2]} data={d.periods.rows.map((p) => ({ label: p.label, value: Math.round(p.profit) }))} />
            </ChartCard>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>نسبة العربيات المتباعة لكل ماركة · {int(s.cars)} عربية</CardTitle>
              <CardAction className="flex flex-wrap gap-2">
                {d.byPayment.map((p) => <Badge key={p.name} variant="secondary">{p.name} <b>{pct(p.share)}</b> ({int(p.cars)})</Badge>)}
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-x-8 gap-y-2 md:grid-cols-2">
              {d.byBrand.slice(0, 16).map((b) => (
                <div key={b.name} className="grid grid-cols-[100px_1fr_120px] items-center gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{b.name}</span>
                  <div className="h-4 rounded bg-muted">
                    <div className="h-4 rounded bg-chart-1" style={{ width: `${(b.share / (d.byBrand[0]?.share || 1)) * 100}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-foreground/80"><b>{pct(b.share)}</b> · {int(b.cars)} عربية</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4">
            <GroupTable title="حسب الفرع" rows={d.byBranch} />
            <GroupTable title="حسب الماركة" rows={d.byBrand} />
            <GroupTable title="أكتر الموديلات مبيعًا" rows={d.byModel} />
          </div>

          {d.lossRows.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-lg font-bold text-foreground">عربيات اتباعت بأقل من تكلفتها ({int(d.lossRows.length)})</h2>
              <DataTable columns={lossColumns} filters={["branch"]} rows={d.lossRows.map((x) => ({
                id: x.id, date: x.date.toISOString(), invoiceNo: x.invoiceNo, customer: x.customer, product: x.product, branch: x.branch,
                price: x.credit, cost: x.chassisCost, loss: x.credit - (x.chassisCost ?? 0),
              }))} />
            </>
          )}
          {d.returnRows.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-lg font-bold text-foreground">المرتجعات ({int(d.returnRows.length)})</h2>
              <DataTable columns={returnColumns} rows={d.returnRows.map((x) => ({
                id: x.id, date: x.date.toISOString(), invoiceNo: x.invoiceNo, customer: x.customer, product: x.product, branch: x.branch, value: x.debit,
              }))} />
            </>
          )}
        </>
      )}
    </>
  );
}
