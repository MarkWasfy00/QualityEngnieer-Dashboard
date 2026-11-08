import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "تحليلات جودة العربيات",
  description: "متابعة الفحص والعيوب والصيانة وشكاوى العملاء في المعرض",
};
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar-EG" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
