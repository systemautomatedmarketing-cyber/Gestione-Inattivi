"use client";

import { useMemo, useState } from "react";
import type { InactivePerson } from "@/lib/sheetsClient";

type Props = {
  items: InactivePerson[];
  selected: Record<string, boolean>;
  onToggle: (key: string) => void;
  onToggleAllVisible: (keys: string[], next: boolean) => void;
};

//function keyOfRow(r: InactivePerson) {
export function keyOfRow(r: InactivePerson) {
  // key stabile (nominativo + ultimo contratto + pv)
//  return `${r.nominativo}__${r.ultimoContratto ?? ""}__${r.pv ?? ""}__${r.attivazioneNetworker ?? ""}`;
  const nominativo = r?.nominativo ?? "";
  return `${nominativo}__${r?.ultimoContratto ?? ""}__${r?.pv ?? ""}__${r?.attivazioneNetworker ?? ""}`;
}

export default function InattiviTable({
  items,
  selected,
  onToggle,
  onToggleAllVisible,
}: Props) {
  const [q, setQ] = useState("");
  const [onlyPvZero, setOnlyPvZero] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((r) => {
      if (onlyPvZero && (r.pv ?? 0) !== 0) return false;
      if (!qq) return true;
      return r.nominativo.toLowerCase().includes(qq);
    });
  }, [items, q, onlyPvZero]);

  const visibleKeys = useMemo(() => filtered.map(keyOfRow), [filtered]);
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selected[k]);
  const anyVisibleSelected = visibleKeys.some((k) => selected[k]);

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Cerca nominativo</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 rounded-lg border px-3 py-2"
              placeholder="Es. Abbate..."
            />
          </div>

          <label className="mt-2 inline-flex items-center gap-2 text-sm sm:mt-6">
            <input
              type="checkbox"
              checked={onlyPvZero}
              onChange={(e) => setOnlyPvZero(e.target.checked)}
            />
            Solo PV = 0
          </label>
        </div>

        <button
          onClick={() => onToggleAllVisible(visibleKeys, !allVisibleSelected)}
          disabled={!filtered.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        >
          {allVisibleSelected ? "Deseleziona visibili" : "Seleziona visibili"}
          {anyVisibleSelected ? ` (${visibleKeys.filter((k) => selected[k]).length})` : ""}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 p-3 text-left"></th>
              <th className="p-3 text-left">Nominativo</th>
              <th className="p-3 text-left">PV</th>
              <th className="p-3 text-left">Ultimo contratto</th>
              <th className="p-3 text-left">Attivazione networker</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const k = keyOfRow(r);
              const isSel = !!selected[k];
              return (
                <tr key={k} className="border-t">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => onToggle(k)}
                    />
                  </td>
                  <td className="p-3">{r.nominativo}</td>
                  <td className="p-3">{r.pv ?? "-"}</td>
                  <td className="p-3">{r.ultimoContratto ?? "-"}</td>
                  <td className="p-3">{r.attivazioneNetworker ?? "-"}</td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td className="p-3" colSpan={5}>
                  Nessun risultato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Totale: {items.length} — Visibili: {filtered.length}
      </p>
    </div>
  );
}
