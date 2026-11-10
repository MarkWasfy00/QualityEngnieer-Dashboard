import type { Format, Rec } from "../types";
import { M, daysBetween, daysSince, has, is, n, total } from "../metrics";
import { top } from "../group";
import { int, money, pct } from "@/lib/format";
import { cleanPlace } from "../cells";
import { ADJUST, DELIVERY, INTERNAL, RECEIPT, brandOf, eq, f, moveType, warehouseSide } from "./util";

const byDays = (k: string) => (a: Rec, b: Rec) => n(b[k]) - n(a[k]);

/** "stock 9-11-2026.xlsx": one sheet per brand, header on row 3 (رقم الشاسيه، اسم الصنف، المخزن …). */
export const stockByBrand: Format = {
  id: "stock-brands",
  title: "المخزون حسب الماركة",
  description: "شيت المخزون اللي فيه شيت لكل ماركة: رقم الشاسيه، الصنف، المخزن، اللون، الموديل.",
  group: "المخزون",
  mode: "snapshot",
  fields: [
    f("chassis", "رقم الشاسيه", "id", ["رقم الشاسيه", "الشاسيه"]),
    f("item", "الصنف", "text", ["اسم الصنف", "الصنف"]),
    f("group", "المجموعة الرئيسية", "text", ["المجموعة الرئيسية"]),
    f("model", "الموديل (الفئة)", "text", ["المجموعة الفرعية"]),
    f("warehouse", "المخزن", "text", ["المخزن"], { place: true }),
    f("color", "اللون", "text", ["اللون"]),
    f("trim", "لون الفرش", "text", ["لون الفرش"]),
    f("year", "سنة الموديل", "text", ["الموديل", "سنة الموديل"]),
    f("condition", "الحالة", "text", ["الحالة"]),
    f("papers", "الورق", "text", ["الورق"]),
    f("lastMove", "تاريخ آخر عملية", "date", ["تاريخ اخر عملية", "تاريخ آخر حركة"], { past: true }),
    f("brand", "الماركة"),
    f("sheet", "الشيت"),
  ],
  required: ["chassis", "item", "warehouse"],
  keep: (r) => has(r.chassis) || has(r.item),
  derive: (r, ctx) => { r.sheet = ctx.sheet.trim(); r.brand = brandOf(r.item, r.group, ctx.sheet); },
  report: {
    summary: (rs) => {
      const b = top(rs, "brand"), w = top(rs, "warehouse", true);
      return `في المخزن ${int(rs.length)} عربية من ${int(new Set(rs.map((r) => r.brand)).size)} ماركة.` +
        (b ? ` أكتر ماركة ${b.name} (${int(b.count)} عربية · ${pct(b.share)})` : "") +
        (w ? `، وأكبر مخزن ${w.name} (${int(w.count)} عربية).` : ".");
    },
    kpis: [
      { metric: M.count("العربيات في المخزن") },
      { metric: M.distinct("brand", "عدد الماركات") },
      { metric: M.distinct("model", "عدد الموديلات") },
      { metric: M.custom("عدد المخازن", "int", (rs) => new Set(rs.map((r) => r.warehouse && cleanPlace(String(r.warehouse)))).size) },
      { metric: M.count("عليها ملاحظة في الورق", (r) => has(r.papers)), hint: () => "زي «أمانة لدينا»" },
    ],
    breakdowns: [
      { title: "العربيات حسب الماركة", by: "brand", metrics: [M.count("عربيات")] },
      { title: "العربيات حسب المخزن", by: "warehouse", metrics: [M.count("عربيات")] },
      { title: "أكتر الموديلات", by: "model", metrics: [M.count("عربيات")], top: 15 },
      { title: "حسب سنة الموديل", by: "year", metrics: [M.count("عربيات")] },
      { title: "حسب اللون", by: "color", metrics: [M.count("عربيات")], top: 12 },
      { title: "حسب الحالة", by: "condition", metrics: [M.count("عربيات")] },
    ],
    table: ["chassis", "item", "brand", "model", "warehouse", "color", "trim", "year", "condition", "papers"],
    filters: ["brand", "warehouse", "year"],
  },
};

