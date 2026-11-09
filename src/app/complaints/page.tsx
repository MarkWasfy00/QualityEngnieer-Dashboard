import { prisma } from "@/lib/db";
import { vehicleLabel } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "date", label: "التاريخ", kind: "date" }, { key: "customerName", label: "العميل" },
  { key: "branch", label: "الفرع" }, { key: "vehicle", label: "العربية" }, { key: "category", label: "نوع الشكوى" },
  { key: "description", label: "التفاصيل" }, { key: "status", label: "الحالة", kind: "badge" },
  { key: "resolvedAt", label: "تاريخ الحل", kind: "date" }, { key: "satisfaction", label: "الرضا (من 5)", kind: "number" },
];

export default async function ComplaintsPage() {
  const cs = await prisma.complaint.findMany({ include: { vehicle: { include: { branch: true } }, branch: true }, orderBy: { date: "desc" } });
  const rows = cs.map((c) => ({
    id: c.id, date: c.date.toISOString(), customerName: c.customerName, vehicle: vehicleLabel(c.vehicle), branch: (c.branch ?? c.vehicle?.branch)?.name ?? null,
    category: c.category, description: c.description, status: c.status,
    resolvedAt: c.resolvedAt?.toISOString() ?? null, satisfaction: c.satisfaction, editHref: `/complaints/${c.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="شكاوى العملاء" subtitle="متابعة الشكاوى ووقت حلها ورضا العميل" newHref="/complaints/new">
        <ExportButtons section="complaints" />
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["branch", "status", "category"]} />
    </>
  );
}
