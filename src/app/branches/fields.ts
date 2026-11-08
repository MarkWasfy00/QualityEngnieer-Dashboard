import type { Field } from "@/components/RecordForm";

export const fields: Field[] = [
  { name: "name", label: "اسم الفرع", required: true, placeholder: "مثلاً: فرع مدينة نصر" },
  { name: "city", label: "المدينة / المنطقة", placeholder: "مثلاً: القاهرة" },
  { name: "manager", label: "مدير الفرع" },
  { name: "active", label: "الفرع شغال (بيظهر في القوايم)", type: "checkbox" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
];
