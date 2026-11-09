import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/Sidebar";
import { DirectionProvider } from "@/components/ui/direction";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "تحليلات جودة العربيات",
  description: "متابعة الفحص والعيوب والصيانة وشكاوى العملاء في المعرض",
};
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar-EG" dir="rtl" className={cairo.variable}>
      <body className="font-sans antialiased">
        <DirectionProvider dir="rtl">
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="min-w-0">
                <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
                  <SidebarTrigger aria-label="إظهار / إخفاء القائمة" />
                  <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
                  <span className="text-sm font-semibold">تحليلات الجودة</span>
                </header>
                <div className="p-4 md:p-8">{children}</div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
