"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type SelectFilter = { key: string; label: string; options: string[] };

/** Drop-downs (branch, bank, brand…) that keep the other URL filters (from, to). */
export default function RecFilters({ filters }: { filters: SelectFilter[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const set = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set(k, v); else q.delete(k);
    router.push(`${path}${q.size ? "?" + q : ""}`);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <select key={f.key} className="input !w-auto !py-1.5" value={sp.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)}>
          <option value="">{f.label}: الكل</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}
    </div>
  );
}
