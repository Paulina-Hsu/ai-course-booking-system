import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 課程預約系統",
  description:
    "AI 課程預約系統 MVP，提供課程列表、報名流程與管理者後台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
