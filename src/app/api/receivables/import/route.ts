import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { describeSheets, loadWorkbook, parseWorkbook } from "@/lib/receivables/parse";
import { countJournalRows, findJournalHeader, parseJournalSheet, type JournalLine } from "@/lib/sales-journal/parse";

export const runtime = "nodejs";
const MAX = 25 * 1024 * 1024;

export type SheetKind = "receivables" | "journal";
export type SheetPreview = { name: string; rows: number; recognized: boolean; missing: string[]; kind: SheetKind | null };

/** Each sheet is either a receivables sheet (مديونيات) or an Odoo sales journal export (عنصر اليومية). */
function previewSheets(wb: ExcelJS.Workbook): SheetPreview[] {
  return describeSheets(wb).map((s) => {
    if (s.recognized) return { ...s, kind: "receivables" as const };
    const ws = wb.worksheets.find((w) => w.name === s.name)!;
    return findJournalHeader(ws)
      ? { name: s.name, rows: countJournalRows(ws), recognized: true, missing: [], kind: "journal" as const }
      : { ...s, kind: null };
  });
}

/**
 * POST multipart: file (.xlsx), mode = "preview" | "import", sheets = JSON string[], replace = "1".
 * preview → list of sheets with their type; import → saves rows (update by key) and keeps the original file in data/uploads.
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
  const sheets = previewSheets(wb);
  if (fd.get("mode") !== "import") return NextResponse.json({ sheets });

  let chosen: string[] = [];
  try { chosen = JSON.parse(String(fd.get("sheets") ?? "[]")); } catch { /* empty */ }
  const recSheets = chosen.filter((n) => sheets.some((s) => s.name === n && s.kind === "receivables"));
  const jSheets = chosen.filter((n) => sheets.some((s) => s.name === n && s.kind === "journal"));
  if (!recSheets.length && !jSheets.length) return NextResponse.json({ error: "اختار شيت واحد على الأقل" }, { status: 400 });
  const replace = fd.get("replace") === "1";

  const rec = recSheets.length ? parseWorkbook(wb, recSheets) : { rows: [], warnings: [] as string[] };
  const jWarnings: string[] = [];
  const lines: JournalLine[] = jSheets.flatMap((n) => parseJournalSheet(wb.worksheets.find((w) => w.name === n)!, jWarnings));
  if (!rec.rows.length && !lines.length) return NextResponse.json({ error: "مفيش صفوف بيانات في الشيتات دي" }, { status: 400 });

  // Keep the original upload for reference.
  const dir = path.join(process.cwd(), "data", "uploads");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stored = path.join("data", "uploads", `${stamp}__${path.basename(file.name).replace(/[\\/:*?"<>|]/g, "_")}`);
  await writeFile(path.join(process.cwd(), stored), Buffer.from(buf));
  const meta = (names: string[], total: number, kind: SheetKind) =>
    ({ fileName: file.name, storedPath: stored, sheets: names.map((s) => s.trim()).join(" · "), total, replaced: replace, kind });

  const imports = await prisma.$transaction(async (tx) => {
    const done = [];
    if (rec.rows.length) {
      if (replace) await tx.receivable.deleteMany();
      const imp = await tx.receivableImport.create({ data: meta(recSheets, rec.rows.length, "receivables") });
      const existing = new Set(replace ? [] : (await tx.receivable.findMany({ select: { key: true } })).map((r) => r.key));
      const fresh = rec.rows.filter((r) => !existing.has(r.key)).map((r) => ({ ...r, importId: imp.id }));
      const old = rec.rows.filter((r) => existing.has(r.key));
      if (fresh.length) await tx.receivable.createMany({ data: fresh });
      for (const r of old) await tx.receivable.update({ where: { key: r.key }, data: { ...r, importId: imp.id } });
      done.push(await tx.receivableImport.update({ where: { id: imp.id },
        data: { created: fresh.length, updated: old.length, warnings: rec.warnings.length ? JSON.stringify(rec.warnings) : null } }));
    }
    if (lines.length) {
      if (replace) await tx.salesLine.deleteMany();
      const imp = await tx.receivableImport.create({ data: meta(jSheets, lines.length, "journal") });
      const existing = new Set(replace ? [] : (await tx.salesLine.findMany({ select: { key: true } })).map((r) => r.key));
      const fresh = lines.filter((r) => !existing.has(r.key)).map((r) => ({ ...r, importId: imp.id }));
      const old = lines.filter((r) => existing.has(r.key));
      if (fresh.length) await tx.salesLine.createMany({ data: fresh });
      for (const r of old) await tx.salesLine.update({ where: { key: r.key }, data: { ...r, importId: imp.id } });
      done.push(await tx.receivableImport.update({ where: { id: imp.id },
        data: { created: fresh.length, updated: old.length, warnings: jWarnings.length ? JSON.stringify(jWarnings) : null } }));
    }
    return done;
  }, { timeout: 120_000 });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, imports, warnings: [...rec.warnings, ...jWarnings] });
}
