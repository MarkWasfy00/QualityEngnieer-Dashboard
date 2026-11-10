import type ExcelJS from "exceljs";
import type { Ctx, Format, Rec } from "../types";
import { M, n, total } from "../metrics";
import { int, money, pct } from "@/lib/format";
import { date, hkey, number, raw, text } from "../cells";
import { MONTHS, f } from "./util";

const CLAIM = "مطالبة", PAYMENT = "دفعة";
const claim = (r: Rec) => r.kind === CLAIM, pay = (r: Rec) => r.kind === PAYMENT;
const pending = (r: Rec) => pay(r) && r.done === "لا";
const received = (rs: Rec[]) => total(rs.filter(claim), "receivedTotal");
const paid = (rs: Rec[]) => total(rs.filter(pay), "amount");
/** What we paid the company minus the value of cars we received from it (positive = they owe us cars). */
const balance = (rs: Rec[]) => paid(rs) - received(rs);

const rowTexts = (row: ExcelJS.Row) => {
  const m = new Map<string, number>();
  row.eachCell((c, col) => { const k = hkey(raw(c.value)); if (k && !m.has(k)) m.set(k, col); });
  return m;
};

/**
 * Car-company claims workbook (شركات يوم 10-11.xlsx): one sheet per company.
 *  1) claims table: الشهر | نوع السياره | عدد | السعر | الاجمالي | تاريخ الاستلام | شاسيه | (اللون) | عدد | السعر | اجمالى المستلم | تاريخ | المتبقى | سعر | الاجمالى
 *  2) payments table: المبلغ | تاريخ الاستحقاق | تم / لا | تاريخ السحب
 *  3) a few total lines (ignored — recomputed from the rows).
 * Labels repeat ("عدد", "الاجمالى"), so claim columns are read by position from "الشهر".
 */
function parseClaims(ws: ExcelJS.Worksheet, ctx: Ctx): Rec[] | null {
  let c0 = 0, start = 0;
  for (let r = 1; r <= Math.min(15, ws.rowCount) && !c0; r++) {
    const m = rowTexts(ws.getRow(r));
    const month = m.get(hkey("الشهر"));
    if (month && m.get(hkey("نوع السياره")) === month + 1 && m.get(hkey("شاسيه")) === month + 6 && m.get(hkey("المتبقى")) === month + 12) { c0 = month; start = r; }
  }
  if (!c0) return null;
  const supplier = ctx.sheet.trim();
  const out: Rec[] = [];
  let pay: { amount: number; due: number; done: number; drawn: number } | null = null;
  for (let r = start + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;
    const cell = (c: number) => row.getCell(c).value;
    const labels = rowTexts(row);
    if (labels.has(hkey("المبلغ")) && (labels.has(hkey("تم / لا")) || labels.has(hkey("تاريخ الاستحقاق")))) {
      const at = (k: string) => labels.get(hkey(k)) ?? 0;
      pay = { amount: at("المبلغ"), due: at("تاريخ الاستحقاق"), done: at("تم / لا"), drawn: at("تاريخ السحب") };
      continue;
    }
    if (pay) {
      const amount = number(cell(pay.amount));
      const first = text(cell(pay.amount));
      // "اجمالى الشيكات…" ends the payments table; everything below it is summary lines.
      if (first && amount == null && /^(ال)?(اجمال|رصيد|الرصيد|الفرق)/.test(hkey(first))) break;
      if (amount == null || amount === 0) continue;
      const dueCell = pay.due ? cell(pay.due) : null;
      const due = date(dueCell);
      const doneText = pay.done ? text(cell(pay.done)) : null;
      if (!doneText && dueCell == null) continue; // a bare number under the table = its total
      out.push({
        kind: PAYMENT, supplier, amount, payDue: due, payNote: due ? null : text(dueCell),
        done: doneText ? (hkey(doneText).startsWith("تم") ? "تم" : "لا") : null,
        drawnAt: pay.drawn ? date(cell(pay.drawn)) : null,
      });
      continue;
    }
    const car = text(cell(c0 + 1));
    const qty = number(cell(c0 + 2));
    const price = number(cell(c0 + 3));
    // Skip blank lines, totals and the company-name banner above the payments table.
    if (!car || /^(ال)?اجمال/.test(hkey(car)) || (qty == null && price == null)) continue;
    const chassis = text(cell(c0 + 6));
    const rec: Rec = {
      kind: CLAIM, supplier, month: text(cell(c0)), car, qty: qty ?? 1, price,
      total: number(cell(c0 + 4)), dueDate: date(cell(c0 + 5)), chassis,
      color: number(cell(c0 + 7)) == null ? text(cell(c0 + 7)) : null,
      receivedQty: number(cell(c0 + 8)), receivedTotal: number(cell(c0 + 10)), receivedAt: date(cell(c0 + 11)),
      remainingQty: number(cell(c0 + 12)), remainingTotal: number(cell(c0 + 14)),
    };
    const q = n(rec.qty), p = n(price);
    if (rec.total == null) rec.total = q * p;
    if (rec.receivedQty == null) rec.receivedQty = chassis ? q : 0;
    if (rec.receivedTotal == null) rec.receivedTotal = n(rec.receivedQty) * (number(cell(c0 + 9)) ?? p);
    if (rec.remainingQty == null) rec.remainingQty = q - n(rec.receivedQty);
    if (rec.remainingTotal == null) rec.remainingTotal = n(rec.remainingQty) * (number(cell(c0 + 13)) ?? p);
    rec.status = n(rec.remainingQty) > 0 ? "لسه متستلمتش" : "اتستلمت";
    out.push(rec);
  }
  return out;
}

