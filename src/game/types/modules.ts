export type ModuleType =
    | "reactor"
    | "cockpit"
    | "lifesupport"
    | "cargo"
    | "weaponbay"
    | "weaponShed"
    | "shield"
    | "medical"
    | "scanner"
    | "engine"
    | "fueltank"
    | "drill"
    | "ai_core";

export type WeaponType = "kinetic" | "laser" | "missile";
export type PartialModuleType = Exclude<ModuleType, "weaponShed">;

export interface Module {
    id: number;
    type: ModuleType;
    name: string;
    x: number;
    y: number;
    width: number;
    health: number;
    maxHealth: number; // Maximum health for this module
    height: number;
    power?: number;
    consumption?: number;
    level?: number;
    capacity?: number; // For cargo and fuel tanks
    defense?: number; // Armor/defense value (reduces incoming damage)
    oxygen?: number;
    scanRange?: number;
    fuelEfficiency?: number; // For engines - lower is better (fuel per tier)
    disabled?: boolean;
    weapons?: Weapon[];
    movedThisTurn?: boolean; // Whether the module has been moved this turn
}

export interface Weapon {
    type: WeaponType;
}

export interface WeaponDetails {
    name: string;
    damage: number;
    color: string;
    icon: string;
    description: string;
    armorPenetration?: number;
    shieldBonus?: number;
    interceptChance?: number;
}
