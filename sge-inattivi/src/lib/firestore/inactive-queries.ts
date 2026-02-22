import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

export type AssignmentRow = {
  id: string; // inactiveId
  monthId: string;
  rowIndex: number;
  nominativo: string;
  pv?: number | null;
  ultimoContratto?: string | null;
  attivazioneNetworker?: string | null;

  assignedToUid: string;
  assignedToName?: string | null;
  assignedToRole?: string | null;

  status?: "assigned" | "completed";
  blockType?: string | null;
  ready50pv?: string | null;
  needsSupport?: string | null;
};

export async function fetchMyAssignments(monthId: string, uid: string) {
  const q = query(
    collection(db, "inactive_assignments"),
    where("monthId", "==", monthId),
    where("assignedToUid", "==", uid)
    // opzionale: orderBy("rowIndex", "asc") (se ti serve e hai index)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AssignmentRow[];
}