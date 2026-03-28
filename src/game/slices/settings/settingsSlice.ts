import type { SetState } from "@/game/types";

export interface SettingsSlice {
    setAnimationsEnabled: (enabled: boolean) => void;
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
