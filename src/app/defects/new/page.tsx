import { PageHeader } from "@/components/PageHeader";
import RecordForm from "@/components/RecordForm";
import { vehicleOptions } from "@/lib/actions-util";
import { fields, newDefaults } from "../fields";
import { createDefect } from "../actions";

export default async function NewDefect({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="تسجيل عيب جديد" />
      <RecordForm fields={fields(await vehicleOptions())} action={createDefect} cancelHref="/defects"
        defaults={{ ...newDefaults(), ...sp }} />
    </>
  );
}
