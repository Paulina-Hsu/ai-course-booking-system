"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Course, OneOnOneSlot, Session } from "@/lib/firestoreTypes";
import {
  createBooking,
  getCourseById,
  listOneOnOneSlots,
  listSessions,
} from "@/lib/firestoreService";

interface SlotInfo {
  id: string;
  title: string;
  disabled: boolean;
}

function getSessionCapacity(session: Session): number {
  if (typeof session.capacity === "number" && Number.isFinite(session.capacity)) return session.capacity;
  if (typeof session.maxCapacity === "number" && Number.isFinite(session.maxCapacity)) return session.maxCapacity;
  return 18;
}

function isSessionOpen(session: Session): boolean {
  if (session.isOpen === false) return false;
  if (session.status === "closed") return false;
  return true;
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const foundCourse = await getCourseById(params.courseId);
      if (!foundCourse) {
        setCourse(null);
        setSlots([]);
        return;
      }
      setCourse(foundCourse);

      if (foundCourse.type === "group") {
        const sessions = await listSessions(foundCourse.id);
        setSlots(
          sessions.map((session: Session) => {
            const capacity = getSessionCapacity(session);
            const isFull = session.enrolledCount >= capacity || session.isFull;
            const isOpen = isSessionOpen(session);
            return {
              id: session.id,
              title: `${session.startDate || ""}${session.startDate ? " " : ""}${session.startTime}-${session.endTime}` +
                (isFull ? "（已額滿）" : isOpen ? "" : "（已關閉）"),
              disabled: !isOpen || isFull,
            };
          }),
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
          })),
        );
      }
    };

    init();
  }, [params.courseId]);

  const amount = course
    ? course.type === "oneOnOne"
      ? course.pricePerHour || course.memberPrice
      : isMember
        ? course.memberPrice
        : course.nonMemberPrice
    : 0;

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

  if (!course) {
    return <div className="card">課程不存在。</div>;
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

        <p className="md:col-span-2 text-sm">預估費用：NT$ {amount}</p>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
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
