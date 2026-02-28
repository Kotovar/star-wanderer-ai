import type { ModuleType, WeaponType } from "./modules";

type ShopItemType = "upgrade" | "module" | "weapon";

export interface ShopItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    type: ShopItemType;
    description: string;
    moduleType: ModuleType;
    targetType?: ModuleType;
    width?: number;
    height?: number;
    power?: number;
    consumption?: number;
    defense?: number;
    scanRange?: number;
    oxygen?: number;
    capacity?: number; // For cargo, fuel tanks
    fuelEfficiency?: number; // For engine modules
    effect?: {
        power?: number;
        capacity?: number;
        defense?: number;
        scanRange?: number;
        oxygen?: number;
        fuelEfficiency?: number;
        level?: number;
        healing?: number;
    };
    weaponType?: WeaponType;
    requiresWeaponBay?: boolean;
}
