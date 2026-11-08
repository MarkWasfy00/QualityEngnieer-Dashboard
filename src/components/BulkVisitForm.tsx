"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
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
    <form action={formAction} className="card max-w-4xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">البيّاع <span className="text-red-500">*</span></label>
          <select name="salesmanId" className="input" required defaultValue="">
            <option value="" disabled>اختار البيّاع…</option>
            {salesmen.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {err("salesmanId") && <p className="mt-1 text-xs text-red-600">{err("salesmanId")}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">التاريخ <span className="text-red-500">*</span></label>
          <input type="date" name="visitDate" className="input" defaultValue={today} required />
          <p className="mt-1 text-xs text-slate-500">مثلاً آخر يوم في الأسبوع أو الشهر اللي بتسجله</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">العملاء جم منين؟</label>
          <select name="source" className="input" defaultValue="أخرى">
            {sources.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <label className="mb-1.5 block text-sm font-bold text-slate-800">عدد الزيارات <span className="text-red-500">*</span></label>
          <input type="number" min={1} name="total" className="input text-lg font-bold" placeholder="مثلاً 88" value={total} onChange={(e) => setTotal(e.target.value)} required />
          {err("total") && <p className="mt-1 text-xs text-red-600">{err("total")}</p>}
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
          <label className="mb-1.5 block text-sm font-bold text-green-800">اشترى</label>
          <input type="number" min={0} name="won" className="input text-lg font-bold" placeholder="0" value={won} onChange={(e) => setWon(e.target.value)} />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <label className="mb-1.5 block text-sm font-bold text-amber-800">لسه بيفكر</label>
          <input type="number" min={0} name="followUp" className="input text-lg font-bold" placeholder="0" value={follow} onChange={(e) => setFollow(e.target.value)} />
        </div>
        <div className={`rounded-xl border p-4 ${over ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="mb-1.5 text-sm font-bold text-red-800">مشتراش (بيتحسب لوحده)</div>
          <div className={`py-2 text-2xl font-bold ${over ? "text-red-600" : "text-slate-800"}`}>{over ? "!" : fmt(Math.max(0, lost))}</div>
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
        <label className="mb-1.5 block text-sm font-medium text-slate-700">ملاحظات</label>
        <textarea name="notes" rows={2} className="input" placeholder="مثلاً: زيارات أسبوع المعرض" />
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <button type="submit" disabled={pending || over} className="btn-primary"><Save size={16} /> {pending ? "جاري الحفظ…" : "حفظ الزيارات"}</button>
        <Link href="/visits" className="btn-ghost">إلغاء</Link>
      </div>
    </form>
  );
}
