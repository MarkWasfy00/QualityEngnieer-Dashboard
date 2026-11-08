"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { serviceJobSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createServiceJob(_: FormState, fd: FormData) {
  return runForm(serviceJobSchema, fd, (data) => prisma.serviceJob.create({ data }), "/service");
}
export async function updateServiceJob(id: number, _: FormState, fd: FormData) {
  return runForm(serviceJobSchema, fd, (data) => prisma.serviceJob.update({ where: { id }, data }), "/service");
}
export async function deleteServiceJob(id: number) {
  await prisma.serviceJob.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/service");
}
