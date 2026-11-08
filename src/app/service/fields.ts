import type { Field } from "@/components/RecordForm";
import { JOB_TYPES, JOB_STATUSES, options } from "@/lib/constants";
import { toInputDate } from "@/lib/format";

type Opt = { value: number; label: string }[];
export const fields = (vehicles: Opt): Field[] => [
  { name: "vehicleId", label: "العربية", type: "select", options: vehicles, required: true, full: true },
  { name: "roNumber", label: "رقم أمر الشغل", required: true, ltr: true },
  { name: "jobType", label: "نوع الشغلانة", type: "select", options: JOB_TYPES, required: true },
  { name: "technician", label: "الفني" },
  { name: "status", label: "الحالة", type: "select", options: options(JOB_STATUSES), required: true },
  { name: "openedAt", label: "تاريخ الفتح", type: "date", required: true },
  { name: "closedAt", label: "تاريخ التسليم", type: "date" },
  { name: "laborHours", label: "ساعات الشغل", type: "number", step: "0.1" },
  { name: "laborCost", label: "المصنعية (ج.م)", type: "number", step: "0.01" },
  { name: "partsCost", label: "قطع الغيار (ج.م)", type: "number", step: "0.01" },
  { name: "isComeback", label: "العربية رجعت تاني لنفس العطل (Comeback)", type: "checkbox" },
];
export const newDefaults = () => ({ openedAt: toInputDate(new Date()), status: "Open" });
