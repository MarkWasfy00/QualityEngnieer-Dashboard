import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { vehicleFields } from "../../fields";
import { branchOptions, storageNames } from "@/lib/actions-util";
import { updateVehicle, deleteVehicle } from "../../actions";

export default async function EditVehicle({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v) notFound();
  return (
    <>
      <PageHeader title={`تعديل ${v.make} ${v.model} ${v.year}`} subtitle={v.vin} />
      <RecordForm fields={vehicleFields(await branchOptions(v.branchId), await storageNames())} action={updateVehicle.bind(null, id)} deleteAction={deleteVehicle.bind(null, id)}
        cancelHref="/vehicles" defaults={toDefaults(v)} />
    </>
  );
}
