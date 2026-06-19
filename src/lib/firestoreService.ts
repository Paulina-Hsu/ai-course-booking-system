import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  QueryConstraint,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Transaction,
  where,
} from "firebase/firestore";
import { isFirebaseReady, db } from "./firebase";
import { Booking, BookingStatus, Course, OneOnOneSlot, Session } from "./firestoreTypes";

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "paid", "waitlist"];

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

export async function listCourses() {
  if (!isFirebaseReady) return [] as Course[];
  const firestore = ensureDb();
  const snapshot = await getDocs(collection(firestore, "courses"));
  return snapshot.docs
    .map((docRef) => mapDoc<Course>(docRef))
    .filter((course) => course.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  if (!isFirebaseReady) return null;
  const firestore = ensureDb();
  const snap = await getDoc(doc(firestore, "courses", courseId));
  if (!snap.exists()) return null;
  return mapDoc<Course>(snap);
}

export async function listSessions(courseId?: string): Promise<Session[]> {
  if (!isFirebaseReady) return [] as Session[];
  const firestore = ensureDb();
  const constraints: QueryConstraint[] = [];
  if (courseId) constraints.push(where("courseId", "==", courseId));

  const snapshot = await getDocs(
    constraints.length > 0
      ? query(collection(firestore, "sessions"), ...constraints)
      : query(collection(firestore, "sessions")),
  );

  return snapshot.docs
    .map((d) => mapDoc<Session>(d))
    .sort((a, b) => `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`));
}

export async function listOneOnOneSlots(): Promise<OneOnOneSlot[]> {
  if (!isFirebaseReady) return [] as OneOnOneSlot[];
  const firestore = ensureDb();
  const snapshot = await getDocs(collection(firestore, "oneOnOneSlots"));
  return snapshot.docs
    .map((d) => mapDoc<OneOnOneSlot>(d))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

export interface BookingQueryFilter {
  courseId?: string;
  sessionId?: string;
  status?: BookingStatus;
}

export async function listBookings(filters: BookingQueryFilter = {}): Promise<(Booking & { id: string })[]> {
  if (!isFirebaseReady) return [];
  const firestore = ensureDb();
  const constraints: QueryConstraint[] = [];

  if (filters.courseId) {
    constraints.push(where("courseId", "==", filters.courseId));
  }
  if (filters.sessionId) {
    constraints.push(where("sessionId", "==", filters.sessionId));
  }
  if (filters.status) {
    constraints.push(where("status", "==", filters.status));
  }

  const snapshot = await getDocs(
    constraints.length > 0
      ? query(collection(firestore, "bookings"), ...constraints)
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

  const amount = input.isMember ? course.memberPrice : course.nonMemberPrice;
  const normalizedPhone = normalizePhone(input.phone);
  const bookingRef = doc(collection(firestore, "bookings"));

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
      if (session.isFull || session.enrolledCount >= session.maxCapacity) {
        throw new Error("名額已滿，無法報名");
      }

      const enrolledCount = Number(session.enrolledCount || 0) + 1;

      tx.update(sessionRef, {
        enrolledCount,
        isFull: enrolledCount >= Number(session.maxCapacity || 0),
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
        let enrolledCount = Number(session.enrolledCount || 0);

        if (releaseCapacity && enrolledCount > 0) enrolledCount -= 1;
        if (reclaimCapacity && enrolledCount < Number(session.maxCapacity || 0)) enrolledCount += 1;

        tx.update(sessionRef, {
          enrolledCount,
          isFull: enrolledCount >= Number(session.maxCapacity || 0),
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
