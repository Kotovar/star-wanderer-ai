import { store as i18nStore } from "@/lib/useTranslation";
import type { GameState, GameStore, SetState } from "@/game/types";
import { checkGameOver, checkVictory, triggerVictory, restartGame } from "./helpers";
import {
    clearAllSaves,
    loadFromLocalStorage,
    saveToLocalStorage,
    saveSlot,
    loadSlot,
} from "@/game/saves/utils";
import type { ManualSlotId, SaveSlotId } from "@/game/saves/utils";
import { CREW_TRAITS } from "@/game/constants/traits";
import {
    DEFAULT_AUDIO_VOLUMES,
    setAudioVolumes,
    setSoundPlaybackEnabled,
} from "@/sounds";
import { resetMetaProgress } from "@/game/metaProgress/store";
import type { RunProfileId } from "@/game/galaxy/runProfiles";

const normalizeAudioSettings = (
    settings: Partial<GameState["settings"]> | undefined,
): GameState["settings"] => ({
    animationsEnabled: settings?.animationsEnabled ?? true,
    soundEnabled: settings?.soundEnabled ?? true,
    master: normalizeVolume(settings?.master, DEFAULT_AUDIO_VOLUMES.master),
    music: normalizeVolume(settings?.music, DEFAULT_AUDIO_VOLUMES.music),
    sfx: normalizeVolume(settings?.sfx, DEFAULT_AUDIO_VOLUMES.sfx),
    ui: normalizeVolume(settings?.ui, DEFAULT_AUDIO_VOLUMES.ui),
});

const normalizeVolume = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.min(1, value))
        : fallback;

const syncAudioSettings = (settings: GameState["settings"]) => {
    setSoundPlaybackEnabled(settings.soundEnabled);
    setAudioVolumes(settings);
};

export interface GameManagementSlice {
    checkGameOver: () => void;
    checkVictory: () => void;
    triggerVictory: () => void;
    restartGame: (templateId?: string, modifierIds?: string[], profileId?: RunProfileId) => void;
    resetProgress: () => void;
    saveGame: () => void;
    loadGame: () => boolean;
    saveToSlot: (slotId: ManualSlotId, name?: string) => void;
    loadFromSlot: (slotId: SaveSlotId) => void;
}

export const createGameManagementSlice = (
    set: SetState,
    get: () => GameStore,
): GameManagementSlice => ({
    checkGameOver: () => checkGameOver(set, get),
    checkVictory: () => checkVictory(set, get),
    triggerVictory: () => triggerVictory(set, get),
    restartGame: (templateId?: string, modifierIds?: string[], profileId?: RunProfileId) =>
        restartGame(set, get, templateId, modifierIds, profileId),
    resetProgress: () => {
        clearAllSaves();
        resetMetaProgress();
    },

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
            get().addLog( i18nStore.t("game_logs.gameManagementSlice_1"), "warning");
            get().updateShipStats();
            return false;
        }

        // Миграция настроек
        saved.settings = normalizeAudioSettings(saved.settings);
        if (saved.gameLoadedCount === undefined) {
            saved.gameLoadedCount = 0;
        }
        saved.gameLoadedCount += 1;
        if (!saved.bannedPlanets) {
            saved.bannedPlanets = [];
        }
        saved.diplomaticTranslatorRaceIds ??= [];
        if (saved.pendingTravelEvent === undefined) {
            saved.pendingTravelEvent = null;
        }
        if (saved.pendingRandomEvent === undefined) {
            saved.pendingRandomEvent = null;
        }
        if (saved.scheduledRandomEventConsequence === undefined) {
            saved.scheduledRandomEventConsequence = null;
        }
        saved.startModifierIds ??= [];
        saved.emergencyFuelStationIds ??= [];
        saved.knownTradeStations ??= [];
        saved.discoveredStationTypes ??= [];
        saved.pendingScoutEvent ??= null;

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

        syncAudioSettings(saved.settings);
        set({ ...saved });
        return true;
    },

    /** Сохранить в ручной слот (1/2/3) */
    saveToSlot: (slotId: ManualSlotId, name?: string) => {
        const state = get();
        saveSlot(slotId, state, name);
        get().addLog( i18nStore.t("game_logs.gameManagementSlice_2", { value: slotId.replace("manual", "") }), "info");
    },

    /** Загрузить из любого слота */
    loadFromSlot: (slotId: SaveSlotId) => {
        const saved = loadSlot(slotId);
        if (!saved) {
            get().addLog( i18nStore.t("game_logs.gameManagementSlice_3"), "warning");
            return;
        }

        // Миграция
        saved.settings = normalizeAudioSettings(saved.settings);
        if (saved.gameLoadedCount === undefined) {
            saved.gameLoadedCount = 0;
        }
        saved.gameLoadedCount += 1;
        if (!saved.bannedPlanets) {
            saved.bannedPlanets = [];
        }
        saved.diplomaticTranslatorRaceIds ??= [];
        if (saved.pendingTravelEvent === undefined) {
            saved.pendingTravelEvent = null;
        }
        if (saved.pendingRandomEvent === undefined) {
            saved.pendingRandomEvent = null;
        }
        if (saved.scheduledRandomEventConsequence === undefined) {
            saved.scheduledRandomEventConsequence = null;
        }
        saved.startModifierIds ??= [];
        saved.emergencyFuelStationIds ??= [];
        saved.knownTradeStations ??= [];
        saved.discoveredStationTypes ??= [];
        saved.pendingScoutEvent ??= null;

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

        syncAudioSettings(saved.settings);
        set({ ...saved });
        get().addLog(
            slotId === "auto"
                ? i18nStore.t("game_logs.load_auto")
                : i18nStore.t("game_logs.load_slot", { slot: slotId.replace("manual", "") }),
            "info",
        );
    },
});
