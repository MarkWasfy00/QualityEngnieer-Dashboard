import { z } from "zod";

z.config(z.locales.ar());
import {
  CONDITIONS, PAYMENT_TYPES, VISIT_OUTCOMES, SEVERITIES, DEFECT_STATUSES, JOB_STATUSES, COMPLAINT_STATUSES, ITEM_RESULTS,
} from "./constants";

const optStr = z.string().trim().optional().transform((v) => (v ? v : null));
const reqDate = z.string().min(1, "مطلوب").transform((v) => new Date(v));
const optDate = z.string().optional().transform((v) => (v ? new Date(v) : null));
const money = z.coerce.number().min(0).default(0);

export const vehicleSchema = z.object({
  vin: z.string().trim().toUpperCase().min(11, "رقم الشاسيه لازم يكون 11 حرف على الأقل").max(17),
  warehouseName: optStr,
  warehouseKeeper: optStr,
  make: z.string().trim().min(1, "مطلوب"),
  model: z.string().trim().min(1, "مطلوب"),
  year: z.coerce.number().int().min(1950).max(2100),
  mileage: z.coerce.number().int().min(0).default(0),
  color: optStr,
  condition: z.enum(CONDITIONS),
  branchId: z.string().optional().transform((v) => (v ? Number(v) : null)),
});

export const inspectionSchema = z.object({
  vehicleId: z.coerce.number().int().positive("اختار العربية"),
  date: reqDate,
  inspector: z.string().trim().min(1, "مطلوب"),
  type: z.string().min(1, "مطلوب"),
  notes: optStr,
  items: z
    .array(z.object({
      category: z.string(),
      item: z.string().min(1),
      result: z.enum(ITEM_RESULTS),
      notes: optStr,
    }))
    .min(1, "ضيف بند واحد على الأقل"),
});

export const defectSchema = z.object({
  vehicleId: z.coerce.number().int().positive("اختار العربية"),
  inspectionId: z.string().optional().transform((v) => (v ? Number(v) : null)),
  category: z.string().min(1),
  description: z.string().trim().min(1, "مطلوب"),
  severity: z.enum(SEVERITIES),
  status: z.enum(DEFECT_STATUSES),
  technician: optStr,
  repairCost: money,
  reportedAt: reqDate,
  fixedAt: optDate,
});

export const serviceJobSchema = z.object({
  vehicleId: z.coerce.number().int().positive("اختار العربية"),
  roNumber: z.string().trim().min(1, "مطلوب"),
  jobType: z.string().min(1),
  technician: optStr,
  openedAt: reqDate,
  closedAt: optDate,
  laborHours: z.coerce.number().min(0).default(0),
  laborCost: money,
  partsCost: money,
  isComeback: z.string().optional().transform((v) => v === "on" || v === "true"),
  status: z.enum(JOB_STATUSES),
});

export const complaintSchema = z.object({
  vehicleId: z.string().optional().transform((v) => (v ? Number(v) : null)),
  branchId: z.string().optional().transform((v) => (v ? Number(v) : null)),
  customerName: z.string().trim().min(1, "مطلوب"),
  contact: optStr,
  date: reqDate,
  category: z.string().min(1),
  description: z.string().trim().min(1, "مطلوب"),
  status: z.enum(COMPLAINT_STATUSES),
  resolvedAt: optDate,
  satisfaction: z.string().optional().transform((v) => (v ? Number(v) : null)),
});

export const saleSchema = z.object({
  vehicleId: z.coerce.number().int().positive("اختار العربية"),
  salesmanId: z.coerce.number().int().positive("اختار البيّاع"),
  customerName: z.string().trim().min(1, "مطلوب"),
  customerPhone: optStr,
  saleDate: reqDate,
  price: money,
  paymentType: z.enum(PAYMENT_TYPES),
  deliveredAt: optDate,
  notes: optStr,
});

export const visitSchema = z.object({
  salesmanId: z.coerce.number().int().positive("اختار البيّاع"),
  count: z.coerce.number().int().min(1, "لازم 1 على الأقل").default(1),
  customerName: optStr,
  customerPhone: optStr,
  visitDate: reqDate,
  source: z.string().min(1, "مطلوب"),
  interestedIn: optStr,
  outcome: z.enum(VISIT_OUTCOMES),
  notes: optStr,
}).refine((v) => v.count > 1 || !!v.customerName, { message: "اسم العميل مطلوب للزيارة الفردية", path: ["customerName"] });

/** Bulk entry: N visits for one salesman, split by outcome. "Lost" = total − bought − still deciding. */
export const bulkVisitSchema = z.object({
  salesmanId: z.coerce.number().int().positive("اختار البيّاع"),
  visitDate: reqDate,
  source: z.string().min(1, "مطلوب"),
  total: z.coerce.number().int().min(1, "اكتب عدد الزيارات").max(100000),
  won: z.coerce.number().int().min(0).default(0),
  followUp: z.coerce.number().int().min(0).default(0),
  notes: optStr,
}).refine((v) => v.won + v.followUp <= v.total, {
  message: "مجموع (اشترى + لسه بيفكر) أكبر من عدد الزيارات", path: ["won"],
});

export const salesmanSchema = z.object({
  name: z.string().trim().min(2, "اكتب الاسم"),
  branchId: z.string().optional().transform((v) => (v ? Number(v) : null)),
  phone: optStr,
  hiredAt: optDate,
  active: z.string().optional().transform((v) => v === "on" || v === "true"),
  notes: optStr,
});

export const branchSchema = z.object({
  name: z.string().trim().min(2, "اكتب اسم الفرع"),
  city: optStr,
  manager: optStr,
  active: z.string().optional().transform((v) => v === "on" || v === "true"),
  notes: optStr,
});

/** Compute score (% of applicable items passed) and overall result. */
export function scoreInspection(items: { result: string }[]) {
  const applicable = items.filter((i) => i.result !== "NA");
  const passed = applicable.filter((i) => i.result === "PASS").length;
  const score = applicable.length ? (passed / applicable.length) * 100 : 100;
  return { score, result: applicable.some((i) => i.result === "FAIL") ? "FAIL" : "PASS" };
}
