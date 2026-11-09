import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, Crown, FileDown, Building2 } from "lucide-react";
import { getReportData, parseRange } from "@/lib/kpis";
import { compareBranches } from "@/lib/compare";
import { pct, int, num } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        <Button asChild variant="outline"><Link href="/branches"><Building2 /> إدارة الفروع</Link></Button>
        <Button asChild variant="secondary"><a href={`/api/export/excel?${q}`}><FileDown /> إكسيل</a></Button>
        <Button asChild variant="secondary"><a href={`/api/export/pdf?${q}`}><FileDown /> PDF</a></Button>
      </PageHeader>
      <div className="mb-4"><Suspense><RangeFilter /></Suspense></div>

      {!real.length && (
        <Card className="mb-4">
          <CardContent className="py-2 text-center text-muted-foreground">
            لسه مفيش فروع متسجلة. ضيف الفروع من <Link className="text-primary underline" href="/branches/new">صفحة الفروع</Link>، وبعدين اختار الفرع لكل عربية وبيّاع.
          </CardContent>
        </Card>
      )}
      {unassigned && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle />
          <AlertDescription className="text-amber-800">
          {unassigned.vehicles > 0
            ? <>فيه {int(unassigned.vehicles)} عربية من غير فرع، وبياناتهم ظاهرة تحت &quot;بدون فرع&quot;. حدد الفرع لكل عربية من <Link className="underline" href="/vehicles">صفحة العربيات</Link> عشان المقارنة تبقى دقيقة.</>
            : <>فيه بيانات من غير فرع ({int(unassigned.complaints)} شكوى · {int(unassigned.visits)} زيارة · {int(unassigned.sales)} بيعة) ظاهرة تحت &quot;بدون فرع&quot;. حدد الفرع في <Link className="underline" href="/complaints">الشكاوى</Link> أو للبيّاع من <Link className="underline" href="/salesmen">صفحة البيّاعين</Link>.</>}
          </AlertDescription>
        </Alert>
      )}

      {list.length > 0 && (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {list.map((b, i) => {
              const lead = leaders.includes(i) && list.length > 1;
              return (
                <Card key={b.id} className={`${lead ? "ring-2 ring-amber-400" : ""} ${b.unassigned ? "border border-dashed border-input ring-0" : ""}`}>
                  <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-base font-bold">{b.name}</div>
                    {lead && <Badge className="bg-amber-100 font-bold text-amber-800"><Crown /> الأفضل</Badge>}
                  </div>
                  <div className="mt-3 text-3xl font-bold">{b.inspections ? pct(b.firstPassYield) : "—"}</div>
                  <div className="text-xs text-muted-foreground">نسبة النجاح من أول مرة · {int(b.inspections)} فحص</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-muted/60 p-2"><div className="font-bold text-foreground">{int(b.vehicles)}</div>عربية</div>
                    <div className="rounded-lg bg-muted/60 p-2"><div className="font-bold text-foreground">{int(b.openDefects)}</div>عيب مفتوح</div>
                    <div className="rounded-lg bg-muted/60 p-2"><div className="font-bold text-foreground">{b.rated ? num(b.csat) : "—"}</div>رضا العملاء</div>
                  </div>
                  {b.unassigned
                    ? <div className="mt-3 text-xs text-muted-foreground">للعلم بس — مش داخل في المقارنة</div>
                    : <div className="mt-3 text-sm text-muted-foreground">كسب في <b className="text-foreground">{int(wins[i])}</b> من {int(rows.length)} مقياس</div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-4"><CompareTable names={names} rows={rows} firstHeader="المقياس / الفرع" /></div>
          <p className="mt-2 text-xs text-muted-foreground">
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
