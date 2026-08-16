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
    createReputationSlice,
    createNavigatorSlice,
    createOutpostsSlice,
    createPirateSlice,
} from "@/game/slices";
import type { GameStore } from "@/game/types";
import { createCraftingSlice } from "./slices/crafting";

type StoreSet = (
    partial:
        | Partial<GameStore>
        | ((state: GameStore) => Partial<GameStore> | void),
) => void;

/** Валовой доход нужен только для условия доктрины Торговца. */
const trackCreditIncome = (set: StoreSet): StoreSet => (partial) => {
    set((state) => {
        const creditsBefore = state.credits;
        const runIdBefore = state.runId;
        const update =
            typeof partial === "function" ? partial(state) : partial;
        const creditsAfter = update?.credits ?? state.credits;
        const replacesRun =
            update?.runId !== undefined || state.runId !== runIdBefore;

        if (replacesRun || creditsAfter <= creditsBefore) return update;

        const income = creditsAfter - creditsBefore;
        if (update) {
            return {
                ...update,
                creditsEarnedThisRun: state.creditsEarnedThisRun + income,
            };
        }

        state.creditsEarnedThisRun += income;
    });
};

export const useGameStore = create<GameStore>()(
    immer((set, get) => {
        const setWithCreditIncome = trackCreditIncome(set as StoreSet);
        return {
        ...initialState,
        ...createLogSlice(setWithCreditIncome),
        ...createShipSlice(setWithCreditIncome, get),
        ...createScannerSlice(setWithCreditIncome, get),
        ...createCrewSlice(setWithCreditIncome, get),
        ...createGameLoopSlice(setWithCreditIncome, get),
        ...createGameManagementSlice(setWithCreditIncome, get),
        ...createSettingsSlice(setWithCreditIncome),
        ...createContractsSlice(setWithCreditIncome, get),
        ...createCombatSlice(setWithCreditIncome, get),
        ...createTravelSlice(setWithCreditIncome, get),
        ...createLocationsSlice(setWithCreditIncome, get),
        ...createUiSlice(setWithCreditIncome),
        ...createShopSlice(setWithCreditIncome, get),
        ...createServicesSlice(setWithCreditIncome, get),
        ...createTradeSlice(setWithCreditIncome, get),
        ...createCrewManagementSlice(setWithCreditIncome, get),
        ...createArtifactsSlice(setWithCreditIncome, get),
        ...createPlanetEffectsSlice(setWithCreditIncome, get),
        ...createResearchSlice(setWithCreditIncome, get),
        ...createCraftingSlice(setWithCreditIncome, get),
        ...createAugmentationsSlice(setWithCreditIncome, get),
        ...createReputationSlice(setWithCreditIncome, get),
        ...createNavigatorSlice(setWithCreditIncome, get),
        ...createOutpostsSlice(setWithCreditIncome, get),
        ...createPirateSlice(setWithCreditIncome, get),
        };
    }),
);
