import { Suspense } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import ExportButtons from "@/components/ExportButtons";
import CompareTable from "@/components/CompareTable";
import { getReportData, parseRange } from "@/lib/kpis";
import { compareSalesmen, monthlySales, pickSalesmen, MAX_COMPARE } from "@/lib/compare";
import { pct, int } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import RangeFilter from "@/components/RangeFilter";
import SalesmanPicker from "@/components/SalesmanPicker";
import { ChartCard, MultiLine, SERIES } from "@/components/Charts";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; s?: string }> }) {
  const sp = await searchParams;
  const d = await getReportData(parseRange(sp));
  const all = d.workers.salesmen.filter((x) => x.name !== "غير محدد");
  const list = pickSalesmen(all, sp.s);
  const { rows, wins, leaders } = compareSalesmen(list);
  const names = list.map((x) => x.name);
  const monthly = monthlySales(d.sales, names);
  const q = new URLSearchParams(Object.entries({ from: sp.from, to: sp.to, modules: "workers" }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader title="مقارنة البيّاعين" subtitle="مقارنة جنب بعض: الزيارات، نسبة البيع، المبيعات، التسليم، والشكاوى">
        <Link href="/workers" className="btn-ghost">رجوع لأداء العمال</Link>
        <ExportButtons pdfHref={`/api/export/pdf?${q}`} xlsxHref={`/api/export/excel?${q}`} />
      </PageHeader>
      <div className="mb-4"><Suspense><RangeFilter /></Suspense></div>

      {!all.length ? (
        <div className="card p-10 text-center text-slate-500">
          لسه مفيش بيانات للبيّاعين. سجّل <Link className="text-brand underline" href="/visits/new">زيارات العملاء</Link> و<Link className="text-brand underline" href="/sales/new">المبيعات</Link> الأول.
        </div>
      ) : (
        <>
          <Suspense><SalesmanPicker all={all.map((x) => x.name)} selected={names} max={MAX_COMPARE} colors={SERIES} /></Suspense>

          <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}>
            {list.map((x, i) => {
              const lead = leaders.includes(i) && list.length > 1;
              return (
                <div key={x.name} className={`card p-5 ${lead ? "ring-2 ring-amber-400" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span className="h-3 w-3 rounded-full" style={{ background: SERIES[i] }} /> {x.name}
                    </div>
                    {lead && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800"><Crown size={12} /> الأفضل إجمالاً</span>}
                  </div>
                  <div className="mt-3 text-3xl font-bold">{pct(x.conversionRate)}</div>
                  <div className="text-xs text-slate-500">نسبة البيع: اشترى {int(x.won)} من {int(x.visits)} زيارة</div>
                  <div className="mt-3 text-sm text-slate-600">كسب في <b className="text-slate-900">{int(wins[i])}</b> من {int(rows.length)} مقياس</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4"><CompareTable names={names} rows={rows} colors={SERIES} /></div>
          <p className="mt-2 text-xs text-slate-500">&quot;الأفضل&quot; بيتحدد لكل مقياس لوحده (لو كله متساوي مفيش أفضل). &quot;الأفضل إجمالاً&quot; هو اللي كسب في أكبر عدد من المقاييس.</p>

          <div className="mt-4">
            <ChartCard title="المبيعات كل شهر" subtitle="إجمالي قيمة المبيعات لكل بيّاع بالجنيه">
              <MultiLine data={monthly} names={names} colors={SERIES} />
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}
