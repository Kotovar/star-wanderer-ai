import type { GameState, GameStore, Location } from "@/game/types";
import type { RaceId } from "@/game/types/races";
import type { EnemyShip } from "@/game/types/enemy";
import { initializeCombat } from "./startCombat";
import { DEFENDER_CONFIGS } from "./combatSetup";

const RACE_TO_GUARD: Record<RaceId, EnemyShip> = {
    human: "human_guard",
    synthetic: "synthetic_guard",
    xenosymbiont: "xenosymbiont_guard",
    krylorian: "krylorian_guard",
    voidborn: "voidborn_guard",
    crystalline: "crystalline_guard",
};

/**
 * Запускает бой с защитниками расы при входе на враждебную планету/станцию.
 * Атакует как засада (isAmbush: true).
 * После победы даёт +60 репутации с этой расой.
 */
export function startDefenderCombat(
    race: RaceId,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void {
    const tier = get().currentSector?.tier ?? 1;
    const threat = Math.min(3, tier);
    const enemyType = RACE_TO_GUARD[race];
    const config = DEFENDER_CONFIGS[enemyType];

    const fakeLocation: Location = {
        id: `defender-${race}-${Date.now()}`,
        type: "enemy",
        name: config?.name ?? "Страж",
        threat,
        enemyType,
    };

    // initializeCombat sets currentCombat and launches ambush attack
    initializeCombat(fakeLocation, true, set, get);

    // Patch defenderRace onto the combat state so victory handler can award rep
    set((s) => {
        if (s.currentCombat) {
            s.currentCombat.defenderRace = race;
        }
    });
}
