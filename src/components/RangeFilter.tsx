"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    const q = new URLSearchParams(sp.toString()); // keep other filters (branch, bank…)
    if (f) q.set("from", f); else q.delete("from");
    if (t) q.set("to", t); else q.delete("to");
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
        <Button key={p.label} variant="outline" onClick={() => preset(p.days)}>{p.label}</Button>
      ))}
      <span className="text-sm text-muted-foreground">من</span>
      <Input type="date" aria-label="من" className="w-auto bg-card" value={from} onChange={(e) => go(e.target.value, to)} />
      <span className="text-sm text-muted-foreground">لحد</span>
      <Input type="date" aria-label="لحد" className="w-auto bg-card" value={to} onChange={(e) => go(from, e.target.value)} />
    </div>
  );
}
