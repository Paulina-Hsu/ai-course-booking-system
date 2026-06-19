"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Course, OneOnOneSlot, Session } from "@/lib/firestoreTypes";
import {
  createBooking,
  getCourseById,
  listSessionClassDates,
  listOneOnOneSlots,
  listSessions,
} from "@/lib/firestoreService";

interface SlotInfo {
  id: string;
  title: string;
  disabled: boolean;
  classDates: string[];
}

function getSessionCapacity(session: Session): number {
  if (typeof session.capacity === "number" && Number.isFinite(session.capacity)) return session.capacity;
  if (typeof session.maxCapacity === "number" && Number.isFinite(session.maxCapacity)) return session.maxCapacity;
  return 18;
}

function isSessionOpen(session: Session): boolean {
  if (session.isOpen === false) return false;
  return true;
}

function getNumericPrice(...values: unknown[]): number {
  for (const value of values) {
    const numericValue = typeof value === "string" ? Number(value) : value;
    if (typeof numericValue === "number" && Number.isFinite(numericValue)) {
      return numericValue;
    }
  }
  return 0;
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

function getRemainingSeats(session: Session): number {
  const capacity = getSessionCapacity(session);
  const enrolledCount = Number(session.enrolledCount || 0);
  return Math.max(capacity - enrolledCount, 0);
}

function buildSessionSlotInfo(session: Session): SlotInfo {
  const capacity = getSessionCapacity(session);
  const enrolledCount = Number(session.enrolledCount || 0);
  const isFull = enrolledCount >= capacity || session.isFull === true;
  const isOpen = isSessionOpen(session);
  const firstDate = getSessionFirstDate(session);
  const sessionTitle = session.title || session.id;
  const dateText = firstDate ? `${firstDate} 起` : "日期未設定";
  const timeText = `${session.startTime || "時間未設定"}-${session.endTime || ""}`.replace(/-$/, "");
  const remainingSeats = getRemainingSeats(session);
  const classDates = listSessionClassDates(session).map((date) => date.replaceAll("-", "/"));

  return {
    id: session.id,
    title: `${sessionTitle}｜${dateText}｜${timeText}｜剩餘 ${remainingSeats} 名${isFull ? "（已額滿）" : isOpen ? "" : "（已關閉）"}`,
    disabled: !isOpen || isFull,
    classDates: classDates.length > 0 ? classDates : firstDate ? [firstDate] : [],
  };
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const routeCourseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
  const courseId = typeof routeCourseId === "string" ? routeCourseId : "";
  const [course, setCourse] = useState<Course | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      setIsLoadingCourse(true);
      setNotFound(false);
      setError("");
      setCourse(null);
      setSlots([]);

      if (!courseId) {
        setNotFound(true);
        setIsLoadingCourse(false);
        return;
      }

      try {
        const foundCourse = await getCourseById(courseId);
        if (!foundCourse) {
          setNotFound(true);
          return;
        }
        setCourse(foundCourse);

        if (foundCourse.type === "group") {
          const sessions = await listSessions(foundCourse.id);
          setSlots(
            sessions
              .map(buildSessionSlotInfo)
              .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.title.localeCompare(b.title, "zh-TW")),
          );
        } else {
          const list = await listOneOnOneSlots();
          setSlots(
            list.map((slot: OneOnOneSlot) => ({
              id: slot.id,
              title: `${slot.date} ${slot.startTime}-${slot.endTime}` +
                (slot.isBooked ? "（已預約）" : "") +
                (slot.isOpen === false ? "（已關閉）" : ""),
              disabled: slot.isBooked || slot.isOpen === false,
              classDates: [],
            })),
          );
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[BookingPage] failed to load course", err instanceof Error ? err.message : err);
        }
        setError("課程資料讀取失敗，請稍後再試");
      } finally {
        setIsLoadingCourse(false);
      }
    };

    void init();
  }, [courseId]);

  const amount = course
    ? course.type === "oneOnOne"
      ? getNumericPrice(course.pricePerHour, course.memberPrice, course.nonMemberPrice)
      : isMember
        ? getNumericPrice(course.memberPrice)
        : getNumericPrice(course.nonMemberPrice)
    : 0;
  const selectedSlotInfo = slots.find((slot) => slot.id === selectedSlot);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course) return;
    if (!selectedSlot) {
      setError("請選擇一期別或時段");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const bookingId = await createBooking(
        course.type === "group"
          ? { courseId: course.id, name, phone, email, isMember, sessionId: selectedSlot }
          : { courseId: course.id, name, phone, email, isMember, oneOnOneSlotId: selectedSlot },
      );

      router.push(
        `/booking-success?bookingId=${encodeURIComponent(bookingId)}&course=${encodeURIComponent(course.name)}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&isMember=${isMember ? "是" : "否"}&price=${amount}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "報名失敗");
      setLoading(false);
    }
  };

  if (isLoadingCourse) {
    return <div className="card">課程資料讀取中...</div>;
  }

  if (error && !course) {
    return (
      <section className="card max-w-2xl space-y-3">
        <h1 className="text-2xl font-bold">課程資料讀取失敗</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <Link href="/courses" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">
          回到課程列表
        </Link>
      </section>
    );
  }

  if (notFound || !course) {
    return (
      <section className="card max-w-2xl space-y-3">
        <h1 className="text-2xl font-bold">找不到課程：{courseId || "-"}</h1>
        <p className="text-sm text-slate-600">請回課程列表確認課程 id / slug。</p>
        <Link href="/courses" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">
          回到課程列表
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">報名：{course.name}</h1>
      <form onSubmit={submit} className="card grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          學員姓名
          <input
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="王小明"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          手機
          <input
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0912-345-678"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          Email
          <input
            type="email"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          會員/非會員
          <select
            value={isMember ? "member" : "non-member"}
            onChange={(event) => setIsMember(event.target.value === "member")}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="non-member">非會員</option>
            <option value="member">會員</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          期別/時段
          <select
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(event.target.value)}
          >
            <option value="">請選擇</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id} disabled={slot.disabled}>
                {slot.title}
              </option>
            ))}
          </select>
        </label>

        {course.type === "group" && selectedSlotInfo?.classDates.length ? (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="mb-2 font-medium">4 堂日期</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {selectedSlotInfo.classDates.slice(0, 4).map((date, index) => (
                <li key={`${selectedSlotInfo.id}-${date}`}>
                  第 {index + 1} 堂：{date}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="md:col-span-2 text-sm">預估費用：NT$ {amount}</p>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
            disabled={loading}
          >
            {loading ? "送出中..." : "送出報名"}
          </button>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      </form>

      <p className="text-xs text-slate-500">同一手機號碼同一期不能重複報名，名額滿額將無法報名。</p>
      <Link href="/courses" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">
        回到課程列表
      </Link>
    </section>
  );
}
