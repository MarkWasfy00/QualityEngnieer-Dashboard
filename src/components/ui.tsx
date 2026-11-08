import Link from "next/link";
import { Plus } from "lucide-react";
import { MobileNav } from "./Sidebar";
import { SEVERITY_COLORS, STATUS_COLORS, label } from "@/lib/constants";

export function PageHeader({ title, subtitle, newHref, children }: {
  title: string; subtitle?: string; newHref?: string; children?: React.ReactNode;
}) {
  return (
    <>
      <MobileNav />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {children}
          {newHref && <Link href={newHref} className="btn-primary"><Plus size={16} /> إضافة جديد</Link>}
        </div>
      </div>
    </>
  );
}

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const c = SEVERITY_COLORS[value] ?? STATUS_COLORS[value] ?? { bg: "EEF2FA", fg: "1E2A44" };
  return (
    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: `#${c.bg}`, color: `#${c.fg}` }}>{label(value)}</span>
  );
}
