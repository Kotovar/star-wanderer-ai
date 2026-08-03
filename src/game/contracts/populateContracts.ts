import type { Sector } from "../types";
import { generatePlanetContracts } from "./generatePlanetContracts";
import type { RunProfile } from "../galaxy/runProfiles";

/**
 * Генерирует задачи для планет
 */
export const populateContracts = (sectors: Sector[], profile?: RunProfile | null): void => {
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
                );
            }
        });
    });
};
