import type { Field } from "@/components/RecordForm";

type Opt = { value: number; label: string }[];
export const fields = (branches: Opt): Field[] => [
  { name: "name", label: "اسم البيّاع", required: true, placeholder: "مثلاً: أ. عمرو سعيد" },
  { name: "phone", label: "الموبايل", ltr: true },
  { name: "branchId", label: "الفرع", type: "select", options: branches },
  { name: "hiredAt", label: "تاريخ التعيين", type: "date" },
  { name: "active", label: "شغال حالياً (بيظهر في القوايم)", type: "checkbox" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
];
