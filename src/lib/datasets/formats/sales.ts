import type { Format, Rec } from "../types";
import { M, daysBetween, has, is, margin, n, total } from "../metrics";
import { top } from "../group";
import { int, money, pct } from "@/lib/format";
import { both, brandOf, f, fill } from "./util";

const loss = (r: Rec) => typeof r.profit === "number" && r.profit < 0;
const marginPct = (rs: Rec[], profit: string, revenue: string) => { const d = total(rs, revenue); return d ? (total(rs, profit) / d) * 100 : null; };

/** Installment invoices (قسط اكتوبر 2026.xlsx): price, cost, profit, down payment per car. */
export const installmentSales: Format = {
  id: "installment-sales",
  title: "مبيعات التقسيط (الفواتير)",
  description: "فواتير البيع بالتقسيط: سعر البيع، التكلفة، الربح، المقدم، الفرع والبياع.",
  group: "المبيعات",
  mode: "append",
  fields: [
    f("date", "التاريخ", "date", ["التاريخ", "تاريخ الفاتورة"], { past: true }),
    f("invoice", "رقم الفاتورة", "id", ["رقم الفاتوره", "رقم الفاتورة"]),
    f("customer", "العميل", "text", ["العميل", "اسم العميل"]),
    f("car", "العربية", "text", ["السياره", "العربية"]),
    f("brandRaw", "البراند", "text", ["البراند1", "البراند", "الماركة"]),
    f("model", "الموديل", "text", ["براند2"]),
    f("year", "سنة الموديل", "text", ["الموديل"]),
    f("chassis", "الشاسيه", "id", ["الشاسيه", "رقم الشاسيه"]),
    f("color", "اللون", "text", ["اللون"]),
    f("condition", "الحالة", "text", ["الحاله"]),
    f("price", "سعر البيع", "money", ["سعر البيع"]),
    f("cost", "التكلفة", "money", ["التكلفه", "التكلفة"]),
    f("profit", "الربح", "money", ["الربح"]),
    f("charges", "الأعباء", "money", ["الاعباء"]),
    f("down", "المقدم", "money", ["المقدم"]),
    f("financed", "الباقي بالتقسيط", "money"),
    f("downPct", "نسبة المقدم", "pct"),
    f("term", "شرط الدفع", "text", ["الشرط"]),
    f("branch", "الفرع", "text", ["الشركة", "الفرع"], { place: true }),
    f("team", "فريق المبيعات", "text", ["فريق المبيعات"]),
    f("salesman", "البياع", "text", ["مندوب المبيعات", "البياع"]),
    f("brand", "الماركة"),
  ],
  required: ["invoice", "price", "cost", "customer"],
  keep: (r) => has(r.invoice) || has(r.chassis),
  derive: (r) => {
    fill(r, "profit", () => (both(r.price, r.cost) ? n(r.price) - n(r.cost) : null));
    if (typeof r.price === "number" && typeof r.down === "number") { r.financed = r.price - r.down; r.downPct = r.price ? (r.down / r.price) * 100 : null; }
    if (typeof r.term === "string") r.term = r.term.replace(/^\[\d+\]\s*/, "");
    r.brand = brandOf(r.brandRaw, r.car);
  },
  key: (r) => String(r.invoice ?? `${r.chassis}|${r.date}`),
  dateField: "date",
  report: {
    summary: (rs) => {
      const m = marginPct(rs.filter((r) => typeof r.cost === "number"), "profit", "price"), b = top(rs, "brand"), s = top(rs, "salesman");
      return `اتباع ${int(rs.length)} عربية بالتقسيط بإيرادات ${money(total(rs, "price"))} وربح ${money(total(rs, "profit"))}` +
        (m != null ? ` (هامش ${pct(m)})` : "") + `. المقدمات ${money(total(rs, "down"))} والباقي على العملاء ${money(total(rs, "financed"))}.` +
        (b ? ` أكتر ماركة ${b.name} (${int(b.count)})` : "") + (s ? `، وأكتر بياع ${s.name} (${int(s.count)}).` : ".") +
        (rs.some(loss) ? ` ${int(rs.filter(loss).length)} عربية اتباعت بخسارة.` : "");
    },
    kpis: [
      { metric: M.count("العربيات المتباعة") },
      { metric: M.sum("price", "الإيرادات"), hint: (rs) => `متوسط العربية ${money(rs.length ? total(rs, "price") / rs.length : 0)}` },
      { metric: M.sum("profit", "الربح"), hint: (rs) => { const m = marginPct(rs, "profit", "price"); return m == null ? undefined : `هامش ${pct(m)}`; },
        tone: (v) => (v == null ? undefined : v >= 0 ? "good" : "bad") },
      { metric: M.sum("down", "المقدمات"), hint: (rs) => { const xs = rs.filter((r) => typeof r.downPct === "number"); return xs.length ? `متوسط المقدم ${pct(total(xs, "downPct") / xs.length)} من السعر` : undefined; } },
      { metric: M.sum("financed", "الباقي على العملاء (قسط)") },
      { metric: M.sum("charges", "الأعباء") },
      { metric: M.count("اتباعت بخسارة", loss), tone: (v) => (v ? "bad" : "good") },
    ],
    trends: [
      { title: "العربيات المتباعة", date: "date", metric: M.count("عربيات") },
      { title: "الربح", date: "date", metric: M.sum("profit", "الربح"), color: 2 },
    ],
    breakdowns: [
      { title: "حسب الفرع", by: "branch", metrics: [M.count("عربيات"), M.sum("price", "الإيرادات"), M.sum("profit", "الربح"), margin("الهامش", "profit", "price")] },
      { title: "حسب الماركة", by: "brand", metrics: [M.count("عربيات"), M.sum("price", "الإيرادات"), M.sum("profit", "الربح"), margin("الهامش", "profit", "price")] },
      { title: "حسب البياع", by: "salesman", metrics: [M.count("عربيات"), M.sum("price", "الإيرادات"), M.sum("profit", "الربح")] },
      { title: "حسب فريق المبيعات", by: "team", metrics: [M.count("عربيات"), M.sum("profit", "الربح")] },
      { title: "حسب شرط الدفع", by: "term", metrics: [M.count("عربيات"), M.avg("downPct", "متوسط المقدم", "pct")] },
    ],
    lists: [{ title: "عربيات اتباعت بخسارة", where: loss, sort: (a, b) => n(a.profit) - n(b.profit), columns: ["date", "invoice", "customer", "car", "branch", "price", "cost", "profit"] }],
    table: ["date", "invoice", "customer", "car", "brand", "chassis", "price", "cost", "profit", "down", "financed", "branch", "salesman"],
    filters: ["branch", "brand", "salesman"],
  },
};

