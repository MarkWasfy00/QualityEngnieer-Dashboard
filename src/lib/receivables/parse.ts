import ExcelJS from "exceljs";

/** Normalize Arabic text for matching (أإآ→ا، ة→ه، ي→ى، extra spaces). */
export const norm = (s: string) =>
  s.replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ي/g, "ى")
    .replace(/\s+/g, " ").trim();

const FIELDS = {
  customerName: ["اسم العميل"],
  status: ["ملاحظات"],
  collectedAt: ["تاريخ التحصيل"],
  car: ["السياره"],
  chassis: ["الشاسيه", "الشاسى"],
  debit: ["مدين"],
  salePrice: ["سعر البيع"],
  financeAmount: ["مبلغ التمويل"],
  downPaymentRemaining: ["باقى المقدم"],
  saleDate: ["تاريخ", "تاريخ البيع"],
  closingOfficer: ["مسؤول التقفيل", "مسئول التقفيل"],
  branch: ["فرع", "الفرع"],
  bank: ["بنك", "البنك"],
  salesman: ["سيلز", "البياع"],
  remarks: ["الملاحظات"],
} as const;
type Field = keyof typeof FIELDS;
const HEADER = new Map<string, Field>(
  Object.entries(FIELDS).flatMap(([f, names]) => names.map((n) => [norm(n), f as Field])),
);

/** Common spelling variants in the sheet → one display name. */
const BANK_ALIAS_LIST: Record<string, string> = {
  "ابوظبى الاسلامى": "أبوظبي الإسلامي", "ابو ظبى الاسلامى": "أبوظبي الإسلامي",
  "الاهلى الكويتى": "الأهلي الكويتي", "الاهلى الكوتيى": "الأهلي الكويتي",
  "ساييب": "سايب", "سايب": "سايب",
  "تنميه الصادرات": "تنمية الصادرات",
  "qnb": "QNB",
  "قسط": "قسط", "تقسيط": "قسط",
  "القاهره": "القاهرة", "الكويت الوطنى": "الكويت الوطني", "قناه السويس": "قناة السويس",
  "عوده": "عودة", "كاش": "كاش",
};
// Keys are normalized the same way as the cell text, so spelling variants (ي/ى، ة/ه) all match.
const BANK_ALIASES = Object.fromEntries(Object.entries(BANK_ALIAS_LIST).map(([k, v]) => [norm(k).toLowerCase(), v]));
const has = (s: string, ...words: string[]) => words.some((w) => s.includes(norm(w)));
const canonBank = (s: string | null) => {
  if (!s) return null;
  const k = norm(s).toLowerCase();
  return BANK_ALIASES[k] ?? s.replace(/\s+/g, " ").trim();
};
const clean = (s: string | null) => (s ? s.replace(/\s+/g, " ").trim() || null : null);

export type ParsedRow = {
  key: string; customerName: string; status: string | null; state: "Open" | "Collected" | "Returned";
  collectedAt: Date | null; car: string | null; chassis: string | null; debit: number | null; salePrice: number | null;
  financeAmount: number | null; downPaymentRemaining: number | null; amountDue: number; saleDate: Date | null;
  closingOfficer: string | null; branch: string | null; bank: string | null; paymentType: "Bank" | "Cash" | "Installment";
  salesman: string | null; remarks: string | null; sourceSheet: string;
};
export type SheetInfo = { name: string; rows: number; recognized: boolean; missing: string[] };

type Cell = ExcelJS.CellValue;
function raw(v: Cell): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return v.result instanceof Object && "error" in v.result ? null : raw(v.result as Cell);
    if ("formula" in v || "sharedFormula" in v) return null; // formula without cached value
    if ("text" in v) return String(v.text);
    if ("error" in v) return null;
  }
  return v;
}
const text = (v: Cell) => {
  const x = raw(v);
  if (x == null) return null;
  return clean(x instanceof Date ? x.toISOString().slice(0, 10) : String(x));
};
/** Numbers, "1,031,525.00 ", "1078000+600" (sums the parts), "350000+الاعتماد" (numeric parts only). */
function number(v: Cell): number | null {
  const x = raw(v);
  if (x == null || x instanceof Date) return null;
  if (typeof x === "number") return isFinite(x) ? x : null;
  const s = String(x).replace(/,/g, "").replace(/\s+/g, "");
  if (!s) return null;
  const parts = s.match(/-?\d+(\.\d+)?/g);
  if (!parts) return null;
  if (/^-?[\d.]+$/.test(s)) return Number(s);
  return parts.reduce((a, p) => a + Math.abs(Number(p)), 0);
}

