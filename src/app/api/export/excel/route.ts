import { getReportData } from "@/lib/kpis";
import { buildWorkbook } from "@/lib/export/excel";
import { readExportParams, attachment } from "@/lib/export/request";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { range, modules, stamp } = readExportParams(req.url);
  const buf = await buildWorkbook(await getReportData(range), modules);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": attachment(`quality-report-${stamp}.xlsx`, `تقرير-الجودة-${stamp}.xlsx`),
    },
  });
}
