import { prisma } from "@/lib/db";
import { vehicleLabel } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "reportedAt", label: "التاريخ", kind: "date" }, { key: "vehicle", label: "العربية" },
  { key: "category", label: "القسم" }, { key: "description", label: "الوصف" },
  { key: "severity", label: "الخطورة", kind: "badge" }, { key: "status", label: "الحالة", kind: "badge" },
  { key: "technician", label: "الفني" }, { key: "repairCost", label: "التكلفة", kind: "money" },
];

export default async function DefectsPage() {
  const ds = await prisma.defect.findMany({ include: { vehicle: true }, orderBy: { reportedAt: "desc" } });
  const rows = ds.map((d) => ({
    id: d.id, reportedAt: d.reportedAt.toISOString(), vehicle: vehicleLabel(d.vehicle), category: d.category,
    description: d.description, severity: d.severity, status: d.status, technician: d.technician,
    repairCost: d.repairCost, editHref: `/defects/${d.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="العيوب والمشاكل" subtitle="مشاكل الجودة اللي اتلاقت في العربيات" newHref="/defects/new">
        <ExportButtons section="defects" />
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["severity", "status", "category"]} />
    </>
  );
}
