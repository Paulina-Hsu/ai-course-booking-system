import {
  addDoc,
  collection,
  deleteField,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Transaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { isFirebaseReady, db } from "./firebase";
import {
  Booking,
  BookingStatus,
  Course,
  OneOnOneSlot,
  Session,
} from "./firestoreTypes";

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "paid", "waitlist"];
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_CAPACITY = 18;
const DEFAULT_ONE_ON_ONE_DURATION_MINUTES = 60;

const ensureDb = () => {
  if (!isFirebaseReady || !db) {
    throw new Error("Firebase 尚未設定，請先完成 .env.local 設定");
  }
  return db;
};

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, "");

function mapDoc<T>(snapshot: { id: string; data: () => DocumentData }): T & { id: string } {
  return { id: snapshot.id, ...(snapshot.data() as T) } as T & { id: string };
}

function getTimestampMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().getTime();
  }
  return 0;
}

function toDateInputValue(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString().slice(0, 10);
  }
  return "";
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function buildClassDates(firstClassDate: string, count = 4): Timestamp[] {
  const startDate = toDate(firstClassDate);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("firstClassDate 格式不正確");
  }
  return Array.from({ length: count }, (_, index) => Timestamp.fromDate(new Date(startDate.getTime() + index * ONE_WEEK_MS)));
}

function isSessionOpen(session: Session): boolean {
  if (session.isOpen === false) return false;
  if (typeof session.status === "string" && session.status !== "open") return false;
  return true;
}

function getSessionCapacity(session: Session): number {
  if (typeof session.capacity === "number" && Number.isFinite(session.capacity)) return session.capacity;
  if (typeof session.maxCapacity === "number" && Number.isFinite(session.maxCapacity)) return session.maxCapacity;
  return DEFAULT_SESSION_CAPACITY;
}

function cleanPayload(payload: Record<string, unknown>) {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries);
}

export async function listCourses(includeInactive = false): Promise<Course[]> {
  if (!isFirebaseReady) return [] as Course[];
  const firestore = ensureDb();
  const snapshot = await getDocs(collection(firestore, "courses"));
  return snapshot.docs
    .map((docRef) => mapDoc<Course>(docRef))
    .filter((course) => includeInactive || course.isActive !== false)
    .sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  if (!isFirebaseReady) return null;
  const firestore = ensureDb();
  const snap = await getDoc(doc(firestore, "courses", courseId));
  if (!snap.exists()) return null;
  return mapDoc<Course>(snap);
}

export interface CreateCourseInput {
  name: string;
  slug: string;
  description: string;
  memberPrice: number;
  nonMemberPrice: number;
  durationMinutes: number;
  sessionsCount: number;
  maxCapacity: number;
  timeSlots: string[];
  type: Course["type"];
  isActive: boolean;
  pricePerHour?: number;
}

