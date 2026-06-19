export type BookingStatus = "pending" | "confirmed" | "paid" | "cancelled" | "waitlist";

export type CourseType = "group" | "oneOnOne";

export type SessionStatus = "open" | "closed";

export type SlotBookingStatus = "available" | "booked";

export interface TimestampedDocument {
  createdAt?: string;
  updatedAt?: string;
}

export interface Course extends TimestampedDocument {
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

export interface Session extends TimestampedDocument {
  id: string;
  courseId: string;
  title: string;
  startDate: string;
  endDate: string;
  weekday: number;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledCount: number;
  status: SessionStatus;
}

export interface OneOnOneSlot extends TimestampedDocument {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pricePerHour: number;
  maxCapacity: number;
  isBooked: boolean;
  studentPhone?: string;
  bookingId?: string;
}

export interface Booking extends TimestampedDocument {
  id: string;
  courseId: string;
  sessionId?: string;
  oneOnOneSlotId?: string;
  name: string;
  phone: string;
  email?: string;
  isMember: boolean;
  amount: number;
  status: BookingStatus;
  note?: string;
}

export interface Admin {
  id: string;
  email: string;
  role: "admin";
}

export interface Settings {
  id: "global";
  maxCapacityPerGroupSession: number;
  groupLessonCount: number;
  paymentEnabled: boolean;
  allowWaitlist: boolean;
  maintenance: boolean;
}

export const BOOKING_STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "pending", label: "待確認" },
  { value: "confirmed", label: "已確認" },
  { value: "paid", label: "已付款" },
  { value: "cancelled", label: "已取消" },
  { value: "waitlist", label: "候補" },
];
