import type { ReportData } from "./kpis";
import { money, num, pct, int } from "./format";

export type Salesman = ReportData["workers"]["salesmen"][number];
export const MAX_COMPARE = 4; // categorical colour slots kept distinguishable

export type Metric<T = Salesman> = {
  key: string;
  label: string;
  better: "high" | "low";
  value: (s: T) => number | null; // null = no data, excluded from "best"
  fmt: (n: number) => string;
  excelFmt: string;
};

const EGP = '#,##0 "ج.م"';

/** The measures compared, and which direction counts as better. */
export const METRICS: Metric[] = [
  { key: "visits", label: "عدد الزيارات", better: "high", value: (s) => s.visits, fmt: int, excelFmt: "0" },
  { key: "won", label: "زيارات اشترت", better: "high", value: (s) => s.won, fmt: int, excelFmt: "0" },
  { key: "conversionRate", label: "نسبة البيع من الزيارات", better: "high", value: (s) => (s.visits ? s.conversionRate : null), fmt: pct, excelFmt: '0.0"%"' },
  { key: "carsSold", label: "عربيات اتباعت", better: "high", value: (s) => s.carsSold, fmt: int, excelFmt: "0" },
  { key: "totalSales", label: "إجمالي المبيعات", better: "high", value: (s) => s.totalSales, fmt: money, excelFmt: EGP },
  { key: "avgPrice", label: "متوسط سعر العربية", better: "high", value: (s) => (s.carsSold ? s.avgPrice : null), fmt: money, excelFmt: EGP },
  { key: "avgDeliveryDays", label: "متوسط أيام التسليم", better: "low", value: (s) => (s.delivered ? s.avgDeliveryDays : null), fmt: (n) => `${num(n)} يوم`, excelFmt: "0.0" },
  { key: "pendingDelivery", label: "عربيات لسه متسلمتش", better: "low", value: (s) => s.pendingDelivery, fmt: int, excelFmt: "0" },
  { key: "complaints", label: "شكاوى على عربياته", better: "low", value: (s) => s.complaints, fmt: int, excelFmt: "0" },
  { key: "deliveryComplaints", label: "شكاوى حالة التسليم", better: "low", value: (s) => s.deliveryComplaints, fmt: int, excelFmt: "0" },
  { key: "complaintRate", label: "نسبة الشكاوى للمبيعات", better: "low", value: (s) => (s.carsSold ? s.complaintRate : null), fmt: pct, excelFmt: '0.0"%"' },
  { key: "csat", label: "رضا العملاء (من 5)", better: "high", value: (s) => (s.rated ? s.csat : null), fmt: (n) => num(n), excelFmt: "0.0" },
];

export type CompareRow = {
  key: string; label: string; better: "high" | "low"; excelFmt: string;
  values: (number | null)[]; shown: string[]; best: number[]; max: number;
};

/** Build metric-by-entity rows, mark the best per row, and count wins. */
export function compareEntities<T>(list: T[], metrics: Metric<T>[], eligible: (t: T) => boolean = () => true) {
  const ok = list.map(eligible);
  const rows: CompareRow[] = metrics.map((m) => {
    const values = list.map(m.value);
    // Only eligible entities with data compete for "best"
    const valid = values.filter((v, i): v is number => v != null && ok[i]);
    const target = valid.length ? (m.better === "high" ? Math.max(...valid) : Math.min(...valid)) : null;
    // A "best" only counts when the values actually differ
    const allSame = valid.length > 0 && valid.every((v) => v === valid[0]);
    const best = target == null || allSame || valid.length < 2 ? [] : values.flatMap((v, i) => (v === target && ok[i] ? [i] : []));
    return {
      key: m.key, label: m.label, better: m.better, excelFmt: m.excelFmt,
      values, shown: values.map((v) => (v == null ? "—" : m.fmt(v))), best,
      max: Math.max(0, ...values.filter((v): v is number => v != null)),
    };
  });
  const wins = list.map((_, i) => rows.filter((r) => r.best.includes(i)).length);
  const top = Math.max(0, ...wins);
  const leaders = top ? wins.flatMap((w, i) => (w === top ? [i] : [])) : [];
  return { rows, wins, leaders };
}

export const compareSalesmen = (list: Salesman[]) => compareEntities(list, METRICS);