export async function createCourse(input: CreateCourseInput): Promise<string> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();

  const ref = await addDoc(collection(firestore, "courses"), {
    name: input.name.trim(),
    slug: input.slug.trim(),
    description: input.description.trim(),
    memberPrice: Number(input.memberPrice) || 0,
    nonMemberPrice: Number(input.nonMemberPrice) || 0,
    durationMinutes: Number(input.durationMinutes) || 120,
    sessionsCount: Number(input.sessionsCount) || 1,
    maxCapacity: Number(input.maxCapacity) || DEFAULT_SESSION_CAPACITY,
    timeSlots: input.timeSlots.map((timeSlot) => timeSlot.trim()).filter(Boolean),
    type: input.type,
    isActive: input.isActive,
    pricePerHour: input.pricePerHour ?? undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export interface UpdateCourseInput extends Partial<Omit<CreateCourseInput, "type">> {
  type?: Course["type"];
}

export async function updateCourse(courseId: string, input: UpdateCourseInput): Promise<void> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();
  const ref = doc(firestore, "courses", courseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("找不到課程");

  const payload = cleanPayload({
    name: input.name?.trim(),
    slug: input.slug?.trim(),
    description: input.description?.trim(),
    memberPrice: input.memberPrice,
    nonMemberPrice: input.nonMemberPrice,
    durationMinutes: input.durationMinutes,
    sessionsCount: input.sessionsCount,
    maxCapacity: input.maxCapacity,
    timeSlots: input.timeSlots?.map((timeSlot) => timeSlot.trim()).filter(Boolean),
    type: input.type,
    isActive: input.isActive,
    pricePerHour: input.pricePerHour,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(ref, payload as Record<string, unknown>);
}

export async function setCourseActive(courseId: string, isActive: boolean): Promise<void> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();
  await updateDoc(doc(firestore, "courses", courseId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export async function listSessions(courseId?: string): Promise<Session[]> {
  if (!isFirebaseReady) return [] as Session[];
  const firestore = ensureDb();

  const snapshot = await getDocs(
    courseId
      ? query(collection(firestore, "sessions"), where("courseId", "==", courseId))
      : query(collection(firestore, "sessions")),
  );

  return snapshot.docs
    .map((d) => mapDoc<Session>(d))
    .sort((a, b) => {
      const aDate = getTimestampMillis((a.firstClassDate as unknown) || a.startDate);
      const bDate = getTimestampMillis((b.firstClassDate as unknown) || b.startDate);
      if (aDate !== bDate) {
        return aDate - bDate;
      }
      return Number(getSessionCapacity(a) || 0) - Number(getSessionCapacity(b) || 0);
    });
}

export interface CreateSessionInput {
  courseId: string;
  title: string;
  weekday: string;
  startTime: string;
  endTime: string;
  firstClassDate: string;
  capacity: number;
  isOpen: boolean;
}

export async function createSession(input: CreateSessionInput): Promise<string> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();

  const course = await getCourseById(input.courseId);
  if (!course) throw new Error("找不到課程");

  const classDates = buildClassDates(input.firstClassDate);

  const ref = await addDoc(collection(firestore, "sessions"), {
    courseId: input.courseId,
    title: input.title.trim(),
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    firstClassDate: Timestamp.fromDate(toDate(input.firstClassDate)),
    classDates,
    capacity: Number(input.capacity) || DEFAULT_SESSION_CAPACITY,
    maxCapacity: Number(input.capacity) || DEFAULT_SESSION_CAPACITY,
    enrolledCount: 0,
    isFull: false,
    isOpen: input.isOpen ?? true,
    status: input.isOpen === false ? "closed" : "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export interface UpdateSessionInput {
  title?: string;
  weekday?: string;
  startTime?: string;
  endTime?: string;
  firstClassDate?: string;
  capacity?: number;
  isOpen?: boolean;
  enrolledCount?: number;
}

export async function updateSession(sessionId: string, input: UpdateSessionInput): Promise<void> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();

  const sessionRef = doc(firestore, "sessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) throw new Error("找不到期別");
  const current = sessionSnap.data() as Session;

  const nextStartTime = input.startTime ?? current.startTime;
  const shouldRebuildDates = input.firstClassDate !== undefined || input.startTime !== undefined;
  const nextFirstClassDate = input.firstClassDate ?? toDateInputValue(current.firstClassDate);
  if (shouldRebuildDates && !nextFirstClassDate) {
    throw new Error("請輸入第一堂日期");
  }

  const updatedCapacity =
    input.capacity === undefined ? getSessionCapacity(current) : Number(input.capacity) || getSessionCapacity(current);
  const updatedEnrolledCount = input.enrolledCount === undefined ? current.enrolledCount : Number(input.enrolledCount) || 0;

  const payload = cleanPayload({
    title: input.title?.trim(),
    weekday: input.weekday,
    startTime: nextStartTime,
    endTime: input.endTime,
    capacity: updatedCapacity,
    maxCapacity: updatedCapacity,
    enrolledCount: updatedEnrolledCount,
    isFull: updatedEnrolledCount >= updatedCapacity,
    isOpen: input.isOpen,
    status: input.isOpen === false ? "closed" : input.isOpen === true ? "open" : current.status,
    updatedAt: serverTimestamp(),
    ...(shouldRebuildDates
      ? {
          firstClassDate: nextFirstClassDate ? Timestamp.fromDate(toDate(nextFirstClassDate)) : deleteField(),
          classDates: nextFirstClassDate ? buildClassDates(nextFirstClassDate) : deleteField(),
        }
      : {}),
    ...(shouldRebuildDates ? {} : { startTime: nextStartTime }),
  });

  const finalPayload = cleanPayload(payload);
  if (!shouldRebuildDates) {
    delete finalPayload.startTime;
  }

  await updateDoc(sessionRef, finalPayload);
}

export async function setSessionOpen(sessionId: string, isOpen: boolean): Promise<void> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();
  const sessionRef = doc(firestore, "sessions", sessionId);
  await updateDoc(sessionRef, {
    isOpen,
    status: isOpen ? "open" : "closed",
    updatedAt: serverTimestamp(),
  });
}

export async function listOneOnOneSlots(): Promise<OneOnOneSlot[]> {
  if (!isFirebaseReady) return [] as OneOnOneSlot[];
  const firestore = ensureDb();
  const snapshot = await getDocs(collection(firestore, "oneOnOneSlots"));
  return snapshot.docs
    .map((d) => mapDoc<OneOnOneSlot>(d))
    .map((slot) => ({
      ...slot,
      isOpen: slot.isOpen ?? true,
    }))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

export interface CreateOneOnOneSlotInput {
  date: string;
  startTime: string;
  endTime: string;
  pricePerHour: number;
  isOpen: boolean;
}

export async function createOneOnOneSlot(input: CreateOneOnOneSlotInput): Promise<string> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();

  const ref = await addDoc(collection(firestore, "oneOnOneSlots"), {
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: DEFAULT_ONE_ON_ONE_DURATION_MINUTES,
    pricePerHour: Number(input.pricePerHour) || 1600,
    maxCapacity: 1,
    isBooked: false,
    isOpen: input.isOpen,
    studentPhone: null,
    bookingId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export interface UpdateOneOnOneSlotInput {
  date?: string;
  startTime?: string;
  endTime?: string;
  pricePerHour?: number;
  isOpen?: boolean;
}

export async function updateOneOnOneSlot(slotId: string, input: UpdateOneOnOneSlotInput): Promise<void> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();

  const ref = doc(firestore, "oneOnOneSlots", slotId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error("找不到時段");

  await updateDoc(
    ref,
    cleanPayload({
      date: input.date?.trim(),
      startTime: input.startTime?.trim(),
      endTime: input.endTime?.trim(),
      pricePerHour: input.pricePerHour,
      isOpen: input.isOpen,
      updatedAt: serverTimestamp(),
    }),
  );
}

export async function setOneOnOneSlotOpen(slotId: string, isOpen: boolean): Promise<void> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();
  await updateDoc(doc(firestore, "oneOnOneSlots", slotId), {
    isOpen,
    updatedAt: serverTimestamp(),
  });
}

export interface BookingQueryFilter {
  courseId?: string;
  sessionId?: string;
  status?: BookingStatus;
}

export async function listBookings(filters: BookingQueryFilter = {}): Promise<(Booking & { id: string })[]> {
  if (!isFirebaseReady) return [];
  const firestore = ensureDb();
  const firestoreConstraints = [] as Parameters<typeof query>[1][];
  if (filters.courseId) {
    firestoreConstraints.push(where("courseId", "==", filters.courseId));
  }
  if (filters.sessionId) {
    firestoreConstraints.push(where("sessionId", "==", filters.sessionId));
  }
  if (filters.status) {
    firestoreConstraints.push(where("status", "==", filters.status));
  }

  const snapshot = await getDocs(
    firestoreConstraints.length > 0
      ? query(collection(firestore, "bookings"), ...firestoreConstraints)
      : query(collection(firestore, "bookings")),
  );

  const bookings = snapshot.docs.map((d) => mapDoc<Booking>(d));
  return bookings.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
}

export interface CreateBookingInput {
  courseId: string;
  name: string;
  phone: string;
  email?: string;
  isMember: boolean;
  sessionId?: string;
  oneOnOneSlotId?: string;
  note?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<string> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();

  const course = await getCourseById(input.courseId);
  if (!course) throw new Error("找不到課程");

  const normalizedPhone = normalizePhone(input.phone);
  const bookingRef = doc(collection(firestore, "bookings"));
  const amount =
    course.type === "oneOnOne"
      ? course.pricePerHour || course.memberPrice
      : input.isMember
        ? course.memberPrice
        : course.nonMemberPrice;

  if (input.sessionId) {
    const sessionId = input.sessionId;
    const duplicated = await getDocs(
      query(
        collection(firestore, "bookings"),
        where("sessionId", "==", input.sessionId),
        where("phone", "==", normalizedPhone),
        where("status", "in", ACTIVE_BOOKING_STATUSES),
      ),
    );

    if (duplicated.size > 0) {
      throw new Error("此手機號碼已重複報名同一期課程");
    }

    await runTransaction(firestore, async (tx: Transaction) => {
      const sessionRef = doc(firestore, "sessions", sessionId);
      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists()) throw new Error("找不到時段");

      const session = sessionSnap.data() as Session;
      if (!isSessionOpen(session)) {
        throw new Error("該一期課程目前未開放報名");
      }

      const capacity = getSessionCapacity(session);
      if (session.enrolledCount >= capacity) {
        throw new Error("名額已滿，無法報名");
      }

      const enrolledCount = Number(session.enrolledCount || 0) + 1;
      tx.update(sessionRef, {
        enrolledCount,
        isFull: enrolledCount >= capacity,
        status: enrolledCount >= capacity ? "closed" : session.status,
        maxCapacity: capacity,
        updatedAt: serverTimestamp(),
      });

      tx.set(bookingRef, {
        courseId: input.courseId,
        sessionId: input.sessionId,
        name: input.name,
        phone: normalizedPhone,
        email: input.email,
        isMember: input.isMember,
        amount,
        note: input.note,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return bookingRef.id;
  }

  if (input.oneOnOneSlotId) {
    const oneOnOneSlotId = input.oneOnOneSlotId;
    const duplicated = await getDocs(
      query(
        collection(firestore, "bookings"),
        where("oneOnOneSlotId", "==", oneOnOneSlotId),
        where("phone", "==", normalizedPhone),
        where("status", "in", ACTIVE_BOOKING_STATUSES),
      ),
    );

    if (duplicated.size > 0) {
      throw new Error("此手機號碼已重複報名同一期課程");
    }

    await runTransaction(firestore, async (tx: Transaction) => {
      const slotRef = doc(firestore, "oneOnOneSlots", oneOnOneSlotId);
      const slotSnap = await tx.get(slotRef);
      if (!slotSnap.exists()) throw new Error("找不到 1 對 1 時段");

      const slot = slotSnap.data() as OneOnOneSlot;
      if (slot.isOpen === false) {
        throw new Error("1 對 1 時段目前未開放");
      }
      if (slot.isBooked) throw new Error("這個時段已被預約");

      tx.update(slotRef, {
        isBooked: true,
        studentPhone: normalizedPhone,
        bookingId: bookingRef.id,
        updatedAt: serverTimestamp(),
      });

      tx.set(bookingRef, {
        courseId: input.courseId,
        oneOnOneSlotId,
        name: input.name,
        phone: normalizedPhone,
        email: input.email,
        isMember: input.isMember,
        amount,
        note: input.note,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return bookingRef.id;
  }

  throw new Error("請選擇團班一期別或 1 對 1 時段");
}

export async function updateBookingStatus(bookingId: string, nextStatus: BookingStatus): Promise<void> {
  if (!isFirebaseReady) throw new Error("Firebase 尚未設定");
  const firestore = ensureDb();

  const bookingRef = doc(firestore, "bookings", bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) throw new Error("找不到報名資料");

  const current = bookingSnap.data() as Booking;
  if (current.status === nextStatus) return;

  await runTransaction(firestore, async (tx: Transaction) => {
    const fresh = await tx.get(bookingRef);
    if (!fresh.exists()) throw new Error("找不到報名資料");

    const booking = fresh.data() as Booking;
    const releaseCapacity = booking.status !== "cancelled" && nextStatus === "cancelled";
    const reclaimCapacity = booking.status === "cancelled" && nextStatus !== "cancelled";

    if (booking.sessionId && (releaseCapacity || reclaimCapacity)) {
      const sessionRef = doc(firestore, "sessions", booking.sessionId);
      const sessionSnap = await tx.get(sessionRef);
      if (sessionSnap.exists()) {
        const session = sessionSnap.data() as Session;
        const capacity = getSessionCapacity(session);
        let enrolledCount = Number(session.enrolledCount || 0);

        if (releaseCapacity && enrolledCount > 0) enrolledCount -= 1;
        if (reclaimCapacity && enrolledCount < capacity) enrolledCount += 1;

        tx.update(sessionRef, {
          enrolledCount,
          isFull: enrolledCount >= capacity,
          status: enrolledCount >= capacity ? "closed" : "open",
          maxCapacity: capacity,
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (booking.oneOnOneSlotId && (releaseCapacity || reclaimCapacity)) {
      const slotRef = doc(firestore, "oneOnOneSlots", booking.oneOnOneSlotId);
      const slotSnap = await tx.get(slotRef);
      if (slotSnap.exists()) {
        const slot = slotSnap.data() as OneOnOneSlot;

        if (releaseCapacity) {
          tx.update(slotRef, {
            isBooked: false,
            studentPhone: null,
            bookingId: null,
            updatedAt: serverTimestamp(),
          });
        } else if (reclaimCapacity) {
          if (slot.isBooked && slot.bookingId !== bookingId) {
            throw new Error("此時段已被其他學員佔用");
          }

          if (slot.isOpen === false) {
            throw new Error("1 對 1 時段目前未開放");
          }

          tx.update(slotRef, {
            isBooked: true,
            studentPhone: booking.phone,
            bookingId,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    tx.update(bookingRef, {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function getBookingCounts() {
  const bookings = await listBookings();
  return bookings.reduce(
    (acc, booking) => {
      acc.total += 1;
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      confirmed: 0,
      paid: 0,
      cancelled: 0,
      waitlist: 0,
    } as Record<string, number>,
  );
}

export const formatSessionLabel = (session: Session): string => {
  const firstDate = toDateInputValue(session.firstClassDate || session.startDate);
  if (!firstDate) return session.title;
  return `${firstDate} ${session.startTime}-${session.endTime}`;
};

export const listSessionClassDates = (session: Session): string[] => {
  const dates = (session.classDates || []).map(toDateInputValue).filter(Boolean);
  if (dates.length > 0) {
    return dates as string[];
  }
  const fallbackDate = toDateInputValue(session.startDate);
  return fallbackDate ? [fallbackDate] : [];
};
