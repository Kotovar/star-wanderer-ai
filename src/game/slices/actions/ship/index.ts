/**
 * Ship slices for ship-related state management
 */

export { createShipSlice } from "./shipSlice";
export type { ShipSlice } from "./shipSlice";

export { getTotalPower, getTotalConsumption } from "./shipGetters";
export { getTotalEvasion } from "./getTotalEvasion";
export { getTotalDamage } from "./getTotalDamage";

export {
    ARTIFACT_TYPES,
    isModuleFunctional,
    findActiveArtifact,
    calculateAverageDefense,
    calculateTotalShields,
    calculateTotalOxygen,
    calculateTotalFuelCapacity,
} from "./utils";
