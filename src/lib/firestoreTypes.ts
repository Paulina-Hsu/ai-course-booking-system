export type BookingStatus = "pending" | "confirmed" | "paid" | "cancelled" | "waitlist";

export type ContactPreference = "phone" | "email" | "line";

export type CourseType = "group" | "oneOnOne";

export type SessionStatus = "open" | "closed";

export type MemberStatus = "active" | "inactive" | "expired" | "unknown";

export type MemberCheckStatus = "not_requested" | "matched" | "not_found" | "inactive" | "manual_review";

export interface FirestoreMeta {
  id?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Course extends FirestoreMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberPrice: number;
  nonMemberPrice: number;
  durationMinutes: number;
  sessionsCount: number;
  maxCapacity: number;
  timeSlots: string[];
  type: CourseType;
  isActive: boolean;
  pricePerHour?: number;
}

export interface Session extends FirestoreMeta {
  id: string;
  courseId: string;
  title: string;
  weekday: string | number;
  startTime: string;
  endTime: string;

  /**
   * 期別起始日期（第一堂）
   */
  firstClassDate?: unknown;

  /**
   * 四堂課日期陣列（每週 1 次）
   */
  classDates?: unknown[];

  /**
   * 舊資料保留欄位：舊版範例資料可能還有 startDate/endDate
   */
  startDate?: string;
  endDate?: string;

  capacity?: number;
  maxCapacity?: number;

  enrolledCount: number;
  isFull: boolean;

  status?: SessionStatus;
  isOpen?: boolean;
}

export interface OneOnOneSlot extends FirestoreMeta {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pricePerHour: number;
  maxCapacity: number;
  isBooked: boolean;
  isOpen: boolean;
  studentPhone?: string | null;
  bookingId?: string | null;
}

export interface Booking extends FirestoreMeta {
  id: string;
  courseId: string;
  sessionId?: string;
  oneOnOneSlotId?: string;
  name: string;
  phone: string;
  email?: string;
  lineId?: string;
  contactPreference?: ContactPreference;
  ageRange?: string;
  aiLevel?: string;
  learningGoal?: string;
  isMember: boolean;
  requestedMember?: boolean;
  memberCheckStatus?: MemberCheckStatus;
  matchedMemberId?: string;
  memberCheckMessage?: string;
  memberCheckedAt?: unknown;
  amount: number;
  status: BookingStatus;
  note?: string;
}

export interface Admin {
  id: string;
  email: string;
  role: "admin";
}

export interface Member extends FirestoreMeta {
  id: string;
  memberNo?: string;
  name: string;
  phone?: string;
  normalizedPhone?: string;
  email?: string;
  status: MemberStatus;
  statusLabel: string;
  note?: string;
  joinedAt?: unknown;
  importedAt?: unknown;
}

export interface Settings extends FirestoreMeta {
  id: string;
  maxCapacityPerSession: number;
  sessionsPerBatch: number;
  paymentEnabled: boolean;
  allowWaitlist: boolean;
}

export const BOOKING_STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "pending", label: "待確認" },
  { value: "confirmed", label: "已確認" },
  { value: "paid", label: "已付款" },
  { value: "cancelled", label: "已取消" },
  { value: "waitlist", label: "候補" },
];

export const COURSE_TYPE_OPTIONS: { value: CourseType; label: string }[] = [
  { value: "group", label: "團體班" },
  { value: "oneOnOne", label: "1對1" },
];


