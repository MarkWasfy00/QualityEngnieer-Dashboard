import { prisma } from "../db";
import type { Range } from "../kpis";
import { label } from "../constants";

/**
 * One definition per section, used by BOTH the PDF and Excel exports so they
 * always show the same columns as each other.
 */
export type Kind = "text" | "date" | "money" | "int" | "num" | "pct" | "badge" | "code" | "latin";
export type SCol = { header: string; get: (r: Row) => unknown; kind?: Kind; width: number; w: number; total?: "sum" | "avg" | "count" };
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Section = {
  title: string;
  sheet: string;
  landscape?: boolean;
  dated?: boolean; // supports from/to
  load: (range: Range, sp: URLSearchParams) => Promise<Row[]>;
  cols: SCol[];
};

const between = (r: Range) =>
  r.from || r.to ? { ...(r.from && { gte: r.from }), ...(r.to && { lte: r.to }) } : undefined;
const veh = (v: { year: number; make: string; model: string } | null | undefined) => (v ? `${v.make} ${v.model} ${v.year}` : "");
const days = (a: Date | null, b: Date) => (a ? (+a - +b) / 86400000 : null);

export const SECTIONS: Record<string, Section> = {
  vehicles: {
    title: "العربيات", sheet: "العربيات", landscape: true,
    load: () => prisma.vehicle.findMany({
      include: { branch: true, _count: { select: { inspections: true } }, defects: { where: { status: { in: ["Open", "In Progress"] } }, select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    cols: [
      { header: "رقم الشاسيه", get: (r) => r.vin, kind: "latin", width: 21, w: 14, total: "count" },
      { header: "الماركة", get: (r) => r.make, width: 14, w: 9 },
      { header: "الموديل", get: (r) => r.model, width: 14, w: 9 },
      { header: "السنة", get: (r) => r.year, kind: "latin", width: 8, w: 6 },
      { header: "العداد (كم)", get: (r) => r.mileage, kind: "int", width: 12, w: 8 },
      { header: "اللون", get: (r) => r.color, width: 10, w: 6 },
      { header: "الحالة", get: (r) => r.condition, kind: "code", width: 10, w: 7 },
      { header: "الفرع", get: (r) => r.branch?.name, width: 16, w: 11 },
      { header: "المخزن", get: (r) => r.warehouseName, width: 16, w: 10 },
      { header: "أمين المخزن", get: (r) => r.warehouseKeeper, width: 16, w: 10 },
      { header: "الفحوصات", get: (r) => r._count.inspections, kind: "int", width: 10, w: 7, total: "sum" },
      { header: "عيوب مفتوحة", get: (r) => r.defects.length, kind: "int", width: 11, w: 8, total: "sum" },
    ],
  },
  inspections: {
    title: "فحوصات العربيات", sheet: "الفحوصات", landscape: true, dated: true,
    load: (range) => prisma.inspection.findMany({
      where: { date: between(range) }, include: { vehicle: { include: { branch: true } }, items: true }, orderBy: { date: "desc" },
    }),
    cols: [
      { header: "رقم", get: (r) => r.id, kind: "int", width: 7, w: 5, total: "count" },
      { header: "التاريخ", get: (r) => r.date, kind: "date", width: 13, w: 10 },
      { header: "العربية", get: (r) => veh(r.vehicle), width: 26, w: 16 },
      { header: "رقم الشاسيه", get: (r) => r.vehicle.vin, kind: "latin", width: 21, w: 14 },
      { header: "الفرع", get: (r) => r.vehicle.branch?.name, width: 16, w: 10 },
      { header: "نوع الفحص", get: (r) => r.type, width: 22, w: 13 },
      { header: "الفاحص", get: (r) => r.inspector, width: 16, w: 10 },
      { header: "غير مطابق", get: (r) => r.items.filter((x: { result: string }) => x.result === "FAIL").length, kind: "int", width: 10, w: 7, total: "sum" },
      { header: "نسبة المطابقة", get: (r) => r.score, kind: "pct", width: 12, w: 8, total: "avg" },
      { header: "الحكم", get: (r) => r.result, kind: "badge", width: 12, w: 7 },
    ],
  },
  defects: {
    title: "سجل العيوب والمشاكل", sheet: "العيوب", landscape: true, dated: true,
    load: (range) => prisma.defect.findMany({ where: { reportedAt: between(range) }, include: { vehicle: true }, orderBy: { reportedAt: "desc" } }),
    cols: [
      { header: "التاريخ", get: (r) => r.reportedAt, kind: "date", width: 13, w: 9, total: "count" },
      { header: "العربية", get: (r) => veh(r.vehicle), width: 26, w: 15 },
      { header: "القسم", get: (r) => r.category, width: 16, w: 10 },
      { header: "وصف العيب", get: (r) => r.description, width: 36, w: 22 },
      { header: "الخطورة", get: (r) => r.severity, kind: "badge", width: 11, w: 8 },
      { header: "الحالة", get: (r) => r.status, kind: "badge", width: 13, w: 9 },
      { header: "الفني", get: (r) => r.technician, width: 16, w: 10 },
      { header: "تاريخ الإصلاح", get: (r) => r.fixedAt, kind: "date", width: 13, w: 9 },
      { header: "التكلفة", get: (r) => r.repairCost, kind: "money", width: 14, w: 8, total: "sum" },
    ],
  },
  service: {
    title: "أوامر الصيانة والإصلاح", sheet: "أوامر الصيانة", landscape: true, dated: true,
    load: (range) => prisma.serviceJob.findMany({ where: { openedAt: between(range) }, include: { vehicle: true }, orderBy: { openedAt: "desc" } }),
    cols: [
      { header: "أمر الشغل", get: (r) => r.roNumber, kind: "latin", width: 12, w: 8, total: "count" },
      { header: "تاريخ الفتح", get: (r) => r.openedAt, kind: "date", width: 13, w: 9 },
      { header: "العربية", get: (r) => veh(r.vehicle), width: 26, w: 15 },
      { header: "نوع الشغلانة", get: (r) => r.jobType, width: 20, w: 12 },
      { header: "الفني", get: (r) => r.technician, width: 16, w: 10 },
      { header: "الساعات", get: (r) => r.laborHours, kind: "num", width: 10, w: 6, total: "sum" },
      { header: "المصنعية", get: (r) => r.laborCost, kind: "money", width: 14, w: 8, total: "sum" },
      { header: "قطع الغيار", get: (r) => r.partsCost, kind: "money", width: 14, w: 8, total: "sum" },
      { header: "الإجمالي", get: (r) => r.laborCost + r.partsCost, kind: "money", width: 14, w: 9, total: "sum" },
      { header: "رجعت تاني؟", get: (r) => (r.isComeback ? "أيوه" : "لأ"), width: 11, w: 7 },
      { header: "الحالة", get: (r) => r.status, kind: "badge", width: 13, w: 8 },
    ],
  },
  complaints: {
    title: "شكاوى العملاء", sheet: "الشكاوى", landscape: true, dated: true,
    load: (range) => prisma.complaint.findMany({
      where: { date: between(range) }, include: { vehicle: { include: { branch: true } }, branch: true }, orderBy: { date: "desc" },
    }),
    cols: [
      { header: "التاريخ", get: (r) => r.date, kind: "date", width: 13, w: 9, total: "count" },
      { header: "العميل", get: (r) => r.customerName, width: 18, w: 11 },
      { header: "الموبايل", get: (r) => r.contact, kind: "latin", width: 15, w: 10 },
      { header: "الفرع", get: (r) => (r.branch ?? r.vehicle?.branch)?.name, width: 16, w: 10 },
      { header: "العربية", get: (r) => veh(r.vehicle), width: 24, w: 13 },
      { header: "نوع الشكوى", get: (r) => r.category, width: 20, w: 11 },
      { header: "التفاصيل", get: (r) => r.description, width: 34, w: 17 },
      { header: "الحالة", get: (r) => r.status, kind: "badge", width: 13, w: 8 },
      { header: "أيام الحل", get: (r) => days(r.resolvedAt, r.date), kind: "num", width: 10, w: 5, total: "avg" },
      { header: "الرضا", get: (r) => r.satisfaction, kind: "num", width: 9, w: 6, total: "avg" },
    ],
  },
  sales: {
    title: "المبيعات", sheet: "المبيعات", landscape: true, dated: true,
    load: (range) => prisma.sale.findMany({ where: { saleDate: between(range) }, include: { vehicle: true, salesman: true }, orderBy: { saleDate: "desc" } }),
    cols: [
      { header: "تاريخ البيع", get: (r) => r.saleDate, kind: "date", width: 13, w: 9, total: "count" },
      { header: "البيّاع", get: (r) => r.salesman.name, width: 18, w: 12 },
      { header: "العربية", get: (r) => veh(r.vehicle), width: 26, w: 15 },
      { header: "رقم الشاسيه", get: (r) => r.vehicle.vin, kind: "latin", width: 21, w: 14 },
      { header: "العميل", get: (r) => r.customerName, width: 18, w: 12 },
      { header: "الموبايل", get: (r) => r.customerPhone, kind: "latin", width: 15, w: 10 },
      { header: "السعر", get: (r) => r.price, kind: "money", width: 16, w: 11, total: "sum" },
      { header: "طريقة الدفع", get: (r) => r.paymentType, kind: "code", width: 13, w: 8 },
      { header: "تاريخ التسليم", get: (r) => r.deliveredAt, kind: "date", width: 13, w: 9 },
    ],
  },
  visits: {
    title: "زيارات العملاء", sheet: "زيارات العملاء", landscape: true, dated: true,
    load: (range, sp) => prisma.visit.findMany({
      where: {
        visitDate: between(range),
        ...(Number(sp.get("salesmanId")) ? { salesmanId: Number(sp.get("salesmanId")) } : {}),
        ...(sp.get("outcome") ? { outcome: sp.get("outcome")! } : {}),
      },
      include: { salesman: true }, orderBy: { visitDate: "desc" },
    }),
    cols: [
      { header: "التاريخ", get: (r) => r.visitDate, kind: "date", width: 13, w: 9 },
      { header: "البيّاع", get: (r) => r.salesman.name, width: 18, w: 12 },
      { header: "عدد الزيارات", get: (r) => r.count, kind: "int", width: 11, w: 6, total: "sum" },
      { header: "العميل", get: (r) => r.customerName ?? (r.count > 1 ? "زيارات مجمّعة" : null), width: 18, w: 11 },
      { header: "الموبايل", get: (r) => r.customerPhone, kind: "latin", width: 15, w: 10 },
      { header: "جه منين", get: (r) => r.source, width: 16, w: 11 },
      { header: "مهتم بـ", get: (r) => r.interestedIn, width: 24, w: 14 },
      { header: "النتيجة", get: (r) => r.outcome, kind: "badge", width: 12, w: 9 },
      { header: "ملاحظات", get: (r) => r.notes, width: 32, w: 18 },
    ],
  },
  salesmen: {
    title: "البيّاعين", sheet: "البيّاعين",
    load: async () => {
      const [ms, g] = await Promise.all([
        prisma.salesman.findMany({ include: { branch: true, _count: { select: { sales: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
        prisma.visit.groupBy({ by: ["salesmanId"], _sum: { count: true } }),
      ]);
      const vt = new Map(g.map((x) => [x.salesmanId, x._sum.count ?? 0]));
      return ms.map((m) => ({ ...m, visitTotal: vt.get(m.id) ?? 0 }));
    },
    cols: [
      { header: "الاسم", get: (r) => r.name, width: 22, w: 22, total: "count" },
      { header: "الفرع", get: (r) => r.branch?.name, width: 18, w: 18 },
      { header: "الموبايل", get: (r) => r.phone, kind: "latin", width: 15, w: 15 },
      { header: "تاريخ التعيين", get: (r) => r.hiredAt, kind: "date", width: 13, w: 13 },
      { header: "الحالة", get: (r) => (r.active ? "شغال" : "موقوف"), width: 10, w: 10 },
      { header: "الزيارات", get: (r) => r.visitTotal, kind: "int", width: 10, w: 11, total: "sum" },
      { header: "المبيعات", get: (r) => r._count.sales, kind: "int", width: 10, w: 11, total: "sum" },
    ],
  },
  branches: {
    title: "الفروع", sheet: "الفروع",
    load: () => prisma.branch.findMany({
      include: { _count: { select: { vehicles: true, salesmen: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    cols: [
      { header: "الفرع", get: (r) => r.name, width: 22, w: 22, total: "count" },
      { header: "المدينة", get: (r) => r.city, width: 16, w: 16 },
      { header: "المدير", get: (r) => r.manager, width: 18, w: 18 },
      { header: "الحالة", get: (r) => (r.active ? "شغال" : "مقفول"), width: 10, w: 12 },
      { header: "العربيات", get: (r) => r._count.vehicles, kind: "int", width: 10, w: 16, total: "sum" },
      { header: "البيّاعين", get: (r) => r._count.salesmen, kind: "int", width: 10, w: 16, total: "sum" },
    ],
  },
};

/** Filters line shown in the report header. */
export async function filtersLabel(range: Range, sp: URLSearchParams, fmtDate: (d: Date) => string) {
  const parts = [!range.from && !range.to ? "كل الفترات" : `من ${range.from ? fmtDate(range.from) : "البداية"} لحد ${range.to ? fmtDate(range.to) : "النهارده"}`];
  const sid = Number(sp.get("salesmanId"));
  if (sid) parts.push(`البيّاع: ${(await prisma.salesman.findUnique({ where: { id: sid } }))?.name ?? sid}`);
  if (sp.get("outcome")) parts.push(`النتيجة: ${label(sp.get("outcome"))}`);
  return parts.join(" · ");
}
