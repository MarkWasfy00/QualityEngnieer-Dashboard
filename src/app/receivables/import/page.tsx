import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { int } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ReceivablesUpload from "@/components/ReceivablesUpload";
import { kindLabel } from "@/lib/datasets/store";

const when = (d: Date) => d.toLocaleString("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export default async function ReceivablesImportPage() {
  const [imports, total, lines, other] = await Promise.all([
    prisma.receivableImport.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.receivable.count(),
    prisma.salesLine.count(),
    prisma.dataRow.count(),
  ]);
  return (
    <>
      <PageHeader title="رفع ملفات الإكسيل" subtitle={`المتسجل حاليًا ${int(total)} صفقة مديونية و ${int(lines)} قيد مبيعات و ${int(other)} سطر من باقي الشيتات`}>
        <Button asChild variant="outline"><Link href="/data"><BarChart3 /> تقارير الإكسيل</Link></Button>
        <Button asChild variant="outline"><Link href="/receivables"><BarChart3 /> أداء التحصيل</Link></Button>
        <Button asChild variant="outline"><Link href="/sales-report"><BarChart3 /> تحليل المبيعات</Link></Button>
      </PageHeader>
      <ReceivablesUpload />

      <Card className="mt-6 gap-0 pb-0">
        <CardHeader className="border-b"><CardTitle>الملفات اللي اترفعت قبل كده</CardTitle></CardHeader>
        <Table className="[&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              {["التاريخ", "الملف", "نوع البيانات", "الشيتات", "الصفوف", "جديد", "اتحدّث", "طريقة الرفع"].map((h) => <TableHead key={h} className="text-xs text-muted-foreground">{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
              {imports.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{when(i.createdAt)}</TableCell>
                  <TableCell className="whitespace-normal">{i.fileName}</TableCell>
                  <TableCell className="whitespace-normal">{kindLabel(i.kind, i.columns)}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{i.sheets}</TableCell>
                  <TableCell>{int(i.total)}</TableCell>
                  <TableCell>{int(i.created)}</TableCell>
                  <TableCell>{int(i.updated)}</TableCell>
                  <TableCell>{i.replaced ? "استبدال" : "تحديث وإضافة"}</TableCell>
                </TableRow>
              ))}
              {!imports.length && <TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">لسه مفيش ملفات اترفعت.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">نسخة من كل ملف بتتحفظ في فولدر data/uploads جوه البرنامج.</p>
    </>
  );
}
