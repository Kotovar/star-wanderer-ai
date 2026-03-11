import type { GameState, GameStore, Module } from "@/game/types";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import { RACES } from "@/game/constants/races";
import {
    CREW_DAMAGE_MODIFIERS,
    MODULE_HEALTH_THRESHOLDS,
} from "@/game/constants/combat";

/**
 * Applies damage to module with armor and artifacts
 */
export function applyModuleDamage(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    damage: number,
    targetModule: Module,
    noShields: boolean,
) {
    const moduleDefense = targetModule.defense ?? 0;
    const damageAfterArmor = Math.max(1, damage - moduleDefense);

    if (moduleDefense > 0 && damageAfterArmor < damage) {
        get().addLog(
            `🛡️ Броня модуля "${targetModule.name}": -${damage - damageAfterArmor} урона`,
            "info",
        );
    }

    const crystalArmor = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.CRYSTALLINE_ARMOR,
    );
    let artifactDefense = 0;
    if (crystalArmor) {
        artifactDefense = getArtifactEffectValue(crystalArmor, state);
        get().addLog(
            `💎 Кристаллическая Броня: -${artifactDefense} урона (артефакт)`,
            "info",
        );
    }

    const damageAfterArtifact = Math.max(1, damageAfterArmor - artifactDefense);

    let crystallineDefense = 0;
    state.crew
        .filter((c) => c.race === "crystalline")
        .forEach((c) => {
            const race = RACES[c.race];
            const armorTrait = race?.specialTraits?.find(
                (t) => t.id === "crystal_armor",
            );
            if (armorTrait?.effects.moduleDefense) {
                crystallineDefense += armorTrait.effects
                    .moduleDefense as number;
            }
        });

    const reducedDamage = Math.floor(
        damageAfterArtifact * (1 - crystallineDefense),
    );
    const wasDestroyed = targetModule.health <= reducedDamage;

    set((s) => {
        const mod = s.ship.modules.find((m) => m.id === targetModule.id);
        if (mod) mod.health = Math.max(0, mod.health - reducedDamage);
    });

    if (artifactDefense > 0) {
        get().addLog(
            `💎 Кристаллическая Броня: -${artifactDefense} урона (артефакт)`,
            "info",
        );
    }
    if (moduleDefense > 0 && reducedDamage < damageAfterArtifact) {
        get().addLog(
            `💎 Кристаллическая раса: -${damageAfterArtifact - reducedDamage} урона (%)`,
            "info",
        );
    }
    get().addLog(
        `Враг по "${targetModule.name}": -${reducedDamage}%`,
        "warning",
    );

    // Damage crew
    let crewDamage = Math.floor(
        reducedDamage * CREW_DAMAGE_MODIFIERS.BASE_RATIO,
    );
    if (targetModule.health < MODULE_HEALTH_THRESHOLDS.CRITICAL) {
        crewDamage = Math.floor(
            crewDamage * CREW_DAMAGE_MODIFIERS.CRITICAL_MULTIPLIER,
        );
        get().addLog(
            `⚠️ Модуль повреждён! Экипаж получает повышенный урон!`,
            "error",
        );
    }

    damageCrewInModule(
        targetModule.id,
        crewDamage,
        wasDestroyed,
        set,
        get,
        state,
    );

    // Combat morale drain
    if (!noShields) {
        const crewInDamagedModule = get().crew.filter(
            (c) => c.moduleId === targetModule.id,
        );
        crewInDamagedModule.forEach((c) => {
            c.traits?.forEach((trait) => {
                if (trait.effect.combatMoraleDrain) {
                    const moraleDrain = trait.effect
                        .combatMoraleDrain as number;
                    set((s) => {
                        const cr = s.crew.find((x) => x.id === c.id);
                        if (cr)
                            cr.happiness = Math.max(
                                0,
                                cr.happiness - moraleDrain,
                            );
                    });
                    get().addLog(
                        `⚠️ ${c.name} (${trait.name}): -${moraleDrain} морали от урона`,
                        "warning",
                    );
                }
            });
        });
    }
}

/**
 * Damages crew in module
 */
export function damageCrewInModule(
    moduleId: number,
    damage: number,
    isDestruction: boolean,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    state: GameState,
) {
    const crewInModule = get().crew.filter((c) => c.moduleId === moduleId);
    if (crewInModule.length === 0) return;

    const actualDamage = isDestruction
        ? Math.floor(damage * CREW_DAMAGE_MODIFIERS.CRITICAL_MULTIPLIER)
        : damage;

    const lifeCrystal = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.LIFE_CRYSTAL,
    );
    const undyingArtifact = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.UNDYING_CREW,
    );
    const hasImmortality = !!(lifeCrystal || undyingArtifact);

    const hasAIArtifact = state.artifacts.some(
        (a) => a.id === "ai_neural_link" && !a.cursed && a.effect.active,
    );

    const hasFirstAid = crewInModule.some(
        (c) => c.combatAssignment === "firstaid",
    );
    const firstAidReduction = hasFirstAid ? 0.5 : 0;

    set((s) => {
        s.crew.forEach((c) => {
            if (c.moduleId !== moduleId) return;
            let newHealth = c.health - actualDamage;
            if (hasFirstAid) {
                newHealth =
                    c.health -
                    Math.floor(actualDamage * (1 - firstAidReduction));
            }
            if (hasImmortality && newHealth < 1) newHealth = 1;
            c.health = Math.max(0, newHealth);
        });
    });

    if (isDestruction) {
        get().addLog(
            `💥 Модуль уничтожен! Экипаж получает критический урон: -${actualDamage}`,
            "error",
        );
    } else {
        get().addLog(
            `👤 Экипаж в модуле получил урон: -${actualDamage}`,
            "warning",
        );
    }

    if (hasFirstAid) {
        get().addLog(`🩹 Первая помощь: урон снижен на 50%!`, "info");
    }
    if (hasImmortality) {
        get().addLog(`✨ Экипаж выжил благодаря артефакту бессмертия!`, "info");
    }

    const remainingCrew = get().crew.filter((c) => c.health > 0);
    if (remainingCrew.length === 0 && !hasAIArtifact && !hasImmortality) {
        get().addLog("💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Игра окончена.", "error");
        set(() => ({
            gameOver: true,
            gameOverReason: "Весь экипаж погиб в бою",
        }));
    } else if (remainingCrew.length === 0 && hasAIArtifact) {
        get().addLog(
            "💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Но ИИ Нейросеть управляет кораблём.",
            "warning",
        );
    }
}
