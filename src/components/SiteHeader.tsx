import Link from "next/link";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/courses", label: "課程列表" },
];

const adminItems = [
  { href: "/admin/login", label: "管理員登入" },
];

export function SiteHeader() {
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
              className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-900 transition hover:bg-slate-100"
              style={{ color: "#0f172a" }}
            >
              {item.label}
            </Link>
          ))}
          {adminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white transition hover:bg-slate-700"
              style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
