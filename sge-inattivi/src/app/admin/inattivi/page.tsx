import dynamic from "next/dynamic";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useAuthorization } from "@/hooks/useAuthorization";

import { fetchAppSettings } from "@/lib/firestore/settings";
import { fetchAssignees, type Assignee } from "@/lib/firestore/users";
import { getAssignmentsForMonth, upsertAssignment } from "@/lib/firestore/inactive-assignments";

type InactiveRow = {
  rowIndex: number;
  nominativo: string;
  pv?: number | 0;
  ultimoContratto?: string | null;
  attivazioneNetworker?: string | null;
};

const InattiviClient = dynamic(() => import("./InattiviClient"), {
  ssr: false,
});

export default function Page() {
  return <InattiviClient />;
}

export default function AdminInattiviPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const authz = useAuthorization(user);
  const isAdmin = authz.role === "admin";

  const [busy, setBusy] = useState(false);
  const [monthId, setMonthId] = useState<string>("");

  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [rows, setRows] = useState<InactiveRow[]>([]);
  const [assignments, setAssignments] = useState<Map<string, any>>(new Map());

  // selezione globale (solo UI)
  const [defaultAssigneeUid, setDefaultAssigneeUid] = useState<string>("");

  // selezione per riga (uid o "")
  const [selectedByRow, setSelectedByRow] = useState<Record<number, string>>({});
  
  const initialSelectedByRowRef = useRef<Record<number, string>>({});
  
const viewRows = useMemo(() => {
  return [...rows].sort((a, b) => {
    const aAssigned = !!(selectedByRow[a.rowIndex] ?? "");
    const bAssigned = !!(selectedByRow[b.rowIndex] ?? "");
    if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
    return (a.nominativo ?? "").localeCompare(b.nominativo ?? "");
  });
}, [rows, selectedByRow]);

const hasUnsavedChanges = useMemo(() => {
  const baseline = initialSelectedByRowRef.current || {};
  // confronta solo le righe attualmente a schermo
  for (const r of rows) {
    const cur = selectedByRow[r.rowIndex] ?? "";
    const base = baseline[r.rowIndex] ?? "";
    if (cur !== base) return true;
  }
  return false;
}, [rows, selectedByRow]);

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/login");
    if (authz.loading) return;
//    if (!authz.authorized || !isAdmin) return router.replace("/unauthorized");
//  }, [loading, user, authz.loading, authz.authorized, isAdmin, router]);
    if (!authz.authorized) {
      const t = setTimeout(() => router.replace("/unauthorized"), 400);
      return () => clearTimeout(t);
    }
  }, [loading, user?.uid, authz.loading, authz.authorized, authz.role, router]);

useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = ""; // trigger browser confirm
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [hasUnsavedChanges]);  

  async function loadAll() {

    if (!user) return;
    setBusy(true);
    try {

      const settings = await fetchAppSettings();
      const activeSheetName = settings?.activeSheetName;
      if (!activeSheetName) {
        setMonthId("");
        setRows([]);
        setAssignments(new Map());
        return;
      }

      setMonthId(activeSheetName);

      const [ass, map] = await Promise.all([
        fetchAssignees(),
        getAssignmentsForMonth(activeSheetName),
      ]);
      setAssignees(ass);
      setAssignments(map);

      // carica da route server (niente CORS)
      const resp = await fetch(`/api/inattivi?sheet=${encodeURIComponent(activeSheetName)}`, {
        cache: "no-store",
      });

if (!resp.ok) {
  const t = await resp.text();
  console.error("API /api/inattivi error:", resp.status, t);
  setRows([]); // o mostra messaggio UI
  return;
}
      const data = await resp.json();
//      const items: any[] = data.items ?? [];
      const items = data.items ?? [];

console.log("activeSheetName", activeSheetName);
console.log("first item", items?.[0]);

      // Normalizziamo i nomi che ci interessano (se il worker è coerente, è già ok)
      const normalized: InactiveRow[] = items.map((it: any) => ({
        rowIndex: it.rowIndex,
        nominativo: it.nominativo,
        pv: it.pv ?? 0,
        ultimoContratto: it.ultimoContratto ?? null,
        attivazioneNetworker: it.attivazioneNetworker ?? null,
      }));

      setRows(normalized);

      // Precompila selectByRow dalla mappa assegnazioni
      const seed: Record<number, string> = {};
      normalized.forEach(r => {
        const id = `${activeSheetName}__${r.rowIndex}`;
        const a = map.get(id);

        if (a?.assignedToUid) seed[r.rowIndex] = a.assignedToUid;
        else seed[r.rowIndex] = "";
      });
      setSelectedByRow(seed);
      initialSelectedByRowRef.current = seed;

    } finally {
      setBusy(false);
    }
  }

