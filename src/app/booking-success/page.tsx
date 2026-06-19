"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BOOKING_STATUS_OPTIONS, Booking } from "@/lib/firestoreTypes";
import {
  formatSessionLabel,
  getBookingById,
  getCourseById,
  getOneOnOneSlotById,
  getSessionById,
} from "@/lib/firestoreService";

interface BookingSuccessDetails {
  booking: Booking & { id: string };
  courseName: string;
  sessionLabel: string;
}

const statusMap = Object.fromEntries(BOOKING_STATUS_OPTIONS.map((item) => [item.value, item.label]));

function formatCurrency(value: number) {
  return `NT$ ${new Intl.NumberFormat("zh-TW").format(value)}`;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";
  const [details, setDetails] = useState<BookingSuccessDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!bookingId) {
        setError("找不到訂單編號，請回到課程列表重新確認報名結果。");
        setLoading(false);
        return;
      }

      try {
        const booking = await getBookingById(bookingId);
        if (!booking) {
          setError("找不到這筆報名資料，請確認訂單編號是否正確。");
          setLoading(false);
          return;
        }

        const [course, session, slot] = await Promise.all([
          getCourseById(booking.courseId),
          booking.sessionId ? getSessionById(booking.sessionId) : Promise.resolve(null),
          booking.oneOnOneSlotId ? getOneOnOneSlotById(booking.oneOnOneSlotId) : Promise.resolve(null),
        ]);

        const sessionLabel = session
          ? formatSessionLabel(session)
          : slot
            ? `1 對 1 預約｜${slot.date.replaceAll("-", "/")} 起｜${slot.startTime}-${slot.endTime}`
            : "未找到期別資料";

        setDetails({
          booking,
          courseName: course?.name || booking.courseId,
          sessionLabel,
        });
      } catch {
        setError("報名已送出，但讀取報名明細時發生問題。請稍後到後台或以訂單編號查詢。");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [bookingId]);

  return (
    <section className="card max-w-2xl">
      <h1 className="text-2xl font-bold text-green-700">報名成功</h1>
      <p className="mt-2 text-sm text-slate-600">報名資料已送出，狀態預設為「待確認」。</p>

      {loading ? <p className="mt-4 text-sm text-slate-600">讀取報名明細中...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{error}</p> : null}

      {details ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>訂單編號：{details.booking.id}</p>
          <p>姓名：{details.booking.name}</p>
          <p>手機：{details.booking.phone}</p>
          <p>Email：{details.booking.email || "未填寫"}</p>
          <p>課程：{details.courseName}</p>
          <p>期別：{details.sessionLabel}</p>
          <p>會員：{details.booking.isMember ? "是" : "否"}</p>
          <p>金額：{formatCurrency(details.booking.amount)}</p>
          <p>狀態：{statusMap[details.booking.status] || "待確認"}</p>
        </div>
      ) : null}

      <Link
        href="/courses"
        className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
      >
        回到課程列表
      </Link>
    </section>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<section className="card max-w-2xl">讀取報名明細中...</section>}>
      <BookingSuccessContent />
    </Suspense>
  );
}
