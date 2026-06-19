"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCourses } from "@/lib/firestoreService";
import { Course } from "@/lib/firestoreTypes";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    listCourses().then(setCourses);
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">課程管理</h1>
      </div>

      <div className="grid gap-3">
        {courses.map((course) => (
          <div key={course.id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">{course.name}</h2>
              <p className="text-sm text-slate-600">會員價：NT$ {course.memberPrice}</p>
              <p className="text-sm text-slate-600">非會員價：NT$ {course.nonMemberPrice}</p>
              <p className="text-xs text-slate-500">時段：{course.timeSlots.join(" / ")}</p>
            </div>
            <div className="text-sm text-slate-600">課程類型：{course.type}</div>
          </div>
        ))}
      </div>

      <Link href="/admin/sessions" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">前往期別管理</Link>
    </section>
  );
}
