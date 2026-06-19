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
  ContactPreference,
  Course,
  CourseType,
  OneOnOneSlot,
  Session,
} from "./firestoreTypes";

const DUPLICATE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "paid", "waitlist"];
const CAPACITY_COUNTED_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "paid"];
const DEFAULT_SESSION_CAPACITY = 18;
const DEFAULT_ONE_ON_ONE_DURATION_MINUTES = 60;

const ensureDb = () => {
  if (!isFirebaseReady || !db) {
    throw new Error("Firebase 尚未設定，請先完成 .env.local 設定");
  }
  return db;
};

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, "");

function mapDoc<T>(snapshot: { id: string; data: () => DocumentData }): T & { id: string; legacyId?: string } {
  const data = snapshot.data();
  const legacyId = typeof data.id === "string" ? data.id : undefined;
  return { ...(data as T), legacyId, id: snapshot.id } as T & { id: string; legacyId?: string };
}

function getTimestampMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().getTime();
  }
  return 0;
}

function formatLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInputValue(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return formatLocalDateInputValue(value);
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return formatLocalDateInputValue((value as Timestamp).toDate());
  }
  return "";
}

function toDate(value: string, time = "00:00"): Date {
  const [year, month, day] = value.split("-").map(Number);
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function buildClassDates(firstClassDate: string, startTime: string, count = 4): Timestamp[] {
  const startDate = toDate(firstClassDate, startTime);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("firstClassDate 格式不正確");
  }
  return Array.from({ length: count }, (_, index) => {
    const classDate = new Date(startDate);
    classDate.setDate(startDate.getDate() + index * 7);
    return Timestamp.fromDate(classDate);
  });
}

function isSessionOpen(session: Session): boolean {
  if (session.isOpen === false) return false;
  return true;
}