const available = (r: Rec) => is(r.status, "متاح") || eq(r.odooGroup, "available");
const sold = (r: Rec) => is(r.status, "مباع", "تم التسليم") || eq(r.odooGroup, "delivered") || eq(r.odooGroup, "invoiced");

/** Odoo lots/serials export (test.xlsx): one row per chassis with its status, warehouse, value and dates. */
export const odooCars: Format = {
  id: "odoo-cars",
  title: "العربيات في أودو (أرقام الشاسيه)",
  description: "تصدير أرقام الشاسيه من أودو: حالة كل عربية (متاحة / مباعة)، مكانها، قيمتها، واستلمت وخرجت إمتى.",
  group: "المخزون",
  mode: "snapshot",
  fields: [
    f("chassis", "رقم الشاسيه", "id", ["رقم الشاسية", "رقم الشاسيه"]),
    f("product", "العربية", "text", ["منتج مربوط", "المنتج"]),
    f("status", "حالة العربية", "text", ["حالة العربية"]),
    f("condition", "جديد / مستعمل", "text", ["حاله السيارة", "حالة السيارة"]),
    f("year", "سنة الموديل", "text", ["Chassis Year"]),
    f("category", "الفئة", "text", ["الفئة"]),
    f("warehouse", "المخزن", "text", ["المخزن"], { place: true }),
    f("location", "الموقع في أودو", "text", ["Internal Location"], { place: true }),
    f("company", "الشركة / المعرض", "text", ["شركة", "الشركة"]),
    f("value", "القيمة في المخزن", "money", ["قيمة العربية في المخزن"]),
    f("receivedAt", "تاريخ الاستلام", "date", ["تاريخ الاستلام"], { past: true }),
    f("deliveredAt", "تاريخ التسليم", "date", ["تاريخ التسليم"], { past: true }),
    f("supplier", "المورد", "text", ["مستلم من مورد"]),
    f("source", "مصدر الدخول", "text", ["مصدر دخول العربية"]),
    f("receivedFrom", "استلمت فين", "text", ["استلمت فين"]),
    f("deliveredTo", "خرجت لمين", "text", ["خرجت لمين"]),
    f("deliveredToPlace", "موصل إلى", "text", ["موصل الى"]),
    f("place", "مكانها دلوقتي", "text", ["مكانها دلوقتي"]),
    f("saleOrder", "أمر البيع", "id", ["أمر البيع"]),
    f("purchaseOrder", "أمر الشراء", "id", ["أمر الشراء"]),
    f("deliveryRef", "إذن التسليم", "id", ["توصيل"]),
    f("family", "الفامية", "text", ["فامية"]),
    f("color", "اللون", "text", ["لون السيارة"]),
    f("trim", "لون الفرش", "text", ["لون الفرش"]),
    f("brand", "الماركة"),
    f("customer", "العميل"),
    f("age", "أيام في المخزن", "int"),
    f("sellDays", "اتباعت بعد (يوم)", "int"),
    f("odooGroup", "مجموعة أودو"),
  ],
  required: ["chassis", "status"],
  keep: (r) => has(r.chassis),
  derive: (r) => {
    r.brand = brandOf(r.product);
    r.customer = typeof r.deliveredTo === "string" ? r.deliveredTo.split(/\s+-\s+مخزن/)[0].trim() : null;
    r.age = available(r) ? daysSince(r.receivedAt) : null;
    r.sellDays = !available(r) ? daysBetween(r.receivedAt, r.deliveredAt) : null;
  },
  dateField: "receivedAt",
  report: {
    summary: (rs) => {
      const av = rs.filter(available), old = av.filter((r) => n(r.age) > 90);
      const b = top(av, "brand");
      return `في أودو ${int(rs.length)} عربية: ${int(av.length)} متاحة للبيع بقيمة ${money(total(av, "value"))}، و${int(rs.filter(sold).length)} اتباعت.` +
        (b ? ` أكتر ماركة متاحة ${b.name} (${int(b.count)} عربية).` : "") +
        (old.length ? ` فيه ${int(old.length)} عربية متاحة بقالها أكتر من 90 يوم في المخزن.` : "");
    },
    kpis: [
      { metric: M.count("العربيات كلها") },
      { metric: M.count("متاحة للبيع", available), hint: (rs) => `قيمتها ${money(total(rs.filter(available), "value"))}` },
      { metric: M.count("اتباعت", sold), hint: (rs) => { const x = rs.filter((r) => is(r.status, "جاري التسليم")).length; return x ? `منها ${int(x)} لسه متسلمتش` : undefined; } },
      { metric: M.avg("age", "متوسط عمر المتاح", "days", available) },
      { metric: M.count("متاحة بقالها +90 يوم", (r) => available(r) && n(r.age) > 90), tone: (v) => (v ? "bad" : "good") },
      { metric: M.avg("sellDays", "متوسط مدة البيع", "days", (r) => n(r.sellDays) >= 0) },
    ],
    trends: [
      { title: "العربيات اللي اتستلمت", date: "receivedAt", metric: M.count("عربيات") },
      { title: "العربيات اللي اتسلمت للعملاء", date: "deliveredAt", metric: M.count("عربيات"), color: 2 },
    ],
    breakdowns: [
      { title: "حسب حالة العربية", by: "status", metrics: [M.count("عربيات"), M.sum("value", "القيمة في المخزن")] },
      { title: "المتاح حسب المخزن", by: "warehouse", where: available, metrics: [M.count("عربيات"), M.sum("value", "القيمة"), M.avg("age", "متوسط العمر", "days")] },
      { title: "المتاح حسب الماركة", by: "brand", where: available, metrics: [M.count("عربيات"), M.sum("value", "القيمة"), M.avg("age", "متوسط العمر", "days")] },
      { title: "حسب الشركة / المعرض", by: "company", metrics: [M.count("الكل"), M.count("متاحة", available), M.count("اتباعت", sold)] },
      { title: "أكتر الموردين", by: "supplier", metrics: [M.count("عربيات")], top: 15 },
      { title: "جديد ولا مستعمل", by: "condition", metrics: [M.count("عربيات"), M.count("متاحة", available)] },
    ],
    lists: [{
      title: "عربيات متاحة بقالها أكتر من 90 يوم", where: (r) => available(r) && n(r.age) > 90, sort: byDays("age"),
      columns: ["chassis", "product", "warehouse", "company", "receivedAt", "age", "value"], limit: 300,
    }],
    table: ["chassis", "product", "brand", "status", "condition", "warehouse", "company", "receivedAt", "deliveredAt", "age", "value", "color", "supplier", "customer"],
    filters: ["status", "company", "warehouse", "brand"],
  },
};

