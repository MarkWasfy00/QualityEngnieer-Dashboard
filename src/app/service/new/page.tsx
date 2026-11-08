import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { vehicleOptions } from "@/lib/actions-util";
import { fields, newDefaults } from "../fields";
import { createServiceJob } from "../actions";

export default async function NewServiceJob({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="تسجيل أمر صيانة جديد" />
      <RecordForm fields={fields(await vehicleOptions())} action={createServiceJob} cancelHref="/service"
        defaults={{ ...newDefaults(), ...sp }} />
    </>
  );
}
