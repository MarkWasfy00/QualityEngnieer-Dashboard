"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2, FileDown, X, BarChart3 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Sheet = {
  name: string; label: string; rows: number; recognized: boolean; missing: string[];
  kind: string | null; kindLabel: string | null; generic?: boolean; warnings?: string[];
};
type Imported = { kind: string; label: string; href: string; pdf: string; total: number; created: number; updated: number; replaced: boolean };
type Item = {
  id: string; file: File; status: "reading" | "ready" | "importing" | "done" | "error";
  sheets: Sheet[]; chosen: string[]; error?: string; imports?: Imported[]; warnings?: string[];
};

const badgeCls = (s: Sheet) =>
  s.kind === "receivables" ? "bg-blue-50 text-blue-700" : s.kind === "journal" ? "bg-emerald-50 text-emerald-700"
    : s.generic ? "bg-amber-50 text-amber-800" : "bg-violet-50 text-violet-700";

/** Default sheets: the biggest receivables sheet (the others are usually subsets), every journal / known-layout sheet; unknown tables only if nothing else. */
function defaults(list: Sheet[]) {
  const best = list.filter((s) => s.kind === "receivables").sort((a, b) => b.rows - a.rows)[0];
  const known = list.filter((s) => s.kind === "journal" || (s.kind?.startsWith("ds:") && !s.generic));
  const generic = list.filter((s) => s.generic);
  return [...(best ? [best.name] : []), ...known.map((s) => s.name), ...(!best && !known.length ? generic.map((s) => s.name) : [])];
}

async function post(f: File, mode: "preview" | "import", sheets: string[] = [], replace = false) {
  const fd = new FormData();
  fd.set("file", f);
  fd.set("mode", mode);
  fd.set("sheets", JSON.stringify(sheets));
  if (replace) fd.set("replace", "1");
  const res = await fetch("/api/receivables/import", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({ error: "الرد من السيرفر مش مفهوم" }));
  if (!res.ok) throw new Error(data.error || "حصلت مشكلة");
  return data;
}

