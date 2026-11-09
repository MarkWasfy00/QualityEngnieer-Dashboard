import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, money, int, pct } from "@/lib/format";
import { label } from "@/lib/constants";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export default async function InspectionDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const i = await prisma.inspection.findUnique({
    where: { id }, include: { vehicle: true, items: { orderBy: { id: "asc" } }, defects: true },
  });
  if (!i) notFound();
  const groups = [...new Set(i.items.map((x) => x.category))];
  const v = i.vehicle;
  return (
    <>
      <PageHeader title={`تقرير الفحص رقم ${i.id}`} subtitle={`${v.make} ${v.model} ${v.year} · شاسيه ${v.vin}`}>
        <Button asChild variant="outline"><Link href={`/inspections/${i.id}/edit`}><Pencil /> تعديل</Link></Button>
        <Button asChild><a href={`/api/export/inspection/${i.id}`}><FileDown /> تحميل PDF</a></Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3">
          {[["التاريخ", fmtDate(i.date)], ["نوع الفحص", i.type], ["الفاحص", i.inspector], ["المخزن", v.warehouseName ?? "—"], ["أمين المخزن", v.warehouseKeeper ?? "—"],
            ["العداد", `${int(v.mileage)} كم`], ["الحالة", label(v.condition)]].map(([k, val]) => (
            <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{val}</span></div>
          ))}
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-muted-foreground">الحكم</span><StatusBadge value={i.result} />
          </div>
          <div className="text-center pt-2">
            <div className="text-5xl font-bold tabular-nums text-sidebar">{pct(i.score)}</div>
            <div className="text-xs text-muted-foreground">نسبة المطابقة</div>
          </div>
          {i.notes && <p className="rounded-lg bg-muted p-3 text-muted-foreground">{i.notes}</p>}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg font-semibold">بنود الفحص</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => (
              <div key={g}>
                <h3 className="mb-1 text-xs font-semibold text-muted-foreground">{g}</h3>
                {i.items.filter((x) => x.category === g).map((x) => (
                  <div key={x.id} className="flex items-center justify-between gap-2 border-b py-1.5 text-sm">
                    <span>{x.item}{x.notes && <span className="text-muted-foreground"> — {x.notes}</span>}</span><StatusBadge value={x.result} />
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">العيوب المرتبطة بالفحص</CardTitle>
            <CardAction>
              <Button asChild variant="outline"><Link href={`/defects/new?vehicleId=${v.id}&inspectionId=${i.id}`}><Plus /> سجّل عيب</Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent>
          {i.defects.length ? (
            <Table>
              <TableBody>
                {i.defects.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.category}</TableCell><TableCell className="whitespace-normal">{d.description}</TableCell>
                    <TableCell><StatusBadge value={d.severity} /></TableCell><TableCell><StatusBadge value={d.status} /></TableCell>
                    <TableCell className="text-end">{money(d.repairCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">مفيش عيوب متسجلة على الفحص ده.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
