"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Save, Plus, Trash2, Check, X, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { INSPECTION_TYPES, label } from "@/lib/constants";
import type { FormState } from "./RecordForm";

const RESULTS = [
  ["PASS", Check, "data-[state=on]:border-green-600 data-[state=on]:bg-green-600 data-[state=on]:text-white"],
  ["FAIL", X, "data-[state=on]:border-red-600 data-[state=on]:bg-red-600 data-[state=on]:text-white"],
  ["NA", Minus, "data-[state=on]:border-slate-500 data-[state=on]:bg-slate-500 data-[state=on]:text-white"],
] as const;

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
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label htmlFor="vehicleId" className="mb-1.5">العربية <span className="text-destructive">*</span></Label>
          <NativeSelect id="vehicleId" name="vehicleId" className="w-full" defaultValue={defaults.vehicleId ?? ""} required>
            <NativeSelectOption value="">اختار العربية…</NativeSelectOption>
            {vehicles.map((v) => <NativeSelectOption key={v.value} value={v.value}>{v.label}</NativeSelectOption>)}
          </NativeSelect>
          {err("vehicleId") && <p className="mt-1 text-xs text-destructive">{err("vehicleId")}</p>}
        </div>
        <div>
          <Label htmlFor="date" className="mb-1.5">تاريخ الفحص <span className="text-destructive">*</span></Label>
          <Input id="date" type="date" name="date" defaultValue={defaults.date} required />
        </div>
        <div>
          <Label htmlFor="type" className="mb-1.5">نوع الفحص <span className="text-destructive">*</span></Label>
          <NativeSelect id="type" name="type" className="w-full" defaultValue={defaults.type ?? INSPECTION_TYPES[0]}>
            {[...new Set([...INSPECTION_TYPES, ...(defaults.type ? [defaults.type] : [])])].map((t) => <NativeSelectOption key={t}>{t}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="inspector" className="mb-1.5">اسم الفاحص <span className="text-destructive">*</span></Label>
          <Input id="inspector" name="inspector" defaultValue={defaults.inspector} required />
          {err("inspector") && <p className="mt-1 text-xs text-destructive">{err("inspector")}</p>}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="notes" className="mb-1.5">ملاحظات</Label>
          <Input id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">بنود الفحص</CardTitle>
          <CardAction className="flex items-center gap-3 text-sm">
            <Badge className={cn("h-6 px-3 font-semibold", stats.fail ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
              {stats.fail ? `غير مطابق · ${stats.fail.toLocaleString("en-US")} بند` : "مطابق"}
            </Badge>
            <span className="font-semibold tabular-nums">النتيجة {Math.round(stats.score).toLocaleString("en-US")}%</span>
          </CardAction>
        </CardHeader>
        <CardContent>
        {err("items") && <p className="mb-3 text-xs text-destructive">{err("items")}</p>}
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{g}</h3>
              <div className="divide-y rounded-xl border">
                {items.map((it, i) => it.category !== g ? null : (
                  <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <Input className="min-w-40 flex-1 border-transparent" aria-label="البند" value={it.item}
                      onChange={(e) => set(i, { item: e.target.value })} />
                    <ToggleGroup type="single" variant="outline" size="sm" spacing={0} aria-label="النتيجة" value={it.result}
                      onValueChange={(v) => { if (v) set(i, { result: v as Item["result"] }); }}>
                      {RESULTS.map(([r, Icon, on]) => (
                        <ToggleGroupItem key={r} value={r} className={cn("px-3 text-xs font-semibold", on)}>
                          <Icon /> {label(r)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <Input className="w-56" placeholder="ملاحظة" value={it.notes ?? ""}
                      onChange={(e) => set(i, { notes: e.target.value })} />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="مسح البند" className="text-muted-foreground hover:text-destructive"
                      onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="link" size="xs" className="mt-2 px-0"
                onClick={() => setItems([...items, { category: g, item: "بند جديد", result: "PASS" }])}>
                <Plus /> ضيف بند في {g}
              </Button>
            </div>
          ))}
        </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}><Save /> {pending ? "جاري الحفظ…" : "حفظ الفحص"}</Button>
        <Button asChild variant="outline"><Link href="/inspections">إلغاء</Link></Button>
        {deleteAction && (
          <Button variant="destructive" formAction={deleteAction} formNoValidate className="ms-auto"
            onClick={(e) => { if (!confirm("متأكد إنك عايز تمسح الفحص ده؟")) e.preventDefault(); }}>مسح</Button>
        )}
      </div>
    </form>
  );
}
