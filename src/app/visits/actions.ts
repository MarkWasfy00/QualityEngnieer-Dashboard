"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { visitSchema, bulkVisitSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createVisit(_: FormState, fd: FormData) {
  return runForm(visitSchema, fd, (data) => prisma.visit.create({ data }), "/visits");
}
export async function updateVisit(id: number, _: FormState, fd: FormData) {
  return runForm(visitSchema, fd, (data) => prisma.visit.update({ where: { id }, data }), "/visits");
}
export async function deleteVisit(id: number) {
  await prisma.visit.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/visits");
}

/** Bulk: one form → up to 3 grouped rows (bought / still deciding / didn't buy). */
export async function createBulkVisits(_: FormState, fd: FormData) {
  return runForm(bulkVisitSchema, fd, async ({ total, won, followUp, ...base }) => {
    const lost = total - won - followUp;
    const rows = ([["Won", won], ["FollowUp", followUp], ["Lost", lost]] as const)
      .filter(([, n]) => n > 0)
      .map(([outcome, count]) => ({ ...base, outcome, count }));
    await prisma.visit.createMany({ data: rows });
  }, "/visits");
}
