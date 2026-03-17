import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { ARTIFACT_BOOST_BONUS } from "@/game/slices/artifacts/constants";
import { getTechBonusSum } from "@/game/research";
import type {
    ActiveEffect,
    Artifact,
    ArtifactEffectType,
    GameState,
    PlanetEffectType,
} from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";

// Get artifact by ID
export const getArtifactById = (id: string): Artifact | undefined => {
    return ANCIENT_ARTIFACTS.find((a) => a.id === id);
};

// Get random undiscovered artifact weighted by rarity
export const getRandomUndiscoveredArtifact = (
    artifacts: Artifact[],
): Artifact | null => {
    const undiscovered = artifacts.filter((a) => !a.discovered);
    if (undiscovered.length === 0) return null;

    // Weight by rarity (cursed is moderately rare but not impossible)
    const weights: Record<string, number> = {
        rare: 60,
        legendary: 30,
        mythic: 10,
        cursed: 20,
    };
    const totalWeight = undiscovered.reduce(
        (sum, a) => sum + (weights[a.rarity] || 10),
        0,
    );
    let random = Math.random() * totalWeight;

    for (const artifact of undiscovered) {
        random -= weights[artifact.rarity] || 10;
        if (random <= 0) return artifact;
    }

    return undiscovered[0];
};

export const getEffectDescription = (
    effect: {
        type: ArtifactEffectType | PlanetEffectType;
        value: number | string;
    },
    activeEffect?: ActiveEffect,
) => {
    const value = typeof effect.value === "number" ? effect.value : 0;
    const valuePercent = Math.round(Number(effect.value) * 100);

    switch (effect.type) {
        // Артефакты
        case "health_regen":
            return i18nStore.t("planet_effects.effects.health_regen", {
                value,
            });
        case "combat_bonus":
            return i18nStore.t("planet_effects.effects.combat_bonus", {
                value: valuePercent,
            });
        case "evasion_bonus":
            return i18nStore.t("planet_effects.effects.evasion_bonus", {
                value: valuePercent,
            });
        case "power_boost":
            return i18nStore.t("planet_effects.effects.power_boost", { value });
        case "shield_boost":
            return i18nStore.t("planet_effects.effects.shield_boost", {
                value,
            });
        case "fuel_efficiency":
            return i18nStore.t("planet_effects.effects.fuel_efficiency", {
                value: valuePercent,
            });
        case "artifact_boost":
            // Show the boosted artifact name
            if (activeEffect?.targetArtifactId) {
                const artifact = getArtifactById(activeEffect.targetArtifactId);
                if (artifact) {
                    return `${i18nStore.t("planet_effects.effects.artifact_boost")}: ${artifact.name}`;
                }
            }
            return i18nStore.t("planet_effects.effects.artifact_boost");

        // Эффекты планет
        case "health_boost":
            return i18nStore.t("planet_effects.effects.health_boost", {
                value,
            });
        case "crew_level":
            return i18nStore.t("planet_effects.effects.crew_level", { value });
        case "sector_scan":
            return i18nStore.t("planet_effects.effects.sector_scan");
        case "artifact_hints":
            return i18nStore.t("planet_effects.effects.artifact_hints", {
                value,
            });

        default:
            return `${effect.type}: ${effect.value}`;
    }
};

// Helper function to get artifact effect value with active boost bonus
export const getArtifactEffectValue = (
    artifact: Artifact | undefined,
    state: GameState,
) => {
    if (!artifact) return 0;

    let value = artifact.effect.value ?? 0;

    // Apply permanent research-based artifact effect boost
    const researchBoost = getTechBonusSum(
        state.research,
        "artifact_effect_boost",
    );
    if (researchBoost > 0) {
        value =
            value < 1
                ? value * (1 + researchBoost)
                : Math.floor(value * (1 + researchBoost));
    }

    // Check if this artifact is boosted by voidborn ritual (stacks on top of research)
    const boostEffect = state.activeEffects.find(
        (e) =>
            e.effects.some((ef) => ef.type === "artifact_boost") &&
            e.targetArtifactId === artifact.id,
    );

    if (boostEffect) {
        const boostValue =
            (boostEffect.effects.find((ef) => ef.type === "artifact_boost")
                ?.value as number) ?? ARTIFACT_BOOST_BONUS;
        value =
            value < 1
                ? value * (1 + boostValue)
                : Math.floor(value * (1 + boostValue));
    }

    return value;
};

/**
 * Helper function to get artifact shieldRegen value with active boost bonus
 * Applies research and ritual bonuses to shieldRegen (for artifacts like dark_shield_generator)
 */
export const getArtifactShieldRegen = (
    artifact: Artifact | undefined,
    state: GameState,
): number => {
    if (!artifact || !artifact.effect.shieldRegen) return 0;

    let shieldRegen = artifact.effect.shieldRegen;

    // Apply permanent research-based artifact effect boost
    const researchBoost = getTechBonusSum(
        state.research,
        "artifact_effect_boost",
    );
    if (researchBoost > 0) {
        shieldRegen = Math.floor(shieldRegen * (1 + researchBoost));
    }

    // Check if this artifact is boosted by voidborn ritual (stacks on top of research)
    const boostEffect = state.activeEffects.find(
        (e) =>
            e.effects.some((ef) => ef.type === "artifact_boost") &&
            e.targetArtifactId === artifact.id,
    );

    if (boostEffect) {
        const boostValue =
            (boostEffect.effects.find((ef) => ef.type === "artifact_boost")
                ?.value as number) ?? ARTIFACT_BOOST_BONUS;
        shieldRegen = Math.floor(shieldRegen * (1 + boostValue));
    }

    return shieldRegen;
};

/**
 * Находит активный артефакт по типу эффекта
 * @param artifacts - Список всех артефактов
 * @param effectType - Тип эффекта для поиска
 * @returns Активный артефакт или undefined
 */
export const findActiveArtifact = (artifacts: Artifact[], effectType: string) =>
    artifacts.find((a) => a.effect.type === effectType && a.effect.active);

/**
 * Находит активный артефакт по типу эффекта
 * @param state - Текущее состояние игры
 * @param effectTypes - Типы эффектов для поиска
 * @returns Найденный артефакт или undefined
 */
export const findArtifactByEffect = (
    state: GameState,
    effectTypes: string[],
): Artifact | undefined =>
    state.artifacts.find(
        (a) => effectTypes.includes(a.effect.type) && a.effect.active,
    );
