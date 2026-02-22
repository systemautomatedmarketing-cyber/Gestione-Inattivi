import { collection, serverTimestamp, Timestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WizardPayload } from "@/lib/wizardTypes";

export async function createWeeklyCheck(
  payload: WizardPayload & {
    createdByUid: string;
    createdByEmail: string;
    createdByName: string;
    weekStart: Date;
    weekEnd: Date;
    weekId: string; // es "2026-W06" oppure "2026-02-02"
  }
) {
  if (!payload.weekId) {
    throw new Error("weekId mancante (non posso scrivere weeklyDoneIndex)");
  }

  const batch = writeBatch(db);

  // 1) Documento check
  const checkRef = doc(collection(db, "weeklyChecks"));
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

  // 2) Indice globale (1 doc per persona)
  for (const it of payload.items) {
    const idxRef = doc(db, "weeklyDoneIndex", payload.weekId, "keys", it.key);

    // merge:true significa: se esiste aggiorna, se non esiste crea
    batch.set(
      idxRef,
      {
        createdAt: serverTimestamp(),
        byUid: payload.createdByUid,
      },
      { merge: true }
    );
  }

  await batch.commit();
  return checkRef.id;
}
