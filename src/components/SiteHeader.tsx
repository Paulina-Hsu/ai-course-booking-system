"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/courses", label: "課程列表" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const linkClassName = (href: string) =>
    isActive(href)
      ? "inline-flex items-center whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white transition hover:bg-slate-700"
      : "inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-900 transition hover:bg-slate-100";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-wide text-slate-900">
          AI 課程預約系統
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm md:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClassName(item.href)}
              style={isActive(item.href) ? { backgroundColor: "#0f172a", color: "#ffffff" } : { color: "#0f172a" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}