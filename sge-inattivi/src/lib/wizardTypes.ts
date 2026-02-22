import type { InactivePerson } from "@/lib/sheetsClient";

export type BlockType = "tempo" | "paura_disturbare" | "confusione" | "scoraggiamento";

export type CheckMeta = {
  weekLabel: string; // es "2026-W05"
  compilerName: string;
  compilerEmail: string;
};

export type SelectedItem = InactivePerson & {
  key: string; // key stabile per selezione
};

export type ItemDetails = {
  blockType: BlockType | "";
  restart50pv: "SI" | "NO" | "";
  needsSupport: "SI" | "NO" | "";
};

export type WizardPayload = {
  meta: CheckMeta;
  items: Array<SelectedItem & ItemDetails>;
};
