import { generatePlanetContracts } from "./generatePlanetContracts";
import { isContractTargetAvailable } from "./targetAvailability";
import { getRunProfile } from "@/game/galaxy/runProfiles";
import type { GameState, Sector } from "@/game/types";

const MAX_OPEN_CONTRACTS = 5;

export const refreshVisitedPlanetContracts = (
    state: Pick<
        GameState,
        | "activeContracts"
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
            const freshContracts =
                capacity > 0
                    ? generatePlanetContracts(
                          location.planetType ?? "",
                          sector,
                          location.id,
                          sector.id,
                          state.galaxy.sectors,
                          location.dominantRace,
                          profile,
                      ).slice(0, capacity)
                    : [];
            const contracts = [...openContracts, ...freshContracts];
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
