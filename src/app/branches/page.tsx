import Link from "next/link";
import { Gauge } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "name", label: "الفرع" }, { key: "city", label: "المدينة" }, { key: "manager", label: "المدير" },
  { key: "status", label: "الحالة" }, { key: "vehicles", label: "العربيات", kind: "number" },
  { key: "salesmen", label: "البيّاعين", kind: "number" },
];

export default async function BranchesPage() {
  const bs = await prisma.branch.findMany({
    include: { _count: { select: { vehicles: true, salesmen: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const rows = bs.map((b) => ({
    id: b.id, name: b.name, city: b.city, manager: b.manager, status: b.active ? "شغال" : "مقفول",
    vehicles: b._count.vehicles, salesmen: b._count.salesmen, editHref: `/branches/${b.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="الفروع" subtitle="فروع المعرض اللي بتختار منها في العربيات والبيّاعين والشكاوى" newHref="/branches/new">
        <ExportButtons section="branches" />
        <Button asChild variant="secondary"><Link href="/branches/quality"><Gauge /> جودة الفروع</Link></Button>
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["status"]} />
    </>
  );
}
