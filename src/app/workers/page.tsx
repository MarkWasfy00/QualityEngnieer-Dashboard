import { Suspense } from "react";
import Link from "next/link";
import { Trophy, ShieldCheck, Timer, ClipboardCheck, HandCoins, Smile, Target, Scale } from "lucide-react";
import { getReportData, parseRange } from "@/lib/kpis";
import { pct, num, int, money } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import RangeFilter from "@/components/RangeFilter";
import DataTable, { type Column } from "@/components/DataTable";
import { ChartCard, HBar, SERIES } from "@/components/Charts";

const MIN = 3; // minimum jobs before a worker is eligible for "best" highlights

function Highlight({ icon: Icon, title, who, value }: { icon: React.ElementType; title: string; who?: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500"><Icon size={16} className="text-brand" /> {title}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{who ?? "—"}</div>
      <div className="mt-1 text-xs text-slate-500">{who ? value : "مفيش بيانات كفاية"}</div>
    </div>
  );
}

const techCols: Column[] = [
  { key: "name", label: "الفني" },
  { key: "jobs", label: "أوامر الشغل", kind: "number" },
  { key: "completionRate", label: "نسبة الإنجاز", kind: "percent" },
  { key: "laborHours", label: "ساعات الشغل", kind: "decimal" },
  { key: "avgTurnaroundHrs", label: "متوسط التسليم (ساعة)", kind: "decimal" },
  { key: "comebacks", label: "رجعت تاني", kind: "number" },
  { key: "comebackRate", label: "نسبة الرجوع", kind: "percent" },
  { key: "defects", label: "عيوب متكلف بيها", kind: "number" },
  { key: "fixRate", label: "نسبة الإصلاح", kind: "percent" },
  { key: "avgFixDays", label: "متوسط أيام الإصلاح", kind: "decimal" },
  { key: "revenue", label: "قيمة الشغل", kind: "money" },
];
const inspCols: Column[] = [
  { key: "name", label: "الفاحص" },
  { key: "inspections", label: "عدد الفحوصات", kind: "number" },
  { key: "itemsChecked", label: "بنود اتفحصت", kind: "number" },
  { key: "issuesFound", label: "مشاكل اكتشفها", kind: "number" },
  { key: "failed", label: "فحوصات غير مطابقة", kind: "number" },
  { key: "detectionRate", label: "نسبة الاكتشاف", kind: "percent" },
  { key: "avgScore", label: "متوسط المطابقة", kind: "percent" },
];
const salesCols: Column[] = [
  { key: "name", label: "البيّاع" },
  { key: "visits", label: "الزيارات", kind: "number" },
  { key: "won", label: "اشترى منها", kind: "number" },
  { key: "conversionRate", label: "نسبة البيع من الزيارات", kind: "percent" },
  { key: "carsSold", label: "عربيات اتباعت", kind: "number" },
  { key: "totalSales", label: "إجمالي المبيعات", kind: "money" },
  { key: "avgPrice", label: "متوسط سعر العربية", kind: "money" },
  { key: "cash", label: "كاش", kind: "number" },
  { key: "financed", label: "تقسيط / تمويل", kind: "number" },
  { key: "pendingDelivery", label: "لسه متسلمتش", kind: "number" },
  { key: "avgDeliveryDays", label: "متوسط أيام التسليم", kind: "decimal" },
  { key: "complaints", label: "شكاوى على عربياته", kind: "number" },
  { key: "deliveryComplaints", label: "شكاوى حالة التسليم", kind: "number" },
  { key: "complaintRate", label: "نسبة الشكاوى للمبيعات", kind: "percent" },
  { key: "csat", label: "رضا عملائه (من 5)", kind: "decimal" },
];
const keeperCols: Column[] = [
  { key: "name", label: "أمين المخزن" },
  { key: "defects", label: "عيوب على عربياته", kind: "number" },
  { key: "open", label: "لسه مفتوحة", kind: "number" },
  { key: "critical", label: "عالية / حرجة", kind: "number" },
  { key: "cost", label: "تكلفة الإصلاح", kind: "money" },
];

