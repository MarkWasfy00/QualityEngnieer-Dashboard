"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, ClipboardCheck, AlertTriangle, Wrench, MessageSquareWarning, FileDown, Users, HandCoins, DoorOpen, BadgeCheck, Building2, Gauge, Wallet, TrendingUp, FileSpreadsheet, Upload } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

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
  { href: "/data", label: "تقارير الإكسيل", icon: FileSpreadsheet },
  { href: "/receivables/import", label: "رفع ملفات إكسيل", icon: Upload },
  { href: "/workers", label: "أداء العمال", icon: Users },
  { href: "/branches/quality", label: "جودة الفروع", icon: Gauge },
  { href: "/branches", label: "الفروع", icon: Building2 },
  { href: "/reports", label: "التقارير والتصدير", icon: FileDown },
];

export default function AppSidebar() {
  const path = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar side="right" dir="rtl" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Car /></div>
                <div className="grid flex-1 text-start leading-tight">
                  <span className="truncate font-semibold text-sidebar-accent-foreground">تحليلات الجودة</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">إدارة الجودة بالمعرض</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? path === "/" : path.startsWith(href) && !NAV.some((n) => n.href.length > href.length && n.href.startsWith(href) && path.startsWith(n.href));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={{ children: label, side: "left" }}>
                      <Link href={href} onClick={() => setOpenMobile(false)}><Icon /><span>{label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
