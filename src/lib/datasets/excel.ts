import ExcelJS from "exceljs";
import { BRAND, DEALERSHIP_NAME } from "@/lib/constants";
import type { Format, Rec } from "./types";
import type { ReportView } from "./report";

const argb = (hex: string) => "FF" + hex;
const fill = (hex: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } });
const thin = { style: "thin" as const, color: { argb: argb(BRAND.border) } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const FONT = "Arial";
const EGP = '#,##0 "ج.م"';
const align: Partial<ExcelJS.Alignment> = { readingOrder: "rtl", vertical: "middle", horizontal: "right", wrapText: true };

function sheet(wb: ExcelJS.Workbook, name: string) {
  const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ rightToLeft: true, showGridLines: false }] });
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  ws.headerFooter = { oddFooter: `&C&8صفحة &P من &N&R&8${DEALERSHIP_NAME}` };
  return ws;
}
function header(row: ExcelJS.Row) {
  row.eachCell((c) => { c.font = { name: FONT, bold: true, color: { argb: "FFFFFFFF" } }; c.fill = fill(BRAND.blue); c.border = box; c.alignment = { ...align, horizontal: "center" }; });
  row.height = 22;
}

/** Workbook with the report summary (numbers + every breakdown) and all the filtered rows. */
export async function buildDatasetWorkbook(fmt: Format, d: ReportView, rows: Rec[], filters: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = DEALERSHIP_NAME;
  const ws = sheet(wb, "الملخص");
  ws.columns = [{ width: 38 }, ...Array.from({ length: 7 }, () => ({ width: 18 }))];
  const t = ws.addRow([fmt.title]);
  ws.mergeCells(t.number, 1, t.number, 8);
  t.getCell(1).font = { name: FONT, bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  t.getCell(1).fill = fill(BRAND.navy); t.getCell(1).alignment = align; t.height = 30;
  const sub = ws.addRow([`${filters} · ${d.count.toLocaleString("en")} سطر · اتعمل يوم ${new Date().toLocaleDateString("ar-EG-u-nu-latn")}`]);
  ws.mergeCells(sub.number, 1, sub.number, 8);
  sub.getCell(1).font = { name: FONT, color: { argb: argb(BRAND.muted) } }; sub.getCell(1).alignment = align;
  if (d.summary) {
    const r = ws.addRow([d.summary]);
    ws.mergeCells(r.number, 1, r.number, 8);
    r.getCell(1).alignment = align; r.getCell(1).font = { name: FONT }; r.getCell(1).fill = fill(BRAND.light);
    r.height = Math.max(30, Math.ceil(d.summary.length / 120) * 18);
  }
  ws.addRow([]);
  header(ws.addRow(["المؤشر", "القيمة", "ملاحظة"]));
  for (const k of d.kpis) {
    const r = ws.addRow([k.label, k.value, k.hint ?? ""]);
    r.eachCell((c) => { c.border = box; c.alignment = align; c.font = { name: FONT, bold: Number(c.col) === 2 }; });
  }
  for (const b of d.breakdowns) {
    ws.addRow([]);
    const tr = ws.addRow([b.title]);
    tr.getCell(1).font = { name: FONT, bold: true, size: 12, color: { argb: argb(BRAND.navy) } };
    header(ws.addRow(["الاسم", ...b.columns.map((c) => c.label)]));
    b.rows.forEach((g, i) => {
      const r = ws.addRow([g.name, ...g.values.map((v) => (v == null ? "" : Math.round(v * 100) / 100))]);
      r.eachCell((c) => {
        c.border = box; c.alignment = align; c.font = { name: FONT };
        if (i % 2) c.fill = fill(BRAND.zebra);
        const f = b.columns[Number(c.col) - 2]?.fmt;
        if (f) c.numFmt = f === "money" ? EGP : f === "pct" ? '0.0"%"' : f === "days" ? '0 "يوم"' : "#,##0";
      });
    });
  }

  const data = sheet(wb, "البيانات");
  const fields = fmt.fields.filter((f) => rows.some((r) => r[f.key] != null && r[f.key] !== ""));
  data.columns = fields.map((f) => ({ width: f.type === "text" ? 30 : f.type === "money" ? 16 : 14 }));
  header(data.addRow(fields.map((f) => f.label)));
  data.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  data.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, fields.length) } };
  for (const r of rows) {
    data.addRow(fields.map((f) => {
      const v = r[f.key];
      return f.type === "date" && typeof v === "string" ? new Date(v + "T00:00:00Z") : v ?? null;
    }));
  }
  fields.forEach((f, i) => {
    const c = data.getColumn(i + 1);
    c.numFmt = f.type === "money" ? EGP : f.type === "date" ? "dd/mm/yyyy" : f.type === "pct" ? '0.0"%"' : f.type === "int" ? "#,##0" : "";
    c.alignment = align;
    c.font = { name: FONT };
  });
  return wb.xlsx.writeBuffer();
}
