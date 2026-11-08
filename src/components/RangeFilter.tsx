"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PRESETS = [
  { label: "آخر 30 يوم", days: 30 }, { label: "آخر 90 يوم", days: 90 }, { label: "السنة دي", days: -1 }, { label: "كل الفترات", days: 0 },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function RangeFilter() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const go = (f: string, t: string) => {
    const q = new URLSearchParams();
    if (f) q.set("from", f);
    if (t) q.set("to", t);
    router.push(`${path}${q.size ? "?" + q : ""}`);
  };
  const preset = (days: number) => {
    if (!days) return go("", "");
    const now = new Date();
    const start = days < 0 ? new Date(now.getFullYear(), 0, 1) : new Date(+now - days * 86400000);
    go(iso(start), iso(now));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button key={p.label} onClick={() => preset(p.days)} className="btn-ghost !px-3 !py-1.5 text-xs">{p.label}</button>
      ))}
      <span className="text-sm text-slate-500">من</span>
      <input type="date" className="input !w-auto !py-1.5" value={from} onChange={(e) => go(e.target.value, to)} />
      <span className="text-slate-400">لحد</span>
      <input type="date" className="input !w-auto !py-1.5" value={to} onChange={(e) => go(from, e.target.value)} />
    </div>
  );
}
