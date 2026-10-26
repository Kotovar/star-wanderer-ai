import type { PanelMode, SetState } from "@/game/types";
import {
    GAME_MODES,
    PANELS_RETURNING_TO_NAVIGATION,
    resolveReturnMode,
} from "./constants";

export interface UiSlice {
    openPanel: (mode: PanelMode) => void;
    closePanel: () => void;
    showGalaxyMap: () => void;
    showSectorMap: () => void;
    showAssignments: () => void;
    closeAssignments: () => void;
    showCrises: () => void;
    showEnemyCodex: () => void;
    showEffects: () => void;
    showArtifacts: () => void;
    showResearch: () => void;
    showNavigator: () => void;
    closeArtifactsPanel: () => void;
    closeResearchPanel: () => void;
    closeNavigator: () => void;
}

export const createUiSlice = (set: SetState): UiSlice => {
    const openPanel = (mode: PanelMode) =>
        set((state) => ({
            previousGameMode: PANELS_RETURNING_TO_NAVIGATION.includes(state.gameMode)
                ? state.previousGameMode
                : state.gameMode,
            gameMode: mode,
        }));

    const closePanel = () =>
        set((state) => ({
            gameMode: resolveReturnMode(state),
            previousGameMode: null,
        }));

    const showMap = (mode: "galaxy_map" | "sector_map") =>
        set((state) => ({
            galaxyZoom: state.galaxyZoom ?? 1,
            galaxyOffset: state.galaxyOffset ?? { x: 0, y: 0 },
            sectorZoom: state.sectorZoom ?? 1,
            sectorOffset: state.sectorOffset ?? { x: 0, y: 0 },
            gameMode: resolveReturnMode({
                currentCombat: state.currentCombat,
                activeExpedition: state.activeExpedition,
                activeDive: state.activeDive,
                previousGameMode: null,
            }, mode),
            previousGameMode: null,
        }));

    return {
        openPanel,
        closePanel,
        showGalaxyMap: () => showMap(GAME_MODES.NAVIGATION.GALAXY_MAP),
        showSectorMap: () => showMap(GAME_MODES.NAVIGATION.SECTOR_MAP),
        showAssignments: () => openPanel(GAME_MODES.MANAGEMENT.ASSIGNMENTS),
        showCrises: () => openPanel(GAME_MODES.MANAGEMENT.CRISES),
        showEnemyCodex: () => openPanel(GAME_MODES.MANAGEMENT.ENEMY_CODEX),
        showEffects: () => openPanel(GAME_MODES.MANAGEMENT.EFFECTS),
        showArtifacts: () => openPanel(GAME_MODES.MANAGEMENT.ARTIFACTS),
        showResearch: () => openPanel(GAME_MODES.MANAGEMENT.RESEARCH),
        showNavigator: () => openPanel(GAME_MODES.MANAGEMENT.NAVIGATOR),
        closeAssignments: closePanel,
        closeArtifactsPanel: closePanel,
        closeResearchPanel: closePanel,
        closeNavigator: closePanel,
    };
};
