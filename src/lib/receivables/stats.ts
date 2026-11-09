import type { Receivable } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Range } from "@/lib/kpis";
import { label } from "@/lib/constants";
import { carBrand } from "./brands";

export type RecFilter = Range & { branch?: string; bank?: string; salesman?: string };
const DAY = 86400000;
/** Days between sale and collection; ignores negative / unknown. */
export const daysToCollect = (r: Pick<Receivable, "saleDate" | "collectedAt">) =>
  r.saleDate && r.collectedAt && +r.collectedAt >= +r.saleDate ? Math.round((+r.collectedAt - +r.saleDate) / DAY) : null;
export const ageDays = (r: Pick<Receivable, "saleDate">, now = new Date()) =>
  r.saleDate ? Math.max(0, Math.floor((+now - +r.saleDate) / DAY)) : null;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pos = (n: number) => Math.max(0, n);

export const AGING = [
  { key: "0-15", label: "أقل من 15 يوم", max: 15 },
  { key: "16-30", label: "16 – 30 يوم", max: 30 },
  { key: "31-60", label: "31 – 60 يوم", max: 60 },
  { key: "61-90", label: "61 – 90 يوم", max: 90 },
  { key: "90+", label: "أكتر من 90 يوم", max: Infinity },
] as const;
export const COLLECT_TARGET_DAYS = 30;

export type Group = {
  name: string; deals: number; due: number; collected: number; collectedValue: number;
  open: number; openValue: number; overdue: number; rate: number; valueRate: number; avgDays: number | null;
};

function summarize(rs: Receivable[], now: Date) {
  const live = rs.filter((r) => r.state !== "Returned");
  const col = live.filter((r) => r.state === "Collected");
  const open = live.filter((r) => r.state === "Open");
  const due = live.reduce((a, r) => a + pos(r.amountDue), 0);
  const collectedValue = col.reduce((a, r) => a + pos(r.amountDue), 0);
  const openValue = open.reduce((a, r) => a + pos(r.amountDue), 0);
  const days = col.map(daysToCollect).filter((d): d is number => d != null);
  const overdueRows = open.filter((r) => (ageDays(r, now) ?? 0) > COLLECT_TARGET_DAYS);
  return {
    deals: live.length, due, collected: col.length, collectedValue, open: open.length, openValue,
    rate: live.length ? (col.length / live.length) * 100 : 0,
    valueRate: due ? (collectedValue / due) * 100 : 0,
    avgDays: days.length ? avg(days) : null, medianDays: days.length ? median(days) : null,
    onTime: days.length ? (days.filter((d) => d <= COLLECT_TARGET_DAYS).length / days.length) * 100 : null,
    overdue: overdueRows.length, overdueValue: overdueRows.reduce((a, r) => a + pos(r.amountDue), 0),
  };
}

function groupBy(rs: Receivable[], key: (r: Receivable) => string | null, now: Date): Group[] {
  const m = new Map<string, Receivable[]>();
  for (const r of rs) {
    const k = key(r) || "غير محدد";
    (m.get(k) ?? m.set(k, []).get(k)!).push(r);
  }
  return [...m.entries()].map(([name, xs]) => {
    const s = summarize(xs, now);
    return { name, deals: s.deals, due: s.due, collected: s.collected, collectedValue: s.collectedValue, open: s.open,
      openValue: s.openValue, overdue: s.overdue, rate: s.rate, valueRate: s.valueRate, avgDays: s.avgDays };
  }).filter((g) => g.deals > 0).sort((a, b) => b.due - a.due);
}

export type Share = { name: string; count: number; pct: number; value: number };
/** Cars sold split by a key, as % of all cars sold (returns excluded). */
function shares(rs: Receivable[], key: (r: Receivable) => string): Share[] {
  const m = new Map<string, Share>();
  for (const r of rs) {
    const k = key(r);
    const x = m.get(k) ?? m.set(k, { name: k, count: 0, pct: 0, value: 0 }).get(k)!;
    x.count++; x.value += pos(r.salePrice ?? r.amountDue);
  }
  return [...m.values()].map((x) => ({ ...x, pct: rs.length ? (x.count / rs.length) * 100 : 0 })).sort((a, b) => b.count - a.count);
}

export async function getReceivableStats(f: RecFilter) {
  const now = new Date();
  const all = await prisma.receivable.findMany({ orderBy: { saleDate: "asc" } });
  const options = {
    branches: [...new Set(all.map((r) => r.branch).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "ar")),
    banks: [...new Set(all.map((r) => r.bank).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "ar")),
  };
  const rs = all.filter((r) =>
    (!f.from || (r.saleDate && +r.saleDate >= +f.from)) && (!f.to || (r.saleDate && +r.saleDate <= +f.to)) &&
    (!f.branch || r.branch === f.branch) && (!f.bank || r.bank === f.bank) && (!f.salesman || r.salesman === f.salesman));

  const open = rs.filter((r) => r.state === "Open");
  const aging = AGING.map((b, i) => {
    const lo = i ? AGING[i - 1].max : -1;
    const xs = open.filter((r) => { const a = ageDays(r, now); return a != null && a > lo && a <= b.max; });
    return { name: b.label, count: xs.length, value: xs.reduce((a, r) => a + pos(r.amountDue), 0) };
  });
  const noDate = open.filter((r) => !r.saleDate);

  const months = new Map<string, { month: string; collected: number; open: number; due: number; collectedValue: number }>();
  for (const r of rs) {
    if (!r.saleDate || r.state === "Returned") continue;
    const k = r.saleDate.toISOString().slice(0, 7);
    const m = months.get(k) ?? { month: k, collected: 0, open: 0, due: 0, collectedValue: 0 };
    if (r.state === "Collected") { m.collected++; m.collectedValue += pos(r.amountDue); } else m.open++;
    m.due += pos(r.amountDue);
    months.set(k, m);
  }
  const daysTrend = new Map<string, number[]>();
  for (const r of rs) {
    const d = daysToCollect(r);
    if (d == null || !r.collectedAt) continue;
    const k = r.collectedAt.toISOString().slice(0, 7);
    (daysTrend.get(k) ?? daysTrend.set(k, []).get(k)!).push(d);
  }

  return {
    total: all.length,
    options,
    summary: { ...summarize(rs, now), returned: rs.filter((r) => r.state === "Returned").length,
      credit: rs.filter((r) => r.amountDue < 0).length, noDate: noDate.length, noDateValue: noDate.reduce((a, r) => a + pos(r.amountDue), 0) },
    aging,
    monthly: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-18),
    collectDays: [...daysTrend.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, xs]) => ({ month, avg: Math.round(avg(xs)), count: xs.length })),
    byBank: groupBy(rs, (r) => r.bank, now),
    byBranch: groupBy(rs, (r) => r.branch, now),
    bySalesman: groupBy(rs, (r) => r.salesman, now),
    byPayment: groupBy(rs, (r) => r.paymentType, now),
    sales: (() => {
      const sold = rs.filter((r) => r.state !== "Returned");
      return {
        total: sold.length,
        value: sold.reduce((a, r) => a + pos(r.salePrice ?? r.amountDue), 0),
        brands: shares(sold, (r) => carBrand(r.car)),
        payments: shares(sold, (r) => label(r.paymentType)),
        branches: shares(sold, (r) => r.branch || "غير محدد"),
      };
    })(),
    openRows: open.map((r) => ({ ...r, age: ageDays(r, now) })).sort((a, b) => (b.age ?? -1) - (a.age ?? -1)),
  };
}
