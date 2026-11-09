import { FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** PDF (opens for printing) + Excel buttons. `href` builds the URL for a format. */
export default function ExportButtons({ section, pdfHref, xlsxHref }: { section?: string; pdfHref?: string; xlsxHref?: string }) {
  const pdf = pdfHref ?? `/api/export/section/${section}?format=pdf`;
  const xlsx = xlsxHref ?? `/api/export/section/${section}?format=xlsx`;
  return (
    <>
      <Button asChild variant="outline"><a href={pdf} target="_blank" rel="noopener"><Printer /> PDF</a></Button>
      <Button asChild variant="outline"><a href={xlsx}><FileSpreadsheet className="text-green-700" /> إكسيل</a></Button>
    </>
  );
}