function doesStatusUseCapacity(status: BookingStatus): boolean {
  return CAPACITY_COUNTED_BOOKING_STATUSES.includes(status);
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

type LegacyCourseRecord = Partial<
  Omit<Course, "id" | "type" | "timeSlots" | "memberPrice" | "nonMemberPrice" | "pricePerHour">
> & {
  id: string;
  legacyId?: string;
  type?: CourseType;
  title?: string;
  courseType?: CourseType;
  capacity?: number;
  timeSlots?: string[] | string | null;
  memberPrice?: number | string | null;
  nonMemberPrice?: number | string | null;
  pricePerHour?: number | string | null;
};

type LegacySessionRecord = Partial<Omit<Session, "id">> & {
  id: string;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numericValue = typeof value === "string" ? Number(value) : value;
  return typeof numericValue === "number" && Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().replace(/\s+/g, "") : "";
}

function resolveCourseType(record: LegacyCourseRecord): CourseType {
  const rawType = normalizeText(record.type);
  const rawCourseType = normalizeText(record.courseType);
  const slug = normalizeText(record.slug || record.legacyId || record.id);
  const name = normalizeText(record.name || record.title);
  const combined = `${rawType} ${rawCourseType} ${slug} ${name}`;
  const isOneOnOne =
    rawType === "oneonone" ||
    rawType === "one-on-one" ||
    rawType === "1對1" ||
    rawCourseType === "oneonone" ||
    rawCourseType === "one-on-one" ||
    rawCourseType === "1對1" ||
    combined.includes("oneonone") ||
    combined.includes("one-on-one") ||
    combined.includes("1對1") ||
    combined.includes("1對一") ||
    combined.includes("一對一") ||
    combined.includes("專屬ai課程");

  return isOneOnOne ? "oneOnOne" : "group";
}

function normalizeCourseRecord(record: LegacyCourseRecord): Course {
  const type = resolveCourseType(record);
  const defaultTimeSlots = type === "oneOnOne" ? ["08:30-09:30"] : ["10:00-12:00", "14:00-16:00"];
  const timeSlots = Array.isArray(record.timeSlots)
    ? record.timeSlots
    : typeof record.timeSlots === "string"
      ? record.timeSlots.split(/[,，]/).map((timeSlot) => timeSlot.trim()).filter(Boolean)
      : defaultTimeSlots;
  const pricePerHour = toFiniteNumber(record.pricePerHour, toFiniteNumber(record.memberPrice, toFiniteNumber(record.nonMemberPrice, 1600)));
  const memberPrice = toFiniteNumber(record.memberPrice, type === "oneOnOne" ? pricePerHour : 0);
  const nonMemberPrice = toFiniteNumber(record.nonMemberPrice, type === "oneOnOne" ? pricePerHour : memberPrice);
  const normalizedPricePerHour = type === "oneOnOne" ? pricePerHour : toFiniteNumber(record.pricePerHour, 0) || undefined;

  return {
    ...record,
    name: record.name || record.title || "",
    slug: record.slug || record.legacyId || record.id,
    description: record.description || "",
    memberPrice,
    nonMemberPrice,
    type,
    maxCapacity: record.maxCapacity || record.capacity || DEFAULT_SESSION_CAPACITY,
    sessionsCount: record.sessionsCount || (type === "oneOnOne" ? 1 : 4),
    durationMinutes: record.durationMinutes || (type === "oneOnOne" ? 60 : 120),
    timeSlots: timeSlots.length > 0 ? timeSlots : defaultTimeSlots,
    isActive: record.isActive ?? true,
    pricePerHour: normalizedPricePerHour,
  };
}

function normalizeSessionRecord(record: LegacySessionRecord): Session {
  const capacity = getSessionCapacity(record as Session);
  const enrolledCount = toFiniteNumber(record.enrolledCount, 0);

  return {
    ...record,
    courseId: record.courseId || "",
    title: record.title || record.id,
    weekday: record.weekday || "",
    startTime: record.startTime || "",
    endTime: record.endTime || "",
    classDates: Array.isArray(record.classDates) ? record.classDates : [],
    capacity,
    maxCapacity: capacity,
    enrolledCount,
    isFull: record.isFull === true || enrolledCount >= capacity,
    isOpen: record.isOpen ?? true,
  };
}

export async function listCourses(includeInactive = false): Promise<Course[]> {
  if (!isFirebaseReady) return [] as Course[];
  const firestore = ensureDb();
  const snapshot = await getDocs(collection(firestore, "courses"));
  return snapshot.docs
    .map((docRef) => normalizeCourseRecord(mapDoc<LegacyCourseRecord>(docRef)))
    .filter((course) => includeInactive || course.isActive !== false)
    .sort((a, b) => {
      const nameA = a.name || (a as LegacyCourseRecord).title || "";
      const nameB = b.name || (b as LegacyCourseRecord).title || "";
      return nameA.localeCompare(nameB, "zh-TW");
    });
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  if (!isFirebaseReady) return null;
  const firestore = ensureDb();

  const snap = await getDoc(doc(firestore, "courses", courseId));
  if (snap.exists()) return normalizeCourseRecord(mapDoc<LegacyCourseRecord>(snap));

  const slugSnapshot = await getDocs(query(collection(firestore, "courses"), where("slug", "==", courseId)));
  const slugMatch = slugSnapshot.docs[0];
  if (slugMatch) return normalizeCourseRecord(mapDoc<LegacyCourseRecord>(slugMatch));

  const legacyIdSnapshot = await getDocs(query(collection(firestore, "courses"), where("id", "==", courseId)));
  const legacyIdMatch = legacyIdSnapshot.docs[0];
  if (legacyIdMatch) return normalizeCourseRecord(mapDoc<LegacyCourseRecord>(legacyIdMatch));

  const courses = await listCourses(true);
  const normalizedMatch = courses.find((course) => course.id === courseId || course.slug === courseId);
  return normalizedMatch || null;
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

  const payload = cleanPayload({
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

  const ref = await addDoc(collection(firestore, "courses"), payload);

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
  await updateDoc(doc(firestore, "courses", courseId), cleanPayload({
    isActive,
    updatedAt: serverTimestamp(),
  }));
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
    .map((d) => normalizeSessionRecord(mapDoc<LegacySessionRecord>(d)))
    .sort((a, b) => {
      const aDate = getTimestampMillis((a.firstClassDate as unknown) || a.startDate);
      const bDate = getTimestampMillis((b.firstClassDate as unknown) || b.startDate);
      if (aDate !== bDate) {
        return aDate - bDate;
      }
      return Number(getSessionCapacity(a) || 0) - Number(getSessionCapacity(b) || 0);
    });
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  if (!isFirebaseReady) return null;
  const firestore = ensureDb();
  const snap = await getDoc(doc(firestore, "sessions", sessionId));
  if (!snap.exists()) return null;
  return normalizeSessionRecord(mapDoc<LegacySessionRecord>(snap));
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

  const classDates = buildClassDates(input.firstClassDate, input.startTime);

  const ref = await addDoc(collection(firestore, "sessions"), {
    courseId: input.courseId,
    title: input.title.trim(),
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    firstClassDate: Timestamp.fromDate(toDate(input.firstClassDate, input.startTime)),
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
          firstClassDate: nextFirstClassDate ? Timestamp.fromDate(toDate(nextFirstClassDate, nextStartTime)) : deleteField(),
          classDates: nextFirstClassDate ? buildClassDates(nextFirstClassDate, nextStartTime) : deleteField(),
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
  await updateDoc(sessionRef, cleanPayload({
    isOpen,
    status: isOpen ? "open" : "closed",
    updatedAt: serverTimestamp(),
  }));
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

export async function getOneOnOneSlotById(slotId: string): Promise<OneOnOneSlot | null> {
  if (!isFirebaseReady) return null;
  const firestore = ensureDb();
  const snap = await getDoc(doc(firestore, "oneOnOneSlots", slotId));
  if (!snap.exists()) return null;
  return mapDoc<OneOnOneSlot>(snap);
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
  await updateDoc(doc(firestore, "oneOnOneSlots", slotId), cleanPayload({
    isOpen,
    updatedAt: serverTimestamp(),
  }));
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

export async function getBookingById(bookingId: string): Promise<(Booking & { id: string }) | null> {
  if (!isFirebaseReady) return null;
  const firestore = ensureDb();
  const snap = await getDoc(doc(firestore, "bookings", bookingId));
  if (!snap.exists()) return null;
  return mapDoc<Booking>(snap);
}

export interface CreateBookingInput {
  courseId: string;
  name: string;
  phone: string;
  email?: string;
  lineId?: string;
  contactPreference?: ContactPreference;
  ageRange?: string;
  aiLevel?: string;
  learningGoal?: string;
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
        where("status", "in", DUPLICATE_BOOKING_STATUSES),
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
      const currentEnrolledCount = Number(session.enrolledCount || 0);
      if (session.isFull === true || currentEnrolledCount >= capacity) {
        throw new Error("名額已滿，無法報名");
      }

      const enrolledCount = currentEnrolledCount + 1;
      tx.update(sessionRef, cleanPayload({
        enrolledCount,
        isFull: enrolledCount >= capacity,
        maxCapacity: capacity,
        updatedAt: serverTimestamp(),
        ...(enrolledCount >= capacity ? { status: "closed" } : {}),
      }));

      tx.set(bookingRef, cleanPayload({
        courseId: input.courseId,
        sessionId: input.sessionId,
        name: input.name,
        phone: normalizedPhone,
        email: input.email?.trim(),
        lineId: input.lineId?.trim() || undefined,
        contactPreference: input.contactPreference,
        ageRange: input.ageRange,
        aiLevel: input.aiLevel,
        learningGoal: input.learningGoal?.trim() || undefined,
        isMember: input.isMember,
        amount,
        note: input.note,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
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
        where("status", "in", DUPLICATE_BOOKING_STATUSES),
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

      tx.update(slotRef, cleanPayload({
        isBooked: true,
        studentPhone: normalizedPhone,
        bookingId: bookingRef.id,
        updatedAt: serverTimestamp(),
      }));

      tx.set(bookingRef, cleanPayload({
        courseId: input.courseId,
        oneOnOneSlotId,
        name: input.name,
        phone: normalizedPhone,
        email: input.email?.trim(),
        lineId: input.lineId?.trim() || undefined,
        contactPreference: input.contactPreference,
        ageRange: input.ageRange,
        aiLevel: input.aiLevel,
        learningGoal: input.learningGoal?.trim() || undefined,
        isMember: input.isMember,
        amount,
        note: input.note,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
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
    const currentStatus = booking.status;
    const wasUsingCapacity = doesStatusUseCapacity(currentStatus);
    let finalStatus = nextStatus;
    let willUseCapacity = doesStatusUseCapacity(nextStatus);

    if (booking.sessionId && wasUsingCapacity !== willUseCapacity) {
      const sessionRef = doc(firestore, "sessions", booking.sessionId);
      const sessionSnap = await tx.get(sessionRef);

      if (sessionSnap.exists()) {
        const session = sessionSnap.data() as Session;
        const capacity = getSessionCapacity(session);
        let enrolledCount = Number(session.enrolledCount || 0);

        if (wasUsingCapacity && !willUseCapacity) {
          enrolledCount = Math.max(enrolledCount - 1, 0);
        }

        if (!wasUsingCapacity && willUseCapacity) {
          if (enrolledCount >= capacity) {
            finalStatus = "waitlist";
            willUseCapacity = false;
          } else {
            enrolledCount += 1;
          }
        }

        tx.update(sessionRef, cleanPayload({
          enrolledCount,
          isFull: enrolledCount >= capacity,
          status: enrolledCount >= capacity ? "closed" : "open",
          maxCapacity: capacity,
          updatedAt: serverTimestamp(),
        }));
      }
    }

    if (booking.oneOnOneSlotId && wasUsingCapacity !== willUseCapacity) {
      const slotRef = doc(firestore, "oneOnOneSlots", booking.oneOnOneSlotId);
      const slotSnap = await tx.get(slotRef);

      if (slotSnap.exists()) {
        const slot = slotSnap.data() as OneOnOneSlot;

        if (wasUsingCapacity && !willUseCapacity) {
          tx.update(slotRef, cleanPayload({
            isBooked: false,
            studentPhone: null,
            bookingId: null,
            updatedAt: serverTimestamp(),
          }));
        }

        if (!wasUsingCapacity && willUseCapacity) {
          if (slot.isBooked && slot.bookingId !== bookingId) {
            throw new Error("此時段已被其他學員佔用");
          }

          if (slot.isOpen === false) {
            throw new Error("1 對 1 時段目前未開放");
          }

          tx.update(slotRef, cleanPayload({
            isBooked: true,
            studentPhone: booking.phone,
            bookingId,
            updatedAt: serverTimestamp(),
          }));
        }
      }
    }

    tx.update(bookingRef, cleanPayload({
      status: finalStatus,
      updatedAt: serverTimestamp(),
    }));
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
  const firstDate = toDateInputValue(session.firstClassDate || session.startDate).replaceAll("-", "/");
  const title = session.title || session.id;
  const dateText = firstDate ? `${firstDate} 起` : "日期未設定";
  const timeText = `${session.startTime || "時間未設定"}-${session.endTime || ""}`.replace(/-$/, "");
  return `${title}｜${dateText}｜${timeText}`;
};

export const listSessionClassDates = (session: Session): string[] => {
  const dates = (session.classDates || []).map(toDateInputValue).filter(Boolean);
  if (dates.length > 0) {
    return dates as string[];
  }
  const fallbackDate = toDateInputValue(session.startDate);
  return fallbackDate ? [fallbackDate] : [];
};