export default function ReceivablesUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  async function pick(list: FileList | File[] | null | undefined) {
    const files = [...(list ?? [])].filter((f) => /\.xlsx$/i.test(f.name));
    const skipped = [...(list ?? [])].length - files.length;
    const fresh: Item[] = files.map((file, i) => ({ id: `${Date.now()}-${i}-${file.name}`, file, status: "reading", sheets: [], chosen: [] }));
    if (skipped) fresh.push(...[...(list ?? [])].filter((f) => !/\.xlsx$/i.test(f.name)).map((file, i) => ({
      id: `${Date.now()}-x${i}`, file, status: "error" as const, sheets: [], chosen: [], error: "لازم الملف يكون .xlsx",
    })));
    setItems((xs) => [...xs.filter((x) => x.status !== "done"), ...fresh]);
    for (const it of fresh.filter((x) => x.status === "reading")) {
      try {
        const data = await post(it.file, "preview");
        patch(it.id, { status: "ready", sheets: data.sheets, chosen: defaults(data.sheets) });
      } catch (e) { patch(it.id, { status: "error", error: e instanceof Error ? e.message : "حصلت مشكلة" }); }
    }
  }

  async function runAll() {
    setBusy(true);
    for (const it of items.filter((x) => x.status === "ready" && x.chosen.length)) {
      patch(it.id, { status: "importing" });
      try {
        const data = await post(it.file, "import", it.chosen, replace);
        patch(it.id, { status: "done", imports: data.imports, warnings: data.warnings });
      } catch (e) { patch(it.id, { status: "error", error: e instanceof Error ? e.message : "حصلت مشكلة" }); }
    }
    setBusy(false);
    router.refresh();
  }

  const toggle = (id: string, n: string) => setItems((xs) => xs.map((x) => (x.id !== id ? x : { ...x, chosen: x.chosen.includes(n) ? x.chosen.filter((c) => c !== n) : [...x.chosen, n] })));
  const ready = items.filter((x) => x.status === "ready" && x.chosen.length);
  const reading = items.some((x) => x.status === "reading");
  const count = ready.reduce((a, x) => a + x.sheets.filter((s) => x.chosen.includes(s.name)).reduce((b, s) => b + s.rows, 0), 0);
  // One link per report, even when several files fed it.
  const reports = [...new Map(items.flatMap((x) => x.imports ?? []).map((i) => [i.kind, i])).values()];

  return (
    <Card>
      <CardContent>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}
          onClick={() => input.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-input p-8 text-center transition-colors hover:border-primary hover:bg-primary/5">
          <FileSpreadsheet className="size-9 text-primary" />
          <div className="font-semibold">اسحب ملفات الإكسيل هنا (ملف أو أكتر) أو دوس للاختيار</div>
          <div className="max-w-2xl text-xs leading-5 text-muted-foreground">
            البرنامج بيعرف نوع كل شيت لوحده: المديونيات، قيود أودو، المخزون والجرد، حركة وأذون المخازن، مبيعات البنوك والتقسيط والمستعمل،
            مديونيات العملاء، مطالبات الشركات، وجهات الاتصال — وأي جدول تاني بيعمله ملخص تلقائي.
          </div>
          <input ref={input} type="file" accept=".xlsx" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        </div>

        {items.length > 0 && (
          <div className="mt-5 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-lg border">
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
                  <FileSpreadsheet className="size-4 text-primary" />
                  <span className="font-semibold">{it.file.name}</span>
                  {it.status === "reading" && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> بقرا الملف…</span>}
                  {it.status === "importing" && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> بدخّل البيانات…</span>}
                  {it.status === "done" && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-4" /> اتحفظ</span>}
                  {it.status === "error" && <span className="flex items-center gap-1 text-red-700"><AlertTriangle className="size-4" /> {it.error}</span>}
                  {(it.status === "ready" || it.status === "error") && (
                    <Button variant="ghost" size="icon-sm" className="ms-auto" title="شيل الملف" onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))}><X /></Button>
                  )}
                </div>
                {it.status === "done" ? (
                  <div className="space-y-1 p-3 text-sm">
                    {it.imports?.map((i) => (
                      <p key={i.kind}>
                        <b>{i.label}:</b> {i.total.toLocaleString("en")} سجل —{" "}
                        {i.replaced ? "استبدل البيانات القديمة من النوع ده" : `${i.created.toLocaleString("en")} جديد و ${i.updated.toLocaleString("en")} اتحدّث`}.
                      </p>
                    ))}
                    {it.warnings?.map((w) => <p key={w} className="flex items-center gap-1 text-amber-800"><AlertTriangle className="size-3.5 shrink-0" /> {w}</p>)}
                  </div>
                ) : it.sheets.length > 0 && (
                  <div className="space-y-1.5 p-3">
                    {it.sheets.map((s) => (
                      <label key={s.name} className={cn("flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 text-sm", s.recognized ? "cursor-pointer hover:bg-muted/60" : "text-muted-foreground")}>
                        <Checkbox disabled={!s.recognized || it.status !== "ready"} checked={it.chosen.includes(s.name)} onCheckedChange={() => toggle(it.id, s.name)} />
                        <span className="font-semibold">{s.label}</span>
                        {s.kindLabel && <Badge className={cn("font-semibold", badgeCls(s))}>{s.generic ? "جدول اتعرف تلقائي" : s.kindLabel}</Badge>}
                        <span className="ms-auto text-xs">
                          {s.recognized ? `${s.rows.toLocaleString("en")} صف` : "مفيش جدول فيه — هيتساب"}
                          {s.missing.length > 0 && <span className="ms-2 text-amber-600">ناقص: {s.missing.join("، ")}</span>}
                        </span>
                        {s.warnings?.map((w) => <span key={w} className="basis-full ps-7 text-xs text-amber-700">{w}</span>)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {(ready.length > 0 || reading) && (
          <div className="mt-4">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" checked={replace} onCheckedChange={(v) => setReplace(v === true)} />
              <span>
                امسح البيانات القديمة من نفس النوع واستبدلها بالملفات دي
                <span className="block text-xs text-muted-foreground">
                  من غير العلامة دي: المبيعات والحركات والأذون بتتحدّث وتتضاف للقديم. شيتات «الوضع الحالي» (المخزون، الجرد، المديونيات، مطالبات الشركات) بتستبدل نسختها القديمة دايمًا.
                </span>
              </span>
            </label>
            <Button size="lg" className="mt-4 px-4" disabled={!ready.length || busy || reading} onClick={runAll}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}
              ادخّل {count.toLocaleString("en")} صف من {ready.length.toLocaleString("en")} ملف
            </Button>
          </div>
        )}

        {reports.length > 0 && !busy && (
          <Alert className="mt-5 border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 />
            <AlertTitle className="font-bold">الملفات اتحفظت — التقارير جاهزة</AlertTitle>
            <AlertDescription className="text-emerald-900">
              <div className="mt-2 grid w-full gap-2 sm:grid-cols-2">
                {reports.map((i) => (
                  <div key={i.kind} className="flex flex-wrap items-center gap-2 rounded-md bg-white/70 p-2">
                    <span className="me-auto text-sm font-semibold">{i.label}</span>
                    <Button asChild size="sm"><Link href={i.href}><BarChart3 /> التقرير</Link></Button>
                    <Button asChild size="sm" variant="secondary"><a href={i.pdf} target="_blank"><FileDown /> PDF</a></Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
            <div className="col-start-2 mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href="/data">كل التقارير</Link></Button>
              <Button variant="outline" onClick={() => setItems([])}>ارفع ملفات تانية</Button>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
