import { PageHeader } from "@/components/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ReportBuilder from "@/components/ReportBuilder";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="التقارير والتصدير" subtitle="نزّل تقرير إكسيل أو PDF منسق وجاهز للطباعة" />
      <ReportBuilder initialFrom={sp.from} initialTo={sp.to} />
      <div className="mt-6 grid max-w-3xl gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>ملف إكسيل</CardTitle><CardDescription>شيت ملخص فيه المؤشرات والتقسيمات، وشيت منسق لكل قسم بفلاتر وعناوين ثابتة وألوان للخطورة والحالة ومعادلات إجماليات شغالة. الشيتات من اليمين للشمال وجاهزة للطباعة.</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>تقرير PDF</CardTitle><CardDescription>صفحة أولى فيها المؤشرات والرسومات، وبعدها جداول عرضية لكل قسم مع ترقيم الصفحات.</CardDescription></CardHeader></Card>
      </div>
    </>
  );
}
