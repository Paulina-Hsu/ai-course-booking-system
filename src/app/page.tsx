import Link from "next/link";
import { COURSES, COURSE_TIME_SLOTS } from "@/data/courses";

export default function HomePage() {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD" }).format(value);

  return (
    <section className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-10 text-white sm:px-10">
        <p className="mb-2 text-sm tracking-wider opacity-95">AI COURSE BOOKING</p>
        <h1 className="text-2xl font-bold leading-tight md:text-4xl">
          線上預約 AI 課程，快速開始你的學習
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sky-100 md:text-base">
          支援團班與一對一預約，管理員可直接管理名額、狀態與名單。
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          開始看課程
        </Link>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">核心規則</h2>
        <ul className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <li>• 團班每堂 2 小時</li>
          <li>• 團班時段：10:00–12:00、14:00–16:00</li>
          <li>• 1 對 1 專屬時段：08:30–09:30</li>
          <li>• 每班最多 18 人</li>
          <li>• 一期固定 4 堂課</li>
          <li>• 會員 / 非會員分別報價</li>
        </ul>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {COURSES.map((course) => (
          <div key={course.id} className="card space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{course.slug}</p>
            <h3 className="text-lg font-semibold">{course.name}</h3>
            <p className="text-sm text-slate-600">{course.description}</p>
            <p className="text-sm">
              會員價 {formatCurrency(course.memberPrice)} / 非會員 {formatCurrency(course.nonMemberPrice)}
            </p>
            <p className="text-xs text-slate-500">時段：{COURSE_TIME_SLOTS.slice(0, 2).join("、")}</p>
            <Link
              href={`/courses/${course.id}`}
              className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium"
            >
              查看課程
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
