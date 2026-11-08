import ExcelJS from "exceljs";
import type { ReportData } from "../kpis";
import { BRAND, SEVERITY_COLORS, STATUS_COLORS, DEALERSHIP_NAME, label } from "../constants";
import { fmtDate, monthLabel } from "../format";
import { compareSalesmen, compareBranches, type CompareRow } from "../compare";

export type Module = "inspections" | "defects" | "service" | "complaints" | "sales" | "workers" | "branches";
export const ALL_MODULES: Module[] = ["inspections", "defects", "service", "complaints", "sales", "workers", "branches"];

const argb = (hex: string) => "FF" + hex;
const fill = (hex: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } });
const thin = { style: "thin" as const, color: { argb: argb(BRAND.border) } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const FONT = "Arial";
export const EGP = '#,##0 "ج.م"';
export const DATE = "dd/mm/yyyy";
const FOOTER = `&C&8صفحة &P من &N&R&8${DEALERSHIP_NAME}&L&8&D`;

export type Col = {
  header: string; key: string; width: number;
  fmt?: string; badge?: boolean; code?: boolean; total?: "sum" | "avg" | "count"; center?: boolean;
};

export function periodLabel(d: { range: ReportData["range"] }) {
  const { from, to } = d.range;
  if (!from && !to) return "كل الفترات";
  return `من ${from ? fmtDate(from) : "البداية"} لحد ${to ? fmtDate(to) : "النهارده"}`;
}

const rtl = (extra: Partial<ExcelJS.Alignment> = {}): Partial<ExcelJS.Alignment> => ({ readingOrder: "rtl", vertical: "middle", ...extra });

function newSheet(wb: ExcelJS.Workbook, name: string, tab: string, frozen?: number) {
  return wb.addWorksheet(name, {
    properties: { tabColor: { argb: argb(tab) } },
    views: [{ rightToLeft: true, showGridLines: false, ...(frozen ? { state: "frozen" as const, ySplit: frozen } : {}) }],
  });
}

function banner(ws: ExcelJS.Worksheet, title: string, sub: string, span: number) {
  ws.mergeCells(1, 1, 1, span);
  ws.mergeCells(2, 1, 2, span);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: FONT, size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = fill(BRAND.navy);
  t.alignment = rtl({ horizontal: "right", indent: 1 });
  ws.getRow(1).height = 38;
  const s = ws.getCell(2, 1);
  s.value = sub;
  s.font = { name: FONT, size: 10, color: { argb: "FFDCE3F0" } };
  s.fill = fill(BRAND.navy);
  s.alignment = rtl({ horizontal: "right", indent: 1 });
  ws.getRow(2).height = 22;
}

function printSetup(ws: ExcelJS.Worksheet, headerRow?: number, orientation: "landscape" | "portrait" = "landscape") {
  ws.pageSetup = {
    orientation, paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    ...(headerRow ? { printTitlesRow: `${headerRow}:${headerRow}` } : {}),
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  ws.headerFooter.oddFooter = FOOTER;
}

function colorFor(code: unknown) {
  return typeof code === "string" ? SEVERITY_COLORS[code] ?? STATUS_COLORS[code] : undefined;
}

export function tableSheet(wb: ExcelJS.Workbook, name: string, title: string, d: { range: ReportData["range"] }, cols: Col[], rows: Record<string, unknown>[]) {
  const ws = newSheet(wb, name, BRAND.blue, 4);
  ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));
  banner(ws, title, `${DEALERSHIP_NAME}  •  الفترة: ${periodLabel(d)}  •  عدد السجلات: ${rows.length}`, cols.length);
  ws.getRow(3).height = 8;

  const HR = 4;
  const header = ws.getRow(HR);
  cols.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = fill(BRAND.blue);
    cell.alignment = rtl({ horizontal: "center", wrapText: true });
    cell.border = box;
  });
  header.height = 30;

  rows.forEach((r, idx) => {
    const row = ws.getRow(HR + 1 + idx);
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      const raw = r[c.key] ?? null;
      cell.value = (c.badge || c.code ? label(raw as string) || null : raw) as ExcelJS.CellValue;
      cell.font = { name: FONT, size: 10, color: { argb: argb(BRAND.text) } };
      cell.border = box;
      cell.alignment = rtl({ horizontal: c.center || c.fmt ? "center" : "right", wrapText: c.width > 30 });
      if (c.fmt) cell.numFmt = c.fmt;
      if (idx % 2 === 1) cell.fill = fill(BRAND.zebra);
      const col = c.badge ? colorFor(raw) : undefined;
      if (col) {
        cell.fill = fill(col.bg);
        cell.font = { name: FONT, size: 10, bold: true, color: { argb: argb(col.fg) } };
        cell.alignment = rtl({ horizontal: "center" });
      }
    });
    row.height = 22;
  });

  // Totals row with live formulas
  const first = HR + 1, last = HR + rows.length;
  const tr = ws.getRow(last + 1);
  cols.forEach((c, i) => {
    const cell = tr.getCell(i + 1);
    const L = ws.getColumn(i + 1).letter;
    if (i === 0) cell.value = "الإجمالي / المتوسط";
    else if (rows.length && c.total) {
      const fn = c.total === "sum" ? "SUM" : c.total === "avg" ? "AVERAGE" : "COUNTA";
      cell.value = { formula: `IFERROR(${fn}(${L}${first}:${L}${last}),0)` };
      if (c.fmt) cell.numFmt = c.fmt;
    }
    cell.alignment = rtl({ horizontal: i === 0 ? "right" : "center" });
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: argb(BRAND.navy) } };
    cell.fill = fill(BRAND.light);
    cell.border = { ...box, top: { style: "medium", color: { argb: argb(BRAND.navy) } } };
  });
  tr.height = 24;

  if (rows.length) ws.autoFilter = { from: { row: HR, column: 1 }, to: { row: last, column: cols.length } };
  printSetup(ws, HR);
  return ws;
}