async function saveAll() {
  if (!user || !monthId) return;

  const baseline = initialSelectedByRowRef.current || {};
  const changedRows = rows.filter(r => (selectedByRow[r.rowIndex] ?? "") !== (baseline[r.rowIndex] ?? ""));

  if (changedRows.length === 0) {
    alert("Nessuna modifica da salvare.");
    return;
  }

  setBusy(true);
  try {
    for (const r of changedRows) {
      const uid = selectedByRow[r.rowIndex] ?? "";
      const inactiveId = `${monthId}__${r.rowIndex}`;
      const assignee = assignees.find(x => x.id === uid);

      await upsertAssignment({
        inactiveId,
        monthId,
        rowIndex: r.rowIndex,
        nominativo: r.nominativo,
        assignedToUid: uid ? uid : null,
        assignedToName: uid ? (assignee?.name ?? assignee?.email ?? assignee?.id ?? uid) : null,
        adminUid: user.uid,
        pv: r.pv ?? 0,
        ultimoContratto: r.ultimoContratto ?? "",
        attivazioneNetworker: r.attivazioneNetworker ?? "",
      });
    }

    // dopo salvataggio: aggiorna baseline = stato corrente
    const newBaseline: Record<number, string> = { ...baseline };
    for (const r of changedRows) {
      newBaseline[r.rowIndex] = selectedByRow[r.rowIndex] ?? "";
    }
    initialSelectedByRowRef.current = newBaseline;

    alert(`Salvate ${changedRows.length} modifiche ✅`);
  } finally {
    setBusy(false);
  }
}
  
  useEffect(() => {
    if (!user || !isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  function displayName(a: Assignee) {
    return `${a.name ?? a.email ?? a.id} (${a.role})`;
  }

  async function saveRow(r: InactiveRow) {
    if (!user || !monthId) return;

    const uid = selectedByRow[r.rowIndex] || "";
    const inactiveId = `${monthId}__${r.rowIndex}`;

    const assignee = assignees.find(x => x.id === uid);

    await upsertAssignment({
      inactiveId,
      monthId,
      rowIndex: r.rowIndex,
      nominativo: r.nominativo,
      assignedToUid: uid ? uid : null,
      assignedToName: uid ? (assignee?.name ?? assignee?.email ?? assignee?.id ?? uid) : null,
      adminUid: user.uid,
      pv: r.pv ?? 0,
      ultimoContratto: r.ultimoContratto ?? "",
      attivazioneNetworker: r.attivazioneNetworker ?? "",
    });

    // aggiorna mappa locale
    setAssignments(prev => {
      const next = new Map(prev);
      next.set(inactiveId, {
        assignedToUid: uid ? uid : null,
        assignedToName: uid ? (assignee?.name ?? assignee?.email ?? assignee?.id ?? uid) : null,
      });
      return next;
    });
  }

  async function applyDefaultToAllUnassigned() {
    if (!user || !monthId) return;
    if (!defaultAssigneeUid) return alert("Seleziona un editor predefinito.");

    const assignee = assignees.find(x => x.id === defaultAssigneeUid);
    if (!assignee) return alert("Assegnatario non valido.");

    // assegna solo a chi è "nessun editor"
    const targets = rows.filter(r => !selectedByRow[r.rowIndex]);

    for (const r of targets) {
      setSelectedByRow(prev => ({ ...prev, [r.rowIndex]: defaultAssigneeUid }));
      await upsertAssignment({
        inactiveId: `${monthId}__${r.rowIndex}`,
        monthId,
        rowIndex: r.rowIndex,
        nominativo: r.nominativo,
        assignedToUid: defaultAssigneeUid,
        assignedToName: assignee.name ?? assignee.email ?? assignee.id,
        adminUid: user.uid,
        pv: r.pv ?? 0,
        ultimoContratto: r.ultimoContratto ?? "",
        attivazioneNetworker: r.attivazioneNetworker ?? "",
      });
    }
    
    // reload assignments (opzionale)
    const map = await getAssignmentsForMonth(monthId);
    setAssignments(map);
  }



  if (loading) return <div className="p-6">Caricamento...</div>;
  if (!user) return <div className="p-6">Devi fare login.</div>;
  if (!isAdmin) return <div className="p-6">Accesso negato (solo admin).</div>;

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Elenco generale inattivi</h1>
          <div className="text-sm opacity-70">Tab attivo: <b>{monthId || "—"}</b></div>
        </div>

        <button className="rounded-lg border px-3 py-2" onClick={loadAll} disabled={busy}>
          Ricarica
        </button>

        <button
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
          onClick={saveAll}
          disabled={busy || !hasUnsavedChanges}
        >
          Salva tutto
        </button>

        <button
          className="rounded-lg border px-4 py-2"
          onClick={() => {
            if (hasUnsavedChanges) {
              const ok = confirm("Hai modifiche non salvate. Vuoi uscire comunque?");
              if (!ok) return;
            }
            router.back();
          }}
        >
          ← Indietro
        </button>

      </div>

      {/* Default editor */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="font-medium">Editor predefinito</div>
        <div className="flex gap-3 flex-wrap items-center">
          <select
            className="rounded-lg border px-3 py-2 min-w-[320px]"
            value={defaultAssigneeUid}
            onChange={(e) => setDefaultAssigneeUid(e.target.value)}
          >
            <option value="">Nessun editor</option>
            {assignees.map(a => (
              <option key={a.id} value={a.id}>{displayName(a)}</option>
            ))}
          </select>

          <button
            className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
            onClick={applyDefaultToAllUnassigned}
            disabled={busy || !defaultAssigneeUid}
          >
            Assegna a tutti (solo non assegnati)
          </button>
        </div>
        <div className="text-xs opacity-70">
          Questo applica l’editor scelto solo alle righe che hanno ancora “Nessun editor”.
        </div>
      </div>

{/* Lista */}
<div className="rounded-2xl border divide-y">
  {viewRows.map((r) => {
    const assigned = !!(selectedByRow[r.rowIndex] ?? "");

    return (
      <div key={r.rowIndex} className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{r.nominativo}</div>
            <div className="text-sm opacity-70">
              PV: {r.pv ?? "—"} · Ultimo contatto: {r.ultimoContratto ?? "—"} · Attivazione:{" "}
              {r.attivazioneNetworker ?? "—"} · Row: {r.rowIndex}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="rounded-lg border px-3 py-2 min-w-[320px]"
              value={selectedByRow[r.rowIndex] ?? ""}
              onChange={(e) =>
                setSelectedByRow((prev) => ({ ...prev, [r.rowIndex]: e.target.value }))
              }
            >
              <option value="">Nessun editor</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {displayName(a)}
                </option>
              ))}
            </select>

          <div className="flex items-center gap-2 flex-wrap min-w-[200px]">

            {assigned && (
              <span className="text-xs rounded-full bg-green-100 px-2 py-1">
                Assegnato
              </span>
            )}

            {!assigned && (
              <span className="text-xs rounded-full bg-red-100 px-2 py-1">
                Non Assegnato
              </span>
            )}

	</div>
          </div>
        </div>
      </div>
    );
  })}

  {!busy && viewRows.length === 0 && (
    <div className="p-6 text-sm opacity-70">Nessun dato da mostrare.</div>
  )}
</div>

    </div>
  );
}
