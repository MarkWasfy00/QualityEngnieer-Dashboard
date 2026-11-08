import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import InspectionCertificate from "@/lib/export/pdf/InspectionCertificate";
import { attachment } from "@/lib/export/request";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const i = await prisma.inspection.findUnique({ where: { id }, include: { vehicle: { include: { branch: true } }, items: { orderBy: { id: "asc" } } } });
  if (!i) return new Response("Not found", { status: 404 });
  const buf = await renderToBuffer(<InspectionCertificate i={i} />);
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": attachment(`inspection-${i.id}-${i.vehicle.vin}.pdf`, `تقرير-فحص-${i.id}-${i.vehicle.vin}.pdf`) },
  });
}
