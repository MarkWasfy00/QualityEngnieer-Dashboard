import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { describeSheets, loadWorkbook, parseWorkbook } from "@/lib/receivables/parse";
import { countJournalRows, findJournalHeader, parseJournalSheet, type JournalLine } from "@/lib/sales-journal/parse";
import { analyzeWorkbook, type SheetResult } from "@/lib/datasets/formats";
import { dsKind, pdfHref, reportHref, saveRows } from "@/lib/datasets/store";

export const runtime = "nodejs";
export const maxDuration = 300;
const MAX = 25 * 1024 * 1024;

export type SheetPreview = {
  name: string; label: string; rows: number; recognized: boolean; missing: string[];
  /** "receivables" | "journal" | "ds:<layout id>" */
  kind: string | null; kindLabel: string | null; generic?: boolean; warnings?: string[];
};
export type ImportDone = { kind: string; label: string; href: string; pdf: string; total: number; created: number; updated: number; replaced: boolean };

const KNOWN = {
  receivables: { label: "شيت مديونيات", href: "/receivables", pdf: "/api/export/receivables" },
  journal: { label: "قيود مبيعات أودو", href: "/sales-report", pdf: "/api/export/sales-report" },
};

/** Receivables (مديونيات) and the Odoo sales journal keep their own importers; every other sheet goes through the dataset layouts. */
function previewSheets(wb: ExcelJS.Workbook, fileName: string) {
  const rec = describeSheets(wb);
  const ds = analyzeWorkbook(wb, fileName);
  const byName = new Map(ds.map((s) => [s.name, s]));
  const previews: SheetPreview[] = rec.map((s) => {
    const d = byName.get(s.name)!;
    if (s.recognized) return { ...s, label: d.label, kind: "receivables", kindLabel: KNOWN.receivables.label };
    const ws = wb.worksheets.find((w) => w.name === s.name)!;
    if (findJournalHeader(ws)) return { name: s.name, label: d.label, rows: countJournalRows(ws), recognized: true, missing: [], kind: "journal", kindLabel: KNOWN.journal.label };
    if (d.format && d.rows.length)
      return { name: s.name, label: d.label, rows: d.rows.length, recognized: true, missing: [], kind: dsKind(d.format.id), kindLabel: d.format.title, generic: !!d.generic, warnings: d.warnings };
    return { ...s, label: d.label, kind: null, kindLabel: null };
  });
  return { previews, ds: byName };
}

/**
 * POST multipart: file (.xlsx), mode = "preview" | "import", sheets = JSON string[], replace = "1".
 * preview → list of sheets with their type; import → saves rows and keeps the original file in data/uploads.
 */
