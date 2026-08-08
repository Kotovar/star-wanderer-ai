import { CRAFTING_RECIPES } from "@/game/constants/crafting";
import { GLOBAL_CRISES } from "@/game/constants/globalCrises";
import { getCrisisStage } from "@/game/crises/escalation";
import { CONTRACT_REWARDS as REWARD } from "./rewards";
import type { ActiveCrisisState } from "@/game/types/crisis";
import type { CraftingWeapon } from "@/game/types/crafting";
import type { Contract, Location, Sector } from "@/game/types";

/**
 * Груз, которым гасят каждый кризис. Разные кризисы тянут разные рынки —
 * поэтому отклик на кризис не сводится к очередной доставке одного и того же.
 */
export const CRISIS_RELIEF_CARGO: Record<string, string> = {
    epidemic: "medicine",
    raider_wave: "spares",
    solar_flare: "electronics",
    fuel_shortage: "water",
};

/** Сколько тонн груза просят, по тиру сектора */
const CRISIS_RELIEF_QTY = [10, 16, 22] as const;

/** Окно на отклик: жёсткое, но не невыполнимое */
const CRISIS_DEADLINE_MIN = 6;
const CRISIS_DEADLINE_MAX = 14;

/** Множитель награды за изготовленное оружие сверх стоимости самой сборки */
const FABRICATION_REWARD_MULT = 1.8;

/** Прибавка к награде за изготовление по тиру сектора */
const FABRICATION_TIER_BONUS = [0, 250, 500] as const;

const tierIndex = (sector: Sector) =>
    Math.min(2, Math.max(0, (sector.tier ?? 1) - 1));

/**
 * Контракт отклика на кризис. Существует только пока кризис активен, и платит
 * тем больше, чем хуже стадия — кризис перестаёт быть налогом, который просто
 * пережидают, и становится окном возможностей.
 */
export const generateCrisisResponseContract = (
    planet: Location,
    sector: Sector,
    activeCrisis: ActiveCrisisState,
): Contract | null => {
    const crisis = GLOBAL_CRISES.find((c) => c.id === activeCrisis.id);
    const cargo = CRISIS_RELIEF_CARGO[activeCrisis.id];
    if (!crisis || !cargo) return null;

    const index = tierIndex(sector);
    const stage = getCrisisStage(activeCrisis, crisis.duration);

    return {
        id: `c-${planet.id}-crisis-${activeCrisis.id}-${Date.now()}-${Math.random()}`,
        type: "crisis_response",
        desc: "contracts.desc_crisis_response",
        cargo,
        quantity: CRISIS_RELIEF_QTY[index],
        reward: Math.round(
            (REWARD.crisis_response.base[index] +
                Math.floor(Math.random() * REWARD.crisis_response.range[index])) *
                stage.effectMultiplier,
        ),
        crisisId: crisis.id,
        crisisName: crisis.nameKey,
        sourcePlanetId: planet.id,
        sourcePlanetName: planet.name,
        sourceName: planet.name,
        sourceType: "planet",
        sourceSectorName: sector.name,
        sourceDominantRace: planet.dominantRace,
        timeLimit: Math.max(
            CRISIS_DEADLINE_MIN,
            Math.min(CRISIS_DEADLINE_MAX, activeCrisis.turnsRemaining),
        ),
    };
};

/**
 * Контракт на изготовление. Единственный тип, который тратит то, что игрок
 * сделал сам, а не нашёл — поэтому у крафта появляется причина существовать
 * для тех, кто сейчас проходит мимо него весь забег.
 */
export const generateFabricationContract = (
    planet: Location,
    sector: Sector,
    unlockedRecipes: readonly string[] | undefined,
): Contract | null => {
    const available = (unlockedRecipes ?? []).filter(
        (recipeId): recipeId is CraftingWeapon => recipeId in CRAFTING_RECIPES,
    );
    if (available.length === 0) return null;

    const recipe =
        CRAFTING_RECIPES[available[Math.floor(Math.random() * available.length)]];

    return {
        id: `c-${planet.id}-fab-${recipe.id}-${Date.now()}-${Math.random()}`,
        type: "fabrication",
        desc: "contracts.desc_fabrication",
        reward:
            Math.round(recipe.credits * FABRICATION_REWARD_MULT) +
            FABRICATION_TIER_BONUS[tierIndex(sector)],
        requiredWeaponType: recipe.weaponType,
        requiredWeaponName: recipe.name,
        sourcePlanetId: planet.id,
        sourcePlanetName: planet.name,
        sourceName: planet.name,
        sourceType: "planet",
        sourceSectorName: sector.name,
        sourceDominantRace: planet.dominantRace,
    };
};
