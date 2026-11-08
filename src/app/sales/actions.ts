"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { saleSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createSale(_: FormState, fd: FormData) {
  return runForm(saleSchema, fd, (data) => prisma.sale.create({ data }), "/sales");
}
export async function updateSale(id: number, _: FormState, fd: FormData) {
  return runForm(saleSchema, fd, (data) => prisma.sale.update({ where: { id }, data }), "/sales");
}
export async function deleteSale(id: number) {
  await prisma.sale.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/sales");
}
