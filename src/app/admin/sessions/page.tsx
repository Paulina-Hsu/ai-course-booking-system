import Link from "next/link";
import { SESSIONS } from "@/data/courses";

export default function AdminSessionsPage() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">期別管理</h1>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
          新增期別（草稿）
        </button>
      </div>

      <div className="grid gap-3">
        {SESSIONS.map((session) => (
          <div key={session.id} className="card">
            <p className="font-semibold">{session.title}</p>
            <p className="text-sm text-slate-600">
              {session.startDate} ~ {session.endDate}（{session.startTime}–{session.endTime}）
            </p>
            <p className="text-sm text-slate-600">已報名：{session.enrolledCount} / {session.maxCapacity}</p>
            <p className="text-xs text-slate-500">課程：{session.courseId}</p>
          </div>
        ))}
      </div>

      <Link href="/admin/bookings" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">
        前往報名管理
      </Link>
    </section>
  );
}
