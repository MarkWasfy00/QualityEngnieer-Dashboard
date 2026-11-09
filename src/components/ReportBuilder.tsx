"use client";
import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <Card className="max-w-3xl">
      <CardContent className="space-y-6">
        <div>
          <h2 className="mb-3 text-base font-semibold">1. فترة التقرير</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">من</span>
            <Input type="date" aria-label="من" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-muted-foreground">لحد</span>
            <Input type="date" aria-label="لحد" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            {(from || to) && <Button variant="link" onClick={() => { setFrom(""); setTo(""); }}>كل الفترات</Button>}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold">2. الأقسام اللي هتدخل في التقرير</h2>
          <div className="flex flex-wrap gap-2">
            {MODULES.map((m) => {
              const on = mods.includes(m.key);
              return (
                <Button key={m.key} variant={on ? "default" : "outline"} aria-pressed={on} className="rounded-full px-4" onClick={() => toggle(m.key)}>
                  {m.label}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">الملخص والمؤشرات والرسومات موجودين في التقرير دايماً.</p>
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold">3. التحميل</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-green-700 px-4 hover:bg-green-800">
              <a href={`/api/export/excel?${q}`}><FileSpreadsheet /> تصدير إكسيل (xlsx)</a>
            </Button>
            <Button asChild size="lg" className="bg-red-700 px-4 hover:bg-red-800">
              <a href={`/api/export/pdf?${q}`}><FileText /> تصدير PDF</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
