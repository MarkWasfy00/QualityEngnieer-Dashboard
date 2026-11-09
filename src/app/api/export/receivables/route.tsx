import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { parseRange } from "@/lib/kpis";
import { fmtDate, toInputDate } from "@/lib/format";
import { getReceivableStats } from "@/lib/receivables/stats";
import ReceivablesReport from "@/lib/export/pdf/ReceivablesReport";

export const runtime = "nodejs";

/** GET /api/export/receivables?from&to&branch&bank[&download=1] → simple PDF report. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const range = parseRange({ from: sp.get("from"), to: sp.get("to") });
  const branch = sp.get("branch") || undefined, bank = sp.get("bank") || undefined;
  const [d, last] = await Promise.all([
    getReceivableStats({ ...range, branch, bank }),
    prisma.receivableImport.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  const parts = [
    range.from || range.to ? `الفترة: ${range.from ? fmtDate(range.from) : "البداية"} لحد ${range.to ? fmtDate(range.to) : "النهارده"}` : "كل الفترات",
    branch && `الفرع: ${branch}`, bank && `البنك: ${bank}`,
  ].filter(Boolean);
  const buf = await renderToBuffer(<ReceivablesReport d={d} filters={parts.join(" · ")} source={last?.fileName} />);
  const name = `تقرير-التحصيل-${toInputDate(new Date())}.pdf`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${sp.get("download") ? "attachment" : "inline"}; filename="receivables-${toInputDate(new Date())}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
