/**
 * Ship slices for ship-related state management
 */

export { createShipSlice } from "./shipSlice";
export type { ShipSlice } from "./shipSlice";

export {
    ARTIFACT_TYPES,
    isModuleFunctional,
    findActiveArtifact,
    calculateAverageDefense,
    calculateTotalShields,
    calculateTotalOxygen,
    calculateTotalFuelCapacity,
} from "./utils";
