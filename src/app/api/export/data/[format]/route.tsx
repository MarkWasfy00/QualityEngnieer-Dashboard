import { renderToBuffer } from "@react-pdf/renderer";
import { fmtDate, toInputDate } from "@/lib/format";
import { loadDataset } from "@/lib/datasets/store";
import { applyFilters, computeReport, describeFilters, type Query } from "@/lib/datasets/report";
import { buildDatasetWorkbook } from "@/lib/datasets/excel";
import DatasetReport from "@/lib/export/pdf/DatasetReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/export/data/<layout>?from&to&<filters>[&type=xlsx][&download=1] → PDF report (default) or Excel workbook. */
export async function GET(req: Request, { params }: { params: Promise<{ format: string }> }) {
  const { format: id } = await params;
  const ds = await loadDataset(decodeURIComponent(id));
  if (!ds) return new Response("مش لاقي النوع ده", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const q: Query = Object.fromEntries(sp.entries());
  const filters = describeFilters(ds.format, q, (d) => fmtDate(d));
  const stamp = toInputDate(new Date());
  const name = `${ds.format.title.replace(/[\\/:*?"<>|()]/g, "").trim()}-${stamp}`;
  const disp = (ext: string, attach: boolean) =>
    `${attach ? "attachment" : "inline"}; filename="${ds.format.id}-${stamp}.${ext}"; filename*=UTF-8''${encodeURIComponent(`${name}.${ext}`)}`;

  if (q.type === "xlsx") {
    const d = computeReport(ds.format, ds.rows, q, { tableLimit: 0 });
    const buf = await buildDatasetWorkbook(ds.format, d, applyFilters(ds.format, ds.rows, q), filters);
    return new Response(new Uint8Array(buf as ArrayBuffer), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": disp("xlsx", true) },
    });
  }
  const d = computeReport(ds.format, ds.rows, q, { tableLimit: 0 });
  const buf = await renderToBuffer(<DatasetReport title={ds.format.title} d={d} filters={filters} source={ds.last?.fileName} />);
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": disp("pdf", !!sp.get("download")) } });
}