/** Monthly sales value per salesman: [{ month, [name]: value }]. */
export function monthlySales(sales: ReportData["sales"], names: string[]) {
  const m = new Map<string, Record<string, number | string>>();
  sales.forEach((x) => {
    const who = x.salesman.name;
    if (!names.includes(who)) return;
    const key = x.saleDate.toISOString().slice(0, 7);
    const row = m.get(key) ?? Object.fromEntries([["month", key], ...names.map((n) => [n, 0])]);
    row[who] = Number(row[who] ?? 0) + x.price;
    m.set(key, row);
  });
  return [...m.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

/** Default/selected salesmen from the URL (?s=a,b), capped at MAX_COMPARE. */
export function pickSalesmen(all: Salesman[], param?: string) {
  const want = param?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  const chosen = want.length ? all.filter((s) => want.includes(s.name)) : all.filter((s) => s.name !== "غير محدد");
  return chosen.slice(0, MAX_COMPARE);
}

// ---------------- Branches ----------------
export type BranchStat = ReportData["branches"][number];

export const BRANCH_METRICS: Metric<BranchStat>[] = [
  { key: "firstPassYield", label: "نسبة النجاح من أول مرة", better: "high", value: (b) => (b.inspections ? b.firstPassYield : null), fmt: pct, excelFmt: '0.0"%"' },
  { key: "avgScore", label: "متوسط نسبة المطابقة", better: "high", value: (b) => (b.inspections ? b.avgScore : null), fmt: pct, excelFmt: '0.0"%"' },
  { key: "defectsPerVehicle", label: "عيوب لكل عربية", better: "low", value: (b) => (b.vehicles ? b.defectsPerVehicle : null), fmt: (n) => num(n, 2), excelFmt: "0.00" },
  { key: "openDefects", label: "عيوب مفتوحة", better: "low", value: (b) => (b.vehicles ? b.openDefects : null), fmt: int, excelFmt: "0" },
  { key: "criticalDefects", label: "عيوب عالية / حرجة", better: "low", value: (b) => (b.vehicles ? b.criticalDefects : null), fmt: int, excelFmt: "0" },
  { key: "avgFixDays", label: "متوسط أيام إصلاح العيب", better: "low", value: (b) => (b.fixedDefects ? b.avgFixDays : null), fmt: (n) => `${num(n)} يوم`, excelFmt: "0.0" },
  { key: "repairCostPerVehicle", label: "تكلفة الإصلاح لكل عربية", better: "low", value: (b) => (b.vehicles ? b.repairCost / b.vehicles : null), fmt: money, excelFmt: EGP },
  { key: "comebackRate", label: "نسبة رجوع العربيات", better: "low", value: (b) => (b.jobs ? b.comebackRate : null), fmt: pct, excelFmt: '0.0"%"' },
  { key: "avgTurnaroundHrs", label: "متوسط مدة التسليم (ساعة)", better: "low", value: (b) => (b.closedJobs ? b.avgTurnaroundHrs : null), fmt: (n) => num(n), excelFmt: "0.0" },
  { key: "complaintsPer100", label: "شكاوى لكل 100 عربية", better: "low", value: (b) => (b.vehicles ? b.complaintsPer100 : null), fmt: (n) => num(n), excelFmt: "0.0" },
  { key: "avgResolutionDays", label: "متوسط أيام حل الشكوى", better: "low", value: (b) => (b.resolvedComplaints ? b.avgResolutionDays : null), fmt: (n) => `${num(n)} يوم`, excelFmt: "0.0" },
  { key: "csat", label: "رضا العملاء (من 5)", better: "high", value: (b) => (b.rated ? b.csat : null), fmt: (n) => num(n), excelFmt: "0.0" },
  { key: "conversionRate", label: "نسبة البيع من الزيارات", better: "high", value: (b) => (b.visits ? b.conversionRate : null), fmt: pct, excelFmt: '0.0"%"' },
  { key: "totalSales", label: "إجمالي المبيعات", better: "high", value: (b) => (b.sales ? b.totalSales : null), fmt: money, excelFmt: EGP },
];

/** Branches with any data (or registered & active) compared on quality, service, customers and sales. */
/** "بدون فرع" is shown for information but never wins. */
export const compareBranches = (list: BranchStat[]) => compareEntities(list, BRANCH_METRICS, (b) => !b.unassigned);
