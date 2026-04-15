import { STORAGE_KEY } from "@/game/constants";
import type { GameState } from "@/game/types";

// ──────────────────────────────────────────────
// Legacy auto-save (backward compat)
// ──────────────────────────────────────────────

export const saveToLocalStorage = (state: GameState) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save game:", e);
  }
};

export const loadFromLocalStorage = (): GameState | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as GameState;
  } catch (e) {
    console.error("Failed to load game:", e);
    return null;
  }
};

export const clearLocalStorage = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear save:", e);
  }
};

// ──────────────────────────────────────────────
// Multi-slot save system
// ──────────────────────────────────────────────

export type ManualSlotId = "manual1" | "manual2" | "manual3";
export type SaveSlotId = "auto" | ManualSlotId;

export interface SaveSlotMeta {
  slotId: SaveSlotId;
  turn: number;
  credits: number;
  sectorName: string;
  timestamp: number; // Date.now()
  templateId?: string; // Ship template used (undefined = old save without template info)
}

const SLOT_KEYS: Record<SaveSlotId, string> = {
  auto: STORAGE_KEY,                    // reuses existing key → page-refresh behaviour unchanged
  manual1: "star-wanderer-save-1",
  manual2: "star-wanderer-save-2",
  manual3: "star-wanderer-save-3",
};

const META_KEYS: Record<SaveSlotId, string> = {
  auto: "star-wanderer-meta-auto",
  manual1: "star-wanderer-meta-1",
  manual2: "star-wanderer-meta-2",
  manual3: "star-wanderer-meta-3",
};

export const saveSlot = (id: SaveSlotId, state: GameState): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SLOT_KEYS[id], JSON.stringify(state));

    const meta: SaveSlotMeta = {
      slotId: id,
      turn: state.turn,
      credits: state.credits,
      sectorName: state.currentSector?.name ?? "—",
      timestamp: Date.now(),
      templateId: state.startTemplateId,
    };
    localStorage.setItem(META_KEYS[id], JSON.stringify(meta));
  } catch (e) {
    console.error(`Failed to save slot ${id}:`, e);
  }
};

export const loadSlot = (id: SaveSlotId): GameState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SLOT_KEYS[id]);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch (e) {
    console.error(`Failed to load slot ${id}:`, e);
    return null;
  }
};

export const getSlotMeta = (id: SaveSlotId): SaveSlotMeta | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(META_KEYS[id]);
    if (!raw) {
      // Auto slot might have state but no meta (old save) — build meta from state
      if (id === "auto") {
        const state = loadSlot("auto");
        if (state) {
          return {
            slotId: "auto",
            turn: state.turn,
            credits: state.credits,
            sectorName: state.currentSector?.name ?? "—",
            timestamp: 0,
            templateId: state.startTemplateId,
          };
        }
      }
      return null;
    }
    return JSON.parse(raw) as SaveSlotMeta;
  } catch {
    return null;
  }
};

export const deleteSlot = (id: ManualSlotId): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SLOT_KEYS[id]);
    localStorage.removeItem(META_KEYS[id]);
  } catch (e) {
    console.error(`Failed to delete slot ${id}:`, e);
  }
};

export const getAllSlotMeta = (): Record<SaveSlotId, SaveSlotMeta | null> => ({
  auto: getSlotMeta("auto"),
  manual1: getSlotMeta("manual1"),
  manual2: getSlotMeta("manual2"),
  manual3: getSlotMeta("manual3"),
});
