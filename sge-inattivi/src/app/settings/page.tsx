// app/settings/page.tsx
"use client";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAppSettings, updateActiveSheetName } from "@/lib/firestore/settings";
import { auth } from "@/lib/firebase";
import { useAuthorization } from "@/hooks/useAuthorization";
import { fetchEditors, setUserActive, type UserRow } from "@/lib/firestore/users";

type SheetOpt = { id: string; name: string };

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth(); 
  const authz = useAuthorization(user);

  // profile dovrebbe includere role; se non ce l’hai, lo leggiamo da Firestore
  const [busy, setBusy] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>("");

  const isAdmin = authz.role === "admin";

  // protezione
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (authz.loading) return;
    if (!authz.authorized) {
      const t = setTimeout(() => router.replace("/unauthorized"), 400);
      return () => clearTimeout(t);
    }
  }, [loading, user?.uid, authz.loading, authz.authorized, authz.role, router]);


  // Load settings + editors
  useEffect(() => {
    if (!user || !isAdmin) return;

    (async () => {
      setBusy(true);
      try {
        const s = await fetchAppSettings();
        if (s?.availableSheets) setAvailableSheets(s.availableSheets);
        if (s?.activeSheetName) setActiveSheetName(s.activeSheetName);
      } finally {
        setBusy(false);
      }
    })();
  }, [user, isAdmin]);

  const [editors, setEditors] = useState<UserRow[]>([]);
  const [editorsBusy, setEditorsBusy] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) return;

  (async () => {
    setEditorsBusy(true);
    try {
      const eds = await fetchEditors();
      setEditors(eds);
    } finally {
      setEditorsBusy(false);
    }
   })();
  }, [user, isAdmin]);


  async function saveActiveSheetName(sheetName: string) {
    if (!user) return;
    setActiveSheetName(sheetName);
    await updateActiveSheetName(sheetName, user.uid);
  }


  async function toggleEditor(uid: string, nextActive: boolean) {
    if (!user) return;

  // ottimistico
    setEditors((prev) =>
      prev.map((e) => (e.id === uid ? { ...e, active: nextActive } : e))
    );
 
    try {
      await setUserActive(uid, nextActive, user.uid);
    } catch (err) {
      // rollback se errore
      setEditors((prev) =>
        prev.map((e) => (e.id === uid ? { ...e, active: !nextActive } : e))
      );
      throw err;
    }
  }

  if (loading) return <div className="p-6">Caricamento...</div>;
  if (!user) return <div className="p-6">Devi fare login.</div>;
  if (!isAdmin) return <div className="p-6">Accesso negato (solo admin).</div>;

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-semibold">Settings (Admin)</h1>

      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="text-lg font-medium">Foglio inattivi del mese</h2>

            <select
              className="mt-1 w-full sm:w-96 rounded-lg border px-3 py-2"
              value={activeSheetName}
              disabled={busy || availableSheets.length === 0}
              onChange={(e) => saveActiveSheetName(e.target.value)} >
              <option value="">Seleziona foglio...</option>
              {availableSheets.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {availableSheets.length === 0 && (
              <div className="text-sm text-red-600">
                Nessun foglio disponibile in Firestore (settings/all → availableSheets).
              </div>
            )}
      </section>

  <section className="space-y-3 rounded-2xl border p-4">
    <h2 className="text-lg font-medium">Utenti editor</h2>
 
    {editorsBusy && <div className="text-sm opacity-70">Caricamento editor…</div>}

    <div className="space-y-2">
      {editors.map((ed) => (
        <div key={ed.id} className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <div className="font-medium">{ed.name ?? "Senza nome"}</div>
            <div className="text-sm opacity-70">{ed.email ?? ed.id}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm opacity-70">{ed.active ? "Attivo" : "Disattivo"}</div>
  
            <input type="checkbox" checked={!!ed.active} onChange={(e) => toggleEditor(ed.id, e.target.checked)} />

          </div>
        </div>
      ))}

      {!editorsBusy && editors.length === 0 && (
        <div className="text-sm opacity-70">Nessun editor trovato.</div>
      )}
    </div>
</section>

        <button className="rounded-lg border px-4 py-2" onClick={() => router.back()}> 
          ← Indietro
        </button>
    </div>

  );
}
