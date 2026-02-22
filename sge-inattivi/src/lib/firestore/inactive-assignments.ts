import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Assignment = {
  monthId: string;
  rowIndex: number;
  nominativo: string;
  assignedToUid: string | null;
  assignedToName: string | null;
};

export async function getAssignmentsForMonth(monthId: string) {
  const q = query(collection(db, "inactive_assignments"), where("monthId", "==", monthId));
  const snap = await getDocs(q);
  const map = new Map<string, any>();
  snap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
  return map; // key: inactiveId
}

export async function upsertAssignment(params: {
  inactiveId: string;
  monthId: string;
  rowIndex: number;
  nominativo: string;
  assignedToUid: string | null;
  assignedToName: string | null;
  adminUid: string;
  pv: number;
  ultimoContratto: string;
  attivazioneNetworker: string;
}) {
  const ref = doc(db, "inactive_assignments", params.inactiveId);
  await setDoc(ref, {
    monthId: params.monthId,
    rowIndex: params.rowIndex,
    nominativo: params.nominativo,
    assignedToUid: params.assignedToUid,
    assignedToName: params.assignedToName,
    updatedAt: serverTimestamp(),
    updatedBy: params.adminUid,
    pv: params.pv,
    ultimoContratto: params.ultimoContratto,
    attivazioneNetworker: params.ultimoContratto,
    ...(params.assignedToUid ? { assignedAt: serverTimestamp() } : {}),
  }, { merge: true });
}
