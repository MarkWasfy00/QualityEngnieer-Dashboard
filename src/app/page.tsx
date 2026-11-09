import { Suspense } from "react";
import Link from "next/link";
import { ClipboardCheck, AlertTriangle, Banknote, RotateCcw, Timer, MessageSquareWarning, Star, FileDown, Hourglass } from "lucide-react";
import { getReportData, parseRange } from "@/lib/kpis";
import { money, pct, num, int } from "@/lib/format";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ExportButtons from "@/components/ExportButtons";
import RangeFilter from "@/components/RangeFilter";
import { ChartCard, HBar, TrendChart, CostChart } from "@/components/Charts";

const Kpi = (props: React.ComponentProps<typeof StatCard>) => <StatCard valueClassName="text-3xl" {...props} />;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { kpis: k, breakdowns: b } = await getReportData(parseRange(sp));
  const q = new URLSearchParams(sp as Record<string, string>).toString();
  return (
    <>
      <PageHeader title="لوحة متابعة الجودة" subtitle="الفحص والعيوب والصيانة وشكاوى العملاء في مكان واحد">
        <ExportButtons pdfHref={`/api/export/pdf${q ? "?" + q : ""}`} xlsxHref={`/api/export/excel${q ? "?" + q : ""}`} />
        <Button asChild><Link href={`/reports${q ? "?" + q : ""}`}><FileDown /> تقرير مخصص</Link></Button>
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

      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center gap-6">
          <span className="text-sm font-bold">العيوب حسب الخطورة</span>
          {b.defectsBySeverity.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <StatusBadge value={s.name} />
              <span className="text-lg font-bold">{int(s.value)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="نتايج الفحص كل شهر" subtitle="عدد المطابق وغير المطابق"><TrendChart data={b.inspectionTrend} /></ChartCard>
        <ChartCard title="العيوب حسب القسم" subtitle="عدد العيوب المتسجلة"><HBar data={b.defectsByCategory} /></ChartCard>
        <ChartCard title="تكلفة الصيانة حسب نوع الشغلانة" subtitle="مصنعية وقطع غيار بالجنيه"><CostChart data={b.costByJobType} /></ChartCard>
        <ChartCard title="الشكاوى حسب الحالة" subtitle="عدد الشكاوى"><HBar data={b.complaintsByStatus} codes /></ChartCard>
      </div>
    </>
  );
}
