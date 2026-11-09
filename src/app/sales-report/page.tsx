import { Suspense } from "react";
import Link from "next/link";
import { Upload, FileDown } from "lucide-react";
import { parseRange } from "@/lib/kpis";
import { getSalesStats, type SalesGroup } from "@/lib/sales-journal/stats";
import { money, pct, int, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import RangeFilter from "@/components/RangeFilter";
import RecFilters from "@/components/RecFilters";
import DataTable, { type Column } from "@/components/DataTable";
import { ChartCard, PeriodBars, SERIES } from "@/components/Charts";

type SP = { from?: string; to?: string; branch?: string; brand?: string };

function Tile({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-slate-900"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

const marginTone = (m: number | null) => (m == null ? "text-slate-400" : m >= 5 ? "text-emerald-700" : m >= 0 ? "text-amber-700" : "text-red-700");

function GroupTable({ title, rows, limit = 50 }: { title: string; rows: SalesGroup[]; limit?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 p-4 font-bold text-slate-900">{title}</div>
      <div className="max-h-[440px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
            <tr>{["الاسم", "عربيات", "% من المبيعات", "الإيرادات", "متوسط السعر", "الربح", "هامش الربح", "بخسارة"].map((h) =>
              <th key={h} className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, limit).map((g) => (
              <tr key={g.name} className="hover:bg-slate-50/70">
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2">{int(g.cars)}</td>
                <td className="px-3 py-2 font-semibold">{pct(g.share)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(g.revenue)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(g.avgPrice)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(g.profit)}</td>
                <td className={`px-3 py-2 font-semibold ${marginTone(g.margin)}`}>{g.margin == null ? "—" : pct(g.margin)}</td>
                <td className={`px-3 py-2 ${g.losses ? "font-semibold text-red-700" : "text-slate-400"}`}>{int(g.losses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
        {d.total > 0 && <a href={`/api/export/sales-report${q ? `?${q}` : ""}`} target="_blank" className="btn-dark"><FileDown size={16} /> تقرير PDF</a>}
        <Link href="/receivables/import" className="btn-primary"><Upload size={16} /> رفع ملف جديد</Link>
      </PageHeader>

      {!d.total ? (
        <div className="card p-10 text-center text-slate-600">
          لسه مفيش قيود مبيعات. صدّر &quot;عنصر اليومية&quot; من أودو و<Link href="/receivables/import" className="text-brand underline">ارفعه هنا</Link>.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Suspense><RangeFilter /></Suspense>
            <Suspense><RecFilters filters={[{ key: "branch", label: "الفرع", options: d.options.branches }, { key: "brand", label: "الماركة", options: d.options.brands }]} /></Suspense>
          </div>

          <div className="card mb-4 border-s-4 !border-s-brand p-5 text-slate-700">
            <div className="mb-1 font-bold text-slate-900">إحنا عاملين إزاي؟</div>
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
          </div>

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
            <p className="mt-2 text-xs text-slate-500">الربح محسوب على {pct(s.costCovered)} من العربيات بس — الباقي مالوش تكلفة شاسيه في أودو.</p>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title={`العربيات المتباعة كل ${unit}`} subtitle={d.periods.unit === "week" ? "الأسبوع بيبدأ يوم السبت" : undefined}>
              <PeriodBars name="عربيات" data={d.periods.rows.map((p) => ({ label: p.label, value: p.cars }))} />
            </ChartCard>
            <ChartCard title={`الربح كل ${unit}`} subtitle="سعر البيع − تكلفة الشاسيه">
              <PeriodBars name="الربح" money color={SERIES[2]} data={d.periods.rows.map((p) => ({ label: p.label, value: Math.round(p.profit) }))} />
            </ChartCard>
          </div>

          <div className="card mt-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold text-slate-900">نسبة العربيات المتباعة لكل ماركة · {int(s.cars)} عربية</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {d.byPayment.map((p) => <span key={p.name} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{p.name} <b>{pct(p.share)}</b> ({int(p.cars)})</span>)}
              </div>
            </div>
            <div className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
              {d.byBrand.slice(0, 16).map((b) => (
                <div key={b.name} className="grid grid-cols-[100px_1fr_120px] items-center gap-3 text-sm">
                  <span className="truncate text-slate-600">{b.name}</span>
                  <div className="h-4 rounded bg-slate-100">
                    <div className="h-4 rounded bg-[#2a78d6]" style={{ width: `${(b.share / (d.byBrand[0]?.share || 1)) * 100}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-slate-700"><b>{pct(b.share)}</b> · {int(b.cars)} عربية</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <GroupTable title="حسب الفرع" rows={d.byBranch} />
            <GroupTable title="حسب الماركة" rows={d.byBrand} />
            <GroupTable title="أكتر الموديلات مبيعًا" rows={d.byModel} />
          </div>

          {d.lossRows.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">عربيات اتباعت بأقل من تكلفتها ({int(d.lossRows.length)})</h2>
              <DataTable columns={lossColumns} filters={["branch"]} rows={d.lossRows.map((x) => ({
                id: x.id, date: x.date.toISOString(), invoiceNo: x.invoiceNo, customer: x.customer, product: x.product, branch: x.branch,
                price: x.credit, cost: x.chassisCost, loss: x.credit - (x.chassisCost ?? 0),
              }))} />
            </>
          )}
          {d.returnRows.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">المرتجعات ({int(d.returnRows.length)})</h2>
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
