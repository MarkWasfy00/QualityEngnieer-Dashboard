import { Suspense } from "react";
import Link from "next/link";
import { Crown, FileDown, Building2 } from "lucide-react";
import { getReportData, parseRange } from "@/lib/kpis";
import { compareBranches } from "@/lib/compare";
import { pct, int, num } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import RangeFilter from "@/components/RangeFilter";
import CompareTable from "@/components/CompareTable";
import { ChartCard, HBar, SERIES } from "@/components/Charts";

export default async function BranchQualityPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const d = await getReportData(parseRange(sp));
  const list = d.branches;
  const real = list.filter((b) => !b.unassigned);
  const { rows, wins, leaders } = compareBranches(list);
  const names = list.map((b) => b.name);
  const q = new URLSearchParams(Object.entries({ from: sp.from, to: sp.to, modules: "branches" }).filter(([, v]) => v) as [string, string][]).toString();
  const unassigned = list.find((b) => b.unassigned);

  return (
    <>
      <PageHeader title="جودة الفروع" subtitle="مقارنة الفروع في الجودة والصيانة ورضا العملاء والمبيعات">
        <Link href="/branches" className="btn-ghost"><Building2 size={16} /> إدارة الفروع</Link>
        <a href={`/api/export/excel?${q}`} className="btn-dark"><FileDown size={16} /> إكسيل</a>
        <a href={`/api/export/pdf?${q}`} className="btn-dark"><FileDown size={16} /> PDF</a>
      </PageHeader>
      <div className="mb-4"><Suspense><RangeFilter /></Suspense></div>

      {!real.length && (
        <div className="card mb-4 p-6 text-center text-slate-600">
          لسه مفيش فروع متسجلة. ضيف الفروع من <Link className="text-brand underline" href="/branches/new">صفحة الفروع</Link>، وبعدين اختار الفرع لكل عربية وبيّاع.
        </div>
      )}
      {unassigned && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {unassigned.vehicles > 0
            ? <>فيه {int(unassigned.vehicles)} عربية من غير فرع، وبياناتهم ظاهرة تحت &quot;بدون فرع&quot;. حدد الفرع لكل عربية من <Link className="underline" href="/vehicles">صفحة العربيات</Link> عشان المقارنة تبقى دقيقة.</>
            : <>فيه بيانات من غير فرع ({int(unassigned.complaints)} شكوى · {int(unassigned.visits)} زيارة · {int(unassigned.sales)} بيعة) ظاهرة تحت &quot;بدون فرع&quot;. حدد الفرع في <Link className="underline" href="/complaints">الشكاوى</Link> أو للبيّاع من <Link className="underline" href="/salesmen">صفحة البيّاعين</Link>.</>}
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {list.map((b, i) => {
              const lead = leaders.includes(i) && list.length > 1;
              return (
                <div key={b.id} className={`card p-5 ${lead ? "ring-2 ring-amber-400" : ""} ${b.unassigned ? "border-dashed" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900">{b.name}</div>
                    {lead && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800"><Crown size={12} /> الأفضل</span>}
                  </div>
                  <div className="mt-3 text-3xl font-bold">{b.inspections ? pct(b.firstPassYield) : "—"}</div>
                  <div className="text-xs text-slate-500">نسبة النجاح من أول مرة · {int(b.inspections)} فحص</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold text-slate-900">{int(b.vehicles)}</div>عربية</div>
                    <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold text-slate-900">{int(b.openDefects)}</div>عيب مفتوح</div>
                    <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold text-slate-900">{b.rated ? num(b.csat) : "—"}</div>رضا العملاء</div>
                  </div>
                  {b.unassigned
                    ? <div className="mt-3 text-xs text-slate-500">للعلم بس — مش داخل في المقارنة</div>
                    : <div className="mt-3 text-sm text-slate-600">كسب في <b className="text-slate-900">{int(wins[i])}</b> من {int(rows.length)} مقياس</div>}
                </div>
              );
            })}
          </div>

          <div className="mt-4"><CompareTable names={names} rows={rows} firstHeader="المقياس / الفرع" /></div>
          <p className="mt-2 text-xs text-slate-500">
            الفحص والعيوب والصيانة بتتحسب على فرع العربية. الشكوى على الفرع المكتوب فيها، ولو مش مكتوب يبقى فرع العربية. المبيعات على فرع العربية، والزيارات على فرع البيّاع.
            &quot;عيوب لكل عربية&quot; و&quot;شكاوى لكل 100 عربية&quot; بيتحسبوا على عدد العربيات الحالي في الفرع.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="نسبة النجاح من أول مرة لكل فرع" subtitle="٪ الفحوصات المطابقة من أول مرة">
              <HBar data={list.filter((b) => b.inspections).map((b) => ({ name: b.name, value: Math.round(b.firstPassYield) }))} />
            </ChartCard>
            <ChartCard title="العيوب المفتوحة لكل فرع" subtitle="عدد العيوب اللي لسه مفتوحة">
              <HBar data={list.map((b) => ({ name: b.name, value: b.openDefects }))} color={SERIES[1]} />
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}
