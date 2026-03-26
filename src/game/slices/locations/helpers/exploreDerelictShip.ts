import type { SetState, GameStore } from "@/game/types";
import { MODULE_RECIPES } from "@/game/constants/crafting";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { SCOUT_BASE_EXP } from "@/game/constants/experience";
import type { ModuleRecipeId } from "@/game/types/crafting";

// Шанс найти рецепт модуля при исследовании обломков (10%)
const DERELICT_RECIPE_CHANCE = 0.99;
// const DERELICT_RECIPE_CHANCE = 0.1;

// Лут из обломков
const DERELICT_LOOT = {
    spares: { min: 2, max: 6 },
    electronics: { min: 1, max: 4 },
    rare_minerals: { min: 0, max: 3 },
};

const ALL_RECIPE_IDS = Object.keys(MODULE_RECIPES) as ModuleRecipeId[];

/**
 * Исследует покинутый корабль разведчиком.
 * Однократное действие: даёт spares/electronics/rare_minerals и шанс рецепта модуля.
 */
export const exploreDerelictShip = (
    locationId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    const scouts = state.crew.filter((c) => c.profession === "scout");
    if (scouts.length === 0) {
        get().addLog("Нет разведчика для исследования обломков!", "error");
        return;
    }

    const location = state.currentSector?.locations.find(
        (l) => l.id === locationId,
    );
    if (!location || location.type !== "derelict_ship") {
        get().addLog("Локация не найдена", "error");
        return;
    }

    if (location.derelictExplored) {
        get().addLog("Обломки уже исследованы", "warning");
        return;
    }

    const scout = scouts.reduce((best, c) =>
        (c.level ?? 1) > (best.level ?? 1) ? c : best,
    );

    // Генерация лута
    const sparesQty =
        DERELICT_LOOT.spares.min +
        Math.floor(
            Math.random() *
                (DERELICT_LOOT.spares.max - DERELICT_LOOT.spares.min + 1),
        );
    const electronicsQty =
        DERELICT_LOOT.electronics.min +
        Math.floor(
            Math.random() *
                (DERELICT_LOOT.electronics.max -
                    DERELICT_LOOT.electronics.min +
                    1),
        );
    const rareMineralsQty =
        Math.random() < 0.5
            ? DERELICT_LOOT.rare_minerals.min +
              Math.floor(
                  Math.random() *
                      (DERELICT_LOOT.rare_minerals.max -
                          DERELICT_LOOT.rare_minerals.min +
                          1),
              )
            : 0;

    // Проверка рецепта
    const foundRecipe =
        Math.random() < DERELICT_RECIPE_CHANCE
            ? pickUncollectedRecipe(state.moduleRecipes)
            : null;

    get().gainExp(scout, SCOUT_BASE_EXP);

    const lootResult = {
        spares: sparesQty > 0 ? sparesQty : undefined,
        electronics: electronicsQty > 0 ? electronicsQty : undefined,
        rare_minerals: rareMineralsQty > 0 ? rareMineralsQty : undefined,
        moduleRecipeId: foundRecipe ?? undefined,
    };

    set((s) => {
        let newTradeGoods = s.ship.tradeGoods;
        if (sparesQty > 0)
            newTradeGoods = addTradeGood(newTradeGoods, "spares", sparesQty);
        if (electronicsQty > 0)
            newTradeGoods = addTradeGood(
                newTradeGoods,
                "electronics",
                electronicsQty,
            );
        if (rareMineralsQty > 0)
            newTradeGoods = addTradeGood(
                newTradeGoods,
                "rare_minerals",
                rareMineralsQty,
            );

        const newModuleRecipes = foundRecipe
            ? [...s.moduleRecipes, foundRecipe]
            : s.moduleRecipes;

        return {
            turn: s.turn + 1,
            ship: { ...s.ship, tradeGoods: newTradeGoods },
            moduleRecipes: newModuleRecipes,
            currentSector: s.currentSector
                ? {
                      ...s.currentSector,
                      locations: s.currentSector.locations.map((loc) =>
                          loc.id === locationId
                              ? {
                                    ...loc,
                                    derelictExplored: true,
                                    derelictLoot: lootResult,
                                }
                              : loc,
                      ),
                  }
                : null,
            currentLocation:
                s.currentLocation?.id === locationId
                    ? {
                          ...s.currentLocation,
                          derelictExplored: true,
                          derelictLoot: lootResult,
                      }
                    : s.currentLocation,
        };
    });

    // Лог-сообщения
    const lootParts: string[] = [];
    if (sparesQty > 0) lootParts.push(`Запчасти ×${sparesQty}`);
    if (electronicsQty > 0) lootParts.push(`Электроника ×${electronicsQty}`);
    if (rareMineralsQty > 0)
        lootParts.push(`Редкие минералы ×${rareMineralsQty}`);

    if (lootParts.length > 0) {
        get().addLog(
            `🔍 ${scout.name} обыскал обломки: ${lootParts.join(", ")}`,
            "info",
        );
    } else {
        get().addLog(
            `🔍 ${scout.name} обыскал обломки — ничего ценного`,
            "info",
        );
    }

    if (foundRecipe) {
        const recipe = MODULE_RECIPES[foundRecipe];
        get().addLog(
            `📐 Найден чертёж: ${recipe.icon} ${recipe.name}!`,
            "info",
        );
    }

    get().updateShipStats();
};

/**
 * Возвращает случайный рецепт, которого у игрока ещё нет.
 */
const pickUncollectedRecipe = (
    owned: ModuleRecipeId[],
): ModuleRecipeId | null => {
    const available = ALL_RECIPE_IDS.filter((id) => !owned.includes(id));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
};
