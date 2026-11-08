import type { Field } from "@/components/RecordForm";
import { VISIT_OUTCOMES, VISIT_SOURCES, options } from "@/lib/constants";
import { toInputDate } from "@/lib/format";

type Opt = { value: number; label: string }[];
export const fields = (salesmen: Opt): Field[] => [
  { name: "salesmanId", label: "البيّاع", type: "select", options: salesmen, required: true },
  { name: "visitDate", label: "تاريخ الزيارة", type: "date", required: true },
  { name: "count", label: "عدد الزيارات", type: "number", step: "1", required: true },
  { name: "customerName", label: "اسم العميل (مطلوب لو زيارة واحدة)" },
  { name: "customerPhone", label: "موبايل العميل", ltr: true },
  { name: "source", label: "العميل جه منين؟", type: "select", options: VISIT_SOURCES, required: true },
  { name: "interestedIn", label: "مهتم بأنهي عربية؟", placeholder: "مثلاً: هيونداي توسان 2024" },
  { name: "outcome", label: "النتيجة", type: "select", options: options(VISIT_OUTCOMES), required: true },
  { name: "notes", label: "ملاحظات", type: "textarea" },
];
export const newDefaults = () => ({ visitDate: toInputDate(new Date()), outcome: "FollowUp", count: 1 });
