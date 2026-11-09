import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import DataTable, { type Column } from "@/components/DataTable";
import VisitsPrintBar from "@/components/VisitsPrintBar";
import Link from "next/link";
import { Layers } from "lucide-react";
import { int, pct } from "@/lib/format";

const columns: Column[] = [
  { key: "visitDate", label: "التاريخ", kind: "date" }, { key: "salesman", label: "البيّاع" },
  { key: "count", label: "عدد الزيارات", kind: "number" },
  { key: "customerName", label: "العميل" }, { key: "customerPhone", label: "الموبايل", kind: "latin" },
  { key: "source", label: "جه منين" }, { key: "interestedIn", label: "مهتم بـ" },
  { key: "outcome", label: "النتيجة", kind: "badge" },
];

export default async function VisitsPage() {
  const salesmen = await prisma.salesman.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const vs = await prisma.visit.findMany({ include: { salesman: true }, orderBy: { visitDate: "desc" } });
  const tot = { all: 0, Won: 0, FollowUp: 0, Lost: 0 } as Record<string, number>;
  vs.forEach((v) => { tot.all += v.count; tot[v.outcome] = (tot[v.outcome] ?? 0) + v.count; });
  const rows = vs.map((v) => ({
    id: v.id, visitDate: v.visitDate.toISOString(), salesman: v.salesman.name, customerName: v.customerName ?? (v.count > 1 ? "زيارات مجمّعة" : null), count: v.count,
    customerPhone: v.customerPhone, source: v.source, interestedIn: v.interestedIn, outcome: v.outcome,
    editHref: `/visits/${v.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="زيارات العملاء" subtitle="كل عميل زار المعرض أو اتصل، ومين البيّاع اللي خدمه، والنتيجة" newHref="/visits/new">
        <Button asChild variant="secondary"><Link href="/visits/bulk"><Layers /> إضافة بالجملة</Link></Button>
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["إجمالي الزيارات", int(tot.all)], ["اشترى", int(tot.Won)], ["لسه بيفكر", int(tot.FollowUp)], ["مشتراش", int(tot.Lost)], ["نسبة البيع", pct(tot.all ? (tot.Won / tot.all) * 100 : 0)]].map(([k, v]) => (
          <StatCard key={k} title={k} value={v} />
        ))}
      </div>
      <VisitsPrintBar salesmen={salesmen.map((m) => ({ value: m.id, label: m.active ? m.name : `${m.name} (موقوف)` }))} />
      <DataTable columns={columns} rows={rows} filters={["salesman", "outcome", "source"]} />
    </>
  );
}
