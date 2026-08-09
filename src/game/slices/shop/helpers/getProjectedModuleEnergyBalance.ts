import { getTotalConsumption } from "@/game/slices/ship/helpers/getTotalConsumption";
import { getTotalPower } from "@/game/slices/ship/helpers/getTotalPower";
import { createModuleFromShopItem } from "@/game/modules/createModuleFromShopItem";
import type { GameState, Module, ShopItem } from "@/game/types";

type ModuleEnergyChanges = Partial<Pick<Module, "power" | "consumption">>;

const getEnergyBalanceWithModules = (
    state: GameState,
    modules: Module[],
): number => {
    const projectedState = {
        ...state,
        ship: { ...state.ship, modules },
    };

    return getTotalPower(projectedState) - getTotalConsumption(projectedState);
};

export const getProjectedModuleEnergyBalance = (
    state: GameState,
    moduleId: number,
    changes: ModuleEnergyChanges,
): number => {
    const modules = state.ship.modules.map((module) => {
        if (module.id !== moduleId) return module;

        const projectedModule = { ...module };
        if (changes.power !== undefined) projectedModule.power = changes.power;
        if (changes.consumption !== undefined) {
            projectedModule.consumption = changes.consumption;
        }
        return projectedModule;
    });
    return getEnergyBalanceWithModules(state, modules);
};

export const getProjectedModulePurchaseEnergyBalance = (
    state: GameState,
    item: ShopItem,
): number => {
    const module = createModuleFromShopItem(item, {
        x: 0,
        y: 0,
        generateId: () => -1,
    });

    return getEnergyBalanceWithModules(state, [...state.ship.modules, module]);
};
