import type { EnemyShip, GameState, GameStore, Location } from "@/game/types";
import * as combatSetup from "./combatSetup";

/**
 * Инициализирует обычный бой
 */
export function initializeCombat(
    enemy: Location,
    isAmbush: boolean,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const threat = enemy.threat ?? 1;
    const enemyModules = combatSetup.generateEnemyModules(
        threat,
        enemy.name as EnemyShip,
    );
    const lootCredits = combatSetup.calculateCombatLoot(threat, enemy.name);

    set((s) => {
        s.ship.shields = s.ship.maxShields;
        s.currentCombat = {
            enemy: {
                name: enemy.name,
                modules: enemyModules,
                selectedModule: null,
                shields: threat * 20,
                maxShields: threat * 20,
                threat,
            },
            loot: { credits: lootCredits },
            isAmbush,
            ambushAttackDone: false,
        };
        s.gameMode = "combat";
    });

    get().addLog(`Щиты восстановлены: ${get().ship.shields}`, "combat");

    if (isAmbush) {
        get().addLog(`⚠️ ЗАСАДА! ${enemy.name} атакует первым!`, "error");
        get().executeAmbushAttack();
    } else {
        get().addLog(`Бой с ${enemy.name}!`, "combat");
    }

    // Apply combatStartMoraleDrain trait
    applyPessimistTrait(get, set);
}

/**
 * Применяет трейт Пессимист в начале боя
 */
function applyPessimistTrait(
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
) {
    const crewWithPessimist = get().crew.filter((c) =>
        c.traits?.some((t) => t.effect.combatStartMoraleDrain),
    );

    crewWithPessimist.forEach((crewMember) => {
        const trait = crewMember.traits?.find(
            (t) => t.effect.combatStartMoraleDrain,
        );
        if (!trait) return;

        const moraleDrain = trait.effect.combatStartMoraleDrain as number;
        const crewInSameModule = get().crew.filter(
            (c) =>
                c.moduleId === crewMember.moduleId &&
                c.id !== crewMember.id &&
                c.happiness > 0,
        );

        if (crewInSameModule.length > 0) {
            set((s) => {
                s.crew.forEach((c) => {
                    if (
                        c.moduleId === crewMember.moduleId &&
                        c.id !== crewMember.id
                    ) {
                        c.happiness = Math.max(0, c.happiness - moraleDrain);
                    }
                });
            });
        }
    });
}
