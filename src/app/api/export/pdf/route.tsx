import { renderToBuffer } from "@react-pdf/renderer";
import { getReportData } from "@/lib/kpis";
import Report from "@/lib/export/pdf/Report";
import { readExportParams, attachment } from "@/lib/export/request";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { range, modules, period, stamp } = readExportParams(req.url);
  const buf = await renderToBuffer(<Report d={await getReportData(range)} modules={modules} period={period} />);
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": attachment(`quality-report-${stamp}.pdf`, `تقرير-الجودة-${stamp}.pdf`) },
  });
}
