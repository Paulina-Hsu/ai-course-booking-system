"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import { getCourseById, getOneOnOneSlots, getSessionsByCourse } from "@/data/courses";
import { OneOnOneSlot, Session } from "@/lib/firestoreTypes";

export default function BookingPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const course = getCourseById(params.courseId);
  if (!course) notFound();

  const sessions = useMemo<(Session | OneOnOneSlot)[]>(() => {
    if (!course) return [];
    return course.type === "group" ? getSessionsByCourse(course.id) : getOneOnOneSlots();
  }, [course]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [selectedSession, setSelectedSession] = useState("");

  const price = isMember ? course.memberPrice : course.nonMemberPrice;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSession) {
      alert("請選擇報名時段");
      return;
    }
    const query = new URLSearchParams({
      course: course.name,
      name,
      phone,
      email,
      session: selectedSession,
      price: String(price),
      isMember: isMember ? "是" : "否",
    });
    router.push(`/booking-success?${query.toString()}`);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">報名表單：{course.name}</h1>
      <form onSubmit={onSubmit} className="card grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          姓名
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="王小明"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          手機
          <input
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="0912-345-678"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="name@example.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          是否會員
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
          選擇時段
          <select
            required
            value={selectedSession}
            onChange={(event) => setSelectedSession(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">請選擇</option>
            {sessions.map((session) => {
              if (course.type === "group") {
                if ("startDate" in session && "endDate" in session && "title" in session) {
                  return (
                    <option key={session.id} value={session.id}>
                      {`${session.title}（${session.startDate} ~ ${session.endDate}）`}
                    </option>
                  );
                }
              }
              if ("date" in session) {
                return (
                  <option key={session.id} value={session.id}>
                    {`${session.date}  ${session.startTime}–${session.endTime}`}
                  </option>
                );
              }
              return (
                <option key={session.id} value={session.id}>
                  {session.id}
                </option>
              );
            })}
          </select>
        </label>

        <div className="md:col-span-2 text-sm">
          <p>應繳金額（不含活動折扣）：{price}</p>
          <p className="text-xs text-slate-500">報名預設狀態：待確認</p>
        </div>

        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white md:col-span-2"
        >
          送出報名
        </button>
      </form>
    </section>
  );
}
