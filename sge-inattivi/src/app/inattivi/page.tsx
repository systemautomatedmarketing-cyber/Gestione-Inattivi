"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useAuthorization } from "@/hooks/useAuthorization";

import { fetchAppSettings } from "@/lib/firestore/settings";
import { fetchMyAssignments, type AssignmentRow } from "@/lib/firestore/inactive-queries";
import { completeInactive, type BlockType, type YesNo } from "@/lib/firestore/inactive-work";

const BLOCK_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "tempo", label: "Tempo" },
  { value: "paura", label: "Paura di disturbare" },
  { value: "confusione", label: "Confusione" },
  { value: "scoraggiamento", label: "Scoraggiamento" },
];

const YESNO: { value: YesNo; label: string }[] = [
  { value: "si", label: "Sì" },
  { value: "no", label: "No" },
];

type FormState = {
  blockType: "" | BlockType;
  ready50pv: "" | YesNo;
  needsSupport: "" | YesNo;
};

export default function InattiviPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const authz = useAuthorization(user);

  const [busy, setBusy] = useState(false);
  const [monthId, setMonthId] = useState<string>("");

  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [forms, setForms] = useState<Record<string, FormState>>({}); // key: inactiveId

  // guard: editor + admin
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
        setForms({});
        return;
      }

      setMonthId(activeSheetName);

      const list = await fetchMyAssignments(activeSheetName, user.uid);

      // ordina: prima da completare, poi nominativo
      list.sort((a, b) => {
        const aDone = a.status === "completed";
        const bDone = b.status === "completed";
        if (aDone !== bDone) return aDone ? 1 : -1;
        return (a.nominativo ?? "").localeCompare(b.nominativo ?? "");
      });

      setRows(list);

      // inizializza form con valori esistenti (se già compilati)
      const seed: Record<string, FormState> = {};
      for (const r of list) {
        seed[r.id] = {
          blockType: (r.blockType as any) ?? "",
          ready50pv: (r.ready50pv as any) ?? "",
          needsSupport: (r.needsSupport as any) ?? "",
        };
      }
      setForms(seed);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    if (!authz.authorized) return;
    if (authz.role !== "admin" && authz.role !== "editor") return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authz.authorized, authz.role]);

  const missingCount = useMemo(() => {
    return rows.reduce((acc, r) => {
      const f = forms[r.id];
      const miss =
        !f?.blockType || !f?.ready50pv || !f?.needsSupport;
      return acc + (miss ? 1 : 0);
    }, 0);
  }, [rows, forms]);

  async function handleComplete(r: AssignmentRow) {
    if (!user || !monthId) return;

    const f = forms[r.id];
    if (!f?.blockType || !f?.ready50pv || !f?.needsSupport) {
      alert("Compila tutti i campi prima di salvare.");
      return;
    }

    setBusy(true);
    try {
      await completeInactive({
        inactiveId: r.id,
        monthId,
        rowIndex: r.rowIndex,
        nominativo: r.nominativo,
        pv: r.pv ?? null,
        ultimoContratto: r.ultimoContratto ?? null,
        attivazioneNetworker: r.attivazioneNetworker ?? null,

        assignedToUid: r.assignedToUid,
        assignedToName: r.assignedToName ?? null,
        assignedToRole: (r.assignedToRole as any) ?? null,

        blockType: f.blockType,
        ready50pv: f.ready50pv,
        needsSupport: f.needsSupport,

        userUid: user.uid,
      });

      // refresh (riordina e aggiorna badge)
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6">Caricamento...</div>;
  if (!user) return <div className="p-6">Devi fare login.</div>;

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestione inattivi</h1>
          <div className="text-sm opacity-70">
            Tab attivo: <b>{monthId || "—"}</b>
          </div>
        </div>

        <div className="text-sm">
          Mancano dettagli: <b>{missingCount}</b>
        </div>
        <button className="rounded-lg border px-4 py-2" onClick={() => router.back()}> 
          ← Indietro
        </button>

      </div>

      <div className="rounded-2xl border divide-y">
        {rows.map((r) => {
          const f = forms[r.id] ?? { blockType: "", ready50pv: "", needsSupport: "" };
          const isComplete = r.status === "completed";
          const hasMissing = !f.blockType || !f.ready50pv || !f.needsSupport;

          return (
            <div key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-lg">{r.nominativo}</div>
                  <div className="text-sm opacity-70">
                    PV: {r.pv ?? "—"} · Ultimo contratto: {r.ultimoContratto ?? "—"} · Attivazione:{" "}
                    {r.attivazioneNetworker ?? "—"}
                  </div>
                </div>

                <span className="text-xs rounded-full border px-2 py-1">
                  {isComplete ? "Completato" : "Da completare"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-sm font-medium mb-1">Tipologia di blocco</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2"
                    value={f.blockType}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [r.id]: { ...f, blockType: e.target.value as any },
                      }))
                    }
                    disabled={busy}
                  >
                    <option value="">Seleziona...</option>
                    {BLOCK_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Pronta a ripartire con 50 PV?</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2"
                    value={f.ready50pv}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [r.id]: { ...f, ready50pv: e.target.value as any },
                      }))
                    }
                    disabled={busy}
                  >
                    <option value="">Seleziona...</option>
                    {YESNO.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Necessiti di supporto?</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2"
                    value={f.needsSupport}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [r.id]: { ...f, needsSupport: e.target.value as any },
                      }))
                    }
                    disabled={busy}
                  >
                    <option value="">Seleziona...</option>
                    {YESNO.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                {hasMissing && (
                  <span className="text-xs rounded-full bg-amber-100 px-2 py-1">
                    Mancano dettagli
                  </span>
                )}

                <button
                  className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
                  onClick={() => handleComplete(r)}
                  disabled={busy || hasMissing}
                >
                  Conferma
                </button>
              </div>
            </div>
          );
        })}

        {!busy && rows.length === 0 && (
          <div className="p-6 text-sm opacity-70">Nessun inattivo assegnato a te.</div>
        )}
      </div>
    </div>
  );
}