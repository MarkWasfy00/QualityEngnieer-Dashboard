import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { int } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import ReceivablesUpload from "@/components/ReceivablesUpload";

const when = (d: Date) => d.toLocaleString("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export default async function ReceivablesImportPage() {
  const [imports, total, lines] = await Promise.all([
    prisma.receivableImport.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.receivable.count(),
    prisma.salesLine.count(),
  ]);
  return (
    <>
      <PageHeader title="رفع ملفات الإكسيل" subtitle={`شيت المديونيات أو قيود المبيعات من أودو · المتسجل حاليًا ${int(total)} صفقة مديونية و ${int(lines)} قيد مبيعات`}>
        <Link href="/receivables" className="btn-ghost"><BarChart3 size={16} /> أداء التحصيل</Link>
        <Link href="/sales-report" className="btn-ghost"><BarChart3 size={16} /> تحليل المبيعات</Link>
      </PageHeader>
      <ReceivablesUpload />

      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 p-4 font-bold text-slate-900">الملفات اللي اترفعت قبل كده</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>{["التاريخ", "الملف", "نوع البيانات", "الشيتات", "الصفوف", "جديد", "اتحدّث", "طريقة الرفع"].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {imports.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{when(i.createdAt)}</td>
                  <td className="px-4 py-3">{i.fileName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{i.kind === "journal" ? "قيود مبيعات أودو" : "مديونيات"}</td>
                  <td className="px-4 py-3 text-slate-600">{i.sheets}</td>
                  <td className="px-4 py-3">{int(i.total)}</td>
                  <td className="px-4 py-3">{int(i.created)}</td>
                  <td className="px-4 py-3">{int(i.updated)}</td>
                  <td className="px-4 py-3">{i.replaced ? "استبدال كامل" : "تحديث وإضافة"}</td>
                </tr>
              ))}
              {!imports.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">لسه مفيش ملفات اترفعت.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">نسخة من كل ملف بتتحفظ في فولدر data/uploads جوه البرنامج.</p>
    </>
  );
}
