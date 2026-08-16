import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { ARTIFACT_BOOST_BONUS } from "@/game/slices/artifacts/constants";
import { getTechBonusSum } from "@/game/research";
import { getStrongestTechPerkValue } from "@/game/constants/techTree";
import { sumRaceTraitEffect } from "@/game/races";
import { getLivingShipCrew } from "@/game/crew/stationed";
import type {
    ActiveEffect,
    Artifact,
    ArtifactNegativeEffect,
    EffectType,
    GameState,
    Sector,
} from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";

// Get artifact by ID
const getArtifactById = (id: string): Artifact | undefined => {
    return ANCIENT_ARTIFACTS.find((a) => a.id === id);
};

export const getArchiveHintLocations = (
    sectors: Sector[],
    currentSectorId?: number,
): NonNullable<Artifact["hintedAt"]>[] => {
    const locations: NonNullable<Artifact["hintedAt"]>[] = [];
    const usedSectorIds = new Set<number>();
    const sortedSectors = [...sectors].sort((a, b) => a.danger - b.danger);

    const bossSector = sortedSectors.find((sector) =>
        sector.locations.some(
            (location) => location.type === "boss" && !location.bossDefeated,
        ),
    );
    const bossLocation = bossSector?.locations.find(
        (location) => location.type === "boss" && !location.bossDefeated,
    );

    if (bossSector && bossLocation) {
        usedSectorIds.add(bossSector.id);
        locations.push({
            sectorName: bossSector.name,
            locationName: bossLocation.name,
            locationType: "boss",
        });
    }

    for (const sector of sortedSectors) {
        if (usedSectorIds.has(sector.id) || sector.id === currentSectorId) {
            continue;
        }

        const anomaly = sector.locations.find(
            (location) => location.type === "anomaly",
        );
        if (!anomaly) continue;

        usedSectorIds.add(sector.id);
        locations.push({
            sectorName: sector.name,
            locationName: anomaly.name,
            locationType: "anomaly",
        });
    }

    return locations;
};

export const getArtifactHint = (
    state: Pick<GameState, "artifacts" | "currentSector" | "galaxy">,
):
    | {
          artifactId: string;
          hintedAt: NonNullable<Artifact["hintedAt"]>;
      }
    | null => {
    const hintedAt = getArchiveHintLocations(
        state.galaxy.sectors,
        state.currentSector?.id,
    )[0];
    // По весам редкости, а не по порядку массива: раньше подсказки всегда
    // указывали на артефакты в том порядке, в каком они лежат в константе,
    // а поиск затем предпочитает подсказанные — редкость не работала вовсе
    const artifact = getRandomUndiscoveredArtifact(
        state.artifacts.filter((candidate) => !candidate.hinted),
    );

    return artifact && hintedAt ? { artifactId: artifact.id, hintedAt } : null;
};

// Get random undiscovered artifact weighted by rarity
export const getRandomUndiscoveredArtifact = (
    artifacts: Artifact[],
): Artifact | null => {
    const undiscovered = artifacts.filter((a) => !a.discovered);
    if (undiscovered.length === 0) return null;
    const candidates = undiscovered.some((a) => a.hinted)
        ? undiscovered.filter((a) => a.hinted)
        : undiscovered;

    // Weight by rarity (cursed is moderately rare but not impossible)
    const weights: Record<string, number> = {
        rare: 60,
        legendary: 30,
        mythic: 10,
        cursed: 20,
    };
    const totalWeight = candidates.reduce(
        (sum, a) => sum + (weights[a.rarity] || 10),
        0,
    );
    let random = Math.random() * totalWeight;

    for (const artifact of candidates) {
        random -= weights[artifact.rarity] || 10;
        if (random <= 0) return artifact;
    }

    return candidates[0];
};

/**
 * Все негативные эффекты артефакта: основной и дополнительные.
 *
 * Поля два (`negativeEffect` и `negativeEffects`), и раньше каждый потребитель
 * читал только одно из них — потурновый обработчик единственное, расчёт
 * уклонения массив. Любой эффект, положенный не в то поле, молча не работал.
 */
export const getArtifactNegativeEffects = (
    artifact: Pick<Artifact, "negativeEffect" | "negativeEffects">,
): ArtifactNegativeEffect[] => [
    ...(artifact.negativeEffect ? [artifact.negativeEffect] : []),
    ...(artifact.negativeEffects ?? []),
];

