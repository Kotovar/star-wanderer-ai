import type { GameMode, GameState } from "@/game/types";

type GameModeObj = Record<string, Record<string, GameMode>>;

export const GAME_MODES = {
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
        EFFECTS: "effects",
        RESEARCH: "research",
        NAVIGATOR: "navigator",
        CRISES: "crises",
        ENEMY_CODEX: "enemy_codex",
        REPUTATION: "reputation",
    },
} as const satisfies GameModeObj;

/**
 * Режимы для навигации (основные)
 */
export const DEFAULT_NAVIGATION_MODE = GAME_MODES.NAVIGATION.GALAXY_MAP;

/**
 * Панели, закрывающиеся в режим навигации
 */
export const PANELS_RETURNING_TO_NAVIGATION: readonly GameMode[] = [
    GAME_MODES.MANAGEMENT.ASSIGNMENTS,
    GAME_MODES.MANAGEMENT.ARTIFACTS,
    GAME_MODES.MANAGEMENT.EFFECTS,
    GAME_MODES.MANAGEMENT.RESEARCH,
    GAME_MODES.MANAGEMENT.NAVIGATOR,
    GAME_MODES.MANAGEMENT.CRISES,
    GAME_MODES.MANAGEMENT.ENEMY_CODEX,
    GAME_MODES.MANAGEMENT.REPUTATION,
];

/**
 * UI не завершает бой, экспедицию или погружение: их экран сохраняется
 * до игрового исхода или явного завершения действия.
 */
export const resolveReturnMode = (
    state: Pick<GameState, "currentCombat" | "activeExpedition" | "activeDive" | "previousGameMode">,
    fallback: GameMode = DEFAULT_NAVIGATION_MODE,
): GameMode => {
    if (state.currentCombat) return GAME_MODES.COMBAT.COMBAT;
    if (state.activeExpedition) return GAME_MODES.LOCATIONS.PLANET;
    if (state.activeDive) return "gas_giant";
    const previous = state.previousGameMode;
    return previous && previous !== "combat" && !PANELS_RETURNING_TO_NAVIGATION.includes(previous)
        ? previous
        : fallback;
};
