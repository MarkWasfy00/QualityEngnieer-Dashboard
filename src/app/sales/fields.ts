import type { Field } from "@/components/RecordForm";
import { PAYMENT_TYPES, options } from "@/lib/constants";
import { toInputDate } from "@/lib/format";

type Opt = { value: number; label: string }[];
export const fields = (vehicles: Opt, salesmen: Opt): Field[] => [
  { name: "vehicleId", label: "العربية", type: "select", options: vehicles, required: true, full: true },
  { name: "salesmanId", label: "البيّاع", type: "select", options: salesmen, required: true },
  { name: "saleDate", label: "تاريخ البيع", type: "date", required: true },
  { name: "customerName", label: "اسم العميل", required: true },
  { name: "customerPhone", label: "موبايل العميل", ltr: true },
  { name: "price", label: "سعر البيع (ج.م)", type: "number", step: "1", required: true },
  { name: "paymentType", label: "طريقة الدفع", type: "select", options: options(PAYMENT_TYPES), required: true },
  { name: "deliveredAt", label: "تاريخ تسليم العربية", type: "date" },
  { name: "notes", label: "ملاحظات", type: "textarea" },
];
export const newDefaults = () => ({ saleDate: toInputDate(new Date()), paymentType: "Cash" });
