import { PageHeader } from "@/components/PageHeader";
import InspectionForm from "@/components/InspectionForm";
import { vehicleOptions } from "@/lib/actions-util";
import { DEFAULT_CHECKLIST } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import { createInspection } from "../actions";

export default async function NewInspection({ searchParams }: { searchParams: Promise<{ vehicleId?: string }> }) {
  const sp = await searchParams;
  const items = DEFAULT_CHECKLIST.flatMap((c) => c.items.map((item) => ({ category: c.category, item, result: "PASS" as const })));
  return (
    <>
      <PageHeader title="فحص جديد" subtitle="علّم على كل بند، والنتيجة والحكم بيتحسبوا لوحدهم" />
      <InspectionForm vehicles={await vehicleOptions()} action={createInspection} initialItems={items}
        defaults={{ date: toInputDate(new Date()), vehicleId: sp.vehicleId }} />
    </>
  );
}
