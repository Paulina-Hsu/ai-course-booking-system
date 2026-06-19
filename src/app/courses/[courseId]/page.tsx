"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Course, OneOnOneSlot, Session } from "@/lib/firestoreTypes";
import { getCourseById, listOneOnOneSlots, listSessionClassDates, listSessions } from "@/lib/firestoreService";
import { getCourseDetailContent } from "@/lib/courseContent";

function getSessionCapacity(session: Session): number {
  if (typeof session.capacity === "number" && Number.isFinite(session.capacity)) return session.capacity;
  if (typeof session.maxCapacity === "number" && Number.isFinite(session.maxCapacity)) return session.maxCapacity;
  return 18;
}

function formatDateValue(value: unknown): string {
  if (typeof value === "string") return value.replaceAll("-", "/").slice(0, 10);
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }
  return "";
}

function getSessionFirstDate(session: Session): string {
  return formatDateValue(session.firstClassDate) || formatDateValue(session.startDate);
}

function isSessionSelectable(session: Session): boolean {
  const enrolledCount = Number(session.enrolledCount || 0);
  return session.isOpen !== false && session.isFull !== true && enrolledCount < getSessionCapacity(session);
}

function formatSessionOptionLabel(session: Session): string {
  const firstDate = getSessionFirstDate(session);
  const remainingSeats = Math.max(getSessionCapacity(session) - Number(session.enrolledCount || 0), 0);
  const dateText = firstDate ? `${firstDate} 起` : "日期未設定";
  const timeText = `${session.startTime || "時間未設定"}-${session.endTime || ""}`.replace(/-$/, "");
  return `${session.title || session.id}｜${dateText}｜${timeText}｜剩餘 ${remainingSeats} 名`;
}

function getSessionClassDates(session: Session): string[] {
  const dates = listSessionClassDates(session).map((date) => date.replaceAll("-", "/"));
  const firstDate = getSessionFirstDate(session);
  return dates.length > 0 ? dates : firstDate ? [firstDate] : [];
}

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
        const sessions = (await listSessions(foundCourse.id)).filter(isSessionSelectable);
        setTerms(sessions);
      } else {
        const slots = (await listOneOnOneSlots()).filter((slot) => slot.isOpen !== false && !slot.isBooked);
        setTerms(slots);
      }
    };

    init();
  }, [params.courseId]);

  if (!course) {
    return <div className="card">課程不存在。</div>;
  }

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
  const content = getCourseDetailContent(course);
  const groupSessions = terms.filter((term): term is Session => "courseId" in term);
  const oneOnOneSlots = terms.filter((term): term is OneOnOneSlot => !("courseId" in term));
  const priceText =
    course.type === "oneOnOne"
      ? `${formatCurrency(getNumericPrice(course.pricePerHour, course.memberPrice, course.nonMemberPrice))} / 小時`
      : `會員價：${formatCurrency(getNumericPrice(course.memberPrice))} / 非會員價：${formatCurrency(getNumericPrice(course.nonMemberPrice))}`;
  const scheduleText =
    course.type === "oneOnOne" ? "每次 1 小時，08:30-09:30 可預約" : "每期 4 堂，每堂 2 小時";
  const ctaText = course.type === "oneOnOne" ? "預約 1 對 1" : "立即報名";

  return (
    <section className="space-y-6">
      <Link href="/courses" className="text-sm text-slate-600 underline">
        &lt; 回到課程列表
      </Link>

      <div className="card space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {course.type === "oneOnOne" ? "Personal AI Coaching" : "Group Course"}
          </p>
          <h1 className="text-2xl font-bold md:text-3xl">{course.name}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            {content.intro || course.description}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">價格資訊</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{priceText}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">課程形式</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {course.type === "oneOnOne" ? "1 對 1 專屬課程" : "團班課程"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">上課安排</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{scheduleText}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">適合對象</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {content.audience.map((item) => (
              <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">{content.outcomeTitle}</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {content.outcomes.map((item) => (
              <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">{content.curriculumTitle}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {content.curriculum.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {course.type === "oneOnOne" ? "可預約時段" : "可報名期別"}
            </h2>
            <p className="text-sm text-slate-600">
              {course.type === "oneOnOne"
                ? "選擇開放時段後即可前往填寫預約資料。"
                : "每一期顯示期別名稱、第一堂日期、4 堂日期、時段與剩餘名額。"}
            </p>
          </div>
          <Link
            href={`/courses/${course.id}/booking`}
            className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
            style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
          >
            {ctaText}
          </Link>
        </div>

        {course.type === "group" ? (
          <div className="space-y-3">
            {groupSessions.map((session) => {
              const classDates = getSessionClassDates(session);
              const remainingSeats = Math.max(getSessionCapacity(session) - Number(session.enrolledCount || 0), 0);

              return (
                <div key={session.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{session.title || session.id}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatSessionOptionLabel(session)}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      剩餘 {remainingSeats} 名
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    {classDates.slice(0, 4).map((date, index) => (
                      <p key={`${session.id}-${date}`} className="rounded-lg bg-slate-50 px-3 py-2">
                        第 {index + 1} 堂：{date}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
            {groupSessions.length === 0 ? <p className="text-sm text-slate-600">目前沒有可報名期別。</p> : null}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {oneOnOneSlots.map((slot) => (
              <div key={slot.id} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold">{slot.date.replaceAll("-", "/")}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {slot.startTime}-{slot.endTime}
                </p>
                <p className="mt-2 text-xs text-emerald-700">可預約</p>
              </div>
            ))}
            {oneOnOneSlots.length === 0 ? <p className="text-sm text-slate-600">目前沒有可預約時段。</p> : null}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/courses/${course.id}/booking`}
          className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
          style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
        >
          {ctaText}
        </Link>
        <Link href="/courses" className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900">
          回到課程列表
        </Link>
      </div>
    </section>
  );
}
