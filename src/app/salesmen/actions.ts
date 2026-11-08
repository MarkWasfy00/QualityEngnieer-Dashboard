"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { salesmanSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createSalesman(_: FormState, fd: FormData) {
  return runForm(salesmanSchema, fd, (data) => prisma.salesman.create({ data }), "/salesmen");
}
export async function updateSalesman(id: number, _: FormState, fd: FormData) {
  return runForm(salesmanSchema, fd, (data) => prisma.salesman.update({ where: { id }, data }), "/salesmen");
}
/** Only salesmen with no sales/visits can be deleted; otherwise ask to deactivate. */
export async function deleteSalesman(id: number) {
  const used = await prisma.salesman.findUnique({ where: { id }, select: { _count: { select: { sales: true, visits: true } } } });
  if (used && used._count.sales + used._count.visits > 0) redirect(`/salesmen/${id}/edit?used=1`);
  await prisma.salesman.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/salesmen");
}
