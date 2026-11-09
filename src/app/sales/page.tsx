import { prisma } from "@/lib/db";
import { vehicleLabel } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import ExportButtons from "@/components/ExportButtons";
import DataTable, { type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "saleDate", label: "تاريخ البيع", kind: "date" }, { key: "salesman", label: "البيّاع" },
  { key: "vehicle", label: "العربية" }, { key: "customerName", label: "العميل" },
  { key: "price", label: "السعر", kind: "money" }, { key: "paymentType", label: "الدفع", kind: "code" },
  { key: "deliveredAt", label: "تاريخ التسليم", kind: "date" },
];

export default async function SalesPage() {
  const ss = await prisma.sale.findMany({ include: { vehicle: true, salesman: true }, orderBy: { saleDate: "desc" } });
  const rows = ss.map((x) => ({
    id: x.id, saleDate: x.saleDate.toISOString(), salesman: x.salesman.name, vehicle: vehicleLabel(x.vehicle),
    customerName: x.customerName, price: x.price, paymentType: x.paymentType,
    deliveredAt: x.deliveredAt?.toISOString() ?? null, editHref: `/sales/${x.id}/edit`,
  }));
  return (
    <>
      <PageHeader title="المبيعات" subtitle="العربيات اللي اتباعت، مين باعها، وسعرها" newHref="/sales/new">
        <ExportButtons section="sales" />
      </PageHeader>
      <DataTable columns={columns} rows={rows} filters={["salesman", "paymentType"]} />
    </>
  );
}
