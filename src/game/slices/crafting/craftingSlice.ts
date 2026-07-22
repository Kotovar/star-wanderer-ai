import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState, CraftingWeapon } from "@/game/types";
import { CRAFTING_RECIPES, MODULE_RECIPES, HYBRID_MODULE_SHOP_ITEMS } from "@/game/constants/crafting";
import type { ModuleRecipeId } from "@/game/types/crafting";

export interface CraftingSlice {
    craftWeapon: (recipeId: CraftingWeapon) => void;
    installCraftedWeapon: (cargoIndex: number, weaponBayId: number) => void;
    craftModule: (recipeId: ModuleRecipeId) => void;
}

export const createCraftingSlice = (
    set: SetState,
    get: () => GameStore,
): CraftingSlice => ({
    craftWeapon: (recipeId) => {
        const state = get();
        const recipe = CRAFTING_RECIPES[recipeId];

        if (!recipe) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_1", { recipeId }), "error");
            return;
        }

        if (!state.research.unlockedRecipes.includes(recipeId)) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_2"), "error");
            return;
        }

        if (state.credits < recipe.credits) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_3", { credits: recipe.credits }),
                "error",
            );
            return;
        }

        for (const [resType, required] of Object.entries(recipe.resources)) {
            const available =
                state.research.resources[
                    resType as keyof typeof state.research.resources
                ] ?? 0;
            if (available < (required ?? 0)) {
                get().addLog( i18nStore.t("game_logs.craftingSlice_4", { resType, required, available }),
                    "error",
                );
                return;
            }
        }

        set((s) => {
            const updatedResources = { ...s.research.resources };
            for (const [resType, required] of Object.entries(
                recipe.resources,
            )) {
                const key = resType as keyof typeof updatedResources;
                updatedResources[key] =
                    (updatedResources[key] ?? 0) - (required ?? 0);
            }

            return {
                credits: s.credits - recipe.credits,
                research: {
                    ...s.research,
                    resources: updatedResources,
                },
                ship: {
                    ...s.ship,
                    cargo: [
                        ...s.ship.cargo,
                        {
                            item: `crafted_weapon_${recipe.weaponType}`,
                            quantity: 1,
                            isCraftedWeapon: true as const,
                            weaponType: recipe.weaponType,
                        },
                    ],
                },
            };
        });

        get().addLog( i18nStore.t("game_logs.craftingSlice_5", { recipe_name: recipe.name }),
            "info",
        );
    },

    installCraftedWeapon: (cargoIndex, weaponBayId) => {
        const state = get();
        const cargoItem = state.ship.cargo[cargoIndex];

        if (!cargoItem?.isCraftedWeapon || !cargoItem.weaponType) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_6"), "error");
            return;
        }

        const weaponBay = state.ship.modules.find(
            (m) => m.id === weaponBayId && m.type === "weaponbay",
        );

        if (!weaponBay) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_7"), "error");
            return;
        }

        // Find empty slot index (null entry in weapons array)
        const slotIndex = weaponBay.weapons?.findIndex((w) => !w) ?? -1;

        if (slotIndex === -1) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_8"), "error");
            return;
        }

        const weaponType = cargoItem.weaponType;

        set((s) => {
            const newCargo = s.ship.cargo.filter((_, i) => i !== cargoIndex);
            const newModules = s.ship.modules.map((m) => {
                if (
                    m.id === weaponBayId &&
                    m.type === "weaponbay" &&
                    m.weapons
                ) {
                    return {
                        ...m,
                        weapons: m.weapons.map((w, i) =>
                            i === slotIndex ? { type: weaponType } : w,
                        ),
                    };
                }
                return m;
            });

            return {
                ship: {
                    ...s.ship,
                    cargo: newCargo,
                    modules: newModules,
                },
            };
        });

        get().addLog( i18nStore.t("game_logs.craftingSlice_9", { value: cargoItem.item.replace("crafted_weapon_", "") }),
            "info",
        );
        get().updateShipStats();
    },

    craftModule: (recipeId) => {
        const state = get();
        const recipe = MODULE_RECIPES[recipeId];
        const moduleTemplate = HYBRID_MODULE_SHOP_ITEMS[recipeId];

        if (!recipe || !moduleTemplate) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_10", { recipeId }), "error");
            return;
        }

        if (!state.moduleRecipes.includes(recipeId)) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_11"), "error");
            return;
        }

        if (state.credits < recipe.credits) {
            get().addLog( i18nStore.t("game_logs.craftingSlice_12", { credits: recipe.credits }), "error");
            return;
        }

        // Проверяем наличие торговых ресурсов
        for (const [goodId, required] of Object.entries(recipe.goods)) {
            const available = state.ship.tradeGoods.find((g) => g.item === goodId)?.quantity ?? 0;
            if (available < (required ?? 0)) {
                const goodName = goodId;
                get().addLog( i18nStore.t("game_logs.craftingSlice_13", { goodName, required, available }), "error");
                return;
            }
        }

        set((s) => {
            // Списываем торговые ресурсы
            const newTradeGoods = s.ship.tradeGoods.map((g) => {
                const cost = recipe.goods[g.item as keyof typeof recipe.goods] ?? 0;
                return cost > 0 ? { ...g, quantity: g.quantity - cost } : g;
            }).filter((g) => g.quantity > 0);

            // Удаляем использованный рецепт (одноразовый)
            const newModuleRecipes = s.moduleRecipes.filter((id) => id !== recipeId);

            return {
                credits: s.credits - recipe.credits,
                moduleRecipes: newModuleRecipes,
                ship: {
                    ...s.ship,
                    tradeGoods: newTradeGoods,
                    cargo: [
                        ...s.ship.cargo,
                        {
                            item: `crafted_module_${recipeId}`,
                            quantity: 1,
                            isModule: true as const,
                            module: moduleTemplate,
                        },
                    ],
                },
            };
        });

        get().addLog( i18nStore.t("game_logs.craftingSlice_14", { icon: recipe.icon, recipe_name: recipe.name }), "info");
    },
});
