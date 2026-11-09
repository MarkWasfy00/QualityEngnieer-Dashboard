"use client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { label } from "@/lib/constants";
import { monthLabel } from "@/lib/format";

// Categorical slots in fixed order (validated reference palette)
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
const nf = new Intl.NumberFormat("ar-EG-u-nu-latn", { maximumFractionDigits: 0 });
const n = (v: unknown) => nf.format(Number(v));
const egp = (v: unknown) => `${nf.format(Number(v))} ج.م`;
const axis = { stroke: "#94a3b8", fontSize: 12, tickLine: false, axisLine: false, fontFamily: "inherit" } as const;
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />;
const tip = {
  contentStyle: { borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,.06)", direction: "rtl" as const, textAlign: "right" as const },
  cursor: { fill: "rgba(37,99,235,0.06)" },
};
/** Value label just past the bar's left (far) end; works with the reversed RTL axis. */
function EndLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown }) {
  const x = Number(props.x ?? 0), w = Number(props.width ?? 0), y = Number(props.y ?? 0), h = Number(props.height ?? 0);
  return (
    <text x={Math.min(x, x + w) - 6} y={y + h / 2} dy={4} textAnchor="end" fontSize={11} fill="#475569">{n(props.value)}</text>
  );
}
const legend = { iconType: "circle" as const, wrapperStyle: { fontSize: 12, direction: "rtl" as const } };

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent><div className="h-64" dir="ltr">{children}</div></CardContent>
    </Card>
  );
}

/** Horizontal bars growing right-to-left, labels on the right (RTL). */
export function HBar({ data, color = SERIES[0], codes = false }: { data: { name: string; value: number }[]; color?: string; codes?: boolean }) {
  if (!data.length) return <Empty />;
  const rows = codes ? data.map((d) => ({ ...d, name: label(d.name) })) : data;
  return (
    <ResponsiveContainer>
      <BarChart data={rows} layout="vertical" margin={{ left: 70, right: 10 }} barCategoryGap={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" {...axis} allowDecimals={false} reversed tickFormatter={n} />
        <YAxis type="category" dataKey="name" {...axis} width={120} orientation="right" />
        <Tooltip {...tip} formatter={(v) => [n(v), "العدد"]} />
        <Bar dataKey="value" fill={color} radius={[4, 0, 0, 4]} maxBarSize={22} label={EndLabel} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: { month: string; pass: number; fail: number }[] }) {
  if (!data.length) return <Empty />;
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer>
      <BarChart data={rows} barCategoryGap="25%">
        {grid}
        <XAxis dataKey="label" {...axis} reversed />
        <YAxis {...axis} allowDecimals={false} orientation="right" tickFormatter={n} />
        <Tooltip {...tip} formatter={(v) => n(v)} />
        <Legend {...legend} />
        <Bar dataKey="pass" name="مطابق" stackId="a" fill={SERIES[0]} stroke="#fff" strokeWidth={2} maxBarSize={36} />
        <Bar dataKey="fail" name="غير مطابق" stackId="a" fill={SERIES[1]} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CostChart({ data }: { data: { name: string; labor: number; parts: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer>
      <BarChart data={data} barCategoryGap="25%">
        {grid}
        <XAxis dataKey="name" {...axis} interval={0} angle={25} textAnchor="start" height={70} reversed />
        <YAxis {...axis} tickFormatter={n} width={70} orientation="right" />
        <Tooltip {...tip} formatter={(v) => egp(v)} />
        <Legend {...legend} verticalAlign="top" />
        <Bar dataKey="labor" name="مصنعية" stackId="c" fill={SERIES[0]} stroke="#fff" strokeWidth={2} maxBarSize={36} />
        <Bar dataKey="parts" name="قطع غيار" stackId="c" fill={SERIES[1]} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** One line per salesman over months (single y-axis, EGP). */
export function MultiLine({ data, names, colors }: { data: Record<string, number | string>[]; names: string[]; colors: string[] }) {
  if (!data.length) return <Empty />;
  const rows = data.map((d) => ({ ...d, label: monthLabel(String(d.month)) }));
  return (
    <ResponsiveContainer>
      <LineChart data={rows} margin={{ top: 10, left: 10, right: 10 }}>
        {grid}
        <XAxis dataKey="label" {...axis} reversed />
        <YAxis {...axis} tickFormatter={n} width={80} orientation="right" />
        <Tooltip contentStyle={tip.contentStyle} formatter={(v) => egp(v)} />
        <Legend {...legend} />
        {names.map((nm, i) => (
          <Line key={nm} type="linear" dataKey={nm} name={nm} stroke={colors[i]} strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: colors[i] }} activeDot={{ r: 6 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Deals per month split into collected / still open (receivables). */
export function CollectionTrend({ data }: { data: { month: string; collected: number; open: number }[] }) {
  if (!data.length) return <Empty />;
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer>
      <BarChart data={rows} barCategoryGap="25%">
        {grid}
        <XAxis dataKey="label" {...axis} reversed />
        <YAxis {...axis} allowDecimals={false} orientation="right" tickFormatter={n} />
        <Tooltip {...tip} formatter={(v) => n(v)} />
        <Legend {...legend} />
        <Bar dataKey="collected" name="اتحصّلت" stackId="a" fill={SERIES[0]} stroke="#fff" strokeWidth={2} maxBarSize={36} />
        <Bar dataKey="open" name="لسه" stackId="a" fill={SERIES[1]} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Average days from sale to collection, by collection month (dashed line = target). */
export function DaysLine({ data, target }: { data: { month: string; avg: number }[]; target?: number }) {
  if (!data.length) return <Empty />;
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month), target }));
  return (
    <ResponsiveContainer>
      <LineChart data={rows} margin={{ top: 10, left: 10, right: 10 }}>
        {grid}
        <XAxis dataKey="label" {...axis} reversed />
        <YAxis {...axis} allowDecimals={false} orientation="right" tickFormatter={n} />
        <Tooltip contentStyle={tip.contentStyle}
          formatter={(v, k) => [`${n(v)} يوم`, k === "target" ? "المستهدف" : "متوسط أيام التحصيل"]} />
        {target != null && <Line dataKey="target" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />}
        <Line type="linear" dataKey="avg" stroke={SERIES[0]} strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: SERIES[0] }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** One bar per period (week/month), labels already formatted. */
export function PeriodBars({ data, name, color = SERIES[0], money: isMoney = false }: {
  data: { label: string; value: number }[]; name: string; color?: string; money?: boolean;
}) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer>
      <BarChart data={data} barCategoryGap="25%">
        {grid}
        <XAxis dataKey="label" {...axis} reversed />
        <YAxis {...axis} allowDecimals={false} orientation="right" tickFormatter={n} width={isMoney ? 80 : 40} />
        <Tooltip {...tip} formatter={(v) => [isMoney ? egp(v) : n(v), name]} />
        <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <div dir="rtl" className="grid h-full place-items-center text-sm text-muted-foreground">مفيش بيانات في الفترة دي</div>;
}
