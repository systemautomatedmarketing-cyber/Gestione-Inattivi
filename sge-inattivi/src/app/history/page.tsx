"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useAuthorization } from "@/hooks/useAuthorization";

import { fetchAppSettings } from "@/lib/firestore/settings";
import { fetchAssignees, type Assignee } from "@/lib/firestore/users";
import { fetchHistory, type HistoryRow } from "@/lib/firestore/inactive-history";

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const authz = useAuthorization(user);

  const [busy, setBusy] = useState(false);
  const [monthId, setMonthId] = useState("");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [filterUid, setFilterUid] = useState<string>(""); // admin only
  const [items, setItems] = useState<HistoryRow[]>([]);

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
      const activeSheetName = settings?.activeSheetName ?? "";
      setMonthId(activeSheetName);

      if (authz.role === "admin") {
        const [ass, hist] = await Promise.all([
          fetchAssignees(),
          fetchHistory({ monthId: activeSheetName || undefined, assignedToUid: filterUid || undefined, take: 300 }),
        ]);
        setAssignees(ass);
        setItems(hist);
      } else {
        // editor: solo propri
        const hist = await fetchHistory({ monthId: activeSheetName || undefined, assignedToUid: user.uid, take: 300 });
        setItems(hist);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user || !authz.authorized) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authz.authorized, authz.role, filterUid]);

  function displayName(a: Assignee) {
    return `${a.name ?? a.email ?? a.id} (${a.role})`;
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Storico inattivi</h1>
          <div className="text-sm opacity-70">Tab: <b>{monthId || "—"}</b></div>
        </div>

        <button className="rounded-lg border px-3 py-2" onClick={loadAll} disabled={busy}>
          Ricarica
        </button>
        <button className="rounded-lg border px-4 py-2" onClick={() => router.back()}> 
          ← Indietro
        </button>

      </div>

      {authz.role === "admin" && (
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="text-sm font-medium">Filtro per assegnatario</div>
          <select
            className="rounded-lg border px-3 py-2 min-w-[320px]"
            value={filterUid}
            onChange={(e) => setFilterUid(e.target.value)}
            disabled={busy}
          >
            <option value="">Tutti</option>
            {assignees.map(a => (
              <option key={a.id} value={a.id}>{displayName(a)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-2xl border divide-y">
        {items.map((h) => (
          <div key={h.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{h.nominativo}</div>
                <div className="text-sm opacity-70">
                  PV: {h.pv ?? "—"} · Ultimo contratto: {h.ultimoContratto ?? "—"} · Attivazione: {h.attivazioneNetworker ?? "—"}
                </div>
                <div className="text-sm mt-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                    Blocco: {h.blockType}
                  </span>{" "}
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                    50PV: {h.ready50pv}
                  </span>{" "}
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                    Supporto: {h.needsSupport}
                  </span>
                </div>
              </div>

              <div className="text-xs opacity-70 text-right">
                <div>Assegnato a: {h.assignedToName ?? h.assignedToUid}</div>
                <div>Row: {h.rowIndex}</div>
              </div>
            </div>
          </div>
        ))}

        {!busy && items.length === 0 && (
          <div className="p-6 text-sm opacity-70">Nessun dato nello storico.</div>
        )}
      </div>
    </div>
  );
}