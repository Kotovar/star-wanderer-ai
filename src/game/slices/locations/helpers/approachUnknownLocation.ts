import type { GameStore, SetState } from "@/game/types";
import { addEnemyCodexEntry, getEnemyCodexId } from "@/game/constants/enemyCodex";
import { getRaceReputationLevel } from "@/game/reputation/utils";

export function approachUnknownLocation(set: SetState, get: () => GameStore): void {
    const state = get();
    const location = state.currentLocation;
    if (!location) return;

    const canScan = state.canScanObject(location.type, location.threat ?? location.anomalyTier);
    const revealedLocation = { ...location, signalRevealed: true };
    if (state.currentSector) {
        set((s) => ({
            currentLocation: revealedLocation,
            currentSector: s.currentSector
                ? {
                    ...s.currentSector,
                    locations: s.currentSector.locations.map((item) =>
                        item.id === location.id ? revealedLocation : item),
                }
                : null,
            discoveredEnemyCodexIds: location.type === "space_monster"
                ? addEnemyCodexEntry(s.discoveredEnemyCodexIds, getEnemyCodexId(location))
                : s.discoveredEnemyCodexIds,
        }));
    }

    if (location.type === "enemy") {
        get().startCombat(location, !canScan);
    } else if (location.type === "boss") {
        get().startBossCombat(location);
    } else if (location.type === "friendly_ship") {
        const hostile = location.dominantRace &&
            getRaceReputationLevel(get().raceReputation, location.dominantRace) === "hostile";
        set({ gameMode: hostile ? "hostile_approach_warning" : "friendly_ship" });
    } else if (location.type === "anomaly" || location.type === "storm" ||
        location.type === "derelict_ship" || location.type === "space_monster") {
        set({ gameMode: location.type });
    }
}
