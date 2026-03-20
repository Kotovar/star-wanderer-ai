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
    | "ai_core"
    | "lab"
    | "quarters"    // Living quarters — extra crew slots
    | "repair_bay"; // Repair bay — drones repair damaged modules each turn

export type WeaponType =
    | "kinetic"
    | "laser"
    | "missile"
    | "plasma"
    | "drones"
    | "antimatter"
    | "quantum_torpedo";

export type WeaponTypeTotal = WeaponType | "total";
export type PartialModuleType = Exclude<ModuleType, "weaponShed">;
export type WeaponCounts = {
    [K in WeaponType]: number;
};

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
    shields?: number; // Shield generator power (only for shield modules)
    shieldRegen?: number; // Shield regeneration per turn (only for shield modules)
    oxygen?: number;
    scanRange?: number;
    fuelEfficiency?: number; // For engines - lower is better (fuel per tier)
    researchOutput?: number; // For lab - research points per turn
    disabled?: boolean; // Disabled due to power deficit (auto-disabled)
    manualDisabled?: boolean; // Manually disabled by player
    weapons?: Weapon[];
    healing?: number;
    repairAmount?: number;  // HP restored per drone (repair_bay)
    repairTargets?: number; // Number of modules repaired per turn (repair_bay)
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
    dualShot?: boolean; // Fires twice per weapon per attack (drones)
    shieldBypass?: boolean; // Ignores shields entirely (quantum torpedoes)
}
