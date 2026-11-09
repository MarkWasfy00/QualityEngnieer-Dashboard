"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2, FileDown } from "lucide-react";

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
    <div className="card p-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
        onClick={() => input.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand hover:bg-blue-50/40">
        <FileSpreadsheet size={36} className="text-brand" />
        <div className="font-semibold text-slate-900">{file ? file.name : "اسحب ملف الإكسيل هنا أو دوس للاختيار"}</div>
        <div className="text-xs text-slate-500">ملف .xlsx: شيت المديونيات، أو تصدير &quot;عنصر اليومية&quot; من أودو (قيود المبيعات) — البرنامج بيعرف نوعه لوحده</div>
        <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {busy === "preview" && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> بقرا الملف…</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {sheets.length > 0 && !done && (
        <div className="mt-5">
          <h3 className="mb-2 font-bold text-slate-900">اختار الشيتات اللي هتدخل</h3>
          <p className="mb-3 text-xs text-slate-500">
            الشيت الكامل (الأكبر) متعلّم تلقائي. لو صفقة موجودة في أكتر من شيت بتتحسب مرة واحدة.
          </p>
          <div className="space-y-2">
            {sheets.map((s) => (
              <label key={s.name} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${s.recognized ? "border-slate-200 cursor-pointer hover:bg-slate-50" : "border-slate-100 text-slate-400"}`}>
                <input type="checkbox" disabled={!s.recognized} checked={chosen.includes(s.name)} onChange={() => toggle(s.name)} />
                <span className="font-semibold">{s.name.trim()}</span>
                {s.kind && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND[s.kind].cls}`}>{KIND[s.kind].label}</span>}
                <span className="ms-auto text-xs">
                  {s.recognized ? `${s.rows.toLocaleString("en")} صف` : "مش جدول معروف — هيتساب"}
                  {s.missing.length > 0 && <span className="ms-2 text-amber-600">ناقص: {s.missing.join("، ")}</span>}
                </span>
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            <span>
              امسح البيانات القديمة من نفس النوع واستبدلها بالملف ده
              <span className="block text-xs text-slate-500">من غير العلامة دي: السجلات الموجودة بتتحدّث (زي حالة التحصيل) والجديدة بتتضاف.</span>
            </span>
          </label>
          <button className="btn-primary mt-4" disabled={!chosen.length || !!busy} onClick={run}>
            {busy === "import" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            ادخّل {count.toLocaleString("en")} صف
          </button>
        </div>
      )}

      {done && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> الملف اتحفظ في السيستم</div>
          {done.imports.map((i) => (
            <p key={i.kind} className="mt-1"><b>{KIND[i.kind].label}:</b> {i.total.toLocaleString("en")} سجل — {i.created.toLocaleString("en")} جديد و {i.updated.toLocaleString("en")} اتحدّث.</p>
          ))}
          {done.warnings.map((w) => <p key={w} className="mt-1 flex items-center gap-1 text-amber-800"><AlertTriangle size={14} /> {w}</p>)}
          <div className="mt-3 flex flex-wrap gap-2">
            {done.imports.map((i) => (
              <span key={i.kind} className="contents">
                <Link href={KIND[i.kind].href} className="btn-primary">{KIND[i.kind].page}</Link>
                <a href={KIND[i.kind].pdf} target="_blank" className="btn-dark"><FileDown size={16} /> PDF {KIND[i.kind].page}</a>
              </span>
            ))}
            <button className="btn-ghost" onClick={() => { setFile(null); setSheets([]); setDone(null); }}>ارفع ملف تاني</button>
          </div>
        </div>
      )}
    </div>
  );
}
