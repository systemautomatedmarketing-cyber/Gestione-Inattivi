"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useAuthorization } from "@/hooks/useAuthorization";

import { fetchAppSettings } from "@/lib/firestore/settings";
import { fetchAssignees, type UserRow } from "@/lib/firestore/users";
import {
  assignInactive,
  fetchAssignedIdsForMonth,
  type InactiveItemFromWorker,
} from "@/lib/firestore/inattivi";

const WORKER_BASE = "https://sheets-proxy.systemautomatedmarketing.workers.dev";

export default function InattiviAdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const authz = useAuthorization(user);

  const isAdmin = authz.role === "admin";

  const [monthId, setMonthId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [assignees, setAssignees] = useState<UserRow[]>([]);
  const [rows, setRows] = useState<InactiveItemFromWorker[]>([]);
  const [assignedSet, setAssignedSet] = useState<Set<string>>(new Set());

  // selected assignee per rowIndex
  const [selectedByRow, setSelectedByRow] = useState<Record<number, string>>({});

  // protezione
  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/login");
    if (authz.loading) return;
    if (!authz.authorized) {
      const t = setTimeout(() => router.replace("/unauthorized"), 400);
      return () => clearTimeout(t);
    }
  }, [loading, user?.uid, authz.loading, authz.authorized, authz.role, router]);

  async function loadAll() {
    if (!user) return;
    setBusy(true);
    try {
      const settings = await fetchAppSettings();
      const activeSheetName = settings?.activeSheetName;
      if (!activeSheetName) {
        setMonthId("");
        setRows([]);
        setAssignedSet(new Set());
        return;
      }

      setMonthId(activeSheetName);

      const [ass, already] = await Promise.all([
        fetchAssignees(),
        fetchAssignedIdsForMonth(activeSheetName),
      ]);
      setAssignees(ass);
      setAssignedSet(already);

      // worker: prende items
      const resp = await fetch(
        `${WORKER_BASE}/api/inattivi?sheet=${encodeURIComponent(activeSheetName)}`
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Worker error ${resp.status}: ${text}`);
      }

      const data = await resp.json();
console.log("WORKER RAW", data);
console.log("FIRST ITEM", (data.items?.[0] ?? data?.[0] ?? null));

      const items: InactiveItemFromWorker[] = data.items ?? data ?? []; // compatibilità
      setRows(items);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const unassigned = useMemo(() => {
    if (!monthId) return [];
    return rows.filter((r) => !assignedSet.has(`${monthId}__${r.rowIndex}`));
  }, [rows, assignedSet, monthId]);

  async function handleAssign(item: InactiveItemFromWorker) {
    if (!user || !monthId) return;

    const uid = selectedByRow[item.rowIndex];
    if (!uid) {
      alert("Seleziona un assegnatario prima di assegnare.");
      return;
    }

    const assignee = assignees.find((a) => a.id === uid);
    if (!assignee) {
      alert("Assegnatario non valido.");
      return;
    }

    // update ottimistico: aggiungo a set così scompare
    const docId = `${monthId}__${item.rowIndex}`;
    setAssignedSet((prev) => new Set(prev).add(docId));

    try {
      await assignInactive({
        monthId,
        item,
        assignee: assignee as any,
        adminUid: user.uid,
      });
    } catch (e) {
      // rollback
      setAssignedSet((prev) => {
        const copy = new Set(prev);
        copy.delete(docId);
        return copy;
      });
      throw e;
    }
  }

  if (loading) return <div className="p-6">Caricamento...</div>;
  if (!user) return <div className="p-6">Devi fare login.</div>;
  if (!isAdmin) return <div className="p-6">Accesso negato (solo admin).</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Assegna inattivi</h1>
          <div className="text-sm opacity-70">
            Tab attivo: <b>{monthId || "—"}</b>
          </div>
        </div>

        <button
          className="rounded-lg border px-3 py-2"
          onClick={loadAll}
          disabled={busy}
        >
          Ricarica
        </button>
      </div>

      {!monthId && (
        <div className="rounded-xl border p-4">
          Nessun tab attivo impostato in Settings.
        </div>
      )}

      <div className="rounded-2xl border">
        <div className="p-3 text-sm opacity-70">
          Da assegnare: <b>{unassigned.length}</b> / Totale: <b>{rows.length}</b>
        </div>

        <div className="divide-y">
          {unassigned.map((it) => (
            <div key={it.rowIndex} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-lg">{it.nominativo}</div>
                  <div className="text-sm opacity-70">
                    PV: {it.pv ?? "—"} · Ultimo contatto: {it.ultimoContratto ?? "—"} · Attivazione:{" "}
                    {it.attivazioneNetworker ?? "—"} · Row: {it.rowIndex}
                  </div>
                </div>
                <span className="text-xs rounded-full border px-2 py-1">
                  Da assegnare
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="rounded-lg border px-3 py-2 min-w-[260px]"
                  value={selectedByRow[it.rowIndex] ?? ""}
                  onChange={(e) =>
                    setSelectedByRow((prev) => ({
                      ...prev,
                      [it.rowIndex]: e.target.value,
                    }))
                  }
                >
                  <option value="">Seleziona assegnatario...</option>
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? a.email ?? a.id} ({a.role})
                    </option>
                  ))}
                </select>

                <button
                  className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
                  onClick={() => handleAssign(it)}
                  disabled={busy}
                >
                  Assegna
                </button>
              </div>
            </div>
          ))}

          {!busy && monthId && unassigned.length === 0 && (
            <div className="p-6 text-sm opacity-70">
              Nessun inattivo da assegnare per questo tab.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
