import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  DEFAULT_COURSES,
  DEFAULT_GROUP_SESSIONS,
  DEFAULT_ONE_ON_ONE_SLOTS,
} from "../src/data/courses";
import fs from "node:fs";

type SeedDocument = { id: string; [key: string]: unknown };

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  throw new Error("Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID before running seed.");
}

const resolvedCredential = (() => {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return cert(JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")));
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }

  return applicationDefault();
})();

const app =
  getApps().length === 0
    ? initializeApp({
        projectId,
        credential: resolvedCredential,
      })
    : getApps()[0];

const firestore = getFirestore(app);

const hasSeedData = async (collectionName: string) => {
  const snapshot = await firestore.collection(collectionName).limit(1).get();
  return !snapshot.empty;
};

const seedCollection = async (collectionName: string, documents: SeedDocument[]) => {
  const batch = firestore.batch();
  for (const item of documents) {
    const ref = firestore.collection(collectionName).doc(item.id);
    batch.set(ref, {
      ...item,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();
  console.log(`seeded ${collectionName}: ${documents.length}`);
};

const seed = async () => {
  const [coursesSeeded, sessionsSeeded, slotsSeeded] = await Promise.all([
    hasSeedData("courses"),
    hasSeedData("sessions"),
    hasSeedData("oneOnOneSlots"),
  ]);

  if (!coursesSeeded) {
    await seedCollection("courses", DEFAULT_COURSES as unknown as SeedDocument[]);
  }

  if (!sessionsSeeded) {
    await seedCollection("sessions", DEFAULT_GROUP_SESSIONS as unknown as SeedDocument[]);
  }

  if (!slotsSeeded) {
    await seedCollection("oneOnOneSlots", DEFAULT_ONE_ON_ONE_SLOTS as unknown as SeedDocument[]);
  }

  if (!(await hasSeedData("settings"))) {
    await firestore.collection("settings").doc("global").set({
      maxCapacityPerSession: 18,
      sessionsPerBatch: 4,
      paymentEnabled: false,
      allowWaitlist: true,
      updatedAt: Timestamp.now(),
    });
    console.log("seeded settings/global");
  }

  console.log("seed done");
};

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
