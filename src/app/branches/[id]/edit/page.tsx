import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults, int } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RecordForm from "@/components/RecordForm";
import { fields } from "../../fields";
import { updateBranch, deleteBranch } from "../../actions";

export default async function EditBranch({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ used?: string }>;
}) {
  const id = Number((await params).id);
  const { used } = await searchParams;
  const rec = await prisma.branch.findUnique({ where: { id }, include: { _count: { select: { vehicles: true, salesmen: true, complaints: true } } } });
  if (!rec) notFound();
  const { _count, ...data } = rec;
  return (
    <>
      <PageHeader title={`تعديل الفرع: ${rec.name}`} subtitle={`${int(_count.vehicles)} عربية · ${int(_count.salesmen)} بيّاع · ${int(_count.complaints)} شكوى متسجلة على الفرع`} />
      {used && (
        <Alert className="mb-4 max-w-4xl border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle />
          <AlertDescription className="text-amber-800">
          مينفعش نمسح الفرع ده لأن عليه عربيات أو بيّاعين أو شكاوى. لو الفرع اتقفل، شيل علامة &quot;الفرع شغال&quot; واحفظ، وكده مش هيظهر في القوايم الجديدة وبياناته القديمة هتفضل محفوظة.
          </AlertDescription>
        </Alert>
      )}
      <RecordForm fields={fields} action={updateBranch.bind(null, id)} deleteAction={deleteBranch.bind(null, id)}
        cancelHref="/branches" defaults={toDefaults(data)} />
    </>
  );
}
