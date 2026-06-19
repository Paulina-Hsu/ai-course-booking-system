"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listOneOnOneSlots } from "@/lib/firestoreService";
import { OneOnOneSlot } from "@/lib/firestoreTypes";

export default function AdminOneOnOnePage() {
  const [slots, setSlots] = useState<OneOnOneSlot[]>([]);

  useEffect(() => {
    listOneOnOneSlots().then(setSlots);
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">1 對 1 時段管理</h1>
      </div>

      <div className="grid gap-3">
        {slots.map((slot) => (
          <div key={slot.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold">{slot.date}</p>
              <p className="text-sm text-slate-600">
                {slot.startTime}-{slot.endTime}（NT$ {slot.pricePerHour}/小時）
              </p>
            </div>
            <div className="text-sm">
              <span
                className={`rounded-full px-3 py-1 ${slot.isBooked ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {slot.isBooked ? "已預約" : "可預約"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Link href="/admin/bookings" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">查看報名管理</Link>
    </section>
  );
}
