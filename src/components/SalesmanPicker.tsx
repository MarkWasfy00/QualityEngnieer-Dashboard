"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import clsx from "clsx";

export default function SalesmanPicker({ all, selected, max, colors }: { all: string[]; selected: string[]; max: number; colors: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const go = (next: string[]) => {
    const q = new URLSearchParams(sp.toString());
    q.set("s", next.join(","));
    router.push(`${path}?${q}`);
  };
  const toggle = (n: string) => {
    if (selected.includes(n)) go(selected.filter((x) => x !== n));
    else if (selected.length < max) go([...selected, n]);
  };
  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">اختار البيّاعين اللي عايز تقارن بينهم (لحد {max})</div>
      <div className="flex flex-wrap gap-2">
        {all.map((n) => {
          const i = selected.indexOf(n);
          const on = i >= 0;
          const full = !on && selected.length >= max;
          return (
            <button key={n} onClick={() => toggle(n)} disabled={full}
              className={clsx("inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                on ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}>
              {on && <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />}
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
