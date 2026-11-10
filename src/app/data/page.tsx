import Link from "next/link";
import { Upload, FileDown, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { FORMATS, GROUP_ORDER } from "@/lib/datasets/formats";
import { listDatasets, pdfHref, reportHref } from "@/lib/datasets/store";
import { fmtDate, int } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Entry = { id: string; title: string; description: string; group: string; count: number; last?: Date; file?: string; href: string; pdf: string };

export default async function DataIndexPage() {
  const [datasets, recCount, recLast, jCount, jLast] = await Promise.all([
    listDatasets(),
    prisma.receivable.count(),
    prisma.receivableImport.findFirst({ where: { kind: "receivables" }, orderBy: { createdAt: "desc" } }),
    prisma.salesLine.count(),
    prisma.receivableImport.findFirst({ where: { kind: "journal" }, orderBy: { createdAt: "desc" } }),
  ]);
  const byId = new Map(datasets.map((d) => [d.format.id, d]));
  const entries: Entry[] = [
    { id: "journal", title: "تحليل المبيعات (قيود أودو)", description: "من تصدير «عنصر اليومية» في أودو: العربيات المتباعة، الإيرادات، الربح والمرتجعات.",
      group: "المبيعات", count: jCount, last: jLast?.createdAt, file: jLast?.fileName, href: "/sales-report", pdf: "/api/export/sales-report" },
    { id: "receivables", title: "المديونيات والتحصيل (البنوك)", description: "شيت المديونيات: صفقات البنوك والكاش، اتحصّل ولا لسه، ومدة التحصيل.",
      group: "المديونيات", count: recCount, last: recLast?.createdAt, file: recLast?.fileName, href: "/receivables", pdf: "/api/export/receivables" },
    ...FORMATS.map((f) => {
      const d = byId.get(f.id);
      return { id: f.id, title: f.title, description: f.description, group: f.group, count: d?.count ?? 0, last: d?.last?.createdAt, file: d?.last?.fileName, href: reportHref(f.id), pdf: pdfHref(f.id) };
    }),
    ...datasets.filter((d) => d.format.id.startsWith("g-")).map((d) => ({
      id: d.format.id, title: d.format.title, description: d.format.description, group: "أخرى", count: d.count,
      last: d.last?.createdAt, file: d.last?.fileName, href: reportHref(d.format.id), pdf: pdfHref(d.format.id),
    })),
  ];
  const withData = entries.filter((e) => e.count > 0).length;

  return (
    <>
      <PageHeader title="تقارير الإكسيل" subtitle={`ارفع أي شيت والبرنامج بيعرف نوعه ويطلعلك تقريره · ${int(withData)} من ${int(entries.length)} نوع فيهم بيانات`}>
        <Button asChild><Link href="/receivables/import"><Upload /> رفع ملفات إكسيل</Link></Button>
      </PageHeader>
      {GROUP_ORDER.map((g) => {
        const list = entries.filter((e) => e.group === g).sort((a, b) => Number(b.count > 0) - Number(a.count > 0));
        if (!list.length) return null;
        return (
          <section key={g} className="mb-8">
            <h2 className="mb-3 text-lg font-bold">{g}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((e) => (
                <Card key={e.id} className={e.count ? "" : "opacity-70"}>
                  <CardHeader>
                    <CardTitle className="leading-6">{e.title}</CardTitle>
                    <CardAction>{e.count ? <Badge variant="secondary">{int(e.count)} سطر</Badge> : <Badge variant="outline">لسه مترفعش</Badge>}</CardAction>
                    <CardDescription className="leading-6">{e.description}</CardDescription>
                    {e.last && <p className="text-xs text-muted-foreground">آخر ملف: {e.file} · {fmtDate(e.last)}</p>}
                  </CardHeader>
                  {e.count > 0 && (
                    <CardFooter className="mt-auto gap-2">
                      <Button asChild size="sm"><Link href={e.href}><BarChart3 /> التقرير</Link></Button>
                      <Button asChild size="sm" variant="secondary"><a href={e.pdf} target="_blank"><FileDown /> PDF</a></Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
