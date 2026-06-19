import Link from "next/link";
import { getSessionsByCourse, getOneOnOneSlots, getCourseById } from "@/data/courses";
import { notFound } from "next/navigation";

export default function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const course = getCourseById(params.courseId);
  if (!course) notFound();

  const sessions = course.type === "group" ? getSessionsByCourse(course.id) : getOneOnOneSlots();
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD" }).format(value);

  return (
    <section className="space-y-6">
      <Link href="/courses" className="text-sm text-slate-600 underline">
        ← 回到課程列表
      </Link>
      <div className="card space-y-3">
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-slate-700">{course.description}</p>
        <p>會員價：{formatCurrency(course.memberPrice)} ／ 非會員價：{formatCurrency(course.nonMemberPrice)}</p>
        <p>課程規格：{course.durationMinutes} 分鐘 / 每期 {course.sessionsCount} 堂</p>
        <p>時段：{course.timeSlots.join("、")}</p>
      </div>

      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">
          {course.type === "group" ? "可報名期別" : "可預約時段"}
        </h2>
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-medium">
                {"title" in session ? session.title : `一對一時段 ${session.date}`}
              </p>
              <p className="text-sm text-slate-600">
                {"startDate" in session
                  ? `${session.startDate} ~ ${session.endDate}（${session.startTime}–${session.endTime}）`
                  : `${session.startTime}–${session.endTime}`}
              </p>
            </div>
          ))}
        </div>
        <Link
          href={`/courses/${course.id}/booking`}
          className="mt-2 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
        >
          前往報名表單
        </Link>
      </div>
    </section>
  );
}
