import { Course, OneOnOneSlot, Session } from "@/lib/firestoreTypes";

const addDays = (dateString: string, days: number): string => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export const DEFAULT_COURSES: Course[] = [
  {
    id: "mobile-ai-basics",
    name: "手機 AI 初階課程",
    slug: "mobile-ai-basics",
    description: "針對初學者設計，完成 AI 輔助創作流程與實作作品。",
    memberPrice: 1600,
    nonMemberPrice: 2000,
    durationMinutes: 120,
    sessionsCount: 4,
    maxCapacity: 18,
    timeSlots: ["10:00-12:00", "14:00-16:00"],
    type: "group",
    isActive: true,
  },
  {
    id: "ai-visual-creation",
    name: "AI 圖影創作班",
    slug: "ai-visual-creation",
    description: "學會運用 AI 繪圖工具製作課程與品牌視覺素材。",
    memberPrice: 2800,
    nonMemberPrice: 3200,
    durationMinutes: 120,
    sessionsCount: 4,
    maxCapacity: 18,
    timeSlots: ["10:00-12:00", "14:00-16:00"],
    type: "group",
    isActive: true,
  },
  {
    id: "saturday-elite-basic",
    name: "週六菁英初階課程",
    slug: "saturday-elite-basic",
    description: "每週六進行高密度練習，建立完整作品成果。",
    memberPrice: 2000,
    nonMemberPrice: 2400,
    durationMinutes: 120,
    sessionsCount: 4,
    maxCapacity: 18,
    timeSlots: ["10:00-12:00", "14:00-16:00"],
    type: "group",
    isActive: true,
  },
  {
    id: "one-on-one-ai",
    name: "1 對 1 專屬 AI 課程",
    slug: "one-on-one-ai",
    description: "客製化 1 對 1 服務，依學習目標安排進度。",
    memberPrice: 1600,
    nonMemberPrice: 1600,
    durationMinutes: 60,
    sessionsCount: 1,
    maxCapacity: 1,
    timeSlots: ["08:30-09:30"],
    type: "oneOnOne",
    isActive: true,
    pricePerHour: 1600,
  },
];

export const DEFAULT_GROUP_SESSIONS: Session[] = DEFAULT_COURSES
  .filter((course) => course.type === "group")
  .flatMap((course) => [
    {
      id: `${course.id}-morning-2026-08-03`,
      courseId: course.id,
      title: `${course.name} 早場`,
      startDate: "2026-08-03",
      endDate: addDays("2026-08-03", 21),
      weekday: 1,
      startTime: "10:00",
      endTime: "12:00",
      maxCapacity: 18,
      enrolledCount: 0,
      status: "open",
      isFull: false,
    },
    {
      id: `${course.id}-afternoon-2026-08-04`,
      courseId: course.id,
      title: `${course.name} 午場`,
      startDate: "2026-08-04",
      endDate: addDays("2026-08-04", 21),
      weekday: 2,
      startTime: "14:00",
      endTime: "16:00",
      maxCapacity: 18,
      enrolledCount: 0,
      status: "open",
      isFull: false,
    },
  ]);

export const DEFAULT_ONE_ON_ONE_SLOTS: OneOnOneSlot[] = [
  {
    id: "o1-2026-08-01",
    date: "2026-08-01",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    pricePerHour: 1600,
    maxCapacity: 1,
    isBooked: false,
  },
  {
    id: "o1-2026-08-02",
    date: "2026-08-02",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    pricePerHour: 1600,
    maxCapacity: 1,
    isBooked: false,
  },
  {
    id: "o1-2026-08-03",
    date: "2026-08-03",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    pricePerHour: 1600,
    maxCapacity: 1,
    isBooked: false,
  },
];
