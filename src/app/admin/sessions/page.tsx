"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Course, Session } from "@/lib/firestoreTypes";
import { createSession, listCourses, listSessionClassDates, listSessions, setSessionOpen, updateSession } from "@/lib/firestoreService";

interface SessionFormState {
  id: string;
  courseId: string;
  title: string;
  weekday: string;
  startTime: string;
  endTime: string;
  firstClassDate: string;
  capacity: string;
  isOpen: boolean;
}

const WEEKDAY_OPTIONS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
const DEFAULT_SESSION_FORM: SessionFormState = {
  id: "",
  courseId: "",
  title: "",
  weekday: "星期一",
  startTime: "10:00",
  endTime: "12:00",
  firstClassDate: "",
  capacity: "18",
  isOpen: true,
};

function toInputDate(value: string) {
  return value || "";
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDate(value: string, time = "00:00") {
  const [year, month, day] = value.split("-").map(Number);
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function toTimestampInputDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return formatLocalDate((value as { toDate: () => Date }).toDate());
  }
  return "";
}

function generateClassDates(firstClassDate: string, startTime: string) {
  const date = toLocalDate(firstClassDate, startTime);
  if (Number.isNaN(date.getTime())) {
    return [];
  }

  return Array.from({ length: 4 }, (_, index) => {
    const item = new Date(date);
    item.setDate(date.getDate() + index * 7);
    const weekday = item.toLocaleDateString("zh-TW", { weekday: "short" });
    return `${formatLocalDate(item)} ${startTime}（${weekday}）`;
  });
}

function toDateLabel(value: Session): string {
  if (value.firstClassDate && typeof value.firstClassDate === "object" && "toDate" in value.firstClassDate) {
    return (
      new Date((value.firstClassDate as unknown as { toDate: () => Date }).toDate()).toLocaleDateString("zh-TW")
    );
  }
  if (typeof value.startDate === "string") {
    return value.startDate;
  }
  return "";
}

function resolveCapacity(session: Session): number {
  if (typeof session.capacity === "number" && Number.isFinite(session.capacity)) {
    return session.capacity;
  }
  if (typeof session.maxCapacity === "number" && Number.isFinite(session.maxCapacity)) {
    return session.maxCapacity;
  }
  return 18;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState<SessionFormState>(DEFAULT_SESSION_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [sessionData, courseData] = await Promise.all([listSessions(), listCourses(true)]);
    setSessions(sessionData);
    setCourses(courseData);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const courseOptions = useMemo(() => Object.fromEntries(courses.map((course) => [course.id, course.name])), [courses]);

  const clearMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 1600);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (!form.courseId) {
        throw new Error("請選擇課程");
      }
      if (!form.firstClassDate) {
        throw new Error("請輸入第一堂日期");
      }

      if (form.id) {
        await updateSession(form.id, {
          title: form.title,
          weekday: form.weekday,
          startTime: form.startTime,
          endTime: form.endTime,
          firstClassDate: form.firstClassDate,
          capacity: Number(form.capacity) || 18,
          isOpen: form.isOpen,
        });
        clearMessage("期別已更新");
      } else {
        await createSession({
          courseId: form.courseId,
          title: form.title,
          weekday: form.weekday,
          startTime: form.startTime,
          endTime: form.endTime,
          firstClassDate: form.firstClassDate,
          capacity: Number(form.capacity) || 18,
          isOpen: form.isOpen,
        });
        clearMessage("期別已新增");
      }

      setForm(DEFAULT_SESSION_FORM);
      await load();
    } catch (error) {
      clearMessage(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setLoading(false);
    }
  };

  const editSession = (session: Session) => {
    setForm({
      id: session.id,
      courseId: session.courseId,
      title: session.title,
      weekday: String(session.weekday || "星期一"),
      startTime: session.startTime,
      endTime: session.endTime,
      firstClassDate: toInputDate(
        toTimestampInputDate(session.firstClassDate) ||
          session.startDate ||
          "",
      ),
      capacity: String(resolveCapacity(session)),
      isOpen: session.isOpen ?? session.status !== "closed",
    });
  };

  const resetForm = () => {
    setForm(DEFAULT_SESSION_FORM);
  };

  const toggleSessionOpen = async (sessionId: string, isOpen: boolean) => {
    await setSessionOpen(sessionId, isOpen);
    await load();
  };

  const previewClassDates = useMemo(() => {
    if (!form.firstClassDate) return [];
    return generateClassDates(form.firstClassDate, form.startTime);
  }, [form.firstClassDate, form.startTime]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">期別管理</h1>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm">
          <label>所屬課程</label>
          <select
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.courseId}
            onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
          >
            <option value="">請選擇課程</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>期別名稱</label>
          <input
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>上課星期</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.weekday}
            onChange={(event) => setForm((prev) => ({ ...prev, weekday: event.target.value }))}
          >
            {WEEKDAY_OPTIONS.map((weekday) => (
              <option key={weekday} value={weekday}>
                {weekday}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>開始時間</label>
          <input
            required
            type="time"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.startTime}
            onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>結束時間</label>
          <input
            required
            type="time"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.endTime}
            onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>第一堂日期</label>
          <input
            required
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.firstClassDate}
            onChange={(event) => setForm((prev) => ({ ...prev, firstClassDate: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label>名額（預設 18）</label>
          <input
            type="number"
            min={1}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.capacity}
            onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isOpen}
            onChange={(event) => setForm((prev) => ({ ...prev, isOpen: event.target.checked }))}
          />
          開放報名
        </label>

        <div className="md:col-span-2 flex flex-col gap-2 text-sm">
          <p className="text-xs text-slate-500">自第一堂日起每 7 天自動產生 4 堂：</p>
          <ul className="grid gap-1 md:grid-cols-2">
            {previewClassDates.map((dateText, index) => (
              <li key={dateText + index}>第 {index + 1} 堂：{dateText}</li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:bg-slate-400"
          >
            {form.id ? "更新期別" : "新增期別"}
          </button>
          {form.id ? (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
              onClick={resetForm}
            >
              取消編輯
            </button>
          ) : null}
          {message ? <span className="text-sm text-slate-600">{message}</span> : null}
        </div>
      </form>

      <div className="grid gap-3">
        {sessions.map((session) => {
          const capacity = resolveCapacity(session);
          const isOpen = session.isOpen !== false;
          const classDates = listSessionClassDates(session);
          return (
            <div key={session.id} className="card rounded-2xl border border-slate-200 bg-white p-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">課程：{courseOptions[session.courseId] || session.courseId}</p>
                <h2 className="text-lg font-semibold">{session.title}</h2>
                <p className="text-sm text-slate-600">上課星期：{session.weekday}</p>
                <p className="text-sm text-slate-600">時段：{session.startTime}-{session.endTime}</p>
                <p className="text-sm text-slate-600">第一堂：{toDateLabel(session)}</p>
                <p className="text-sm text-slate-600">4 堂日期：{(classDates || []).slice(0, 4).join("、") || "無"}</p>
                <p className="text-sm text-slate-600">名額：{session.enrolledCount}/{capacity}</p>
                <p className="text-sm text-slate-600">狀態：{isOpen ? "開放" : "停用"} / {session.isFull ? "已額滿" : "可報名"}</p>
                <p className="text-xs text-slate-500">識別：{session.id}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm"
                  onClick={() => editSession(session)}
                >
                  編輯
                </button>
                <button
                  className={`rounded-full px-3 py-1 text-sm ${isOpen ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                  onClick={() => toggleSessionOpen(session.id, !isOpen)}
                >
                  {isOpen ? "停用期別" : "開放期別"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
