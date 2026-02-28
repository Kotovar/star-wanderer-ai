import type { ModuleType } from "./modules";

export interface CargoItem {
    item: string;
    quantity: number;
    contractId?: string;
    rewardValue?: number; // For special cargo like survivor capsules
    moduleType?: ModuleType; // For module items (e.g., "engine")
    moduleLevel?: number; // Module level (e.g., 4 for tier 4 engine)
    isModule?: boolean; // True if this cargo is a ship module
}
