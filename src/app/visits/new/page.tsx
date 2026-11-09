import { PageHeader } from "@/components/PageHeader";
import RecordForm from "@/components/RecordForm";
import { salesmanOptions } from "@/lib/actions-util";
import { fields, newDefaults } from "../fields";
import { createVisit } from "../actions";

export default async function NewVisit({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="تسجيل زيارة عميل" subtitle="كل عميل جه أو اتصل بيتسجل هنا، عشان نحسب نسبة البيع من الزيارات" />
      <RecordForm fields={fields(await salesmanOptions())} action={createVisit} cancelHref="/visits" defaults={{ ...newDefaults(), ...sp }} />
    </>
  );
}
