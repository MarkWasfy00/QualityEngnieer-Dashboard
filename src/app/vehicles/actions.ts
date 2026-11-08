"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { vehicleSchema } from "@/lib/validators";
import { runForm } from "@/lib/actions-util";
import type { FormState } from "@/components/RecordForm";

export async function createVehicle(_: FormState, fd: FormData) {
  return runForm(vehicleSchema, fd, (data) => prisma.vehicle.create({ data }), "/vehicles");
}
export async function updateVehicle(id: number, _: FormState, fd: FormData) {
  return runForm(vehicleSchema, fd, (data) => prisma.vehicle.update({ where: { id }, data }), "/vehicles");
}
export async function deleteVehicle(id: number) {
  await prisma.vehicle.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/vehicles");
}
