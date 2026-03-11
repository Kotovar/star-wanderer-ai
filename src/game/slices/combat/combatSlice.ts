import type { GameState, GameStore, Location } from "@/game/types";
import { playSound } from "@/sounds";
import * as helpers from "./helpers";

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
        playSound("combat");
        helpers.initializeCombat(enemy, isAmbush, set, get);
    },

    startBossCombat: (bossLocation) => {
        playSound("combat");
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
        helpers.executePlayerAttack(get(), set, get);
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
                s.gameMode = s.previousGameMode ?? "galaxy_map";
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
