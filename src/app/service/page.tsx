import { prisma } from "@/lib/db";
import { vehicleLabel } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "openedAt", label: "تاريخ الفتح", kind: "date" }, { key: "roNumber", label: "أمر الشغل", kind: "latin" },
  { key: "vehicle", label: "العربية" }, { key: "jobType", label: "نوع الشغلانة" }, { key: "technician", label: "الفني" },
  { key: "laborHours", label: "الساعات", kind: "number" }, { key: "total", label: "الإجمالي", kind: "money" },
  { key: "isComeback", label: "رجعت تاني؟", kind: "bool" }, { key: "status", label: "الحالة", kind: "badge" },
];

export default async function ServicePage() {
  const js = await prisma.serviceJob.findMany({ include: { vehicle: true }, orderBy: { openedAt: "desc" } });
  const rows = js.map((j) => ({
    id: j.id, openedAt: j.openedAt.toISOString(), roNumber: j.roNumber, vehicle: vehicleLabel(j.vehicle),
    jobType: j.jobType, technician: j.technician, laborHours: j.laborHours, total: j.laborCost + j.partsCost,
    isComeback: j.isComeback, status: j.status, editHref: `/service/${j.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="أوامر الصيانة والإصلاح" subtitle="شغل الورشة، مدة التسليم، والعربيات اللي رجعت تاني" newHref="/service/new">
        <ExportButtons section="service" />
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["jobType", "status", "technician"]} />
    </>
  );
}
