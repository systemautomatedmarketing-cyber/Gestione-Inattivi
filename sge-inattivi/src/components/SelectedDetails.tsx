"use client";

import { useMemo } from "react";
import type { SelectedItem, ItemDetails, BlockType } from "@/lib/wizardTypes";

type Props = {
  selectedItems: SelectedItem[];
  details: Record<string, ItemDetails>;
  onChange: (key: string, patch: Partial<ItemDetails>) => void;
};

const blockOptions: Array<{ value: BlockType; label: string }> = [
  { value: "tempo", label: "Tempo" },
  { value: "paura_disturbare", label: "Paura di disturbare" },
  { value: "confusione", label: "Confusione" },
  { value: "scoraggiamento", label: "Scoraggiamento" },
];

export default function SelectedDetails({ selectedItems, details, onChange }: Props) {
  const missingCount = useMemo(() => {
    return selectedItems.filter((it) => {
      const d = details[it.key];
      return !d || !d.blockType || !d.restart50pv || !d.needsSupport;
    }).length;
  }, [selectedItems, details]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Step 3 — Dettagli selezionati</h3>
        <p className="text-sm text-gray-600">
          Mancano dettagli per: <b>{missingCount}</b>
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {selectedItems.map((it) => {
          const d = details[it.key] ?? { blockType: "", restart50pv: "", needsSupport: "" };

          return (
            <details key={it.key} className="rounded-xl border p-4">
              <summary className="cursor-pointer select-none">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-semibold">{it.nominativo}</div>
                    <div className="text-xs text-gray-600">
                      PV: {it.pv ?? "-"} · Ultimo contratto: {it.ultimoContratto ?? "-"} · Attivazione:{" "}
                      {it.attivazioneNetworker ?? "-"}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    {d.blockType && d.restart50pv && d.needsSupport ? (
                      <span className="rounded-full border px-2 py-1">Completo</span>
                    ) : (
                      <span className="rounded-full border px-2 py-1">Da completare</span>
                    )}
                  </div>
                </div>
              </summary>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Tipologia di blocco</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={d.blockType}
                    onChange={(e) => onChange(it.key, { blockType: e.target.value as any })}
                  >
                    <option value="">Seleziona…</option>
                    {blockOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Pronta a ripartire con 50 PV?</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={d.restart50pv}
                    onChange={(e) => onChange(it.key, { restart50pv: e.target.value as any })}
                  >
                    <option value="">Seleziona…</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Necessiti di supporto?</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={d.needsSupport}
                    onChange={(e) => onChange(it.key, { needsSupport: e.target.value as any })}
                  >
                    <option value="">Seleziona…</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