/** Odoo stock quants (test 33.xlsx): qty on hand and reserved per lot and location. */
export const stockQuant: Format = {
  id: "stock-quant",
  title: "الكميات في المخازن (أودو)",
  description: "تقرير الكميات من أودو: كل رقم شاسيه، موقعه، والكمية الموجودة والمحجوزة.",
  group: "المخزون",
  mode: "snapshot",
  fields: [
    f("lot", "رقم الشاسيه", "id", ["رقم الدفعة/الرقم التسلسلي", "الرقم التسلسلي", "رقم الدفعة"]),
    f("product", "المنتج", "text", ["المنتج"]),
    f("category", "الفئة", "text", ["الفئة"]),
    f("location", "الموقع", "text", ["الموقع"], { place: true }),
    f("color", "اللون", "text", ["لون السيارة"]),
    f("qty", "الكمية في المخزون", "int", ["الكمية في المخزون"]),
    f("reserved", "المحجوز", "int", ["الكمية المحجوزة"]),
    f("free", "المتاح", "int"),
    f("brand", "الماركة"),
  ],
  required: ["qty", "product", "location"],
  keep: (r) => has(r.product),
  derive: (r) => { r.brand = brandOf(r.product); r.free = n(r.qty) - n(r.reserved); },
  report: {
    summary: (rs) => {
      const l = top(rs.filter((r) => n(r.qty) > 0), "location", true);
      return `في المخازن ${int(total(rs, "qty"))} عربية، منها ${int(total(rs, "reserved"))} محجوزة` +
        (l ? `. أكبر موقع ${l.name} (${int(l.count)}).` : ".");
    },
    kpis: [
      { metric: M.sum("qty", "العربيات في المخزون", "int") },
      { metric: M.sum("reserved", "المحجوز", "int") },
      { metric: M.sum("free", "المتاح (من غير المحجوز)", "int") },
      { metric: M.distinct("product", "عدد الأصناف") },
      { metric: M.custom("عدد المواقع", "int", (rs) => new Set(rs.map((r) => r.location && cleanPlace(String(r.location)))).size) },
    ],
    breakdowns: [
      { title: "حسب الموقع", by: "location", metrics: [M.sum("qty", "في المخزون", "int"), M.sum("reserved", "محجوز", "int"), M.sum("free", "متاح", "int")] },
      { title: "حسب الماركة", by: "brand", metrics: [M.sum("qty", "في المخزون", "int"), M.sum("free", "متاح", "int")] },
      { title: "حسب الفئة", by: "category", metrics: [M.sum("qty", "في المخزون", "int")] },
      { title: "أكتر الأصناف", by: "product", metrics: [M.sum("qty", "في المخزون", "int")], top: 15 },
    ],
    table: ["lot", "product", "brand", "category", "location", "color", "qty", "reserved", "free"],
    filters: ["location", "brand", "category"],
  },
};

