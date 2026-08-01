import { store as i18nStore } from "@/lib/useTranslation";
import type { GameState, GameStore, Location } from "@/game/types";
import type { CombatTurnTimeline } from "@/game/types/combatCinematics";
import { playSound } from "@/sounds";
import * as helpers from "./helpers";
import { deferCombatSound } from "./helpers/combatSound";
import {
    appendCombatSnapshotDeltaEvents,
    createCombatCinematicSnapshot,
    createCombatTimelineCollector,
} from "./helpers/combatTimeline";
import { DEFENDER_CONFIGS } from "./helpers/combatSetup";
import { startDefenderCombat } from "./helpers/startDefenderCombat";
import { advanceCombatRound, applyCombatTimeCost } from "./helpers/combatTime";
import type { RaceId } from "@/game/types/races";
import type { EnemyShip } from "@/game/types/enemy";
import { getPilotInCockpit } from "@/game/crew";

/**
 * Интерфейс CombatSlice
 */
export interface CombatSlice {
    processEnemyAttack: () => void;
    startCombat: (enemy: Location, isAmbush?: boolean) => void;
    startBossCombat: (bossLocation: Location) => void;
    selectEnemyModule: (moduleId: number) => void;
    attackEnemy: () => void;
    attackEnemyWithBayTargets: (bayTargets: Record<number, number | null>) => CombatTurnTimeline | null;
    executeAmbushAttack: () => void;
    retreat: () => CombatTurnTimeline | null;
    attackFriendlyShip: () => void;
    confirmHostileApproach: () => void;
    cancelHostileApproach: () => void;
    recoverModuleWithNanites: (moduleId: number) => void;
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
        helpers.executeEnemyAttack(set, get);
    },

    startCombat: (enemy, isAmbush = false) => {
        playSound("world_danger");
        helpers.initializeCombat(enemy, isAmbush, set, get);
    },

    startBossCombat: (bossLocation) => {
        playSound("world_danger");
        helpers.initializeBossCombat(bossLocation, set, get);
    },

    selectEnemyModule: (moduleId) => {
        let selected = false;
        set((s) => {
            if (!s.currentCombat) return;
            const targetModule = s.currentCombat.enemy.modules.find(
                (m) => m.id === moduleId,
            );
            if (targetModule && targetModule.health > 0) {
                s.currentCombat.enemy.selectedModule = moduleId;
                selected = true;
            }
        });
        if (selected) playSound("combat_target_select");
    },

    attackEnemy: () => {
        helpers.executePlayerAttack(set, get);
    },

    attackEnemyWithBayTargets: (bayTargets) => {
        // Звук отыграет кинематика по таймлайну — иначе весь залп звучит разом
        // ещё до анимации.
        return deferCombatSound(() =>
            helpers.executePlayerAttackWithBayTargets(bayTargets, set, get),
        );
    },

    executeAmbushAttack: () => {
        // Атака врага при засаде
        helpers.executeEnemyAttack(set, get);

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
            get().addLog( i18nStore.t("game_logs.combatSlice_1"),
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

        playSound("world_danger");
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
            get().addLog( i18nStore.t("game_logs.combatSlice_2"), "error");
        } else if (loc.type === "planet") {
            get().addLog( i18nStore.t("game_logs.combatSlice_3"), "error");
        } else {
            get().addLog( i18nStore.t("game_logs.combatSlice_4", { loc_name: loc.name }), "error");
        }
        playSound("world_danger");
        startDefenderCombat(race, set, get);
    },

    cancelHostileApproach: () => {
        set((s) => {
            s.gameMode = "sector_map";
        });
        get().addLog( i18nStore.t("game_logs.combatSlice_5"), "info");
    },

    recoverModuleWithNanites: (moduleId) => {
        helpers.recoverModuleWithNanites(moduleId, set, get);
    },

    retreat: () => {
        const state = get();
        if (!state.currentCombat) return null;

        if (
            state.currentCombat.isAmbush &&
            !state.currentCombat.ambushAttackDone
        ) {
            get().addLog( i18nStore.t("game_logs.combatSlice_6"), "error");
            return null;
        }

        // Отступлением управляет пилот за штурвалом
        const pilot = getPilotInCockpit(state.crew, state.ship.modules);
        const retreatChance = helpers.calculateRetreatChance(pilot);

        if (Math.random() < retreatChance) {
            const combatRound = state.currentCombat.round;
            set((s) => {
                s.currentCombat = null;
                // Always return to sector map after combat (not galaxy map)
                s.gameMode = "sector_map";
                s.crew.forEach((c) => {
                    c.combatAssignment = null;
                    c.combatAssignmentEffect = null;
                });
            });
            applyCombatTimeCost(combatRound, set, get);
            get().addLog( i18nStore.t("game_logs.combatSlice_7"), "info");
            return null;
        } else {
            const initialSnapshot = createCombatCinematicSnapshot(state);
            if (!initialSnapshot) return null;
            const timeline = createCombatTimelineCollector(initialSnapshot);
            get().addLog( i18nStore.t("game_logs.combatSlice_8"), "warning");
            deferCombatSound(() => helpers.executeEnemyAttack(set, get, timeline));
            const beforeRound = createCombatCinematicSnapshot(get());
            advanceCombatRound(set, get);
            const afterRound = createCombatCinematicSnapshot(get());
            if (beforeRound && afterRound) {
                appendCombatSnapshotDeltaEvents(timeline, beforeRound, afterRound, "repair");
            }
            return timeline.finish();
        }
    },
});
