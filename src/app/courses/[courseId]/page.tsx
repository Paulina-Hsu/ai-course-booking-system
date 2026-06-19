"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Course, OneOnOneSlot, Session } from "@/lib/firestoreTypes";
import { getCourseById, listOneOnOneSlots, listSessions, formatSessionLabel } from "@/lib/firestoreService";

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [terms, setTerms] = useState<(Session | OneOnOneSlot)[]>([]);

  useEffect(() => {
    const init = async () => {
      const foundCourse = await getCourseById(params.courseId);
      if (!foundCourse) {
        setCourse(null);
        setTerms([]);
        return;
      }

      setCourse(foundCourse);

      if (foundCourse.type === "group") {
        const sessions = (await listSessions(foundCourse.id)).filter((session) => session.isOpen !== false);
        setTerms(sessions);
      } else {
        const slots = (await listOneOnOneSlots()).filter((slot) => slot.isOpen !== false);
        setTerms(slots);
      }
    };

    init();
  }, [params.courseId]);

  if (!course) {
    return <div className="card">課程不存在。</div>;
  }

  const labels = terms.map((term) => {
    if ("courseId" in term) {
      return formatSessionLabel(term as Session);
    }
    return `${term.date} ${term.startTime} - ${term.endTime}`;
  });
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
  const timeSlots = Array.isArray(course.timeSlots) ? course.timeSlots : [];
  const priceText =
    course.type === "oneOnOne"
      ? `${formatCurrency(getNumericPrice(course.pricePerHour, course.memberPrice, course.nonMemberPrice))} / 小時`
      : `會員價：${formatCurrency(getNumericPrice(course.memberPrice))} / 非會員價：${formatCurrency(getNumericPrice(course.nonMemberPrice))}`;
  const scheduleText =
    course.type === "oneOnOne" ? "每次 1 小時，08:30-09:30 可預約" : "每期 4 堂，團體每堂 2 小時";

  return (
    <section className="space-y-6">
      <Link href="/courses" className="text-sm text-slate-600 underline">
        &lt; 回到課程列表
      </Link>

      <div className="card space-y-3">
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-slate-700">{course.description}</p>
        <p className="text-sm">{priceText}</p>
        <p className="text-xs text-slate-500">時段：{timeSlots.join(" / ")}</p>
        <p className="text-xs text-slate-500">{scheduleText}</p>
      </div>

      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">可報名時段</h2>
        <div className="space-y-2">
          {labels.map((label, index) => (
            <div key={terms[index]?.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-medium">{label}</p>
            </div>
          ))}
          {terms.length === 0 ? <p className="text-sm text-slate-600">目前沒有可報名時段</p> : null}
        </div>

        <Link
          href={`/courses/${course.id}/booking`}
          className="mt-2 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
        >
          前往報名
        </Link>
      </div>
    </section>
  );
}
