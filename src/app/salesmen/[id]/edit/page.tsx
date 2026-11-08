import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults, int } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import RecordForm from "@/components/RecordForm";
import { fields } from "../../fields";
import { visitTotals } from "@/lib/actions-util";
import { branchOptions } from "@/lib/actions-util";
import { updateSalesman, deleteSalesman } from "../../actions";

export default async function EditSalesman({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ used?: string }>;
}) {
  const id = Number((await params).id);
  const { used } = await searchParams;
  const rec = await prisma.salesman.findUnique({ where: { id }, include: { _count: { select: { sales: true, visits: true } } } });
  if (!rec) notFound();
  const { _count, ...data } = rec;
  const visits = (await visitTotals()).get(id) ?? 0;
  return (
    <>
      <PageHeader title={`تعديل البيّاع: ${rec.name}`} subtitle={`${int(_count.sales)} بيعة · ${int(visits)} زيارة متسجلة باسمه`} />
      {used && (
        <div className="mb-4 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          مينفعش نمسح البيّاع ده لأن عليه مبيعات أو زيارات متسجلة. لو ساب الشغل، شيل علامة &quot;شغال حالياً&quot; واحفظ، وكده مش هيظهر في القوايم الجديدة وبياناته القديمة هتفضل محفوظة.
        </div>
      )}
      <RecordForm fields={fields(await branchOptions(rec.branchId))} action={updateSalesman.bind(null, id)} deleteAction={deleteSalesman.bind(null, id)}
        cancelHref="/salesmen" defaults={toDefaults(data)} />
    </>
  );
}
