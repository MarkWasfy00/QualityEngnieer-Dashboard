import { Printer, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { VISIT_OUTCOMES, label } from "@/lib/constants";

const lbl = "mb-1 text-xs text-muted-foreground";

/** Plain GET form → opens the visits PDF with the chosen filters (no JS needed). */
export default function VisitsPrintBar({ salesmen }: { salesmen: { value: number; label: string }[] }) {
  return (
    <Card className="mb-4">
      <CardContent>
        <form action="/api/export/visits" method="get" target="_blank" className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="print-from" className={lbl}>من</Label>
            <Input id="print-from" type="date" name="from" className="w-auto" />
          </div>
          <div>
            <Label htmlFor="print-to" className={lbl}>لحد</Label>
            <Input id="print-to" type="date" name="to" className="w-auto" />
          </div>
          <div>
            <Label htmlFor="print-salesman" className={lbl}>البيّاع</Label>
            <NativeSelect id="print-salesman" name="salesmanId" defaultValue="">
              <NativeSelectOption value="">كل البيّاعين</NativeSelectOption>
              {salesmen.map((m) => <NativeSelectOption key={m.value} value={m.value}>{m.label}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="print-outcome" className={lbl}>النتيجة</Label>
            <NativeSelect id="print-outcome" name="outcome" defaultValue="">
              <NativeSelectOption value="">الكل</NativeSelectOption>
              {VISIT_OUTCOMES.map((o) => <NativeSelectOption key={o} value={o}>{label(o)}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          <Button type="submit"><Printer /> طباعة PDF</Button>
          <Button type="submit" variant="outline" name="download" value="1"><Download /> تحميل</Button>
          <Button type="submit" variant="outline" name="format" value="xlsx" formAction="/api/export/section/visits" formTarget="_self">
            <FileSpreadsheet className="text-green-700" /> إكسيل
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
