import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { parseRange } from "@/lib/kpis";
import { fmtDate, toInputDate } from "@/lib/format";
import { getSalesStats } from "@/lib/sales-journal/stats";
import SalesJournalReport from "@/lib/export/pdf/SalesJournalReport";

export const runtime = "nodejs";

/** GET /api/export/sales-report?from&to&branch&brand[&download=1] → simple sales PDF from the Odoo journal. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const range = parseRange({ from: sp.get("from"), to: sp.get("to") });
  const branch = sp.get("branch") || undefined, brand = sp.get("brand") || undefined;
  const [d, last] = await Promise.all([
    getSalesStats({ ...range, branch, brand }),
    prisma.receivableImport.findFirst({ where: { kind: "journal" }, orderBy: { createdAt: "desc" } }),
  ]);
  const parts = [
    range.from || range.to ? `الفترة: ${range.from ? fmtDate(range.from) : "البداية"} لحد ${range.to ? fmtDate(range.to) : "النهارده"}` : "كل الفترات",
    branch && `الفرع: ${branch}`, brand && `الماركة: ${brand}`,
  ].filter(Boolean);
  const buf = await renderToBuffer(<SalesJournalReport d={d} filters={parts.join(" · ")} source={last?.fileName} />);
  const stamp = toInputDate(new Date());
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${sp.get("download") ? "attachment" : "inline"}; filename="sales-report-${stamp}.pdf"; filename*=UTF-8''${encodeURIComponent(`تقرير-المبيعات-${stamp}.pdf`)}`,
    },
  });
}
