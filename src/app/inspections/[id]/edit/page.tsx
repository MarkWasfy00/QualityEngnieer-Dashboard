import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import InspectionForm from "@/components/InspectionForm";
import { vehicleOptions } from "@/lib/actions-util";
import { toInputDate } from "@/lib/format";
import { updateInspection, deleteInspection } from "../../actions";

export default async function EditInspection({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const i = await prisma.inspection.findUnique({ where: { id }, include: { items: { orderBy: { id: "asc" } } } });
  if (!i) notFound();
  return (
    <>
      <PageHeader title={`تعديل الفحص رقم ${id}`} />
      <InspectionForm vehicles={await vehicleOptions()} action={updateInspection.bind(null, id)}
        deleteAction={deleteInspection.bind(null, id)}
        defaults={{ ...i, date: toInputDate(i.date) }}
        initialItems={i.items.map((x) => ({ category: x.category, item: x.item, result: x.result as "PASS", notes: x.notes }))} />
    </>
  );
}
