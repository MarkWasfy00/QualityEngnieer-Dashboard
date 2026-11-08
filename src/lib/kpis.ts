import { prisma } from "./db";
import { SEVERITIES, DEFECT_STATUSES, COMPLAINT_STATUSES } from "./constants";

export type Range = { from?: Date; to?: Date };

export function parseRange(sp: { from?: string | null; to?: string | null }): Range {
  const from = sp.from ? new Date(sp.from + "T00:00:00") : undefined;
  const to = sp.to ? new Date(sp.to + "T23:59:59") : undefined;
  return {
    from: from && !isNaN(+from) ? from : undefined,
    to: to && !isNaN(+to) ? to : undefined,
  };
}

const between = (r: Range) =>
  r.from || r.to ? { ...(r.from && { gte: r.from }), ...(r.to && { lte: r.to }) } : undefined;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const countBy = <T,>(xs: T[], key: (x: T) => string, order?: readonly string[]) => {
  const m = new Map<string, number>();
  order?.forEach((k) => m.set(k, 0));
  xs.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value }));
};
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Single source of truth for dashboard, Excel and PDF numbers. */
export async function getReportData(range: Range = {}) {
  const [inspections, defects, jobs, complaints, vehicleCount, sales, allSales, visits] = await Promise.all([
    prisma.inspection.findMany({
      where: { date: between(range) },
      include: { vehicle: true, items: true },
      orderBy: { date: "desc" },
    }),
    prisma.defect.findMany({
      where: { reportedAt: between(range) },
      include: { vehicle: true },
      orderBy: { reportedAt: "desc" },
    }),
    prisma.serviceJob.findMany({
      where: { openedAt: between(range) },
      include: { vehicle: true },
      orderBy: { openedAt: "desc" },
    }),
    prisma.complaint.findMany({
      where: { date: between(range) },
      include: { vehicle: true },
      orderBy: { date: "desc" },
    }),
    prisma.vehicle.count(),
    prisma.sale.findMany({
      where: { saleDate: between(range) },
      include: { vehicle: true, salesman: true },
      orderBy: { saleDate: "desc" },
    }),
    prisma.sale.findMany({ select: { vehicleId: true, saleDate: true, salesman: { select: { name: true } } }, orderBy: { saleDate: "asc" } }),
    prisma.visit.findMany({ where: { visitDate: between(range) }, include: { salesman: true }, orderBy: { visitDate: "desc" } }),
  ]);
  const activeSalesmen = await prisma.salesman.findMany({ where: { active: true }, select: { name: true } });
  const [branchList, vehiclesByBranch] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.vehicle.groupBy({ by: ["branchId"], _count: { _all: true } }),
  ]);

  const passed = inspections.filter((i) => i.result === "PASS").length;
  const openDefects = defects.filter((d) => d.status === "Open" || d.status === "In Progress");
  const closedJobs = jobs.filter((j) => j.closedAt);
  const resolved = complaints.filter((c) => c.resolvedAt);
  const rated = complaints.filter((c) => c.satisfaction != null);

  const kpis = {
    vehicles: vehicleCount,
    inspections: inspections.length,
    firstPassYield: inspections.length ? (passed / inspections.length) * 100 : 0,
    avgInspectionScore: avg(inspections.map((i) => i.score)),
    defects: defects.length,
    openDefects: openDefects.length,
    criticalOpen: openDefects.filter((d) => d.severity === "Critical").length,
    totalRepairCost: defects.reduce((a, d) => a + d.repairCost, 0),
    avgRepairCost: avg(defects.map((d) => d.repairCost)),
    serviceJobs: jobs.length,
    comebackRate: jobs.length ? (jobs.filter((j) => j.isComeback).length / jobs.length) * 100 : 0,
    avgTurnaroundHrs: avg(closedJobs.map((j) => (+j.closedAt! - +j.openedAt) / HOUR)),
    totalServiceCost: jobs.reduce((a, j) => a + j.laborCost + j.partsCost, 0),
    complaints: complaints.length,
    openComplaints: complaints.filter((c) => c.status === "Open" || c.status === "Investigating").length,
    avgResolutionDays: avg(resolved.map((c) => (+c.resolvedAt! - +c.date) / DAY)),
    csat: avg(rated.map((c) => c.satisfaction!)),
  };

  // Monthly inspection trend
  const monthMap = new Map<string, { month: string; pass: number; fail: number }>();
  [...inspections].reverse().forEach((i) => {
    const key = i.date.toISOString().slice(0, 7);
    const row = monthMap.get(key) ?? { month: key, pass: 0, fail: 0 };
    if (i.result === "PASS") row.pass++; else row.fail++;
    monthMap.set(key, row);
  });

  const costByJob = new Map<string, { name: string; labor: number; parts: number; count: number }>();
  jobs.forEach((j) => {
    const r = costByJob.get(j.jobType) ?? { name: j.jobType, labor: 0, parts: 0, count: 0 };
    r.labor += j.laborCost; r.parts += j.partsCost; r.count++;
    costByJob.set(j.jobType, r);
  });

  const breakdowns = {
    defectsByCategory: countBy(defects, (d) => d.category).sort((a, b) => b.value - a.value),
    defectsBySeverity: countBy(defects, (d) => d.severity, SEVERITIES),
    defectsByStatus: countBy(defects, (d) => d.status, DEFECT_STATUSES),
    inspectionTrend: [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    costByJobType: [...costByJob.values()].sort((a, b) => b.labor + b.parts - (a.labor + a.parts)),
    complaintsByStatus: countBy(complaints, (c) => c.status, COMPLAINT_STATUSES),
    complaintsByCategory: countBy(complaints, (c) => c.category).sort((a, b) => b.value - a.value),
  };

  return {
    range, inspections, defects, jobs, complaints, sales, visits, kpis, breakdowns,
    branches: branchStats(branchList, vehiclesByBranch.map((g) => ({ branchId: g.branchId, count: g._count._all })), {
      inspections, defects, jobs, complaints, sales, visits,
    }),
    workers: { ...workerStats(inspections, defects, jobs), salesmen: salesmanStats(sales, allSales, complaints, visits, activeSalesmen.map((m) => m.name)) },
  };
}

