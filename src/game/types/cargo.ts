import { ShopItem } from "./shops";

export interface CargoItem {
    item: string;
    quantity: number;
    contractId?: string;
    rewardValue?: number; // For special cargo like survivor capsules
    moduleLevel?: number; // Module level (e.g., 4 for tier 4 engine)
    isModule?: boolean; // True if this cargo is a ship module
    module?: ShopItem;
    isCraftedWeapon?: boolean; // True if this is a crafted weapon ready to install
    weaponType?: import("./modules").WeaponType; // Weapon type for crafted weapons
}
