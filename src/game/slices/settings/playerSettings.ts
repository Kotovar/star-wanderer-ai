import type { GameState } from "@/game/types";

export const PLAYER_SETTINGS_STORAGE_KEY = "star-wanderer-player-settings";

type PlayerSettings = GameState["settings"];

const getStorage = () =>
    typeof localStorage === "undefined" ? null : localStorage;

const normalizeVolume = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.min(1, value))
        : fallback;

export const loadPlayerSettings = (
    defaults: PlayerSettings,
): PlayerSettings => {
    const storage = getStorage();
    if (!storage) return defaults;

    try {
        const raw = storage.getItem(PLAYER_SETTINGS_STORAGE_KEY);
        if (!raw) return defaults;
        const settings = JSON.parse(raw) as Partial<PlayerSettings>;
        return {
            animationsEnabled:
                typeof settings.animationsEnabled === "boolean"
                    ? settings.animationsEnabled
                    : defaults.animationsEnabled,
            soundEnabled:
                typeof settings.soundEnabled === "boolean"
                    ? settings.soundEnabled
                    : defaults.soundEnabled,
            master: normalizeVolume(settings.master, defaults.master),
            music: normalizeVolume(settings.music, defaults.music),
            sfx: normalizeVolume(settings.sfx, defaults.sfx),
            ui: normalizeVolume(settings.ui, defaults.ui),
        };
    } catch {
        return defaults;
    }
};

export const savePlayerSettings = (settings: PlayerSettings): void => {
    try {
        getStorage()?.setItem(
            PLAYER_SETTINGS_STORAGE_KEY,
            JSON.stringify(settings),
        );
    } catch {
        // Настройки не должны мешать игре, если хранилище недоступно.
    }
};
