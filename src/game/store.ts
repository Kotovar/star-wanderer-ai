import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { initialState } from "@/game/initial";
import {
    createLogSlice,
    createShipSlice,
    createScannerSlice,
    createCrewSlice,
    createGameLoopSlice,
    createGameManagementSlice,
    createSettingsSlice,
    createContractsSlice,
    createCombatSlice,
    createTravelSlice,
    createLocationsSlice,
    createUiSlice,
    createShopSlice,
    createServicesSlice,
    createTradeSlice,
    createCrewManagementSlice,
    createArtifactsSlice,
    createPlanetEffectsSlice,
    createResearchSlice,
    createAugmentationsSlice,
    // createCraftingSlice,
} from "@/game/slices";
import type { GameStore } from "@/game/types";
import { createCraftingSlice } from "./slices/crafting";

export const useGameStore = create<GameStore>()(
    immer((set, get) => ({
        ...initialState,
        ...createLogSlice(set),
        ...createShipSlice(set, get),
        ...createScannerSlice(set, get),
        ...createCrewSlice(set, get),
        ...createGameLoopSlice(set, get),
        ...createGameManagementSlice(set, get),
        ...createSettingsSlice(set),
        ...createContractsSlice(set, get),
        ...createCombatSlice(set, get),
        ...createTravelSlice(set, get),
        ...createLocationsSlice(set, get),
        ...createUiSlice(set),
        ...createShopSlice(set, get),
        ...createServicesSlice(set, get),
        ...createTradeSlice(set, get),
        ...createCrewManagementSlice(set, get),
        ...createArtifactsSlice(set, get),
        ...createPlanetEffectsSlice(set, get),
        ...createResearchSlice(set, get),
        ...createCraftingSlice(set, get),
        ...createAugmentationsSlice(set, get),
    })),
);
