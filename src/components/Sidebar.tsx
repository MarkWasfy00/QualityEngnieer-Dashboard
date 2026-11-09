"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, ClipboardCheck, AlertTriangle, Wrench, MessageSquareWarning, FileDown, Users, HandCoins, DoorOpen, BadgeCheck, Building2, Gauge, Wallet, TrendingUp } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "لوحة المتابعة", icon: LayoutDashboard },
  { href: "/vehicles", label: "العربيات", icon: Car },
  { href: "/inspections", label: "الفحوصات", icon: ClipboardCheck },
  { href: "/defects", label: "العيوب والمشاكل", icon: AlertTriangle },
  { href: "/service", label: "أوامر الصيانة", icon: Wrench },
  { href: "/complaints", label: "شكاوى العملاء", icon: MessageSquareWarning },
  { href: "/salesmen", label: "البيّاعين", icon: BadgeCheck },
  { href: "/sales", label: "المبيعات", icon: HandCoins },
  { href: "/visits", label: "زيارات العملاء", icon: DoorOpen },
  { href: "/sales-report", label: "تحليل المبيعات (أودو)", icon: TrendingUp },
  { href: "/receivables", label: "المديونيات والتحصيل", icon: Wallet },
  { href: "/workers", label: "أداء العمال", icon: Users },
  { href: "/branches/quality", label: "جودة الفروع", icon: Gauge },
  { href: "/branches", label: "الفروع", icon: Building2 },
  { href: "/reports", label: "التقارير والتصدير", icon: FileDown },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy px-3 py-6 text-slate-300 md:flex">
      <div className="mb-8 flex items-center gap-2 px-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white"><Car size={20} /></div>
        <div>
          <div className="text-sm font-semibold text-white">تحليلات الجودة</div>
          <div className="text-xs text-slate-400">إدارة الجودة بالمعرض</div>
        </div>
      </div>
      <nav className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href) && !NAV.some((n) => n.href.length > href.length && n.href.startsWith(href) && path.startsWith(n.href));
          return (
            <Link key={href} href={href}
              className={clsx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white")}>
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} className="btn-ghost whitespace-nowrap !px-3 !py-1.5 text-xs">{n.label}</Link>
      ))}
    </div>
  );
}
