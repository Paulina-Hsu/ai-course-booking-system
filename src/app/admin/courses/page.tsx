import Link from "next/link";
import { COURSES } from "@/data/courses";

export default function AdminCoursesPage() {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD" }).format(value);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">課程管理</h1>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
          新增課程（草稿）
        </button>
      </div>

      <div className="grid gap-3">
        {COURSES.map((course) => (
          <div key={course.id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">{course.name}</h2>
              <p className="text-sm text-slate-600">會員價：{formatCurrency(course.memberPrice)}</p>
              <p className="text-sm text-slate-600">非會員價：{formatCurrency(course.nonMemberPrice)}</p>
              <p className="text-xs text-slate-500">
                時段：{course.timeSlots.join("、")}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <button className="rounded-full border border-slate-300 px-3 py-1">編輯</button>
              <button className="rounded-full border border-slate-300 px-3 py-1">下架</button>
            </div>
          </div>
        ))}
      </div>

      <Link href="/admin/sessions" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">
        前往期別管理
      </Link>
    </section>
  );
}
