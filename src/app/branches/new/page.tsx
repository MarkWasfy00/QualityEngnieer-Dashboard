import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { fields } from "../fields";
import { createBranch } from "../actions";

export default function NewBranch() {
  return (
    <>
      <PageHeader title="إضافة فرع" subtitle="الفرع هيظهر في قايمة الاختيار في العربيات والبيّاعين والشكاوى" />
      <RecordForm fields={fields} action={createBranch} cancelHref="/branches" defaults={{ active: true }} />
    </>
  );
}
