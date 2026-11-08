import type { Field } from "@/components/RecordForm";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, options } from "@/lib/constants";
import { toInputDate } from "@/lib/format";

type Opt = { value: number; label: string }[];
export const fields = (vehicles: Opt, branches: Opt = []): Field[] => [
  { name: "customerName", label: "اسم العميل", required: true },
  { name: "contact", label: "الموبايل / الإيميل", ltr: true },
  { name: "vehicleId", label: "العربية (اختياري)", type: "select", options: vehicles, full: true },
  { name: "branchId", label: "الفرع (لو فاضي هياخد فرع العربية)", type: "select", options: branches },
  { name: "category", label: "نوع الشكوى", type: "select", options: COMPLAINT_CATEGORIES, required: true },
  { name: "date", label: "تاريخ الشكوى", type: "date", required: true },
  { name: "description", label: "تفاصيل الشكوى", type: "textarea", required: true },
  { name: "status", label: "الحالة", type: "select", options: options(COMPLAINT_STATUSES), required: true },
  { name: "resolvedAt", label: "تاريخ الحل", type: "date" },
  { name: "satisfaction", label: "رضا العميل (من 1 لـ 5)", type: "select",
    options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: "★".repeat(n) + ` (${n})` })) },
];
export const newDefaults = () => ({ date: toInputDate(new Date()), status: "Open" });
