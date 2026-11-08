"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { branchSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createBranch(_: FormState, fd: FormData) {
  return runForm(branchSchema, fd, (data) => prisma.branch.create({ data }), "/branches");
}
export async function updateBranch(id: number, _: FormState, fd: FormData) {
  return runForm(branchSchema, fd, (data) => prisma.branch.update({ where: { id }, data }), "/branches");
}
/** Only empty branches can be deleted; otherwise ask to mark it closed. */
export async function deleteBranch(id: number) {
  const b = await prisma.branch.findUnique({ where: { id }, select: { _count: { select: { vehicles: true, salesmen: true, complaints: true } } } });
  if (b && b._count.vehicles + b._count.salesmen + b._count.complaints > 0) redirect(`/branches/${id}/edit?used=1`);
  await prisma.branch.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/branches");
}
