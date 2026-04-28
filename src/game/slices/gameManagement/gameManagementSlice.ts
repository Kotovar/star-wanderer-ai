import type { GameStore, SetState } from "@/game/types";
import { checkGameOver, triggerVictory, restartGame } from "./helpers";
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    saveSlot,
    loadSlot,
} from "@/game/saves/utils";
import type { ManualSlotId, SaveSlotId } from "@/game/saves/utils";
import { CREW_TRAITS } from "@/game/constants/traits";

export interface GameManagementSlice {
    checkGameOver: () => void;
    triggerVictory: () => void;
    restartGame: (templateId?: string, modifierIds?: string[]) => void;
    saveGame: () => void;
    loadGame: () => boolean;
    saveToSlot: (slotId: ManualSlotId) => void;
    loadFromSlot: (slotId: SaveSlotId) => void;
}

export const createGameManagementSlice = (
    set: SetState,
    get: () => GameStore,
): GameManagementSlice => ({
    checkGameOver: () => checkGameOver(set, get),
    triggerVictory: () => triggerVictory(set, get),
    restartGame: (templateId?: string, modifierIds?: string[]) =>
        restartGame(set, get, templateId, modifierIds),

    /** Авто-сохранение каждый ход (сохраняет в auto-слот + legacy ключ) */
    saveGame: () => {
        const state = get();
        saveToLocalStorage(state);          // legacy key — page refresh picks it up
        saveSlot("auto", state);            // new auto slot with meta
    },

    /** Загружает сохранение при запуске страницы (из legacy auto-ключа) */
    loadGame: () => {
        const saved = loadFromLocalStorage();
        if (!saved) {
            get().addLog("Нет сохранённой игры", "warning");
            get().updateShipStats();
            return false;
        }

        // Миграция настроек
        if (!saved.settings) {
            saved.settings = { animationsEnabled: false };
        }
        if (saved.gameLoadedCount === undefined) {
            saved.gameLoadedCount = 0;
        }
        saved.gameLoadedCount += 1;
        if (!saved.bannedPlanets) {
            saved.bannedPlanets = [];
        }
        if (saved.pendingTravelEvent === undefined) {
            saved.pendingTravelEvent = null;
        }

        // Синхронизация трейтов экипажа
        const allTraits = Object.values(CREW_TRAITS).flat();
        saved.crew = saved.crew.map((c) => ({
            ...c,
            traits: c.traits?.map((t) => {
                const current = allTraits.find((d) => d.id === t.id);
                if (!current) return t;
                return { ...t, name: current.name, desc: current.desc, effect: current.effect };
            }),
        }));

        set({ ...saved });
        return true;
    },

    /** Сохранить в ручной слот (1/2/3) */
    saveToSlot: (slotId: ManualSlotId) => {
        const state = get();
        saveSlot(slotId, state);
        get().addLog(`💾 Сохранено в слот ${slotId.replace("manual", "")}`, "info");
    },

    /** Загрузить из любого слота */
    loadFromSlot: (slotId: SaveSlotId) => {
        const saved = loadSlot(slotId);
        if (!saved) {
            get().addLog("Сохранение не найдено", "warning");
            return;
        }

        // Миграция
        if (!saved.settings) {
            saved.settings = { animationsEnabled: false };
        }
        if (saved.gameLoadedCount === undefined) {
            saved.gameLoadedCount = 0;
        }
        saved.gameLoadedCount += 1;
        if (!saved.bannedPlanets) {
            saved.bannedPlanets = [];
        }
        if (saved.pendingTravelEvent === undefined) {
            saved.pendingTravelEvent = null;
        }

        // Синхронизация трейтов
        const allTraits = Object.values(CREW_TRAITS).flat();
        saved.crew = saved.crew.map((c) => ({
            ...c,
            traits: c.traits?.map((t) => {
                const current = allTraits.find((d) => d.id === t.id);
                if (!current) return t;
                return { ...t, name: current.name, desc: current.desc, effect: current.effect };
            }),
        }));

        set({ ...saved });
        get().addLog(
            slotId === "auto"
                ? "📂 Загружено автосохранение"
                : `📂 Загружено сохранение ${slotId.replace("manual", "")}`,
            "info",
        );
    },
});
