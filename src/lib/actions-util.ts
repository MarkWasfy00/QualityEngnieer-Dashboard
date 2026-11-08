import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { FormState } from "@/components/RecordForm";
import { prisma } from "./db";

/** Validate FormData against a schema, run the DB write, then redirect. */
export async function runForm<S extends z.ZodType>(
  schema: S, formData: FormData, write: (data: z.output<S>) => Promise<unknown>, path: string,
): Promise<FormState> {
  const raw = Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$")));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  try {
    await write(parsed.data);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { message: "فيه سجل متسجل بنفس البيانات دي قبل كده (زي رقم الشاسيه أو اسم البيّاع أو الفرع)." };
    return { message: "معرفناش نحفظ: " + (e as Error).message };
  }
  revalidatePath("/", "layout");
  redirect(path);
}

export async function vehicleOptions() {
  const vs = await prisma.vehicle.findMany({ orderBy: [{ make: "asc" }, { model: "asc" }] });
  return vs.map((v) => ({ value: v.id, label: `${v.make} ${v.model} ${v.year} — شاسيه ${v.vin.slice(-6)}` }));
}

/** Salesmen for drop-downs: active ones, plus the currently selected one even if inactive. */
export async function salesmanOptions(currentId?: number | null) {
  const ms = await prisma.salesman.findMany({
    where: { OR: [{ active: true }, ...(currentId ? [{ id: currentId }] : [])] },
    orderBy: { name: "asc" },
  });
  return ms.map((m) => ({ value: m.id, label: m.active ? m.name : `${m.name} (موقوف)` }));
}

/** Branches for drop-downs: active ones, plus the currently selected one even if inactive. */
export async function branchOptions(currentId?: number | null) {
  const bs = await prisma.branch.findMany({
    where: { OR: [{ active: true }, ...(currentId ? [{ id: currentId }] : [])] },
    orderBy: { name: "asc" },
  });
  return bs.map((b) => ({ value: b.id, label: b.active ? b.name : `${b.name} (مقفول)` }));
}

/** Storage names already used, for autocomplete. */
export async function storageNames() {
  const rows = await prisma.vehicle.findMany({ where: { warehouseName: { not: null } }, select: { warehouseName: true }, distinct: ["warehouseName"] });
  return rows.map((r) => r.warehouseName!).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
}

/** Real number of visits per salesman (bulk rows carry a count). */
export async function visitTotals() {
  const g = await prisma.visit.groupBy({ by: ["salesmanId"], _sum: { count: true } });
  return new Map(g.map((x) => [x.salesmanId, x._sum.count ?? 0]));
}
