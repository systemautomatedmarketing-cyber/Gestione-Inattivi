// lib/firestore/settings.ts
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // <- tuo init Firebase

export type AppSettings = {
  activeSheetId: string;      // Spreadsheet ID
  activeSheetName: string;    // Tab name (es. 2026_Gennaio)
  availableSheets: string[];  // Tab names
  updatedAt?: any;
  updatedBy?: string;
};

export async function fetchAppSettings(): Promise<AppSettings | null> {
  const ref = doc(db, "settings", "all");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AppSettings) : null;
}

export async function updateActiveSheetName(activeSheetName: string, uid: string) {
  const ref = doc(db, "settings", "all");
  await updateDoc(ref, {
    activeSheetName,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}