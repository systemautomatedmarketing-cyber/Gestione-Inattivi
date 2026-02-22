import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, orderBy, } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Assignee = {
  id: string;
  name?: string;
  email?: string;
  role: "editor" | "admin";
  active: boolean;
};

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


export async function fetchAssignees(): Promise<Assignee[]> {
  const q1 = query(collection(db, "users"), where("role", "==", "editor"), where("active", "==", true));
  const q2 = query(collection(db, "users"), where("role", "==", "admin"), where("active", "==", true));

  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const list = [...s1.docs, ...s2.docs].map(d => ({ id: d.id, ...(d.data() as any) })) as Assignee[];

  // ordina
  return list.sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
}
