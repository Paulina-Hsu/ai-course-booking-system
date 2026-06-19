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

  const getNumericPrice = (...values: unknown[]) => {
    for (const value of values) {
      const numericValue = typeof value === "string" ? Number(value) : value;
      if (typeof numericValue === "number" && Number.isFinite(numericValue)) {
        return numericValue;
      }
    }
    return 0;
  };

  const formatCurrency = (value: number) => `NT$${new Intl.NumberFormat("zh-TW").format(value)}`;

  return (
    <section className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-10 text-white sm:px-10">
        <p className="mb-2 text-sm tracking-wider opacity-95">AI COURSE BOOKING</p>
        <h1 className="text-2xl font-bold leading-tight md:text-4xl">AI 課程線上報名系統</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sky-100 md:text-base">
          選擇適合你的 AI 課程，查看期別與上課時段，線上送出報名資料，管理員確認後即完成報名。
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100"
        >
          前往課程列表
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
          const priceText =
            course.type === "oneOnOne"
              ? `${formatCurrency(getNumericPrice(course.pricePerHour, course.memberPrice, course.nonMemberPrice))} / 小時`
              : `會員價：${formatCurrency(getNumericPrice(course.memberPrice))} / 非會員價：${formatCurrency(getNumericPrice(course.nonMemberPrice))}`;
          const scheduleText =
            course.type === "oneOnOne" ? "每次 1 小時，08:30-09:30 可預約" : "每期 4 堂，團體每堂 2 小時";

          return (
            <div key={course.id} className="card space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{course.slug}</p>
              <h3 className="text-lg font-semibold">{course.name}</h3>
              <p className="text-sm text-slate-600">{course.description}</p>
              <p className="text-sm">{priceText}</p>
              <p className="text-xs text-slate-500">時段：{timeSlots.join(" / ")}</p>
              <p className="text-xs text-slate-500">{scheduleText}</p>
              <Link
                href={`/courses/${course.id}`}
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900"
              >
                查看詳情
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
