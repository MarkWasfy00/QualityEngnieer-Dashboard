import { PageHeader } from "@/components/PageHeader";
import RecordForm from "@/components/RecordForm";
import { vehicleOptions, salesmanOptions } from "@/lib/actions-util";
import { fields, newDefaults } from "../fields";
import { createSale } from "../actions";

export default async function NewSale({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="تسجيل بيعة جديدة" />
      <RecordForm fields={fields(await vehicleOptions(), await salesmanOptions())} action={createSale} cancelHref="/sales"
        defaults={{ ...newDefaults(), ...sp }} />
    </>
  );
}