const rate = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
const name = (n: string | null | undefined) => n?.trim() || "غير محدد";

type Insp = { inspector: string; score: number; result: string; items: { result: string }[] };
type Def = { technician: string | null; status: string; severity: string; repairCost: number; reportedAt: Date; fixedAt: Date | null; vehicle: { warehouseKeeper: string | null } };
type Job = { technician: string | null; status: string; isComeback: boolean; laborHours: number; laborCost: number; partsCost: number; openedAt: Date; closedAt: Date | null };

/** Per-worker performance for technicians, inspectors and warehouse keepers. */
export function workerStats(inspections: Insp[], defects: Def[], jobs: Job[]) {
  const group = <T,>(xs: T[], key: (x: T) => string) => {
    const m = new Map<string, T[]>();
    xs.forEach((x) => m.set(key(x), [...(m.get(key(x)) ?? []), x]));
    return m;
  };

  // Technicians: service jobs + defects assigned to them
  const techJobs = group(jobs, (j) => name(j.technician));
  const techDefs = group(defects, (d) => name(d.technician));
  const techNames = [...new Set([...techJobs.keys(), ...techDefs.keys()])];
  const technicians = techNames.map((n) => {
    const js = techJobs.get(n) ?? [], ds = techDefs.get(n) ?? [];
    const done = js.filter((j) => j.closedAt);
    const fixed = ds.filter((d) => d.fixedAt);
    const comebacks = js.filter((j) => j.isComeback).length;
    return {
      name: n,
      jobs: js.length,
      completed: done.length,
      completionRate: rate(done.length, js.length),
      laborHours: js.reduce((a, j) => a + j.laborHours, 0),
      revenue: js.reduce((a, j) => a + j.laborCost + j.partsCost, 0),
      avgTurnaroundHrs: avg(done.map((j) => (+j.closedAt! - +j.openedAt) / HOUR)),
      comebacks,
      comebackRate: rate(comebacks, js.length),
      defects: ds.length,
      defectsFixed: fixed.length,
      defectsOpen: ds.length - fixed.length,
      fixRate: rate(fixed.length, ds.length),
      avgFixDays: avg(fixed.map((d) => (+d.fixedAt! - +d.reportedAt) / DAY)),
    };
  }).sort((a, b) => b.jobs + b.defects - (a.jobs + a.defects));

  // Inspectors
  const inspectors = [...group(inspections, (i) => name(i.inspector)).entries()].map(([n, is]) => {
    const failed = is.filter((i) => i.result === "FAIL").length;
    return {
      name: n,
      inspections: is.length,
      avgScore: avg(is.map((i) => i.score)),
      failed,
      detectionRate: rate(failed, is.length),
      itemsChecked: is.reduce((a, i) => a + i.items.filter((x) => x.result !== "NA").length, 0),
      issuesFound: is.reduce((a, i) => a + i.items.filter((x) => x.result === "FAIL").length, 0),
    };
  }).sort((a, b) => b.inspections - a.inspections);

  // Warehouse keepers: defects found on vehicles in their custody
  const keepers = [...group(defects, (d) => name(d.vehicle.warehouseKeeper)).entries()].map(([n, ds]) => {
    const open = ds.filter((d) => d.status === "Open" || d.status === "In Progress").length;
    return {
      name: n,
      defects: ds.length,
      open,
      critical: ds.filter((d) => d.severity === "Critical" || d.severity === "High").length,
      cost: ds.reduce((a, d) => a + d.repairCost, 0),
    };
  }).sort((a, b) => b.defects - a.defects);

  return { technicians, inspectors, keepers };
}

