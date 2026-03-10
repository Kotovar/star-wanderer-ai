import { XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants/races";
import type { GameState, CrewMember } from "@/game/types";

/**
 * Суммарные бонусы от сращивания ксеноморфов
 */
export interface MergeEffectsBonus {
    shieldRegenBonus?: number;
    shieldCapacity?: number;
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
    healingSpeed?: number;
    miningSpeed?: number;
    resourceYield?: number;
    glitchResistance?: number;
    initiativeBonus?: number;
}

/**
 * Собирает все бонусы от сращивания ксеноморфов с модулями
 */
export const getMergeEffectsBonus = (
    crew: CrewMember[],
    modules: Array<{ id: number; type: string }>,
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

        const mergeEffect =
            XENOSYMBIONT_MERGE_EFFECTS[
                moduleShip.type as keyof typeof XENOSYMBIONT_MERGE_EFFECTS
            ];
        if (!mergeEffect || !mergeEffect.effects) {
            return;
        }

        // Суммируем все эффекты
        Object.entries(mergeEffect.effects).forEach(([key, value]) => {
            if (value !== undefined) {
                bonus[key as keyof MergeEffectsBonus] =
                    (bonus[key as keyof MergeEffectsBonus] ?? 0) +
                    (value as number);
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
        healingSpeed: number;
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
        healingSpeed: applyPercentageBonus(
            stats.healingSpeed,
            bonus.healingSpeed,
        ),
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
const applyPercentageBonus = (base: number, bonusPercent?: number): number => {
    if (!bonusPercent || bonusPercent <= 0) return base;
    return Math.floor(base * (1 + bonusPercent / 100));
};
