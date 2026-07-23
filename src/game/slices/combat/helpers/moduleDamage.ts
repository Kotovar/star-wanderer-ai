import { store as i18nStore } from "@/lib/useTranslation";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import {
    ARTIFACT_TYPES,
    CREW_DAMAGE_MODIFIERS,
    MODULE_HEALTH_THRESHOLDS,
    RACES,
} from "@/game/constants";
import { getAugmentationBonus } from "@/game/constants/augmentations";
import { getTechBonusSum } from "@/game/research";
import type { GameState, GameStore, Module } from "@/game/types";

/**
 * Applies damage to module with armor and artifacts
 */
export function applyModuleDamage(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    damage: number,
    targetModule: Module,
    ignoreDefense = false,
): number {
    // Overclock removes armor of the weaponbay the engineer is in
    const hasOverclockInModule = state.crew.some(
        (c) =>
            c.moduleId === targetModule.id &&
            c.combatAssignment === "overclock",
    );
    const moduleDefense =
        ignoreDefense || hasOverclockInModule
            ? 0
            : (targetModule.defense ?? 0);
    if (ignoreDefense && (targetModule.defense ?? 0) > 0) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_1", { targetModule_name: targetModule.name }),
            "error",
        );
    } else if (hasOverclockInModule && (targetModule.defense ?? 0) > 0) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_2", { targetModule_name: targetModule.name }),
            "warning",
        );
    }
    const damageAfterArmor = Math.max(1, damage - moduleDefense);

    if (moduleDefense > 0 && damageAfterArmor < damage) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_3", { targetModule_name: targetModule.name, damageAfterArmor: damage - damageAfterArmor }),
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
        get().addLog( i18nStore.t("game_logs.moduleDamage_4", { artifactDefense }),
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
            crystallineDefense += armorTrait?.effects.moduleDefense ?? 0;
        });

    const reducedDamage = Math.max(
        0,
        damageAfterArtifact - Math.floor(crystallineDefense),
    );
    const wasDestroyed = targetModule.health <= reducedDamage;

    set((s) => {
        const mod = s.ship.modules.find((m) => m.id === targetModule.id);
        if (mod) mod.health = Math.max(0, mod.health - reducedDamage);
    });

    if (moduleDefense > 0 && reducedDamage < damageAfterArtifact) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_5", { reducedDamage: damageAfterArtifact - reducedDamage }),
            "info",
        );
    }
    get().addLog( i18nStore.t("game_logs.moduleDamage_6", { targetModule_name: targetModule.name, reducedDamage }),
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
        get().addLog( i18nStore.t("game_logs.moduleDamage_7"),
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
    maybeExplodeFuelTank(targetModule.id, set, get);

    return reducedDamage;
}

function maybeExplodeFuelTank(
    moduleId: number,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void {
    const tank = get().ship.modules.find((module) => module.id === moduleId);
    if (!tank || tank.type !== "fueltank" || tank.health >= 30) return;

    const chance =
        (tank.level ?? 1) >= 4 ? 0 : (tank.level ?? 1) >= 3 ? 0.05 : 0.15;
    if (Math.random() >= chance) return;

    const adjacentIds = get().ship.modules
        .filter(
            (module) =>
                module.id !== tank.id &&
                get().isModuleAdjacent(tank.id, module.id),
        )
        .map((module) => module.id);
    set((s) => {
        s.ship.modules.forEach((module) => {
            if (adjacentIds.includes(module.id))
                module.health = Math.max(0, module.health - 15);
        });
    });
    get().addLog( i18nStore.t("game_logs.moduleDamage_8", { tank_name: tank.name }),
        "error",
    );
}

/**
 * Damages crew in module
 */
function damageCrewInModule(
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

    // === Бонус от stellar_genetics: -30% урон по экипажу ===
    const geneticsReduction = getTechBonusSum(
        state.research,
        "crew_damage_reduction",
    );

    // phase_step: pre-roll dodge for each crew member in the module
    const phaseStepDodgers = new Set<number>();
    state.crew.forEach((c) => {
        if (c.moduleId !== moduleId) return;
        const dodgeChance = getAugmentationBonus(c, "fullDodgeChance");
        if (dodgeChance > 0 && Math.random() < dodgeChance) {
            phaseStepDodgers.add(c.id);
        }
    });

    set((s) => {
        s.crew.forEach((c) => {
            if (c.moduleId !== moduleId) return;
            if (phaseStepDodgers.has(c.id)) return;
            const veteranReduction =
                c.traits?.reduce((max, trait) => {
                    return Math.max(max, trait.effect?.combatDamageReduction ?? 0);
                }, 0) ?? 0;
            const totalReduction = Math.min(
                0.9,
                firstAidReduction + veteranReduction + geneticsReduction,
            );
            const dmg = Math.floor(actualDamage * (1 - totalReduction));
            let newHealth = c.health - dmg;
            if (hasImmortality && newHealth < 1) newHealth = 1;
            c.health = Math.max(0, newHealth);
        });
    });

    phaseStepDodgers.forEach((id) => {
        const member = get().crew.find((c) => c.id === id);
        if (member) {
            get().addLog( i18nStore.t("game_logs.moduleDamage_9", { member_name: member.name }), "info");
        }
    });

    if (isDestruction) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_10", { actualDamage }),
            "error",
        );
    } else {
        get().addLog( i18nStore.t("game_logs.moduleDamage_11", { actualDamage }),
            "warning",
        );
    }

    if (hasFirstAid) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_12"), "info");
    }
    if (geneticsReduction > 0) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_13", { value: Math.round(geneticsReduction * 100) }), "info");
    }
    if (hasImmortality) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_14"), "info");
    }

    const remainingCrew = get().crew.filter((c) => c.health > 0);
    if (remainingCrew.length === 0 && !hasAIArtifact && !hasImmortality) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_15"), "error");
        set(() => ({
            gameOver: true,
            gameOverReason: "Весь экипаж погиб в бою",
        }));
    } else if (remainingCrew.length === 0 && hasAIArtifact) {
        get().addLog( i18nStore.t("game_logs.moduleDamage_16"),
            "warning",
        );
    }
}
