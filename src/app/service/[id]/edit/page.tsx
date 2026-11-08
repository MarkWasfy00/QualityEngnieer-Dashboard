import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults } from "@/lib/format";
import { vehicleOptions } from "@/lib/actions-util";
import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { fields } from "../../fields";
import { updateServiceJob, deleteServiceJob } from "../../actions";

export default async function EditServiceJob({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const rec = await prisma.serviceJob.findUnique({ where: { id } });
  if (!rec) notFound();
  return (
    <>
      <PageHeader title={`تعديل أمر صيانة رقم ${id}`} />
      <RecordForm fields={fields(await vehicleOptions())} action={updateServiceJob.bind(null, id)}
        deleteAction={deleteServiceJob.bind(null, id)} cancelHref="/service" defaults={toDefaults(rec)} />
    </>
  );
}
