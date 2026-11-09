"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "./RecordForm";

const n = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
const fmt = (v: number) => v.toLocaleString("en-US");

export default function BulkVisitForm({ salesmen, sources, action, today }: {
  salesmen: { value: number; label: string }[];
  sources: readonly string[];
  action: (s: FormState, f: FormData) => Promise<FormState>;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [total, setTotal] = useState("");
  const [won, setWon] = useState("");
  const [follow, setFollow] = useState("");
  const lost = n(total) - n(won) - n(follow);
  const over = lost < 0;
  const conv = n(total) ? (n(won) / n(total)) * 100 : 0;
  const err = (k: string) => state?.errors?.[k]?.[0];

  return (
    <Card className="max-w-4xl">
      <CardContent>
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <Label htmlFor="salesmanId" className="mb-1.5">البيّاع <span className="text-destructive">*</span></Label>
          <NativeSelect id="salesmanId" name="salesmanId" className="w-full" required defaultValue="">
            <NativeSelectOption value="" disabled>اختار البيّاع…</NativeSelectOption>
            {salesmen.map((m) => <NativeSelectOption key={m.value} value={m.value}>{m.label}</NativeSelectOption>)}
          </NativeSelect>
          {err("salesmanId") && <p className="mt-1 text-xs text-destructive">{err("salesmanId")}</p>}
        </div>
        <div>
          <Label htmlFor="visitDate" className="mb-1.5">التاريخ <span className="text-destructive">*</span></Label>
          <Input id="visitDate" type="date" name="visitDate" defaultValue={today} required />
          <p className="mt-1 text-xs text-muted-foreground">مثلاً آخر يوم في الأسبوع أو الشهر اللي بتسجله</p>
        </div>
        <div>
          <Label htmlFor="source" className="mb-1.5">العملاء جم منين؟</Label>
          <NativeSelect id="source" name="source" className="w-full" defaultValue="أخرى">
            {sources.map((x) => <NativeSelectOption key={x}>{x}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border p-4">
          <Label htmlFor="total" className="mb-1.5 font-bold">عدد الزيارات <span className="text-destructive">*</span></Label>
          <Input id="total" type="number" min={1} name="total" className="h-10 bg-card text-lg font-bold md:text-lg" placeholder="مثلاً 88" value={total} onChange={(e) => setTotal(e.target.value)} required />
          {err("total") && <p className="mt-1 text-xs text-destructive">{err("total")}</p>}
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
          <Label htmlFor="won" className="mb-1.5 font-bold text-green-800">اشترى</Label>
          <Input id="won" type="number" min={0} name="won" className="h-10 bg-card text-lg font-bold md:text-lg" placeholder="0" value={won} onChange={(e) => setWon(e.target.value)} />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <Label htmlFor="followUp" className="mb-1.5 font-bold text-amber-800">لسه بيفكر</Label>
          <Input id="followUp" type="number" min={0} name="followUp" className="h-10 bg-card text-lg font-bold md:text-lg" placeholder="0" value={follow} onChange={(e) => setFollow(e.target.value)} />
        </div>
        <div className={`rounded-xl border p-4 ${over ? "border-red-300 bg-red-50" : "bg-muted/60"}`}>
          <div className="mb-1.5 text-sm font-bold text-red-800">مشتراش (بيتحسب لوحده)</div>
          <div className={`py-2 text-2xl font-bold ${over ? "text-destructive" : "text-foreground"}`}>{over ? "!" : fmt(Math.max(0, lost))}</div>
        </div>
      </div>

      <div className={`rounded-xl p-4 text-sm ${over ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-900"}`}>
        {over
          ? "مجموع (اشترى + لسه بيفكر) أكبر من عدد الزيارات — راجع الأرقام."
          : n(total)
            ? <>هيتسجل <b>{fmt(n(total))}</b> زيارة: {fmt(n(won))} اشترى · {fmt(n(follow))} لسه بيفكر · {fmt(Math.max(0, lost))} مشتراش — <b>نسبة البيع {conv.toFixed(1)}%</b></>
            : "اكتب عدد الزيارات، وبعدين كام واحد اشترى وكام واحد لسه بيفكر. الباقي بيتحسب \"مشتراش\" لوحده."}
        {err("won") && <div className="mt-1 font-semibold text-red-700">{err("won")}</div>}
      </div>

      <div>
        <Label htmlFor="notes" className="mb-1.5">ملاحظات</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="مثلاً: زيارات أسبوع المعرض" />
      </div>

      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <div className="flex items-center gap-3 border-t pt-5">
        <Button type="submit" disabled={pending || over}><Save /> {pending ? "جاري الحفظ…" : "حفظ الزيارات"}</Button>
        <Button asChild variant="outline"><Link href="/visits">إلغاء</Link></Button>
      </div>
    </form>
      </CardContent>
    </Card>
  );
}
