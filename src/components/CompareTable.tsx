import { ArrowUp, ArrowDown } from "lucide-react";
import type { CompareRow } from "@/lib/compare";

/** Metric rows × entity columns; best value per row highlighted green with a mini bar. */
export default function CompareTable({ names, rows, colors, firstHeader = "المقياس" }: {
  names: string[]; rows: CompareRow[]; colors?: string[]; firstHeader?: string;
}) {
  const color = (i: number) => colors?.[i] ?? "#2a78d6";
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 text-start font-semibold">{firstHeader}</th>
            {names.map((n, i) => (
              <th key={n} className="px-4 py-3 text-start font-semibold">
                <span className="inline-flex items-center gap-2">
                  {colors && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(i) }} />}{n}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="font-medium text-slate-800">{r.label}</div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  {r.better === "high" ? <><ArrowUp size={12} /> الأعلى أحسن</> : <><ArrowDown size={12} /> الأقل أحسن</>}
                </div>
              </td>
              {names.map((n, i) => {
                const v = r.values[i];
                const best = r.best.includes(i);
                const w = v != null && r.max > 0 ? Math.max(3, (v / r.max) * 100) : 0;
                return (
                  <td key={n} className={`px-4 py-3 ${best ? "bg-green-50" : ""}`}>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className={best ? "font-bold text-green-800" : "text-slate-700"}>{r.shown[i]}</span>
                      {best && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">الأفضل</span>}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full max-w-40 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full" style={{ width: `${w}%`, background: color(i) }} />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
