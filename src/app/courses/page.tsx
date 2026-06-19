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
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">課程列表</h1>
        <p className="text-sm text-slate-600">選擇課程、期別與時段，直接送出報名。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => {
          const courseIdentifier = course.slug || course.id;
          const timeSlots = Array.isArray(course.timeSlots) ? course.timeSlots : [];
          const priceText =
            course.type === "oneOnOne"
              ? `${formatCurrency(getNumericPrice(course.pricePerHour, course.memberPrice, course.nonMemberPrice))} / 小時`
              : `會員價：${formatCurrency(getNumericPrice(course.memberPrice))} / 非會員價：${formatCurrency(getNumericPrice(course.nonMemberPrice))}`;
          const scheduleText =
            course.type === "oneOnOne" ? "每次 1 小時，08:30-09:30 可預約" : "每期 4 堂，團體每堂 2 小時";

          return (
            <div key={course.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold">{course.name}</h2>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                  {course.type === "group" ? "團體班" : "1對1"}
                </span>
              </div>
              <p className="text-sm text-slate-700">{course.description}</p>
              <p className="text-sm">{priceText}</p>
              <p className="text-xs text-slate-500">時段：{timeSlots.join(" / ")}</p>
              <p className="text-xs text-slate-500">{scheduleText}</p>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Link
                  href={`/courses/${courseIdentifier}`}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white"
                  style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                >
                  查看詳情
                </Link>
                <Link
                  href={`/courses/${courseIdentifier}/booking`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-900"
                  style={{ color: "#0f172a" }}
                >
                  立即報名
                </Link>
              </div>
              {process.env.NODE_ENV === "development" ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  <p className="font-medium text-slate-600">開發除錯資訊</p>
                  <p>course.id：{course.id || "-"}</p>
                  <p>course.slug：{course.slug || "-"}</p>
                  <p>course.name：{course.name || "-"}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {courses.length === 0 ? <p>目前尚未讀取到課程資料，請稍後再試或聯絡管理員確認課程設定。</p> : null}
    </section>
  );
}
