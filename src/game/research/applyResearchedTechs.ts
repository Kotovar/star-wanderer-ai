import { RESEARCH_TREE } from "@/game/constants/research";
import { getAdjacentTechs } from "@/game/research/utils";
import {
    applyModuleBonus,
    applyCrewBonus,
} from "@/game/slices/research/helpers/researchHelpers";
import type { GameState, TechnologyId } from "@/game/types";
import type { CraftingRecipeId } from "@/game/types/crafting";

const WEAPON_RECIPE_MAP: Partial<Record<TechnologyId, CraftingRecipeId>> = {
    plasma_weapons: "plasma",
    combat_drones: "drones",
    antimatter_weapons: "antimatter",
    quantum_torpedo: "quantum_torpedo",
    ion_cannon: "ion_cannon",
};

/**
 * Применяет список технологий к состоянию игры как будто они были исследованы.
 *
 * Используется для дебага в initialState или тестов.
 * Применяет все бонусы (module_health, shield_strength и т.д.) без стора.
 *
 * @example
 * // В initialState.ts:
 * research: {
 *     ...applyResearchedTechs(baseResearch, baseModules, baseCrew, [
 *         "reinforced_hull",
 *         "shield_booster",
 *         "phase_shield",
 *     ]),
 * }
 */
export const applyResearchedTechs = (
    state: GameState,
    techs: TechnologyId[],
): Pick<GameState, "ship" | "crew" | "research"> => {
    let modules = [...state.ship.modules];
    let crew = [...state.crew];
    let researchedTechs = [...state.research.researchedTechs];
    let discoveredTechs = [...state.research.discoveredTechs];
    let unlockedRecipes = [...(state.research.unlockedRecipes ?? [])];

    for (const techId of techs) {
        const tech = RESEARCH_TREE[techId];
        if (!tech) continue;

        // Применяем каждый бонус технологии
        for (const bonus of tech.bonuses) {
            if (bonus.value <= 0) continue;

            switch (bonus.type) {
                case "module_health":
                case "scan_range":
                case "weapon_slots":
                    modules = applyModuleBonus(
                        modules,
                        bonus.type,
                        bonus.value,
                    );
                    break;

                case "crew_health":
                    crew = applyCrewBonus(crew, bonus.type, bonus.value);
                    break;
            }
        }

        // Разблокируем рецепт оружия если есть
        const recipe = WEAPON_RECIPE_MAP[techId];
        if (recipe && !unlockedRecipes.includes(recipe)) {
            unlockedRecipes = [...unlockedRecipes, recipe];
        }

        // Добавляем в изученные и открываем соседние
        if (!researchedTechs.includes(techId)) {
            researchedTechs = [...researchedTechs, techId];
        }
        for (const adjId of getAdjacentTechs(techId)) {
            if (!discoveredTechs.includes(adjId)) {
                discoveredTechs = [...discoveredTechs, adjId];
            }
        }
    }

    return {
        ship: { ...state.ship, modules },
        crew,
        research: {
            ...state.research,
            researchedTechs,
            discoveredTechs,
            unlockedRecipes,
        },
    };
};
