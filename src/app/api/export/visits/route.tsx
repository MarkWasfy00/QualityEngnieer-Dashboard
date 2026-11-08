import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { parseRange } from "@/lib/kpis";
import { label } from "@/lib/constants";
import { fmtDate, toInputDate } from "@/lib/format";
import VisitsReport from "@/lib/export/pdf/VisitsReport";

export const runtime = "nodejs";

/** Printable visits report. Query: from, to, salesmanId, outcome, download=1 (else opens inline for printing). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const range = parseRange({ from: sp.get("from"), to: sp.get("to") });
  const salesmanId = Number(sp.get("salesmanId")) || undefined;
  const outcome = sp.get("outcome") || undefined;

  const visits = await prisma.visit.findMany({
    where: {
      ...(range.from || range.to ? { visitDate: { ...(range.from && { gte: range.from }), ...(range.to && { lte: range.to }) } } : {}),
      ...(salesmanId && { salesmanId }),
      ...(outcome && { outcome }),
    },
    include: { salesman: true },
    orderBy: { visitDate: "desc" },
  });

  const salesman = salesmanId ? (await prisma.salesman.findUnique({ where: { id: salesmanId } }))?.name : undefined;
  const parts = [
    !range.from && !range.to ? "كل الفترات" : `من ${range.from ? fmtDate(range.from) : "البداية"} لحد ${range.to ? fmtDate(range.to) : "النهارده"}`,
    salesman ? `البيّاع: ${salesman}` : "كل البيّاعين",
    ...(outcome ? [`النتيجة: ${label(outcome)}`] : []),
  ];

  const buf = await renderToBuffer(<VisitsReport visits={visits} filters={parts.join(" · ")} />);
  const stamp = toInputDate(new Date());
  const disp = sp.get("download") ? "attachment" : "inline";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disp}; filename="visits-${stamp}.pdf"; filename*=UTF-8''${encodeURIComponent(`زيارات-العملاء-${stamp}.pdf`)}`,
    },
  });
}