export const getEffectDescription = (
    effect: {
        type: EffectType;
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
            if (valuePercent < 0) {
                return i18nStore.t("effects.modifiers.fuel_penalty", {
                    value: Math.abs(valuePercent),
                });
            }
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

        // Эффекты станций
        case "research_speed":
            return i18nStore.t("planet_effects.effects.research_speed", {
                value: valuePercent,
            });

        default:
            return `${effect.type}: ${effect.value}`;
    }
};

/** Личный бонус экипажа к силе эффектов артефактов (трейт legend, суммируется по всему экипажу) */
export const getCrewTraitArtifactBonus = (crew: GameState["crew"]): number => {
    const traitSum = getLivingShipCrew(crew).reduce(
        (sum, c) =>
            sum +
            (c.traits?.reduce(
                (s, tr) => s + (tr.effect.artifactBonus ?? 0),
                0,
            ) ?? 0),
        0,
    );
    // Ветка "Ксеноархеолог": лучший учёный экипажа, не суммируется между
    // несколькими учёными (иначе игрок мог бы нанять несколько с этой
    // веткой и получить неограниченный бонус)
    return traitSum + getStrongestTechPerkValue(crew, "scientist", "B");
};

/**
 * Общий множитель усиления эффектов артефактов от науки, расы crystalline
 * и трейтов/перков экипажа (legend, "Ксеноархеолог") — всё, что действует
 * на ЛЮБОЙ артефакт разом. Не включает точечный ритуальный буст воидборнов
 * (он целится в один конкретный артефакт, а не усиливает все сразу), поэтому
 * годится и как общая цифра для UI, и как общая часть двух функций ниже.
 */
export const getArtifactBonusMultiplier = (
    state: Pick<GameState, "crew" | "research">,
): number => {
    let multiplier = 1;

    // Apply permanent research-based artifact effect boost
    const researchBoost = getTechBonusSum(
        state.research,
        "artifact_effect_boost",
    );
    if (researchBoost > 0) {
        multiplier *= 1 + researchBoost;
    }

    // Crystalline resonance: +15% per crystalline crew member (стакается)
    const crystallineBonus = sumRaceTraitEffect(state.crew, "artifactBonus");
    if (crystallineBonus > 0) {
        multiplier *= 1 + crystallineBonus;
    }

    // Личный трейт-бонус экипажа (legend) + перк "Ксеноархеолог"
    const traitArtifactBonus = getCrewTraitArtifactBonus(state.crew);
    if (traitArtifactBonus > 0) {
        multiplier *= 1 + traitArtifactBonus;
    }

    return multiplier;
};

// Helper function to get artifact effect value with active boost bonus
export const getArtifactEffectValue = (
    artifact: Artifact | undefined,
    state: GameState,
) => {
    if (!artifact) return 0;

    const baseValue = artifact.effect.value ?? 0;

    // canBoost: false — это флаговые артефакты (вкл/выкл), их value никто не
    // читает как силу эффекта. Ритуал их и так не берёт, а общий множитель
    // раздувал 1 до 2 и рисовал в панели фальшивое «Фактический эффект: 1 → 2».
    if (artifact.canBoost === false) return baseValue;

    // Бусты накапливаются в один множитель и округляются ОДИН раз —
    // последовательные Math.floor съедали малые бонусы на целых значениях
    let multiplier = getArtifactBonusMultiplier(state);

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
        multiplier *= 1 + boostValue;
    }

    const value = baseValue * multiplier;
    // Дробные эффекты (доли/проценты) не округляем
    return baseValue < 1 ? value : Math.round(value);
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

    let shieldRegen = Math.floor(
        artifact.effect.shieldRegen * getArtifactBonusMultiplier(state),
    );

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

/**
 * Прибавка к шансу засады в сигналах бедствия от Ока Сингулярности.
 *
 * Оба места, где решается исход сигнала, читают её отсюда: раньше одно брало
 * значение из артефакта, а второе держало 0.5 в коде, и правка константы
 * развела бы их.
 */
export const getAmbushChanceModifier = (
    artifacts: GameState["artifacts"],
): number => {
    const eye = findActiveArtifact(artifacts, "all_seeing");
    if (!eye) return 0;
    return (
        getArtifactNegativeEffects(eye).find(
            (negative) => negative.type === "ambush_chance",
        )?.value ?? 0
    );
};