const counted = (r: Rec) => n(r.counted) > 0 || n(r.diff) !== 0;
/** Odoo physical inventory (TEST5555.xlsx): system qty vs counted qty per lot. */
export const inventoryCount: Format = {
  id: "inventory-count",
  title: "الجرد (المعدود قصاد السيستم)",
  description: "شيت الجرد من أودو: الكمية في السيستم، الكمية اللي اتعدّت، والفرق (عجز أو زيادة).",
  group: "المخزون",
  mode: "snapshot",
  fields: [
    f("lot", "رقم الشاسيه", "id", ["رقم الدفعة/الرقم التسلسلي", "الرقم التسلسلي"]),
    f("product", "المنتج", "text", ["المنتج"]),
    f("category", "الفئة", "text", ["الفئة"]),
    f("location", "الموقع", "text", ["الموقع"], { place: true }),
    f("supplier", "المورد", "text", ["المورد"]),
    f("receivedAt", "تاريخ الاستلام", "date", ["تاريخ الاستلام"], { past: true }),
    f("scheduled", "تاريخ الجرد المجدول", "date", ["التاريخ المجدول"]),
    f("color", "اللون", "text", ["لون السيارة"]),
    f("assignee", "مسؤول الجرد", "text", ["مُسنَد إلى", "مسند الى"]),
    f("qty", "في السيستم", "int", ["الكمية"]),
    f("counted", "اتعدّ", "int", ["الكمية المحسوبة"]),
    f("diff", "الفرق", "int", ["الفرق"]),
    f("result", "نتيجة الجرد"),
    f("brand", "الماركة"),
    f("age", "أيام في المخزن", "int"),
  ],
  required: ["diff", "counted", "product", "location"],
  keep: (r) => has(r.product),
  derive: (r) => {
    r.brand = brandOf(r.product);
    const d = n(r.diff);
    r.result = d < 0 ? "عجز" : d > 0 ? "زيادة" : n(r.counted) > 0 ? "مطابق" : n(r.qty) > 0 ? "لسه متعدّتش" : "مش في الرصيد";
    r.age = n(r.qty) > 0 ? daysSince(r.receivedAt) : null;
  },
  report: {
    summary: (rs) => {
      const inStock = rs.filter((r) => n(r.qty) > 0), c = rs.filter(counted);
      const short = rs.filter((r) => n(r.diff) < 0).length, extra = rs.filter((r) => n(r.diff) > 0).length;
      return `في السيستم ${int(total(rs, "qty"))} عربية. اتعدّ ${int(c.length)} سطر (${pct(inStock.length ? (c.length / inStock.length) * 100 : 0)})` +
        `، ولقينا ${int(short)} عجز و${int(extra)} زيادة.`;
    },
    kpis: [
      { metric: M.sum("qty", "العربيات في السيستم", "int") },
      { metric: M.count("اتعدّت", counted), hint: (rs) => { const s = rs.filter((r) => n(r.qty) > 0).length; return s ? `${pct((rs.filter(counted).length / s) * 100)} من الرصيد` : undefined; } },
      { metric: M.count("عجز (ناقصة)", (r) => n(r.diff) < 0), tone: (v) => (v ? "bad" : "good") },
      { metric: M.count("زيادة", (r) => n(r.diff) > 0) },
      { metric: M.avg("age", "متوسط عمر العربية في المخزن", "days") },
    ],
    breakdowns: [
      { title: "حسب الموقع", by: "location", metrics: [M.sum("qty", "في السيستم", "int"), M.count("اتعدّت", counted), M.count("عجز", (r) => n(r.diff) < 0), M.count("زيادة", (r) => n(r.diff) > 0)] },
      { title: "نتيجة الجرد", by: "result", metrics: [M.count("سطور")] },
      { title: "حسب الماركة", by: "brand", where: (r) => n(r.qty) > 0, metrics: [M.count("عربيات"), M.avg("age", "متوسط العمر", "days")] },
      { title: "أكتر الموردين", by: "supplier", where: (r) => n(r.qty) > 0, metrics: [M.count("عربيات")], top: 15 },
    ],
    lists: [{ title: "فروق الجرد (عجز أو زيادة)", where: (r) => n(r.diff) !== 0, columns: ["lot", "product", "location", "qty", "counted", "diff", "assignee"] }],
    table: ["lot", "product", "brand", "location", "supplier", "receivedAt", "age", "qty", "counted", "diff", "result", "color"],
    filters: ["location", "brand", "result"],
  },
};

