// src/lib/firestore/users.ts
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserRow = {
  id: string;       // uid (doc id)
  email?: string;
  name?: string;
  role?: string;
  active?: boolean;
};

export async function fetchEditors(): Promise<UserRow[]> {
  // Nota: per usare orderBy insieme a where potresti dover creare un index (Firebase te lo suggerisce)
  const q = query(
    collection(db, "users"),
    where("role", "==", "editor"),
    orderBy("name", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function setUserActive(uid: string, active: boolean, adminUid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    active,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  });
}

export async function fetchAssignees(): Promise<UserRow[]> {
  // 2 query (Firestore non ha IN su due valori senza complicazioni/index)
  const qEditors = query(
    collection(db, "users"),
    where("role", "==", "editor"),
    where("active", "==", true)
  );
  const qAdmins = query(
    collection(db, "users"),
    where("role", "==", "admin"),
    where("active", "==", true)
  );

  const [s1, s2] = await Promise.all([getDocs(qEditors), getDocs(qAdmins)]);

  const map = new Map<string, UserRow>();
  for (const d of [...s1.docs, ...s2.docs]) {
    const data = d.data() as any;
    map.set(d.id, {
      id: d.id,
      name: data.name,
      email: data.email,
      role: data.role,
      active: !!data.active,
    });
  }

  // ordinati per nome/email
  return Array.from(map.values()).sort((a, b) =>
    (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "")
  );
}