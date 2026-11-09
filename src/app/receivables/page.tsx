import { Suspense } from "react";
import Link from "next/link";
import { Upload, AlertTriangle, FileDown } from "lucide-react";
import { parseRange } from "@/lib/kpis";
import { getReceivableStats, COLLECT_TARGET_DAYS, type Group } from "@/lib/receivables/stats";
import { money, pct, int, num } from "@/lib/format";
import { label } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import RangeFilter from "@/components/RangeFilter";
import RecFilters from "@/components/RecFilters";
import DataTable, { type Column } from "@/components/DataTable";
import { ChartCard, CollectionTrend, DaysLine } from "@/components/Charts";

type SP = { from?: string; to?: string; branch?: string; bank?: string };

function Tile({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-slate-900"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

const rateTone = (r: number) => (r >= 80 ? "text-emerald-700" : r >= 60 ? "text-amber-700" : "text-red-700");

function GroupTable({ title, rows, sold, limit = 50, codes = false }: { title: string; rows: Group[]; sold: number; limit?: number; codes?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 p-4 font-bold text-slate-900">{title}</div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
            <tr>{["الاسم", "صفقات", "% من المبيعات", "المديونية", "اتحصّل", "المتبقي", `متأخر +${COLLECT_TARGET_DAYS}`, "متوسط أيام التحصيل"].map((h) =>
              <th key={h} className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, limit).map((g) => (
              <tr key={g.name} className="hover:bg-slate-50/70">
                <td className="px-3 py-2 font-medium">{codes ? label(g.name) : g.name}</td>
                <td className="px-3 py-2">{int(g.deals)}</td>
                <td className="px-3 py-2">{pct(sold ? (g.deals / sold) * 100 : 0)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{money(g.due)}</td>
                <td className={`px-3 py-2 font-semibold ${rateTone(g.rate)}`}>{pct(g.rate)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{int(g.open)} · {money(g.openValue)}</td>
                <td className={`px-3 py-2 ${g.overdue ? "font-semibold text-red-700" : "text-slate-400"}`}>{int(g.overdue)}</td>
                <td className="px-3 py-2">{g.avgDays == null ? "—" : `${num(g.avgDays, 0)} يوم`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
        {d.total > 0 && <a href={`/api/export/receivables${pdfQuery}`} target="_blank" className="btn-dark"><FileDown size={16} /> تقرير PDF</a>}
        <Link href="/receivables/import" className="btn-primary"><Upload size={16} /> رفع شيت جديد</Link>
      </PageHeader>

      {!d.total ? (
        <div className="card p-10 text-center text-slate-600">
          لسه مفيش بيانات مديونيات. <Link href="/receivables/import" className="text-brand underline">ارفع شيت الإكسيل</Link> وهتظهر التحليلات هنا.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Suspense><RangeFilter /></Suspense>
            <Suspense><RecFilters filters={[{ key: "branch", label: "الفرع", options: d.options.branches }, { key: "bank", label: "البنك / الدفع", options: d.options.banks }]} /></Suspense>
          </div>

          <div className="card mb-4 border-s-4 !border-s-brand p-5 text-slate-700">
            <div className="mb-1 font-bold text-slate-900">إحنا عاملين إزاي؟</div>
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
          </div>

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
            <p className="mt-2 text-xs text-slate-500">
              {s.returned > 0 && <>{int(s.returned)} مردودات مش محسوبة. </>}
              {s.credit > 0 && <>{int(s.credit)} صفقة بمدين بالسالب (رصيد دائن) مش داخلة في المبالغ. </>}
              {s.noDate > 0 && <>{int(s.noDate)} صفقة مفتوحة من غير تاريخ بيع ({money(s.noDateValue)}) مش داخلة في الأعمار. </>}
            </p>
          )}

          <div className="card mt-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold text-slate-900">نسبة العربيات المتباعة · {int(d.sales.total)} عربية</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {d.sales.payments.map((p) => (
                  <span key={p.name} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{p.name} <b>{pct(p.pct)}</b> ({int(p.count)})</span>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">كل ماركة نسبتها كام من إجمالي العربيات المتباعة (من غير المردودات)</p>
            <div className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
              {d.sales.brands.slice(0, 16).map((b) => (
                <div key={b.name} className="grid grid-cols-[90px_1fr_110px] items-center gap-3 text-sm">
                  <span className="truncate text-slate-600">{b.name}</span>
                  <div className="h-4 rounded bg-slate-100">
                    <div className="h-4 rounded bg-[#2a78d6]" style={{ width: `${(b.pct / (d.sales.brands[0]?.pct || 1)) * 100}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-slate-700"><b>{pct(b.pct)}</b> · {int(b.count)} عربية</span>
                </div>
              ))}
            </div>
            {d.sales.brands.length > 16 && <p className="mt-2 text-xs text-slate-500">+ {int(d.sales.brands.length - 16)} ماركات تانية بنسب صغيرة</p>}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="الصفقات كل شهر" subtitle="حسب شهر البيع: اللي اتحصّل واللي لسه">
              <CollectionTrend data={d.monthly} />
            </ChartCard>
            <ChartCard title="متوسط أيام التحصيل" subtitle={`حسب شهر التحصيل · الخط المتقطع = المستهدف ${COLLECT_TARGET_DAYS} يوم`}>
              <DaysLine data={d.collectDays} target={COLLECT_TARGET_DAYS} />
            </ChartCard>
          </div>

          <div className="card mt-4 p-5">
            <h3 className="font-bold text-slate-900">أعمار المديونية المفتوحة</h3>
            <p className="text-xs text-slate-500">عدد الأيام من تاريخ البيع لحد النهارده</p>
            <div className="mt-4 space-y-3">
              {d.aging.map((a, i) => (
                <div key={a.name} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-slate-600">{a.name}</span>
                  <div className="h-5 rounded bg-slate-100">
                    <div className="h-5 rounded" style={{ width: `${(a.value / maxAging) * 100}%`, background: i >= 2 ? "#eb6834" : "#2a78d6" }} />
                  </div>
                  <span className="whitespace-nowrap text-slate-700"><b>{int(a.count)}</b> صفقة · {money(a.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <GroupTable title="الأداء حسب البنك / طريقة الدفع" rows={d.byBank} sold={d.sales.total} />
            <GroupTable title="الأداء حسب الفرع" rows={d.byBranch} sold={d.sales.total} />
          </div>
          <div className="mt-4">
            <GroupTable title="الأداء حسب السيلز" rows={d.bySalesman} sold={d.sales.total} limit={200} />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">المديونيات المفتوحة ({int(d.openRows.length)})</h2>
          {d.openRows.some((r) => (r.age ?? 0) > 90) && (
            <p className="mb-3 flex items-center gap-1 text-sm text-red-700"><AlertTriangle size={16} /> فيه صفقات مفتوحة من أكتر من 90 يوم — مرتبة فوق.</p>
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
