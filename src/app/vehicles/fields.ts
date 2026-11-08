import type { Field } from "@/components/RecordForm";
import { CONDITIONS, options } from "@/lib/constants";

type Opt = { value: number; label: string }[];
export const vehicleFields = (branches: Opt, storages: string[] = []): Field[] => [
  { name: "vin", label: "رقم الشاسيه (VIN)", required: true, placeholder: "17 حرف/رقم", ltr: true },
  { name: "warehouseName", label: "اسم المخزن", placeholder: "مثلاً: مخزن العبور", suggestions: storages },
  { name: "warehouseKeeper", label: "اسم أمين المخزن", placeholder: "مثلاً: أ. محمد علي" },
  { name: "make", label: "الماركة", required: true, placeholder: "مثلاً: هيونداي" },
  { name: "model", label: "الموديل", required: true, placeholder: "مثلاً: إلنترا" },
  { name: "year", label: "سنة الصنع", type: "number", required: true },
  { name: "mileage", label: "العداد (كم)", type: "number" },
  { name: "color", label: "اللون" },
  { name: "branchId", label: "الفرع", type: "select", options: branches },
  { name: "condition", label: "الحالة", type: "select", options: options(CONDITIONS), required: true },
];
