import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, money, int, pct } from "@/lib/format";
import { label } from "@/lib/constants";
import { PageHeader, Badge } from "@/components/ui";

export default async function InspectionDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const i = await prisma.inspection.findUnique({
    where: { id }, include: { vehicle: true, items: { orderBy: { id: "asc" } }, defects: true },
  });
  if (!i) notFound();
  const groups = [...new Set(i.items.map((x) => x.category))];
  const v = i.vehicle;
  return (
    <>
      <PageHeader title={`تقرير الفحص رقم ${i.id}`} subtitle={`${v.make} ${v.model} ${v.year} · شاسيه ${v.vin}`}>
        <Link href={`/inspections/${i.id}/edit`} className="btn-ghost"><Pencil size={16} /> تعديل</Link>
        <a href={`/api/export/inspection/${i.id}`} className="btn-dark"><FileDown size={16} /> تحميل PDF</a>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 space-y-3 text-sm">
          {[["التاريخ", fmtDate(i.date)], ["نوع الفحص", i.type], ["الفاحص", i.inspector], ["المخزن", v.warehouseName ?? "—"], ["أمين المخزن", v.warehouseKeeper ?? "—"],
            ["العداد", `${int(v.mileage)} كم`], ["الحالة", label(v.condition)]].map(([k, val]) => (
            <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium">{val}</span></div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-slate-500">الحكم</span><Badge value={i.result} />
          </div>
          <div className="text-center pt-2">
            <div className="text-5xl font-bold tabular-nums text-navy">{pct(i.score)}</div>
            <div className="text-xs text-slate-500">نسبة المطابقة</div>
          </div>
          {i.notes && <p className="rounded-lg bg-slate-50 p-3 text-slate-600">{i.notes}</p>}
        </div>
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">بنود الفحص</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => (
              <div key={g}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</h3>
                {i.items.filter((x) => x.category === g).map((x) => (
                  <div key={x.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
                    <span>{x.item}{x.notes && <span className="text-slate-400"> — {x.notes}</span>}</span><Badge value={x.result} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">العيوب المرتبطة بالفحص</h2>
            <Link href={`/defects/new?vehicleId=${v.id}&inspectionId=${i.id}`} className="btn-ghost"><Plus size={16} /> سجّل عيب</Link>
          </div>
          {i.defects.length ? (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {i.defects.map((d) => (
                  <tr key={d.id}><td className="py-2">{d.category}</td><td>{d.description}</td><td><Badge value={d.severity} /></td>
                    <td><Badge value={d.status} /></td><td className="text-end">{money(d.repairCost)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-slate-400">مفيش عيوب متسجلة على الفحص ده.</p>}
        </div>
      </div>
    </>
  );
}
