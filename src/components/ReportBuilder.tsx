"use client";
import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import clsx from "clsx";

const MODULES = [
  { key: "inspections", label: "الفحوصات" }, { key: "defects", label: "العيوب" },
  { key: "service", label: "أوامر الصيانة" }, { key: "complaints", label: "شكاوى العملاء" }, { key: "sales", label: "المبيعات والزيارات" }, { key: "workers", label: "أداء العمال" }, { key: "branches", label: "جودة الفروع" },
];

export default function ReportBuilder({ initialFrom = "", initialTo = "" }: { initialFrom?: string; initialTo?: string }) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [mods, setMods] = useState(MODULES.map((m) => m.key));
  const q = new URLSearchParams({ ...(from && { from }), ...(to && { to }), modules: mods.join(",") }).toString();
  const toggle = (k: string) => setMods(mods.includes(k) ? mods.filter((m) => m !== k) : [...mods, k]);

  return (
    <div className="card max-w-3xl p-6 space-y-6">
      <div>
        <h2 className="mb-3 font-semibold">1. فترة التقرير</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400">من</span>
          <input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-slate-400">لحد</span>
          <input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          {(from || to) && <button className="text-sm text-brand cursor-pointer" onClick={() => { setFrom(""); setTo(""); }}>كل الفترات</button>}
        </div>
      </div>
      <div>
        <h2 className="mb-3 font-semibold">2. الأقسام اللي هتدخل في التقرير</h2>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((m) => (
            <button key={m.key} onClick={() => toggle(m.key)}
              className={clsx("rounded-full border px-4 py-1.5 text-sm font-medium cursor-pointer transition",
                mods.includes(m.key) ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-600")}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">الملخص والمؤشرات والرسومات موجودين في التقرير دايماً.</p>
      </div>
      <div>
        <h2 className="mb-3 font-semibold">3. التحميل</h2>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/export/excel?${q}`} className="btn !bg-green-700 text-white hover:!bg-green-800 shadow-sm">
            <FileSpreadsheet size={18} /> تصدير إكسيل (xlsx)
          </a>
          <a href={`/api/export/pdf?${q}`} className="btn !bg-red-700 text-white hover:!bg-red-800 shadow-sm">
            <FileText size={18} /> تصدير PDF
          </a>
        </div>
      </div>
    </div>
  );
}
