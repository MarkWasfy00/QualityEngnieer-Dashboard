import { prisma } from "@/lib/db";
import { vehicleLabel } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "date", label: "التاريخ", kind: "date" }, { key: "vehicle", label: "العربية" },
  { key: "type", label: "نوع الفحص" }, { key: "inspector", label: "الفاحص" },
  { key: "fails", label: "بنود غير مطابقة", kind: "number" }, { key: "score", label: "النتيجة", kind: "percent" },
  { key: "result", label: "الحكم", kind: "badge" },
];

export default async function InspectionsPage() {
  const is = await prisma.inspection.findMany({ include: { vehicle: true, items: true }, orderBy: { date: "desc" } });
  const rows = is.map((i) => ({
    id: i.id, date: i.date.toISOString(), vehicle: vehicleLabel(i.vehicle), type: i.type, inspector: i.inspector,
    fails: i.items.filter((x) => x.result === "FAIL").length, score: i.score, result: i.result,
    viewHref: `/inspections/${i.id}`, editHref: `/inspections/${i.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="فحوصات العربيات" subtitle="فحص بالبنود مع حساب نسبة المطابقة" newHref="/inspections/new">
        <ExportButtons section="inspections" />
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["result", "type", "inspector"]} />
    </>
  );
}
