"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2, FileDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Kind = "receivables" | "journal";
type Sheet = { name: string; rows: number; recognized: boolean; missing: string[]; kind: Kind | null };
type Done = { imports: { kind: Kind; created: number; updated: number; total: number }[]; warnings: string[] };
const KIND: Record<Kind, { label: string; cls: string; href: string; page: string; pdf: string }> = {
  receivables: { label: "شيت مديونيات", cls: "bg-blue-50 text-blue-700", href: "/receivables", page: "أداء التحصيل", pdf: "/api/export/receivables" },
  journal: { label: "قيود مبيعات أودو", cls: "bg-emerald-50 text-emerald-700", href: "/sales-report", page: "تحليل المبيعات", pdf: "/api/export/sales-report" },
};

export default function ReceivablesUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState<"" | "preview" | "import">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  async function send(mode: "preview" | "import", f: File) {
    const fd = new FormData();
    fd.set("file", f);
    fd.set("mode", mode);
    fd.set("sheets", JSON.stringify(chosen));
    if (replace) fd.set("replace", "1");
    setBusy(mode); setError("");
    try {
      const res = await fetch("/api/receivables/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حصلت مشكلة");
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "حصلت مشكلة");
      return null;
    } finally { setBusy(""); }
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    setFile(f); setDone(null); setSheets([]);
    const data = await send("preview", f);
    if (!data) return;
    const list: Sheet[] = data.sheets;
    setSheets(list);
    // Default: the biggest receivables sheet (the master; the others are usually subsets of it) + every journal sheet.
    const best = list.filter((s) => s.kind === "receivables").sort((a, b) => b.rows - a.rows)[0];
    setChosen([...(best ? [best.name] : []), ...list.filter((s) => s.kind === "journal").map((s) => s.name)]);
  }

  async function run() {
    if (!file) return;
    const data = await send("import", file);
    if (data) { setDone(data); router.refresh(); }
  }

  const toggle = (n: string) => setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));
  const count = sheets.filter((s) => chosen.includes(s.name)).reduce((a, s) => a + s.rows, 0);

  return (
    <Card>
      <CardContent>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
        onClick={() => input.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-input p-8 text-center transition-colors hover:border-primary hover:bg-primary/5">
        <FileSpreadsheet className="size-9 text-primary" />
        <div className="font-semibold">{file ? file.name : "اسحب ملف الإكسيل هنا أو دوس للاختيار"}</div>
        <div className="text-xs text-muted-foreground">ملف .xlsx: شيت المديونيات، أو تصدير &quot;عنصر اليومية&quot; من أودو (قيود المبيعات) — البرنامج بيعرف نوعه لوحده</div>
        <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {busy === "preview" && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> بقرا الملف…</p>}
      {error && <Alert variant="destructive" className="mt-4"><AlertTriangle /><AlertTitle>{error}</AlertTitle></Alert>}

      {sheets.length > 0 && !done && (
        <div className="mt-5">
          <h3 className="mb-2 text-base font-bold">اختار الشيتات اللي هتدخل</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            الشيت الكامل (الأكبر) متعلّم تلقائي. لو صفقة موجودة في أكتر من شيت بتتحسب مرة واحدة.
          </p>
          <div className="space-y-2">
            {sheets.map((s) => (
              <label key={s.name} className={cn("flex items-center gap-3 rounded-lg border p-3 text-sm", s.recognized ? "cursor-pointer hover:bg-muted/60" : "text-muted-foreground")}>
                <Checkbox disabled={!s.recognized} checked={chosen.includes(s.name)} onCheckedChange={() => toggle(s.name)} />
                <span className="font-semibold">{s.name.trim()}</span>
                {s.kind && <Badge className={cn("font-semibold", KIND[s.kind].cls)}>{KIND[s.kind].label}</Badge>}
                <span className="ms-auto text-xs">
                  {s.recognized ? `${s.rows.toLocaleString("en")} صف` : "مش جدول معروف — هيتساب"}
                  {s.missing.length > 0 && <span className="ms-2 text-amber-600">ناقص: {s.missing.join("، ")}</span>}
                </span>
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <Checkbox className="mt-0.5" checked={replace} onCheckedChange={(v) => setReplace(v === true)} />
            <span>
              امسح البيانات القديمة من نفس النوع واستبدلها بالملف ده
              <span className="block text-xs text-muted-foreground">من غير العلامة دي: السجلات الموجودة بتتحدّث (زي حالة التحصيل) والجديدة بتتضاف.</span>
            </span>
          </label>
          <Button size="lg" className="mt-4 px-4" disabled={!chosen.length || !!busy} onClick={run}>
            {busy === "import" ? <Loader2 className="animate-spin" /> : <Upload />}
            ادخّل {count.toLocaleString("en")} صف
          </Button>
        </div>
      )}

      {done && (
        <Alert className="mt-5 border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 />
          <AlertTitle className="font-bold">الملف اتحفظ في السيستم</AlertTitle>
          <AlertDescription className="text-emerald-900">
          {done.imports.map((i) => (
            <p key={i.kind} className="mt-1"><b>{KIND[i.kind].label}:</b> {i.total.toLocaleString("en")} سجل — {i.created.toLocaleString("en")} جديد و {i.updated.toLocaleString("en")} اتحدّث.</p>
          ))}
          {done.warnings.map((w) => <p key={w} className="mt-1 flex items-center gap-1 text-amber-800"><AlertTriangle className="size-3.5" /> {w}</p>)}
          </AlertDescription>
          <div className="col-start-2 mt-3 flex flex-wrap gap-2">
            {done.imports.map((i) => (
              <span key={i.kind} className="contents">
                <Button asChild><Link href={KIND[i.kind].href}>{KIND[i.kind].page}</Link></Button>
                <Button asChild variant="secondary"><a href={KIND[i.kind].pdf} target="_blank"><FileDown /> PDF {KIND[i.kind].page}</a></Button>
              </span>
            ))}
            <Button variant="outline" onClick={() => { setFile(null); setSheets([]); setDone(null); }}>ارفع ملف تاني</Button>
          </div>
        </Alert>
      )}
      </CardContent>
    </Card>
  );
}
