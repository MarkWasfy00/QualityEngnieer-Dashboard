import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults } from "@/lib/format";
import { vehicleOptions, branchOptions } from "@/lib/actions-util";
import { PageHeader } from "@/components/PageHeader";
import RecordForm from "@/components/RecordForm";
import { fields } from "../../fields";
import { updateComplaint, deleteComplaint } from "../../actions";

export default async function EditComplaint({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const rec = await prisma.complaint.findUnique({ where: { id } });
  if (!rec) notFound();
  return (
    <>
      <PageHeader title={`تعديل شكوى رقم ${id}`} />
      <RecordForm fields={fields(await vehicleOptions(), await branchOptions(rec.branchId))} action={updateComplaint.bind(null, id)}
        deleteAction={deleteComplaint.bind(null, id)} cancelHref="/complaints" defaults={toDefaults(rec)} />
    </>
  );
}
