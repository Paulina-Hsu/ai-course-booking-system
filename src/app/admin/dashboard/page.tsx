"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCourses, listSessions, listOneOnOneSlots } from "@/lib/firestoreService";
import { Course, OneOnOneSlot, Session } from "@/lib/firestoreTypes";
import { getBookingCounts } from "@/lib/firestoreService";

export default function AdminDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [oneOnOneSlots, setOneOnOneSlots] = useState<OneOnOneSlot[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const load = async () => {
      const [courseData, sessionData, slotData, bookingCounts] = await Promise.all([
        listCourses(),
        listSessions(),
        listOneOnOneSlots(),
        getBookingCounts(),
      ]);
      setCourses(courseData);
      setSessions(sessionData);
      setOneOnOneSlots(slotData);
      setCounts(bookingCounts);
    };

    load();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">課程數</p>
          <p className="text-2xl font-bold">{courses.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">期別（含 1 對 1）</p>
          <p className="text-2xl font-bold">{sessions.length + oneOnOneSlots.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">待確認</p>
          <p className="text-2xl font-bold">{counts?.pending || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">已付款</p>
          <p className="text-2xl font-bold">{counts?.paid || 0}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">狀態統計</h2>
        <p className="text-sm text-slate-600">待確認：{counts?.pending || 0}</p>
        <p className="text-sm text-slate-600">已確認：{counts?.confirmed || 0}</p>
        <p className="text-sm text-slate-600">已付款：{counts?.paid || 0}</p>
        <p className="text-sm text-slate-600">候補：{counts?.waitlist || 0}</p>
        <p className="text-sm text-slate-600">已取消：{counts?.cancelled || 0}</p>
      </div>

      <div className="flex gap-2">
        <Link href="/admin/courses" className="rounded-full border border-slate-300 px-4 py-2 text-sm">前往課程管理</Link>
        <Link href="/admin/bookings" className="rounded-full border border-slate-300 px-4 py-2 text-sm">前往報名管理</Link>
      </div>
    </section>
  );
}
