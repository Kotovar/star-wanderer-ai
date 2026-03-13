import type { SetState } from "@/game/types";
import {
    GAME_MODES,
    DEFAULT_NAVIGATION_MODE,
    PANELS_RETURNING_TO_NAVIGATION,
} from "./constants";

/**
 * Интерфейс UiSlice
 */
export interface UiSlice {
    /** Показать карту галактики */
    showGalaxyMap: () => void;
    /** Показать карту сектора */
    showSectorMap: () => void;
    /** Показать экран назначений экипажа */
    showAssignments: () => void;
    /** Показать панель артефактов */
    showArtifacts: () => void;
    /** Показать панель исследований */
    showResearch: () => void;
    /** Закрыть панель артефактов */
    closeArtifactsPanel: () => void;
    /** Закрыть панель исследований */
    closeResearchPanel: () => void;
    /** Сохранить текущий режим игры (для возврата из модальных окон) */
    savePreviousGameMode: () => void;
}

/**
 * Создаёт ui слайс для управления игровыми режимами и UI-панелями
 */
export const createUiSlice = (set: SetState): UiSlice => ({
    showGalaxyMap: () => set({ gameMode: GAME_MODES.NAVIGATION.GALAXY_MAP }),

    showSectorMap: () => set({ gameMode: GAME_MODES.NAVIGATION.SECTOR_MAP }),

    showAssignments: () => set({ gameMode: GAME_MODES.MANAGEMENT.ASSIGNMENTS }),

    showArtifacts: () =>
        set((state) => ({
            // Не перезаписываем previousGameMode если уже в панели
            previousGameMode: PANELS_RETURNING_TO_NAVIGATION.includes(
                state.gameMode as (typeof PANELS_RETURNING_TO_NAVIGATION)[number],
            )
                ? state.previousGameMode
                : state.gameMode,
            gameMode: GAME_MODES.MANAGEMENT.ARTIFACTS,
        })),

    showResearch: () =>
        set((state) => ({
            // Не перезаписываем previousGameMode если уже в панели
            previousGameMode: PANELS_RETURNING_TO_NAVIGATION.includes(
                state.gameMode as (typeof PANELS_RETURNING_TO_NAVIGATION)[number],
            )
                ? state.previousGameMode
                : state.gameMode,
            gameMode: GAME_MODES.MANAGEMENT.RESEARCH,
        })),

    closeArtifactsPanel: () =>
        set((state) => ({
            gameMode: state.previousGameMode || DEFAULT_NAVIGATION_MODE,
            previousGameMode: null,
        })),

    closeResearchPanel: () =>
        set((state) => ({
            gameMode: state.previousGameMode || DEFAULT_NAVIGATION_MODE,
            previousGameMode: null,
        })),

    savePreviousGameMode: () =>
        set((state) => ({
            previousGameMode: PANELS_RETURNING_TO_NAVIGATION.includes(
                state.gameMode,
            )
                ? state.previousGameMode
                : state.gameMode,
        })),
});
