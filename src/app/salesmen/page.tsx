import { prisma } from "@/lib/db";
import { visitTotals } from "@/lib/actions-util";
import { PageHeader } from "@/components/PageHeader";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "name", label: "الاسم" }, { key: "branch", label: "الفرع" }, { key: "phone", label: "الموبايل", kind: "latin" },
  { key: "hiredAt", label: "تاريخ التعيين", kind: "date" }, { key: "status", label: "الحالة" },
  { key: "visits", label: "الزيارات", kind: "number" }, { key: "sales", label: "المبيعات", kind: "number" },
];

export default async function SalesmenPage() {
  const ms = await prisma.salesman.findMany({
    include: { branch: true, _count: { select: { sales: true, visits: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const vt = await visitTotals();
  const rows = ms.map((m) => ({
    id: m.id, name: m.name, branch: m.branch?.name ?? null, phone: m.phone, hiredAt: m.hiredAt?.toISOString() ?? null,
    status: m.active ? "شغال" : "موقوف", visits: vt.get(m.id) ?? 0, sales: m._count.sales,
    editHref: `/salesmen/${m.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="البيّاعين" subtitle="قايمة البيّاعين اللي بتختار منها في المبيعات وزيارات العملاء" newHref="/salesmen/new">
        <ExportButtons section="salesmen" />
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["branch", "status"]} />
    </>
  );
}
