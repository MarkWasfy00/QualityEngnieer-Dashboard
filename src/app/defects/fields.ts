import type { Field } from "@/components/RecordForm";
import { DEFECT_CATEGORIES, SEVERITIES, DEFECT_STATUSES, options } from "@/lib/constants";
import { toInputDate } from "@/lib/format";

type Opt = { value: number; label: string }[];
export const fields = (vehicles: Opt): Field[] => [
  { name: "vehicleId", label: "العربية", type: "select", options: vehicles, required: true, full: true },
  { name: "category", label: "القسم", type: "select", options: DEFECT_CATEGORIES, required: true },
  { name: "severity", label: "درجة الخطورة", type: "select", options: options(SEVERITIES), required: true },
  { name: "description", label: "وصف العيب", type: "textarea", required: true },
  { name: "status", label: "الحالة", type: "select", options: options(DEFECT_STATUSES), required: true },
  { name: "technician", label: "الفني المسؤول" },
  { name: "repairCost", label: "تكلفة الإصلاح (ج.م)", type: "number", step: "0.01" },
  { name: "inspectionId", label: "رقم الفحص المرتبط", type: "number" },
  { name: "reportedAt", label: "تاريخ التسجيل", type: "date", required: true },
  { name: "fixedAt", label: "تاريخ الإصلاح", type: "date" },
];
export const newDefaults = () => ({ reportedAt: toInputDate(new Date()), status: "Open", severity: "Medium" });
