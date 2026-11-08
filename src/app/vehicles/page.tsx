import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "vin", label: "رقم الشاسيه", kind: "latin" }, { key: "branch", label: "الفرع" }, { key: "warehouseName", label: "المخزن" }, { key: "warehouseKeeper", label: "أمين المخزن" },
  { key: "make", label: "الماركة" }, { key: "model", label: "الموديل" }, { key: "year", label: "السنة" },
  { key: "mileage", label: "العداد (كم)", kind: "number" }, { key: "condition", label: "الحالة", kind: "code" },
  { key: "inspections", label: "عدد الفحوصات", kind: "number" }, { key: "openDefects", label: "عيوب مفتوحة", kind: "number" },
];

export default async function VehiclesPage() {
  const vs = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: true, _count: { select: { inspections: true } }, defects: { where: { status: { in: ["Open", "In Progress"] } }, select: { id: true } } },
  });
  const rows = vs.map((v) => ({
    id: v.id, warehouseName: v.warehouseName, warehouseKeeper: v.warehouseKeeper, branch: v.branch?.name ?? null, vin: v.vin, year: v.year, make: v.make, model: v.model,
    mileage: v.mileage, condition: v.condition, inspections: v._count.inspections, openDefects: v.defects.length,
    editHref: `/vehicles/${v.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="العربيات" subtitle="العربيات اللي في المعرض وبنتابع جودتها" newHref="/vehicles/new">
        <ExportButtons section="vehicles" />
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["branch", "warehouseName", "warehouseKeeper", "make", "condition"]} />
    </>
  );
}
