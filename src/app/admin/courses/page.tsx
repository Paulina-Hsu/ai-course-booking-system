"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Course, COURSE_TYPE_OPTIONS, CourseType } from "@/lib/firestoreTypes";
import {
  createCourse,
  listCourses,
  setCourseActive,
  updateCourse,
} from "@/lib/firestoreService";

const DEFAULT_COURSE_FORM = {
  id: "",
  name: "",
  slug: "",
  description: "",
  memberPrice: "",
  nonMemberPrice: "",
  durationMinutes: "120",
  sessionsCount: "4",
  maxCapacity: "18",
  timeSlots: "10:00-12:00,14:00-16:00",
  type: "group" as CourseType,
  isActive: true,
  pricePerHour: "",
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(DEFAULT_COURSE_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    return listCourses(true).then((data) => {
      setCourses(data);
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clearMessage = useCallback(() => {
    setTimeout(() => {
      setMessage("");
    }, 1800);
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);

      if (form.id) {
        await updateCourse(form.id, {
          name: form.name,
          slug: form.slug,
          description: form.description,
          memberPrice: Number(form.memberPrice) || 0,
          nonMemberPrice: Number(form.nonMemberPrice) || 0,
          durationMinutes: Number(form.durationMinutes) || (form.type === "oneOnOne" ? 60 : 120),
          sessionsCount: Number(form.sessionsCount) || (form.type === "oneOnOne" ? 1 : 4),
          maxCapacity: Number(form.maxCapacity) || 18,
          timeSlots: form.timeSlots
            .split(/,/)
            .map((item) => item.trim())
            .filter(Boolean),
          type: form.type,
          isActive: form.isActive,
          pricePerHour: Number(form.pricePerHour) || undefined,
        });
        setMessage("課程已更新");
      } else {
        await createCourse({
          name: form.name,
          slug: form.slug,
          description: form.description,
          memberPrice: Number(form.memberPrice) || 0,
          nonMemberPrice: Number(form.nonMemberPrice) || 0,
          durationMinutes: Number(form.durationMinutes) || (form.type === "oneOnOne" ? 60 : 120),
          sessionsCount: Number(form.sessionsCount) || (form.type === "oneOnOne" ? 1 : 4),
          maxCapacity: Number(form.maxCapacity) || 18,
          timeSlots: form.timeSlots
            .split(/,/)
            .map((item) => item.trim())
            .filter(Boolean),
          type: form.type,
          isActive: form.isActive,
          pricePerHour: Number(form.pricePerHour) || undefined,
        });
        setMessage("課程已新增");
      }

      setForm(DEFAULT_COURSE_FORM);
      await load();
      clearMessage();
    } catch (error) {
      const anyError = error as { code?: string; message?: string };
      const code = anyError.code || "unknown";
      const detail = anyError.message || "未知錯誤，請稍後再試";
      console.error("add course error", error);
      console.error("error.code", code);
      console.error("error.message", detail);

      switch (code) {
        case "permission-denied":
          setMessage("操作失敗（permission-denied）：Missing or insufficient permissions");
          break;
        case "unauthenticated":
          setMessage("操作失敗（unauthenticated）：請先登入管理員帳號。");
          break;
        case "invalid-argument":
          setMessage("操作失敗（invalid-argument）：資料欄位格式不正確，請檢查課程欄位。");
          break;
        case "unavailable":
          setMessage("操作失敗（unavailable）：服務暫時無法使用，請稍後再試。");
          break;
        default:
          setMessage(`操作失敗（${code}）：${detail}`);
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (course: Course) => {
    setForm({
      id: course.id,
      name: course.name,
      slug: course.slug,
      description: course.description,
      memberPrice: String(course.memberPrice),
      nonMemberPrice: String(course.nonMemberPrice),
      durationMinutes: String(course.durationMinutes || (course.type === "oneOnOne" ? 60 : 120)),
      sessionsCount: String(course.sessionsCount || (course.type === "oneOnOne" ? 1 : 4)),
      maxCapacity: String(course.maxCapacity || 18),
      timeSlots: (course.timeSlots || []).join(","),
      type: course.type,
      isActive: course.isActive !== false,
      pricePerHour: String(course.pricePerHour || course.memberPrice || ""),
    });
  };

  const resetForm = () => {
    setForm(DEFAULT_COURSE_FORM);
  };

  const onToggleActive = async (courseId: string, isActive: boolean) => {
    await setCourseActive(courseId, isActive);
    await load();
  };

  const statusText = useMemo(() => {
    return Object.fromEntries(courses.map((item) => [item.id, `${item.isActive === false ? "已停用" : "使用中"}`]));
  }, [courses]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">課程管理</h1>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="courseName">
            課程名稱
          </label>
          <input
            id="courseName"
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="courseSlug">
            Slug
          </label>
          <input
            id="courseSlug"
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="courseDescription">
            課程描述
          </label>
          <textarea
            id="courseDescription"
            required
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="courseType">
            類型
          </label>
          <select
            id="courseType"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CourseType }))}
          >
            {COURSE_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="memberPrice">
            會員價
          </label>
          <input
            id="memberPrice"
            required
            type="number"
            min={0}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.memberPrice}
            onChange={(event) => setForm((prev) => ({ ...prev, memberPrice: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="nonMemberPrice">
            非會員價
          </label>
          <input
            id="nonMemberPrice"
            required
            type="number"
            min={0}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.nonMemberPrice}
            onChange={(event) => setForm((prev) => ({ ...prev, nonMemberPrice: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="durationMinutes">
            每堂時長（分鐘）
          </label>
          <input
            id="durationMinutes"
            type="number"
            min={1}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.durationMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="sessionsCount">
            期別堂數
          </label>
          <input
            id="sessionsCount"
            type="number"
            min={1}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.sessionsCount}
            onChange={(event) => setForm((prev) => ({ ...prev, sessionsCount: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="maxCapacity">
            名額
          </label>
          <input
            id="maxCapacity"
            type="number"
            min={1}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.maxCapacity}
            onChange={(event) => setForm((prev) => ({ ...prev, maxCapacity: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="timeSlots">
            時段（逗號分隔）
          </label>
          <input
            id="timeSlots"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.timeSlots}
            onChange={(event) => setForm((prev) => ({ ...prev, timeSlots: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label className="font-medium" htmlFor="pricePerHour">
            1對1 時薪
          </label>
          <input
            id="pricePerHour"
            type="number"
            min={0}
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={form.pricePerHour}
            onChange={(event) => setForm((prev) => ({ ...prev, pricePerHour: event.target.value }))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          啟用課程
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {form.id ? "儲存課程" : "新增課程"}
          </button>
          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
            >
              取消編輯
            </button>
          ) : null}
          {message ? <span className="text-sm text-slate-600">{message}</span> : null}
        </div>
      </form>

      <div className="grid gap-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="card flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <h2 className="font-semibold">{course.name}</h2>
              <p className="text-sm text-slate-600">
                會員價：NT$ {course.memberPrice} / 非會員價：NT$ {course.nonMemberPrice}
              </p>
              <p className="text-sm text-slate-600">類型：{course.type === "group" ? "團體班" : "1對1"}</p>
              <p className="text-xs text-slate-500">時段：{(course.timeSlots || []).join(" / ")}</p>
              <p className="text-xs text-slate-500">狀態：{statusText[course.id]}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startEdit(course)}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm"
              >
                編輯
              </button>
              <button
                onClick={() => onToggleActive(course.id, course.isActive === false)}
                className={`rounded-full px-3 py-1 text-sm ${course.isActive === false ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
              >
                {course.isActive === false ? "啟用課程" : "停用課程"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
