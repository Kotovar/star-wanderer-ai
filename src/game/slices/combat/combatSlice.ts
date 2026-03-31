import type { GameState, GameStore, Location } from "@/game/types";
import { playSound } from "@/sounds";
import * as helpers from "./helpers";
import { DEFENDER_CONFIGS } from "./helpers/combatSetup";
import { startDefenderCombat } from "./helpers/startDefenderCombat";
import type { RaceId } from "@/game/types/races";
import type { EnemyShip } from "@/game/types/enemy";

/**
 * Интерфейс CombatSlice
 */
export interface CombatSlice {
    processEnemyAttack: () => void;
    startCombat: (enemy: Location, isAmbush?: boolean) => void;
    startBossCombat: (bossLocation: Location) => void;
    selectEnemyModule: (moduleId: number) => void;
    attackEnemy: () => void;
    executeAmbushAttack: () => void;
    retreat: () => void;
    attackFriendlyShip: () => void;
    confirmHostileApproach: () => void;
    cancelHostileApproach: () => void;
}

/**
 * Создаёт combat слайс
 */
export const createCombatSlice = (
    set: (fn: (state: GameState) => void) => void,
    get: () => GameStore,
): CombatSlice => ({
    processEnemyAttack: () => {
        // Атака врага по игроку (использует полную логику с выбором цели по приоритету)
        helpers.executeEnemyAttack(get(), set, get);
    },

    startCombat: (enemy, isAmbush = false) => {
        playSound(isAmbush ? "alert" : "combat");
        helpers.initializeCombat(enemy, isAmbush, set, get);
    },

    startBossCombat: (bossLocation) => {
        playSound("alert");
        helpers.initializeBossCombat(bossLocation, set, get);
    },

    selectEnemyModule: (moduleId) => {
        set((s) => {
            if (!s.currentCombat) return;
            const targetModule = s.currentCombat.enemy.modules.find(
                (m) => m.id === moduleId,
            );
            if (targetModule && targetModule.health > 0) {
                s.currentCombat.enemy.selectedModule = moduleId;
            }
        });
    },

    attackEnemy: () => {
        helpers.executePlayerAttack(set, get);
    },

    executeAmbushAttack: () => {
        // Атака врага при засаде
        helpers.executeEnemyAttack(get(), set, get);

        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.ambushAttackDone = true;
        });

        get().updateShipStats();
        get().checkGameOver();
    },

    attackFriendlyShip: () => {
        const state = get();
        const loc = state.currentLocation;
        if (!loc || loc.type !== "friendly_ship") return;

        const race = loc.dominantRace as RaceId | undefined;

        // Immediate reputation penalty for attacking civilians
        if (race) {
            get().changeReputation(race, -20);
            get().addLog(
                `☠️ Вы напали на мирный корабль! Репутация с расой: -20`,
                "error",
            );
        }

        const RACE_TO_GUARD: Record<RaceId, EnemyShip> = {
            human: "human_guard",
            synthetic: "synthetic_guard",
            xenosymbiont: "xenosymbiont_guard",
            krylorian: "krylorian_guard",
            voidborn: "voidborn_guard",
            crystalline: "crystalline_guard",
        };

        const tier = state.currentSector?.tier ?? 1;
        const threat = Math.min(3, tier);
        const enemyType: EnemyShip = race ? RACE_TO_GUARD[race] : "mercenary";
        const config = race ? DEFENDER_CONFIGS[enemyType] : null;

        const fakeLocation: Location = {
            id: loc.id,
            type: "enemy",
            name: config?.name ?? loc.name,
            threat,
            enemyType,
        };

        playSound("alert");
        // Player is attacker — no ambush
        helpers.initializeCombat(fakeLocation, false, set, get);
        // Set defenderRace so victory handler knows which race was attacked
        // But combatTargetLocationId signals this was an unprovoked attack (no rep reward)
        set((s) => {
            if (s.currentCombat) {
                s.currentCombat.defenderRace = race;
                s.currentCombat.combatTargetLocationId = loc.id;
            }
        });
    },

    confirmHostileApproach: () => {
        const loc = get().currentLocation;
        if (!loc) return;
        const race = loc.dominantRace as RaceId | undefined;
        if (!race) {
            set((s) => {
                s.gameMode = "sector_map";
            });
            return;
        }
        if (loc.type === "station") {
            get().addLog(`⚔️ Охрана станции атакует нарушителей!`, "error");
        } else if (loc.type === "planet") {
            get().addLog(`⚔️ Охрана планеты атакует нарушителей!`, "error");
        } else {
            get().addLog(`⚔️ ${loc.name} открывает огонь — вы враги!`, "error");
        }
        playSound("alert");
        startDefenderCombat(race, set, get);
    },

    cancelHostileApproach: () => {
        set((s) => {
            s.gameMode = "sector_map";
        });
        get().addLog(`↩ Вы отступили от враждебной территории`, "info");
    },

    retreat: () => {
        const state = get();
        if (!state.currentCombat) return;

        if (
            state.currentCombat.isAmbush &&
            !state.currentCombat.ambushAttackDone
        ) {
            get().addLog("Нельзя сбежать из засады!", "error");
            return;
        }

        const pilot = state.crew.find((c) => c.profession === "pilot");
        const retreatChance = helpers.calculateRetreatChance(pilot);

        if (Math.random() < retreatChance) {
            set((s) => {
                s.currentCombat = null;
                // Always return to sector map after combat (not galaxy map)
                s.gameMode = "sector_map";
                s.crew.forEach((c) => {
                    c.combatAssignment = null;
                    c.combatAssignmentEffect = null;
                });
            });
            get().addLog("Побег успешен!", "info");
        } else {
            get().addLog("Побег не удался! Враг атакует!", "warning");
            get().processEnemyAttack();
            get().updateShipStats();
            get().checkGameOver();
        }
    },
});
