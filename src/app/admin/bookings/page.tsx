"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { BOOKING_STATUS_OPTIONS, Booking, ContactPreference, Course, MemberCheckStatus, OneOnOneSlot, Session } from "@/lib/firestoreTypes";
import {
  formatSessionLabel,
  listBookings,
  listCourses,
  listOneOnOneSlots,
  listSessionClassDates,
  listSessions,
  updateBookingStatus,
} from "@/lib/firestoreService";
import { BookingStatus } from "@/lib/firestoreTypes";

const statusMap = Object.fromEntries(BOOKING_STATUS_OPTIONS.map((item) => [item.value, item.label]));
const contactPreferenceMap: Record<ContactPreference, string> = {
  phone: "手機",
  email: "Email",
  line: "LINE",
};
const adminStatusLabelMap: Record<BookingStatus, string> = {
  pending: "待確認",
  confirmed: "已確認（未付款）",
  paid: "已付款（已確認）",
  cancelled: "已取消",
  waitlist: "候補",
};
const memberCheckStatusMap: Record<MemberCheckStatus, string> = {
  not_requested: "未選擇會員",
  matched: "已核對會員",
  not_found: "查無會員",
  inactive: "會員狀態非有效",
  manual_review: "待人工確認",
};

function buildCsv(rows: string[][], headers: string[]) {
  const escapeCsv = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  return lines.join("\n");
}

function getSessionLabel(session?: Session) {
  if (!session) return "";
  return formatSessionLabel(session);
}

function getSessionClassDatesText(session?: Session) {
  if (!session) return "";
  return listSessionClassDates(session)
    .slice(0, 4)
    .map((date, index) => `第 ${index + 1} 堂：${date.replaceAll("-", "/")}`)
    .join("\n");
}

function displayValue(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "未填寫";
}

function displayContactPreference(value?: ContactPreference): string {
  return value ? contactPreferenceMap[value] || value : "未填寫";
}

