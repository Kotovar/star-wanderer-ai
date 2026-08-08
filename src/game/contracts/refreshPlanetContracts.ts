import { generatePlanetContracts } from "./generatePlanetContracts";
import {
    generateCrisisResponseContract,
    generateFabricationContract,
} from "./generateResponseContracts";
import { isContractTargetAvailable } from "./targetAvailability";
import { getRunProfile } from "@/game/galaxy/runProfiles";
import type { Contract, GameState, Sector } from "@/game/types";

const MAX_OPEN_CONTRACTS = 5;

/** Шанс, что планета выставит заказ на изготовление при обновлении предложений */
const FABRICATION_OFFER_CHANCE = 0.25;

export const refreshVisitedPlanetContracts = (
    state: Pick<
        GameState,
        | "activeContracts"
        | "activeCrisis"
        | "artifacts"
        | "completedContractIds"
        | "completedLocations"
        | "galaxy"
        | "research"
        | "runProfileId"
    >,
): Sector[] | null => {
    const ignoredIds = new Set([
        ...state.activeContracts.map((contract) => contract.id),
        ...state.completedContractIds,
    ]);
    const context = {
        artifacts: state.artifacts,
        researchedTechs: state.research.researchedTechs,
        activeCrisis: state.activeCrisis,
        unlockedRecipes: state.research.unlockedRecipes,
    };
    const profile = getRunProfile(state.runProfileId);
    let changed = false;
    const sectors = state.galaxy.sectors.map((sector) => ({
        ...sector,
        locations: sector.locations.map((location) => {
            if (location.type !== "planet" || location.isEmpty || !location.visited) {
                return location;
            }

            const openContracts = (location.contracts ?? []).filter(
                (contract) =>
                    !ignoredIds.has(contract.id) &&
                    isContractTargetAvailable(
                        contract,
                        state.galaxy.sectors,
                        state.completedLocations,
                        context,
                    ),
            );
            const capacity = MAX_OPEN_CONTRACTS - openContracts.length;

            // Динамические предложения зависят от состояния игрока, а не от
            // снимка галактики, поэтому живут только здесь, а не в populateContracts
            const dynamicContracts: Contract[] = [];
            const hasCrisisOffer = openContracts.some(
                (contract) => contract.type === "crisis_response",
            );
            if (state.activeCrisis && !hasCrisisOffer) {
                const relief = generateCrisisResponseContract(
                    location,
                    sector,
                    state.activeCrisis,
                );
                if (relief) dynamicContracts.push(relief);
            }
            const hasFabricationOffer = openContracts.some(
                (contract) => contract.type === "fabrication",
            );
            if (
                !hasFabricationOffer &&
                Math.random() < FABRICATION_OFFER_CHANCE
            ) {
                const order = generateFabricationContract(
                    location,
                    sector,
                    state.research.unlockedRecipes,
                );
                if (order) dynamicContracts.push(order);
            }

            const remainingCapacity = capacity - dynamicContracts.length;
            const freshContracts =
                remainingCapacity > 0
                    ? generatePlanetContracts(
                          location.planetType ?? "",
                          sector,
                          location.id,
                          sector.id,
                          state.galaxy.sectors,
                          location.dominantRace,
                          profile,
                      ).slice(0, remainingCapacity)
                    : [];
            const contracts = [
                ...openContracts,
                ...dynamicContracts.slice(0, Math.max(0, capacity)),
                ...freshContracts,
            ];
            if (
                contracts.length !== (location.contracts ?? []).length ||
                contracts.some((contract, index) => contract !== location.contracts?.[index])
            ) {
                changed = true;
                return { ...location, contracts };
            }
            return location;
        }),
    }));

    return changed ? sectors : null;
};
