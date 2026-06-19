import { Booking, Course, OneOnOneSlot, Session } from "@/lib/firestoreTypes";

const addDay = (base: string, deltaDays: number): string => {
  const date = new Date(base);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString().split("T")[0];
};

export const COURSE_TIME_SLOTS = ["10:00–12:00", "14:00–16:00", "08:30–09:30"];

export const COURSES: Course[] = [
  {
    id: "mobile-ai-basics",
    name: "手機 AI 初階課程",
    slug: "mobile-ai-basics",
    description: "學會用手機 APP 生成與優化 AI 創作，建構課前與課中實作習慣。",
    memberPrice: 1600,
    nonMemberPrice: 2000,
    durationMinutes: 120,
    sessionsCount: 4,
    maxCapacity: 18,
    timeSlots: ["10:00–12:00", "14:00–16:00"],
    type: "group",
    isActive: true,
  },
  {
    id: "ai-visual-creation",
    name: "AI 圖影創作班",
    slug: "ai-visual-creation",
    description:
      "涵蓋文生圖、影像延伸與輸出規格控制，完成課堂作品集草案。",
    memberPrice: 2800,
    nonMemberPrice: 3200,
    durationMinutes: 120,
    sessionsCount: 4,
    maxCapacity: 18,
    timeSlots: ["10:00–12:00", "14:00–16:00"],
    type: "group",
    isActive: true,
  },
  {
    id: "saturday-elite-basic",
    name: "週六菁英初階課程",
    slug: "saturday-elite-basic",
    description:
      "週六專用班型，課程內容整合基礎操作、工作流程與小組討論。",
    memberPrice: 2000,
    nonMemberPrice: 2400,
    durationMinutes: 120,
    sessionsCount: 4,
    maxCapacity: 18,
    timeSlots: ["10:00–12:00", "14:00–16:00"],
    type: "group",
    isActive: true,
  },
  {
    id: "one-on-one-ai",
    name: "1 對 1 專屬 AI 課程",
    slug: "one-on-one-ai",
    description: "一對一指定主題加速學習，依學生需求客製教學內容。",
    memberPrice: 1600,
    nonMemberPrice: 1600,
    durationMinutes: 60,
    sessionsCount: 1,
    maxCapacity: 1,
    timeSlots: ["08:30–09:30"],
    type: "oneOnOne",
    isActive: true,
    pricePerHour: 1600,
  },
];

export const SESSIONS: Session[] = [
  {
    id: "ms-basics-july",
    courseId: "mobile-ai-basics",
    title: "手機 AI 初階 A 期（週期 4 週）",
    startDate: "2026-07-06",
    endDate: addDay("2026-07-06", 21),
    weekday: 1,
    startTime: "10:00",
    endTime: "12:00",
    maxCapacity: 18,
    enrolledCount: 4,
    status: "open",
  },
  {
    id: "ai-visual-july",
    courseId: "ai-visual-creation",
    title: "AI 圖影創作班 B 期（週期 4 週）",
    startDate: "2026-07-07",
    endDate: addDay("2026-07-07", 21),
    weekday: 2,
    startTime: "14:00",
    endTime: "16:00",
    maxCapacity: 18,
    enrolledCount: 8,
    status: "open",
  },
  {
    id: "sat-elite-july",
    courseId: "saturday-elite-basic",
    title: "週六菁英初階班 C 期（週期 4 週）",
    startDate: "2026-07-11",
    endDate: addDay("2026-07-11", 21),
    weekday: 6,
    startTime: "10:00",
    endTime: "12:00",
    maxCapacity: 18,
    enrolledCount: 15,
    status: "open",
  },
];

export const ONE_ON_ONE_SLOTS: OneOnOneSlot[] = [
  {
    id: "slot-1",
    date: "2026-07-08",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    pricePerHour: 1600,
    maxCapacity: 1,
    isBooked: false,
  },
  {
    id: "slot-2",
    date: "2026-07-09",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    pricePerHour: 1600,
    maxCapacity: 1,
    isBooked: true,
    studentPhone: "0912345678",
    bookingId: "seed-booking-002",
  },
  {
    id: "slot-3",
    date: "2026-07-10",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    pricePerHour: 1600,
    maxCapacity: 1,
    isBooked: false,
  },
];

export const BOOKINGS: Booking[] = [
  {
    id: "seed-booking-001",
    courseId: "mobile-ai-basics",
    sessionId: "ms-basics-july",
    name: "王小明",
    phone: "0911000111",
    email: "ming@example.com",
    isMember: true,
    amount: 1600,
    status: "confirmed",
    note: "偏好下午場",
    createdAt: "2026-06-01T10:20:00Z",
  },
  {
    id: "seed-booking-002",
    courseId: "one-on-one-ai",
    oneOnOneSlotId: "slot-2",
    name: "林小雅",
    phone: "0912345678",
    email: "xia.ya@example.com",
    isMember: false,
    amount: 1600,
    status: "paid",
    createdAt: "2026-06-02T14:30:00Z",
  },
  {
    id: "seed-booking-003",
    courseId: "ai-visual-creation",
    sessionId: "ai-visual-july",
    name: "周志文",
    phone: "0922333444",
    isMember: false,
    amount: 3200,
    status: "pending",
    createdAt: "2026-06-03T09:10:00Z",
  },
];

export const getCourseById = (id: string) =>
  COURSES.find((course) => course.id === id);

export const getSessionsByCourse = (courseId: string) =>
  SESSIONS.filter((session) => session.courseId === courseId);

export const getOneOnOneSlots = () => ONE_ON_ONE_SLOTS;
