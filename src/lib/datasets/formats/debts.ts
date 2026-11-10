import type ExcelJS from "exceljs";
import type { Format, Rec } from "../types";
import { M, daysSince, has, is, n, total } from "../metrics";
import { top } from "../group";
import { int, money, pct } from "@/lib/format";
import { date, hkey, number, raw, text } from "../cells";
import { AGE_ORDER, ageBucket, f, fill } from "./util";

const byAmount = (k: string) => (a: Rec, b: Rec) => n(b[k]) - n(a[k]);

/** Branch debts sheet (مديونيه دمنهور.xlsx): customer, cash price, paid, remaining — grouped by type (قسط / بنك / …). */
export const branchDebts: Format = {
  id: "branch-debts",
  title: "مديونية عملاء الفرع",
  description: "شيت المديونية: اسم العميل، العربية، سعر الكاش، المقدم، المدفوع، والباقي عليه.",
  group: "المديونيات",
  mode: "snapshot",
  fields: [
    f("customer", "العميل", "text", ["اسم العميل"]),
    f("type", "النوع", "text", ["حاله السياره", "حالة السيارة", "نوع البيع"]),
    f("car", "العربية", "text", ["نوع السياره", "السياره"]),
    f("date", "تاريخ البيع", "date", ["تاريخ البيع"], { past: true }),
    f("chassis", "الشاسيه", "id", ["شاسيه", "الشاسيه"]),
    f("salesman", "البياع", "text", ["اسم البائع", "البائع"]),
    f("price", "سعر الكاش", "money", ["سعر الكاش", "سعر البيع"]),
    f("down", "المقدم", "money", ["المقدم"]),
    f("paid", "المدفوع", "money", ["المدفوع"]),
    f("remaining", "الباقي", "money", ["الباقى", "المتبقى"]),
    f("notes", "ملاحظات", "text", ["ملاحظات"]),
  ],
  required: ["customer", "price", "paid", "remaining"],
  // Template rows (type only) and name-only rows aren't debts.
  keep: (r) => has(r.customer) && (has(r.car) || !!n(r.price) || !!n(r.paid) || !!n(r.remaining)),
  derive: (r) => { fill(r, "remaining", () => (typeof r.price === "number" ? r.price - n(r.paid) : null)); },
  dateField: "date",
  report: {
    summary: (rs) => {
      const t = top(rs.filter((r) => n(r.remaining) > 0), "type");
      return `${int(rs.length)} عميل عليهم ${money(total(rs, "remaining"))} من أصل ${money(total(rs, "price"))} (اتدفع ${pct(total(rs, "price") ? (total(rs, "paid") / total(rs, "price")) * 100 : 0)}).` +
        (t ? ` أغلب المديونية ${t.name}.` : "");
    },
    kpis: [
      { metric: M.count("العملاء") },
      { metric: M.sum("remaining", "الباقي على العملاء"), tone: (v) => (v ? "bad" : "good") },
      { metric: M.sum("price", "إجمالي سعر الكاش") },
      { metric: M.sum("paid", "المدفوع") },
      { metric: M.ratio("نسبة المدفوع", (rs) => total(rs, "paid"), (rs) => total(rs, "price")) },
    ],
    breakdowns: [
      { title: "حسب النوع", by: "type", metrics: [M.sum("remaining", "الباقي"), M.count("عملاء"), M.sum("paid", "المدفوع")] },
      { title: "حسب البياع", by: "salesman", metrics: [M.sum("remaining", "الباقي"), M.count("عملاء")] },
    ],
    lists: [{ title: "أكبر المديونيات", where: (r) => n(r.remaining) > 0, sort: byAmount("remaining"), columns: ["customer", "car", "type", "date", "price", "paid", "remaining", "salesman", "notes"] }],
    table: ["customer", "type", "car", "date", "chassis", "salesman", "price", "down", "paid", "remaining", "notes"],
    filters: ["type", "salesman"],
  },
};

const SIDES = new Set(["مدين", "دائن"].map(hkey));
/**
 * Customer balances with no header row (مديونيه عملاء كوم حماده.xlsx):
 * name | customer type | description | date | مدين/دائن | amount. Found by the مدين/دائن column.
 */
