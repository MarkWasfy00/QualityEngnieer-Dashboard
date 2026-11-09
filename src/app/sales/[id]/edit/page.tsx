import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toDefaults } from "@/lib/format";
import { vehicleOptions, salesmanOptions } from "@/lib/actions-util";
import { PageHeader } from "@/components/PageHeader";
import RecordForm from "@/components/RecordForm";
import { fields } from "../../fields";
import { updateSale, deleteSale } from "../../actions";

export default async function EditSale({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const rec = await prisma.sale.findUnique({ where: { id } });
  if (!rec) notFound();
  return (
    <>
      <PageHeader title={`تعديل البيعة رقم ${id}`} />
      <RecordForm fields={fields(await vehicleOptions(), await salesmanOptions(rec.salesmanId))} action={updateSale.bind(null, id)}
        deleteAction={deleteSale.bind(null, id)} cancelHref="/sales" defaults={toDefaults(rec)} />
    </>
  );
}