function formatBookingAmount(amount: number): string {
  return `NT$${new Intl.NumberFormat("zh-TW").format(Number(amount) || 0)}`;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<(Booking & { id: string })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [slots, setSlots] = useState<OneOnOneSlot[]>([]);
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterSessionId, setFilterSessionId] = useState("");
  const [filterStatus, setFilterStatus] = useState<BookingStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((course) => [course.id, course.name])),
    [courses],
  );

  const sessionMap = useMemo(() => Object.fromEntries(sessions.map((session) => [session.id, getSessionLabel(session)])), [sessions]);

  const sessionClassDatesMap = useMemo(
    () => Object.fromEntries(sessions.map((session) => [session.id, getSessionClassDatesText(session)])),
    [sessions],
  );

  const slotMap = useMemo(
    () => Object.fromEntries(slots.map((slot) => [slot.id, `${slot.date} ${slot.startTime}-${slot.endTime}`])),
    [slots],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [bookingData, courseData, sessionData, slotData] = await Promise.all([
      listBookings({
        courseId: filterCourseId || undefined,
        sessionId: filterSessionId || undefined,
        status: filterStatus || undefined,
      }),
      listCourses(true),
      listSessions(),
      listOneOnOneSlots(),
    ]);

    setBookings(bookingData);
    setCourses(courseData);
    setSessions(sessionData);
    setSlots(slotData);
    setLoading(false);
  }, [filterCourseId, filterSessionId, filterStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onExportCsv = () => {
    const headers = [
      "姓名",
      "手機",
      "Email",
      "LINE ID",
      "希望聯絡方式",
      "年齡區間",
      "AI 使用程度",
      "學習需求或備註",
      "課程",
      "期別",
      "狀態",
      "金額",
      "自填會員",
      "會員核對",
      "實際套用會員價",
      "建立時間",
    ];
    const rows = bookings.map((booking) => [
      booking.name,
      booking.phone,
      booking.email || "",
      booking.lineId || "",
      displayContactPreference(booking.contactPreference),
      booking.ageRange || "",
      booking.aiLevel || "",
      booking.learningGoal || "",
      courseMap[booking.courseId] || booking.courseId,
      booking.sessionId
        ? sessionMap[booking.sessionId] || ""
        : booking.oneOnOneSlotId
          ? slotMap[booking.oneOnOneSlotId] || ""
          : "",
      statusMap[booking.status] || booking.status,
      `${booking.amount}`,
      (booking.requestedMember ?? booking.isMember) ? "是" : "否",
      booking.memberCheckStatus ? memberCheckStatusMap[booking.memberCheckStatus] : "未核對",
      booking.isMember ? "是" : "否",
      String((booking.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || ""),
    ]);

    const csv = buildCsv(rows, headers);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `booking-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const onStatusChange = async (bookingId: string, status: BookingStatus) => {
    try {
      setActionError("");
      await updateBookingStatus(bookingId, status);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "狀態更新失敗");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-2xl font-bold">報名管理</h1>
        <button onClick={onExportCsv} className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
          匯出 CSV
        </button>
      </div>

      {actionError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filterCourseId}
          onChange={(event) => setFilterCourseId(event.target.value)}
        >
          <option value="">全部課程</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filterSessionId}
          onChange={(event) => setFilterSessionId(event.target.value)}
        >
          <option value="">全部期別</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {getSessionLabel(session)}
            </option>
          ))}
          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.date} {slot.startTime}-{slot.endTime}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filterStatus}
          onChange={(event) =>
            setFilterStatus(event.target.value === "" ? "" : (event.target.value as BookingStatus))
          }
        >
          <option value="">全部狀態</option>
          {BOOKING_STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">
        狀態為單一目前狀態：若已接受報名但尚未付款，請選「已確認（未付款）」；若已完成付款，請選「已付款（已確認）」。
      </p>

      {loading ? <p>讀取中...</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1740px] table-fixed border border-slate-200 bg-white text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-200 px-3 py-2">學員</th>
              <th className="border border-slate-200 px-3 py-2">手機</th>
              <th className="border border-slate-200 px-3 py-2">Email</th>
              <th className="border border-slate-200 px-3 py-2">LINE ID</th>
              <th className="border border-slate-200 px-3 py-2">聯絡方式</th>
              <th className="border border-slate-200 px-3 py-2">年齡</th>
              <th className="border border-slate-200 px-3 py-2">AI 程度</th>
              <th className="border border-slate-200 px-3 py-2">備註</th>
              <th className="border border-slate-200 px-3 py-2">課程</th>
              <th className="border border-slate-200 px-3 py-2">期別</th>
              <th className="border border-slate-200 px-3 py-2">金額</th>
              <th className="border border-slate-200 px-3 py-2">會員核對</th>
              <th className="border border-slate-200 px-3 py-2">狀態</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="border border-slate-200 px-3 py-2">{booking.name}</td>
                <td className="border border-slate-200 px-3 py-2">{booking.phone}</td>
                <td className="break-all border border-slate-200 px-3 py-2 leading-relaxed whitespace-normal">{displayValue(booking.email)}</td>
                <td className="break-all border border-slate-200 px-3 py-2 leading-relaxed whitespace-normal">{displayValue(booking.lineId)}</td>
                <td className="border border-slate-200 px-3 py-2">{displayContactPreference(booking.contactPreference)}</td>
                <td className="border border-slate-200 px-3 py-2">{displayValue(booking.ageRange)}</td>
                <td className="border border-slate-200 px-3 py-2">{displayValue(booking.aiLevel)}</td>
                <td className="border border-slate-200 px-3 py-2">{displayValue(booking.learningGoal)}</td>
                <td className="border border-slate-200 px-3 py-2">{courseMap[booking.courseId] || booking.courseId}</td>
                <td className="border border-slate-200 px-3 py-2">
                  <span title={booking.sessionId ? sessionClassDatesMap[booking.sessionId] || undefined : undefined}>
                    {booking.sessionId
                      ? sessionMap[booking.sessionId] || booking.sessionId
                      : booking.oneOnOneSlotId
                        ? slotMap[booking.oneOnOneSlotId] || booking.oneOnOneSlotId
                        : "-"}
                  </span>
                </td>
                <td className="border border-slate-200 px-3 py-2">{formatBookingAmount(booking.amount)}</td>
                <td className="border border-slate-200 px-3 py-2">
                  <div className="space-y-1">
                    <p>自填：{(booking.requestedMember ?? booking.isMember) ? "會員" : "非會員"}</p>
                    <p>核對：{booking.memberCheckStatus ? memberCheckStatusMap[booking.memberCheckStatus] : "未核對"}</p>
                    <p>套用：{booking.isMember ? "會員價" : "非會員價"}</p>
                  </div>
                </td>
                <td className="border border-slate-200 px-3 py-2">
                  <select
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    value={booking.status}
                    onChange={(event) => onStatusChange(booking.id, event.target.value as BookingStatus)}
                  >
                    {BOOKING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {adminStatusLabelMap[option.value]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/admin/dashboard" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">
        回到 Dashboard
      </Link>
    </section>
  );
}
