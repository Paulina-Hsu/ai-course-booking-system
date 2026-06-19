import Link from "next/link";

export default function AdminRootPage() {
  return (
    <section className="card space-y-3">
      <h1 className="text-xl font-semibold">AI 課程管理後台</h1>
      <p className="text-sm text-slate-600">請先登入再進入管理功能</p>
      <Link href="/admin/login" className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
        前往登入
      </Link>
    </section>
  );
}
