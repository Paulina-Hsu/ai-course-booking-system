"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  BOOKING_STATUS_OPTIONS,
  Booking,
  BookingStatus,
  ContactPreference,
  Course,
  MemberCheckStatus,
  OneOnOneSlot,
  Session,
} from "@/lib/firestoreTypes";
import {
  deleteBooking,
  formatSessionLabel,
  listBookings,
  listCourses,
  listOneOnOneSlots,
  listSessionClassDates,
  listSessions,
  updateBookingStatus,
} from "@/lib/firestoreService";

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

function formatDateTime(value: unknown): string {
  if (!value) return "未填寫";
  if (value instanceof Date) return value.toLocaleString("zh-TW");
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleString("zh-TW");
    }
  }
  return "未填寫";
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<(Booking & { id: string })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [slots, setSlots] = useState<OneOnOneSlot[]>([]);
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterSessionId, setFilterSessionId] = useState("");
  const [filterStatus, setFilterStatus] = useState<BookingStatus | "">("");
  const [expandedBookingId, setExpandedBookingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((course) => [course.id, course.name])),
    [courses],
  );

  const sessionMap = useMemo(
    () => Object.fromEntries(sessions.map((session) => [session.id, getSessionLabel(session)])),
    [sessions],
  );

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

  const onDeleteBooking = async (booking: Booking & { id: string }) => {
    const confirmed = window.confirm(`確定要刪除「${booking.name}」的報名資料嗎？此操作會釋放名額或 1 對 1 時段，且無法復原。`);
    if (!confirmed) return;

    try {
      setActionError("");
      await deleteBooking(booking.id);
      if (expandedBookingId === booking.id) setExpandedBookingId("");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <table className="w-full min-w-[1180px] table-fixed border border-slate-200 bg-white text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="w-[120px] border border-slate-200 px-3 py-2">報名時間</th>
              <th className="w-[120px] border border-slate-200 px-3 py-2">學員</th>
              <th className="w-[120px] border border-slate-200 px-3 py-2">手機</th>
              <th className="w-[170px] border border-slate-200 px-3 py-2">課程</th>
              <th className="w-[240px] border border-slate-200 px-3 py-2">期別</th>
              <th className="w-[100px] border border-slate-200 px-3 py-2">金額</th>
              <th className="w-[150px] border border-slate-200 px-3 py-2">會員核對</th>
              <th className="w-[150px] border border-slate-200 px-3 py-2">狀態</th>
              <th className="w-[130px] border border-slate-200 px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const sessionText = booking.sessionId
                ? sessionMap[booking.sessionId] || booking.sessionId
                : booking.oneOnOneSlotId
                  ? slotMap[booking.oneOnOneSlotId] || booking.oneOnOneSlotId
                  : "-";
              const classDatesText = booking.sessionId ? sessionClassDatesMap[booking.sessionId] || "未填寫" : "不適用";
              const memberStatus = booking.memberCheckStatus ? memberCheckStatusMap[booking.memberCheckStatus] : "未核對";
              const isExpanded = expandedBookingId === booking.id;

              return (
                <>
                  <tr key={booking.id}>
                    <td className="border border-slate-200 px-3 py-2 align-top">{formatDateTime(booking.createdAt)}</td>
                    <td className="border border-slate-200 px-3 py-2 align-top font-semibold">{booking.name}</td>
                    <td className="border border-slate-200 px-3 py-2 align-top">{booking.phone}</td>
                    <td className="border border-slate-200 px-3 py-2 align-top">{courseMap[booking.courseId] || booking.courseId}</td>
                    <td className="border border-slate-200 px-3 py-2 align-top">
                      <span title={booking.sessionId ? sessionClassDatesMap[booking.sessionId] || undefined : undefined}>
                        {sessionText}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-3 py-2 align-top">{formatBookingAmount(booking.amount)}</td>
                    <td className="border border-slate-200 px-3 py-2 align-top">
                      <p>{memberStatus}</p>
                      <p className="mt-1 text-xs text-slate-500">{booking.isMember ? "套用會員價" : "非會員價"}</p>
                    </td>
                    <td className="border border-slate-200 px-3 py-2 align-top">
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
                    <td className="border border-slate-200 px-3 py-2 align-top">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedBookingId(isExpanded ? "" : booking.id)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {isExpanded ? "收合詳情" : "查看詳情"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBooking(booking)}
                          className="rounded-full border border-rose-300 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded ? (
                    <tr key={`${booking.id}-details`}>
                      <td className="border border-slate-200 bg-slate-50 p-4" colSpan={9}>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <DetailItem label="Email" value={displayValue(booking.email)} />
                          <DetailItem label="LINE ID" value={displayValue(booking.lineId)} />
                          <DetailItem label="希望聯絡方式" value={displayContactPreference(booking.contactPreference)} />
                          <DetailItem label="年齡區間" value={displayValue(booking.ageRange)} />
                          <DetailItem label="AI 使用程度" value={displayValue(booking.aiLevel)} />
                          <DetailItem label="學習需求或備註" value={displayValue(booking.learningGoal)} />
                          <DetailItem label="4 堂日期" value={classDatesText} />
                          <DetailItem label="自填會員" value={(booking.requestedMember ?? booking.isMember) ? "是" : "否"} />
                          <DetailItem label="會員核對訊息" value={displayValue(booking.memberCheckMessage)} />
                          <DetailItem label="訂單編號" value={booking.id} />
                          <DetailItem label="建立時間" value={formatDateTime(booking.createdAt)} />
                          <DetailItem label="更新時間" value={formatDateTime(booking.updatedAt)} />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <Link href="/admin/dashboard" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm">
        回到 Dashboard
      </Link>
    </section>
  );
}
