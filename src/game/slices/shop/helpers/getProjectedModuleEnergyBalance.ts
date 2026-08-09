import { getTotalConsumption } from "@/game/slices/ship/helpers/getTotalConsumption";
import { getTotalPower } from "@/game/slices/ship/helpers/getTotalPower";
import type { GameState, Module } from "@/game/types";

type ModuleEnergyChanges = Partial<Pick<Module, "power" | "consumption">>;

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
    const projectedState = {
        ...state,
        ship: { ...state.ship, modules },
    };

    return getTotalPower(projectedState) - getTotalConsumption(projectedState);
};
