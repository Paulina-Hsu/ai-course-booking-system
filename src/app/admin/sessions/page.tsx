"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSessions } from "@/lib/firestoreService";
import { Session } from "@/lib/firestoreTypes";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    listSessions().then(setSessions);
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">期別管理</h1>
      </div>

      <div className="grid gap-3">
        {sessions.map((session) => (
          <div key={session.id} className="card">
            <p className="font-semibold">{session.title}</p>
            <p className="text-sm text-slate-600">
              {session.startDate} ~ {session.endDate}（{session.startTime}-{session.endTime}）
            </p>
            <p className="text-sm text-slate-600">名額：{session.enrolledCount}/{session.maxCapacity}</p>
            <p className="text-xs text-slate-500">課程：{session.courseId}</p>
          </div>
        ))}
      </div>

      <Link href="/admin/one-on-one" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">1 對 1 管理</Link>
    </section>
  );
}