export const supplierClaims: Format = {
  id: "supplier-claims",
  title: "مطالبات الشركات (الموردين)",
  description: "شيت الشركات: العربيات اللي طلبناها من كل شركة، اللي اتستلم واللي لسه، والشيكات المدفوعة — والرصيد عند كل شركة.",
  group: "الموردين",
  mode: "snapshot",
  fields: [
    f("kind", "النوع"),
    f("supplier", "الشركة"),
    f("month", "الشهر"),
    f("car", "العربية"),
    f("chassis", "الشاسيه", "id"),
    f("color", "اللون"),
    f("qty", "المطلوب", "int"),
    f("price", "السعر", "money"),
    f("total", "قيمة المطالبة", "money"),
    f("dueDate", "ميعاد الاستلام", "date"),
    f("receivedQty", "اتستلم", "int"),
    f("receivedTotal", "قيمة المستلم", "money"),
    f("receivedAt", "تاريخ الاستلام", "date"),
    f("remainingQty", "المتبقي", "int"),
    f("remainingTotal", "قيمة المتبقي", "money"),
    f("status", "حالة العربية"),
    f("amount", "مبلغ الشيك / الدفعة", "money"),
    f("payDue", "تاريخ الاستحقاق", "date"),
    f("payNote", "بيان", "text"),
    f("done", "اتسحب؟"),
    f("drawnAt", "تاريخ السحب", "date"),
  ],
  parse: parseClaims,
  report: {
    summary: (rs) => {
      const c = rs.filter(claim), b = balance(rs), rem = total(c, "remainingTotal");
      return `طلبنا ${int(total(c, "qty"))} عربية بقيمة ${money(total(c, "total"))} من ${int(new Set(c.map((r) => r.supplier)).size)} شركة. ` +
        `اتستلم ${int(total(c, "receivedQty"))} عربية بقيمة ${money(received(rs))}، ولسه ${int(total(c, "remainingQty"))} عربية بقيمة ${money(rem)}. ` +
        `دفعنا ${money(paid(rs))} (منها ${money(total(rs.filter(pending), "amount"))} شيكات لسه متسحبتش)، يعني الرصيد عند الشركات ${money(b)}` +
        (b - rem ? `، والفرق ${b - rem > 0 ? "لينا" : "علينا"} ${money(Math.abs(b - rem))} بعد خصم العربيات اللي لسه.` : ".");
    },
    kpis: [
      { metric: M.sum("total", "قيمة المطالبات", "money", claim), hint: (rs) => `${int(total(rs.filter(claim), "qty"))} عربية` },
      { metric: M.custom("قيمة المستلم", "money", received), hint: (rs) => { const c = rs.filter(claim); const q = total(c, "qty"); return `${int(total(c, "receivedQty"))} عربية · ${pct(q ? (total(c, "receivedQty") / q) * 100 : 0)}`; } },
      { metric: M.sum("remainingTotal", "قيمة اللي لسه متستلمش", "money", claim), hint: (rs) => `${int(total(rs.filter(claim), "remainingQty"))} عربية`, tone: (v) => (v ? "bad" : "good") },
      { metric: M.custom("المدفوع للشركات", "money", paid), hint: (rs) => `منها ${money(total(rs.filter(pending), "amount"))} لسه متسحبتش` },
      { metric: M.custom("الرصيد عند الشركات", "money", balance), hint: () => "المدفوع − قيمة المستلم" },
      { metric: M.custom("الفرق بعد العربيات اللي لسه", "money", (rs) => balance(rs) - total(rs.filter(claim), "remainingTotal")), hint: () => "موجب = لينا فلوس عند الشركة",
        tone: (v) => (v == null ? undefined : v >= 0 ? "good" : "bad") },
    ],
    breakdowns: [
      {
        title: "حسب الشركة", by: "supplier", chart: 5, sort: 1,
        metrics: [
          M.sum("qty", "مطلوب", "int", claim), M.sum("total", "قيمة المطالبة", "money", claim), M.custom("المستلم", "money", received),
          M.sum("remainingQty", "لسه (عربية)", "int", claim), M.sum("remainingTotal", "قيمة اللي لسه", "money", claim),
          M.custom("الرصيد عندهم", "money", balance), M.custom("المدفوع", "money", paid),
        ],
      },
      { title: "المطالبات حسب الشهر", by: "month", where: claim, order: MONTHS, metrics: [M.sum("qty", "مطلوب", "int"), M.sum("receivedQty", "اتستلم", "int"), M.sum("remainingQty", "لسه", "int")] },
      { title: "العربيات اللي لسه متستلمتش (حسب الموديل)", by: "car", where: (r) => claim(r) && n(r.remainingQty) > 0, metrics: [M.sum("remainingQty", "عربيات", "int"), M.sum("remainingTotal", "القيمة")], top: 15 },
    ],
    lists: [
      { title: "عربيات لسه متستلمتش", where: (r) => claim(r) && n(r.remainingQty) > 0, columns: ["supplier", "month", "car", "remainingQty", "price", "remainingTotal", "dueDate"] },
      { title: "شيكات لسه متسحبتش", where: pending, sort: (a, b) => String(a.payDue ?? "").localeCompare(String(b.payDue ?? "")), columns: ["supplier", "amount", "payDue", "payNote"] },
    ],
    table: ["kind", "supplier", "month", "car", "chassis", "qty", "total", "receivedQty", "receivedTotal", "remainingQty", "remainingTotal", "amount", "payDue", "done"],
    filters: ["supplier", "kind"],
  },
};

export const SUPPLIER_FORMATS = [supplierClaims];
