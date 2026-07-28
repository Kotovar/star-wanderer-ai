import type { SetState } from "@/game/types";
import {
    setAudioVolume as setRuntimeAudioVolume,
    setSoundPlaybackEnabled,
} from "@/sounds";
import type { AudioVolumeCategory } from "@/sounds";

export interface SettingsSlice {
    setAnimationsEnabled: (enabled: boolean) => void;
    setSoundEnabled: (enabled: boolean) => void;
    setAudioVolume: (category: AudioVolumeCategory, value: number) => void;
    setGalaxyZoom: (zoom: number) => void;
    setSectorZoom: (zoom: number) => void;
    setGalaxyOffset: (offset: { x: number; y: number }) => void;
    setSectorOffset: (offset: { x: number; y: number }) => void;
}

/**
 * Создаёт слайс настроек игры
 * @param set - Функция обновления состояния
 * @returns Методы управления настройками
 */
export const createSettingsSlice = (set: SetState): SettingsSlice => ({
    /**
     * Включает или выключает анимации в игре
     * @param enabled - true для включения анимаций, false для выключения
     */
    setAnimationsEnabled: (enabled: boolean) => {
        set((state) => ({
            settings: {
                ...state.settings,
                animationsEnabled: enabled,
            },
        }));
    },

    setSoundEnabled: (enabled: boolean) => {
        setSoundPlaybackEnabled(enabled);
        set((state) => ({
            settings: {
                ...state.settings,
                soundEnabled: enabled,
            },
        }));
    },

    setAudioVolume: (category, value) => {
        const volume = Number.isFinite(value)
            ? Math.max(0, Math.min(1, value))
            : 0;
        setRuntimeAudioVolume(category, volume);
        set((state) => ({
            settings: {
                ...state.settings,
                [category]: volume,
            },
        }));
    },

    setGalaxyZoom: (zoom: number) => {
        // Use queueMicrotask to defer update until after render
        queueMicrotask(() => {
            set(() => ({ galaxyZoom: zoom }));
        });
    },

    setSectorZoom: (zoom: number) => {
        // Use queueMicrotask to defer update until after render
        queueMicrotask(() => {
            set(() => ({ sectorZoom: zoom }));
        });
    },

    setGalaxyOffset: (offset: { x: number; y: number }) => {
        queueMicrotask(() => {
            set(() => ({ galaxyOffset: offset }));
        });
    },

    setSectorOffset: (offset: { x: number; y: number }) => {
        queueMicrotask(() => {
            set(() => ({ sectorOffset: offset }));
        });
    },
});
