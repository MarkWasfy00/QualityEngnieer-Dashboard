"use client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
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
    <div className="card p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4 h-64" dir="ltr">{children}</div>
    </div>
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

function Empty() {
  return <div dir="rtl" className="grid h-full place-items-center text-sm text-slate-400">مفيش بيانات في الفترة دي</div>;
}
