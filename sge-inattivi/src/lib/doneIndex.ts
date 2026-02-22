import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function fetchDoneIndexKeys(weekId: string): Promise<Set<string>> {
  if (!weekId || typeof weekId !== "string") {
    console.warn("fetchDoneIndexKeys: weekId missing/invalid:", weekId);
    return new Set();
  }

  const snap = await getDocs(collection(db, "weeklyDoneIndex", weekId, "keys"));
  const out = new Set<string>();
  snap.forEach((d) => out.add(d.id));
  return out;
}
