import type { SetState } from "@/game/types";

export interface SettingsSlice {
    setAnimationsEnabled: (enabled: boolean) => void;
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
});
