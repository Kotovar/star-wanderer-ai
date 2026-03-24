import { RACES } from "@/game/constants";
import type { GameState, GameStore, Location } from "@/game/types";
import * as combatSetup from "./combatSetup";
import { calculateShieldsFromModules } from "./combatSetup";

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
        enemy.enemyType,
    );
    const lootCredits = combatSetup.calculateCombatLoot(
        threat,
        enemy.enemyType,
    );
    const { maxShields, shieldRegenRate } = calculateShieldsFromModules(enemyModules);

    set((s) => {
        s.ship.shields = s.ship.maxShields;
        s.currentCombat = {
            enemy: {
                name: enemy.name,
                modules: enemyModules,
                selectedModule: null,
                shields: maxShields,
                maxShields,
                shieldRegenRate: shieldRegenRate > 0 ? shieldRegenRate : undefined,
                threat,
            },
            loot: { credits: lootCredits },
            droneStacks: 0,
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

    // Apply desertionRisk trait
    applyRebelTrait(get, set);
}

/**
 * Применяет трейт Пессимист в начале боя
 */
export function applyRebelTrait(
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
) {
    const rebels = get().crew.filter((c) =>
        RACES[c.race]?.hasHappiness !== false &&
        c.traits?.some((t) => t.effect.desertionRisk),
    );

    rebels.forEach((crewMember) => {
        const trait = crewMember.traits?.find((t) => t.effect.desertionRisk);
        if (!trait) return;

        const risk = trait.effect.desertionRisk as number;
        if (Math.random() < risk) {
            set((s) => {
                s.crew = s.crew.filter((c) => c.id !== crewMember.id);
            });
            get().addLog(
                `😤 ${crewMember.name} (Бунтарь) испугался и сбежал с корабля!`,
                "error",
            );
        }
    });
}

export function applyPessimistTrait(
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
        set((s) => {
            const c = s.crew.find((x) => x.id === crewMember.id);
            if (c) c.happiness = Math.max(0, c.happiness - moraleDrain);
        });
        get().addLog(
            `😟 ${crewMember.name} (Пессимист): -${moraleDrain} морали`,
            "warning",
        );
    });
}
