import { addDoc, collection, serverTimestamp, Timestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WizardPayload } from "@/lib/wizardTypes";

export async function createWeeklyCheck(payload: WizardPayload & {
  createdByUid: string;
  createdByEmail: string;
  createdByName: string;
  weekStart: Date;
  weekEnd: Date;
  weekId: string; // es "2026-02-02"
}) {
  const docRef = await addDoc(collection(db, "weeklyChecks"), {
    weekLabel: payload.meta.weekLabel,
    weekStart: Timestamp.fromDate(payload.weekStart),
    weekEnd: Timestamp.fromDate(payload.weekEnd),

    createdAt: serverTimestamp(),
    createdByUid: payload.createdByUid,
    createdByEmail: payload.createdByEmail,
    createdByName: payload.createdByName,

    items: payload.items,
  });

console.log("pre-batch");

  const batch = writeBatch(db);

console.log("post-batch");

  const checkRef = doc(collection(db, "weeklyChecks"));
console.log("checkRef = ", checkRef);

  batch.set(checkRef, {
    weekLabel: payload.meta.weekLabel ?? payload.weekId,

    weekStart: Timestamp.fromDate(payload.weekStart),
    weekEnd: Timestamp.fromDate(payload.weekEnd),

    createdAt: serverTimestamp(),
    createdByUid: payload.createdByUid,
    createdByEmail: payload.createdByEmail,
    createdByName: payload.createdByName,

    items: payload.items,
  });

// indice globale
  for (const it of payload.items) {
    const idxRef = doc(db, "weeklyDoneIndex", payload.weekId, "keys", it.key);
console.log("idxRef =", idxRef);
console.log("payload.createdByUid = ", payload.createdByUid);

    batch.set(idxRef, {
      createdAt: serverTimestamp(),
      byUid: payload.createdByUid,
    }, { merge: true });
  }

  await batch.commit();

//  return docRef.id;
  return checkRef.id;
}
