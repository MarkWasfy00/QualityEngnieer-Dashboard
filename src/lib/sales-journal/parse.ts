import type ExcelJS from "exceljs";
import { norm } from "@/lib/receivables/parse";
import { carBrand } from "@/lib/receivables/brands";

/**
 * Odoo "عنصر اليومية (account.move.line)" export of the sales journal.
 * Rows may be grouped by product category: a header row like "vehicle (1191)" precedes its lines.
 */
const FIELDS = {
  date: ["التاريخ"],
  account: ["الحساب"],
  credit: ["الدائن"],
  debit: ["المدين"],
  customer: ["الشريك", "العميل"],
  product: ["المنتج"],
  matchingNo: ["رقم المطابقة"],
  invoiceNo: ["عدد", "الرقم", "رقم الفاتورة", "القيد"],
  chassis: ["رقم الشاسية", "رقم الشاسيه", "الشاسيه"],
  chassisCost: ["تكلفة الشاسية", "تكلفه الشاسيه"],
  color: ["مؤشر اللون", "اللون"],
  modelYear: ["سنة الموديل"],
  unitPrice: ["سعر الوحدة"],
  brand: ["البراند", "الماركة"],
  branch: ["الشركة"],
} as const;
type Field = keyof typeof FIELDS;
const HEADER = new Map<string, Field>(
  Object.entries(FIELDS).flatMap(([f, names]) => names.map((n) => [norm(n), f as Field])),
);

export type JournalLine = {
  key: string; date: Date; kind: "Sale" | "Return" | "Interest" | "InterestReturn"; category: string | null;
  paymentType: "CashBank" | "Installment"; account: string | null; customer: string | null; product: string | null;
  brand: string | null; invoiceNo: string | null; matchingNo: string | null; chassis: string | null;
  chassisCost: number | null; color: string | null; modelYear: string | null; unitPrice: number | null;
  branch: string | null; credit: number; debit: number; amount: number;
};

type Cell = ExcelJS.CellValue;
function raw(v: Cell): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return raw(v.result as Cell);
    if ("text" in v) return String(v.text);
    return null;
  }
  return v;
}
const text = (v: Cell) => {
  const x = raw(v);
  return x == null || x instanceof Date ? null : String(x).replace(/\s+/g, " ").trim() || null;
};
const number = (v: Cell) => {
  const x = raw(v);
  if (typeof x === "number") return isFinite(x) ? x : null;
  if (typeof x === "string") { const n = Number(x.replace(/[,\s]/g, "")); return x.trim() && isFinite(n) ? n : null; }
  return null;
};
function date(v: Cell): Date | null {
  const x = raw(v);
  if (x instanceof Date) return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
  if (typeof x === "string") {
    const m = x.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/) ?? x.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (!m) return null;
    const [y, mo, d] = m[1].length === 4 ? [+m[1], +m[2], +m[3]] : [+m[3], +m[2], +m[1]];
    return new Date(Date.UTC(y, mo - 1, d));
  }
  return null;
}

export function findJournalHeader(ws: ExcelJS.Worksheet) {
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const map = new Map<Field, number>();
    ws.getRow(r).eachCell((c, col) => {
      const f = HEADER.get(norm(String(raw(c.value) ?? "")));
      if (f && !map.has(f)) map.set(f, col);
    });
    if (map.has("date") && map.has("account") && map.has("credit") && map.has("debit")) return { row: r, map };
  }
  return null;
}

export function countJournalRows(ws: ExcelJS.Worksheet) {
  const h = findJournalHeader(ws);
  if (!h) return 0;
  let n = 0;
  const col = h.map.get("date")!;
  ws.eachRow((row, r) => { if (r > h.row && date(row.getCell(col).value)) n++; });
  return n;
}

/** "معرض كوم حمادة" → "كوم حمادة" (matches the branch names used in the receivables sheet). */
const cleanBranch = (s: string | null) => (s ? s.replace(/^معرض\s+/, "").trim() : null);

export function parseJournalSheet(ws: ExcelJS.Worksheet, warnings: string[]): JournalLine[] {
  const h = findJournalHeader(ws);
  if (!h) return [];
  const get = (row: ExcelJS.Row, f: Field) => (h.map.has(f) ? row.getCell(h.map.get(f)!).value : null);
  const out: JournalLine[] = [];
  const seen = new Map<string, number>();
  let category: string | null = null, skipped = 0;
  ws.eachRow((row, r) => {
    if (r <= h.row) return;
    const d = date(get(row, "date"));
    if (!d) {
      // Odoo group header, e.g. "installment (217)"
      const g = text(get(row, "date"))?.match(/^(.+?)\s*\(\d+\)$/);
      if (g) category = g[1].trim().toLowerCase(); else if (text(get(row, "date")) || number(get(row, "credit"))) skipped++;
      return;
    }
    const credit = number(get(row, "credit")) ?? 0, debit = number(get(row, "debit")) ?? 0;
    if (!credit && !debit) return;
    const account = text(get(row, "account"));
    const isInterest = /^500009/.test(account ?? "") || category === "interest" || /فوائد/.test(account ?? "");
    const kind = isInterest ? (debit > credit ? "InterestReturn" : "Interest") : debit > credit ? "Return" : "Sale";
    const invoiceNo = text(get(row, "invoiceNo"));
    const chassis = text(get(row, "chassis"));
    const product = text(get(row, "product"));
    const brandRaw = text(get(row, "brand"));
    const base = [invoiceNo ?? "", chassis ?? "", account ?? "", kind, Math.round((credit - debit) * 100)].join("|");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const cost = number(get(row, "chassisCost"));
    out.push({
      key: n > 1 ? `${base}#${n}` : base, date: d, kind, category,
      paymentType: category === "installment" ? "Installment" : "CashBank",
      account, customer: text(get(row, "customer")), product,
      brand: isInterest ? null : brandRaw || product ? carBrand(brandRaw || product) : null,
      invoiceNo, matchingNo: text(get(row, "matchingNo")), chassis, chassisCost: cost && cost > 0 ? cost : null,
      color: text(get(row, "color")), modelYear: text(get(row, "modelYear")), unitPrice: number(get(row, "unitPrice")),
      branch: cleanBranch(text(get(row, "branch"))), credit, debit, amount: credit - debit,
    });
  });
  if (skipped) warnings.push(`${ws.name.trim()}: ${skipped} صف من غير تاريخ اتساب`);
  return out;
}
