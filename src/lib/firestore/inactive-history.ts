import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

export type HistoryRow = {
  id: string;
  inactiveId: string;
  monthId: string;
  rowIndex: number;
  nominativo: string;
  pv?: number | null;
  ultimoContratto?: string | null;
  attivazioneNetworker?: string | null;

  assignedToUid: string;
  assignedToName?: string | null;
  assignedToRole?: string | null;

  blockType: string;
  ready50pv: string;
  needsSupport: string;

  createdAt?: any;
  createdByUid: string;
};

export async function fetchHistory(params: {
  monthId?: string;
  assignedToUid?: string; // per filtrare per editor
  take?: number;
}) {
  const take = params.take ?? 200;

  const clauses: any[] = [];
  clauses.push(orderBy("createdAt", "desc"));
  clauses.push(limit(take));

  // Firestore: where devono stare prima degli orderBy in query() -> li mettiamo dinamici
  const wheres: any[] = [];
  if (params.monthId) wheres.push(where("monthId", "==", params.monthId));
  if (params.assignedToUid) wheres.push(where("assignedToUid", "==", params.assignedToUid));

  const q = query(collection(db, "inactive_history"), ...wheres, ...clauses);
  const snap = await getDocs(q);

  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as HistoryRow[];
}