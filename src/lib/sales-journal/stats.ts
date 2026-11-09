import type { SalesLine } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Range } from "@/lib/kpis";

export type SalesFilter = Range & { branch?: string; brand?: string };

export type SalesGroup = {
  name: string; cars: number; share: number; revenue: number; profit: number; margin: number | null; avgPrice: number; losses: number;
};

const DAY = 86400000;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Profit is only counted for cars that have a chassis cost in Odoo. */
const withCost = (xs: SalesLine[]) => xs.filter((x) => x.chassisCost != null && x.chassisCost > 0);
const profitOf = (xs: SalesLine[]) => sum(withCost(xs).map((x) => x.credit - x.chassisCost!));

function group(sales: SalesLine[], key: (x: SalesLine) => string, total: number): SalesGroup[] {
  const m = new Map<string, SalesLine[]>();
  for (const x of sales) { const k = key(x) || "غير محدد"; (m.get(k) ?? m.set(k, []).get(k)!).push(x); }
  return [...m.entries()].map(([name, xs]) => {
    const revenue = sum(xs.map((x) => x.credit));
    const wc = withCost(xs), wcRev = sum(wc.map((x) => x.credit)), profit = profitOf(xs);
    return {
      name, cars: xs.length, share: total ? (xs.length / total) * 100 : 0, revenue, profit,
      margin: wcRev ? (profit / wcRev) * 100 : null, avgPrice: xs.length ? revenue / xs.length : 0,
      losses: wc.filter((x) => x.credit < x.chassisCost!).length,
    };
  }).sort((a, b) => b.cars - a.cars);
}

/** Weekly buckets (week starts Saturday) for short periods, monthly for longer ones. */
function periods(sales: SalesLine[]) {
  if (!sales.length) return { unit: "month" as const, rows: [] as { key: string; label: string; cars: number; revenue: number; profit: number }[] };
  const span = (+sales[sales.length - 1].date - +sales[0].date) / DAY;
  const weekly = span <= 120;
  const m = new Map<string, { key: string; label: string; cars: number; revenue: number; profit: number }>();
  for (const x of sales) {
    let key: string, label: string;
    if (weekly) {
      const d = new Date(x.date);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7)); // back to Saturday
      key = d.toISOString().slice(0, 10);
      label = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
    } else {
      key = x.date.toISOString().slice(0, 7);
      label = `${Number(key.slice(5))}/${key.slice(2, 4)}`;
    }
    const p = m.get(key) ?? m.set(key, { key, label, cars: 0, revenue: 0, profit: 0 }).get(key)!;
    p.cars++; p.revenue += x.credit;
    if (x.chassisCost) p.profit += x.credit - x.chassisCost;
  }
  return { unit: weekly ? ("week" as const) : ("month" as const), rows: [...m.values()].sort((a, b) => a.key.localeCompare(b.key)) };
}

export async function getSalesStats(f: SalesFilter) {
  const all = await prisma.salesLine.findMany({ orderBy: { date: "asc" } });
  const options = {
    branches: [...new Set(all.map((x) => x.branch).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "ar")),
    brands: [...new Set(all.filter((x) => x.kind === "Sale").map((x) => x.brand).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "ar")),
  };
  const ls = all.filter((x) => (!f.from || +x.date >= +f.from) && (!f.to || +x.date <= +f.to) &&
    (!f.branch || x.branch === f.branch) && (!f.brand || x.brand === f.brand));
  const sales = ls.filter((x) => x.kind === "Sale");
  const returns = ls.filter((x) => x.kind === "Return");
  const interest = ls.filter((x) => x.kind === "Interest" || x.kind === "InterestReturn");

  const grossRevenue = sum(sales.map((x) => x.credit));
  const returnsValue = sum(returns.map((x) => x.debit));
  const wc = withCost(sales), wcRev = sum(wc.map((x) => x.credit)), profit = profitOf(sales);
  const installment = sales.filter((x) => x.paymentType === "Installment").length;
  const first = ls[0]?.date, last = ls[ls.length - 1]?.date;
  const days = first && last ? Math.max(1, Math.round((+last - +first) / DAY) + 1) : 0;

  return {
    total: all.length,
    options,
    period: { first, last, days },
    summary: {
      cars: sales.length, returns: returns.length, netCars: sales.length - returns.length,
      returnRate: sales.length ? (returns.length / sales.length) * 100 : 0,
      grossRevenue, returnsValue, netRevenue: grossRevenue - returnsValue,
      avgPrice: sales.length ? grossRevenue / sales.length : 0,
      profit, margin: wcRev ? (profit / wcRev) * 100 : null, costCovered: sales.length ? (wc.length / sales.length) * 100 : 0,
      avgProfit: wc.length ? profit / wc.length : 0,
      losses: wc.filter((x) => x.credit < x.chassisCost!).length,
      interest: sum(interest.map((x) => x.amount)),
      installmentShare: sales.length ? (installment / sales.length) * 100 : 0, installment,
      perDay: days ? sales.length / days : 0,
    },
    periods: periods(sales),
    byBrand: group(sales, (x) => x.brand ?? "", sales.length),
    byBranch: group(sales, (x) => x.branch ?? "", sales.length),
    byModel: group(sales, (x) => x.product ?? "", sales.length).slice(0, 15),
    byPayment: group(sales, (x) => (x.paymentType === "Installment" ? "تقسيط" : "كاش / بنك"), sales.length),
    lossRows: wc.filter((x) => x.credit < x.chassisCost!).sort((a, b) => (a.credit - a.chassisCost!) - (b.credit - b.chassisCost!)),
    returnRows: returns,
  };
}
