import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Ritorna l'insieme delle row.key già presenti nei weeklyChecks di quella settimana.
 * Usa weekStart come identificatore univoco della settimana.
 */
export async function fetchAlreadyDoneKeys(weekStart: Date): Promise<Set<string>> {
  const weekStartTs = Timestamp.fromDate(weekStart);

  const qRef = query(
    collection(db, "weeklyChecks"),
    where("weekStart", "==", weekStartTs)
  );

  const snap = await getDocs(qRef);

  const keys = new Set<string>();
  snap.forEach((doc) => {
    const data: any = doc.data();
    const items = Array.isArray(data.items) ? data.items : [];
    for (const it of items) {
      if (it?.key) keys.add(String(it.key));
    }
  });

  return keys;
}