export type WorkerStats = ReturnType<typeof workerStats>;

type Who = { salesman: { name: string } };
type SaleRow = Who & { price: number; paymentType: string; saleDate: Date; deliveredAt: Date | null };
type Cmp = { vehicleId: number | null; category: string; satisfaction: number | null };

/**
 * Salesman performance. Sales are counted within the period; complaints in the
 * period are attributed to whoever sold that car (latest sale of the vehicle).
 */
export function salesmanStats(sales: SaleRow[], allSales: (Who & { vehicleId: number })[], complaints: Cmp[], visits: (Who & { outcome: string; count: number })[] = [], roster: string[] = []) {
  const soldBy = new Map<number, string>();
  allSales.forEach((x) => soldBy.set(x.vehicleId, x.salesman.name)); // ordered by date, latest wins
  // Every active salesman appears (even with no activity yet), plus anyone with records
  const names = new Set([...roster, ...sales.map((x) => x.salesman.name), ...visits.map((v) => v.salesman.name)]);
  const cmpBy = new Map<string, Cmp[]>();
  complaints.forEach((c) => {
    const who = c.vehicleId != null ? soldBy.get(c.vehicleId) : undefined;
    if (!who) return;
    names.add(who);
    cmpBy.set(who, [...(cmpBy.get(who) ?? []), c]);
  });
  return [...names].map((n) => {
    const ss = sales.filter((x) => x.salesman.name === n);
    const delivered = ss.filter((x) => x.deliveredAt);
    const cs = cmpBy.get(n) ?? [];
    const rated = cs.filter((c) => c.satisfaction != null);
    const total = ss.reduce((a, x) => a + x.price, 0);
    const vs = visits.filter((v) => v.salesman.name === n);
    const sum = (xs: { count: number }[]) => xs.reduce((a, v) => a + v.count, 0); // bulk rows carry a count
    const won = sum(vs.filter((v) => v.outcome === "Won"));
    return {
      name: n,
      visits: sum(vs),
      won,
      lost: sum(vs.filter((v) => v.outcome === "Lost")),
      followUp: sum(vs.filter((v) => v.outcome === "FollowUp")),
      conversionRate: rate(won, sum(vs)),
      carsSold: ss.length,
      totalSales: total,
      avgPrice: ss.length ? total / ss.length : 0,
      cash: ss.filter((x) => x.paymentType === "Cash").length,
      financed: ss.filter((x) => x.paymentType !== "Cash").length,
      delivered: delivered.length,
      pendingDelivery: ss.length - delivered.length,
      avgDeliveryDays: avg(delivered.map((x) => (+x.deliveredAt! - +x.saleDate) / DAY)),
      complaints: cs.length,
      deliveryComplaints: cs.filter((c) => c.category === "حالة العربية وقت التسليم").length,
      complaintRate: rate(cs.length, ss.length),
      csat: avg(rated.map((c) => c.satisfaction!)),
      rated: rated.length,
    };
  }).sort((a, b) => b.totalSales - a.totalSales);
}

type BId = { branchId: number | null };
type BranchInput = {
  inspections: { score: number; result: string; vehicle: BId }[];
  defects: { status: string; severity: string; repairCost: number; reportedAt: Date; fixedAt: Date | null; vehicle: BId }[];
  jobs: { isComeback: boolean; openedAt: Date; closedAt: Date | null; vehicle: BId }[];
  complaints: { branchId: number | null; date: Date; resolvedAt: Date | null; satisfaction: number | null; vehicle: BId | null }[];
  sales: { price: number; vehicle: BId; salesman: BId }[];
  visits: { outcome: string; count: number; salesman: BId }[];
};

