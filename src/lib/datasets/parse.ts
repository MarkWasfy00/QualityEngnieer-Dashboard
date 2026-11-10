import { createHash } from "node:crypto";
import type ExcelJS from "exceljs";
import type { Ctx, Field, FieldType, Format, Rec } from "./types";
import { date, hkey, number, raw, text, type Cell } from "./cells";
import { int } from "@/lib/format";

const HEADER_ROWS = 15;
const isNum = (t?: FieldType) => t === "int" || t === "number" || t === "money" || t === "pct";

export function convert(v: Cell, f: Field): string | number | null {
  if (f.type === "date") return date(v, f.past);
  if (isNum(f.type)) return number(v);
  return text(v);
}

/** Header row = the row (in the first 15) where the most fields are found, as long as all required ones are there. */
export function findHeader(ws: ExcelJS.Worksheet, fields: Field[], required: string[] = []) {
  let best: { row: number; cols: Map<string, number>; matched: number } | null = null;
  for (let r = 1; r <= Math.min(HEADER_ROWS, ws.rowCount); r++) {
    const byKey = new Map<string, number[]>();
    ws.getRow(r).eachCell((c, col) => {
      const k = hkey(raw(c.value));
      if (k) (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(col);
    });
    if (byKey.size < 2) continue;
    const used = new Set<number>();
    const cols = new Map<string, number>();
    for (const f of fields) {
      for (const a of f.aliases ?? []) {
        const col = byKey.get(hkey(a))?.find((c) => !used.has(c));
        if (col) { cols.set(f.key, col); used.add(col); break; }
      }
    }
    if (required.every((k) => cols.has(k)) && cols.size >= 2 && (!best || cols.size > best.matched)) best = { row: r, cols, matched: cols.size };
  }
  return best;
}

/** Odoo grouped export: a row like "available (733)" starts a group. */
const GROUP_ROW = /^(.+?)\s*\((\d[\d,]*)\)$/;
/** Totals / grand-total rows at the bottom of a sheet. */
const TOTAL = /^(ال)?(اجمال|اجمل|مجموع)|^total\b/i;

/** A date cell we couldn't use (future / impossible) — placeholders like "ـــــ" or "اشعار خصم" don't count. */
const looksLikeDate = (x: unknown) => x instanceof Date || typeof x === "number" || (typeof x === "string" && /\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}/.test(x));

/** Reads one simple table (header row + data rows) using the layout's field aliases. */
export function readTable(ws: ExcelJS.Worksheet, fmt: Pick<Format, "fields" | "required" | "keep" | "derive">, ctx: Ctx): Rec[] | null {
  const h = findHeader(ws, fmt.fields, fmt.required);
  if (!h) return null;
  const headerText = new Map([...h.cols].map(([k, col]) => [k, hkey(raw(ws.getRow(h.row).getCell(col).value))]));
  const mapped = fmt.fields.filter((f) => h.cols.has(f.key));
  const textFields = mapped.filter((f) => !isNum(f.type) && f.type !== "date");
  const out: Rec[] = [];
  const badDates = new Map<string, number>();
  let group: string | null = null;
  for (let r = h.row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;
    const filled: unknown[] = [];
    row.eachCell((c) => { const x = raw(c.value); if (x != null && x !== "") filled.push(x); });
    if (!filled.length) continue;
    const first = typeof filled[0] === "string" ? filled[0].trim().match(GROUP_ROW) : null;
    if (first && filled.length <= 3) { group = first[1].trim(); continue; }

    const rec: Rec = {};
    let any = false;
    const bad: string[] = [];
    for (const f of mapped) {
      const cell = row.getCell(h.cols.get(f.key)!).value;
      const v = convert(cell, f);
      rec[f.key] = v;
      if (v != null) any = true;
      else if (f.type === "date" && looksLikeDate(raw(cell))) bad.push(f.label);
    }
    if (!any) continue;
    // Repeated header row in the middle of the sheet.
    if (textFields.filter((f) => rec[f.key] != null && hkey(rec[f.key]) === headerText.get(f.key)).length >= 2) continue;
    if (textFields.slice(0, 3).some((f) => typeof rec[f.key] === "string" && TOTAL.test(hkey(rec[f.key])))) continue;
    if (group) rec.odooGroup = group;
    fmt.derive?.(rec, ctx);
    if (fmt.keep && !fmt.keep(rec)) continue;
    for (const b of bad) badDates.set(b, (badDates.get(b) ?? 0) + 1);
    out.push(rec);
  }
  for (const [label, k] of badDates)
    ctx.warnings.push(`${ctx.sheet}: ${int(k)} صف «${label}» فيه في المستقبل أو مش مفهوم (غالبًا غلطة في السنة) — اتسجل من غير تاريخ`);
  return out;
}

