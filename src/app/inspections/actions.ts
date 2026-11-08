"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { inspectionSchema, scoreInspection } from "@/lib/validators";
import type { FormState } from "@/components/RecordForm";

function parse(fd: FormData) {
  let items: unknown = [];
  try { items = JSON.parse(String(fd.get("items") ?? "[]")); } catch {}
  return inspectionSchema.safeParse({ ...Object.fromEntries(fd.entries()), items });
}

async function save(id: number | null, fd: FormData): Promise<FormState> {
  const p = parse(fd);
  if (!p.success) return { errors: z.flattenError(p.error).fieldErrors as Record<string, string[]> };
  const { items, ...rest } = p.data;
  const data = { ...rest, ...scoreInspection(items) };
  const rec = id
    ? await prisma.$transaction(async (tx) => {
        await tx.inspectionItem.deleteMany({ where: { inspectionId: id } });
        return tx.inspection.update({ where: { id }, data: { ...data, items: { create: items } } });
      })
    : await prisma.inspection.create({ data: { ...data, items: { create: items } } });
  revalidatePath("/", "layout");
  redirect(`/inspections/${rec.id}`);
}

export async function createInspection(_: FormState, fd: FormData) { return save(null, fd); }
export async function updateInspection(id: number, _: FormState, fd: FormData) { return save(id, fd); }
export async function deleteInspection(id: number) {
  await prisma.inspection.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/inspections");
}