/**
 * Per-branch quality. Inspections/defects/service follow the car's branch;
 * complaints use their own branch, else the car's; sales follow the car, else
 * the salesman's branch; visits follow the salesman's branch.
 */
export function branchStats(branches: { id: number; name: string; active: boolean }[], vehicleCounts: { branchId: number | null; count: number }[], d: BranchInput) {
  const UNASSIGNED = -1;
  const key = (id: number | null | undefined) => id ?? UNASSIGNED;
  const by = <T,>(xs: T[], f: (x: T) => number | null | undefined) => {
    const m = new Map<number, T[]>();
    xs.forEach((x) => m.set(key(f(x)), [...(m.get(key(f(x))) ?? []), x]));
    return m;
  };
  const ins = by(d.inspections, (x) => x.vehicle.branchId);
  const def = by(d.defects, (x) => x.vehicle.branchId);
  const job = by(d.jobs, (x) => x.vehicle.branchId);
  const cmp = by(d.complaints, (x) => x.branchId ?? x.vehicle?.branchId);
  const sal = by(d.sales, (x) => x.vehicle.branchId ?? x.salesman.branchId);
  const vis = by(d.visits, (x) => x.salesman.branchId);
  const veh = new Map(vehicleCounts.map((v) => [key(v.branchId), v.count]));

  const entries = [...branches.map((b) => ({ id: b.id, name: b.name, active: b.active })), { id: UNASSIGNED, name: "بدون فرع", active: true }];
  return entries.map((b) => {
    const is = ins.get(b.id) ?? [], ds = def.get(b.id) ?? [], js = job.get(b.id) ?? [];
    const cs = cmp.get(b.id) ?? [], ss = sal.get(b.id) ?? [], vs = vis.get(b.id) ?? [];
    const vehicles = veh.get(b.id) ?? 0;
    const fixed = ds.filter((x) => x.fixedAt);
    const closed = js.filter((x) => x.closedAt);
    const resolved = cs.filter((x) => x.resolvedAt);
    const rated = cs.filter((x) => x.satisfaction != null);
    const visitCount = vs.reduce((a, x) => a + x.count, 0);
    const won = vs.filter((x) => x.outcome === "Won").reduce((a, x) => a + x.count, 0);
    return {
      id: b.id, name: b.name, active: b.active, unassigned: b.id === UNASSIGNED,
      vehicles,
      inspections: is.length,
      firstPassYield: rate(is.filter((x) => x.result === "PASS").length, is.length),
      avgScore: avg(is.map((x) => x.score)),
      defects: ds.length,
      defectsPerVehicle: vehicles ? ds.length / vehicles : 0,
      openDefects: ds.filter((x) => x.status === "Open" || x.status === "In Progress").length,
      criticalDefects: ds.filter((x) => x.severity === "Critical" || x.severity === "High").length,
      fixedDefects: fixed.length,
      avgFixDays: avg(fixed.map((x) => (+x.fixedAt! - +x.reportedAt) / DAY)),
      repairCost: ds.reduce((a, x) => a + x.repairCost, 0),
      jobs: js.length,
      closedJobs: closed.length,
      comebackRate: rate(js.filter((x) => x.isComeback).length, js.length),
      avgTurnaroundHrs: avg(closed.map((x) => (+x.closedAt! - +x.openedAt) / HOUR)),
      complaints: cs.length,
      complaintsPer100: vehicles ? (cs.length / vehicles) * 100 : 0,
      resolvedComplaints: resolved.length,
      avgResolutionDays: avg(resolved.map((x) => (+x.resolvedAt! - +x.date) / DAY)),
      rated: rated.length,
      csat: avg(rated.map((x) => x.satisfaction!)),
      sales: ss.length,
      totalSales: ss.reduce((a, x) => a + x.price, 0),
      visits: visitCount,
      conversionRate: rate(won, visitCount),
    };
  }).filter((b) => (b.unassigned ? b.vehicles + b.inspections + b.complaints + b.sales + b.visits > 0 : b.active || b.vehicles > 0));
}

export type ReportData = Awaited<ReturnType<typeof getReportData>>;
