"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { complaintSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createComplaint(_: FormState, fd: FormData) {
  return runForm(complaintSchema, fd, (data) => prisma.complaint.create({ data }), "/complaints");
}
export async function updateComplaint(id: number, _: FormState, fd: FormData) {
  return runForm(complaintSchema, fd, (data) => prisma.complaint.update({ where: { id }, data }), "/complaints");
}
export async function deleteComplaint(id: number) {
  await prisma.complaint.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/complaints");
}
