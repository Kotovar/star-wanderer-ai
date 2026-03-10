import { XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants/races";
import type { GameState, CrewMember, Module } from "@/game/types";

/**
 * Суммарные бонусы от сращивания ксеноморфов
 */
export interface MergeEffectsBonus {
    shieldRegenBonus?: number;
    shieldCapacity?: number;
    repairBonus?: number;
    energyReduction?: number;
    powerOutput?: number;
    evasionBonus?: number;
    oxygenEfficiency?: number;
    crewHealthRegen?: number;
    cargoCapacity?: number;
    fuelEfficiency?: number;
    fuelCapacity?: number;
    scanRange?: number;
    researchSpeed?: number;
    weaponDamage?: number;
    weaponAccuracy?: number;
    healing?: number;
    miningSpeed?: number;
    resourceYield?: number;
    glitchResistance?: number;
    initiativeBonus?: number;
}

type EffectKey = keyof MergeEffectsBonus;

/**
 * Собирает все бонусы от сращивания ксеноморфов с модулями
 */
export const getMergeEffectsBonus = (
    crew: CrewMember[],
    modules: Module[],
): MergeEffectsBonus => {
    const bonus: MergeEffectsBonus = {};

    crew.forEach((crewMember) => {
        if (!crewMember.isMerged || crewMember.mergedModuleId === null) {
            return;
        }

        const moduleShip = modules.find(
            (m) => m.id === crewMember.mergedModuleId,
        );

        if (!moduleShip) {
            return;
        }

        const mergeEffect = XENOSYMBIONT_MERGE_EFFECTS[moduleShip.type];

        if (!mergeEffect.effects) {
            return;
        }

        // Суммируем все эффекты
        Object.entries(mergeEffect.effects).forEach(([key, value]) => {
            if (value !== undefined) {
                bonus[key as EffectKey] =
                    (bonus[key as EffectKey] ?? 0) + value;
            }
        });
    });

    return bonus;
};

/**
 * Применяет бонусы сращивания к состоянию корабля
 * Возвращает модифицированные статы
 */
export const applyMergeEffectsToShip = (
    state: GameState,
    stats: {
        maxShields: number;
        power: number;
        evasion: number;
        oxygenCapacity: number;
        cargoCapacity: number;
        fuelCapacity: number;
        scanRange: number;
        researchSpeed: number;
        weaponDamage: number;
        weaponAccuracy: number;
        healing: number;
        miningSpeed: number;
        resourceYield: number;
        glitchResistance: number;
        initiative: number;
    },
): typeof stats => {
    const bonus = getMergeEffectsBonus(state.crew, state.ship.modules);

    return {
        ...stats,
        maxShields: applyPercentageBonus(
            stats.maxShields,
            bonus.shieldCapacity,
        ),
        power: applyPercentageBonus(stats.power, bonus.powerOutput),
        evasion: applyPercentageBonus(stats.evasion, bonus.evasionBonus),
        oxygenCapacity: applyPercentageBonus(
            stats.oxygenCapacity,
            bonus.oxygenEfficiency,
        ),
        cargoCapacity: applyPercentageBonus(
            stats.cargoCapacity,
            bonus.cargoCapacity,
        ),
        fuelCapacity: applyPercentageBonus(
            stats.fuelCapacity,
            bonus.fuelCapacity,
        ),
        scanRange: applyPercentageBonus(stats.scanRange, bonus.scanRange),
        researchSpeed: applyPercentageBonus(
            stats.researchSpeed,
            bonus.researchSpeed,
        ),
        weaponDamage: applyPercentageBonus(
            stats.weaponDamage,
            bonus.weaponDamage,
        ),
        weaponAccuracy: applyPercentageBonus(
            stats.weaponAccuracy,
            bonus.weaponAccuracy,
        ),
        healing: applyPercentageBonus(stats.healing, bonus.healing),
        miningSpeed: applyPercentageBonus(stats.miningSpeed, bonus.miningSpeed),
        resourceYield: applyPercentageBonus(
            stats.resourceYield,
            bonus.resourceYield,
        ),
        glitchResistance: applyPercentageBonus(
            stats.glitchResistance,
            bonus.glitchResistance,
        ),
        initiative: applyPercentageBonus(
            stats.initiative,
            bonus.initiativeBonus,
        ),
    };
};

/**
 * Применяет процентный бонус к значению
 */
const applyPercentageBonus = (base: number, bonusPercent?: number) => {
    if (!bonusPercent || bonusPercent <= 0) return base;
    return Math.floor(base * (1 + bonusPercent / 100));
};