function summarySheet(wb: ExcelJS.Workbook, d: ReportData) {
  const ws = newSheet(wb, "الملخص", BRAND.navy);
  ws.columns = [{ width: 3 }, { width: 28 }, { width: 18 }, { width: 3 }, { width: 28 }, { width: 18 }, { width: 3 }, { width: 28 }, { width: 18 }];
  banner(ws, "تقرير جودة العربيات", `${DEALERSHIP_NAME}  •  الفترة: ${periodLabel(d)}  •  اتعمل يوم ${fmtDate(new Date())}`, 9);
  const k = d.kpis;

  const tiles: [string, number, string, string][] = [
    ["نسبة النجاح من أول مرة", k.firstPassYield / 100, "0.0%", `من ${k.inspections} فحص`],
    ["متوسط نسبة المطابقة", k.avgInspectionScore / 100, "0.0%", "البنود المطابقة من البنود المطبقة"],
    ["عيوب مفتوحة", k.openDefects, "0", `منها ${k.criticalOpen} حرجة`],
    ["إجمالي تكلفة الإصلاح", k.totalRepairCost, EGP, `${k.defects} عيب متسجل`],
    ["متوسط تكلفة الإصلاح", k.avgRepairCost, EGP, "للعيب الواحد"],
    ["نسبة رجوع العربيات", k.comebackRate / 100, "0.0%", `من ${k.serviceJobs} أمر صيانة`],
    ["متوسط مدة التسليم (ساعة)", k.avgTurnaroundHrs, "0.0", "لأوامر الصيانة اللي خلصت"],
    ["إجمالي تكلفة الصيانة", k.totalServiceCost, EGP, "مصنعية + قطع غيار"],
    ["رضا العملاء (من 5)", k.csat, "0.0", `${k.complaints} شكوى · ${k.openComplaints} مفتوحة`],
  ];
  let r = 4;
  tiles.forEach((t, i) => {
    const col = 2 + (i % 3) * 3;
    if (i % 3 === 0 && i) r += 4;
    for (let j = 0; j < 3; j++) ws.mergeCells(r + j, col, r + j, col + 1);
    const lab = ws.getCell(r, col), val = ws.getCell(r + 1, col), hint = ws.getCell(r + 2, col);
    lab.value = t[0];
    lab.font = { name: FONT, size: 10, bold: true, color: { argb: argb(BRAND.muted) } };
    val.value = t[1]; val.numFmt = t[2];
    val.font = { name: FONT, size: 22, bold: true, color: { argb: argb(BRAND.navy) } };
    hint.value = t[3];
    hint.font = { name: FONT, size: 9, color: { argb: argb(BRAND.muted) } };
    [lab, val, hint].forEach((c) => { c.fill = fill(BRAND.light); c.alignment = rtl({ horizontal: "right", indent: 1 }); });
    lab.border = { top: { style: "thick", color: { argb: argb(BRAND.blue) } } };
    ws.getRow(r + 1).height = 34;
  });
  r += 5;

  const mini = (startCol: number, title: string, head: string[], data: (string | number)[][], fmts: (string | undefined)[] = [], codes = false) => {
    let rr = r;
    ws.mergeCells(rr, startCol, rr, startCol + 1);
    const t = ws.getCell(rr, startCol);
    t.value = title; t.font = { name: FONT, size: 12, bold: true, color: { argb: argb(BRAND.navy) } };
    t.alignment = rtl({ horizontal: "right" });
    rr++;
    head.forEach((h, i) => {
      const c = ws.getCell(rr, startCol + i);
      c.value = h; c.fill = fill(BRAND.navy); c.border = box;
      c.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      c.alignment = rtl({ horizontal: i ? "center" : "right" });
    });
    data.forEach((row, j) => {
      rr++;
      row.forEach((v, i) => {
        const c = ws.getCell(rr, startCol + i);
        c.value = i === 0 && codes ? label(String(v)) : v;
        c.border = box; c.font = { name: FONT, size: 10 };
        c.alignment = rtl({ horizontal: i ? "center" : "right" });
        if (fmts[i]) c.numFmt = fmts[i]!;
        if (j % 2) c.fill = fill(BRAND.zebra);
        const sc = i === 0 && codes ? colorFor(v) : undefined;
        if (sc) { c.fill = fill(sc.bg); c.font = { name: FONT, size: 10, bold: true, color: { argb: argb(sc.fg) } }; }
      });
    });
    return rr;
  };
  const b = d.breakdowns;
  const e1 = mini(2, "العيوب حسب الخطورة", ["الخطورة", "العدد"], b.defectsBySeverity.map((x) => [x.name, x.value]), [], true);
  const e2 = mini(5, "العيوب حسب القسم", ["القسم", "العدد"], b.defectsByCategory.map((x) => [x.name, x.value]));
  const e3 = mini(8, "الشكاوى حسب الحالة", ["الحالة", "العدد"], b.complaintsByStatus.map((x) => [x.name, x.value]), [], true);
  r = Math.max(e1, e2, e3) + 2;
  mini(2, "تكلفة الصيانة حسب نوع الشغلانة", ["نوع الشغلانة", "مصنعية + قطع غيار"], b.costByJobType.map((x) => [x.name, x.labor + x.parts]), [undefined, EGP]);
  mini(5, "نتايج الفحص كل شهر", ["الشهر", "مطابق / غير مطابق"], b.inspectionTrend.map((x) => [monthLabel(x.month), `${x.pass} / ${x.fail}`]));
  printSetup(ws, undefined, "portrait");
}

