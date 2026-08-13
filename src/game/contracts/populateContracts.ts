import type { Sector } from "../types";
import { generatePlanetContracts } from "./generatePlanetContracts";
import type { ContractGenerationContext } from "./frontierContracts";
import type { RunProfile } from "../galaxy/runProfiles";

/**
 * Генерирует задачи для планет
 */
export const populateContracts = (
    sectors: Sector[],
    profile?: RunProfile | null,
    context: ContractGenerationContext = { canOfferCombat: true, allowFrontier: false },
): void => {
    sectors.forEach((sector) => {
        sector.locations.forEach((loc) => {
            if (loc.type === "planet" && !loc.isEmpty) {
                loc.contracts = generatePlanetContracts(
                    loc.planetType || "",
                    sector,
                    loc.id,
                    sector.id,
                    sectors,
                    loc.dominantRace,
                    profile,
                    context,
                );
            }
        });
    });
};
