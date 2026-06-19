"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Course } from "@/lib/firestoreTypes";
import { listCourses } from "@/lib/firestoreService";

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    listCourses().then(setCourses);
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD" }).format(value);

  return (
    <section className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-10 text-white sm:px-10">
        <p className="mb-2 text-sm tracking-wider opacity-95">AI COURSE BOOKING</p>
        <h1 className="text-2xl font-bold leading-tight md:text-4xl">AI 課程線上報名系統</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sky-100 md:text-base">
          先建立課程與期別後，即可直接提供學員線上瀏覽、選擇與報名。首次可用 seed 建立初始資料。
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          前往報名
        </Link>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold">規格摘要</h2>
        <ul className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <li>團課每堂 2 小時</li>
          <li>團課時段：10:00-12:00、14:00-16:00</li>
          <li>1 對 1 時段：08:30-09:30</li>
          <li>每班上限 18 人</li>
          <li>每期固定 4 週（4 堂）</li>
          <li>支援會員價與非會員價</li>
        </ul>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {courses.map((course) => {
          const timeSlots = Array.isArray(course.timeSlots) ? course.timeSlots : [];

          return (
          <div key={course.id} className="card space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{course.slug}</p>
            <h3 className="text-lg font-semibold">{course.name}</h3>
            <p className="text-sm text-slate-600">{course.description}</p>
            <p className="text-sm">
              會員價：{formatCurrency(course.memberPrice)} / 非會員價：{formatCurrency(course.nonMemberPrice)}
            </p>
            <p className="text-xs text-slate-500">時段：{timeSlots.join(" / ")}</p>
            <Link
              href={`/courses/${course.id}`}
              className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium"
            >
              查看課程
            </Link>
          </div>
          );
        })}
      </div>
    </section>
  );
}
