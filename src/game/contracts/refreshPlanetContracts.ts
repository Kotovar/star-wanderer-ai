import {
    generateCombatContract,
    generatePlanetContracts,
} from "./generatePlanetContracts";
import {
    generateCrisisResponseContract,
    generateFabricationContract,
} from "./generateResponseContracts";
import { FABRICATION_OFFER_CHANCE } from "./seedResponseContracts";
import { isContractTargetAvailable } from "./targetAvailability";
import { getRunProfile } from "@/game/galaxy/runProfiles";
import { hasCombatArmament } from "./frontierContracts";
import type { Contract, GameState, Sector } from "@/game/types";

const MAX_OPEN_CONTRACTS = 5;

type RefreshOptions = {
    ensureCombatOffer?: boolean;
};

export const refreshVisitedPlanetContracts = (
    state: Pick<
        GameState,
        | "activeContracts"
        | "activeCrisis"
        | "artifacts"
        | "completedContractIds"
        | "completedLocations"
        | "galaxy"
        | "frontierChainClosed"
        | "frontierCombatOffersSeeded"
        | "raceReputation"
        | "research"
        | "runProfileId"
        | "ship"
    >,
    { ensureCombatOffer = false }: RefreshOptions = {},
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
    const armed = hasCombatArmament(state.ship?.modules ?? []);
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
            const hasCombatOffer = openContracts.some(
                (contract) =>
                    contract.type === "combat" || contract.type === "bounty",
            );
            const generatedCombatOffer =
                ensureCombatOffer && armed && !hasCombatOffer
                    ? generateCombatContract(
                          sector,
                          location.id,
                          state.galaxy.sectors,
                      )
                    : null;
            const combatOffer =
                generatedCombatOffer && location.dominantRace
                    ? {
                          ...generatedCombatOffer,
                          sourceDominantRace: location.dominantRace,
                      }
                    : generatedCombatOffer;
            const replaceIndex =
                combatOffer && remainingCapacity <= 0
                    ? openContracts.findIndex(
                          (contract) =>
                              !contract.isRaceQuest &&
                              contract.type !== "crisis_response" &&
                              contract.type !== "fabrication",
                      )
                    : -1;
            const generationContext = {
                canOfferCombat: armed,
                allowFrontier: !state.frontierChainClosed,
                sourceReputation: location.dominantRace
                    ? state.raceReputation?.[location.dominantRace] ?? 0
                    : undefined,
            };
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
                          generationContext,
                      ).slice(
                          0,
                          Math.max(
                              0,
                              remainingCapacity - (combatOffer ? 1 : 0),
                          ),
                      )
                    : [];
            let contracts = [
                ...openContracts,
                ...dynamicContracts.slice(0, Math.max(0, capacity)),
                ...(combatOffer && remainingCapacity > 0 ? [combatOffer] : []),
                ...freshContracts,
            ];
            if (combatOffer && replaceIndex >= 0) {
                contracts = contracts.map((contract, index) =>
                    index === replaceIndex ? combatOffer : contract,
                );
            }
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
