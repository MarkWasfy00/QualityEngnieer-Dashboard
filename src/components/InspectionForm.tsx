"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Save, Plus, Trash2, Check, X, Minus } from "lucide-react";
import clsx from "clsx";
import { INSPECTION_TYPES, label } from "@/lib/constants";
import type { FormState } from "./RecordForm";

type Item = { category: string; item: string; result: "PASS" | "FAIL" | "NA"; notes?: string | null };

export default function InspectionForm({ vehicles, action, defaults, initialItems, deleteAction }: {
  vehicles: { value: number; label: string }[];
  action: (s: FormState, f: FormData) => Promise<FormState>;
  defaults: { vehicleId?: number | string; date: string; inspector?: string; type?: string; notes?: string | null };
  initialItems: Item[];
  deleteAction?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [items, setItems] = useState<Item[]>(initialItems);
  const set = (i: number, patch: Partial<Item>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const stats = useMemo(() => {
    const app = items.filter((i) => i.result !== "NA");
    const pass = app.filter((i) => i.result === "PASS").length;
    return { score: app.length ? (pass / app.length) * 100 : 100, fail: app.length - pass };
  }, [items]);
  const groups = [...new Set(items.map((i) => i.category))];
  const err = (k: string) => state?.errors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="card grid grid-cols-1 gap-5 p-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">العربية *</label>
          <select name="vehicleId" className="input" defaultValue={defaults.vehicleId ?? ""} required>
            <option value="">اختار العربية…</option>
            {vehicles.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          {err("vehicleId") && <p className="mt-1 text-xs text-red-600">{err("vehicleId")}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">تاريخ الفحص *</label>
          <input type="date" name="date" className="input" defaultValue={defaults.date} required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">نوع الفحص *</label>
          <select name="type" className="input" defaultValue={defaults.type ?? INSPECTION_TYPES[0]}>
            {[...new Set([...INSPECTION_TYPES, ...(defaults.type ? [defaults.type] : [])])].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">اسم الفاحص *</label>
          <input name="inspector" className="input" defaultValue={defaults.inspector} required />
          {err("inspector") && <p className="mt-1 text-xs text-red-600">{err("inspector")}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">ملاحظات</label>
          <input name="notes" className="input" defaultValue={defaults.notes ?? ""} />
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">بنود الفحص</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className={clsx("rounded-full px-3 py-1 font-semibold",
              stats.fail ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
              {stats.fail ? `غير مطابق · ${stats.fail.toLocaleString("en-US")} بند` : "مطابق"}
            </span>
            <span className="font-semibold tabular-nums">النتيجة {Math.round(stats.score).toLocaleString("en-US")}%</span>
          </div>
        </div>
        {err("items") && <p className="mb-3 text-xs text-red-600">{err("items")}</p>}
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {items.map((it, i) => it.category !== g ? null : (
                  <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <input className="input flex-1 min-w-40 !border-transparent !shadow-none" value={it.item}
                      onChange={(e) => set(i, { item: e.target.value })} />
                    <div className="flex overflow-hidden rounded-lg border border-slate-300">
                      {([["PASS", Check, "bg-green-600"], ["FAIL", X, "bg-red-600"], ["NA", Minus, "bg-slate-500"]] as const).map(([r, Icon, on]) => (
                        <button type="button" key={r} onClick={() => set(i, { result: r })}
                          className={clsx("flex items-center gap-1 px-3 py-1.5 text-xs font-semibold cursor-pointer",
                            it.result === r ? `${on} text-white` : "bg-white text-slate-600 hover:bg-slate-50")}>
                          <Icon size={14} /> {label(r)}
                        </button>
                      ))}
                    </div>
                    <input className="input w-56" placeholder="ملاحظة" value={it.notes ?? ""}
                      onChange={(e) => set(i, { notes: e.target.value })} />
                    <button type="button" className="text-slate-400 hover:text-red-600 cursor-pointer"
                      onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand cursor-pointer"
                onClick={() => setItems([...items, { category: g, item: "بند جديد", result: "PASS" }])}>
                <Plus size={14} /> ضيف بند في {g}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary"><Save size={16} /> {pending ? "جاري الحفظ…" : "حفظ الفحص"}</button>
        <Link href="/inspections" className="btn-ghost">إلغاء</Link>
        {deleteAction && (
          <button formAction={deleteAction} formNoValidate className="btn-danger ms-auto"
            onClick={(e) => { if (!confirm("متأكد إنك عايز تمسح الفحص ده؟")) e.preventDefault(); }}>مسح</button>
        )}
      </div>
    </form>
  );
}
