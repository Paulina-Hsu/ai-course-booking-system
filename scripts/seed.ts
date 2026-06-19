import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { BOOKING_STATUS_OPTIONS, Course, OneOnOneSlot, Session, Booking } from "../src/lib/firestoreTypes";
import { BOOKINGS, COURSES, ONE_ON_ONE_SLOTS, SESSIONS } from "../src/data/courses";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";

if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("請先設定 FIREBASE_SERVICE_ACCOUNT_JSON 或 GOOGLE_APPLICATION_CREDENTIALS");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error("請先設定 NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  process.exit(1);
}

if (getApps().length === 0) {
  if (serviceAccount) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

const db = getFirestore();

const writeCourses = async (courses: Course[]) => {
  const batch = db.batch();
  for (const course of courses) {
    const ref = db.collection("courses").doc(course.id);
    batch.set(ref, { ...course, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  }
  await batch.commit();
};

const writeSessions = async (sessions: Session[]) => {
  const batch = db.batch();
  for (const session of sessions) {
    const ref = db.collection("sessions").doc(session.id);
    batch.set(ref, { ...session, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  }
  await batch.commit();
};

const writeOneOnOneSlots = async (slots: OneOnOneSlot[]) => {
  const batch = db.batch();
  for (const slot of slots) {
    const ref = db.collection("oneOnOneSlots").doc(slot.id);
    batch.set(ref, { ...slot, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  }
  await batch.commit();
};

const writeBookings = async (bookings: Booking[]) => {
  const batch = db.batch();
  for (const booking of bookings) {
    const ref = db.collection("bookings").doc(booking.id);
    batch.set(ref, { ...booking, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  }
  await batch.commit();
};

const writeSettings = async () => {
  const ref = db.doc("settings/global");
  await ref.set({
    maxCapacityPerGroupSession: 18,
    groupLessonCount: 4,
    paymentEnabled: false,
    allowWaitlist: true,
    maintenance: false,
    bookingStatusOptions: BOOKING_STATUS_OPTIONS,
    updatedAt: Timestamp.now(),
  });
};

const run = async () => {
  console.log("開始寫入 seed 資料...");
  await writeCourses(COURSES);
  await writeSessions(SESSIONS);
  await writeOneOnOneSlots(ONE_ON_ONE_SLOTS);
  await writeBookings(BOOKINGS);
  await writeSettings();
  console.log("seed 完成。");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