/** Metric-by-salesman comparison with the best value per row highlighted. */
function compareSheet(wb: ExcelJS.Workbook, d: ReportData) {
  const list = d.workers.salesmen.filter((x) => x.name !== "غير محدد");
  if (!list.length) return;
  comparisonSheet(wb, d, "مقارنة البيّاعين", list.map((x) => x.name), compareSalesmen(list));
}

/** Generic metric-by-entity comparison sheet (best per row in green, wins row at the bottom). */
function comparisonSheet(wb: ExcelJS.Workbook, d: ReportData, title: string, names: string[],
  { rows, wins, leaders }: { rows: CompareRow[]; wins: number[]; leaders: number[] }) {
  const list = names;
  const ws = newSheet(wb, title, BRAND.blue, 4);
  ws.columns = [{ width: 26 }, { width: 14 }, ...list.map(() => ({ width: 18 }))];
  const span = 2 + list.length;
  banner(ws, title, `${DEALERSHIP_NAME}  •  الفترة: ${periodLabel(d)}  •  الخلية الخضرا = الأفضل في المقياس`, span);
  ws.getRow(3).height = 8;
  const head = ws.getRow(4);
  ["المقياس", "الأحسن", ...list].forEach((h, i) => {
    const c = head.getCell(i + 1);
    c.value = h; c.fill = fill(BRAND.blue); c.border = box;
    c.font = { name: FONT, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    c.alignment = rtl({ horizontal: "center", wrapText: true });
  });
  head.height = 28;
  rows.forEach((r, j) => {
    const row = ws.getRow(5 + j);
    const cells = [r.label, r.better === "high" ? "الأعلى" : "الأقل", ...r.values];
    cells.forEach((v, i) => {
      const c = row.getCell(i + 1);
      c.value = v as ExcelJS.CellValue;
      c.border = box;
      c.font = { name: FONT, size: 10, bold: i === 0 };
      c.alignment = rtl({ horizontal: i === 0 ? "right" : "center" });
      if (j % 2) c.fill = fill(BRAND.zebra);
      if (i >= 2) {
        c.numFmt = r.excelFmt;
        if (v == null) c.value = "—";
        if (r.best.includes(i - 2)) {
          c.fill = fill(STATUS_COLORS.PASS.bg);
          c.font = { name: FONT, size: 10, bold: true, color: { argb: argb(STATUS_COLORS.PASS.fg) } };
        }
      }
    });
    row.height = 22;
  });
  const wr = ws.getRow(5 + rows.length);
  ["عدد المقاييس اللي كسبها", "", ...wins].forEach((v, i) => {
    const c = wr.getCell(i + 1);
    c.value = v; c.border = { ...box, top: { style: "medium", color: { argb: argb(BRAND.navy) } } };
    c.fill = fill(i >= 2 && leaders.includes(i - 2) ? "FEF0C7" : BRAND.light);
    c.font = { name: FONT, size: 11, bold: true, color: { argb: argb(BRAND.navy) } };
    c.alignment = rtl({ horizontal: i === 0 ? "right" : "center" });
  });
  wr.height = 24;
  printSetup(ws, 4);
}

export async function buildWorkbook(d: ReportData, modules: Module[] = ALL_MODULES) {
  const wb = new ExcelJS.Workbook();
  wb.creator = DEALERSHIP_NAME;
  wb.created = new Date();
  summarySheet(wb, d);
  const vin = (v: { vin: string } | null) => v?.vin ?? "";
  const veh = (v: { year: number; make: string; model: string } | null) => (v ? `${v.make} ${v.model} ${v.year}` : "");

  if (modules.includes("inspections"))
    tableSheet(wb, "الفحوصات", "فحوصات العربيات", d, [
      { header: "رقم", key: "id", width: 7, center: true, total: "count" },
      { header: "التاريخ", key: "date", width: 13, fmt: DATE },
      { header: "العربية", key: "vehicle", width: 26 }, { header: "رقم الشاسيه", key: "vin", width: 21, center: true },
      { header: "نوع الفحص", key: "type", width: 24 }, { header: "الفاحص", key: "inspector", width: 16 },
      { header: "عدد البنود", key: "items", width: 10, fmt: "0", total: "sum" },
      { header: "غير مطابق", key: "fails", width: 10, fmt: "0", total: "sum" },
      { header: "نسبة المطابقة", key: "score", width: 12, fmt: "0.0%", total: "avg" },
      { header: "الحكم", key: "result", width: 12, badge: true },
      { header: "البنود غير المطابقة", key: "failList", width: 42 },
    ], d.inspections.map((i) => {
      const f = i.items.filter((x) => x.result === "FAIL");
      return {
        id: i.id, date: i.date, vehicle: veh(i.vehicle), vin: vin(i.vehicle), type: i.type, inspector: i.inspector,
        items: i.items.length, fails: f.length, score: i.score / 100, result: i.result,
        failList: f.map((x) => `${x.category}: ${x.item}`).join("، "),
      };
    }));

  if (modules.includes("defects"))
    tableSheet(wb, "العيوب", "سجل العيوب والمشاكل", d, [
      { header: "رقم", key: "id", width: 7, center: true, total: "count" },
      { header: "تاريخ التسجيل", key: "reportedAt", width: 13, fmt: DATE },
      { header: "العربية", key: "vehicle", width: 26 }, { header: "رقم الشاسيه", key: "vin", width: 21, center: true },
      { header: "القسم", key: "category", width: 16 }, { header: "وصف العيب", key: "description", width: 36 },
      { header: "الخطورة", key: "severity", width: 11, badge: true }, { header: "الحالة", key: "status", width: 13, badge: true },
      { header: "الفني", key: "technician", width: 16 },
      { header: "تكلفة الإصلاح", key: "repairCost", width: 15, fmt: EGP, total: "sum" },
      { header: "تاريخ الإصلاح", key: "fixedAt", width: 13, fmt: DATE },
      { header: "أيام الإصلاح", key: "days", width: 11, fmt: "0.0", total: "avg" },
    ], d.defects.map((x) => ({
      id: x.id, reportedAt: x.reportedAt, vehicle: veh(x.vehicle), vin: vin(x.vehicle), category: x.category,
      description: x.description, severity: x.severity, status: x.status, technician: x.technician, repairCost: x.repairCost,
      fixedAt: x.fixedAt, days: x.fixedAt ? (+x.fixedAt - +x.reportedAt) / 86400000 : null,
    })));

  if (modules.includes("service"))
    tableSheet(wb, "أوامر الصيانة", "أوامر الصيانة والإصلاح", d, [
      { header: "أمر الشغل", key: "roNumber", width: 12, center: true, total: "count" },
      { header: "تاريخ الفتح", key: "openedAt", width: 13, fmt: DATE }, { header: "تاريخ التسليم", key: "closedAt", width: 13, fmt: DATE },
      { header: "العربية", key: "vehicle", width: 26 }, { header: "نوع الشغلانة", key: "jobType", width: 20 },
      { header: "الفني", key: "technician", width: 16 },
      { header: "الساعات", key: "laborHours", width: 10, fmt: "0.0", total: "sum" },
      { header: "المصنعية", key: "laborCost", width: 14, fmt: EGP, total: "sum" },
      { header: "قطع الغيار", key: "partsCost", width: 14, fmt: EGP, total: "sum" },
      { header: "الإجمالي", key: "total", width: 14, fmt: EGP, total: "sum" },
      { header: "مدة التسليم (ساعة)", key: "tat", width: 14, fmt: "0.0", total: "avg" },
      { header: "رجعت تاني؟", key: "comeback", width: 11, center: true },
      { header: "الحالة", key: "status", width: 13, badge: true },
    ], d.jobs.map((j) => ({
      roNumber: j.roNumber, openedAt: j.openedAt, closedAt: j.closedAt, vehicle: veh(j.vehicle), jobType: j.jobType,
      technician: j.technician, laborHours: j.laborHours, laborCost: j.laborCost, partsCost: j.partsCost,
      total: j.laborCost + j.partsCost, tat: j.closedAt ? (+j.closedAt - +j.openedAt) / 3600000 : null,
      comeback: j.isComeback ? "أيوه" : "لأ", status: j.status,
    })));

  if (modules.includes("complaints"))
    tableSheet(wb, "الشكاوى", "شكاوى العملاء", d, [
      { header: "رقم", key: "id", width: 7, center: true, total: "count" },
      { header: "التاريخ", key: "date", width: 13, fmt: DATE },
      { header: "العميل", key: "customerName", width: 18 }, { header: "الموبايل", key: "contact", width: 16, center: true },
      { header: "العربية", key: "vehicle", width: 24 }, { header: "نوع الشكوى", key: "category", width: 20 },
      { header: "التفاصيل", key: "description", width: 36 },
      { header: "الحالة", key: "status", width: 13, badge: true },
      { header: "تاريخ الحل", key: "resolvedAt", width: 13, fmt: DATE },
      { header: "أيام الحل", key: "days", width: 11, fmt: "0.0", total: "avg" },
      { header: "الرضا (من 5)", key: "satisfaction", width: 11, fmt: "0.0", total: "avg" },
    ], d.complaints.map((c) => ({
      id: c.id, date: c.date, customerName: c.customerName, contact: c.contact, vehicle: veh(c.vehicle),
      category: c.category, description: c.description, status: c.status, resolvedAt: c.resolvedAt,
      days: c.resolvedAt ? (+c.resolvedAt - +c.date) / 86400000 : null, satisfaction: c.satisfaction,
    })));

  if (modules.includes("sales"))
    tableSheet(wb, "المبيعات", "المبيعات", d, [
      { header: "رقم", key: "id", width: 7, center: true, total: "count" },
      { header: "تاريخ البيع", key: "saleDate", width: 13, fmt: DATE },
      { header: "البيّاع", key: "salesman", width: 18 },
      { header: "العربية", key: "vehicle", width: 26 }, { header: "رقم الشاسيه", key: "vin", width: 21, center: true },
      { header: "العميل", key: "customerName", width: 18 }, { header: "الموبايل", key: "customerPhone", width: 15, center: true },
      { header: "السعر", key: "price", width: 16, fmt: EGP, total: "sum" },
      { header: "طريقة الدفع", key: "paymentType", width: 13, code: true, center: true },
      { header: "تاريخ التسليم", key: "deliveredAt", width: 13, fmt: DATE },
      { header: "أيام التسليم", key: "days", width: 11, fmt: "0.0", total: "avg" },
    ], d.sales.map((x) => ({
      id: x.id, saleDate: x.saleDate, salesman: x.salesman.name, vehicle: veh(x.vehicle), vin: vin(x.vehicle),
      customerName: x.customerName, customerPhone: x.customerPhone, price: x.price, paymentType: x.paymentType,
      deliveredAt: x.deliveredAt, days: x.deliveredAt ? (+x.deliveredAt - +x.saleDate) / 86400000 : null,
    })));

  if (modules.includes("sales"))
    tableSheet(wb, "زيارات العملاء", "زيارات العملاء", d, [
      { header: "رقم", key: "id", width: 7, center: true, total: "count" },
      { header: "التاريخ", key: "visitDate", width: 13, fmt: DATE },
      { header: "البيّاع", key: "salesman", width: 18 },
      { header: "العميل", key: "customerName", width: 18 }, { header: "الموبايل", key: "customerPhone", width: 15, center: true },
      { header: "جه منين", key: "source", width: 16 }, { header: "مهتم بـ", key: "interestedIn", width: 24 },
      { header: "النتيجة", key: "outcome", width: 12, badge: true },
      { header: "ملاحظات", key: "notes", width: 32 },
    ], d.visits.map((v) => ({ ...v, salesman: v.salesman.name })));

  if (modules.includes("workers")) {
    const w = d.workers;
    tableSheet(wb, "أداء البيّاعين", "أداء البيّاعين (المبيعات)", d, [
      { header: "البيّاع", key: "name", width: 20 },
      { header: "الزيارات", key: "visits", width: 10, fmt: "0", total: "sum" },
      { header: "اشترى منها", key: "won", width: 10, fmt: "0", total: "sum" },
      { header: "نسبة البيع من الزيارات", key: "conversionRate", width: 15, fmt: "0.0%", total: "avg" },
      { header: "عربيات اتباعت", key: "carsSold", width: 12, fmt: "0", total: "sum" },
      { header: "إجمالي المبيعات", key: "totalSales", width: 17, fmt: EGP, total: "sum" },
      { header: "متوسط السعر", key: "avgPrice", width: 16, fmt: EGP, total: "avg" },
      { header: "كاش", key: "cash", width: 8, fmt: "0", total: "sum" },
      { header: "تقسيط / تمويل", key: "financed", width: 12, fmt: "0", total: "sum" },
      { header: "لسه متسلمتش", key: "pendingDelivery", width: 12, fmt: "0", total: "sum" },
      { header: "متوسط أيام التسليم", key: "avgDeliveryDays", width: 14, fmt: "0.0", total: "avg" },
      { header: "شكاوى على عربياته", key: "complaints", width: 14, fmt: "0", total: "sum" },
      { header: "شكاوى حالة التسليم", key: "deliveryComplaints", width: 14, fmt: "0", total: "sum" },
      { header: "نسبة الشكاوى للمبيعات", key: "complaintRate", width: 15, fmt: "0.0%", total: "avg" },
      { header: "رضا العملاء (من 5)", key: "csat", width: 14, fmt: "0.0", total: "avg" },
    ], w.salesmen.map((x) => ({ ...x, complaintRate: x.complaintRate / 100, conversionRate: x.conversionRate / 100 })));
    compareSheet(wb, d);
    tableSheet(wb, "أداء الفنيين", "أداء الفنيين", d, [
      { header: "الفني", key: "name", width: 20 },
      { header: "أوامر الشغل", key: "jobs", width: 11, fmt: "0", total: "sum" },
      { header: "نسبة الإنجاز", key: "completionRate", width: 12, fmt: "0.0%", total: "avg" },
      { header: "ساعات الشغل", key: "laborHours", width: 12, fmt: "0.0", total: "sum" },
      { header: "متوسط التسليم (ساعة)", key: "avgTurnaroundHrs", width: 15, fmt: "0.0", total: "avg" },
      { header: "رجعت تاني", key: "comebacks", width: 10, fmt: "0", total: "sum" },
      { header: "نسبة الرجوع", key: "comebackRate", width: 11, fmt: "0.0%", total: "avg" },
      { header: "عيوب متكلف بيها", key: "defects", width: 13, fmt: "0", total: "sum" },
      { header: "نسبة الإصلاح", key: "fixRate", width: 12, fmt: "0.0%", total: "avg" },
      { header: "متوسط أيام الإصلاح", key: "avgFixDays", width: 14, fmt: "0.0", total: "avg" },
      { header: "قيمة الشغل", key: "revenue", width: 15, fmt: EGP, total: "sum" },
    ], w.technicians.map((t) => ({ ...t, completionRate: t.completionRate / 100, comebackRate: t.comebackRate / 100, fixRate: t.fixRate / 100 })));
    tableSheet(wb, "أداء الفاحصين", "أداء الفاحصين", d, [
      { header: "الفاحص", key: "name", width: 20 },
      { header: "عدد الفحوصات", key: "inspections", width: 13, fmt: "0", total: "sum" },
      { header: "بنود اتفحصت", key: "itemsChecked", width: 13, fmt: "0", total: "sum" },
      { header: "مشاكل اكتشفها", key: "issuesFound", width: 13, fmt: "0", total: "sum" },
      { header: "فحوصات غير مطابقة", key: "failed", width: 15, fmt: "0", total: "sum" },
      { header: "نسبة الاكتشاف", key: "detectionRate", width: 13, fmt: "0.0%", total: "avg" },
      { header: "متوسط المطابقة", key: "avgScore", width: 13, fmt: "0.0%", total: "avg" },
    ], w.inspectors.map((i) => ({ ...i, detectionRate: i.detectionRate / 100, avgScore: i.avgScore / 100 })));
    tableSheet(wb, "أمناء المخزن", "أمناء المخزن — العيوب على العربيات اللي في عهدتهم", d, [
      { header: "أمين المخزن", key: "name", width: 22 },
      { header: "عيوب على عربياته", key: "defects", width: 15, fmt: "0", total: "sum" },
      { header: "لسه مفتوحة", key: "open", width: 12, fmt: "0", total: "sum" },
      { header: "عالية / حرجة", key: "critical", width: 12, fmt: "0", total: "sum" },
      { header: "تكلفة الإصلاح", key: "cost", width: 15, fmt: EGP, total: "sum" },
    ], w.keepers);
  }

  if (modules.includes("branches") && d.branches.length)
    comparisonSheet(wb, d, "جودة الفروع", d.branches.map((b) => b.name), compareBranches(d.branches));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
