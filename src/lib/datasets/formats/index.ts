import type ExcelJS from "exceljs";
import type { Breakdown, Ctx, Format, Kpi, Rec, ReportSpec } from "../types";
import { STOCK_FORMATS } from "./stock";
import { SALES_FORMATS } from "./sales";
import { DEBT_FORMATS } from "./debts";
import { SUPPLIER_FORMATS } from "./suppliers";
import { findHeader, genericDef, readGeneric, readTable, type GenericDef } from "../parse";
import { M } from "../metrics";
import { groupRows } from "../group";
import { int } from "@/lib/format";

export const FORMATS: Format[] = [...STOCK_FORMATS, ...SALES_FORMATS, ...DEBT_FORMATS, ...SUPPLIER_FORMATS];
export const FORMAT_BY_ID = new Map(FORMATS.map((f) => [f.id, f]));
export const GROUP_ORDER: Format["group"][] = ["المبيعات", "المديونيات", "الموردين", "المخزون", "أخرى"];

/** Sheet names trimmed; two sheets that differ only by spaces ("شيرى" / "شيرى ") get "(2)". */
export function sheetLabels(wb: ExcelJS.Workbook) {
  const seen = new Map<string, number>();
  return new Map(wb.worksheets.map((ws) => {
    const t = ws.name.trim() || ws.name;
    const k = (seen.get(t) ?? 0) + 1;
    seen.set(t, k);
    return [ws.name, k > 1 ? `${t} (${k})` : t];
  }));
}

export type SheetResult = {
  name: string; label: string; format: Format | null; generic: GenericDef | null; rows: Rec[]; warnings: string[];
};

/** Which layout a sheet is: custom readers first, then the table layout whose headers match best, else an auto-detected table. */
export function analyzeSheet(ws: ExcelJS.Worksheet, label: string, fileName: string): SheetResult {
  const ctx: Ctx = { sheet: label, file: fileName, warnings: [] };
  const base = { name: ws.name, label, warnings: ctx.warnings };
  if (ws.state === "veryHidden" || !ws.rowCount) return { ...base, format: null, generic: null, rows: [] };
  for (const fmt of FORMATS.filter((x) => x.parse)) {
    const rows = fmt.parse!(ws, ctx);
    if (rows?.length) {
      for (const r of rows) fmt.derive?.(r, ctx);
      return { ...base, format: fmt, generic: null, rows: fmt.keep ? rows.filter(fmt.keep) : rows };
    }
  }
  let best: { fmt: Format; score: number } | null = null;
  for (const fmt of FORMATS.filter((x) => !x.parse)) {
    const h = findHeader(ws, fmt.fields, fmt.required);
    if (!h) continue;
    const sheetFields = fmt.fields.filter((x) => x.aliases?.length).length;
    const score = h.matched + h.matched / sheetFields; // most columns found, then best coverage
    if (!best || score > best.score) best = { fmt, score };
  }
  if (best) {
    const rows = readTable(ws, best.fmt, ctx) ?? [];
    if (rows.length) return { ...base, format: best.fmt, generic: null, rows };
  }
  const def = genericDef(ws, fileName);
  if (def) {
    const rows = readGeneric(ws, def, ctx);
    if (rows.length >= 2) return { ...base, format: genericFormat(def), generic: def, rows };
  }
  return { ...base, format: null, generic: null, rows: [] };
}

export function analyzeWorkbook(wb: ExcelJS.Workbook, fileName: string) {
  const labels = sheetLabels(wb);
  return wb.worksheets.map((ws) => analyzeSheet(ws, labels.get(ws.name)!, fileName));
}

/** A layout no one described: report = row count, sums of number columns, splits by low-variety text columns. */
export function genericFormat(def: GenericDef, rows?: Rec[]): Format {
  const nums = def.fields.filter((f) => f.type === "money" || f.type === "number");
  const firstDate = def.fields.find((f) => f.type === "date");
  const report: ReportSpec = {
    kpis: [{ metric: M.count("عدد السطور") } as Kpi, ...nums.slice(0, 5).map((f) => ({ metric: M.sum(f.key, `إجمالي ${f.label}`, f.type === "money" ? "money" : "num") }))],
    trends: firstDate ? [{ title: `حسب ${firstDate.label}`, date: firstDate.key, metric: M.count("سطور") }] : [],
    breakdowns: [],
    table: def.fields.slice(0, 16).map((f) => f.key),
    filters: [],
    summary: (rs) => `${int(rs.length)} سطر في الجدول ده. البرنامج قرا الأعمدة لوحده لأنه مش من الشيتات المعروفة.`,
  };
  if (rows?.length) {
    const texts = def.fields.filter((f) => f.type === "text").map((f) => ({ f, groups: groupRows(rows, f.key).length }))
      .filter((x) => x.groups >= 2 && x.groups <= 40 && x.groups < rows.length * 0.6);
    report.breakdowns = texts.slice(0, 4).map(({ f }): Breakdown => ({
      title: `حسب ${f.label}`, by: f.key,
      metrics: [M.count("سطور"), ...nums.slice(0, 2).map((x) => M.sum(x.key, x.label, x.type === "money" ? "money" : "num"))],
    }));
    report.filters = texts.slice(0, 3).map((x) => x.f.key);
  }
  return {
    id: def.id, title: `جدول: ${def.title}`, group: "أخرى", mode: "snapshot", fields: def.fields, report,
    description: "جدول البرنامج معرفش نوعه، فقرا عناوين الأعمدة لوحده وعمل ملخص بسيط.", dateField: firstDate?.key,
  };
}