const moveFields = (r: Rec, ref: unknown, from: unknown, to: unknown) => {
  const t = moveType(ref, from, to);
  r.type = t;
  r.place = warehouseSide(from, to, t);
};
const isType = (t: string) => (r: Rec) => r.type === t;

/** Odoo stock move lines (test 66.xlsx): every car movement with from / to. */
export const stockMoves: Format = {
  id: "stock-moves",
  title: "حركة العربيات في المخازن",
  description: "حركات المخزون من أودو: استلام من مورد، تسليم لعميل، تحويل بين المخازن، وتسويات الجرد.",
  group: "المخزون",
  mode: "append",
  fields: [
    f("date", "التاريخ", "date", ["التاريخ"], { past: true }),
    f("ref", "المرجع", "id", ["الرقم المرجعي"]),
    f("type", "نوع الحركة"),
    f("product", "المنتج", "text", ["المنتج"]),
    f("lot", "رقم الشاسيه", "id", ["رقم الدفعة/الرقم التسلسلي", "الرقم التسلسلي"]),
    f("from", "من", "text", ["من"], { place: true }),
    f("to", "إلى", "text", ["إلى", "الى"], { place: true }),
    f("place", "المخزن", "text", [], { place: true }),
    f("qty", "الكمية", "int", ["الكمية"]),
    f("category", "الفئة", "text", ["الفئة"]),
    f("color", "اللون", "text", ["لون السيارة"]),
    f("state", "الحالة", "text", ["الحالة"]),
    f("brand", "الماركة"),
  ],
  required: ["from", "to", "ref", "qty"],
  keep: (r) => has(r.product) || has(r.ref),
  derive: (r) => { moveFields(r, r.ref, r.from, r.to); r.brand = brandOf(r.product); },
  key: (r) => [r.date, r.ref, r.lot, r.product, r.from, r.to, r.qty].join("|"),
  dateField: "date",
  report: {
    summary: (rs) => `${int(rs.length)} حركة: ${int(rs.filter(isType(RECEIPT)).length)} استلام من موردين، ${int(rs.filter(isType(DELIVERY)).length)} تسليم لعملاء، و${int(rs.filter(isType(INTERNAL)).length)} تحويل بين المخازن.`,
    kpis: [
      { metric: M.count("عدد الحركات") },
      { metric: M.count("استلام من موردين", isType(RECEIPT)) },
      { metric: M.count("تسليم لعملاء", isType(DELIVERY)) },
      { metric: M.count("تحويلات داخلية", isType(INTERNAL)) },
      { metric: M.count("تسويات جرد", isType(ADJUST)) },
      { metric: M.distinct("lot", "عربيات مختلفة") },
    ],
    trends: [
      { title: "التسليم للعملاء", date: "date", metric: M.count("عربيات"), where: isType(DELIVERY) },
      { title: "الاستلام من الموردين", date: "date", metric: M.count("عربيات"), where: isType(RECEIPT), color: 2 },
    ],
    breakdowns: [
      { title: "حسب نوع الحركة", by: "type", metrics: [M.count("حركات")] },
      { title: "التسليم للعملاء حسب المخزن", by: "place", where: isType(DELIVERY), metrics: [M.count("عربيات")] },
      { title: "الاستلام حسب المخزن", by: "place", where: isType(RECEIPT), metrics: [M.count("عربيات")] },
      { title: "التسليم للعملاء حسب الماركة", by: "brand", where: isType(DELIVERY), metrics: [M.count("عربيات")] },
    ],
    table: ["date", "ref", "type", "product", "brand", "lot", "from", "to", "qty", "state"],
    filters: ["type", "brand", "place"],
  },
};