const today = () => new Date();
const plausible = (d: Date) => d.getUTCFullYear() >= 2015 && +d <= +today() + 366 * 86400000;
/** Dates as Date cells, "15/7/2026" strings, or Excel serials. Fixes d/m swapped into the future. */
function date(v: Cell): Date | null {
  const x = raw(v);
  if (x == null) return null;
  let d: Date | null = null;
  if (x instanceof Date) {
    d = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
    // Excel read "9/12/2026" as Sep-12 → Dec-9 lands in the future: swap day and month back.
    if (+d > +today() && d.getUTCDate() <= 12) {
      const sw = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCDate() - 1, d.getUTCMonth() + 1));
      if (+sw <= +today()) d = sw;
    }
  } else if (typeof x === "number") {
    if (x > 30000 && x < 80000) d = new Date(Math.round((x - 25569) * 86400000));
  } else {
    const m = String(x).trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m) {
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      const dd = Number(m[1]), mm = Number(m[2]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) d = new Date(Date.UTC(y, mm - 1, dd));
    }
  }
  return d && !isNaN(+d) && plausible(d) ? d : null;
}

const DAY = 86400000;
const swapDM = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCDate() - 1, d.getUTCMonth() + 1));
/** A real Excel date whose day and month could have been swapped when it was typed (e.g. 1/10 read as Jan-10). */
const ambiguous = (v: Cell, d: Date | null) =>
  !!d && raw(v) instanceof Date && d.getUTCDate() <= 12 && d.getUTCDate() !== d.getUTCMonth() + 1;
const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[a.length >> 1]; };

/**
 * Repairs day/month swaps:
 *  - sale date: rows are entered in date order, so a date far from its neighbours whose swap fits them is fixed;
 *  - collection date: if it lands before the sale or >120 days after it, and the swap gives 0–120 days, it's fixed.
 */
function fixSwappedDates(rows: { saleDate: Date | null; collectedAt: Date | null; ambSale: boolean; ambCol: boolean }[]) {
  let fixed = 0;
  const now = Date.now();
  rows.forEach((r, i) => {
    if (!r.ambSale || !r.saleDate) return;
    const near = rows.slice(Math.max(0, i - 6), i + 7).filter((x, j) => x !== r && x.saleDate && j !== i).map((x) => +x.saleDate!);
    if (near.length < 4) return;
    const ref = median(near), sw = swapDM(r.saleDate);
    const off = Math.abs(+r.saleDate - ref), offSw = Math.abs(+sw - ref);
    if (off > 45 * DAY && offSw <= 45 * DAY && +sw <= now) { r.saleDate = sw; fixed++; }
  });
  for (const r of rows) {
    if (!r.ambCol || !r.collectedAt || !r.saleDate) continue;
    const ok = (c: Date) => +c - +r.saleDate! >= 0 && +c - +r.saleDate! <= 120 * DAY;
    const sw = swapDM(r.collectedAt);
    if (!ok(r.collectedAt) && ok(sw) && +sw <= now) { r.collectedAt = sw; fixed++; }
  }
  return fixed;
}

function findHeader(ws: ExcelJS.Worksheet) {
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const map = new Map<Field, number>();
    ws.getRow(r).eachCell((c, col) => {
      const f = HEADER.get(norm(String(raw(c.value) ?? "")));
      if (f && !map.has(f)) map.set(f, col);
    });
    if (map.has("customerName") && map.size >= 5) return { row: r, map };
  }
  return null;
}
const REQUIRED: Field[] = ["customerName", "saleDate", "bank", "branch"];
const FIELD_LABEL: Record<Field, string> = Object.fromEntries(
  Object.entries(FIELDS).map(([k, v]) => [k, v[0]]),
) as Record<Field, string>;

