import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults } from "@/lib/format";
import { vehicleOptions } from "@/lib/actions-util";
import { PageHeader } from "@/components/PageHeader";
import RecordForm from "@/components/RecordForm";
import { fields } from "../../fields";
import { updateDefect, deleteDefect } from "../../actions";

export default async function EditDefect({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const rec = await prisma.defect.findUnique({ where: { id } });
  if (!rec) notFound();
  return (
    <>
      <PageHeader title={`تعديل عيب رقم ${id}`} />
      <RecordForm fields={fields(await vehicleOptions())} action={updateDefect.bind(null, id)}
        deleteAction={deleteDefect.bind(null, id)} cancelHref="/defects" defaults={toDefaults(rec)} />
    </>
  );
}