export default async function WorkersPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { workers: w } = await getReportData(parseRange(sp));
  const rows = <T extends object>(xs: T[]) => xs.map((x, i) => ({ id: i + 1, ...x }));

  const eligible = w.technicians.filter((t) => t.jobs >= MIN && t.name !== "غير محدد");
  const busiest = [...eligible].sort((a, b) => b.jobs - a.jobs)[0];
  const lowestComeback = [...eligible].sort((a, b) => a.comebackRate - b.comebackRate || b.jobs - a.jobs)[0];
  const fastest = eligible.filter((t) => t.completed >= MIN).sort((a, b) => a.avgTurnaroundHrs - b.avgTurnaroundHrs)[0];
  const topInspector = w.inspectors.filter((i) => i.name !== "غير محدد")[0];
  const q = new URLSearchParams(sp as Record<string, string>).toString();
  const wq = new URLSearchParams({ ...(sp as Record<string, string>), modules: "workers" }).toString();
  const sellers = w.salesmen.filter((x) => x.name !== "غير محدد");
  const topSeller = sellers[0];
  const bestCsat = sellers.filter((x) => x.carsSold >= MIN && x.complaints > 0).sort((a, b) => b.csat - a.csat)[0];
  const bestConv = sellers.filter((x) => x.visits >= MIN).sort((a, b) => b.conversionRate - a.conversionRate || b.visits - a.visits)[0];
  const fewestComplaints = sellers.filter((x) => x.carsSold >= MIN).sort((a, b) => a.complaintRate - b.complaintRate || b.carsSold - a.carsSold)[0];

  return (
    <>
      <PageHeader title="أداء العمال" subtitle="أداء البيّاعين والفنيين والفاحصين وأمناء المخزن في الفترة المختارة">
        <ExportButtons pdfHref={`/api/export/pdf?${wq}`} xlsxHref={`/api/export/excel?${wq}`} />
      </PageHeader>
      <div className="mb-6"><Suspense><RangeFilter /></Suspense></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Highlight icon={Trophy} title="أكتر فني شغال" who={busiest?.name} value={`${int(busiest?.jobs)} أمر شغل · ${num(busiest?.laborHours ?? 0)} ساعة`} />
        <Highlight icon={ShieldCheck} title="أقل نسبة رجوع" who={lowestComeback?.name} value={`نسبة الرجوع ${pct(lowestComeback?.comebackRate ?? 0)} من ${int(lowestComeback?.jobs)} أمر`} />
        <Highlight icon={Timer} title="أسرع فني في التسليم" who={fastest?.name} value={`متوسط ${num(fastest?.avgTurnaroundHrs ?? 0)} ساعة`} />
        <Highlight icon={ClipboardCheck} title="أكتر فاحص" who={topInspector?.name} value={`${int(topInspector?.inspections)} فحص · اكتشف ${int(topInspector?.issuesFound)} مشكلة`} />
      </div>
      <p className="mt-2 text-xs text-slate-500">* الفني لازم يكون عنده {MIN} أوامر شغل على الأقل عشان يدخل في المقارنة.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="أوامر الشغل لكل فني" subtitle="عدد أوامر الصيانة في الفترة">
          <HBar data={w.technicians.map((t) => ({ name: t.name, value: t.jobs }))} />
        </ChartCard>
        <ChartCard title="المشاكل اللي اكتشفها كل فاحص" subtitle="عدد البنود غير المطابقة">
          <HBar data={w.inspectors.map((i) => ({ name: i.name, value: i.issuesFound }))} color={SERIES[2]} />
        </ChartCard>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">المبيعات</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Highlight icon={Target} title="أعلى نسبة بيع من الزيارات" who={bestConv?.name} value={`${pct(bestConv?.conversionRate ?? 0)} · اشترى ${int(bestConv?.won)} من ${int(bestConv?.visits)} زيارة`} />
        <Highlight icon={HandCoins} title="أعلى مبيعات" who={topSeller?.name} value={`${money(topSeller?.totalSales ?? 0)} · ${int(topSeller?.carsSold)} عربية`} />
        <Highlight icon={ShieldCheck} title="أقل شكاوى على عربياته" who={fewestComplaints?.name} value={`${pct(fewestComplaints?.complaintRate ?? 0)} من ${int(fewestComplaints?.carsSold)} عربية`} />
        <Highlight icon={Smile} title="أعلى رضا عملاء" who={bestCsat?.name} value={`${num(bestCsat?.csat ?? 0)} من 5`} />
      </div>
      <div className="mt-2 mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">* لازم {MIN} زيارات / عربيات على الأقل عشان البيّاع يدخل في المقارنة. نسبة البيع = الزيارات اللي اشترت ÷ كل الزيارات. الشكاوى بتتحسب على البيّاع اللي باع العربية.</p>
        <Link href={`/workers/compare${q ? "?" + q : ""}`} className="btn-primary"><Scale size={16} /> قارن بين البيّاعين</Link>
      </div>
      {w.salesmen.length ? (
        <div className="mb-4"><ChartCard title="إجمالي المبيعات لكل بيّاع" subtitle="بالجنيه المصري">
          <HBar data={w.salesmen.map((x) => ({ name: x.name, value: Math.round(x.totalSales) }))} color={SERIES[3]} />
        </ChartCard></div>
      ) : null}
      <DataTable columns={salesCols} rows={rows(w.salesmen)} />
      {!w.salesmen.length && <p className="mt-2 text-sm text-slate-500">لسه مفيش مبيعات متسجلة. سجّل المبيعات من صفحة <Link className="text-brand underline" href="/sales/new">المبيعات</Link>.</p>}

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">الفنيين</h2>
      <DataTable columns={techCols} rows={rows(w.technicians)} />
      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">الفاحصين</h2>
      <DataTable columns={inspCols} rows={rows(w.inspectors)} />
      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">أمناء المخزن</h2>
      <p className="mb-3 text-sm text-slate-500">العيوب اللي اتلاقت على العربيات اللي في عهدة كل أمين مخزن.</p>
      <DataTable columns={keeperCols} rows={rows(w.keepers)} />
    </>
  );
}
