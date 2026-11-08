import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { fields } from "../fields";
import { branchOptions } from "@/lib/actions-util";
import { createSalesman } from "../actions";

export default async function NewSalesman() {
  return (
    <>
      <PageHeader title="إضافة بيّاع" subtitle="البيّاع هيظهر في قايمة الاختيار في المبيعات وزيارات العملاء" />
      <RecordForm fields={fields(await branchOptions())} action={createSalesman} cancelHref="/salesmen" defaults={{ active: true }} />
    </>
  );
}
