"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BOOKING_STATUS_OPTIONS, Booking, ContactPreference } from "@/lib/firestoreTypes";
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
const contactPreferenceMap: Record<ContactPreference, string> = {
  phone: "手機",
  email: "Email",
  line: "LINE",
};

function formatCurrency(value: number) {
  const numericValue = Number(value) || 0;
  return `NT$${new Intl.NumberFormat("zh-TW").format(numericValue)}`;
}

function displayValue(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "未填寫";
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
        setError("找不到訂單編號，請回到課程列表重新報名或聯絡管理員。");
        setLoading(false);
        return;
      }

      try {
        const booking = await getBookingById(bookingId);
        if (!booking) {
          setError("找不到報名資料，請確認訂單編號是否正確，或聯絡管理員協助查詢。");
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
            ? `1 對 1 預約｜${slot.date.replaceAll("-", "/")}｜${slot.startTime}-${slot.endTime}`
            : "未設定期別或時段";

        setDetails({
          booking,
          courseName: course?.name || booking.courseId,
          sessionLabel,
        });
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[BookingSuccess] failed to load booking", err instanceof Error ? err.message : err);
        }
        setError("報名資料讀取失敗，請稍後再試，或聯絡管理員協助確認報名狀態。");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [bookingId]);

  return (
    <section className="card max-w-2xl">
      <h1 className="text-2xl font-bold text-green-700">報名成功</h1>
      <p className="mt-2 text-sm text-slate-600">我們已收到你的報名資料，管理員確認後會再與你聯繫。</p>

      {loading ? <p className="mt-4 text-sm text-slate-600">讀取報名資料中...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{error}</p> : null}

      {details ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>訂單編號：{details.booking.id}</p>
          <p>姓名：{details.booking.name}</p>
          <p>手機：{details.booking.phone}</p>
          <p>Email：{displayValue(details.booking.email)}</p>
          <p>LINE ID：{displayValue(details.booking.lineId)}</p>
          <p>希望聯絡方式：{details.booking.contactPreference ? contactPreferenceMap[details.booking.contactPreference] : "未填寫"}</p>
          <p>年齡區間：{displayValue(details.booking.ageRange)}</p>
          <p>AI 使用程度：{displayValue(details.booking.aiLevel)}</p>
          <p>學習需求或備註：{displayValue(details.booking.learningGoal)}</p>
          <p>課程：{details.courseName}</p>
          <p>期別 / 時段：{details.sessionLabel}</p>
          <p>會員：{details.booking.isMember ? "是" : "否"}</p>
          <p>金額：{formatCurrency(details.booking.amount)}</p>
          <p>狀態：{statusMap[details.booking.status] || "待確認"}</p>
        </div>
      ) : null}

      <Link
        href="/courses"
        className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
        style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
      >
        回到課程列表
      </Link>
    </section>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<section className="card max-w-2xl">讀取報名資料中...</section>}>
      <BookingSuccessContent />
    </Suspense>
  );
}