const absOut = (rs: Rec[]) => -total(rs.filter((r) => n(r.value) < 0), "value");
/** Odoo stock valuation layers (TEST99.xlsx): value in/out per move. */
export const stockValuation: Format = {
  id: "stock-valuation",
  title: "تقييم المخزون (الحركات بالقيمة)",
  description: "طبقات التقييم من أودو: كل حركة داخلة أو خارجة بقيمتها — منها بنعرف قيمة المخزون.",
  group: "المخزون",
  mode: "append",
  fields: [
    f("createdAt", "التاريخ", "date", ["أنشئ في", "تاريخ الإنشاء"], { past: true }),
    f("ref", "المرجع", "text", ["الرقم المرجعي"]),
    f("type", "نوع الحركة"),
    f("product", "المنتج", "text", ["المنتج"]),
    f("qty", "الكمية", "int", ["الكمية"]),
    f("value", "القيمة", "money", ["القيمة الكلية"]),
    f("brand", "الماركة"),
  ],
  required: ["createdAt", "value", "qty"],
  keep: (r) => has(r.product) || typeof r.value === "number",
  derive: (r) => { r.type = moveType(r.ref, null, null); r.brand = brandOf(r.product); },
  key: (r) => [r.createdAt, r.ref, r.product, r.qty, r.value].join("|"),
  dateField: "createdAt",
  report: {
    summary: (rs) => `صافي قيمة المخزون من الحركات دي ${money(total(rs, "value"))} (${int(total(rs, "qty"))} عربية). ` +
      `دخل بقيمة ${money(total(rs.filter((r) => n(r.value) > 0), "value"))} وخرج بقيمة ${money(absOut(rs))}.`,
    kpis: [
      { metric: M.sum("value", "صافي قيمة المخزون"), hint: () => "الداخل − الخارج" },
      { metric: M.sum("qty", "صافي عدد العربيات", "int") },
      { metric: M.sum("value", "قيمة الداخل", "money", (r) => n(r.value) > 0) },
      { metric: M.custom("قيمة الخارج", "money", absOut) },
      { metric: M.count("عدد الحركات") },
    ],
    trends: [
      { title: "قيمة الداخل للمخزن", date: "createdAt", metric: M.sum("value", "القيمة", "money", (r) => n(r.value) > 0) },
      { title: "قيمة الخارج من المخزن", date: "createdAt", metric: M.custom("القيمة", "money", absOut), color: 1 },
    ],
    breakdowns: [
      { title: "صافي المخزون حسب الماركة", by: "brand", metrics: [M.sum("value", "صافي القيمة"), M.sum("qty", "صافي العربيات", "int")] },
      { title: "حسب نوع الحركة", by: "type", metrics: [M.count("حركات"), M.sum("value", "داخل", "money", (r) => n(r.value) > 0), M.custom("خارج", "money", absOut)], chart: 0 },
    ],
    table: ["createdAt", "ref", "type", "product", "brand", "qty", "value"],
    filters: ["type", "brand"],
  },
};

