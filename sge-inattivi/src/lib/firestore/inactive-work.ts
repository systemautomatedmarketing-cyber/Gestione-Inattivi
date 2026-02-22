import { db } from "@/lib/firebase";
import {
  doc,
  serverTimestamp,
  updateDoc,
  setDoc,
  collection,
} from "firebase/firestore";

export type BlockType = "tempo" | "paura" | "confusione" | "scoraggiamento";
export type YesNo = "si" | "no";

export async function completeInactive(params: {
  inactiveId: string;          // es: 2026_Gennaio__12
  monthId: string;
  rowIndex: number;
  nominativo: string;

  pv?: number | null;
  ultimoContratto?: string | null;
  attivazioneNetworker?: string | null;

  assignedToUid: string;
  assignedToName?: string | null;
  assignedToRole?: "admin" | "editor" | string;

  blockType: BlockType;
  ready50pv: YesNo;
  needsSupport: YesNo;

  userUid: string;
}) {
  const {
    inactiveId,
    monthId,
    rowIndex,
    nominativo,
    pv = null,
    ultimoContratto = null,
    attivazioneNetworker = null,
    assignedToUid,
    assignedToName = null,
    assignedToRole = null,
    blockType,
    ready50pv,
    needsSupport,
    userUid,
  } = params;

  // 1) aggiorna stato corrente
  await updateDoc(doc(db, "inactive_assignments", inactiveId), {
    blockType,
    ready50pv,
    needsSupport,
    status: "completed",
    completedAt: serverTimestamp(),
    completedByUid: userUid,
    updatedAt: serverTimestamp(),
    updatedBy: userUid,
  });

  // 2) storico (append-only)
  const historyId = `${inactiveId}__${Date.now()}`;
  await setDoc(doc(collection(db, "inactive_history"), historyId), {
    inactiveId,
    monthId,
    rowIndex,
    nominativo,
    pv,
    ultimoContratto,
    attivazioneNetworker,

    assignedToUid,
    assignedToName,
    assignedToRole,

    blockType,
    ready50pv,
    needsSupport,

    createdAt: serverTimestamp(),
    createdByUid: userUid,
  });
}