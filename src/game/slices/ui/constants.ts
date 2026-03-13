import type { GameMode } from "@/game/types";

type GameModeObj = Record<string, Record<string, GameMode>>;

export const GAME_MODES: GameModeObj = {
    /** Навигация (карты) */
    NAVIGATION: {
        GALAXY_MAP: "galaxy_map",
        SECTOR_MAP: "sector_map",
    },
    /** Локации */
    LOCATIONS: {
        STATION: "station",
        PLANET: "planet",
        ASTEROID_BELT: "asteroid_belt",
        STORM: "storm",
        DISTRESS_SIGNAL: "distress_signal",
        ANOMALY: "anomaly",
        FRIENDLY_SHIP: "friendly_ship",
        UNKNOWN_SHIP: "unknown_ship",
    },
    /** Бой и результаты */
    COMBAT: {
        COMBAT: "combat",
        BATTLE_RESULTS: "battle_results",
        STORM_RESULTS: "storm_results",
    },
    /** Управление */
    MANAGEMENT: {
        ASSIGNMENTS: "assignments",
        ARTIFACTS: "artifacts",
        RESEARCH: "research",
    },
};

/**
 * Режимы для навигации (основные)
 */
export const DEFAULT_NAVIGATION_MODE = GAME_MODES.NAVIGATION.GALAXY_MAP;

/**
 * Панели, закрывающиеся в режим навигации
 */
export const PANELS_RETURNING_TO_NAVIGATION = [
    GAME_MODES.MANAGEMENT.ARTIFACTS,
    GAME_MODES.MANAGEMENT.RESEARCH,
] as const;
