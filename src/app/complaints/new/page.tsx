import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { vehicleOptions, branchOptions } from "@/lib/actions-util";
import { fields, newDefaults } from "../fields";
import { createComplaint } from "../actions";

export default async function NewComplaint({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="تسجيل شكوى جديدة" />
      <RecordForm fields={fields(await vehicleOptions(), await branchOptions())} action={createComplaint} cancelHref="/complaints"
        defaults={{ ...newDefaults(), ...sp }} />
    </>
  );
}
