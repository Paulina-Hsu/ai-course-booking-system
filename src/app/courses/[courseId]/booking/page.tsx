"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContactPreference, Course, MemberCheckStatus, OneOnOneSlot, Session } from "@/lib/firestoreTypes";
import {
  calculateBookingAmount,
  createBooking,
  getCourseById,
  getMemberByPhone,
  listSessionClassDates,
  listOneOnOneSlots,
  listSessions,
  normalizeMemberPhone,
} from "@/lib/firestoreService";
import { CoursePriceDisplay } from "@/components/CoursePriceDisplay";

interface SlotInfo {
  id: string;
  title: string;
  disabled: boolean;
  classDates: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactPreferenceOptions: { value: ContactPreference; label: string }[] = [
  { value: "phone", label: "手機" },
  { value: "email", label: "Email" },
  { value: "line", label: "LINE" },
];

const ageRangeOptions = [
  "18 歲以下",
  "18–25 歲",
  "26–35 歲",
  "36–45 歲",
  "46–55 歲",
  "56–65 歲",
  "66 歲以上",
];

const aiLevelOptions = [
  "完全沒用過",
  "用過一點，但不熟",
  "會基本操作",
  "已經常使用，想進階",
  "想針對工作 / 創作 / 教學深入應用",
];

const memberCheckLabels: Record<MemberCheckStatus, string> = {
  not_requested: "未選擇會員",
  matched: "已核對會員",
  not_found: "查無會員",
  inactive: "會員狀態非有效",
  manual_review: "待人工確認",
};

function getSessionCapacity(session: Session): number {
  if (typeof session.capacity === "number" && Number.isFinite(session.capacity)) return session.capacity;
  if (typeof session.maxCapacity === "number" && Number.isFinite(session.maxCapacity)) return session.maxCapacity;
  return 18;
}

function isSessionOpen(session: Session): boolean {
  if (session.isOpen === false) return false;
  return true;
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
  const [lineId, setLineId] = useState("");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("phone");
  const [ageRange, setAgeRange] = useState("");
  const [aiLevel, setAiLevel] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [memberCheckStatus, setMemberCheckStatus] = useState<MemberCheckStatus>("not_requested");
  const [memberCheckMessage, setMemberCheckMessage] = useState("未選擇會員，將以非會員價計算。");
  const [matchedMemberId, setMatchedMemberId] = useState("");
  const [isCheckingMember, setIsCheckingMember] = useState(false);
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

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const normalizedPhone = normalizeMemberPhone(phone);

      if (!isMember) {
        setMemberCheckStatus("not_requested");
        setMemberCheckMessage("未選擇會員，將以非會員價計算。");
        setMatchedMemberId("");
        setIsCheckingMember(false);
        return;
      }

      if (normalizedPhone.length < 8) {
        setMemberCheckStatus("manual_review");
        setMemberCheckMessage("請輸入手機號碼，系統會用手機自動核對會員資格。");
        setMatchedMemberId("");
        setIsCheckingMember(false);
        return;
      }

      setIsCheckingMember(true);
      try {
        const member = await getMemberByPhone(normalizedPhone);
        if (!member) {
          setMemberCheckStatus("not_found");
          setMemberCheckMessage("查無桃園市AI推廣教育協會會員資料，將以非會員價送出；若資料有誤，管理員可於後台人工確認。");
          setMatchedMemberId("");
          return;
        }

        if (member.status === "active") {
          setMemberCheckStatus("matched");
          setMemberCheckMessage(`已核對為有效會員：${member.name || "會員"}，本次報名將使用會員價。`);
          setMatchedMemberId(member.id);
          return;
        }

        setMemberCheckStatus("inactive");
        setMemberCheckMessage(`找到會員資料，但狀態為「${member.statusLabel || member.status}」，將以非會員價送出並供後台確認。`);
        setMatchedMemberId(member.id);
      } catch (memberError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[BookingPage] member check failed", memberError instanceof Error ? memberError.message : memberError);
        }
        setMemberCheckStatus("manual_review");
        setMemberCheckMessage("會員資格暫時無法自動核對，將以非會員價送出並供後台人工確認。");
        setMatchedMemberId("");
      } finally {
        setIsCheckingMember(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [isMember, phone]);

  const effectiveIsMember = isMember && memberCheckStatus === "matched";
  const amount = course ? calculateBookingAmount(course, effectiveIsMember) : 0;
  const selectedSlotInfo = slots.find((slot) => slot.id === selectedSlot);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course) return;
    if (!selectedSlot) {
      setError("請選擇一期別或時段");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("請輸入有效的 Email");
      return;
    }
    if (contactPreference === "line" && !lineId.trim()) {
      setError("希望聯絡方式選擇 LINE 時，請填寫 LINE ID");
      return;
    }
    if (!ageRange) {
      setError("請選擇年齡區間");
      return;
    }
    if (!aiLevel) {
      setError("請選擇目前 AI 使用程度");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const sharedBookingFields = {
        courseId: course.id,
        name: name.trim(),
        phone,
        email: email.trim(),
        lineId: lineId.trim() || undefined,
        contactPreference,
        ageRange,
        aiLevel,
        learningGoal: learningGoal.trim() || undefined,
        isMember: effectiveIsMember,
        requestedMember: isMember,
        memberCheckStatus: isMember ? memberCheckStatus : "not_requested",
        matchedMemberId: matchedMemberId || undefined,
        memberCheckMessage,
      };

      const bookingId = await createBooking(
        course.type === "group"
          ? { ...sharedBookingFields, sessionId: selectedSlot }
          : { ...sharedBookingFields, oneOnOneSlotId: selectedSlot },
      );

      router.push(
        `/booking-success?bookingId=${encodeURIComponent(bookingId)}`,
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
            onChange={(event) => {
              setPhone(event.target.value);
              if (isMember) {
                setMemberCheckStatus("manual_review");
                setMemberCheckMessage("手機號碼已變更，正在重新核對會員資格。");
                setMatchedMemberId("");
              }
            }}
            placeholder="0912-345-678"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Email
          <input
            required
            type="email"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          LINE ID
          <input
            required={contactPreference === "line"}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={lineId}
            onChange={(event) => setLineId(event.target.value)}
            placeholder="選填；選 LINE 聯絡時必填"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          希望聯絡方式
          <select
            required
            value={contactPreference}
            onChange={(event) => setContactPreference(event.target.value as ContactPreference)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            {contactPreferenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          年齡區間
          <select
            required
            value={ageRange}
            onChange={(event) => setAgeRange(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">請選擇</option>
            {ageRangeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          目前 AI 使用程度
          <select
            required
            value={aiLevel}
            onChange={(event) => setAiLevel(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">請選擇</option>
            {aiLevelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          會員/非會員
          <select
            value={isMember ? "member" : "non-member"}
            onChange={(event) => {
              const nextIsMember = event.target.value === "member";
              setIsMember(nextIsMember);
              setMemberCheckStatus(nextIsMember ? "manual_review" : "not_requested");
              setMemberCheckMessage(nextIsMember ? "正在核對會員資格。" : "未選擇會員，將以非會員價計算。");
              setMatchedMemberId("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="non-member">非會員</option>
            <option value="member">會員</option>
          </select>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">
            會員核對：{isCheckingMember ? "核對中..." : memberCheckLabels[memberCheckStatus]}
          </p>
          <p className={memberCheckStatus === "matched" ? "mt-1 text-emerald-700" : "mt-1 text-amber-700"}>
            {memberCheckMessage}
          </p>
        </div>

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

        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          想學習的方向或備註
          <textarea
            className="min-h-28 rounded-lg border border-slate-300 px-3 py-2"
            value={learningGoal}
            onChange={(event) => setLearningGoal(event.target.value)}
            placeholder="可填寫想解決的問題、學習目標或其他備註"
          />
        </label>

        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <CoursePriceDisplay course={course} className="text-sm font-normal text-slate-500" />
          <p className="mt-1 text-base font-bold text-slate-950">
            本次報名金額：{`NT$${new Intl.NumberFormat("zh-TW").format(amount)}`}
          </p>
          {isMember && memberCheckStatus !== "matched" ? (
            <p className="mt-1 text-sm text-amber-700">
              會員資格尚未核對成功，本次會先以非會員價送出，後台會保留核對結果。
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
            disabled={loading || isCheckingMember}
          >
            {loading ? "送出中..." : isCheckingMember ? "會員核對中..." : "送出報名"}
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
