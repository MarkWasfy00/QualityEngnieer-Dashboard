import { Suspense } from "react";
import Link from "next/link";
import { ClipboardCheck, AlertTriangle, Banknote, RotateCcw, Timer, MessageSquareWarning, Star, FileDown, Hourglass } from "lucide-react";
import { getReportData, parseRange } from "@/lib/kpis";
import { money, pct, num, int } from "@/lib/format";
import { SEVERITY_COLORS, label } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import RangeFilter from "@/components/RangeFilter";
import { ChartCard, HBar, TrendChart, CostChart } from "@/components/Charts";

function Kpi({ icon: Icon, title, value, hint }: { icon: React.ElementType; title: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500"><Icon size={16} className="text-brand" /> {title}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { kpis: k, breakdowns: b } = await getReportData(parseRange(sp));
  const q = new URLSearchParams(sp as Record<string, string>).toString();
  return (
    <>
      <PageHeader title="لوحة متابعة الجودة" subtitle="الفحص والعيوب والصيانة وشكاوى العملاء في مكان واحد">
        <ExportButtons pdfHref={`/api/export/pdf${q ? "?" + q : ""}`} xlsxHref={`/api/export/excel${q ? "?" + q : ""}`} />
        <Link href={`/reports${q ? "?" + q : ""}`} className="btn-dark"><FileDown size={16} /> تقرير مخصص</Link>
      </PageHeader>
      <div className="mb-6"><Suspense><RangeFilter /></Suspense></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ClipboardCheck} title="نسبة النجاح من أول مرة" value={pct(k.firstPassYield)} hint={`${int(k.inspections)} فحص · متوسط المطابقة ${pct(k.avgInspectionScore)}`} />
        <Kpi icon={AlertTriangle} title="عيوب مفتوحة" value={int(k.openDefects)} hint={`${int(k.criticalOpen)} حرجة · ${int(k.defects)} متسجلة`} />
        <Kpi icon={Banknote} title="متوسط تكلفة الإصلاح" value={money(k.avgRepairCost)} hint={`الإجمالي ${money(k.totalRepairCost)}`} />
        <Kpi icon={RotateCcw} title="نسبة رجوع العربيات" value={pct(k.comebackRate)} hint={`من ${int(k.serviceJobs)} أمر صيانة`} />
        <Kpi icon={Timer} title="متوسط مدة التسليم" value={`${num(k.avgTurnaroundHrs)} ساعة`} hint={`تكلفة الصيانة ${money(k.totalServiceCost)}`} />
        <Kpi icon={MessageSquareWarning} title="شكاوى مفتوحة" value={int(k.openComplaints)} hint={`من ${int(k.complaints)} شكوى`} />
        <Kpi icon={Hourglass} title="متوسط وقت حل الشكوى" value={`${num(k.avgResolutionDays)} يوم`} hint="من استلام الشكوى لحد حلها" />
        <Kpi icon={Star} title="رضا العملاء" value={`${num(k.csat)} من 5`} hint="متوسط تقييم الشكاوى المقفولة" />
      </div>

      <div className="card mt-4 flex flex-wrap items-center gap-6 p-5">
        <span className="text-sm font-bold text-slate-700">العيوب حسب الخطورة</span>
        {b.defectsBySeverity.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: `#${SEVERITY_COLORS[s.name].bg}`, color: `#${SEVERITY_COLORS[s.name].fg}` }}>{label(s.name)}</span>
            <span className="text-lg font-bold">{int(s.value)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="نتايج الفحص كل شهر" subtitle="عدد المطابق وغير المطابق"><TrendChart data={b.inspectionTrend} /></ChartCard>
        <ChartCard title="العيوب حسب القسم" subtitle="عدد العيوب المتسجلة"><HBar data={b.defectsByCategory} /></ChartCard>
        <ChartCard title="تكلفة الصيانة حسب نوع الشغلانة" subtitle="مصنعية وقطع غيار بالجنيه"><CostChart data={b.costByJobType} /></ChartCard>
        <ChartCard title="الشكاوى حسب الحالة" subtitle="عدد الشكاوى"><HBar data={b.complaintsByStatus} codes /></ChartCard>
      </div>
    </>
  );
}
