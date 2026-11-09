import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEVERITY_COLORS, STATUS_COLORS, label } from "@/lib/constants";

export function PageHeader({ title, subtitle, newHref, children }: {
  title: string; subtitle?: string; newHref?: string; children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        {newHref && <Button asChild><Link href={newHref}><Plus /> إضافة جديد</Link></Button>}
      </div>
    </div>
  );
}

/** Severity / status code as a colored pill (colors shared with the Excel and PDF exports). */
export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const c = SEVERITY_COLORS[value] ?? STATUS_COLORS[value] ?? { bg: "EEF2FA", fg: "1E2A44" };
  return <Badge className="font-semibold" style={{ background: `#${c.bg}`, color: `#${c.fg}` }}>{label(value)}</Badge>;
}