// ---------- unknown tables: read whatever header the sheet has ----------

export type GenericDef = { id: string; title: string; fields: Field[] };
const MONEY_WORDS = /سعر|قيم|مبلغ|تكلف|اجمال|ربح|مدين|دائن|رصيد|مديون|مقدم|تمويل|price|amount|cost|total|value/i;

/** Finds a header row in a sheet no layout recognized, and guesses each column's type from the data. */
export function genericDef(ws: ExcelJS.Worksheet, fileName: string): GenericDef | null {
  let bestRow = 0, bestCells: { col: number; label: string }[] = [];
  for (let r = 1; r <= Math.min(HEADER_ROWS, ws.rowCount); r++) {
    const cells: { col: number; label: string }[] = [];
    let numbers = 0;
    ws.getRow(r).eachCell((c, col) => {
      const x = raw(c.value);
      if (typeof x === "string" && x.trim() && !/^\d+([.,]\d+)?$/.test(x.trim())) cells.push({ col, label: x.replace(/\s+/g, " ").trim() });
      else if (x != null && x !== "") numbers++;
    });
    const distinct = new Set(cells.map((c) => hkey(c.label))).size;
    if (distinct >= 3 && numbers <= cells.length / 3 && distinct > new Set(bestCells.map((c) => hkey(c.label))).size) { bestRow = r; bestCells = cells; }
  }
  if (!bestRow) return null;
  // Merged title cells repeat the same text — keep the first column of each label.
  const seen = new Set<string>();
  const cells = bestCells.filter((c) => { const k = hkey(c.label); if (seen.has(k)) return false; seen.add(k); return true; });
  const sample: Cell[][] = cells.map(() => []);
  for (let r = bestRow + 1; r <= Math.min(ws.rowCount, bestRow + 300); r++) {
    const row = ws.getRow(r);
    cells.forEach((c, i) => { const v = row.getCell(c.col).value; if (raw(v) != null && raw(v) !== "") sample[i].push(v); });
  }
  if (sample.every((s) => s.length < 2)) return null;
  const fields: Field[] = cells.map((c, i) => {
    const vs = sample[i];
    const dates = vs.filter((v) => raw(v) instanceof Date || (typeof raw(v) === "string" && date(v) != null)).length;
    const nums = vs.filter((v) => typeof raw(v) === "number" || number(v) != null).length;
    const type: FieldType = vs.length && dates / vs.length >= 0.6 ? "date"
      : vs.length && nums / vs.length >= 0.7 ? (MONEY_WORDS.test(c.label) ? "money" : "number") : "text";
    return { key: `c${c.col}`, label: c.label, type, aliases: [c.label] };
  });
  const sig = createHash("sha1").update(fields.map((f) => hkey(f.label)).join("|")).digest("hex").slice(0, 10);
  return { id: `g-${sig}`, title: ws.name.trim() || fileName, fields };
}

export function readGeneric(ws: ExcelJS.Worksheet, def: GenericDef, ctx: Ctx) {
  return readTable(ws, { fields: def.fields, required: [] }, ctx) ?? [];
}
