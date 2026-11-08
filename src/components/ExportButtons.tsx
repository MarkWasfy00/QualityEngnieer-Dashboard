import { FileSpreadsheet, Printer } from "lucide-react";

/** PDF (opens for printing) + Excel buttons. `href` builds the URL for a format. */
export default function ExportButtons({ section, pdfHref, xlsxHref }: { section?: string; pdfHref?: string; xlsxHref?: string }) {
  const pdf = pdfHref ?? `/api/export/section/${section}?format=pdf`;
  const xlsx = xlsxHref ?? `/api/export/section/${section}?format=xlsx`;
  return (
    <>
      <a href={pdf} target="_blank" rel="noopener" className="btn-ghost"><Printer size={16} /> PDF</a>
      <a href={xlsx} className="btn-ghost"><FileSpreadsheet size={16} className="text-green-700" /> إكسيل</a>
    </>
  );
}