export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "اختار ملف إكسيل الأول" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "الملف أكبر من 25 ميجا" }, { status: 400 });
  if (!/\.xlsx$/i.test(file.name)) return NextResponse.json({ error: "لازم الملف يكون .xlsx (احفظه من إكسيل بصيغة Excel Workbook)" }, { status: 400 });

  const buf = await file.arrayBuffer();
  let wb;
  try { wb = await loadWorkbook(buf); } catch {
    return NextResponse.json({ error: "مش قادر أقرا الملف — اتأكد إنه ملف إكسيل سليم" }, { status: 400 });
  }
  const { previews: sheets, ds } = previewSheets(wb, file.name);
  if (fd.get("mode") !== "import") return NextResponse.json({ sheets });

  let chosen: string[] = [];
  try { chosen = JSON.parse(String(fd.get("sheets") ?? "[]")); } catch { /* empty */ }
  const pick = (k: (s: SheetPreview) => boolean) => chosen.filter((n) => sheets.some((s) => s.name === n && k(s)));
  const recSheets = pick((s) => s.kind === "receivables");
  const jSheets = pick((s) => s.kind === "journal");
  const dsSheets = pick((s) => !!s.kind?.startsWith("ds:"));
  if (!recSheets.length && !jSheets.length && !dsSheets.length) return NextResponse.json({ error: "اختار شيت واحد على الأقل" }, { status: 400 });
  const replace = fd.get("replace") === "1";

  const rec = recSheets.length ? parseWorkbook(wb, recSheets) : { rows: [], warnings: [] as string[] };
  const jWarnings: string[] = [];
  const lines: JournalLine[] = jSheets.flatMap((n) => parseJournalSheet(wb.worksheets.find((w) => w.name === n)!, jWarnings));
  // Dataset sheets grouped by layout: all sheets of one layout are saved together (one snapshot).
  const groups = new Map<string, SheetResult[]>();
  for (const n of dsSheets) { const s = ds.get(n)!; (groups.get(s.format!.id) ?? groups.set(s.format!.id, []).get(s.format!.id)!).push(s); }
  if (!rec.rows.length && !lines.length && !groups.size) return NextResponse.json({ error: "مفيش صفوف بيانات في الشيتات دي" }, { status: 400 });

  // Keep the original upload for reference.
  const dir = path.join(process.cwd(), "data", "uploads");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stored = path.join("data", "uploads", `${stamp}__${path.basename(file.name).replace(/[\\/:*?"<>|]/g, "_")}`);
  await writeFile(path.join(process.cwd(), stored), Buffer.from(buf));
  const meta = (names: string[], total: number, kind: "receivables" | "journal") =>
    ({ fileName: file.name, storedPath: stored, sheets: names.map((s) => s.trim()).join(" · "), total, replaced: replace, kind });

  const done: ImportDone[] = [];
  const dsWarnings: string[] = [];
  await prisma.$transaction(async (tx) => {
    if (rec.rows.length) {
      if (replace) await tx.receivable.deleteMany();
      const imp = await tx.receivableImport.create({ data: meta(recSheets, rec.rows.length, "receivables") });
      const existing = new Set(replace ? [] : (await tx.receivable.findMany({ select: { key: true } })).map((r) => r.key));
      const fresh = rec.rows.filter((r) => !existing.has(r.key)).map((r) => ({ ...r, importId: imp.id }));
      const old = rec.rows.filter((r) => existing.has(r.key));
      if (fresh.length) await tx.receivable.createMany({ data: fresh });
      for (const r of old) await tx.receivable.update({ where: { key: r.key }, data: { ...r, importId: imp.id } });
      await tx.receivableImport.update({ where: { id: imp.id },
        data: { created: fresh.length, updated: old.length, warnings: rec.warnings.length ? JSON.stringify(rec.warnings) : null } });
      done.push({ kind: "receivables", ...KNOWN.receivables, total: rec.rows.length, created: fresh.length, updated: old.length, replaced: replace });
    }
    if (lines.length) {
      if (replace) await tx.salesLine.deleteMany();
      const imp = await tx.receivableImport.create({ data: meta(jSheets, lines.length, "journal") });
      const existing = new Set(replace ? [] : (await tx.salesLine.findMany({ select: { key: true } })).map((r) => r.key));
      const fresh = lines.filter((r) => !existing.has(r.key)).map((r) => ({ ...r, importId: imp.id }));
      const old = lines.filter((r) => existing.has(r.key));
      if (fresh.length) await tx.salesLine.createMany({ data: fresh });
      for (const r of old) await tx.salesLine.update({ where: { key: r.key }, data: { ...r, importId: imp.id } });
      await tx.receivableImport.update({ where: { id: imp.id },
        data: { created: fresh.length, updated: old.length, warnings: jWarnings.length ? JSON.stringify(jWarnings) : null } });
      done.push({ kind: "journal", ...KNOWN.journal, total: lines.length, created: fresh.length, updated: old.length, replaced: replace });
    }
    for (const [id, list] of groups) {
      const fmt = list[0].format!;
      const warnings = list.flatMap((s) => s.warnings);
      dsWarnings.push(...warnings);
      const imp = await saveRows(tx, {
        format: fmt, generic: list[0].generic, sheets: list.map((s) => ({ label: s.label, rows: s.rows })),
        fileName: file.name, storedPath: stored, replace, warnings,
      });
      done.push({ kind: dsKind(id), label: fmt.title, href: reportHref(id), pdf: pdfHref(id), total: imp.total, created: imp.created, updated: imp.updated, replaced: imp.replaced });
    }
  }, { timeout: 180_000, maxWait: 20_000 });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, imports: done, warnings: [...rec.warnings, ...jWarnings, ...dsWarnings] });
}
