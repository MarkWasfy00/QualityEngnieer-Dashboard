import { Printer, Download, FileSpreadsheet } from "lucide-react";
import { VISIT_OUTCOMES, label } from "@/lib/constants";

/** Plain GET form → opens the visits PDF with the chosen filters (no JS needed). */
export default function VisitsPrintBar({ salesmen }: { salesmen: { value: number; label: string }[] }) {
  return (
    <form action="/api/export/visits" method="get" target="_blank" className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">من</label>
        <input type="date" name="from" className="input !w-auto !py-1.5" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">لحد</label>
        <input type="date" name="to" className="input !w-auto !py-1.5" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">البيّاع</label>
        <select name="salesmanId" className="input !w-auto !py-1.5" defaultValue="">
          <option value="">كل البيّاعين</option>
          {salesmen.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">النتيجة</label>
        <select name="outcome" className="input !w-auto !py-1.5" defaultValue="">
          <option value="">الكل</option>
          {VISIT_OUTCOMES.map((o) => <option key={o} value={o}>{label(o)}</option>)}
        </select>
      </div>
      <button type="submit" className="btn-dark"><Printer size={16} /> طباعة PDF</button>
      <button type="submit" name="download" value="1" className="btn-ghost"><Download size={16} /> تحميل</button>
      <button type="submit" name="format" value="xlsx" formAction="/api/export/section/visits" formTarget="_self" className="btn-ghost"><FileSpreadsheet size={16} className="text-green-700" /> إكسيل</button>
    </form>
  );
}
