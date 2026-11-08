"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { defectSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createDefect(_: FormState, fd: FormData) {
  return runForm(defectSchema, fd, (data) => prisma.defect.create({ data }), "/defects");
}
export async function updateDefect(id: number, _: FormState, fd: FormData) {
  return runForm(defectSchema, fd, (data) => prisma.defect.update({ where: { id }, data }), "/defects");
}
export async function deleteDefect(id: number) {
  await prisma.defect.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/defects");
}
