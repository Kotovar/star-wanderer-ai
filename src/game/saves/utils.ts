import { STORAGE_KEY } from "@/game/constants";
import type { GameState } from "@/game/types";

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
