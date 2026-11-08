import Link from "next/link";
import { PageHeader } from "@/components/ui";
import BulkVisitForm from "@/components/BulkVisitForm";
import { salesmanOptions } from "@/lib/actions-util";
import { VISIT_SOURCES } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import { createBulkVisits } from "../actions";

export default async function BulkVisits() {
  const salesmen = await salesmanOptions();
  return (
    <>
      <PageHeader title="إضافة زيارات بالجملة" subtitle="سجّل عدد الزيارات لبيّاع واحد مرة واحدة بدل ما تدخلهم واحدة واحدة" />
      {salesmen.length ? (
        <BulkVisitForm salesmen={salesmen} sources={VISIT_SOURCES} action={createBulkVisits} today={toInputDate(new Date())} />
      ) : (
        <div className="card max-w-4xl p-8 text-center text-slate-600">
          لازم تضيف البيّاعين الأول من <Link className="text-brand underline" href="/salesmen/new">صفحة البيّاعين</Link>.
        </div>
      )}
    </>
  );
}
