import { PageHeader } from "@/components/ui";
import ReportBuilder from "@/components/ReportBuilder";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="التقارير والتصدير" subtitle="نزّل تقرير إكسيل أو PDF منسق وجاهز للطباعة" />
      <ReportBuilder initialFrom={sp.from} initialTo={sp.to} />
      <div className="mt-6 grid max-w-3xl gap-4 md:grid-cols-2 text-sm text-slate-600">
        <div className="card p-5"><b className="text-slate-900">ملف إكسيل</b><p className="mt-1">شيت ملخص فيه المؤشرات والتقسيمات، وشيت منسق لكل قسم بفلاتر وعناوين ثابتة وألوان للخطورة والحالة ومعادلات إجماليات شغالة. الشيتات من اليمين للشمال وجاهزة للطباعة.</p></div>
        <div className="card p-5"><b className="text-slate-900">تقرير PDF</b><p className="mt-1">صفحة أولى فيها المؤشرات والرسومات، وبعدها جداول عرضية لكل قسم مع ترقيم الصفحات.</p></div>
      </div>
    </>
  );
}