const done = (r: Rec) => is(r.state, "منتهي", "done", "تم");
/** Odoo transfers / pickings (TEST4445, TEST66, TEST88): receipts and deliveries per showroom. */
export const transfers: Format = {
  id: "transfers",
  title: "أذونات الاستلام والتسليم",
  description: "التحويلات من أودو: أذون استلام من الموردين وأذون تسليم للعملاء، لكل معرض ومخزن.",
  group: "المخزون",
  mode: "append",
  fields: [
    f("scheduled", "التاريخ", "date", ["التاريخ المجدول"]),
    f("ref", "رقم الإذن", "id", ["الرقم المرجعي"]),
    f("type", "النوع"),
    f("company", "الشركة / المعرض", "text", ["الشركة"]),
    f("contact", "العميل / المورد", "text", ["جهة الاتصال"]),
    f("sourceDoc", "المستند المصدر", "id", ["المستند المصدر"]),
    f("from", "من", "text", ["الموقع المصدري"], { place: true }),
    f("to", "إلى", "text", ["الموقع الوجهة"], { place: true }),
    f("place", "المخزن", "text", [], { place: true }),
    f("state", "الحالة", "text", ["الحالة"]),
    f("priority", "الأولوية", "text", ["الأولوية"]),
  ],
  required: ["ref", "from", "to"],
  keep: (r) => has(r.ref),
  derive: (r) => moveFields(r, r.ref, r.from, r.to),
  key: (r) => `${r.company ?? ""}|${r.ref}`,
  dateField: "scheduled",
  report: {
    summary: (rs) => {
      const c = top(rs.filter(isType(DELIVERY)), "company");
      return `${int(rs.length)} إذن: ${int(rs.filter(isType(RECEIPT)).length)} استلام من موردين و${int(rs.filter(isType(DELIVERY)).length)} تسليم لعملاء.` +
        (c ? ` أكتر معرض سلّم ${c.name} (${int(c.count)} إذن).` : "") +
        (rs.some((r) => !done(r)) ? ` فيه ${int(rs.filter((r) => !done(r)).length)} إذن لسه مخلصش.` : "");
    },
    kpis: [
      { metric: M.count("عدد الأذون") },
      { metric: M.count("استلام من موردين", isType(RECEIPT)) },
      { metric: M.count("تسليم لعملاء", isType(DELIVERY)) },
      { metric: M.count("تحويلات داخلية", isType(INTERNAL)) },
      { metric: M.share("خلصت", done) },
      { metric: M.count("لسه مخلصتش", (r) => !done(r)), tone: (v) => (v ? "bad" : "good") },
    ],
    trends: [
      { title: "أذون التسليم للعملاء", date: "scheduled", metric: M.count("أذون"), where: isType(DELIVERY) },
      { title: "أذون الاستلام من الموردين", date: "scheduled", metric: M.count("أذون"), where: isType(RECEIPT), color: 2 },
    ],
    breakdowns: [
      { title: "حسب الشركة / المعرض", by: "company", metrics: [M.count("تسليم", isType(DELIVERY)), M.count("استلام", isType(RECEIPT)), M.count("الكل")] },
      { title: "حسب المخزن", by: "place", metrics: [M.count("تسليم", isType(DELIVERY)), M.count("استلام", isType(RECEIPT))] },
      { title: "أكتر الموردين (استلام)", by: "contact", where: isType(RECEIPT), metrics: [M.count("أذون")], top: 15 },
      { title: "حسب الحالة", by: "state", metrics: [M.count("أذون")] },
    ],
    lists: [{ title: "أذون لسه مخلصتش", where: (r) => !done(r), columns: ["scheduled", "ref", "type", "company", "contact", "state"] }],
    table: ["scheduled", "ref", "type", "company", "contact", "from", "to", "sourceDoc", "state"],
    filters: ["type", "company", "state"],
  },
};

