import ExcelJS from "exceljs";
import { renderToBuffer } from "@react-pdf/renderer";
import { parseRange } from "@/lib/kpis";
import { DEALERSHIP_NAME } from "@/lib/constants";
import { fmtDate, toInputDate } from "@/lib/format";
import { SECTIONS, filtersLabel } from "@/lib/export/sections";
import { tableSheet, EGP, DATE, type Col } from "@/lib/export/excel";
import SectionReport from "@/lib/export/pdf/SectionReport";

export const runtime = "nodejs";

const FMT: Record<string, string | undefined> = { date: DATE, money: EGP, int: "0", num: "0.0", pct: "0.0%" };

/** GET /api/export/section/<name>?format=pdf|xlsx&from&to[&download=1] (+ salesmanId/outcome for visits) */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const sec = SECTIONS[name];
  if (!sec) return new Response("Unknown section", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const range = sec.dated ? parseRange({ from: sp.get("from"), to: sp.get("to") }) : {};
  const rows = await sec.load(range, sp);
  const filters = sec.dated ? await filtersLabel(range, sp, fmtDate) : "كل السجلات";
  const stamp = toInputDate(new Date());
  const file = (ext: string) => `filename="${name}-${stamp}.${ext}"; filename*=UTF-8''${encodeURIComponent(`${sec.title}-${stamp}.${ext}`)}`;

  if (sp.get("format") === "xlsx") {
    const wb = new ExcelJS.Workbook();
    wb.creator = DEALERSHIP_NAME;
    const cols: Col[] = sec.cols.map((c, i) => ({
      header: c.header, key: `c${i}`, width: c.width, fmt: FMT[c.kind ?? ""],
      badge: c.kind === "badge", code: c.kind === "code", total: c.total,
      center: c.kind === "latin" || c.kind === "int",
    }));
    const data = rows.map((r) => Object.fromEntries(sec.cols.map((c, i) => {
      const v = c.get(r);
      return [`c${i}`, c.kind === "pct" && v != null ? Number(v) / 100 : v ?? null];
    })));
    tableSheet(wb, sec.sheet, `${sec.title} — ${filters}`, { range }, cols, data);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; ${file("xlsx")}`,
      },
    });
  }

  const buf = await renderToBuffer(<SectionReport sec={sec} rows={rows} filters={filters} />);
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `${sp.get("download") ? "attachment" : "inline"}; ${file("pdf")}` },
  });
}
