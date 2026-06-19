import { AdminAuthGate } from "@/components/AdminAuthGate";
import Link from "next/link";

const adminMenus = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/courses", label: "課程管理" },
  { href: "/admin/sessions", label: "期別管理" },
  { href: "/admin/one-on-one", label: "1 對 1 管理" },
  { href: "/admin/bookings", label: "報名管理" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <section className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <p className="font-semibold">AI 課程預約系統後台</p>
          <div className="flex flex-wrap gap-2">
            {adminMenus.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/30 px-3 py-1 text-sm"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/" className="rounded-full bg-white px-3 py-1 text-sm text-slate-900">
              前台首頁
            </Link>
          </div>
        </header>
        {children}
      </section>
    </AdminAuthGate>
  );
}
