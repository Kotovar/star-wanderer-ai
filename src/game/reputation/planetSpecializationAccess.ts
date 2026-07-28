import { getReputationLevel } from "../types/reputation";

export const canUsePlanetSpecialization = (reputation: number): boolean =>
    getReputationLevel(reputation) === "allied";