export async function loadWorkbook(buf: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

export function describeSheets(wb: ExcelJS.Workbook): SheetInfo[] {
  return wb.worksheets.map((ws) => {
    const h = findHeader(ws);
    if (!h) return { name: ws.name, rows: 0, recognized: false, missing: [] };
    let rows = 0;
    const nameCol = h.map.get("customerName")!;
    ws.eachRow((row, r) => { if (r > h.row && text(row.getCell(nameCol).value)) rows++; });
    return { name: ws.name, rows, recognized: true, missing: REQUIRED.filter((f) => !h.map.has(f)).map((f) => FIELD_LABEL[f]) };
  });
}

export function parseSheet(ws: ExcelJS.Worksheet, warnings: string[]): ParsedRow[] {
  const h = findHeader(ws);
  if (!h) return [];
  const get = (row: ExcelJS.Row, f: Field) => (h.map.has(f) ? row.getCell(h.map.get(f)!).value : null);
  type Draft = Omit<ParsedRow, "key"> & { ambSale: boolean; ambCol: boolean };
  const drafts: Draft[] = [];
  let badDates = 0, futureDates = 0;
  ws.eachRow((row, r) => {
    if (r <= h.row) return;
    const customerName = text(get(row, "customerName"));
    if (!customerName) return;
    const status = text(get(row, "status"));
    const collectedAt = date(get(row, "collectedAt"));
    let saleDate = date(get(row, "saleDate"));
    const ambSale = ambiguous(get(row, "saleDate"), saleDate), ambCol = ambiguous(get(row, "collectedAt"), collectedAt);
    if (!saleDate && raw(get(row, "saleDate")) != null) badDates++;
    // A sale can't happen in the future — that's a typo in the year (e.g. 2027).
    if (saleDate && +saleDate > Date.now() + 86400000) { saleDate = null; futureDates++; }
    const debit = number(get(row, "debit"));
    const salePrice = number(get(row, "salePrice"));
    const financeAmount = number(get(row, "financeAmount"));
    const downPaymentRemaining = number(get(row, "downPaymentRemaining"));
    const bank = canonBank(text(get(row, "bank")));
    const s = norm(status ?? "");
    const state = has(s, "مردود", "مرتجع") ? "Returned"
      : has(s, "تم التحصيل", "تم السداد", "تم التحصل") || collectedAt ? "Collected" : "Open";
    const fromParts = (financeAmount ?? 0) + (downPaymentRemaining ?? 0);
    const amountDue = debit ?? (fromParts || salePrice || 0);
    const pt = bank === "كاش" ? "Cash" : bank === "قسط" ? "Installment" : "Bank";
    const chassis = text(get(row, "chassis"));
    drafts.push({
      ambSale, ambCol, customerName, status, state, collectedAt, car: text(get(row, "car")), chassis,
      debit, salePrice, financeAmount, downPaymentRemaining, amountDue, saleDate,
      closingOfficer: text(get(row, "closingOfficer")), branch: text(get(row, "branch")), bank, paymentType: pt,
      salesman: text(get(row, "salesman")), remarks: text(get(row, "remarks")), sourceSheet: ws.name.trim(),
    });
  });
  const fixed = fixSwappedDates(drafts);
  if (fixed) warnings.push(`${ws.name.trim()}: ${fixed} تاريخ اتصلّح تلقائي (إكسيل كان قالب اليوم والشهر، زي 1/10 اتقرت 10 يناير)`);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip helper flags before saving
  const out: ParsedRow[] = drafts.map(({ ambSale: _a, ambCol: _b, ...r }) => ({
    ...r, key: [norm(r.customerName), r.chassis ?? "", r.saleDate?.toISOString().slice(0, 10) ?? ""].join("|"),
  }));
  if (futureDates) warnings.push(`${ws.name.trim()}: ${futureDates} صف تاريخ البيع فيه في المستقبل (غالبًا غلطة في السنة) — اتسجلوا من غير تاريخ`);
  if (badDates) warnings.push(`${ws.name.trim()}: ${badDates} صف تاريخ البيع فيه مش مفهوم (اتسجلوا من غير تاريخ)`);
  return out;
}

/** Parse the chosen sheets; the same deal appearing in several sheets is kept once (first sheet wins). */
export function parseWorkbook(wb: ExcelJS.Workbook, sheets: string[]) {
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  const rows: ParsedRow[] = [];
  let duplicates = 0;
  for (const name of sheets) {
    const ws = wb.worksheets.find((w) => w.name === name);
    if (!ws) continue;
    const perSheet = new Map<string, number>();
    for (const row of parseSheet(ws, warnings)) {
      // Same key twice inside ONE sheet = two real deals (e.g. two cars, no chassis) → suffix #n.
      const n = (perSheet.get(row.key) ?? 0) + 1;
      perSheet.set(row.key, n);
      const key = n > 1 ? `${row.key}#${n}` : row.key;
      if (seen.has(key)) { duplicates++; continue; }
      seen.set(key, rows.length);
      rows.push({ ...row, key });
    }
  }
  if (duplicates) warnings.push(`${duplicates} صف متكرر في أكتر من شيت — اتحسبوا مرة واحدة`);
  return { rows, warnings };
}
