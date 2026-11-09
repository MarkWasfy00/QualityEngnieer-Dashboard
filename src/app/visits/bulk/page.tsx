import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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
        <Card className="max-w-4xl">
          <CardContent className="py-4 text-center text-muted-foreground">
            لازم تضيف البيّاعين الأول من <Link className="text-primary underline" href="/salesmen/new">صفحة البيّاعين</Link>.
          </CardContent>
        </Card>
      )}
    </>
  );
}