function parseBalances(ws: ExcelJS.Worksheet): Rec[] | null {
  const hits = new Map<number, number>();
  let rowsWithData = 0;
  ws.eachRow((row) => {
    let any = false;
    row.eachCell((c, col) => { any = true; if (SIDES.has(hkey(raw(c.value)))) hits.set(col, (hits.get(col) ?? 0) + 1); });
    if (any) rowsWithData++;
  });
  const [side, count] = [...hits.entries()].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];
  if (side < 5 || count < 3 || count < rowsWithData * 0.6) return null;
  const out: Rec[] = [];
  ws.eachRow((row) => {
    const s = text(row.getCell(side).value);
    const amount = number(row.getCell(side + 1).value);
    const customer = text(row.getCell(side - 4).value);
    if (!s || !SIDES.has(hkey(s)) || amount == null || !customer) return;
    out.push({
      customer, type: text(row.getCell(side - 3).value), description: text(row.getCell(side - 2).value),
      date: date(row.getCell(side - 1).value, true), side: s, amount,
    });
  });
  return out;
}

const isAdvance = (r: Rec) => is(r.description, "سلف", "امانه", "مصاريف", "مخالفات", "قضايا");
export const customerBalances: Format = {
  id: "customer-balances",
  title: "أرصدة العملاء (تجار ومحليين وقسط)",
  description: "كشف أرصدة العملاء: الاسم، نوع العميل، البيان، التاريخ، مدين/دائن والمبلغ.",
  group: "المديونيات",
  mode: "snapshot",
  fields: [
    f("customer", "العميل"),
    f("type", "نوع العميل"),
    f("description", "البيان"),
    f("category", "نوع المديونية"),
    f("date", "التاريخ", "date"),
    f("age", "عمرها (يوم)", "int"),
    f("bucket", "عمر المديونية"),
    f("side", "مدين / دائن"),
    f("amount", "المبلغ", "money"),
    f("balance", "الرصيد (عليه +)", "money"),
  ],
  parse: (ws) => parseBalances(ws),
  derive: (r) => {
    r.balance = is(r.side, "دائن") ? -n(r.amount) : n(r.amount);
    r.age = daysSince(r.date);
    r.bucket = ageBucket(typeof r.age === "number" ? r.age : null);
    r.category = isAdvance(r) ? "سلف ومصاريف" : "عربيات";
  },
  dateField: "date",
  report: {
    summary: (rs) => {
      const old = rs.filter((r) => n(r.age) > 90), t = top(rs, "type");
      return `${int(new Set(rs.map((r) => r.customer)).size)} عميل عليهم ${money(total(rs, "balance"))}.` +
        (t ? ` أغلبهم ${t.name} (${int(t.count)}).` : "") +
        (old.length ? ` ${money(total(old, "balance"))} منها عدّى عليها أكتر من 90 يوم.` : "");
    },
    kpis: [
      { metric: M.distinct("customer", "العملاء") },
      { metric: M.sum("balance", "إجمالي المديونية"), tone: (v) => (v ? "bad" : "good") },
      { metric: M.sum("balance", "سلف ومصاريف", "money", isAdvance) },
      { metric: M.sum("balance", "أقدم من 90 يوم", "money", (r) => n(r.age) > 90), tone: (v) => (v ? "bad" : "good") },
      { metric: M.avg("age", "متوسط عمر المديونية", "days") },
    ],
    breakdowns: [
      { title: "حسب نوع العميل", by: "type", metrics: [M.sum("balance", "المديونية"), M.count("عملاء")] },
      { title: "حسب عمر المديونية", by: "bucket", order: AGE_ORDER, metrics: [M.sum("balance", "المديونية"), M.count("عملاء")] },
      { title: "عربيات ولا سلف", by: "category", metrics: [M.sum("balance", "المديونية"), M.count("عملاء")] },
    ],
    lists: [{ title: "أكبر المديونيات", where: (r) => n(r.balance) > 0, sort: byAmount("balance"), columns: ["customer", "type", "description", "date", "age", "balance"] }],
    table: ["customer", "type", "description", "date", "age", "side", "amount"],
    filters: ["type", "category", "bucket"],
  },
};

export const DEBT_FORMATS = [branchDebts, customerBalances];