const collected = (r: Rec) => r.state === "اتحصّل";
/** Bank-financed sales (مبيعات بنوك جديد.xlsx): price, cost, financing, bank commission, cashback, net profit. */
export const bankSales: Format = {
  id: "bank-sales",
  title: "مبيعات البنوك (التمويل والربح)",
  description: "مبيعات التمويل البنكي: المقدم، التمويل، عمولة البنك، الكاش باك، صافي الربح، واتحصّل ولا لسه.",
  group: "المبيعات",
  mode: "append",
  fields: [
    f("date", "تاريخ البيع", "date", ["تاريخ البيع"], { past: true }),
    f("customer", "العميل", "text", ["العميل", "اسم العميل"]),
    f("car", "العربية", "text", ["السياره"]),
    f("brandRaw", "البراند", "text", ["براند"]),
    f("chassis", "الشاسيه", "id", ["شاسيه", "الشاسيه"]),
    f("qr", "QR / الفاتورة", "id", ["QR"]),
    f("color", "اللون", "text", ["اللون"]),
    f("category", "الفئة", "text", ["فئة"]),
    f("year", "سنة الموديل", "text", ["موديل"]),
    f("condition", "الحالة", "text", ["الحالة"]),
    f("bank", "البنك", "text", ["بنك", "البنك"]),
    f("cost", "التكلفة", "money", ["تكلفه"]),
    f("price", "سعر البيع", "money", ["بيع"]),
    f("cashProfit", "ربح الكاش", "money", ["ربح كاش"]),
    f("down", "المقدم", "money", ["المقدم"]),
    f("finance", "التمويل", "money", ["التمويل"]),
    f("rate", "نسبة العمولة", "pct", ["نسبه"]),
    f("commission", "عمولة البنك", "money", ["عموله"]),
    f("cashback", "كاش باك", "money", ["كاش باك"]),
    f("compensation", "تعويضات", "money", ["تعويضات"]),
    f("revenue", "إجمالي الإيراد", "money", ["اجمالى الايراد"]),
    f("totalCost", "إجمالي التكلفة", "money", ["اجمالى التكلفه"]),
    f("netProfit", "صافي الربح", "money", ["صافى ربح", "صافى الربح"]),
    f("collectedRaw", "محصّل؟", "text", ["محصل"]),
    f("collectedAt", "تاريخ التحصيل", "date", ["تاريخ التحصيل"], { past: true }),
    f("licensedAt", "تاريخ الترخيص", "date", ["تاريخ الترخيص"], { past: true }),
    f("salesman", "البياع", "text", ["السيلز", "سيلز"]),
    f("branch", "الفرع", "text", ["فرع", "الفرع"], { place: true }),
    f("state", "التحصيل"),
    f("collectDays", "أيام التحصيل", "int"),
    f("brand", "الماركة"),
  ],
  required: ["bank", "price", "finance", "chassis"],
  keep: (r) => has(r.chassis) || has(r.customer),
  derive: (r) => {
    fill(r, "cashProfit", () => (both(r.price, r.cost) ? n(r.price) - n(r.cost) : null));
    fill(r, "finance", () => (both(r.price, r.down) ? n(r.price) - n(r.down) : null));
    if (typeof r.rate === "number" && Math.abs(r.rate) <= 1) r.rate = r.rate * 100;
    fill(r, "commission", () => (both(r.finance, r.rate) ? (n(r.finance) * n(r.rate)) / 100 : null));
    fill(r, "revenue", () => (typeof r.price === "number" ? r.price + n(r.commission) : null));
    fill(r, "totalCost", () => (typeof r.cost === "number" ? r.cost + n(r.cashback) + n(r.compensation) : null));
    fill(r, "netProfit", () => (both(r.revenue, r.totalCost) ? n(r.revenue) - n(r.totalCost) : null));
    r.state = is(r.collectedRaw, "تم") || r.collectedAt ? "اتحصّل" : "لسه";
    r.collectDays = r.collectedAt ? daysBetween(r.date, r.collectedAt) : null;
    r.brand = brandOf(r.brandRaw, r.car);
  },
  key: (r) => `${r.chassis ?? ""}|${r.date ?? ""}|${r.customer ?? ""}`,
  dateField: "date",
  report: {
    summary: (rs) => {
      const open = rs.filter((r) => !collected(r)), m = marginPct(rs, "netProfit", "price"), b = top(rs, "bank");
      return `اتباع ${int(rs.length)} عربية بالتمويل البنكي بقيمة ${money(total(rs, "price"))}، صافي الربح ${money(total(rs, "netProfit"))}` +
        (m != null ? ` (${pct(m)})` : "") + ` منه عمولات بنوك ${money(total(rs, "commission"))}.` +
        (b ? ` أكتر بنك ${b.name} (${int(b.count)} عربية).` : "") +
        (open.length ? ` لسه ${int(open.length)} عربية تمويلها متحصّلش بإجمالي ${money(total(open, "finance"))}.` : " كله اتحصّل.");
    },
    kpis: [
      { metric: M.count("العربيات") },
      { metric: M.sum("price", "قيمة المبيعات") },
      { metric: M.sum("netProfit", "صافي الربح"), hint: (rs) => `ربح الكاش ${money(total(rs, "cashProfit"))}`, tone: (v) => (v == null ? undefined : v >= 0 ? "good" : "bad") },
      { metric: M.sum("commission", "عمولات البنوك"), hint: (rs) => `كاش باك ${money(total(rs, "cashback"))}` },
      { metric: M.sum("finance", "إجمالي التمويل") },
      { metric: M.sum("finance", "تمويل لسه متحصّلش", "money", (r) => !collected(r)), hint: (rs) => `${int(rs.filter((r) => !collected(r)).length)} عربية`, tone: (v) => (v ? "bad" : "good") },
      { metric: M.avg("collectDays", "متوسط أيام التحصيل", "days", (r) => n(r.collectDays) >= 0) },
    ],
    trends: [
      { title: "العربيات المتباعة", date: "date", metric: M.count("عربيات") },
      { title: "صافي الربح", date: "date", metric: M.sum("netProfit", "صافي الربح"), color: 2 },
    ],
    breakdowns: [
      { title: "حسب البنك", by: "bank", metrics: [M.count("عربيات"), M.sum("finance", "التمويل"), M.sum("commission", "العمولة"), M.sum("netProfit", "صافي الربح"), M.sum("finance", "لسه متحصّل", "money", (r) => !collected(r))] },
      { title: "حسب الفرع", by: "branch", metrics: [M.count("عربيات"), M.sum("price", "المبيعات"), M.sum("netProfit", "صافي الربح"), margin("الهامش", "netProfit", "price")] },
      { title: "حسب البياع", by: "salesman", metrics: [M.count("عربيات"), M.sum("netProfit", "صافي الربح")], top: 25 },
      { title: "حسب الماركة", by: "brand", metrics: [M.count("عربيات"), M.sum("netProfit", "صافي الربح"), margin("الهامش", "netProfit", "price")] },
    ],
    lists: [{
      title: "تمويل لسه متحصّلش", where: (r) => !collected(r), sort: (a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")),
      columns: ["date", "customer", "car", "bank", "finance", "branch", "salesman"], limit: 300,
    }],
    table: ["date", "customer", "car", "brand", "chassis", "bank", "price", "cost", "down", "finance", "commission", "cashback", "netProfit", "state", "branch", "salesman"],
    filters: ["bank", "branch", "brand", "state"],
  },
};

const installment = (r: Rec) => r.payType === "قسط";
/** Used-car sales (مستعمل 1-10.xlsx): purchase, maintenance, cash price and the installment plan. */
export const usedSales: Format = {
  id: "used-sales",
  title: "مبيعات المستعمل",
  description: "بيع العربيات المستعملة: اتشرت بكام، الصيانة، اتباعت بكام، ربح الكاش والتقسيط، والباقي على العميل.",
  group: "المبيعات",
  mode: "append",
  fields: [
    f("soldAt", "تاريخ البيع", "date", ["تاريخ بيع", "تاريخ البيع"], { past: true }),
    f("chassis", "الشاسيه", "id", ["شاسيه"]),
    f("car", "العربية", "text", ["السياره"]),
    f("category", "الفئة", "text", ["فئة"]),
    f("year", "سنة الموديل", "text", ["موديل"]),
    f("color", "اللون", "text", ["اللون"]),
    f("customer", "العميل", "text", ["العميل"]),
    f("buyer", "المشتري (اللي اشترى العربية)", "text", ["مشترى", "المشترى"]),
    f("supplier", "اتشرت من", "text", ["المورد"]),
    f("boughtAt", "تاريخ الشراء", "date", ["تاريخ شراء", "تاريخ الشراء"], { past: true }),
    f("purchase", "سعر الشراء", "money", ["شراء"]),
    f("maintenance", "الصيانة", "money", ["صيانة", "صيانه"]),
    f("cost", "التكلفة", "money", ["تكلفه"]),
    f("cash", "سعر الكاش", "money", ["كاش"]),
    f("cashProfit", "ربح الكاش", "money", ["ربح كاش"]),
    f("paid", "المدفوع", "money", ["المدفوع"]),
    f("remaining", "الباقي", "money", ["الباقى"]),
    f("interest", "الفوايد", "money", ["فوائد"]),
    f("debt", "باقي الدين", "money", ["باقى الدين"]),
    f("term", "مدة القسط", "text", ["مده قسط", "مدة القسط"]),
    f("instTotal", "الإجمالي بالقسط", "money", ["بالقسط"]),
    f("instProfit", "ربح التقسيط", "money", ["ربح بالقسط"]),
    f("payType", "طريقة الدفع"),
    f("stockDays", "قعدت في المعرض (يوم)", "int"),
    f("brand", "الماركة"),
  ],
  required: ["chassis", "boughtAt", "soldAt", "cash"],
  keep: (r) => has(r.chassis) || has(r.car),
  derive: (r) => {
    fill(r, "cost", () => (typeof r.purchase === "number" ? r.purchase + n(r.maintenance) : null));
    fill(r, "cashProfit", () => (both(r.cash, r.cost) ? n(r.cash) - n(r.cost) : null));
    fill(r, "remaining", () => (both(r.cash, r.paid) ? n(r.cash) - n(r.paid) : null));
    fill(r, "debt", () => (typeof r.remaining === "number" ? r.remaining + n(r.interest) : null));
    fill(r, "instTotal", () => (typeof r.paid === "number" ? r.paid + n(r.debt) : null));
    fill(r, "instProfit", () => (both(r.instTotal, r.cost) ? n(r.instTotal) - n(r.cost) : null));
    r.payType = is(r.term, "كاش") || (!n(r.interest) && !n(r.debt)) ? "كاش" : "قسط";
    r.stockDays = daysBetween(r.boughtAt, r.soldAt);
    r.brand = brandOf(r.car);
  },
  key: (r) => `${r.chassis ?? ""}|${r.soldAt ?? ""}`,
  dateField: "soldAt",
  report: {
    summary: (rs) => {
      const m = marginPct(rs, "cashProfit", "cash"), inst = rs.filter(installment);
      const days = rs.filter((r) => typeof r.stockDays === "number");
      return `اتباع ${int(rs.length)} عربية مستعملة بقيمة كاش ${money(total(rs, "cash"))} وربح كاش ${money(total(rs, "cashProfit"))}` +
        (m != null ? ` (${pct(m)})` : "") + `.` +
        (inst.length ? ` ${int(inst.length)} منهم بالتقسيط: ربح التقسيط ${money(total(inst, "instProfit"))} والباقي على العملاء ${money(total(inst, "debt"))}.` : "") +
        (days.length ? ` العربية بتقعد في المتوسط ${int(Math.round(total(days, "stockDays") / days.length))} يوم قبل ما تتباع.` : "");
    },
    kpis: [
      { metric: M.count("العربيات المتباعة") },
      { metric: M.sum("cash", "قيمة البيع (كاش)") },
      { metric: M.sum("cashProfit", "ربح الكاش"), hint: (rs) => { const m = marginPct(rs, "cashProfit", "cash"); return m == null ? undefined : `هامش ${pct(m)}`; } },
      { metric: M.sum("instProfit", "ربح التقسيط", "money", installment), hint: (rs) => `${int(rs.filter(installment).length)} عربية بالقسط` },
      { metric: M.sum("debt", "الباقي على العملاء"), tone: (v) => (v ? "bad" : undefined) },
      { metric: M.avg("stockDays", "متوسط أيام البيع", "days", (r) => n(r.stockDays) >= 0) },
    ],
    trends: [{ title: "العربيات المتباعة", date: "soldAt", metric: M.count("عربيات") }],
    breakdowns: [
      { title: "حسب المشتري", by: "buyer", metrics: [M.count("عربيات"), M.sum("cashProfit", "ربح الكاش"), M.avg("stockDays", "متوسط أيام البيع", "days")] },
      { title: "حسب الماركة", by: "brand", metrics: [M.count("عربيات"), M.sum("cash", "البيع"), M.sum("cashProfit", "ربح الكاش")] },
      { title: "كاش ولا قسط", by: "payType", metrics: [M.count("عربيات"), M.sum("debt", "الباقي"), M.sum("instProfit", "ربح التقسيط")] },
    ],
    table: ["soldAt", "chassis", "car", "year", "customer", "buyer", "supplier", "boughtAt", "stockDays", "cost", "cash", "cashProfit", "paid", "debt", "term", "instProfit"],
    filters: ["buyer", "brand", "payType"],
  },
};

/** Odoo contacts export (TEST465.xlsx). */
export const contacts: Format = {
  id: "contacts",
  title: "جهات الاتصال (العملاء والموردين)",
  description: "تصدير جهات الاتصال من أودو: الاسم، التليفون، الإيميل، المدينة، الشركة والمندوب.",
  group: "أخرى",
  mode: "snapshot",
  fields: [
    f("name", "الاسم", "text", ["اسم العرض", "الاسم"]),
    f("phone", "التليفون", "id", ["رقم الهاتف", "الهاتف", "الموبايل", "الجوال"]),
    f("email", "الإيميل", "id", ["البريد الإلكتروني", "البريد الالكتروني", "الايميل"]),
    f("city", "المدينة", "text", ["المدينة"]),
    f("country", "الدولة", "text", ["الدولة"]),
    f("company", "الشركة", "text", ["الشركة"]),
    f("salesman", "مندوب المبيعات", "text", ["مندوب المبيعات"]),
    f("activities", "الأنشطة", "text", ["الأنشطة"]),
  ],
  required: ["name", "email", "phone"],
  keep: (r) => has(r.name),
  report: {
    summary: (rs) => `${int(rs.length)} جهة اتصال: ${int(rs.filter((r) => has(r.phone)).length)} ليهم تليفون و${int(rs.filter((r) => has(r.salesman)).length)} ليهم مندوب مبيعات.`,
    kpis: [
      { metric: M.count("جهات الاتصال") },
      { metric: M.count("ليهم تليفون", (r) => has(r.phone)), hint: (rs) => pct(rs.length ? (rs.filter((r) => has(r.phone)).length / rs.length) * 100 : 0) },
      { metric: M.count("ليهم إيميل", (r) => has(r.email)) },
      { metric: M.count("ليهم مندوب", (r) => has(r.salesman)) },
      { metric: M.distinct("company", "عدد الشركات") },
    ],
    breakdowns: [
      { title: "حسب الشركة", by: "company", metrics: [M.count("جهات اتصال")] },
      { title: "حسب المندوب", by: "salesman", metrics: [M.count("جهات اتصال")] },
      { title: "حسب المدينة", by: "city", metrics: [M.count("جهات اتصال")], top: 15 },
    ],
    table: ["name", "phone", "email", "city", "company", "salesman"],
    filters: ["company", "salesman"],
  },
};

export const SALES_FORMATS = [installmentSales, bankSales, usedSales, contacts];