/** Odoo product stock summary (test11.xlsx): qty on hand, incoming, outgoing, value per product. */
export const productStock: Format = {
  id: "product-stock",
  title: "رصيد الأصناف (الكمية والقيمة)",
  description: "ملخص المنتجات من أودو: الكمية في اليد، الوارد، الصادر، متوسط التكلفة والقيمة.",
  group: "المخزون",
  mode: "snapshot",
  fields: [
    f("name", "الصنف", "text", ["اسم العرض", "المنتج"]),
    f("onHand", "في اليد", "int", ["الكمية في اليد"]),
    f("available", "متاح للاستخدام", "int", ["الكميات المتاحة لاستخدامها", "الكمية المتاحة"]),
    f("incoming", "وارد", "int", ["واردة", "الواردة"]),
    f("outgoing", "صادر", "int", ["الصادرة", "صادرة"]),
    f("avgCost", "متوسط التكلفة", "money", ["متوسط التكلفة"]),
    f("value", "القيمة", "money", ["القيمة الكلية", "القيمة"]),
    f("brand", "الماركة"),
  ],
  required: ["name", "onHand", "avgCost"],
  keep: (r) => has(r.name) && !/^\[?sample/i.test(String(r.name)),
  derive: (r) => { r.brand = brandOf(r.name); },
  report: {
    summary: (rs) => {
      const inS = rs.filter((r) => n(r.onHand) > 0);
      return `${int(rs.length)} صنف، منهم ${int(inS.length)} ليهم رصيد: ${int(total(rs, "onHand"))} عربية بقيمة ${money(total(rs, "value"))}.`;
    },
    kpis: [
      { metric: M.count("عدد الأصناف") },
      { metric: M.count("أصناف ليها رصيد", (r) => n(r.onHand) > 0) },
      { metric: M.sum("onHand", "العربيات في اليد", "int") },
      { metric: M.sum("value", "قيمة المخزون") },
      { metric: M.sum("incoming", "وارد", "int") },
      { metric: M.sum("outgoing", "صادر", "int") },
    ],
    breakdowns: [
      { title: "الرصيد حسب الماركة", by: "brand", where: (r) => n(r.onHand) > 0, metrics: [M.sum("onHand", "في اليد", "int"), M.sum("value", "القيمة")] },
      { title: "أغلى الأصناف في المخزن", by: "name", where: (r) => n(r.onHand) > 0, metrics: [M.sum("value", "القيمة"), M.sum("onHand", "في اليد", "int"), M.avg("avgCost", "متوسط التكلفة")], top: 15 },
    ],
    table: ["name", "brand", "onHand", "available", "incoming", "outgoing", "avgCost", "value"],
    filters: ["brand"],
  },
};

export const STOCK_FORMATS = [stockByBrand, odooCars, stockQuant, inventoryCount, stockMoves, stockValuation, transfers, productStock];
