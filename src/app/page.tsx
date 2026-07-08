"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Course } from "@/lib/firestoreTypes";
import { getCoursePriceNumber, listCourses } from "@/lib/firestoreService";

const audienceItems = [
  "AI 初學者，想從手機與生活應用開始",
  "想提升工作、學習、教學或內容創作效率的人",
  "想用 AI 製作圖片、影片、社群內容或宣傳素材的人",
  "需要一對一協助釐清問題與建立學習方向的人",
];

const flowItems = [
  { title: "選擇課程", text: "瀏覽團班或 1 對 1 課程，找到適合自己的學習方式。" },
  { title: "選擇期別", text: "查看開放期別、上課日期、時段與剩餘名額。" },
  { title: "填寫資料", text: "線上填寫報名資料，系統會依手機核對會員資格。" },
  { title: "等待確認", text: "管理員確認報名狀態後，再與你聯繫後續上課安排。" },
];

const faqItems = [
  {
    question: "完全沒有 AI 基礎可以報名嗎？",
    answer: "可以。手機 AI 初階課程與週六菁英初階課程都適合初學者，會從基礎觀念與日常應用開始。",
  },
  {
    question: "團班一期有幾堂課？",
    answer: "團班每一期固定 4 週，共 4 堂課，每堂 2 小時。",
  },
  {
    question: "1 對 1 課程適合什麼情況？",
    answer: "如果你有特定問題、工作需求、創作方向或想依照個人程度安排學習，適合選擇 1 對 1 專屬 AI 課程。",
  },
  {
    question: "會員價怎麼認定？",
    answer: "報名時請填寫與會員資料相同的手機號碼，系統會自動核對桃園市AI推廣教育協會會員資格。",
  },
];

function formatCurrency(value: number) {
  return `NT$${new Intl.NumberFormat("zh-TW").format(value)}`;
}

function getCourseIdentifier(course: Course) {
  return course.slug || course.id;
}

function getCoursePriceText(course: Course) {
  if (course.type === "oneOnOne") {
    return `${formatCurrency(getCoursePriceNumber(course.pricePerHour, course.memberPrice, course.nonMemberPrice))} / 小時`;
  }

  return `會員價 ${formatCurrency(getCoursePriceNumber(course.memberPrice))}　非會員價 ${formatCurrency(getCoursePriceNumber(course.nonMemberPrice))}`;
}

function getCourseSummary(course: Course) {
  if (course.type === "oneOnOne") {
    return "每次 1 小時，08:30-09:30 可預約";
  }

  const sessionsCount = course.sessionsCount || 4;
  const duration = Number(course.durationMinutes || 120);
  let durationText = "每堂 2 小時";

  if (duration > 0 && duration < 10) {
    durationText = `每堂 ${duration} 小時`;
  } else if (duration >= 60 && duration % 60 === 0) {
    durationText = `每堂 ${duration / 60} 小時`;
  } else if (duration >= 60) {
    durationText = `每堂 ${Number((duration / 60).toFixed(1))} 小時`;
  } else if (duration > 0) {
    durationText = `每堂 ${duration} 分鐘`;
  }

  return `每期 ${sessionsCount} 堂，${durationText}`;
}

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    listCourses().then((courseData) => setCourses(courseData.filter((course) => course.type !== "oneOnOne")));
  }, []);

  return (
    <section className="space-y-10">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 px-6 py-12 text-white shadow-lg sm:px-10 lg:px-14 lg:py-16">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-sky-100">
            AI Course Booking
          </p>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            AI 課程線上報名
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-sky-50 md:text-xl">
            從手機 AI 初階、AI 圖影創作到 1 對 1 專屬課程，依照你的程度選擇適合的學習方式，線上查看期別與時段完成報名。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/courses"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100"
              style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
            >
              查看課程與期別
            </Link>
            <Link
              href="#booking-flow"
              className="inline-flex rounded-full border border-white/50 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              了解報名流程
            </Link>
          </div>
        </div>
      </div>

      <section className="card">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Who it is for</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">這些課程適合誰？</h2>
            <p className="mt-3 text-slate-600">
              不論你是剛開始接觸 AI，或已經有明確的工作、創作、教學需求，都可以從適合的課程開始建立自己的 AI 使用方法。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {audienceItems.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Group Course</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">團班課程</h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>每堂 2 小時，固定連續 4 週，共 4 堂</li>
            <li>時段：10:00-12:00、14:00-16:00</li>
            <li>每班上限 18 人，支援會員價與非會員價</li>
            <li>適合想跟著完整進度學習、建立基礎與作品的人</li>
          </ul>
        </div>
        <div className="card">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Personal Coaching</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">1 對 1 專屬課程</h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>每次 1 小時，固定時段 08:30-09:30</li>
            <li>依後台開放日期預約，不分會員與非會員價</li>
            <li>可依照個人工作、學習、創作或教學需求安排</li>
            <li>適合需要個別指導、問題排解與專屬學習路線的人</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Courses</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">熱門課程</h2>
          </div>
          <Link href="/courses" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900">
            查看全部課程
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const courseIdentifier = getCourseIdentifier(course);

            return (
              <article key={course.id} className="card flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {course.type === "oneOnOne" ? "1 對 1 專屬課程" : "團體班"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-950">{course.name}</h3>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    {course.type === "oneOnOne" ? "1對1" : "團體班"}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  {course.description || "查看課程內容、開放期別與報名資訊。"}
                </p>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">{getCoursePriceText(course)}</p>
                  <p className="mt-1 text-slate-500">{getCourseSummary(course)}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/courses/${courseIdentifier}`}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                  >
                    查看詳情
                  </Link>
                  <Link
                    href={`/courses/${courseIdentifier}/booking`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
                  >
                    立即報名
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {courses.length === 0 ? (
          <div className="card text-slate-600">課程資料讀取中，請稍候...</div>
        ) : null}
      </section>

      <section id="booking-flow" className="card">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Booking Flow</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">報名流程</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {flowItems.map((item, index) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-sky-700">Step {index + 1}</p>
              <h3 className="mt-2 font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">Member Price</p>
            <h2 className="mt-2 text-2xl font-bold">會員價與資格核對</h2>
          </div>
          <p className="leading-relaxed text-slate-200">
            桃園市AI推廣教育協會會員可享會員價。報名時請填寫與會員資料相同的手機號碼，系統將自動核對會員資格；若查無會員資料，將先以非會員價送出並由後台保留核對結果。
          </p>
        </div>
      </section>

      <section className="card">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">FAQ</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">常見問題</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-950">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-10 text-center text-white shadow-sm">
        <h2 className="text-2xl font-bold">準備開始學 AI 了嗎？</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-200">
          查看目前開放課程與期別，選擇適合你的班別或 1 對 1 時段。
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950"
          style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
        >
          前往課程列表
        </Link>
      </section>
    </section>
  );
}

