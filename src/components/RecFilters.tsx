"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
        <NativeSelect key={f.key} className="bg-card" aria-label={f.label} value={sp.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)}>
          <NativeSelectOption value="">{f.label}: الكل</NativeSelectOption>
          {f.options.map((o) => <NativeSelectOption key={o} value={o}>{o}</NativeSelectOption>)}
        </NativeSelect>
      ))}
    </div>
  );
}
