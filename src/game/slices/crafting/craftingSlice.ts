import type { GameStore, SetState, CraftingWeapon } from "@/game/types";
import { CRAFTING_RECIPES } from "@/game/constants/crafting";

export interface CraftingSlice {
    craftWeapon: (recipeId: CraftingWeapon) => void;
    installCraftedWeapon: (cargoIndex: number, weaponBayId: number) => void;
}

export const createCraftingSlice = (
    set: SetState,
    get: () => GameStore,
): CraftingSlice => ({
    craftWeapon: (recipeId) => {
        const state = get();
        const recipe = CRAFTING_RECIPES[recipeId];

        if (!recipe) {
            get().addLog(`Рецепт "${recipeId}" не найден`, "error");
            return;
        }

        if (!state.research.unlockedRecipes.includes(recipeId)) {
            get().addLog("Рецепт не разблокирован", "error");
            return;
        }

        if (state.credits < recipe.credits) {
            get().addLog(
                `Недостаточно кредитов: нужно ${recipe.credits}₢`,
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
                get().addLog(
                    `Недостаточно ресурса "${resType}": нужно ${required}, есть ${available}`,
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

        get().addLog(
            `🔧 Создано: ${recipe.name} — добавлено в грузовой отсек`,
            "info",
        );
    },

    installCraftedWeapon: (cargoIndex, weaponBayId) => {
        const state = get();
        const cargoItem = state.ship.cargo[cargoIndex];

        if (!cargoItem?.isCraftedWeapon || !cargoItem.weaponType) {
            get().addLog("Этот предмет не является оружием", "error");
            return;
        }

        const weaponBay = state.ship.modules.find(
            (m) => m.id === weaponBayId && m.type === "weaponbay",
        );

        if (!weaponBay) {
            get().addLog("Орудийный отсек не найден", "error");
            return;
        }

        // Find empty slot index (null entry in weapons array)
        const slotIndex = weaponBay.weapons?.findIndex((w) => !w) ?? -1;

        if (slotIndex === -1) {
            get().addLog("Орудийный отсек заполнен", "error");
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

        get().addLog(
            `⚔️ Установлено: ${cargoItem.item.replace("crafted_weapon_", "")} в орудийный отсек`,
            "info",
        );
        get().updateShipStats();
    },
});
