import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Assignee = {
  id: string;           // uid
  name?: string;
  email?: string;
  role: "admin" | "editor";
  active: boolean;
};

export type InactiveItemFromWorker = {
  rowIndex: number;
  nominativo: string;
  pv: number | null;
  ultimoContratto: string | null;
  attivazioneNetworker: string | null;
};

export async function fetchAssignedIdsForMonth(monthId: string) {
  // leggiamo doc già assegnati/completati per quel mese
  const q = query(collection(db, "inattivi"), where("monthId", "==", monthId));
  const snap = await getDocs(q);
  const set = new Set<string>();
  snap.docs.forEach((d) => set.add(d.id)); // id = month__rowIndex
  return set;
}

export async function assignInactive(params: {
  monthId: string;
  item: InactiveItemFromWorker;
  assignee: Assignee;
  adminUid: string;
}) {
  const { monthId, item, assignee, adminUid } = params;
  const docId = `${monthId}__${item.rowIndex}`;

  await setDoc(
    doc(db, "inattivi", docId),
    {
      monthId,
      rowIndex: item.rowIndex,
      nominativo: item.nominativo,
      pv: item.pv ?? null,
      ultimoContratto: item.ultimoContratto ?? null,
      attivazioneNetworker: item.attivazioneNetworker ?? null,

      assignedToUid: assignee.id,
      assignedToName: assignee.name ?? assignee.email ?? assignee.id,
      assignedToRole: assignee.role,
      assignedAt: serverTimestamp(),

      status: "assigned",

      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true }
  );

  return docId;
}
