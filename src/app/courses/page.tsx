"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Course } from "@/lib/firestoreTypes";
import { listCourses } from "@/lib/firestoreService";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    listCourses().then(setCourses);
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD" }).format(value);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">課程列表</h1>
        <p className="text-sm text-slate-600">選擇課程、期別與時段，直接送出報名。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <div key={course.id} className="card space-y-3">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">{course.name}</h2>
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                {course.type === "group" ? "團體班" : "1對1"}
              </span>
            </div>
            <p className="text-sm text-slate-700">{course.description}</p>
            <p className="text-sm">
              會員價：{formatCurrency(course.memberPrice)} / 非會員價：{formatCurrency(course.nonMemberPrice)}
            </p>
            <p className="text-xs text-slate-500">時段：{course.timeSlots.join(" / ")}</p>
            <p className="text-xs text-slate-500">每期 4 堂，團體每堂 2 小時</p>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Link
                href={`/courses/${course.id}`}
                className="rounded-full bg-slate-900 px-4 py-2 text-center text-sm text-white"
              >
                查看課程
              </Link>
              <Link
                href={`/courses/${course.id}/booking`}
                className="rounded-full border border-slate-300 px-4 py-2 text-center text-sm"
              >
                立即報名
              </Link>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 ? <p>尚未讀取到課程資料，請先設定 Firebase 並完成 seed。</p> : null}
    </section>
  );
}
