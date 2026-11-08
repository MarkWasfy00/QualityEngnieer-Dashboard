import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { vehicleFields } from "../fields";
import { branchOptions, storageNames } from "@/lib/actions-util";
import { createVehicle } from "../actions";

export default async function NewVehicle() {
  return (
    <>
      <PageHeader title="إضافة عربية جديدة" />
      <RecordForm fields={vehicleFields(await branchOptions(), await storageNames())} action={createVehicle} cancelHref="/vehicles"
        defaults={{ condition: "Used", year: new Date().getFullYear() }} />
    </>
  );
}
