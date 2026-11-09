import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import RecordForm from "@/components/RecordForm";
import { salesmanOptions } from "@/lib/actions-util";
import { fields } from "../../fields";
import { updateVisit, deleteVisit } from "../../actions";

export default async function EditVisit({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const rec = await prisma.visit.findUnique({ where: { id } });
  if (!rec) notFound();
  return (
    <>
      <PageHeader title={`تعديل الزيارة رقم ${id}`} />
      <RecordForm fields={fields(await salesmanOptions(rec.salesmanId))} action={updateVisit.bind(null, id)}
        deleteAction={deleteVisit.bind(null, id)} cancelHref="/visits" defaults={toDefaults(rec)} />
    </>
  );
}
